/* =====================================================================
   R.A.M.A. — Ordem Paranormal · regras opcionais
   =====================================================================
   As regras do capítulo "Novas Regras Opcionais" do Sobrevivendo ao
   Horror (SAH p.98-123), uma chave por regra.

   ---------------------------------------------------------------------
   TRÊS DECISÕES QUE ESTE ARQUIVO TOMA, E POR QUÊ
   ---------------------------------------------------------------------

   1. UMA CHAVE POR REGRA, NUNCA UMA POR LIVRO.

      "Ligar o Sobrevivendo ao Horror" não é uma opção que exista: são
      dez regras independentes, que o próprio livro apresenta como
      independentes, e a mesa que quer Ferimentos Debilitantes não
      necessariamente quer Combate Narrativo.

   2. TODAS COMEÇAM DESLIGADAS.

      O livro é explícito: "as regras opcionais são exatamente isso —
      opcionais! Use-as apenas se quiser" (SAH p.99). E: "O Livro de
      Regras de Ordem Paranormal RPG continua sendo a versão padrão e
      oficial do jogo" (SAH p.98).

   3. REGRA OBRIGATÓRIA NÃO VIRA OPCIONAL POR SER DIFÍCIL.

      Nada que o livro básico apresenta como regra padrão aparece aqui.
      Se uma mecânica obrigatória ainda não está implementada, ela está
      registrada como pendência em docs/ORDEM-REGRAS.md — não disfarçada
      de escolha da mesa.

   ---------------------------------------------------------------------
   O QUE `afetaFicha` SIGNIFICA
   ---------------------------------------------------------------------

   Algumas destas regras mudam a ficha; outras mudam só a mesa. Jogando
   sem Mapa e Combate Narrativo são regras de condução de cena: elas não
   acrescentam campo nenhum e não mudam conta nenhuma.

   Elas continuam listadas, porque uma mesa que as usa quer registrar
   isso em algum lugar — mas vêm marcadas, para ninguém ligar esperando
   que a ficha mude e achar que quebrou.
   ===================================================================== */

(function (global) {
  "use strict";

  var SAH = "SAH";

  /* Cada regra:

       chave           identificador estável, nunca o nome exibido
       nome            como aparece na tela
       resumo          uma frase sobre o que a regra faz
       fonte/pagina    de onde ela saiu
       efeito          o que muda NA FICHA, em português
       afetaFicha      false para regra que não muda campo nem conta
       automacao       "calculo" | "parcial" | "informacao"
       parametros      campos que aparecem DEPOIS de ligar
       depende         chaves de outras regras exigidas
       incompativel    chaves de regras que não convivem com esta
       consequencias   o que avisar antes de ligar numa ficha preenchida
  */
  var REGRAS = [
    {
      chave: "nexExperiencia",
      nome: "NEX & Experiência",
      resumo: "Separa o nível de experiência do nível de exposição paranormal.",
      fonte: SAH, pagina: 98,
      afetaFicha: true,
      automacao: "calculo",
      efeito:
        "Nível e NEX passam a ser dois campos independentes. O NÍVEL manda na " +
        "progressão: PV, PE, Sanidade, habilidades de classe, grau de treinamento e " +
        "efeitos de origem baseados em NEX. O NEX passa a medir só exposição, e " +
        "continua valendo para afinidade elemental, poderes paranormais e imunidade " +
        "à Presença Perturbadora. 1 nível equivale a 5% de NEX.",
      parametros: [
        { chave: "nivel", rotulo: "Nível de experiência", tipo: "numero", minimo: 1, maximo: 20,
          ajuda: "Todo personagem começa em nível 1. Sobe 1 onde subiria 5% de NEX." },
        { chave: "nex", rotulo: "NEX por exposição (%)", tipo: "numero", minimo: 0, maximo: 99,
          ajuda: "Começa em 0%. Sobe por exposição: moderada +1%, profunda +2%, total +5%. " +
                 "Aprender um ritual soma o círculo dele." },
      ],
      depende: [],
      incompativel: ["evolucaoPatentes"],
      consequencias: [
        "O NEX deixa de controlar PV, PE, Sanidade e habilidades de classe. Quem passa " +
        "a controlar é o nível de experiência.",
        "O nível começa valendo o equivalente ao NEX atual, e o NEX é preservado como está. " +
        "Nada é convertido, removido nem reconfigurado.",
        "Pré-requisitos escritos em NEX passam a ser lidos em nível: NEX 30% vira nível 6.",
        "Poderes paranormais continuam olhando para o NEX, não para o nível.",
      ],
    },

    {
      chave: "semSanidade",
      nome: "Jogando sem Sanidade",
      resumo: "Remove a Sanidade do jogo, para mesas que preferem o medo sem a mecânica.",
      fonte: SAH, pagina: 104,
      afetaFicha: true,
      automacao: "parcial",
      efeito: "A Sanidade some da ficha. O valor guardado é preservado e volta se a regra for desligada.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [
        "A Sanidade deixa de aparecer na ficha. O valor atual continua gravado e volta intacto ao desligar.",
        "Origens e habilidades que mexem em Sanidade continuam listadas, mas sem efeito enquanto a regra estiver ligada.",
      ],
    },

    {
      chave: "ferimentosDebilitantes",
      nome: "Ferimentos Debilitantes",
      resumo: "Dano grave deixa sequelas, em vez de sumir quando os PV voltam.",
      fonte: SAH, pagina: 105,
      afetaFicha: true,
      automacao: "parcial",
      efeito: "Acrescenta à ficha um registro de ferimentos, com o efeito de cada um anotado à mão.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [
        "Aparece uma lista de ferimentos na ficha. Ela começa vazia; nada é inventado a partir do histórico.",
        "Os efeitos de cada ferimento são anotados pela mesa — o R.A.M.A. não os aplica sozinho.",
      ],
    },

    {
      chave: "semMapa",
      nome: "Jogando sem Mapa",
      resumo: "Combate por zonas e descrição, sem grade nem contagem de quadrados.",
      fonte: SAH, pagina: 106,
      afetaFicha: false,
      automacao: "informacao",
      efeito: "Não muda nenhum campo nem nenhuma conta da ficha. É uma regra de como a mesa conduz a cena.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [],
    },

    {
      chave: "evolucaoPatentes",
      nome: "Evolução por Patentes",
      resumo: "A progressão passa a acompanhar a patente na Ordem, não o NEX.",
      fonte: SAH, pagina: 108,
      afetaFicha: true,
      automacao: "parcial",
      efeito: "A patente passa a ser o trilho de progressão. Os detalhes da tabela de patentes desta regra " +
              "ainda não foram estruturados: ver a pendência em docs/ORDEM-REGRAS.md.",
      parametros: [],
      depende: [],
      incompativel: ["nexExperiencia"],
      consequencias: [
        "Esta regra e NEX & Experiência propõem dois trilhos de progressão diferentes, e não podem valer juntas.",
      ],
    },

    {
      chave: "limitesCompreensao",
      nome: "Os Limites da Compreensão Humana",
      resumo: "Põe um teto no quanto um personagem pode saber e treinar.",
      fonte: SAH, pagina: 113,
      afetaFicha: true,
      automacao: "parcial",
      efeito: "Limita o grau de treinamento das perícias. Os valores exatos do teto ainda não foram estruturados.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [
        "Perícias acima do teto continuam na ficha e aparecem marcadas, em vez de serem rebaixadas sozinhas.",
      ],
    },

    {
      chave: "conjuracaoComplexa",
      nome: "Conjuração Complexa",
      resumo: "Conjurar deixa de ser uma ação e vira um procedimento com etapas.",
      fonte: SAH, pagina: 114,
      afetaFicha: true,
      automacao: "parcial",
      efeito: "Acrescenta campos de conjuração aos rituais da ficha. As etapas em si são conduzidas na mesa.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [
        "Os rituais ganham campos a mais. Nenhum ritual existente é alterado nem perde o que já tinha.",
      ],
    },

    {
      chave: "rituaisDesconhecidos",
      nome: "Conjurando Rituais Desconhecidos",
      resumo: "Permite tentar um ritual que o personagem não aprendeu, com risco.",
      fonte: SAH, pagina: 117,
      afetaFicha: false,
      automacao: "informacao",
      efeito: "Não muda campo nem conta da ficha. É uma regra de o que a mesa permite tentar.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [],
    },

    {
      chave: "desastresParanormais",
      nome: "Desastres Paranormais",
      resumo: "Consequências de escala maior quando o paranormal escapa do controle.",
      fonte: SAH, pagina: 117,
      afetaFicha: false,
      automacao: "informacao",
      efeito: "Não muda campo nem conta da ficha. É uma regra de cenário e consequência.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [],
    },

    {
      chave: "combateNarrativo",
      nome: "Combate Narrativo",
      resumo: "Combate resolvido por descrição e testes, sem turnos nem posições.",
      fonte: SAH, pagina: 119,
      afetaFicha: false,
      automacao: "informacao",
      efeito: "Não muda campo nem conta da ficha. É uma regra de como a mesa resolve a cena.",
      parametros: [],
      depende: [],
      incompativel: [],
      consequencias: [],
    },
  ];

  var POR_CHAVE = {};
  REGRAS.forEach(function (r) { POR_CHAVE[r.chave] = r; });

  function regra(chave) { return POR_CHAVE[chave] || null; }

  function ligada(ficha, chave) {
    return !!(ficha && ficha.opcionais && ficha.opcionais[chave]);
  }

  function ligadas(ficha) {
    return REGRAS.filter(function (r) { return ligada(ficha, r.chave); });
  }

  /* =================================================================
     LIGAR E DESLIGAR
     -----------------------------------------------------------------
     Nunca em silêncio. `consequenciasDe` devolve o que a tela precisa
     mostrar ANTES de mexer, e `conflitos` o que impede a mudança.

     Ligar não converte valor, não remove escolha e não reconfigura
     nada: ele vira uma chave. O que a chave muda é o CÁLCULO, e o
     cálculo é refeito do zero — então desligar volta exatamente ao que
     era antes, sem precisar desfazer nada.
     ================================================================= */

  function conflitos(ficha, chave, ligar) {
    var r = regra(chave);
    if (!r || !ligar) return [];

    var problemas = [];

    r.incompativel.forEach(function (outra) {
      if (ligada(ficha, outra)) {
        var o = regra(outra);
        problemas.push({
          tipo: "incompativel",
          chave: outra,
          texto: "“" + r.nome + "” não pode valer junto com “" + (o ? o.nome : outra) + "”. " +
                 "Desligue uma das duas.",
        });
      }
    });

    r.depende.forEach(function (outra) {
      if (!ligada(ficha, outra)) {
        var o = regra(outra);
        problemas.push({
          tipo: "depende",
          chave: outra,
          texto: "“" + r.nome + "” exige “" + (o ? o.nome : outra) + "” ligada.",
        });
      }
    });

    return problemas;
  }

  /* O que avisar antes de mexer numa ficha que já tem conteúdo. Numa
     ficha vazia não há o que avisar, e a lista volta curta. */
  function consequenciasDe(ficha, chave, ligar) {
    var r = regra(chave);
    if (!r) return [];

    if (!r.afetaFicha) {
      return ["Esta regra não muda nenhum campo nem nenhuma conta da ficha. " +
              "Ligá-la serve para a mesa registrar que a usa."];
    }

    var texto = r.consequencias.slice();

    if (!ligar) {
      texto = texto.map(function (t) { return t; });
      texto.unshift("Desligar volta ao funcionamento padrão do livro básico. " +
                    "Nenhum valor é convertido e nenhuma escolha é removida.");
    }

    return texto;
  }

  /* Aplica a chave. Devolve o que mudou, ou o motivo de não ter mudado.

     Uma coisa que esta função NÃO faz: converter valores. Ligar NEX &
     Experiência não mexe no NEX gravado nem calcula um nível a partir
     dele. Ela só propõe um nível equivalente, na primeira vez, para a
     ficha não abrir em nível 1 quando o personagem estava em NEX 50%. */
  function definir(ficha, chave, ligar) {
    var r = regra(chave);
    if (!r) return { ok: false, erro: "desconhecida" };

    var problemas = conflitos(ficha, chave, ligar);
    if (problemas.length) return { ok: false, erro: "conflito", problemas: problemas };

    if (!ficha.opcionais) ficha.opcionais = {};
    ficha.opcionais[chave] = !!ligar;

    var aviso = null;

    /* A primeira vez que NEX & Experiência é ligada numa ficha que já
       tem NEX, o nível começa no equivalente — 1 nível por 5%. É uma
       SUGESTÃO gravada uma vez só, e quem joga pode mudar: sem ela, um
       personagem de NEX 50% abriria em nível 1 e pareceria ter sido
       zerado. */
    if (chave === "nexExperiencia" && ligar && !ficha.nivelDefinido) {
      var equivalente = Math.max(1, Math.round((Number(ficha.nex) || 5) / 5));
      ficha.nivel = equivalente;
      ficha.nivelDefinido = true;
      aviso = "O nível começou em " + equivalente + ", equivalente ao NEX " +
              ficha.nex + "% que a ficha tinha. Ajuste se a sua mesa combinou outro valor.";
    }

    return { ok: true, aviso: aviso };
  }

  /* Normaliza o que veio da planilha: só chaves conhecidas, só booleanos,
     e nenhuma combinação impossível sobrevive à leitura. */
  function normalizar(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var saida = {};

    REGRAS.forEach(function (r) {
      if (b[r.chave] === true) saida[r.chave] = true;
    });

    /* Duas regras incompatíveis ligadas ao mesmo tempo só chegam aqui
       por arquivo adulterado ou por edição à mão da planilha. A segunda
       cai, e a ficha abre num estado que as regras permitem. */
    REGRAS.forEach(function (r) {
      if (!saida[r.chave]) return;
      r.incompativel.forEach(function (outra) {
        if (saida[outra]) delete saida[outra];
      });
    });

    return saida;
  }

  global.RAMAOrdemOpcionais = {
    REGRAS: REGRAS,
    regra: regra,
    ligada: ligada,
    ligadas: ligadas,
    conflitos: conflitos,
    consequenciasDe: consequenciasDe,
    definir: definir,
    normalizar: normalizar,
  };
})(typeof window !== "undefined" ? window : globalThis);
