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
   FIM
   ===================================================================== */

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);

if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
}

Deno.exit(falharam ? 1 : 0);
