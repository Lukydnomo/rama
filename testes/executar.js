/* =====================================================================
   R.A.M.A. — testes na linha de comando
   ---------------------------------------------------------------------
   Roda os mesmos casos de testes/casos.js fora do navegador, para dar
   para conferir o motor de dados sem abrir uma aba.

       deno run --allow-read testes/executar.js

   Os módulos do sistema são scripts clássicos que se penduram em
   `window`. Aqui `window` é o próprio escopo global, e o `document`
   existe só o suficiente para o util.js descobrir a raiz do site — que
   fora do navegador não serve para nada mesmo.
   ===================================================================== */

const ARQUIVOS = [
  "js/config.js",
  "js/util.js",
  "js/dados.js",
  "js/habilidades.js",
  "js/ordem/catalogo.js",
  "js/ordem/poderes.js",
  "js/ordem/opcionais.js",
  "js/ordem/inventario.js",
  "js/ordem/personalizacao.js",
  "js/ordem/progressao.js",
  "js/ordem/biblioteca.js",
  "js/ordem/regras.js",
  "js/ficha.js",
  "js/campanha-painel.js",
  "js/validacao.js",
  "js/sync.js",
  "js/versao.js",
  "testes/casos.js",
];

/* ---------- ambiente mínimo ---------- */

globalThis.window = globalThis;
globalThis.document = {
  currentScript: null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
};
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

/* ---------- carga ---------- */

/* URL em vez de caminho de texto: o repositório pode estar numa pasta
   com espaco ou acento, e a URL cuida disso sozinha. */
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try {
    (0, eval)(codigo);
  } catch (e) {
    console.error(`Falhou ao carregar ${caminho}: ${e.message}`);
    Deno.exit(1);
  }
}

/* ---------- coletor ---------- */

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";

let passaram = 0;
let falharam = 0;
const falhas = [];

const t = {
  grupo(titulo) {
    console.log(`\n${FORTE}${titulo}${FIM}`);
  },
  ok(nome, condicao, detalhe) {
    if (condicao) {
      passaram++;
      console.log(`  ${VERDE}ok${FIM}   ${nome}`);
    } else {
      falharam++;
      falhas.push(nome);
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

/* ---------- execução ---------- */

console.log(`${FORTE}R.A.M.A. — testes${FIM}`);

try {
  globalThis.RAMACasos(t);
} catch (e) {
  falharam++;
  console.error(`\n${VERMELHO}Os testes pararam com uma exceção:${FIM} ${e.message}`);
  console.error(e.stack);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);

if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
}

Deno.exit(falharam ? 1 : 0);
