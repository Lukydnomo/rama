/* =====================================================================
   R.A.M.A. — testes dos assets dos temas de dados (v2.40)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-dados.js

   Confere no disco o que o catálogo (js/temas-dados.js) promete: cada
   arquivo existe, base e camadas do dado têm a MESMA tela quadrada (é o
   que mantém os detalhes no lugar), a máscara é quadrada, o fundo é uma
   imagem só e de proporção livre, e o kit de modelo está completo.
   ===================================================================== */

globalThis.window = globalThis;
(0, eval)(await Deno.readTextFile(new URL("../js/temas-dados.js", import.meta.url)));
const TD = globalThis.RAMATemasDados;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
};

const raiz = new URL("../", import.meta.url);
async function existe(caminho) { try { await Deno.stat(new URL(caminho, raiz)); return true; } catch { return false; } }

/* Largura e altura de um PNG (cabeçalho IHDR) ou de um SVG (viewBox). */
async function medidas(caminho) {
  const bytes = await Deno.readFile(new URL(caminho, raiz));
  if (caminho.endsWith(".png")) {
    const v = new DataView(bytes.buffer);
    return { w: v.getUint32(16), h: v.getUint32(20), alfa: bytes[25] === 6 || bytes[25] === 4 };
  }
  if (caminho.endsWith(".svg")) {
    const texto = new TextDecoder().decode(bytes);
    const m = /viewBox="\s*0\s+0\s+([\d.]+)\s+([\d.]+)"/.exec(texto);
    return m ? { w: +m[1], h: +m[2], svg: texto } : null;
  }
  return null;
}

t.grupo("Temas de dados · assets do catálogo");
for (const tema of TD.lista()) {
  for (const v of tema.versoes) {
    const rotulo = tema.id + " v" + v.versao;
    const todos = [v.previa, v.dado.base, v.dado.mascara, v.notificacao.fundo].concat(v.dado.camadas.map((c) => c.imagem));
    const faltando = [];
    for (const c of todos) if (!(await existe(c))) faltando.push(c);
    t.ok(rotulo + ": todos os arquivos existem", !faltando.length, faltando.join(", "));
    if (faltando.length) continue;

    const base = await medidas(v.dado.base);
    t.ok(rotulo + ": a base é quadrada", base.w === base.h, base.w + "×" + base.h);
    const camadas = await Promise.all(v.dado.camadas.map((c) => medidas(c.imagem)));
    t.ok(rotulo + ": as camadas usam a MESMA tela da base, com transparência", camadas.every((m) => m.w === base.w && m.h === base.h && m.alfa),
      camadas.map((m) => m.w + "×" + m.h).join(", "));
    const mascara = await medidas(v.dado.mascara);
    t.ok(rotulo + ": a máscara é quadrada", mascara && mascara.w === mascara.h);
    if (mascara && mascara.svg) t.ok(rotulo + ": a máscara SVG não tem script nem referência externa", !/<script|href=|url\(/i.test(mascara.svg));
    const fundo = await medidas(v.notificacao.fundo);
    t.ok(rotulo + ": o fundo é uma imagem inteira (proporção livre, mais larga que alta)", fundo.w > 0 && fundo.h > 0, fundo.w + "×" + fundo.h);
  }
}

t.grupo("Temas de dados · kit de modelo");
for (const arq of ["LEIA-ME.md", "base-dado.png", "mascara-d20.png", "mascara-d20.svg", "camada-facetas.png", "camada-detalhes-vazia.png",
  "guia-alinhamento.png", "modelo-editavel.svg", "previa-dado.png", "fundo-notificacao-exemplo.png", "tema-exemplo.json"]) {
  t.ok("assets/dados/modelo/" + arq, await existe("assets/dados/modelo/" + arq));
}
const exemplo = JSON.parse(await Deno.readTextFile(new URL("assets/dados/modelo/tema-exemplo.json", raiz)));
t.ok("o tema-exemplo.json segue o contrato do catálogo", !!TD.normalizarTema(exemplo, []));
t.ok("o guia não entra em tema nenhum", !JSON.stringify(TD.lista()).includes("guia"));

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) Deno.exit(1);
