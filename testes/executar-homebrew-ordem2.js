/* =====================================================================
   R.A.M.A. — testes: Perfil e Ocupação Homebrew de Ordem Paranormal RPG II (v9.21)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-ordem2.js

   Pelo motor de Ordem II (o mesmo do Apps Script): chaves versionadas,
   registro nos mapas e listas, a criação guiada com a habilidade de
   perfil e de ocupação, a cópia, a ocupação sem cópia vira "própria";
   biblioteca, arquivo e versão.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
globalThis.navigator = globalThis.navigator || { onLine: true };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js"]
  .concat(["catalogo", "regras", "motor", "mesa", "ameacas", "procedimentos", "evolucao", "paranormal", "homebrew-ordem2"].map((n) => "js/ordem2/" + n + ".js"))
  .concat(["js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/homebrew-adaptadores.js", "js/pacotes-homebrew.js"]);
for (const c of ARQ) {
  try { (0, eval)(await Deno.readTextFile(new URL("../" + c, import.meta.url))); } catch (e) { console.error("Falhou ao carregar " + c + ": " + e.message); Deno.exit(1); }
}
const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(n, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${n}`); } else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${n}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const G = globalThis, K = G.RAMAOrdem2Catalogo, R = G.RAMAOrdem2, H = G.RAMAOrdem2Homebrew, A = G.RAMAHomebrewAdaptadores;
const copia = (x) => JSON.parse(JSON.stringify(x));

t.grupo("Ordem II Homebrew · definições");
const perf = K.normalizarHomebrew("perfil", { nome: "Guardião", homebrewId: "e7e7e7e7-sintetico", texto: "Protege antes de tudo.", habilidade: "prontidao" });
const ocup = K.normalizarHomebrew("ocupacao", { nome: "Vidreiro", homebrewId: "f8f8f8f8-sintetico", texto: "Sopra vidro.", ambientacoes: ["vigilia", "inventada"], habilidade: "naoExiste" });
t.ok("Perfil: chave hbo2p-, habilidade do catálogo", /^hbo2p-e7e7e7e7-/.test(perf.chave) && perf.habilidade === "prontidao");
t.ok("Ocupação: id hbo2o-, ambientações válidas, habilidade inválida sai", /^hbo2o-f8f8f8f8-/.test(ocup.id) && ocup.ambientacoes.join() === "vigilia" && ocup.habilidade === "");
K.registrarHomebrew("perfil", perf); K.registrarHomebrew("ocupacao", ocup);
t.ok("registrados: ORDEM_PERFIS, HABILIDADE_DE_PERFIL, OCUPACOES (ocupacao por id)", K.ORDEM_PERFIS.indexOf(perf.chave) === 3 && K.HABILIDADE_DE_PERFIL[perf.chave] === "prontidao" && K.ocupacao(ocup.id).nome === "Vidreiro" && K.ocupacoes("vigilia").some((o) => o.id === ocup.id));

t.grupo("Ordem II Homebrew · na ficha");
const g = R.deGuiada({ nome: "Teste", ambientacao: "vigilia", perfil: perf.chave, ocupacaoId: ocup.id, ocupacaoNome: "Vidreiro", atributos: { fisico: 6, mente: 6, emocao: 6 }, pericias: [] });
t.ok("criação guiada com Perfil e Ocupação Homebrew: as cópias ficam (do catálogo)", g.ok && g.bloco.perfil === perf.chave && g.bloco.ocupacao.id === ocup.id && g.bloco.homebrew.perfis[perf.chave] && g.bloco.homebrew.ocupacoes[ocup.id], JSON.stringify(g.erros || ""));
t.ok("a habilidade de perfil entra (Prontidão)", g.ok && g.bloco.habilidades.some((h) => /prontid/i.test(JSON.stringify(h))));
delete K.PERFIS[perf.chave];
const f2 = R.normalizar(copia(g.bloco));
t.ok("normalizar com o catálogo vazio (servidor): registra pela cópia", f2.perfil === perf.chave && K.PERFIS[perf.chave].nome === "Guardião");
t.ok("sem cópia e sem catálogo: o perfil some; a ocupação vira própria com o nome", (() => { const x = R.normalizar({ perfil: "hbo2p-zzzzzzzz-abcdef", ocupacao: { id: "hbo2o-zzzzzzzz-abcdef", nome: "Fantasma" } }); return x.perfil === "" && x.ocupacao.id === "" && x.ocupacao.personalizada && x.ocupacao.nome === "Fantasma"; })());

t.grupo("Ordem II Homebrew · biblioteca, arquivo e versão");
const limpa = (d) => { const x = copia(d); ["chave", "id", "homebrewId", "homebrew", "nome", "texto", "vistas"].forEach((k) => delete x[k]); return x; };
const gP = A.guardar("ordem2", "estrutural", "perfil", { nome: "Guardião", descricao: "Protege antes de tudo.", valores: {}, def: limpa(perf) });
const gO = A.guardar("ordem2", "estrutural", "ocupacao", { nome: "Vidreiro", descricao: "Sopra vidro.", valores: {}, def: limpa(ocup) });
t.ok("guardados: colunas perfil e ocupacao (sistema ordem2)", gP.ok && gP.registro.tipo === "perfil" && gO.ok && gO.registro.tipo === "ocupacao" && gO.registro.modelo.sistema === "ordem2");
t.ok("da biblioteca voltam com a mesma chave", H.deRegistro(Object.assign({}, gP.registro, { id: "e7e7e7e7-sintetico" })).def.chave === perf.chave && H.deRegistro(Object.assign({}, gO.registro, { id: "f8f8f8f8-sintetico" })).def.id === ocup.id);
t.ok("destino nativo em Ordem II; a Ocupação de Goblins não serve aqui", A.destinoNaFicha(gO.registro, "ordem2").modo === "nativo" && A.destinoNaFicha(gO.registro, "goblins").modo === "incompativel");
const aP = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gP.registro), gP.registro))));
t.ok("exportar e importar o Perfil", aP.ok && aP.dados.modelo.def.habilidade === "prontidao");
const perfNovo = K.normalizarHomebrew("perfil", { nome: "Guardião", homebrewId: "e7e7e7e7-sintetico", texto: "Protege antes de tudo.", habilidade: "impeto" });
const novas = H.versoesNovas(f2, { perfis: [perfNovo], ocupacoes: [ocup] });
const fU = copia(f2); H.atualizarVersao(fU, novas[0]);
t.ok("versão nova do Perfil: chave nova e a habilidade nova no catálogo", novas.length === 1 && R.normalizar(fU).perfil === perfNovo.chave && K.HABILIDADE_DE_PERFIL[perfNovo.chave] === "impeto");

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
