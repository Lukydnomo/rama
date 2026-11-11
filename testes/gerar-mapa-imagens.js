/* =====================================================================
   R.A.M.A. — mapa das imagens estáticas que continuam em PNG (v7.2)
   ---------------------------------------------------------------------
       deno run --allow-read --allow-write testes/gerar-mapa-imagens.js

   O formato preferido das imagens de assets/rituais e assets/criaturas é
   WebP: o caminho montado pelo código termina em .webp. Algumas ficam
   em PNG porque o PNG saiu menor ou porque a conversão comprometeria a
   arte. Este script olha o DISCO e grava, entre os marcadores
   "mapa gerado" de js/ordem/rituais.js e js/criaturas.js, a lista dessas
   exceções — assim cada imagem carrega pelo caminho certo na primeira
   tentativa, sem tentar .webp e cair no .png.

   Rode depois de trocar ou acrescentar uma arte (e depois de
   testes/otimizar-imagens.py, que converte para WebP quando compensa).
   Uma pasta com .webp e .png ao mesmo tempo usa o .webp e ganha aviso.
   ===================================================================== */

const RAIZ = new URL("../", import.meta.url);

async function existe(rel) { try { await Deno.stat(new URL(rel, RAIZ)); return true; } catch { return false; } }
async function* pastas(rel) {
  try {
    for await (const e of Deno.readDir(new URL(rel, RAIZ))) if (e.isDirectory) yield e.name;
  } catch { /* pasta ausente */ }
}

const avisos = [];

/* Um arquivo "nome" numa pasta: "webp", "png" ou "" (ausente). */
async function formato(pasta, nome) {
  const w = await existe(pasta + nome + ".webp"), p = await existe(pasta + nome + ".png");
  if (w && p) avisos.push(pasta + nome + ": .webp e .png ao mesmo tempo — vale o .webp; apague o .png");
  return w ? "webp" : p ? "png" : "";
}

/* ---------- rituais: assets/rituais/<prefixo>/<nome>/simbolo.* ---------- */
const simbolosEmPng = [];
for await (const prefixo of pastas("assets/rituais/")) {
  for await (const nome of pastas("assets/rituais/" + prefixo + "/")) {
    if (await formato("assets/rituais/" + prefixo + "/" + nome + "/", "simbolo") === "png") simbolosEmPng.push(prefixo + "/" + nome);
  }
}
const provisorio = await formato("assets/rituais/", "provisorio");
if (!provisorio) throw new Error("assets/rituais/provisorio.webp (ou .png) não existe: rode testes/gerar-simbolos-rituais.js");

/* ---------- criaturas: assets/criaturas/<livro>/<nome>/{retrato,corpo}.* ---------- */
const criaturasEmPng = [];
for await (const livro of pastas("assets/criaturas/")) {
  for await (const nome of pastas("assets/criaturas/" + livro + "/")) {
    for (const arq of ["retrato", "corpo"]) {
      if (await formato("assets/criaturas/" + livro + "/" + nome + "/", arq) === "png") criaturasEmPng.push(livro + "/" + nome + "/" + arq);
    }
  }
}

function objeto(chaves) {
  const l = chaves.slice().sort();
  if (!l.length) return "{}";
  return "{\n" + l.map((k) => "    " + JSON.stringify(k) + ": 1,").join("\n") + "\n  }";
}

async function gravar(caminho, corpo) {
  const url = new URL(caminho, RAIZ);
  const original = await Deno.readTextFile(url);
  const nl = original.includes("\r\n") ? "\r\n" : "\n";
  const texto = original.replace(/\r\n/g, "\n");
  const ini = "/* >>> mapa gerado (testes/gerar-mapa-imagens.js) */\n", fim = "  /* <<< mapa gerado */";
  const a = texto.indexOf(ini), b = texto.indexOf(fim);
  if (a < 0 || b < 0) throw new Error("marcadores ausentes em " + caminho);
  const novo = texto.slice(0, a + ini.length) + corpo + "\n" + texto.slice(b);
  if (novo !== texto) await Deno.writeTextFile(url, novo.replace(/\n/g, nl));
  return novo !== texto;
}

const mudouR = await gravar("js/ordem/rituais.js",
  "  var SIMBOLO_PROVISORIO = \"assets/rituais/provisorio." + provisorio + "\";\n" +
  "  var SIMBOLOS_EM_PNG = " + objeto(simbolosEmPng) + ";");
const mudouC = await gravar("js/criaturas.js", "  var IMAGENS_EM_PNG = " + objeto(criaturasEmPng) + ";");

console.log(`rituais: provisório .${provisorio}, ${simbolosEmPng.length} símbolo(s) em PNG${mudouR ? " (js/ordem/rituais.js atualizado)" : ""}`);
console.log(`criaturas: ${criaturasEmPng.length} imagem(ns) em PNG${mudouC ? " (js/criaturas.js atualizado)" : ""}`);
for (const a of avisos) console.log("aviso: " + a);
