/* =====================================================================
   R.A.M.A. — copia o motor de Vampiro para dentro de backend/Vampiro.gs
   ---------------------------------------------------------------------
       deno run --allow-read --allow-write testes/gerar-vampiro-gs.js

   O servidor roda o MESMO motor do navegador. Cada arquivo de
   js/vampiro/ entra entre os marcadores "/* >>> caminho *\/" e
   "/* <<< caminho *\/"; o teste do backend confere que as cópias batem
   com os originais. Rode depois de mudar o motor.
   ===================================================================== */
const ARQUIVOS = ["catalogo", "disciplinas-dados", "antagonistas-dados", "dados", "regras", "poderes", "cronica"].map((n) => "js/vampiro/" + n + ".js");
const alvo = new URL("../backend/Vampiro.gs", import.meta.url);
let gs = (await Deno.readTextFile(alvo)).replace(/\r\n/g, "\n");
for (const caminho of ARQUIVOS) {
  const fonte = (await Deno.readTextFile(new URL("../" + caminho, import.meta.url))).replace(/\r\n/g, "\n");
  const ini = "/* >>> " + caminho + " */\n", fim = "/* <<< " + caminho + " */";
  const a = gs.indexOf(ini), b = gs.indexOf(fim);
  if (a < 0 || b < 0) throw new Error("marcadores ausentes: " + caminho);
  gs = gs.slice(0, a + ini.length) + fonte.replace(/\n?$/, "\n") + gs.slice(b);
}
await Deno.writeTextFile(alvo, gs);
console.log("backend/Vampiro.gs atualizado com " + ARQUIVOS.length + " arquivos.");
