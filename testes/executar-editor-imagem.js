/* =====================================================================
   R.A.M.A. — testes da geometria do editor de imagem (v2.27)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-editor-imagem.js

   O recorte é um retângulo em pixels da imagem original. Aqui se tranca
   o que nunca pode acontecer: recorte fora da imagem (espaço vazio),
   proporção deformada, ampliação na saída. O fluxo com canvas, GIF,
   transparência e orientação está em testes/editor-imagem.html.
   ===================================================================== */

globalThis.window = globalThis;
(0, eval)(await Deno.readTextFile(new URL("../js/imagem-editor.js", import.meta.url)));
const E = globalThis.RAMAEditorImagem;
const G = E.geometria;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, obtido, esperado) {
    const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
    t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`);
  },
};
const perto = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const dentro = (R, W, H) => R.x >= -1e-9 && R.y >= -1e-9 && R.x + R.w <= W + 1e-6 && R.y + R.h <= H + 1e-6 && R.w > 0 && R.h > 0;

t.grupo("Destinos");
t.igual("os seis destinos", E.DESTINOS, ["avatar", "retrato", "criatura", "aliado", "capa", "documento"]);
const avatar = E.configuracao("avatar");
t.ok("avatar: 1:1 com máscara redonda e 256 px", avatar.proporcao === 1 && avatar.mascara === "circulo" && avatar.lado === 256);
const retrato = E.configuracao("retrato");
t.ok("retrato: 1:1, arquivo quadrado, guia redonda", retrato.proporcao === 1 && !retrato.mascara && retrato.guia === "circulo");
const capa = E.configuracao("capa");
t.ok("capa: 3:1, até 1500 px, GIF até 4096", capa.proporcao === 3 && capa.largura === 1500 && capa.gifMaximo === 4096);
const doc = E.configuracao("documento");
t.ok("documento: livre, inteira por padrão, 1024 px, sem proporção forçada", doc.livre && doc.inteiraPorPadrao && doc.lado === 1024 && !doc.proporcao);
t.igual("título pode ser trocado por quem chama", E.configuracao("criatura", { titulo: "Imagem do aliado" }).titulo, "Imagem do aliado");
let lancou = false; try { E.configuracao("nada"); } catch (e) { lancou = true; }
t.ok("destino desconhecido é erro de programação", lancou);

t.grupo("Enquadramento inicial");
t.igual("quadrada: a imagem toda", G.inicial(500, 500, avatar), { x: 0, y: 0, w: 500, h: 500 });
t.igual("horizontal: quadrado central", G.inicial(800, 400, avatar), { x: 200, y: 0, w: 400, h: 400 });
t.igual("vertical: quadrado central", G.inicial(300, 600, retrato), { x: 0, y: 150, w: 300, h: 300 });
t.igual("capa 3:1 numa foto 4:3", G.inicial(1200, 900, capa), { x: 0, y: 250, w: 1200, h: 400 });
t.igual("capa numa panorâmica: altura toda", G.inicial(4000, 1000, capa), { x: 500, y: 0, w: 3000, h: 1000 });
t.igual("documento: a imagem inteira", G.inicial(1600, 400, doc), { x: 0, y: 0, w: 1600, h: 400 });

t.grupo("Zoom");
let R = G.inicial(800, 400, avatar);
let R2 = G.comZoom(R, 800, 400, 1, 2);
t.ok("zoom 2× divide o lado pela metade, no mesmo centro", perto(R2.w, 200) && perto(R2.h, 200) && perto(R2.x + 100, 400) && perto(R2.y + 100, 200));
t.ok("zoom abaixo de 1 volta a 1", perto(G.comZoom(R2, 800, 400, 1, 0.2).w, 400));
t.ok("zoom máximo: 8× ou o lado mínimo de 32 px", perto(G.zoomMaximo(800, 400, 1), 8) && perto(G.zoomMaximo(100, 100, 1), 100 / 32));
t.ok("imagem menor que o mínimo não dá zoom", G.zoomMaximo(20, 20, 1) === 1);
const rosto = { x: 700, y: 100 };
R2 = G.comZoom(R, 800, 400, 1, 3, rosto);
t.ok("zoom no rosto fora do centro mantém o rosto dentro do recorte", rosto.x >= R2.x && rosto.x <= R2.x + R2.w && rosto.y >= R2.y && rosto.y <= R2.y + R2.h);
t.ok("  sem sair da imagem", dentro(R2, 800, 400));
const centrado = G.mover(R2, rosto.x - (R2.x + R2.w / 2), rosto.y - (R2.y + R2.h / 2), 800, 400);
t.ok("arrastar até o rosto o põe no centro do recorte", perto(centrado.x + centrado.w / 2, 700) && perto(centrado.y + centrado.h / 2, 100));
t.ok("zoomDe é o inverso de comZoom", perto(G.zoomDe(G.comZoom(R, 800, 400, 1, 2.5), 800, 400, 1), 2.5));

t.grupo("Deslocamento e posição");
R2 = G.comZoom(R, 800, 400, 1, 2);
t.igual("mover além da borda para no limite", G.mover(R2, 10000, -10000, 800, 400), { x: 600, y: 0, w: 200, h: 200 });
t.igual("posição em % da folga", G.posicao({ x: 300, y: 100, w: 200, h: 200 }, 800, 400), { x: 50, y: 50 });
t.igual("sem folga no eixo: null", G.posicao({ x: 0, y: 0, w: 400, h: 400 }, 400, 600), { x: null, y: 0 });
t.igual("comPosicao leva ao canto", G.comPosicao(R2, 800, 400, 100, 0), { x: 600, y: 0, w: 200, h: 200 });
t.ok("comPosicao e posicao se desfazem", perto(G.posicao(G.comPosicao(R2, 800, 400, 37, 81), 800, 400).x, 37) &&
  perto(G.posicao(G.comPosicao(R2, 800, 400, 37, 81), 800, 400).y, 81));

t.grupo("Recorte livre (documentos)");
let L = G.inicial(1000, 500, doc);
let L2 = G.comTamanho(L, 1000, 500, 50, null);
t.ok("largura 50% mantém o centro e a altura", perto(L2.w, 500) && perto(L2.x, 250) && perto(L2.h, 500));
L2 = G.comTamanho(L2, 1000, 500, null, 10);
t.ok("altura 10%: proporção livre", perto(L2.h, 50) && perto(L2.w, 500) && dentro(L2, 1000, 500));
t.ok("tamanho mínimo de 32 px", G.comTamanho(L, 1000, 500, 0.1, 0.1).w === 32 && G.comTamanho(L, 1000, 500, 0.1, 0.1).h === 32);
const L3 = G.comZoom(L2, 1000, 500, L2.w / L2.h, 2);
t.ok("zoom livre conserva a proporção escolhida", perto(L3.w / L3.h, L2.w / L2.h) && dentro(L3, 1000, 500));

t.grupo("Nada de espaço vazio nem deformação (1.000 sequências aleatórias)");
let semVazio = true, semDeformar = true;
let semente = 7;
const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
for (let n = 0; n < 1000; n++) {
  const W = 20 + Math.floor(aleatorio() * 4000), H = 20 + Math.floor(aleatorio() * 4000);
  const cfg = [avatar, capa, retrato][n % 3];
  let r = G.inicial(W, H, cfg);
  for (let k = 0; k < 12; k++) {
    const op = Math.floor(aleatorio() * 4);
    if (op === 0) r = G.comZoom(r, W, H, cfg.proporcao, aleatorio() * 10, { x: aleatorio() * W, y: aleatorio() * H });
    else if (op === 1) r = G.mover(r, (aleatorio() - 0.5) * 5000, (aleatorio() - 0.5) * 5000, W, H);
    else if (op === 2) r = G.comPosicao(r, W, H, aleatorio() * 140 - 20, aleatorio() * 140 - 20);
    else r = G.comZoom(r, W, H, cfg.proporcao, 1);
    if (!dentro(r, W, H)) semVazio = false;
    if (!perto(r.w / r.h, cfg.proporcao, 1e-6)) semDeformar = false;
  }
}
t.ok("o recorte nunca sai da imagem", semVazio);
t.ok("a proporção fixa nunca muda", semDeformar);

t.grupo("Tamanho salvo");
t.igual("avatar de foto grande: 256 × 256", G.saida({ x: 0, y: 0, w: 2000, h: 2000 }, avatar), { largura: 256, altura: 256 });
t.igual("recorte pequeno não é ampliado", G.saida({ x: 0, y: 0, w: 90, h: 90 }, avatar), { largura: 90, altura: 90 });
t.igual("capa: até 1500 × 500", G.saida({ x: 0, y: 0, w: 3000, h: 1000 }, capa), { largura: 1500, altura: 500 });
t.igual("documento panorâmico: maior lado 1024, proporção mantida", G.saida({ x: 0, y: 0, w: 1600, h: 400 }, doc), { largura: 1024, altura: 256 });
t.igual("documento em pé", G.saida({ x: 0, y: 0, w: 600, h: 2400 }, doc), { largura: 256, altura: 1024 });

t.grupo("Prévia = recorte");
const v = G.vista({ x: 100, y: 50, w: 300, h: 100 }, 600, 400, 24);
t.ok("o quadro tem a proporção do recorte", perto(v.quadro.w / v.quadro.h, 3));
t.ok("o canto do recorte cai no canto do quadro", perto(v.imagem.x + 100 * v.escala, v.quadro.x) && perto(v.imagem.y + 50 * v.escala, v.quadro.y));
t.ok("o quadro cabe no palco com a margem", v.quadro.x >= 24 - 1e-9 && v.quadro.x + v.quadro.w <= 600 - 24 + 1e-9);

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
