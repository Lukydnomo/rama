/* =====================================================================
   R.A.M.A. — testes do transporte do frontend
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-frontend.js

   O site e o Apps Script são publicados separadamente. Um vai para o
   GitHub Pages num `git push`; o outro só muda quando alguém abre o
   editor do Google e cria uma implantação nova. Entre uma coisa e
   outra, e às vezes por dias, o navegador de quem usa está numa versão
   e o servidor está noutra.

   Este arquivo existe por causa de um defeito que nasceu exatamente
   dessa distância. A v2.1.0 fez as telas de ficha e campanha pedirem
   tudo numa ação `lote`, e quando o servidor ainda não conhecia essa
   ação a resposta era "não sei o que é isso" — que o frontend tratava
   como sessão inválida. O resultado era um laço: a tela pedia login, o
   login funcionava, a página recarregava e pedia login de novo. E a
   tela inicial continuava logada, porque ela não usa pré-carga.

   As duas regras que os testes abaixo trancam:

     1. o lote é OTIMIZAÇÃO, não requisito. Servidor que não conhece,
        o cliente faz do jeito antigo;
     2. o portão de login só aparece quando o problema é a SESSÃO.
        Errar para o lado de "o servidor está com algum problema" é
        sempre mais honesto do que pedir uma senha que não resolve.

   Aqui não há navegador: o `RAMARede` é substituído por um dublê que
   responde o que o teste mandar, e cada chamada fica registrada. É o
   suficiente, porque o que está sob teste é a decisão do cliente, não
   o desenho da tela.
   ===================================================================== */

const ARQUIVOS = ["js/config.js", "js/util.js", "js/api.js", "js/auth.js"];

/* ---------- ambiente mínimo ---------- */

globalThis.window = globalThis;
globalThis.document = {
  currentScript: null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  body: { classList: { add() {}, remove() {} } },
  dispatchEvent() {},
};
globalThis.navigator = { onLine: true, userAgent: "teste" };
globalThis.location = { search: "", href: "", pathname: "/", reload() {} };
globalThis.addEventListener = () => {};
globalThis.CustomEvent = class { constructor(nome, init) { this.type = nome; Object.assign(this, init); } };

/* O Deno traz um `localStorage` próprio, e ele é uma propriedade de
   leitura no objeto global: atribuir por cima falha em SILÊNCIO. O
   sintoma seria um teste que passa sem testar nada, porque o token
   nunca chegaria onde o auth.js o procura. Daí o defineProperty. */
const guardado = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => guardado.set(k, String(v)),
    removeItem: (k) => guardado.delete(k),
    clear: () => guardado.clear(),
  },
});

/* O dublê do transporte. Ele NÃO fala com ninguém: responde o que o
   teste tiver deixado combinado e anota o que foi pedido. */
const rede = {
  chamadas: [],
  responder: null,
  postar(corpo) {
    rede.chamadas.push(corpo.acao);
    return Promise.resolve(rede.responder(corpo));
  },
  endereco: () => "http://teste/exec",
  configurado: () => true,
  registrar: () => {},
  zerar() { rede.chamadas = []; },
};

/* O RAMAUI só é tocado quando alguma tela é desenhada, e nenhum teste
   daqui desenha tela. O mínimo evita explodir se algo escapar. */
globalThis.RAMAUI = {
  aviso: () => {}, avisoErro: () => {}, avisoAtencao: () => {},
  marca: () => ({}), simbolo: () => ({}),
};

for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try {
    (0, eval)(codigo);
  } catch (e) {
    console.error(`Falhou ao carregar ${caminho}: ${e.message}`);
    Deno.exit(1);
  }
}

globalThis.RAMARede = rede;

/* ---------- coletor ---------- */

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];

const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else {
      falharam++; falhas.push(nome);
      console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`);
    }
  },
  igual(nome, obtido, esperado) {
    const igual = Object.is(obtido, esperado);
    t.ok(nome, igual, igual ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`);
  },
  iguais(nome, obtido, esperado) {
    const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
    t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`);
  },
};

/* ---------- servidores de mentira ---------- */

/* Um Apps Script na v2.0.0: conhece tudo, menos o lote. */
function servidorAntigo(corpo) {
  if (corpo.acao === "lote") return { ok: false, erro: "acao_desconhecida" };
  if (corpo.acao === "sessao") return { ok: true, agente: { id: "u1", usuario: "ana", nome: "Ana" } };
  if (corpo.acao === "listar_campanhas") return { ok: true, dados: [{ id: "c1", nome: "Mesa" }] };
  if (corpo.acao === "ler_personagem") return { ok: true, rev: 3, dados: { nome: "Marta" } };
  return { ok: true, dados: null };
}

/* Um Apps Script na v2.1.0. */
function servidorNovo(corpo) {
  if (corpo.acao === "lote") {
    return {
      ok: true,
      dados: {
        respostas: corpo.pedidos.map((p) => {
          const r = servidorAntigo(p);
          r.acao = p.acao;
          return r;
        }),
      },
    };
  }
  return servidorAntigo(corpo);
}

/* Um servidor que não reconhece a sessão. */
function servidorSemSessao() {
  return { ok: false, erro: "sessao" };
}

function comSessaoGuardada() {
  guardado.clear();
  guardado.set("rama.sessao.token", "tk-de-teste");
  guardado.set("rama.sessao.agente", JSON.stringify({ id: "u1", usuario: "ana", nome: "Ana" }));
  guardado.set("rama.sessao.atividade", String(Date.now()));
}

/* =====================================================================
   O LOTE CONTRA UM SERVIDOR ANTIGO
   ===================================================================== */

t.grupo("Lote contra servidor que não o conhece");

rede.responder = servidorAntigo;
rede.zerar();

{
  const r = await RAMAApi.lote([{ acao: "sessao" }, { acao: "listar_campanhas" }]);

  t.igual("devolve uma resposta por pedido", r.length, 2);
  t.igual("cada uma diz o motivo", r[0].erro, "acao_desconhecida");
  t.ok("e nenhuma finge ter dado certo", r.every((x) => x.ok === false));
  t.igual("gastou UMA viagem para descobrir", rede.chamadas.length, 1);

  /* A descoberta fica guardada: insistir seria gastar outra viagem para
     ouvir o mesmo não. */
  rede.zerar();
  const outra = await RAMAApi.lote([{ acao: "sessao" }]);
  t.igual("a segunda tentativa não vai à rede", rede.chamadas.length, 0);
  t.igual("e responde na hora", outra[0].erro, "acao_desconhecida");
  t.ok("o cliente sabe que este servidor não aceita lote", RAMAApi.aceitaLote() === false);
}

/* =====================================================================
   RETOMAR A SESSÃO COM UM SERVIDOR ANTIGO
   ---------------------------------------------------------------------
   O caso que gerou o laço de login.
   ===================================================================== */

t.grupo("Retomar sessão com servidor antigo");

{
  comSessaoGuardada();
  rede.responder = servidorAntigo;
  rede.zerar();

  const r = await RAMAAuth.retomar([
    { acao: "ler_personagem", personagemId: "p1" },
    { acao: "listar_campanhas" },
  ]);

  t.ok("a sessão é retomada mesmo assim", r && r.ok === true);
  t.ok("pelo caminho de sempre", rede.chamadas.indexOf("sessao") >= 0);
  t.ok("e o token NÃO foi esquecido", !!localStorage.getItem("rama.sessao.token"));

  /* A pré-carga não veio, e a página vai buscar por conta própria —
     que é exatamente o que ficha.js e campanha.js fazem quando o
     terceiro argumento não tem o tamanho esperado. */
  t.igual("sem pré-carga, para a página buscar sozinha", (r.respostas || []).length, 0);
}

/* =====================================================================
   RETOMAR A SESSÃO COM UM SERVIDOR NOVO
   ===================================================================== */

t.grupo("Retomar sessão com servidor novo");

{
  comSessaoGuardada();
  rede.responder = servidorNovo;
  rede.zerar();

  /* Estado limpo: o teste anterior deixou o cliente sabendo que aquele
     servidor não aceitava lote, e este é outro servidor. */
  const modulo = await Deno.readTextFile(new URL("../js/api.js", import.meta.url));
  (0, eval)(modulo);

  const r = await RAMAAuth.retomar([
    { acao: "ler_personagem", personagemId: "p1" },
    { acao: "listar_campanhas" },
  ]);

  t.ok("a sessão é retomada", r && r.ok === true);
  t.igual("numa viagem só", rede.chamadas.length, 1);
  t.igual("e a viagem foi o lote", rede.chamadas[0], "lote");
  t.igual("a pré-carga chega junto", (r.respostas || []).length, 2);
  t.igual("na ordem em que foi pedida", r.respostas[0].dados.nome, "Marta");
  t.igual("com a revisão", r.respostas[0].rev, 3);
}

/* =====================================================================
   SESSÃO INVÁLIDA CONTINUA SENDO SESSÃO INVÁLIDA
   ---------------------------------------------------------------------
   O conserto não pode ter ido longe demais: quando o lote é recusado
   POR SESSÃO, insistir pelo caminho antigo daria a mesma resposta e
   gastaria outra viagem.
   ===================================================================== */

t.grupo("Sessão inválida dentro do lote");

{
  comSessaoGuardada();
  rede.responder = servidorSemSessao;
  rede.zerar();

  const modulo = await Deno.readTextFile(new URL("../js/api.js", import.meta.url));
  (0, eval)(modulo);

  const r = await RAMAAuth.retomar([{ acao: "listar_campanhas" }]);

  t.ok("a sessão é recusada", r && r.ok === false);
  t.igual("com o motivo certo", r.erro, "sessao");
  t.igual("sem tentar de novo por outro caminho", rede.chamadas.length, 1);
  t.ok("e o token é esquecido", !localStorage.getItem("rama.sessao.token"));
}

/* =====================================================================
   DEDUPLICAÇÃO DE PEDIDOS EM VOO
   ===================================================================== */

t.grupo("Pedidos iguais ao mesmo tempo");

{
  comSessaoGuardada();
  rede.responder = servidorNovo;
  rede.zerar();

  const r = await Promise.all([
    RAMAApi.listarCampanhas(),
    RAMAApi.listarCampanhas(),
    RAMAApi.listarCampanhas(),
    RAMAApi.lerPersonagem("p1"),
  ]);

  t.igual("três pedidos iguais viram uma viagem", rede.chamadas.filter((a) => a === "listar_campanhas").length, 1);
  t.igual("e o pedido diferente vai sozinho", rede.chamadas.filter((a) => a === "ler_personagem").length, 1);
  t.ok("todos recebem resposta", r.every((x) => x.ok));
  t.ok("com o mesmo conteúdo", JSON.stringify(r[0]) === JSON.stringify(r[1]));

  /* Objetos distintos: sem isso, duas telas ficariam com o mesmo objeto
     na mão e a alteração de uma apareceria na outra. */
  t.ok("mas em objetos separados", r[0] !== r[1]);

  /* Terminado o voo, a entrada some: isto não é cache. */
  rede.zerar();
  await RAMAApi.listarCampanhas();
  t.igual("depois do voo, o pedido seguinte vai à rede", rede.chamadas.length, 1);
}

/* =====================================================================
   GRAVAÇÃO NUNCA É DEDUPLICADA
   ===================================================================== */

t.grupo("Gravação");

{
  comSessaoGuardada();
  rede.responder = servidorNovo;
  rede.zerar();

  await Promise.all([
    RAMAApi.salvarPersonagem("p1", 3, { nome: "A" }),
    RAMAApi.salvarPersonagem("p1", 3, { nome: "A" }),
  ]);

  /* Duas gravações iguais podem ser duas intenções diferentes. Juntá-las
     esconderia uma delas. */
  t.igual("duas gravações iguais continuam sendo duas", rede.chamadas.length, 2);
}

/* =====================================================================
   AS PÁGINAS CARREGAM O MOTOR INTEIRO
   ---------------------------------------------------------------------
   Outro defeito que nenhum teste de modelo pegava, porque os testes
   carregam todos os módulos: a página da campanha não carregava
   js/ordem/poderes.js. Sem ele, js/ordem/regras.js volta ao valor base
   em silêncio — nada de aumento de atributo, poder ou efeito de
   trilha —, e os cartões da aba Personagens mostravam PV, Sanidade,
   Defesa, Bloqueio, Esquiva e deslocamento diferentes da ficha.

   Aqui a lista de scripts é lida do HTML de cada página, na ordem em
   que ela está.
   ===================================================================== */

t.grupo("Páginas que calculam ficha de Ordem carregam o motor inteiro");

{
  const PAGINAS = ["index.html", "personagens/index.html", "campanhas/index.html", "campanha/index.html",
    "perfil/index.html", "homebrew/index.html", "ficha/index.html"];

  const scriptsDe = async (pagina) => {
    const html = await Deno.readTextFile(new URL("../" + pagina, import.meta.url));
    return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^(\.\.\/)+/, ""));
  };

  /* Quem desenha número calculado de Ordem. */
  const CALCULA = ["js/campanha-painel.js", "js/paginas/ficha-ordem.js", "js/paginas/ordem-criar.js"];

  for (const pagina of PAGINAS) {
    const s = await scriptsDe(pagina);
    if (!CALCULA.some((c) => s.includes(c))) continue;
    const poderes = s.indexOf("js/ordem/poderes.js");
    const progressao = s.indexOf("js/ordem/progressao.js");
    const regras = s.indexOf("js/ordem/regras.js");
    t.ok(pagina + " carrega js/ordem/poderes.js", poderes >= 0);
    /* progressao.js guarda o catálogo de poderes quando carrega: depois
       dele, é tarde. */
    t.ok(pagina + ": poderes → progressão → regras, nesta ordem",
      poderes >= 0 && poderes < progressao && progressao < regras,
      `poderes ${poderes}, progressão ${progressao}, regras ${regras}`);
  }

  /* E o efeito, com uma ficha que depende da progressão para cada um
     dos números: aumento de Agilidade e Vigor, Transcender, e o
     Inventário Otimizado (Técnico, por Versatilidade) que soma o
     Intelecto à capacidade — sem ele, a carga passa do limite e a
     sobrecarga derruba Defesa, perícias e deslocamento. */
  const CADEIA = /^js\/(dados|habilidades|ficha|campanha-painel)\.js$|^js\/ordem\//;
  const avaliar = async (pagina) => {
    for (const nome of Object.keys(globalThis)) if (/^RAMAOrdem/.test(nome)) delete globalThis[nome];
    for (const arquivo of (await scriptsDe(pagina)).filter((a) => CADEIA.test(a))) {
      (0, eval)(await Deno.readTextFile(new URL("../" + arquivo, import.meta.url)));
    }
    const R = globalThis.RAMAOrdemRegras;
    const ordem = R.normalizar({
      classe: "especialista", origem: "academico", trilha: "medico", nex: 65,
      atributos: { agi: 2, for: 2, int: 3, pre: 1, vig: 1 },
      pericias: { fortitude: "treinado", reflexos: "treinado", medicina: "treinado", ciencias: "treinado", investigacao: "treinado" },
      escolhas: [
        { id: "e1", etapa: "d3.poderClasse", tipo: "poderClasse", valor: "transcender", opcoes: { poder: { valor: "sangueDeFerro", opcoes: {} } } },
        { id: "e2", etapa: "d4.atributo", tipo: "atributo", valor: "agi", opcoes: {} },
        { id: "e3", etapa: "d10.versatilidade", tipo: "versatilidade", valor: "trilha", opcoes: { trilha: { valor: "tecnico", opcoes: {} } } },
        { id: "e4", etapa: "d10.atributo", tipo: "atributo", valor: "vig", opcoes: {} },
      ],
    });
    const itens = [
      { id: "i1", tipo: "item", nome: "Caixa pesada", ordem: { espacos: 14, quantidade: 1, categoria: 0, grupo: "geral" } },
      { id: "i2", tipo: "armadura", nome: "Proteção Leve", defesa: 5, ordem: { espacos: 2, quantidade: 1, categoria: 1, grupo: "protecao", emUso: true } },
    ].map((i) => globalThis.RAMAFicha.normalizarItem(i));
    const r = globalThis.RAMAPainelMesa
      ? globalThis.RAMAPainelMesa.resumir({ id: "p", nome: "Teste", tipoFicha: "ordem", detalhado: true, ordem: ordem, inventario: { itens: itens } })
      : null;
    const c = R.calcular(ordem, { limite: 0, itens: itens });
    return {
      atributos: ["agi", "for", "int", "pre", "vig"].map((a) => R.atributo(ordem, a)).join(" "),
      pv: c.pv.total, pe: c.pe.total, san: c.san.total,
      defesa: c.defesa.total, bloqueio: c.bloqueio.total, esquiva: c.esquiva.total,
      deslocamento: c.deslocamento.total, limitePe: c.limitePe.total,
      cartao: r ? r.recursos.map((x) => x.maximo).concat(r.estatisticas.map((x) => x.valor)).join(" ") : null,
    };
  };

  const naFicha = await avaliar("ficha/index.html");
  const naCampanha = await avaliar("campanha/index.html");
  for (const k of ["atributos", "pv", "pe", "san", "defesa", "bloqueio", "esquiva", "deslocamento", "limitePe"]) {
    t.igual("cartão da campanha calcula " + k + " igual à ficha", naCampanha[k], naFicha[k]);
  }
  t.ok("  (a ficha de teste depende mesmo da progressão: Agilidade 3 e Vigor 2)", naFicha.atributos === "3 2 3 1 2", naFicha.atributos);
  t.ok("  e o cartão desenha esses números", !!naCampanha.cartao && naCampanha.cartao.indexOf(String(naFicha.defesa)) >= 0, naCampanha.cartao);
}

/* =====================================================================
   v2.12 — OPERAÇÕES ANUNCIADAS, FILA DO COMBATE, TURNOS E SINCRONIA
   ===================================================================== */

for (const caminho of ["js/combate-turnos.js", "js/combate-fila.js", "js/sincronia.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const esvaziar = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

/* Um relógio que só anda quando o teste manda. */
function relogioFalso() {
  let agora = 1000;
  let seq = 0;
  const tarefas = new Map();
  return {
    definir(fn, ms) { const id = ++seq; tarefas.set(id, { fn, quando: agora + (ms || 0) }); return id; },
    limpar(id) { tarefas.delete(id); },
    agora() { return agora; },
    async avancar(ms) {
      const alvo = agora + ms;
      for (;;) {
        let proxima = null;
        for (const [id, tarefa] of tarefas) {
          if (tarefa.quando <= alvo && (!proxima || tarefa.quando < proxima[1].quando)) proxima = [id, tarefa];
        }
        if (!proxima) break;
        tarefas.delete(proxima[0]);
        agora = proxima[1].quando;
        proxima[1].fn();
        await esvaziar();
      }
      agora = alvo;
      await esvaziar();
    },
    pendentes() { return tarefas.size; },
  };
}

t.grupo("Operações anunciadas pela camada de API");

{
  comSessaoGuardada();
  rede.responder = (corpo) => ({ ok: corpo.acao !== "salvar_campanha", erro: corpo.acao === "salvar_campanha" ? "ocupado" : undefined, dados: {} });
  const eventos = [];
  const largar = RAMAApi.aoOperar((e) => eventos.push(e));

  await RAMAApi.listarCampanhas();
  t.ok("uma leitura é anunciada ao começar e ao terminar", eventos.length === 2 && eventos[0].fase === "inicio" && eventos[1].fase === "fim");
  t.igual("  como leitura de primeiro plano", eventos[0].operacao.tipo + "/" + eventos[0].operacao.segundoPlano, "leitura/false");
  t.igual("  e o resumo conta a operação enquanto ela voa", eventos[0].resumo.primeiroPlano, 1);
  t.igual("  e zera quando ela termina", eventos[1].resumo.total, 0);

  eventos.length = 0;
  await RAMAApi.sincronizarCampanha("c1");
  t.ok("a sincronização é anunciada como SEGUNDO plano", eventos[0].operacao.segundoPlano === true && eventos[0].resumo.segundoPlano === 1 && eventos[0].resumo.primeiroPlano === 0);

  eventos.length = 0;
  await RAMAApi.salvarCampanha("c1", 2, { nome: "x" });
  t.ok("uma gravação que falha também anuncia o fim, com o erro", eventos[1].fase === "fim" && eventos[1].ok === false && eventos[1].erro === "ocupado" && eventos[0].operacao.tipo === "gravacao");

  eventos.length = 0;
  rede.responder = () => { throw new Error("quebrou"); };
  try { await RAMAApi.listarPersonagens(); } catch (e) { /* esperado */ }
  t.ok("mesmo com exceção no transporte, a operação termina anunciada", eventos.length === 2 && RAMAApi.operacoesEmAndamento().total === 0);
  largar();

  t.ok("atualizar_combate pode ser repetida pelo transporte (leva opId)", RAMAApi.podeRepetir("atualizar_combate"));
  rede.zerar();
  rede.responder = () => ({ ok: true, rev: 2 });
  await Promise.all([
    RAMAApi.atualizarCombate("c", "k", 1, "lote-aaaaaaaa", [{ tipo: "turno", direcao: "proximo" }]),
    RAMAApi.atualizarCombate("c", "k", 1, "lote-aaaaaaaa", [{ tipo: "turno", direcao: "proximo" }]),
  ]);
  t.igual("  e não é tratada como leitura (duas iguais não viram uma)", rede.chamadas.length, 2);
}

t.grupo("Turnos e rodadas — regras do navegador");

{
  const T = RAMACombateTurnos;
  const ps = [{ id: "a", ordem: 10 }, { id: "b", ordem: 15 }, { id: "c", ordem: 10 }];
  t.iguais("ordem: maior primeiro, empate estável", T.ordem(ps).map((p) => p.id), ["b", "a", "c"]);
  t.iguais("iniciar: rodada 1, primeiro da ordem", T.normalizado(null, ps, "ativo"), { rodada: 1, ativoId: "b" });
  t.iguais("próximo depois do último volta ao primeiro e sobe a rodada", (({ rodada, ativoId }) => ({ rodada, ativoId }))(T.seguinte({ rodada: 1, ativoId: "c" }, ps)), { rodada: 2, ativoId: "b" });
  t.ok("voltar na rodada 1 do primeiro não muda nada", T.anterior({ rodada: 1, ativoId: "b" }, ps).mudou === false);
  t.ok("combate aplicado localmente: reordenar não passa o turno", (() => {
    const c = { estado: "ativo", participantes: ps, turno: { rodada: 1, ativoId: "a" }, rev: 1 };
    return T.aplicar(c, [{ tipo: "iniciativa", participanteId: "c", valor: 99 }]).turno.ativoId === "a";
  })());
}

/* ---------- um servidor de combate de mentira, com as regras do de verdade ---------- */

function servidorDeCombate(inicial) {
  const s = {
    combate: JSON.parse(JSON.stringify(inicial)),
    opsFeitas: new Set(),
    pedidos: [],
    comportamento: null,     // (pedido) => "normal" | "prazo_aplicado" | "sem_conexao" | "segurar"
    segurados: [],
    enviar(rev, opId, ops) {
      const pedido = { rev, opId, ops: JSON.parse(JSON.stringify(ops)) };
      s.pedidos.push(pedido);
      const modo = s.comportamento ? s.comportamento(pedido) : "normal";
      if (modo === "sem_conexao") return Promise.resolve({ ok: false, erro: "sem_conexao" });
      const responder = () => s.processar(pedido);
      if (modo === "prazo_aplicado") { s.processar(pedido); return Promise.resolve({ ok: false, erro: "prazo" }); }
      if (modo === "segurar") return new Promise((ok) => s.segurados.push(() => ok(responder())));
      return Promise.resolve(responder());
    },
    processar(pedido) {
      if (s.opsFeitas.has(pedido.opId)) return { ok: true, repetida: true, rev: s.combate.rev, dados: JSON.parse(JSON.stringify(s.combate)) };
      if (pedido.rev !== s.combate.rev) return { ok: false, erro: "conflito", rev: s.combate.rev, dados: JSON.parse(JSON.stringify(s.combate)) };
      const novo = RAMACombateTurnos.aplicar(s.combate, pedido.ops);
      novo.rev = s.combate.rev + 1;
      s.combate = novo;
      s.opsFeitas.add(pedido.opId);
      return { ok: true, rev: novo.rev, dados: JSON.parse(JSON.stringify(novo)) };
    },
    /* Outra pessoa mexendo direto no servidor. */
    outraPessoa(ops) {
      const novo = RAMACombateTurnos.aplicar(s.combate, ops);
      novo.rev = s.combate.rev + 1;
      s.combate = novo;
    },
    soltar() { const f = s.segurados.shift(); if (f) f(); },
  };
  return s;
}

function combateDeTeste() {
  return {
    id: "k1", nome: "Ponte", estado: "ativo", rev: 7, visiveis: [],
    turno: { rodada: 1, ativoId: "a" },
    participantes: [
      { id: "a", tipo: "personagem", personagemId: "pa", nome: "Ana", ordem: 10, recursos: [{ chave: "pv", atual: 5, maximo: 9 }] },
      { id: "b", tipo: "criatura", nome: "Existido #1", ordem: 8, snapshot: { status: [{ id: "vida", nome: "Vida", atual: 20, maximo: 20 }] } },
      { id: "c", tipo: "criatura", nome: "Existido #2", ordem: 3, snapshot: { status: [{ id: "vida", nome: "Vida", atual: 20, maximo: 20 }] } },
    ],
  };
}

function filaDeTeste(servidor, extra) {
  const relogio = relogioFalso();
  let n = 0;
  const avisos = [];
  const fila = RAMAFilaCombate.criar(Object.assign({
    combate: servidor.combate,
    relogio,
    gerarId: () => "lote-teste-" + String(++n).padStart(4, "0"),
    enviar: (rev, opId, ops) => servidor.enviar(rev, opId, ops),
    buscar: () => Promise.resolve({ ok: true, dados: JSON.parse(JSON.stringify(servidor.combate)) }),
    aoAviso: (texto) => avisos.push(texto),
  }, extra || {}));
  return { fila, relogio, avisos };
}

t.grupo("Fila do combate — iniciativas digitadas em ritmo normal");

{
  const servidor = servidorDeCombate(combateDeTeste());
  const { fila, relogio } = filaDeTeste(servidor);

  fila.definirIniciativa("a", 12);
  await relogio.avancar(800);
  fila.definirIniciativa("b", 17);
  await relogio.avancar(900);
  fila.definirIniciativa("c", 4);
  await relogio.avancar(700);
  fila.definirIniciativa("a", 14);

  t.iguais("a tela mostra os números na hora", fila.vista().participantes.map((p) => p.ordem), [14, 17, 4]);
  t.igual("nada sobe enquanto a pessoa ainda está digitando", servidor.pedidos.length, 0);
  t.ok("  e a fila diz que há alterações pendentes, com hora marcada", fila.estado().iniciativasPendentes === 3 && fila.estado().programadoPara > relogio.agora());

  await relogio.avancar(4900);
  t.igual("ainda nada 4,9 s depois da última", servidor.pedidos.length, 0);
  await relogio.avancar(200);
  t.igual("5 s sem nova iniciativa: sobe UM lote", servidor.pedidos.length, 1);
  t.iguais("  com o último valor de cada participante", servidor.pedidos[0].ops.map((o) => o.participanteId + "=" + o.valor).sort(), ["a=14", "b=17", "c=4"]);
  t.igual("  na revisão conhecida", servidor.pedidos[0].rev, 7);
  t.igual("e a fila adota a revisão confirmada", fila.estado().rev, 8);
  t.ok("  sem pendências", !fila.temPendencias());
  t.igual("  e os recursos do personagem continuam na vista", fila.vista().participantes[0].recursos[0].atual, 5);

  fila.definirIniciativa("b", 17);
  t.ok("digitar o valor que já está confirmado não cria pendência", !fila.temPendencias());
}

{
  const servidor = servidorDeCombate(combateDeTeste());
  const { fila, relogio } = filaDeTeste(servidor);
  fila.definirIniciativa("a", 30);
  fila.salvarAgora();
  await esvaziar();
  t.igual("\"Salvar agora\" não espera os 5 s", servidor.pedidos.length, 1);
}

t.grupo("Fila do combate — edições durante o envio viram o próximo lote");

{
  const servidor = servidorDeCombate(combateDeTeste());
  servidor.comportamento = () => "segurar";
  const { fila, relogio } = filaDeTeste(servidor);

  fila.definirIniciativa("a", 11);
  await relogio.avancar(5000);
  t.igual("primeiro lote no ar", servidor.pedidos.length, 1);

  fila.definirIniciativa("a", 21);
  fila.definirIniciativa("b", 22);
  await relogio.avancar(6000);
  t.igual("com um lote no ar, nenhum outro sai (nunca duas gravações com a mesma revisão)", servidor.pedidos.length, 1);
  t.iguais("  mas a tela já mostra as edições novas", fila.vista().participantes.slice(0, 2).map((p) => p.ordem), [21, 22]);

  servidor.comportamento = null;
  servidor.soltar();
  await esvaziar();
  t.igual("a resposta chega e o próximo lote sai", servidor.pedidos.length, 2);
  t.igual("  com a revisão que a resposta trouxe", servidor.pedidos[1].rev, 8);
  t.iguais("  levando só o que foi editado depois", servidor.pedidos[1].ops.map((o) => o.participanteId + "=" + o.valor).sort(), ["a=21", "b=22"]);
  t.iguais("no fim, o servidor tem tudo", servidor.combate.participantes.map((p) => p.ordem), [21, 22, 3]);
  t.igual("  e a vista também", fila.vista().participantes[0].ordem, 21);
}

t.grupo("Fila do combate — prazo, rede e repetição segura");

{
  const servidor = servidorDeCombate(combateDeTeste());
  let vezes = 0;
  servidor.comportamento = () => (++vezes === 1 ? "prazo_aplicado" : "normal");
  const { fila, relogio } = filaDeTeste(servidor);

  fila.enfileirar({ tipo: "turno", direcao: "proximo" });
  await relogio.avancar(0);
  t.igual("o lote do turno saiu e a resposta se perdeu (mas o servidor aplicou)", servidor.combate.turno.ativoId, "b");
  t.ok("  a fila guarda o lote e mostra o erro de rede", fila.estado().enviando && fila.estado().erro.tipo === "rede");
  await relogio.avancar(3000);
  t.igual("a repetição leva o MESMO opId", servidor.pedidos[1].opId, servidor.pedidos[0].opId);
  t.igual("  e a MESMA revisão", servidor.pedidos[1].rev, servidor.pedidos[0].rev);
  t.igual("o servidor reconhece e o turno NÃO anda duas vezes", servidor.combate.turno.ativoId, "b");
  t.ok("  e a fila termina limpa", !fila.temPendencias() && fila.estado().erro === null && fila.vista().turno.ativoId === "b");
}

{
  const servidor = servidorDeCombate(combateDeTeste());
  servidor.comportamento = () => "sem_conexao";
  const { fila, relogio } = filaDeTeste(servidor);

  fila.definirIniciativa("c", 9);
  await relogio.avancar(5000);
  await relogio.avancar(3000);
  fila.definirIniciativa("b", 1);
  t.ok("sem conexão: as alterações ficam guardadas", fila.temPendencias() && fila.vista().participantes[2].ordem === 9 && fila.vista().participantes[1].ordem === 1);
  servidor.comportamento = null;
  fila.tentarAgora();
  await esvaziar();
  await relogio.avancar(6000);
  t.iguais("voltando a conexão, tudo sobe, sem repetir o que já entrou", servidor.combate.participantes.map((p) => p.ordem), [10, 1, 9]);
  t.ok("  e a fila fica limpa", !fila.temPendencias());
}

t.grupo("Fila do combate — conflito real com outra aba ou outro mestre");

{
  const servidor = servidorDeCombate(combateDeTeste());
  const { fila, relogio } = filaDeTeste(servidor);

  fila.definirIniciativa("a", 25);
  servidor.outraPessoa([{ tipo: "iniciativa", participanteId: "c", valor: 40 }]);
  await relogio.avancar(5000);
  await esvaziar();
  t.igual("a alteração independente (outro participante) é reaplicada sozinha", servidor.combate.participantes.find((p) => p.id === "a").ordem, 25);
  t.igual("  sem desfazer a da outra pessoa", servidor.combate.participantes.find((p) => p.id === "c").ordem, 40);
  t.ok("  e sem perguntar nada", !fila.temPendencias());
}

for (const escolha of ["minha", "deles"]) {
  const servidor = servidorDeCombate(combateDeTeste());
  let perguntado = null;
  const { fila, relogio } = filaDeTeste(servidor, {
    aoConflito: (lista) => { perguntado = lista; return Promise.resolve({ [lista[0].chave]: escolha }); },
  });

  fila.definirIniciativa("a", 15);
  servidor.outraPessoa([{ tipo: "iniciativa", participanteId: "a", valor: 12 }]);
  await relogio.avancar(5000);
  await esvaziar();
  t.ok(`mesmo campo mudado pelos dois: a pessoa decide (${escolha})`, perguntado && perguntado.length === 1 &&
    perguntado[0].minha === 15 && perguntado[0].deles === 12 && perguntado[0].antes === 10);
  t.igual(`  escolhendo "${escolha}", o servidor fica com ${escolha === "minha" ? 15 : 12}`,
    servidor.combate.participantes.find((p) => p.id === "a").ordem, escolha === "minha" ? 15 : 12);
}

{
  const servidor = servidorDeCombate(combateDeTeste());
  let perguntado = false;
  const { fila, relogio } = filaDeTeste(servidor, { aoConflito: () => { perguntado = true; return Promise.resolve({}); } });

  fila.definirIniciativa("b", 30);
  servidor.outraPessoa([{ tipo: "iniciativa", participanteId: "b", valor: 2 }]);
  const remoto = JSON.parse(JSON.stringify(servidor.combate));
  fila.receberRemoto(remoto);
  await esvaziar();
  t.ok("a sincronização traz a mudança no mesmo campo ANTES do envio: pergunta em vez de sobrescrever", perguntado);
  await relogio.avancar(6000);
  t.igual("  sem escolha, fica o valor da outra pessoa", servidor.combate.participantes.find((p) => p.id === "b").ordem, 2);

  const velho = JSON.parse(JSON.stringify(remoto));
  velho.rev = 1;
  velho.participantes[0].ordem = -50;
  fila.receberRemoto(velho);
  t.igual("resposta atrasada (revisão menor) não apaga valor novo", fila.vista().participantes[0].ordem, 10);
}

{
  const servidor = servidorDeCombate(combateDeTeste());
  servidor.comportamento = () => "segurar";
  const { fila, relogio, avisos } = filaDeTeste(servidor);

  fila.enfileirar({ tipo: "turno", direcao: "proximo" });
  await relogio.avancar(0);
  t.igual("o clique no turno aparece na tela antes da resposta", fila.vista().turno.ativoId, "b");
  servidor.outraPessoa([{ tipo: "turno", direcao: "proximo" }]);
  servidor.comportamento = null;
  servidor.soltar();
  await esvaziar();
  t.igual("outro mestre avançou antes: o avanço desta aba NÃO é reaplicado (não pula ninguém)", servidor.combate.turno.ativoId, "b");
  t.ok("  e a pessoa é avisada", avisos.some((a) => /turno mudou/i.test(a)));
}

t.grupo("Fila do combate — operações pontuais");

{
  const servidor = servidorDeCombate(Object.assign(combateDeTeste(), { estado: "preparando", turno: { rodada: 0, ativoId: null } }));
  const { fila, relogio } = filaDeTeste(servidor);

  const iniciou = fila.enfileirar({ tipo: "estado", valor: "ativo" });
  const avancou = fila.enfileirar({ tipo: "turno", direcao: "proximo" });
  await relogio.avancar(0);
  t.igual("iniciar e avançar em seguida saem em ordem, num lote", servidor.pedidos[0].ops.map((o) => o.tipo).join(","), "estado,turno");
  t.ok("  e as duas promessas confirmam", (await iniciou).ok && (await avancou).ok);
  t.iguais("  rodada 1, segundo da ordem", servidor.combate.turno, { rodada: 1, ativoId: "b" });

  fila.definirStatusCriatura("c", "vida", 7);
  fila.enfileirar({ tipo: "remover", participanteId: "c" });
  await relogio.avancar(0);
  t.ok("tirar um participante descarta o que estava pendente dele", !servidor.pedidos[1].ops.some((o) => o.tipo === "criatura_status"));
  t.ok("  e ele sai", !servidor.combate.participantes.some((p) => p.id === "c"));

  fila.definirStatusCriatura("b", "vida", 999);
  await relogio.avancar(1300);
  t.igual("status de criatura sobe em ~1,2 s e respeita o máximo", servidor.combate.participantes.find((p) => p.id === "b").snapshot.status[0].atual, 20);
}

t.grupo("Sincronia — ritmo, espera e mudanças");

{
  const S = RAMASincronia;
  t.igual("sem falha, a espera é o intervalo (sem variação)", S.proximaEspera(8000, 0, 0.5), 8000);
  t.igual("cada falha dobra", S.proximaEspera(8000, 2, 0.5), 32000);
  t.igual("até 1 minuto", S.proximaEspera(8000, 5, 0.5), 60000);
  t.ok("com variação de ±10%", S.proximaEspera(8000, 0, 0) === 7200 && S.proximaEspera(8000, 0, 1) === 8800);
  t.iguais("diferenças: só as partes cujas marcas mudaram", S.diferencas({ a: "1", b: "2" }, { a: "1", b: "3", c: "4" }), ["b", "c"]);

  const relogio = relogioFalso();
  let marcas = { personagens: "p1", combates: "k1" };
  let visivel = true;
  let resposta = () => ({ ok: true, dados: { papel: "jogador", marcas } });
  const mudancas = [];
  let perdeu = null;
  const s = S.criar({
    consultar: () => Promise.resolve(resposta()),
    marcas: { personagens: "p1", combates: "k1" },
    papel: "jogador",
    intervalo: () => 8000,
    visivel: () => visivel,
    aoMudar: (partes) => { mudancas.push(partes.join(",")); return Promise.resolve(); },
    aoPerderAcesso: (r) => { perdeu = r; },
    relogio,
    aleatorio: 0.5,
  });
  s.iniciar();
  await relogio.avancar(8000);
  t.igual("pergunta no intervalo e, sem mudança, não busca nada", mudancas.length, 0);
  marcas = { personagens: "p2", combates: "k1" };
  await relogio.avancar(8000);
  t.iguais("marca de personagens mudou: só personagens é avisada", mudancas, ["personagens"]);

  let consultas = 0;
  resposta = () => { consultas++; return { ok: false, erro: "sem_conexao" }; };
  await relogio.avancar(8000);
  await relogio.avancar(15000);
  t.igual("falha: a próxima pergunta espera o dobro", consultas, 1);
  await relogio.avancar(1000);
  t.igual("  (16 s depois da falha)", consultas, 2);

  visivel = false;
  resposta = () => { consultas++; return { ok: true, dados: { papel: "jogador", marcas } }; };
  await relogio.avancar(120000);
  const antes = consultas;
  await relogio.avancar(120000);
  t.igual("página escondida não pergunta", consultas, antes);
  visivel = true;
  s.aoMudarVisibilidade();
  await relogio.avancar(400);
  t.igual("voltando à vista, pergunta logo", consultas, antes + 1);

  resposta = () => ({ ok: true, dados: { papel: "mestre", marcas } });
  await relogio.avancar(9000);
  t.ok("papel mudou: a mudança é avisada como \"papel\"", mudancas.includes("papel"));

  resposta = () => ({ ok: false, erro: "nao_encontrado" });
  await relogio.avancar(9000);
  t.ok("perdeu o acesso: avisa e para de perguntar", perdeu && perdeu.erro === "nao_encontrado" && s.estado().parado);
}

/* =====================================================================
   v2.13 — BIBLIOTECA DE ITENS: PÁGINAS, TRANSPORTE E CARGA SOB DEMANDA
   ===================================================================== */

t.grupo("Biblioteca de itens — páginas carregam o necessário, e o catálogo só sob demanda");

{
  const scriptsDe = async (pagina) => {
    const html = await Deno.readTextFile(new URL("../" + pagina, import.meta.url));
    return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^(\.\.\/)+/, ""));
  };
  const ficha = await scriptsDe("ficha/index.html");
  t.ok("a ficha carrega js/ordem/itens.js depois das regras", ficha.indexOf("js/ordem/itens.js") > ficha.indexOf("js/ordem/regras.js") && ficha.indexOf("js/ordem/regras.js") >= 0);
  t.ok("  e a janela da biblioteca depois do inventário",
    ficha.indexOf("js/paginas/ficha-inventario-biblioteca.js") > ficha.indexOf("js/paginas/ficha-inventario.js") && ficha.indexOf("js/paginas/ficha-inventario.js") >= 0);
  const PAGINAS = ["index.html", "personagens/index.html", "campanhas/index.html", "campanha/index.html",
    "perfil/index.html", "homebrew/index.html", "ficha/index.html"];
  let alguemCarrega = false;
  for (const pagina of PAGINAS) if ((await scriptsDe(pagina)).includes("js/ordem/itens-dados.js")) alguemCarrega = true;
  t.ok("nenhuma página carrega os dados do catálogo junto com ela", !alguemCarrega);
  const testes = await scriptsDe("testes/index.html");
  t.ok("a página de testes do navegador carrega dados e catálogo", testes.includes("js/ordem/itens-dados.js") && testes.includes("js/ordem/itens.js"));
}

t.grupo("Biblioteca de itens — o pedido à Homebrew");

{
  comSessaoGuardada();
  let ultimo = null;
  rede.responder = (corpo) => { ultimo = corpo; return { ok: true, dados: [] }; };
  await RAMAApi.listarHomebrew({ escopo: "todos", tipos: ["item", "arma", "armadura", "mochila"] });
  t.iguais("a biblioteca pede só os tipos de item, em 'todos'", [ultimo.acao, ultimo.escopo, ultimo.tipos], ["listar_homebrew", "todos", ["item", "arma", "armadura", "mochila"]]);
  t.ok("  sem mandar dono, papel ou permissão", !("ownerId" in ultimo) && !("userId" in ultimo) && !("permitido" in ultimo) && !("papel" in ultimo));
  await RAMAApi.listarHomebrew({ escopo: "meus" });
  t.ok("quem não pede tipos não manda o campo (a página Homebrew continua igual)", !("tipos" in ultimo) && ultimo.escopo === "meus");
  await RAMAApi.listarHomebrew({ escopo: "todos", tipos: [] });
  t.ok("lista vazia de tipos também não vai", !("tipos" in ultimo));
}

t.grupo("Biblioteca de itens — catálogo carregado sob demanda");

{
  /* Um documento de mentira que só registra os <script> pedidos. */
  const scripts = [];
  const documentoOriginal = globalThis.document;
  globalThis.document = Object.assign({}, documentoOriginal, {
    createElement: (nome) => ({ nome, src: "", async: false, onload: null, onerror: null, parentNode: null }),
    head: {
      appendChild(el) { el.parentNode = this; scripts.push(el); },
      removeChild(el) { el.parentNode = null; el.removido = true; },
    },
  });
  delete globalThis.RAMAOrdemItensDados;
  delete globalThis.RAMAOrdemItens;
  (0, eval)(await Deno.readTextFile(new URL("../js/ordem/itens.js", import.meta.url)));
  const IT = globalThis.RAMAOrdemItens;

  const primeira = IT.carregar();
  const segunda = IT.carregar();
  t.igual("abrir a biblioteca pede UM script do catálogo", scripts.length, 1);
  t.ok("  o arquivo de dados, e assíncrono", /js\/ordem\/itens-dados\.js$/.test(scripts[0].src) && scripts[0].async === true);
  t.ok("  dois pedidos ao mesmo tempo esperam a mesma carga", primeira === segunda || scripts.length === 1);
  t.igual("  nada pronto antes de o script chegar", IT.catalogoPronto(), null);

  scripts[0].onerror();
  let falhou = null;
  await primeira.then(() => {}, (e) => { falhou = e; });
  t.ok("falha de rede rejeita, com o motivo", falhou && falhou.message === "rede");
  t.ok("  e tira o script quebrado da página", scripts[0].removido === true);

  const nova = IT.carregar();
  t.igual("tentar de novo pede o script outra vez (a falha não fica guardada)", scripts.length, 2);
  globalThis.RAMAOrdemItensDados = { versao: 1, itens: [
    { id: "op.teste.item", nome: "Item de teste", fonte: "OPRPG", pagina: 1, aba: "geral", secao: "operacionais", categoria: "I", espacos: 1, resumo: "Só para o teste." },
  ] };
  scripts[1].onload();
  const pronto = await nova;
  t.ok("quando chega, o catálogo fica pronto e congelado", pronto.itens.length === 1 && Object.isFrozen(pronto.itens[0]) && IT.catalogoPronto() === pronto);
  await IT.carregar();
  t.igual("  e a próxima abertura não pede nada", scripts.length, 2);

  IT._esquecer();
  delete globalThis.RAMAOrdemItensDados;
  const vazia = IT.carregar();
  scripts[2].onload();
  let motivo = null;
  await vazia.then(() => {}, (e) => { motivo = e.message; });
  t.igual("script que carrega sem dados rejeita como vazio", motivo, "vazio");

  globalThis.document = documentoOriginal;
}

/* =====================================================================
   v2.14 — BIBLIOTECA DE RITUAIS
   ===================================================================== */

t.grupo("Biblioteca de rituais — páginas, pedido à Homebrew e carga sob demanda");

{
  const scriptsDe = async (pagina) => {
    const html = await Deno.readTextFile(new URL("../" + pagina, import.meta.url));
    return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^(\.\.\/)+/, ""));
  };
  const ficha = await scriptsDe("ficha/index.html");
  t.ok("a ficha carrega js/ordem/rituais.js depois das regras",
    ficha.indexOf("js/ordem/rituais.js") > ficha.indexOf("js/ordem/regras.js"));
  t.ok("  e a janela da biblioteca depois da aba Rituais",
    ficha.indexOf("js/paginas/ficha-rituais-biblioteca.js") > ficha.indexOf("js/paginas/ficha-rituais.js"));
  const homebrew = await scriptsDe("homebrew/index.html");
  t.ok("a página Homebrew carrega o editor de rituais da ficha, para não haver dois formulários",
    homebrew.includes("js/paginas/ficha-rituais.js") && homebrew.includes("js/ordem/rituais.js"));
  const PAGINAS = ["index.html", "personagens/index.html", "campanhas/index.html", "campanha/index.html",
    "perfil/index.html", "homebrew/index.html", "ficha/index.html"];
  let carregaDados = false;
  for (const pagina of PAGINAS) if ((await scriptsDe(pagina)).includes("js/ordem/rituais-dados.js")) carregaDados = true;
  t.ok("nenhuma página carrega os dados do catálogo de rituais junto com ela", !carregaDados);
}

{
  comSessaoGuardada();
  let ultimo = null;
  rede.responder = (corpo) => { ultimo = corpo; return { ok: true, dados: [] }; };
  await RAMAApi.listarHomebrew({ escopo: "todos", tipos: ["ritual"] });
  t.iguais("a biblioteca de rituais pede só o tipo ritual", [ultimo.acao, ultimo.escopo, ultimo.tipos],
    ["listar_homebrew", "todos", ["ritual"]]);
}

{
  /* O mesmo carregador sob demanda do catálogo de itens, com o arquivo
     dos rituais: um script só, falha que não fica guardada. */
  const scripts = [];
  const documentoOriginal = globalThis.document;
  globalThis.document = Object.assign({}, documentoOriginal, {
    createElement: (nome) => ({ nome, src: "", async: false, onload: null, onerror: null, parentNode: null }),
    head: {
      appendChild(el) { el.parentNode = this; scripts.push(el); },
      removeChild(el) { el.parentNode = null; el.removido = true; },
    },
  });
  delete globalThis.RAMAOrdemRituaisDados;
  delete globalThis.RAMAOrdemRituais;
  (0, eval)(await Deno.readTextFile(new URL("../js/ordem/rituais.js", import.meta.url)));
  const RT = globalThis.RAMAOrdemRituais;

  const primeira = RT.carregar();
  RT.carregar();
  t.igual("abrir a biblioteca pede UM script do catálogo de rituais", scripts.length, 1);
  t.ok("  o arquivo de dados, e assíncrono", /js\/ordem\/rituais-dados\.js$/.test(scripts[0].src) && scripts[0].async === true);
  t.igual("  nada pronto antes de o script chegar", RT.catalogoPronto(), null);

  scripts[0].onerror();
  let falhou = null;
  await primeira.then(() => {}, (e) => { falhou = e; });
  t.ok("falha de rede rejeita e tira o script quebrado", falhou && falhou.message === "rede" && scripts[0].removido === true);

  const nova = RT.carregar();
  t.igual("tentar de novo pede o script outra vez", scripts.length, 2);
  globalThis.RAMAOrdemRituaisDados = { versao: 1, rituais: [
    { id: "op.ritual.teste", nome: "Ritual de teste", elemento: "sangue", circulo: 2, fonte: "OPRPG", pagina: 1,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "cena", resumo: "Só para o teste.",
      versoes: [{ nome: "Discente", custo: 3, alteracoes: "Dobra." }] },
  ] };
  scripts[1].onload();
  const pronto = await nova;
  t.ok("quando chega, o catálogo fica pronto e congelado",
    pronto.rituais.length === 1 && Object.isFrozen(pronto.rituais[0]) && RT.catalogoPronto() === pronto);
  t.iguais("  com a versão básica na frente e o custo total somado uma vez",
    pronto.rituais[0].versoes.map((v) => v.nome + ":" + v.custo + ":" + v.custoTotal), ["Normal:0:3", "Discente:3:6"]);
  await RT.carregar();
  t.igual("  e a próxima abertura não pede nada", scripts.length, 2);

  globalThis.document = documentoOriginal;
}

/* =====================================================================
   v2.15 — FICHA EM BLOCOS, DO LADO DO NAVEGADOR
   ---------------------------------------------------------------------
   O servidor passou a reconhecer a mesma gravação chegando de novo pelo
   id de operação. Isso só funciona se o navegador REPETIR o mesmo pedido
   — mesma ficha, mesma revisão, mesmo id — e nunca aproveitar a
   repetição para mandar outra coisa. É o que se confere aqui, com um
   servidor de mentira que grava e "perde" a resposta.
   ===================================================================== */

globalThis.removeEventListener = () => {};

for (const caminho of ["js/salvar.js", "js/fila.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

/* Um servidor de personagem com revisão e id de operação, igual ao de
   verdade no que importa aqui. `perderResposta` faz a próxima gravação
   ACONTECER e a resposta não chegar. */
function servidorDeFicha(fichaInicial, revInicial) {
  const s = {
    ficha: JSON.parse(JSON.stringify(fichaInicial)),
    rev: revInicial,
    ultimaOperacao: "",
    pedidos: [],
    perderResposta: 0,
    responderComErro: null,
    enviar(dados, rev, operacaoId) {
      s.pedidos.push({ dados: JSON.parse(JSON.stringify(dados)), rev, operacaoId });
      if (s.responderComErro) { const e = s.responderComErro; s.responderComErro = null; return Promise.resolve(e); }
      if (rev !== s.rev) {
        if (operacaoId && operacaoId === s.ultimaOperacao) return Promise.resolve({ ok: true, rev: s.rev, repetida: true });
        return Promise.resolve({ ok: false, erro: "conflito", rev: s.rev, dados: JSON.parse(JSON.stringify(s.ficha)) });
      }
      s.ficha = JSON.parse(JSON.stringify(dados));
      s.rev++;
      s.ultimaOperacao = operacaoId || "";
      if (s.perderResposta) { s.perderResposta--; return Promise.resolve({ ok: false, erro: "prazo" }); }
      return Promise.resolve({ ok: true, rev: s.rev });
    },
  };
  return s;
}

function salvadorDeTeste(servidor, estado, extra) {
  const estados = [];
  const erros = [];
  const salvador = RAMASalvador.criar(Object.assign({
    indicador: { definir: (n) => estados.push(n), salvoAgora: () => estados.push("salvo"), parar() {} },
    instantaneo: () => estado.ficha,
    enviar: (dados, rev, operacaoId) => servidor.enviar(dados, rev, operacaoId),
    aplicar: (conciliada) => { estado.ficha = conciliada; },
    esquema: {},
    aoErroPermanente: (r) => erros.push(r),
  }, extra || {}));
  salvador.definirBase(estado.ficha, servidor.rev);
  return { salvador, estados, erros };
}

t.grupo("Ficha em blocos — a resposta se perdeu: o salvador repete o MESMO pedido");

{
  const estado = { ficha: { nome: "Grande", anotacao: "a".repeat(120000) } };
  const servidor = servidorDeFicha(estado.ficha, 4);
  const { salvador, estados } = salvadorDeTeste(servidor, estado);

  estado.ficha = Object.assign({}, estado.ficha, { nome: "Grande editada" });
  servidor.perderResposta = 1;
  salvador.alterou();
  await salvador.agora();
  t.igual("o servidor gravou, mas a resposta não chegou", servidor.rev, 5);
  t.ok("  a tela não diz 'Salvo'", estados[estados.length - 1] !== "salvo" && salvador.temPendencia());

  /* Enquanto espera para repetir, a pessoa continua editando. */
  estado.ficha = Object.assign({}, estado.ficha, { nome: "Grande editada de novo" });
  salvador.alterou();
  await salvador.agora();
  await new Promise((r) => setTimeout(r, 30));
  await esvaziar();

  const [primeiro, repetido, seguinte] = servidor.pedidos;
  t.igual("a repetição leva o MESMO id de operação", repetido.operacaoId, primeiro.operacaoId);
  t.igual("  a MESMA revisão", repetido.rev, 4);
  t.ok("  e a MESMA ficha — não aproveita para mandar a edição nova", repetido.dados.nome === "Grande editada");
  t.igual("o servidor reconhece a repetição e não aplica de novo", servidor.rev, 6);
  t.ok("a edição feita no meio-tempo sobe no pedido seguinte", !!seguinte && seguinte.dados.nome === "Grande editada de novo");
  t.ok("  com id novo", seguinte && seguinte.operacaoId !== primeiro.operacaoId);
  t.igual("  na revisão que a repetição confirmou", seguinte && seguinte.rev, 5);
  t.ok("nenhum conflito com a própria gravação", !salvador.emConflito());
  t.igual("e só então 'Salvo'", estados[estados.length - 1], "salvo");
  t.ok("  sem nada pendente", !salvador.temPendencia());
  t.ok("a anotação de 120 mil caracteres foi inteira em todos os pedidos",
    servidor.pedidos.every((p) => p.dados.anotacao.length === 120000));
  salvador.parar();
}

t.grupo("Ficha em blocos — o que repetir não resolve para de repetir, sem perder nada");

{
  const estado = { ficha: { nome: "Enorme" } };
  const servidor = servidorDeFicha(estado.ficha, 2);
  const { salvador, estados, erros } = salvadorDeTeste(servidor, estado);

  servidor.responderComErro = { ok: false, erro: "ficha_grande_demais", tamanho: 1200000, limite: 1000000 };
  estado.ficha = { nome: "Enorme", texto: "z".repeat(10) };
  salvador.alterou();
  await salvador.agora();
  t.igual("a ficha acima do limite total: o motivo vai para a tela, uma vez", erros.length, 1);
  t.igual("  com os números do servidor", erros[0] && erros[0].limite, 1000000);
  t.igual("  o estado é 'erro'", estados[estados.length - 1], "erro");
  t.ok("  e a alteração continua pendente — nada se perdeu", salvador.temPendencia() && !!salvador.bloqueio());

  const antes = servidor.pedidos.length;
  estado.ficha = { nome: "Enorme", texto: "z".repeat(11) };
  salvador.alterou();
  await new Promise((r) => setTimeout(r, 600));
  t.igual("editar depois disso não vira uma tentativa por tecla", servidor.pedidos.length, antes);

  await salvador.agora();
  t.igual("'Salvar agora' tenta de novo", servidor.pedidos.length, antes + 1);
  t.ok("  e, aceito, fica salvo", !salvador.temPendencia() && estados[estados.length - 1] === "salvo");
  salvador.parar();
}

{
  const estado = { ficha: { nome: "Tropeço" } };
  const servidor = servidorDeFicha(estado.ficha, 1);
  const { salvador, erros } = salvadorDeTeste(servidor, estado);
  servidor.responderComErro = { ok: false, erro: "armazenamento_falhou", etapa: "publicacao" };
  estado.ficha = { nome: "Tropeço 2" };
  salvador.alterou();
  await salvador.agora();
  t.igual("'o arquivo não confirmou' não para as tentativas", erros.length, 0);
  await salvador.agora();
  t.igual("  a repetição é o mesmo pedido, e entra", servidor.pedidos.length === 2 && servidor.pedidos[1].operacaoId === servidor.pedidos[0].operacaoId, true);
  t.igual("  gravado uma vez", servidor.rev, 2);
  salvador.parar();
}

t.grupo("Ficha em blocos — o painel do mestre repete o mesmo ajuste antes do clique seguinte");

{
  const pedidos = [];
  let perder = 1;
  let revServidor = 3;
  let ultimaOp = "";
  const personagem = { id: "p1", rev: 3 };
  const concluidos = [];
  const fila = RAMAFila.criar({
    espera: 0,
    enviar: (a) => {
      if (!a.operacaoId) a.operacaoId = RAMAApi.novaOperacao();
      pedidos.push({ valor: a.valor, rev: a.personagem.rev, operacaoId: a.operacaoId });
      if (a.personagem.rev !== revServidor) {
        if (a.operacaoId === ultimaOp) return Promise.resolve({ ok: true, rev: revServidor, repetida: true, dados: { valor: a.valor } });
        return Promise.resolve({ ok: false, erro: "conflito", rev: revServidor });
      }
      revServidor++;
      ultimaOp = a.operacaoId;
      if (perder) { perder--; return Promise.resolve({ ok: false, erro: "prazo" }); }
      return Promise.resolve({ ok: true, rev: revServidor, dados: { valor: a.valor } });
    },
    aoConcluir: (chave, a, r) => { a.personagem.rev = r.rev; concluidos.push(a.valor); },
  });

  fila.definir("p1/pv", { personagem, valor: 19 });
  await fila.agora("p1/pv");
  t.igual("o primeiro ajuste gravou, mas a resposta se perdeu", revServidor, 4);
  fila.definir("p1/pv", { personagem, valor: 18 });
  await fila.agora("p1/pv");
  await esvaziar();
  t.igual("a repetição vem antes do clique seguinte, com o mesmo id", pedidos[1] && pedidos[1].operacaoId, pedidos[0].operacaoId);
  t.igual("  e o servidor não aplica de novo", pedidos[1] && pedidos[1].valor, 19);
  t.ok("o clique que chegou no meio não foi descartado: sobe depois", pedidos.length === 3 && pedidos[2].valor === 18);
  t.igual("  na revisão certa, sem conflito", pedidos[2] && pedidos[2].rev, 4);
  t.iguais("  e os dois ajustes terminam confirmados, na ordem", concluidos, [19, 18]);
  t.ok("  sem nada pendente", !fila.temPendencia());
  fila.parar();
}

t.grupo("Ficha em blocos — pedidos e mensagens");

{
  t.ok("criar personagem leva um id de operação e pode ser repetido pelo transporte",
    RAMAApi.podeRepetirPedido({ acao: "criar_personagem", operacaoId: "op-1234567890" }));
  t.ok("  sem o id, não pode", !RAMAApi.podeRepetirPedido({ acao: "criar_personagem" }));
  t.ok("duplicar com id também pode", RAMAApi.podeRepetirPedido({ acao: "duplicar_personagem", operacaoId: "op-1234567890" }));
  t.ok("salvar NÃO é repetido pelo transporte — quem repete é o salvador, com espera",
    !RAMAApi.podeRepetirPedido({ acao: "salvar_personagem", operacaoId: "op-1234567890" }));
  t.ok("o id de operação tem o formato que o servidor aceita", /^[A-Za-z0-9_-]{8,80}$/.test(RAMAApi.novaOperacao()));

  comSessaoGuardada();
  let ultimo = null;
  rede.responder = (corpo) => { ultimo = corpo; return { ok: true, rev: 1, dados: { id: "novo" } }; };
  await RAMAApi.criarPersonagem({ nome: "Importada" });
  t.ok("a criação (e a importação) sai com operacaoId", !!ultimo && /^op-/.test(ultimo.operacaoId));
  await RAMAApi.salvarPersonagem("p1", 3, { nome: "A" }, "op-da-ficha-0001");
  t.igual("a gravação sai com o id que o salvador deu", ultimo.operacaoId, "op-da-ficha-0001");

  const grande = RAMAApi.frase({ ok: false, erro: "ficha_grande_demais", tamanho: 1234567, limite: 1000000 });
  t.ok("a mensagem de limite total mostra o tamanho e o limite", grande.texto.indexOf("1.234.567") >= 0 && grande.texto.indexOf("1.000.000") >= 0);
  const sugereApagar = /apag|remov|exclu|diminu|reduz|encurt|simplifi/i;
  ["ficha_grande_demais", "ficha_ilegivel", "armazenamento_falhou", "dados_grandes"].forEach((codigo) => {
    const f = RAMAApi.frase({ ok: false, erro: codigo, tamanho: 2000000, limite: 1000000 });
    t.ok("'" + codigo + "' explica sem mandar apagar habilidades, rituais ou anotações",
      f.titulo !== "ALGO DEU ERRADO" && !sugereApagar.test(f.texto.replace(/nada foi alterado nem apagado|nada foi perdido/gi, "")));
  });
  t.ok("a ficha ilegível diz que nada foi alterado", /nada foi alterado nem apagado/i.test(RAMAApi.frase({ erro: "ficha_ilegivel" }).texto));
}

/* =====================================================================
   FIM
   ===================================================================== */

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);

if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
}

Deno.exit(falharam ? 1 : 0);
