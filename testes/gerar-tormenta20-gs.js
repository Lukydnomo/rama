/* =====================================================================
   R.A.M.A. — copia o motor de Tormenta20 para backend/Tormenta20.gs e
   os catálogos para backend/Tormenta20Dados.gs
   ---------------------------------------------------------------------
       deno run --allow-read --allow-write testes/gerar-tormenta20-gs.js

   O servidor roda o MESMO motor do navegador. Cada arquivo de
   js/tormenta20/ entra entre os marcadores "/* >>> caminho *\/" e
   "/* <<< caminho *\/"; o teste do backend confere que as cópias batem
   com os originais. Rode depois de mudar o motor ou os catálogos.
   ===================================================================== */
export const ARQUIVOS_T20 = {
  "backend/Tormenta20.gs": ["regras", "mesa"],
  "backend/Tormenta20Dados.gs": ["dados", "expressao", "racas", "classes-a", "classes-b", "classes-c", "origens", "deuses", "poderes", "equipamento", "magias", "magias-1", "magias-2", "magias-3", "magias-4", "magias-5", "ameacas", "ameacas-1", "ameacas-2", "ameacas-3", "ameacas-4", "ameacas-5", "ameacas-6", "ameacas-7", "parceiros", "itens-magicos", "itens-magicos-2"],
};
if (import.meta.main) {
  for (const destino of Object.keys(ARQUIVOS_T20)) {
    const alvo = new URL("../" + destino, import.meta.url);
    let gs = (await Deno.readTextFile(alvo)).replace(/\r\n/g, "\n");
    for (const nome of ARQUIVOS_T20[destino]) {
      const caminho = "js/tormenta20/" + nome + ".js";
      const fonte = (await Deno.readTextFile(new URL("../" + caminho, import.meta.url))).replace(/\r\n/g, "\n");
      const ini = "/* >>> " + caminho + " */\n", fim = "/* <<< " + caminho + " */";
      const a = gs.indexOf(ini), b = gs.indexOf(fim);
      if (a < 0 || b < 0) throw new Error("marcadores ausentes: " + caminho + " em " + destino);
      gs = gs.slice(0, a + ini.length) + fonte.replace(/\n?$/, "\n") + gs.slice(b);
    }
    await Deno.writeTextFile(alvo, gs);
    console.log(destino + " atualizado com " + ARQUIVOS_T20[destino].length + " arquivos.");
  }
}
