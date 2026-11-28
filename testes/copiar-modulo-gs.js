/* =====================================================================
   R.A.M.A. — copia um módulo compartilhado para dentro de um .gs
   ---------------------------------------------------------------------
   Os módulos que o site e o servidor usam com a MESMA regra (perigos,
   hacking, viagens…) moram em js/ e são copiados no backend entre os
   marcadores "/* >>> js/caminho.js *\/" e "/* <<< js/caminho.js *\/".
   Este script troca o que estiver entre eles pela versão atual do
   arquivo. Os testes do backend conferem que as cópias são idênticas.

     deno run --allow-read --allow-write testes/copiar-modulo-gs.js \
       js/ordem/viagens.js backend/Ordem.gs
   ===================================================================== */

const [modulo, destino] = Deno.args;
if (!modulo || !destino) {
  console.error("Uso: copiar-modulo-gs.js <js/arquivo.js> <backend/Arquivo.gs>");
  Deno.exit(1);
}
const raiz = new URL("../", import.meta.url);
const js = (await Deno.readTextFile(new URL(modulo, raiz))).replace(/\r\n/g, "\n");
const gs = await Deno.readTextFile(new URL(destino, raiz));
const crlf = gs.includes("\r\n");
const texto = gs.replace(/\r\n/g, "\n");
const abre = "/* >>> " + modulo + " */\n";
const fecha = "/* <<< " + modulo + " */";
const ini = texto.indexOf(abre);
const fim = texto.indexOf(fecha);
if (ini < 0 || fim < ini) {
  console.error("Marcadores de " + modulo + " não encontrados em " + destino + ".");
  Deno.exit(1);
}
const novo = texto.slice(0, ini + abre.length) + js + texto.slice(fim);
await Deno.writeTextFile(new URL(destino, raiz), crlf ? novo.replace(/\n/g, "\r\n") : novo);
console.log(modulo + " copiado em " + destino + " (" + js.length + " caracteres).");
