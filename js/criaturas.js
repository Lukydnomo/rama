/* =====================================================================
   R.A.M.A. — criaturas
   ---------------------------------------------------------------------
   A mini ficha de uma criatura Homebrew.

   Ela REUSA os conceitos que já existem em vez de inventar paralelos:
   atributo continua tendo valor e dado separados, perícia continua
   sendo rolagem dependente, ataque continua sendo perícia + dano +
   crítico, e habilidade é a mesma habilidade da ficha. Um segundo
   motor de dados ou um segundo schema de habilidade seriam duas coisas
   para manter em sincronia e uma para esquecer.

   O que ela NÃO faz é herdar a ficha inteira. Uma criatura com três
   perícias tem três perícias — carregar as 28 padrão só porque um
   personagem carrega seria encher a tela do mestre de linhas vazias.

   Nada aqui calcula estatística: não há vida por tipo, defesa por
   fórmula nem dificuldade automática. O que a mesa não definiu, o
   sistema não inventa.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var D = global.RAMADados;
  var H = global.RAMAHabilidades;

  /* Sugestão de partida, não regra: são só dois status, e ambos podem
     ser removidos ou renomeados como qualquer outro. */
  var STATUS_SUGERIDOS = [{ nome: "Vida" }, { nome: "Esforço" }];

  function criar(dados) {
    var d = dados || {};
    return {
      tipo: "criatura",
      nome: U.aparar(d.nome, 120) || "Nova criatura",
      visibilidade: d.visibilidade === "publico" ? "publico" : "privado",
      descricao: U.aparar(d.descricao, 4000),
      status: STATUS_SUGERIDOS.map(function (s) {
        return { id: U.uuid(), nome: s.nome, atual: 0, maximo: 0 };
      }),
      atributos: [],
      pericias: [],
      ataques: [],
      habilidades: [],
    };
  }

  function normalizar(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};

    var criatura = {
      tipo: "criatura",
      nome: U.aparar(b.nome, 120) || "Criatura",
      visibilidade: b.visibilidade === "publico" ? "publico" : "privado",
      categoria: U.aparar(b.categoria, 60),
      descricao: U.aparar(b.descricao, 4000),
      status: lista(b.status).map(normalizarStatus).filter(Boolean),
      atributos: lista(b.atributos).map(normalizarAtributo).filter(Boolean),
    };

    if (b.id) criatura.id = b.id;

    var ids = criatura.atributos.map(function (a) { return a.id; });

    /* Perícia sem atributo válido é religada ao primeiro — e se não
       houver atributo nenhum, ela é descartada: sem atributo ela não
       teria dado para rolar. */
    criatura.pericias = lista(b.pericias)
      .map(function (p) { return normalizarPericia(p, ids); })
      .filter(Boolean);

    criatura.ataques = lista(b.ataques).map(normalizarAtaque).filter(Boolean);
    criatura.habilidades = lista(b.habilidades).map(H.normalizarHabilidade).filter(Boolean);

    return criatura;
  }

  function lista(v) { return Array.isArray(v) ? v : []; }

  function normalizarStatus(s) {
    if (!s || typeof s !== "object") return null;
    var nome = U.aparar(s.nome, 40);
    if (!nome) return null;
    var maximo = Math.max(0, U.inteiro(s.maximo, 0));
    var atual = U.inteiro(s.atual, 0);
    return {
      id: s.id || U.uuid(),
      nome: nome,
      atual: maximo > 0 ? U.limitar(atual, 0, maximo) : Math.max(0, atual),
      maximo: maximo,
    };
  }

  function normalizarAtributo(a) {
    if (!a || typeof a !== "object") return null;
    var nome = U.aparar(a.nome, 40);
    if (!nome) return null;
    return {
      id: a.id || U.uuid(),
      nome: nome,
      sigla: (U.aparar(a.sigla, 6) || nome.slice(0, 3)).toUpperCase(),
      valor: U.inteiro(a.valor, 0),
      dado: D.normalizar(a.dado) || "1d20",
    };
  }

  function normalizarPericia(p, idsAtributo) {
    if (!p || typeof p !== "object") return null;
    var nome = U.aparar(p.nome, 60);
    if (!nome || !idsAtributo.length) return null;

    var atributoId = idsAtributo.indexOf(p.atributoId) >= 0 ? p.atributoId : idsAtributo[0];

    return {
      id: p.id || U.uuid(),
      nome: nome,
      atributoId: atributoId,
      bonus: U.inteiro(p.bonus, 0),
      bonusTemporario: U.inteiro(p.bonusTemporario, 0),
      dadosExtras: [],
    };
  }

  function normalizarAtaque(a) {
    if (!a || typeof a !== "object") return null;
    var nome = U.aparar(a.nome, 80);
    if (!nome) return null;
    return {
      id: a.id || U.uuid(),
      nome: nome,
      periciaId: a.periciaId || null,
      dado: D.normalizar(a.dado) || "",
      dano: D.normalizar(a.dano),
      danoExtra: U.aparar(a.danoExtra, 20),
      critico: Math.max(0, U.inteiro(a.critico, 0)),
      multiplicador: Math.max(1, U.inteiro(a.multiplicador, 2)),
      descricao: U.aparar(a.descricao, 1000),
    };
  }

  /* Prepara o pedido de rolagem de um ataque, reusando o motor. Se o
     ataque aponta para uma perícia, ela manda; se não, um dado próprio
     serve — uma criatura simples pode ter só "2d20" e pronto. */
  function pedidoDeAtaque(criatura, ataque) {
    var pericia = U.porId(criatura.pericias, ataque.periciaId);

    if (pericia) {
      var atributo = U.porId(criatura.atributos, pericia.atributoId);
      return {
        nome: ataque.nome,
        sigla: atributo ? atributo.sigla : "",
        expressao: atributo ? atributo.dado : "1d20",
        bonus: U.inteiro(pericia.bonus, 0),
        bonusTemporario: U.inteiro(pericia.bonusTemporario, 0),
        modificadores: [],
      };
    }

    return {
      nome: ataque.nome,
      sigla: "",
      expressao: ataque.dado || "1d20",
      bonus: 0, bonusTemporario: 0, modificadores: [],
    };
  }

  function pedidoDePericia(criatura, pericia) {
    var atributo = U.porId(criatura.atributos, pericia.atributoId);
    return {
      nome: pericia.nome,
      sigla: atributo ? atributo.sigla : "",
      expressao: atributo ? atributo.dado : "1d20",
      bonus: U.inteiro(pericia.bonus, 0),
      bonusTemporario: U.inteiro(pericia.bonusTemporario, 0),
      modificadores: [],
    };
  }

  /* O SNAPSHOT que entra num combate. Cada ocorrência tem id próprio:
     "Existido #1" e "Existido #2" vêm do mesmo modelo e têm vidas
     independentes. Editar a criatura na biblioteca depois não muda
     combate nenhum que já foi montado. */
  function paraCombate(modelo, numero) {
    var copia = normalizar(modelo);
    delete copia.id;

    return {
      id: U.uuid(),
      tipo: "criatura",
      origemId: modelo.id || null,
      nome: modelo.nome + (numero ? " #" + numero : ""),
      ordem: 0,
      snapshot: copia,
    };
  }

  global.RAMACriaturas = {
    STATUS_SUGERIDOS: STATUS_SUGERIDOS,
    criar: criar,
    normalizar: normalizar,
    pedidoDeAtaque: pedidoDeAtaque,
    pedidoDePericia: pedidoDePericia,
    paraCombate: paraCombate,
  };
})(typeof window !== "undefined" ? window : globalThis);
