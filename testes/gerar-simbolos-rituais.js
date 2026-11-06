/* =====================================================================
   R.A.M.A. — símbolos provisórios dos rituais (v6.11)
   ---------------------------------------------------------------------
       deno run --allow-read --allow-write testes/gerar-simbolos-rituais.js

   Para cada ritual do catálogo oficial (js/ordem/rituais-dados.js), cria
   a pasta assets/rituais/<prefixo>/<nome>/ e um simbolo.png provisório
   (100 × 100, fundo transparente) — SÓ quando o arquivo não existe. Pode
   rodar de novo depois de um ritual novo entrar no catálogo: as artes
   que já foram trocadas não são tocadas. Também cria, se faltar, o
   provisório compartilhado assets/rituais/provisorio.png.

   O desenho é o mesmo em todos: um selo neutro (dois anéis e um
   triângulo com o olho), cinza médio, que aparece sobre a placa escura
   dos símbolos nos dois temas.
   ===================================================================== */

globalThis.window = globalThis;
const RAIZ = new URL("../", import.meta.url);
(0, eval)(await Deno.readTextFile(new URL("js/ordem/rituais-dados.js", RAIZ)));
const DADOS = globalThis.RAMAOrdemRituaisDados;
const lista = DADOS.rituais || [];
const ID = /^(op|sah|as[0-9]{1,2})\.ritual\.([a-z0-9][a-z0-9.-]*)$/;

/* ---------- o desenho, com 4× de superamostragem ---------- */

const L = 100, SS = 4;
function desenhar() {
  const px = new Uint8Array(L * L * 4);
  const c = L / 2;
  const cor = [140, 140, 152];
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      let cobre = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS - c, fy = y + (sy + 0.5) / SS - c;
          if (dentro(fx, fy)) cobre++;
        }
      }
      if (!cobre) continue;
      const i = (y * L + x) * 4;
      px[i] = cor[0]; px[i + 1] = cor[1]; px[i + 2] = cor[2];
      px[i + 3] = Math.round(255 * cobre / (SS * SS));
    }
  }
  return px;
}
function dentro(x, y) {
  const r = Math.hypot(x, y);
  if (r >= 44 && r <= 47) return true;              // anel de fora
  if (r >= 37 && r <= 38.6) return true;            // anel de dentro
  /* triângulo (contorno) inscrito no anel de dentro */
  const v = [[0, -33], [28.6, 16.5], [-28.6, 16.5]];
  for (let k = 0; k < 3; k++) {
    const [ax, ay] = v[k], [bx, by] = v[(k + 1) % 3];
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= 1.6) return true;
  }
  /* o olho: amêndoa e a pupila */
  const ex = x / 15, ey = (y - 2) / 7.5;
  const borda = ex * ex + ey * ey;
  if (borda <= 1 && borda >= 0.72) return true;
  if (Math.hypot(x, y - 2) <= 3.6) return true;
  return false;
}

/* ---------- PNG RGBA, sem dependência ---------- */

const TABELA = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(bytes) { let c = 0xffffffff; for (const b of bytes) c = TABELA[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function bloco(tipo, dados) {
  const t = new TextEncoder().encode(tipo);
  const out = new Uint8Array(12 + dados.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, dados.length);
  out.set(t, 4); out.set(dados, 8);
  dv.setUint32(8 + dados.length, crc(out.subarray(4, 8 + dados.length)));
  return out;
}
async function zlib(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function png(px) {
  const linhas = new Uint8Array(L * (L * 4 + 1));
  for (let y = 0; y < L; y++) { linhas[y * (L * 4 + 1)] = 0; linhas.set(px.subarray(y * L * 4, (y + 1) * L * 4), y * (L * 4 + 1) + 1); }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, L); dv.setUint32(4, L); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), bloco("IHDR", ihdr), bloco("IDAT", await zlib(linhas)), bloco("IEND", new Uint8Array(0))];
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0; for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

async function existe(url) { try { await Deno.stat(url); return true; } catch { return false; } }

const bytes = await png(desenhar());
let criados = 0, mantidos = 0, ignorados = [];
async function garantir(rel) {
  const url = new URL(rel, RAIZ);
  if (await existe(url)) { mantidos++; return; }
  await Deno.mkdir(new URL(".", url), { recursive: true });
  await Deno.writeFile(url, bytes);
  criados++;
}
await garantir("assets/rituais/provisorio.png");
for (const r of lista) {
  const m = ID.exec(String(r && r.id || ""));
  if (!m) { ignorados.push(r && r.id); continue; }
  await garantir("assets/rituais/" + m[1] + "/" + m[2] + "/simbolo.png");
}
console.log(`${lista.length} rituais no catálogo · ${criados} PNG criados · ${mantidos} já existiam (não tocados)` + (ignorados.length ? ` · ids fora do padrão: ${ignorados.join(", ")}` : ""));
