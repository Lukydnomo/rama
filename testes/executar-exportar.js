/* =====================================================================
   R.A.M.A. — testes da exportação em PDF e PNG (js/exportar/)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-exportar.js

   Sem navegador: o canvas é um dublê que mede o texto por aproximação e
   anota cada fillText. Confere o nome dos arquivos, que cada sistema
   tem o seu modelo (e não um genérico), que o texto excedente vai para
   as páginas de continuação sem se perder, que a ficha não é alterada e
   a estrutura do PDF. Dados sintéticos (testes/exportar-amostras.js).
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
const html = await Deno.readTextFile(new URL("../ficha/index.html", import.meta.url));
/* Os scripts da página da ficha até o modelo (js/ficha.js), sem as telas;
   depois o motor de exportação e os modelos. */
const daPagina = [...html.matchAll(/<script src="\.\.\/(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
const fim = daPagina.indexOf("js/validacao.js");
const ARQUIVOS = daPagina.slice(0, fim + 1).filter((c) => !/^js\/(tema\.js|interface\.js|densidade\.js|rede\.js)$/.test(c))
  .concat(["js/suplementos.js"])
  .concat(daPagina.filter((c) => c.startsWith("js/exportar/")))
  .concat(["testes/exportar-amostras.js"]);
for (const caminho of ARQUIVOS) {
  let codigo;
  try { codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url)); }
  catch (e) { console.error(`Arquivo ausente: ${caminho}`); Deno.exit(1); }
  try { (0, eval)(codigo); }
  catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIMC = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIMC}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIMC}   ${nome}`); }
    else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIMC} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIMC}` : ""}`); }
  },
  igual(nome, obtido, esperado) { t.ok(nome, obtido === esperado, obtido === esperado ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); },
};

/* --- o dublê do canvas --- */
function canvasDuble(w, h) {
  const textos = [];
  const ctx = {
    font: "10px sans-serif", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "left", textBaseline: "alphabetic", globalAlpha: 1, lineCap: "", lineJoin: "", letterSpacing: "0px",
    measureText(s) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const px = m ? Number(m[1]) : 10; return { width: String(s).length * px * 0.52 }; },
    fillText(s, x, y) { textos.push({ s: String(s), x, y, font: this.font }); },
    setTransform() {}, scale() {}, translate() {}, rotate() {}, save() {}, restore() {}, clip() {},
    fillRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, rect() {}, roundRect() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, fill() {}, stroke() {}, setLineDash() {}, drawImage() {},
    createLinearGradient() { return { addColorStop() {} }; },
  };
  return { width: w, height: h, textos, getContext() { return ctx; } };
}
const X = globalThis.RAMAExportar;
X._fabricaDeCanvas = canvasDuble;
function textoDe(doc) { return doc.paginas.map((p) => p.canvas.textos.map((x) => x.s).join("\n")).join("\n\f\n"); }

/* =================================================================== */
t.grupo("Nome dos arquivos");
{
  const info = { nome: "Helena Duarte", sistema: "ordem", data: new Date(2026, 10, 28), contaId: "A7F32", fichaId: "C9D81" };
  t.igual("PDF no formato do pedido", X.nomeDoArquivo(info, "pdf"), "Helena-Duarte_Ordem-I_2026-11-28_A7F32C9D81.pdf");
  t.igual("PNG página 1", X.nomeDoArquivo(info, "png", 1), "Helena-Duarte_Ordem-I_2026-11-28_A7F32C9D81_p01.png");
  t.igual("PNG página 3", X.nomeDoArquivo(info, "png", 3), "Helena-Duarte_Ordem-I_2026-11-28_A7F32C9D81_p03.png");
  t.igual("PNG página 12", X.nomeDoArquivo(info, "png", 12), "Helena-Duarte_Ordem-I_2026-11-28_A7F32C9D81_p12.png");
  const ruim = X.nomeDoArquivo({ nome: 'Zé  "o"  <Bravo>: 1/2? *Já*_|', sistema: "vampiro", data: new Date(2026, 0, 5), contaId: "DEBFC", fichaId: "6E6E0" }, "pdf");
  t.igual("caracteres proibidos no Windows somem, espaços viram hífen, acentos ficam", ruim, "Zé-o-Bravo-1-2-Já_Vampiro-V5_2026-01-05_DEBFC6E6E0.pdf");
  t.ok("nenhum caractere proibido no nome", !/[<>:"\/\\|?*\u0000-\u001f]/.test(ruim));
  t.igual("nome reservado do Windows vira o padrão", X.componente("CON"), "ficha");
  t.igual("nome vazio vira Personagem", X.nomeDoArquivo({ nome: "  ", sistema: "universal", data: new Date(2026, 1, 3), contaId: "AAAAA", fichaId: "BBBBB" }, "pdf"), "Personagem_Universal_2026-02-03_AAAAABBBBB.pdf");
  t.igual("data local com zeros", X.dataLocal(new Date(2026, 8, 7, 23, 59)), "2026-09-07");
  const sistemas = Object.keys(X.NOME_DO_SISTEMA);
  t.ok("todos os oito sistemas têm nome de arquivo", ["ordem", "ordem2", "oblivio", "vampiro", "goblins", "brutal", "tormenta20", "universal"].every((s) => sistemas.includes(s)));
  t.igual("os códigos de agente e de registro são os de RAMAUtil.codigoCurto", globalThis.RAMAUtil.codigoCurto("x").length, 5);
}

/* =================================================================== */
t.grupo("Um modelo por sistema");
const curtas = globalThis.RAMAExportarAmostras.todas(false);
const longas = globalThis.RAMAExportarAmostras.todas(true);
const ESPERADO = {
  ordem: ["ORDEM PARANORMAL", "PERÍCIAS", "ATAQUES", "Helena Duarte", "Acadêmico", "Combatente", "Aniquilador", "NEX 25%"],
  ordem2: ["ORDEM PARANORMAL RPG II", "PERÍCIAS", "ATRIBUTOS", "ALAN", "PV", "PD"],
  oblivio: ["Conhecimentos", "Fora de Ação", "Habilidade Principal:", "Dora Vasconcelos", "Motivação:", "Papel de Persona:"],
  vampiro: ["VAMPIRO", "ATRIBUTOS", "HABILIDADES", "DISCIPLINAS", "Iara Monteiro", "Brujah", "Humanidade", "Fome"],
  goblins: ["Ficha do Goblin", "FICHA DO GOBLIN", "Combate", "Habilidade", "Noção", "Vitalidade", "Equipamento", "Ferimentos:", "Gnarsh"],
  brutal: ["BRUTAL", "HABILIDADES:", "PILHA DE DADOS:", "PONTOS DE TENSÃO:", "DADO MARCADO:", "DADOS DE FUGA:", "SEQUELAS:", "Bia Teixeira", "Apito do treinador"],
  tormenta20: ["TORMENTA", "PERÍCIAS", "ATAQUES", "EQUIPAMENTO", "Sir Aldric", "FOR", "CAR"],
  universal: ["Capitã Rhea", "NOME DO PERSONAGEM", "ATAQUES", "Exploradora", "Pistola de plasma"],
};
const orientacao = {};
for (const id of Object.keys(ESPERADO)) {
  let doc = null, erro = "";
  try { doc = X.gerar(curtas[id], { campanha: "Mesa sintética" }); } catch (e) { erro = e.message; }
  t.ok(`${id}: gera sem erro`, !!doc, erro);
  if (!doc) continue;
  t.igual(`${id}: usa o modelo do próprio sistema`, doc.sistema, id);
  const texto = textoDe(doc);
  const faltam = ESPERADO[id].filter((s) => !texto.includes(s));
  t.ok(`${id}: tem a cara da ficha de referência e os dados do personagem`, !faltam.length, "faltam: " + faltam.join(", "));
  orientacao[id] = doc.paginas[0].largura > doc.paginas[0].altura ? "paisagem" : "retrato";
}
t.igual("Oblívio é horizontal", orientacao.oblivio, "paisagem");
t.igual("Ordem II é horizontal", orientacao.ordem2, "paisagem");
t.ok("os demais são verticais", ["ordem", "vampiro", "goblins", "brutal", "tormenta20", "universal"].every((k) => orientacao[k] === "retrato"));
{
  const textos = Object.keys(ESPERADO).map((id) => textoDe(X.gerar(curtas[id], {})).split("\f")[0]);
  t.ok("as primeiras páginas dos oito sistemas são diferentes entre si", new Set(textos).size === 8);
}

/* =================================================================== */
t.grupo("Continuação: nada se perde");
for (const id of ["ordem", "oblivio", "universal"]) {
  const c = X.gerar(curtas[id], {}), l = X.gerar(longas[id], {});
  t.ok(`${id}: a ficha longa ganha páginas de continuação (${c.paginas.length} → ${l.paginas.length})`, l.paginas.length > c.paginas.length);
  const texto = textoDe(l);
  const notas = (longas[id].anotacoes.soltas || []).map((n) => n.titulo);
  t.ok(`${id}: todas as anotações aparecem`, notas.every((n) => texto.includes(n)), notas.filter((n) => !texto.includes(n)).join(", "));
}
{
  const texto = textoDe(X.gerar(longas.ordem, {}));
  const faltam = [];
  for (let i = 1; i <= 30; i++) if (!texto.includes("Habilidade extra " + i)) faltam.push(i);
  t.ok("Ordem: as 30 habilidades criadas à mão estão no documento", !faltam.length, faltam.join(","));
  const palavras = (globalThis.RAMAExportarAmostras.TEXTO_LONGO.trim().split(/\s+/));
  const contagem = texto.split(/\s+/).filter((p) => p === palavras[palavras.length - 1]).length;
  t.ok("Ordem: os textos longos saem inteiros (a última palavra aparece tantas vezes quanto foi escrita)", contagem >= 30 * 2 + 12 * 6, "contagem " + contagem);
  const u = textoDe(X.gerar(longas.universal, {}));
  const pecas = []; for (let i = 1; i <= 40; i++) if (!u.includes("Peça " + i)) pecas.push(i);
  t.ok("Universal: as 40 peças do equipamento estão no documento", !pecas.length, pecas.join(","));
  const tamanhos = X.gerar(longas.ordem, {}).paginas.flatMap((p) => p.canvas.textos.map((x) => Number((/(\d+(?:\.\d+)?)px/.exec(x.font) || [0, 0])[1])));
  t.ok("nenhum texto abaixo de 3,5 pt (legível impresso)", tamanhos.every((n) => n >= 3.5), Math.min(...tamanhos));
}

/* =================================================================== */
t.grupo("A ficha não muda");
for (const id of Object.keys(curtas)) {
  const antes = JSON.stringify(curtas[id]);
  X.gerar(curtas[id], {});
  t.igual(`${id}: a ficha exportada fica idêntica`, JSON.stringify(curtas[id]), antes);
}
{
  /* A exportação usa a ficha que recebe: um valor alterado e ainda não
     salvo sai no documento. */
  const f = JSON.parse(JSON.stringify(curtas.universal));
  f.status[0].atual = 4321;
  t.ok("o valor atual da ficha (não salvo) é o que sai", textoDe(X.gerar(f, {})).includes("4321"));
  const o = globalThis.RAMAExportarAmostras.ordem();
  o.ordem.recursos.pv = 3;
  t.ok("Ordem: o PV atual alterado na página sai no documento", /\b3\b/.test(textoDe(X.gerar(o, {})).split("\f")[0]));
}

/* =================================================================== */
t.grupo("Configuração efetiva da ficha");
{
  const R = globalThis.RAMAOrdemRegras, OP = globalThis.RAMAOrdemOpcionais;
  const f = globalThis.RAMAExportarAmostras.ordem();
  const comNivel = JSON.parse(JSON.stringify(f));
  OP.definir(comNivel.ordem, "nexExperiencia", true);
  const tx = textoDe(X.gerar(comNivel, {}));
  t.ok("Nível + NEX: o campo mostra o nível e a exposição", /Nível \d/.test(tx) && /exposição/.test(tx));
  t.ok("Nível + NEX: a regra aparece em Configuração da ficha", tx.includes("Nível + NEX"));
  const semSan = JSON.parse(JSON.stringify(f));
  OP.definir(semSan.ordem, R.REGRA_DETERMINACAO || "jogandoSemSanidade", true);
  const ts = textoDe(X.gerar(semSan, {})).split("\f")[0];
  t.ok("Jogando sem Sanidade: PD no lugar de PE e SAN", ts.includes("PD") && !/\nSAN\n/.test(ts));
  const u = JSON.parse(JSON.stringify(curtas.universal));
  u.modulos.pericias = false; u.status[0].nome = "Vigor do Casco";
  const tu = textoDe(X.gerar(u, {}));
  t.ok("Universal: módulo desligado não aparece", !tu.includes("PERÍCIAS"));
  t.ok("Universal: nomes personalizados vêm da ficha", tu.includes("VIGOR DO CASCO"));
}

/* =================================================================== */
t.grupo("PDF");
{
  const doc = X.gerar(curtas.vampiro, {});
  const imagens = doc.paginas.map(() => ({ filtro: "FlateDecode", dados: new Uint8Array([1, 2, 3, 4]), w: 10, h: 10 }));
  const partes = X.montarPdf(imagens, doc.paginas, { titulo: "Iara — Vampiro" });
  const total = partes.reduce((s, p) => s + p.length, 0);
  const tudo = new Uint8Array(total); let k = 0; partes.forEach((p) => { tudo.set(p, k); k += p.length; });
  const s = new TextDecoder("latin1").decode(tudo);
  t.ok("começa com %PDF-1.4 e termina com %%EOF", s.startsWith("%PDF-1.4") && s.trimEnd().endsWith("%%EOF"));
  t.ok("um único arquivo com todas as páginas", s.includes("/Count " + doc.paginas.length) && (s.match(/\/Type \/Page /g) || []).length === doc.paginas.length);
  const xref = Number(/startxref\n(\d+)/.exec(s)[1]);
  t.ok("a tabela xref está onde startxref aponta", s.slice(xref, xref + 4) === "xref");
  const offs = [...s.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  t.ok("cada objeto está no deslocamento anotado", offs.every((o, i) => s.slice(o).startsWith((i + 1) + " 0 obj")));
  t.ok("o tamanho da página é A4 (em pontos)", s.includes("/MediaBox [0 0 595.28 841.89]"));
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIMC} · ${VERDE}${passaram} ok${FIMC} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIMC}`);
if (falharam) Deno.exit(1);
