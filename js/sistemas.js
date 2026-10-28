/* =====================================================================
   R.A.M.A. — sistemas.js
   O registro central dos sistemas de RPG (v2.26; capacidades na v4.0).

   O R.A.M.A. é a plataforma; cada sistema é um módulo dela, do mesmo
   nível dos outros. Nenhum é o padrão: Ordem Paranormal, Oblívio e
   Universal entram aqui do mesmo jeito, e um sistema novo entra
   acrescentando uma entrada em SISTEMAS (e a mesma em
   backend/Sistemas.gs — testes/sistemas-backend.js confere).

   A interface pergunta AQUI que comportamento um sistema tem — que abas
   a ficha mostra, que bloco de regras ela carrega, que ferramentas e
   mecânicas uma campanha dele oferece —, em vez de testar "ordem" ou
   "universal" por conta própria.

   O que cada entrada declara:
     ficha.bloco         a chave do bloco de regras dentro da ficha
                         (`ficha.ordem`, `ficha.oblivio`); sem bloco, a
                         ficha usa só o núcleo do modelo (Universal).
     ficha.motor         o módulo global que normaliza o bloco e cria o
                         vazio (`normalizar`, `fichaVazia`). Sem ele na
                         página, o bloco é PRESERVADO como veio.
     ficha.abas          as abas da ficha, cada uma com a seção global
                         que a desenha.
     ficha.blocoSuperior a seção do bloco fixo acima das abas.
     ficha.resumo        o resumo que a mesa lê sem abrir a ficha: o campo
                         e a função do motor que o calcula antes de gravar.
     ficha.modulosConfiguraveis  o modelo deixa ligar e desligar abas.
     ficha.periciasPadrao  nasce com a lista de perícias do modelo.
     ficha.pontos        o que a escolha do tipo de ficha diz do sistema.
     campanha.mestre     como o sistema chama quem conduz a mesa.
     campanha.ferramentas  ferramentas de mesa que o sistema usa sempre:
                         'combate' (o rastreador do núcleo) e as dele.
     campanha.mecanicas  mecânicas opcionais que o mestre liga e desliga.

   Três casos, separados de propósito:
   - CONHECIDO: um id da lista.
   - ANTIGO: registro sem o identificador — anterior ao campo. Cada tipo
     de registro tem a SUA regra de compatibilidade, explícita aqui e
     igual à do servidor, e ela vale só para os antigos (registro novo
     sempre diz o sistema):
       ficha sem tipoFicha     → SISTEMA_DAS_FICHAS_ANTIGAS (Universal,
                                 o único modelo antes do campo);
       campanha sem `sistema`  → sistemaDeCampanhaAntiga (Ordem, ou
                                 Oblívio se a mesa da v3.0 estava ligada).
   - DESCONHECIDO: um id que esta versão não conhece (uma versão futura,
     um arquivo de fora). Não some, não vira outro sistema e nada é
     gravado por causa dele: aparece como "Sistema não reconhecido", com
     o identificador ao lado.

   Classificar não converte ficha nem campanha nenhuma.
   ===================================================================== */

(function (global) {
  "use strict";

  /* `capa`: o caminho (a partir da raiz do site) de uma miniatura da capa
     do livro do sistema, usada pelo componente de capa (js/capa-sistema.js).
     Sem capa, o componente desenha uma lombada com o nome — nunca uma
     capa inventada. */
  var SISTEMAS = [
    {
      id: "ordem", nome: "Ordem Paranormal", curto: "Ordem",
      resumo: "A ficha do sistema, com as regras dos livros.",
      capa: "assets/sistemas/ordem-capa.webp", capaAlt: "Capa de Ordem Paranormal: um livro de couro escuro com o símbolo dos cinco elementos em dourado",
      ficha: {
        bloco: "ordem", motor: "RAMAOrdemRegras", periciasPadrao: true,
        resumo: { campo: "resumoRecursos", calcular: "resumoDeRecursos" },
        pontos: [
          "Criação guiada passo a passo",
          "PV, PE, Sanidade, Defesa e carga calculados",
          "Catálogo de origens, classes e trilhas com página do livro",
          "Regras opcionais do Sobrevivendo ao Horror",
        ],
        blocoSuperior: "RAMASecaoOrdemGeral",
        abas: [
          { chave: "geral",        rotulo: "Geral",       secao: "RAMASecaoOrdemGeral" },
          { chave: "pericias",     rotulo: "Perícias",    secao: "RAMASecaoOrdemPericias" },
          { chave: "progressao",   rotulo: "Progressão",  secao: "RAMASecaoOrdemProgressao" },
          { chave: "habilidades",  rotulo: "Habilidades", secao: "RAMASecaoOrdemHabilidades" },
          { chave: "rituais",      rotulo: "Rituais",     secao: "RAMASecaoRituais", rotuloDaSecao: true },
          { chave: "inventario",   rotulo: "Inventário",  secao: "RAMASecaoInventario" },
          { chave: "anotacoes",    rotulo: "Anotações",   secao: "RAMASecaoAnotacoes", independente: true },
          { chave: "regras",       rotulo: "Regras",      secao: "RAMASecaoOrdemRegras" },
          { chave: "aliados",      rotulo: "Aliados",     secao: "RAMASecaoAliados" },
        ],
      },
      campanha: {
        mestre: "Mestre",
        descricao: "Combate com condições e efeitos contados por turno, recursos de PV, PE e Sanidade no painel da mesa e as mecânicas dos Arquivos Secretos.",
        ferramentas: ["combate", "condicoes", "sincronia"],
        mecanicas: [
          { chave: "hexatombe", nome: "Hexatombe", fonte: "Arquivos Secretos 2",
            texto: "O ritual de seis dias: equipes, sacrifícios, base, consumo, encontros e a Lua de Sangue. Ligada, a aba Hexatombe aparece para você e para os jogadores (cada um vê só o que é dele)." },
          { chave: "hacking", nome: "Hacking", fonte: "Arquivos Secretos 4",
            texto: "Cenas de hacking com turnos, pontos de segurança e dados virtuais. Ligada, a aba Hacking aparece para você e para os jogadores." },
          { chave: "perigos", nome: "Perigos complexos", fonte: "Arquivos Secretos 5",
            texto: "Cenas de ação que não são combate — explosão, fuga de horda, naufrágio, prédio tomado, chuva de Sangue — com rodadas, sucessos e falhas guardados entre sessões. Ligada, a aba Perigos aparece para você e para os jogadores (cada um vê os perigos em que está)." },
        ],
      },
    },
    {
      id: "oblivio", nome: "Oblívio", curto: "Oblívio",
      resumo: "Personas, Buracos e a Escuridão — o sistema completo do livro.",
      capa: "assets/sistemas/oblivio-capa.webp", capaAlt: "Capa de Oblívio RPG: a marca Oblívio, em branco, sobre fundo escuro",
      ficha: {
        bloco: "oblivio", motor: "RAMAOblivio",
        resumo: { campo: "resumoOblivio", calcular: "resumoParaMesa", normalizarAntes: true },
        pontos: [
          "Criação guiada em 8 passos: Papel, atributos, corpo, equipamento",
          "Corpo em cinco regiões com Estresse, Coragem e Mazelas",
          "Ataques com dados presos às regiões e Proteção do alvo",
          "Mesa da Testemunha: cenas, Farol, Ameaças e Buracos",
        ],
        blocoSuperior: "RAMASecaoOblivio",
        abas: [
          /* "geral" é a Persona, para a aba guardada cair nela. */
          { chave: "geral",        rotulo: "Persona",     secao: "RAMASecaoOblivio" },
          { chave: "testes",       rotulo: "Testes",      secao: "RAMASecaoOblivioTestes" },
          { chave: "habilidades",  rotulo: "Habilidades", secao: "RAMASecaoOblivioHabilidades" },
          { chave: "inventario",   rotulo: "Inventário",  secao: "RAMASecaoOblivioInventario" },
          { chave: "estado",       rotulo: "Estado",      secao: "RAMASecaoOblivioEstado" },
          { chave: "anotacoes",    rotulo: "Anotações",   secao: "RAMASecaoAnotacoes", independente: true },
        ],
      },
      campanha: {
        mestre: "Testemunha",
        descricao: "A mesa da Testemunha: Missão, cenas e Ordem de Ação, fileiras e alcance, Farol, encontros com as 18 Ameaças e a exploração de Buracos.",
        ferramentas: ["oblivio"],
        mecanicas: [],
      },
    },
    {
      id: "universal", nome: "Universal", curto: "Universal",
      resumo: "O modelo flexível do R.A.M.A., para qualquer sistema.",
      ficha: {
        bloco: "", motor: "", modulosConfiguraveis: true,
        pontos: [
          "Atributos, perícias e status que você define",
          "Seções e rótulos com o nome da sua mesa",
          "Nenhuma regra imposta",
          "O modelo de toda ficha criada antes da escolha de sistema",
        ],
        blocoSuperior: "RAMASecaoGeral",
        abas: [
          { chave: "geral",        rotulo: "Geral",       secao: "RAMASecaoGeral" },
          { chave: "pericias",     rotulo: "Perícias",    secao: "RAMASecaoPericias" },
          { chave: "habilidades",  rotulo: "Habilidades", secao: "RAMASecaoHabilidades" },
          { chave: "rituais",      rotulo: "Rituais",     secao: "RAMASecaoRituais", rotuloDaSecao: true },
          { chave: "inventario",   rotulo: "Inventário",  secao: "RAMASecaoInventario" },
          { chave: "anotacoes",    rotulo: "Anotações",   secao: "RAMASecaoAnotacoes", independente: true },
          { chave: "aliados",      rotulo: "Aliados",     secao: "RAMASecaoAliados" },
        ],
      },
      campanha: {
        mestre: "Mestre",
        descricao: "A mesa sem regra imposta: combate com ordem, turnos e rodadas, e os status que cada ficha configurou no painel.",
        ferramentas: ["combate"],
        mecanicas: [],
      },
    },
  ];

  /* ---- as regras de compatibilidade (as mesmas de backend/Sistemas.gs) ---- */

  /* Ficha sem tipoFicha: gravada antes do campo existir, quando o modelo
     flexível era o único. */
  var SISTEMA_DAS_FICHAS_ANTIGAS = "universal";

  /* Campanha sem `sistema`: criada antes da v4.0. Só é usada quando o
     servidor ainda não manda o sistema (um backend anterior à v4.0) — o
     servidor novo aplica a mesma regra e manda o resultado. */
  function sistemaDeCampanhaAntiga(campanha) {
    return campanha && campanha.oblivio === true ? "oblivio" : "ordem";
  }

  /* ------------------------------------------------------------------ */

  var porId = {};
  SISTEMAS.forEach(function (s, i) { porId[s.id] = Object.assign({ ordem: i }, s); });

  function idDe(valor) {
    if (valor === undefined || valor === null) return "";
    return String(valor).trim().toLowerCase();
  }

  /* O sistema de um id. Devolve { id, nome, curto, conhecido, antigo,
     ordem, ficha, campanha }. Vazio cai na regra das FICHAS antigas (é o
     uso de sempre desta função: tipoFicha e o `sistema` da listagem de
     personagens); uma desconhecida guarda o próprio id e não tem ficha
     nem campanha declaradas. */
  function de(valor) {
    var id = idDe(valor);
    if (!id) {
      return Object.assign({}, porId[SISTEMA_DAS_FICHAS_ANTIGAS], { conhecido: true, antigo: true });
    }
    if (porId[id]) return Object.assign({}, porId[id], { conhecido: true, antigo: false });
    return {
      id: id,
      nome: "Sistema não reconhecido (" + id + ")",
      curto: id,
      conhecido: false,
      antigo: false,
      ordem: SISTEMAS.length,
      ficha: { bloco: "", motor: "", abas: [] },
      campanha: { mestre: "Mestre", ferramentas: [], mecanicas: [] },
    };
  }

  function conhecido(valor) {
    return !!porId[idDe(valor)];
  }

  /* Os sistemas conhecidos, na ordem de exibição. */
  function lista() {
    return SISTEMAS.map(function (s) { return de(s.id); });
  }

  /* Ordem de exibição: os conhecidos na ordem da lista, depois os
     desconhecidos por id. */
  function comparar(a, b) {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  /* O sistema de uma ficha (pelo tipoFicha que ela diz). */
  function daFicha(ficha) {
    return de(ficha && ficha.tipoFicha);
  }

  /* O sistema de uma campanha, como ler_campanha/listar_campanhas o
     entregam: { id, herdado, sistema }. */
  function daCampanha(campanha) {
    var c = campanha || {};
    var dito = idDe(c.sistema);
    if (dito) return { id: dito, herdado: c.sistemaHerdado === true, sistema: de(dito) };
    var antigo = sistemaDeCampanhaAntiga(c);
    return { id: antigo, herdado: true, sistema: de(antigo) };
  }

  /* As ferramentas e as mecânicas opcionais de um sistema. */
  function temFerramenta(sistemaId, chave) {
    var s = porId[idDe(sistemaId)];
    return !!s && s.campanha.ferramentas.indexOf(chave) >= 0;
  }

  function mecanicas(sistemaId) {
    var s = porId[idDe(sistemaId)];
    return s ? s.campanha.mecanicas.slice() : [];
  }

  /* O sistema dono de uma ferramenta ou mecânica de campanha ('' se for
     do núcleo). */
  function donoDaFerramenta(chave) {
    for (var i = 0; i < SISTEMAS.length; i++) {
      var c = SISTEMAS[i].campanha;
      if (c.ferramentas.indexOf(chave) >= 0) return SISTEMAS[i].id;
      if (c.mecanicas.some(function (m) { return m.chave === chave; })) return SISTEMAS[i].id;
    }
    return "";
  }

  /* O nome de uma ferramenta ou mecânica, para explicar uma troca. */
  var NOMES_DE_FERRAMENTA = {
    combate: "Combate", condicoes: "condições e efeitos por turno", sincronia: "Sincronia Conectiva",
    oblivio: "mesa da Testemunha",
  };
  function nomeDaFerramenta(chave) {
    if (NOMES_DE_FERRAMENTA[chave]) return NOMES_DE_FERRAMENTA[chave];
    for (var i = 0; i < SISTEMAS.length; i++) {
      var m = SISTEMAS[i].campanha.mecanicas.filter(function (x) { return x.chave === chave; })[0];
      if (m) return m.nome;
    }
    return chave;
  }

  /* Os ids de sistema que uma ficha pode ter (js/ficha.js). */
  function idsDeFicha() {
    return SISTEMAS.map(function (s) { return s.id; });
  }

  global.RAMASistemas = {
    SISTEMA_DAS_FICHAS_ANTIGAS: SISTEMA_DAS_FICHAS_ANTIGAS,
    de: de,
    conhecido: conhecido,
    lista: lista,
    comparar: comparar,
    daFicha: daFicha,
    daCampanha: daCampanha,
    sistemaDeCampanhaAntiga: sistemaDeCampanhaAntiga,
    temFerramenta: temFerramenta,
    mecanicas: mecanicas,
    donoDaFerramenta: donoDaFerramenta,
    nomeDaFerramenta: nomeDaFerramenta,
    idsDeFicha: idsDeFicha,
  };
})(typeof window !== "undefined" ? window : globalThis);
