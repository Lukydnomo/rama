/* =====================================================================
   R.A.M.A. — símbolos dos rituais (v6.11)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-simbolos-rituais.js

   Todo ritual oficial tem a pasta e um símbolo de verdade (WebP, ou PNG
   quando está no mapa gerado; 100 × 100 ou 1000 × 1000, com
   transparência); o caminho sai do PREFIXO do id; a ficha
   resolve pelo origemCatalogoId e as cópias da Homebrew pelo vínculo só
   visual (simboloCatalogoId), sem mexer nas regras de aquisição; o que
   não tem vínculo usa o provisório compartilhado. Sem rede; dados
   sintéticos.
   ===================================================================== */

import { medirImagem } from "./medidas-imagem.js";
globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
for (const c of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js", "js/ordem/catalogo.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js", "js/ficha.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + c, import.meta.url)));
}
const RT = globalThis.RAMAOrdemRituais, F = globalThis.RAMAFicha, DADOS = globalThis.RAMAOrdemRituaisDados;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, cond, det) {
    if (cond) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${det ? `  ${CINZA}${det}${FIM}` : ""}`); }
  },
  igual(nome, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(nome, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};
const semUrl = (u) => String(u).replace(/^.*?(assets\/)/, "$1");

/* Tamanhos aceitos para o símbolo: 100 × 100 (o provisório) ou
   1000 × 1000 (arte em alta). A tela reduz qualquer um sem recortar. */
const TAMANHO_OK = (c) => c.largura === c.altura && (c.largura === 100 || c.largura === 1000);

/* O cabeçalho da imagem; ok quando o conteúdo é do formato da extensão. */
async function cabecalho(rel) {
  try {
    const m = medirImagem(await Deno.readFile(new URL("../" + rel, import.meta.url)));
    return m ? Object.assign({ ok: rel.endsWith("." + m.formato) }, m) : { ok: false };
  } catch { return null; }
}

t.grupo("Pastas e arquivos · um símbolo por ritual oficial (WebP; PNG pelo mapa)");
{
  const ids = DADOS.rituais.map((r) => r.id);
  const faltam = [], ruins = [];
  for (const id of ids) {
    const rel = RT.caminhoDoSimbolo(id);
    if (!rel) { faltam.push(id + " (id fora do padrão)"); continue; }
    const c = await cabecalho(rel);
    if (!c) faltam.push(rel);
    else if (!c.ok) ruins.push(rel + " (o conteúdo não é do formato da extensão)");
    else if (!TAMANHO_OK(c)) ruins.push(rel + " (" + c.largura + " × " + c.altura + ")");
  }
  t.ok(`os ${ids.length} rituais oficiais têm a pasta e o símbolo no caminho que o código monta`, !faltam.length, faltam.slice(0, 5).join(", "));
  t.ok("  todos são imagens de verdade, 100 × 100 ou 1000 × 1000", !ruins.length, ruins.slice(0, 5).join(", "));
  const prov = await cabecalho(RT.SIMBOLO_PROVISORIO);
  t.igual("o provisório compartilhado: WebP 100 × 100 com transparência", prov && [prov.ok, prov.formato, prov.largura, prov.altura, prov.alfa], [true, "webp", 100, 100, true]);
  const amostra = await cabecalho(RT.caminhoDoSimbolo("op.ritual.cicatrizacao"));
  t.ok("  e os de cada ritual: quadrados de 100 ou 1000 px (Cicatrização)", !!amostra && TAMANHO_OK(amostra));
  const leia = await Deno.readTextFile(new URL("../assets/rituais/LEIA-ME.md", import.meta.url)).catch(() => "");
  t.ok("assets/rituais/LEIA-ME.md explica onde fica cada ritual, como trocar e os scripts", /op\.ritual\.cicatrizacao/.test(leia) && /simbolo\.webp/.test(leia) && /gerar-simbolos-rituais/.test(leia) && /otimizar-imagens/.test(leia) && /gerar-mapa-imagens/.test(leia));
  const sobras = [];
  for await (const pre of Deno.readDir(new URL("../assets/rituais/", import.meta.url))) {
    if (!pre.isDirectory) { if (/\.png$/.test(pre.name)) sobras.push(pre.name); continue; }
    for await (const n of Deno.readDir(new URL("../assets/rituais/" + pre.name + "/", import.meta.url))) {
      const pasta = "assets/rituais/" + pre.name + "/" + n.name + "/";
      const temW = await Deno.stat(new URL("../" + pasta + "simbolo.webp", import.meta.url)).then(() => true, () => false);
      const temP = await Deno.stat(new URL("../" + pasta + "simbolo.png", import.meta.url)).then(() => true, () => false);
      if (temW && temP) sobras.push(pasta + " (.webp e .png)");
      if (temP && RT.caminhoDoSimbolo(pre.name + ".ritual." + n.name) !== pasta + "simbolo.png") sobras.push(pasta + "simbolo.png fora do mapa");
    }
  }
  t.ok("o mapa gerado bate com o disco (PNG só onde ficou PNG, nada duplicado)", !sobras.length, sobras.slice(0, 5).join(", "));
}

t.grupo("Caminho · pelo prefixo do id");
{
  t.ok("op.ritual.cicatrizacao → assets/rituais/op/cicatrizacao/simbolo.webp (ou .png, pelo mapa)", /^assets\/rituais\/op\/cicatrizacao\/simbolo\.(webp|png)$/.test(RT.caminhoDoSimbolo("op.ritual.cicatrizacao")));
  const corrigido = DADOS.rituais.filter((r) => r.fonte && !r.id.toLowerCase().startsWith(String(r.fonte).toLowerCase() === "oprpg" ? "op" : String(r.fonte).toLowerCase()))[0];
  t.ok("o prefixo do id manda, mesmo quando a fonte exibida é outra", !corrigido || RT.caminhoDoSimbolo(corrigido.id).indexOf("assets/rituais/" + corrigido.id.split(".")[0] + "/") === 0, corrigido && corrigido.id);
  t.igual("id que não é de ritual oficial: sem caminho", [RT.caminhoDoSimbolo("op.criatura.zumbi-de-sangue"), RT.caminhoDoSimbolo("../x"), RT.caminhoDoSimbolo("")], ["", "", ""]);
}

t.grupo("Vínculo · biblioteca, ficha, Homebrew e do zero");
{
  t.igual("biblioteca: pelo id da entrada", semUrl(RT.imagemDoRitual({ id: "sah.ritual." + DADOS.rituais.filter((r) => /^sah\./.test(r.id))[0].id.split(".").slice(2).join(".") }).url).indexOf("assets/rituais/sah/"), 0);
  const naFicha = F.normalizarRitual({ id: "uuid-qualquer", nome: "Cicatrização", circulo: "1", origemCatalogoId: "op.ritual.cicatrizacao" });
  t.igual("ficha (ritual oficial já salvo): pelo origemCatalogoId, sem conversão", semUrl(RT.imagemDoRitual(naFicha).url), RT.caminhoDoSimbolo("op.ritual.cicatrizacao"));
  const copia = F.normalizarRitual({ id: "uuid-2", nome: "Cicatrização (Homebrew)", origemHomebrewId: "hb-1", simboloCatalogoId: "op.ritual.cicatrizacao" });
  t.ok("cópia da Homebrew: o vínculo só visual sobrevive à normalização", copia.simboloCatalogoId === "op.ritual.cicatrizacao" && !copia.origemCatalogoId);
  t.igual("  e resolve o símbolo do original", semUrl(RT.imagemDoRitual(copia).url), RT.caminhoDoSimbolo("op.ritual.cicatrizacao"));
  t.ok("  valor estranho no vínculo visual não passa", !F.normalizarRitual({ nome: "X", simboloCatalogoId: "../../etc" }).simboloCatalogoId);
  const zero = F.normalizarRitual({ id: "uuid-3", nome: "Feito do zero" });
  t.igual("ritual do zero: o provisório compartilhado", semUrl(RT.imagemDoRitual(zero).url), RT.SIMBOLO_PROVISORIO);
  t.ok("  sem campo novo no ritual escrito à mão", !("simboloCatalogoId" in zero));
  const bib = await Deno.readTextFile(new URL("../js/paginas/ficha-rituais-biblioteca.js", import.meta.url));
  t.ok("a cópia da Homebrew para a ficha continua sem origemCatalogoId (aquisição igual)", /simboloCatalogoId = simb;[\s\S]{0,40}delete ritual\.origemCatalogoId/.test(bib));
}

t.grupo("Gerador · só preenche o que falta");
{
  const g = await Deno.readTextFile(new URL("../testes/gerar-simbolos-rituais.js", import.meta.url));
  t.ok("confere se a pasta já tem símbolo (WebP ou PNG) antes de escrever (não sobrescreve artes trocadas)", /simbolo\.webp", RAIZ\)\) \|\| await existe\(new URL\(pasta \+ "simbolo\.png"/.test(g) && /if \(await existe\(url\)\) \{ mantidos\+\+; return; \}/.test(g));
  t.ok("o provisório novo é a cópia do provisorio.webp", /assets\/rituais\/provisorio\.webp/.test(g) && /Deno\.readFile\(new URL\("assets\/rituais\/provisorio\." \+ ext/.test(g));
  t.ok("usa o catálogo oficial e o mesmo padrão de id", /rituais-dados\.js/.test(g) && /as\[0-9\]\{1,2\}\)\\\.ritual\\\./.test(g));
}

t.grupo("Telas · onde o símbolo aparece");
{
  const fr = await Deno.readTextFile(new URL("../js/paginas/ficha-rituais.js", import.meta.url));
  const css = await Deno.readTextFile(new URL("../css/componentes.css", import.meta.url));
  const rt = await Deno.readTextFile(new URL("../js/ordem/rituais.js", import.meta.url));
  t.ok("ficha: miniatura antes do nome, rolagens no topo e Usar ritual no corpo", /antes: comSimbolo \? RT\(\)\.simbolo\(ritual\)/.test(fr) && /topo: faixaDeDanos/.test(fr) && /div\.ritual-uso/.test(fr));
  t.ok("consulta: o símbolo grande junto aos dados de conjuração", /ritual-conjuracao-simbolo/.test(fr) && /grande: true/.test(fr));
  t.ok("carrega sob demanda e cai no provisório se falhar", /loading: "lazy"/.test(rt) && /addEventListener\("error"/.test(rt));
  t.ok("arte inteira: object-fit contain, sobre placa escura fixa", /\.ritual-simbolo__img \{[^}]*object-fit: contain/.test(css) && /\.ritual-simbolo \{[^}]*background: var\(--cor-placa-simbolo\)/.test(css));
  const dens = await Deno.readTextFile(new URL("../css/densidade.css", import.meta.url));
  t.ok("modo compacto: miniatura menor", /compacta"\] \.ritual-simbolo \{ --ritual-simbolo-lado: 24px/.test(dens));
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
