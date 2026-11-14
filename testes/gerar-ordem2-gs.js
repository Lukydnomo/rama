/* =====================================================================
   R.A.M.A. — copia o motor de Ordem II para backend/Ordem2.gs
   ---------------------------------------------------------------------
       deno run --allow-read --allow-write testes/gerar-ordem2-gs.js

   O servidor roda o MESMO motor do navegador. Cada arquivo de
   js/ordem2/ entra entre os marcadores "/* >>> caminho *\/" e
   "/* <<< caminho *\/"; o teste do backend confere que as cópias batem
   com os originais. Rode depois de mudar o motor.
   ===================================================================== */
export const ARQUIVOS_ORDEM2 = ["catalogo", "regras", "motor", "mesa", "ameacas", "procedimentos", "evolucao", "paranormal"].map((n) => "js/ordem2/" + n + ".js");

if (import.meta.main) {
  const alvo = new URL("../backend/Ordem2.gs", import.meta.url);
  let gs = (await Deno.readTextFile(alvo)).replace(/\r\n/g, "\n");
  for (const caminho of ARQUIVOS_ORDEM2) {
    const fonte = (await Deno.readTextFile(new URL("../" + caminho, import.meta.url))).replace(/\r\n/g, "\n");
    const ini = "/* >>> " + caminho + " */\n", fim = "/* <<< " + caminho + " */";
    const a = gs.indexOf(ini), b = gs.indexOf(fim);
    if (a < 0 || b < 0) throw new Error("marcadores ausentes: " + caminho);
    gs = gs.slice(0, a + ini.length) + fonte.replace(/\n?$/, "\n") + gs.slice(b);
  }
  await Deno.writeTextFile(alvo, gs);
  console.log("backend/Ordem2.gs atualizado com " + ARQUIVOS_ORDEM2.length + " arquivos.");
}
