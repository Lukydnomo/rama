/* =====================================================================
   R.A.M.A. — testes do recorte de GIF animado (v9.20.0)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-gif.js

   js/gif.js é puro (bytes entram, bytes saem). Aqui se tranca:
     · o LZW de ida e volta (inclusive passando de 4096 códigos);
     · a leitura: paleta global e local, entrelaçamento, transparência,
       descarte 1/2/3, tempos e repetição;
     · o recorte: a animação continua (mesmos tempos, mesma repetição), as
       cores ficam, o transparente fica, quadros iguais viram tempo a mais
       e, sem transparência, os quadros depois do primeiro levam só o que
       mudou.
   O fluxo no editor (canvas, prévia, envio) está em testes/editor-imagem.html.
   ===================================================================== */

globalThis.window = globalThis;
(0, eval)(await Deno.readTextFile(new URL("../js/gif.js", import.meta.url)));
const G = globalThis.RAMAGif;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(nome, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};

console.log(`${FORTE}R.A.M.A. — recorte de GIF animado${FIM}`);

/* Um gerador previsível (nada aleatório entre execuções). */
let semente = 7;
function acaso(n) { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente % n; }

t.grupo("LZW: ida e volta");
for (const [minimo, tam, cores] of [[2, 10, 4], [2, 5000, 4], [8, 20000, 256], [8, 70000, 7], [4, 30000, 16]]) {
  const ind = new Uint8Array(tam);
  for (let i = 0; i < tam; i++) ind[i] = i % 97 < 40 ? acaso(cores) : (i >> 5) % cores;
  const E = new G._Escritor();
  G._lzwCodificar(E, ind, minimo);
  const b = E.bytes();
  /* junta os sub-blocos depois do byte do mínimo */
  const dados = []; let p = 1;
  while (b[p]) { for (let k = 1; k <= b[p]; k++) dados.push(b[p + k]); p += b[p] + 1; }
  const volta = G._lzwDecodificar(minimo, new Uint8Array(dados), tam);
  t.ok(`mínimo ${minimo}, ${tam} índices de ${cores} cores`, volta.every((v, i) => v === ind[i]));
}

/* Um GIF montado à mão com o próprio escritor: 3 quadros 4 × 4. */
const PAL = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]];
function cheio(w, h, k) { return new Uint8Array(w * h).fill(k); }

t.grupo("Leitura: quadros compostos, tempos e repetição");
{
  const gif = G._escrever(4, 4, PAL, 4, [
    { ind: cheio(4, 4, 0), x: 0, y: 0, w: 4, h: 4, atraso: 10, descarte: 1 },
    { ind: Uint8Array.from([1, 4, 4, 1]), x: 0, y: 0, w: 2, h: 2, atraso: 20, descarte: 1 },
    { ind: cheio(2, 2, 2), x: 2, y: 2, w: 2, h: 2, atraso: 30, descarte: 2 },
  ], 3);
  const q = await G.quadrosDe(gif);
  t.igual("tamanho, quadros e repetição", [q.largura, q.altura, q.quadros, q.repeticoes], [4, 4, 3, 3]);
  t.igual("tempos de cada quadro", q.lista.map((x) => x.atraso), [10, 20, 30]);
  const px = (f, x, y) => Array.from(q.lista[f].rgba.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4));
  t.igual("o transparente do 2º quadro mostra o 1º por baixo", [px(1, 0, 0), px(1, 1, 0), px(1, 1, 1)], [[0, 255, 0, 255], [255, 0, 0, 255], [0, 255, 0, 255]]);
  t.igual("o 3º quadro pinta só a parte dele", [px(2, 3, 3), px(2, 0, 0)], [[0, 0, 255, 255], [0, 255, 0, 255]]);
}
{
  /* Descarte 3: volta ao que estava antes do quadro. */
  const gif = G._escrever(2, 1, PAL, 4, [
    { ind: Uint8Array.from([0, 0]), x: 0, y: 0, w: 2, h: 1, atraso: 5, descarte: 1 },
    { ind: Uint8Array.from([1, 1]), x: 0, y: 0, w: 2, h: 1, atraso: 5, descarte: 3 },
    { ind: Uint8Array.from([4, 2]), x: 0, y: 0, w: 2, h: 1, atraso: 5, descarte: 1 },
  ], 0);
  const q = await G.quadrosDe(gif);
  t.igual("descarte 3 restaura o quadro anterior", Array.from(q.lista[2].rgba.slice(0, 4)), [255, 0, 0, 255]);
}
{
  /* Entrelaçado: 1 × 8, linhas na ordem 0,8 / 4 / 2,6 / 1,3,5,7. */
  const ordem = [0, 4, 2, 6, 1, 3, 5, 7];
  const linhas = [0, 1, 2, 3, 0, 1, 2, 3];
  const gif = G._escrever(1, 8, PAL, 4, [{ ind: Uint8Array.from(ordem.map((y) => linhas[y])), x: 0, y: 0, w: 1, h: 8, atraso: 0, descarte: 0 }], 0);
  /* liga o bit de entrelaçamento no descritor do quadro */
  const b = new Uint8Array(gif);
  let p = 13 + 3 * 8; /* cabeçalho + paleta de 8 cores (bitsPal = 3) */
  while (b[p] !== 0x2C) p += b[p] === 0x21 ? (3 + b[p + 2] + 1) : 1;
  b[p + 9] |= 0x40;
  const q = await G.quadrosDe(b);
  const cor = (y) => Array.from(q.lista[0].rgba.slice(y * 4, y * 4 + 3));
  t.igual("entrelaçado volta na ordem certa", [0, 1, 2, 3, 4, 5, 6, 7].map(cor), linhas.map((k) => PAL[k]));
}

t.grupo("Recorte: a animação continua");
{
  /* 4 quadros 16 × 16: fundo azul, um quadrado vermelho que anda; o 3º é
     igual ao 2º (vira tempo a mais). */
  const W = 16, H = 16;
  function quadro(x0) { const ind = cheio(W, H, 2); for (let y = 4; y < 8; y++) for (let x = x0; x < x0 + 4; x++) ind[y * W + x] = 0; return ind; }
  const gif = G._escrever(W, H, PAL, 4, [
    { ind: quadro(0), x: 0, y: 0, w: W, h: H, atraso: 8, descarte: 0 },
    { ind: quadro(4), x: 0, y: 0, w: W, h: H, atraso: 9, descarte: 0 },
    { ind: quadro(4), x: 0, y: 0, w: W, h: H, atraso: 4, descarte: 0 },
    { ind: quadro(8), x: 0, y: 0, w: W, h: H, atraso: 7, descarte: 0 },
  ], 0);
  const r = await G.recortar(gif, { x: 0, y: 0, w: 16, h: 16 }, 8, 8, { ceder: false });
  t.ok("recortou", r.ok && r.largura === 8 && r.altura === 8);
  const q = await G.quadrosDe(r.bytes);
  t.igual("quadros iguais viram tempo a mais (8, 9+4, 7)", q.lista.map((x) => x.atraso), [8, 13, 7]);
  t.igual("repetição para sempre mantida", q.repeticoes, 0);
  const px = (f, x, y) => Array.from(q.lista[f].rgba.slice((y * 8 + x) * 4, (y * 8 + x) * 4 + 3));
  t.igual("o quadrado anda (vermelho em x=0, depois x=2, depois x=4)", [px(0, 0, 2), px(1, 2, 2), px(2, 4, 2)], [[255, 0, 0], [255, 0, 0], [255, 0, 0]]);
  t.igual("e o fundo fica azul onde ele saiu", [px(1, 0, 2), px(2, 2, 2)], [[0, 0, 255], [0, 0, 255]]);
  const ex = await G.examinar(r.bytes);
  t.ok("o arquivo é menor que o original e lê sem erro", r.bytes.length < gif.length && ex.quadros === 3);
}
{
  /* Recorte fora do centro com redução: só a área escolhida. */
  const W = 20, H = 10;
  const ind = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ind[y * W + x] = x < 10 ? 1 : 3;
  const gif = G._escrever(W, H, PAL, 4, [{ ind, x: 0, y: 0, w: W, h: H, atraso: 0, descarte: 0 }, { ind, x: 0, y: 0, w: W, h: H, atraso: 0, descarte: 0 }], 2);
  const r = await G.recortar(gif, { x: 10, y: 0, w: 10, h: 10 }, 5, 5, { ceder: false });
  const q = await G.quadrosDe(r.bytes);
  t.ok("só a metade da direita (branca)", Array.from(q.lista[0].rgba.slice(0, 3)).join() === "255,255,255");
  t.ok("os dois quadros iguais viram um só (sem animação a repetir)", r.quadros === 1 && q.quadros === 1);
}
{
  /* Com transparência: cada quadro inteiro, descarte 2, transparente preservado. */
  const gif = G._escrever(4, 4, PAL, 4, [
    { ind: Uint8Array.from([4, 4, 4, 4, 4, 0, 0, 4, 4, 0, 0, 4, 4, 4, 4, 4]), x: 0, y: 0, w: 4, h: 4, atraso: 5, descarte: 2 },
    { ind: Uint8Array.from([1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]), x: 0, y: 0, w: 4, h: 4, atraso: 6, descarte: 2 },
  ], 0);
  const r = await G.recortar(gif, { x: 0, y: 0, w: 4, h: 4 }, 4, 4, { ceder: false });
  const q = await G.quadrosDe(r.bytes);
  t.ok("o transparente continua transparente", r.transparente && q.lista[0].rgba[3] === 0 && q.lista[0].rgba[(1 * 4 + 1) * 4 + 3] === 255);
  t.ok("o 2º quadro não herda o miolo do 1º (descarte 2)", q.lista[1].rgba[(1 * 4 + 1) * 4 + 3] === 0 && q.lista[1].rgba[3] === 255);
}
{
  /* Um GIF de verdade (o do teste do backend): 32 × 16, dois quadros. */
  const b64 = "R0lGODlhIAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICgAAACwAAAAAIAAQAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgAh+QQIFAAAACwAAAAAIAAQAIEAAP8AAAAAAAAAAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgA7";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ex = await G.examinar(bytes);
  t.igual("GIF real: 32 × 16, 2 quadros, tempos 10 e 20", [ex.largura, ex.altura, ex.quadros, ex.atrasos], [32, 16, 2, [10, 20]]);
  const r = await G.recortar(bytes, { x: 8, y: 0, w: 16, h: 16 }, 16, 16, { ceder: false });
  const ex2 = await G.examinar(r.bytes);
  t.ok("recortado no quadrado do meio, abre de novo", r.ok && ex2.largura === 16 && ex2.altura === 16 && ex2.quadros >= 1);
  t.ok("vira data URL de GIF", G.paraDataUrl(r.bytes).startsWith("data:image/gif;base64,R0lGODlh"));
}
{
  const ruim = new TextEncoder().encode("PNG não é GIF");
  let erro = null;
  try { await G.recortar(ruim, { x: 0, y: 0, w: 1, h: 1 }, 1, 1, { ceder: false }); } catch (e) { erro = e; }
  t.ok("arquivo que não é GIF é recusado com erro (o editor mostra o aviso)", !!erro);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
