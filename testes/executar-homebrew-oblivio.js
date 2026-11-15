/* =====================================================================
   R.A.M.A. — testes: Papel, Motivação, Mazela e Fardo Homebrew de Oblívio (v9.19)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-oblivio.js

   Pelo motor de Oblívio (o mesmo do Apps Script): chaves versionadas; o
   Papel com o limite de Estresse, os Conhecimentos e as Habilidades
   (Principal entra com o Papel); Motivação, Mazela e Fardo na ficha pelo
   mesmo caminho dos do livro; a cópia; biblioteca, arquivo, pacote e
   versão.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
globalThis.navigator = globalThis.navigator || { onLine: true };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js"]
  .concat(["catalogo", "ameacas-dados", "buraco-dados", "regras", "combate", "ameacas", "mesa", "buraco", "habilidades", "homebrew-oblivio"].map((n) => "js/oblivio/" + n + ".js"))
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
const G = globalThis, C = G.RAMAOblivioCatalogo, R = G.RAMAOblivio, H = G.RAMAOblivioHomebrew, A = G.RAMAHomebrewAdaptadores;
const copia = (x) => JSON.parse(JSON.stringify(x));

t.grupo("Oblívio Homebrew · definições");
const papB = { nome: "Quem Vigia", homebrewId: "a7a7a7a7-sintetico", estresse: 12, cor: "#123ABC", resumo: "Fica de olho.", lista: ["rastro", "mundo", "saber", "inventado", "emocional", "duelo", "reflexos", "social"],
  habilidadePrincipal: { nome: "Olho Aberto", acao: "passiva", resumo: "Nunca é surpreendida." }, habilidadesUnicas: [{ nome: "Sinal", acao: "extra", resumo: "Avisa o grupo." }, { nome: "Vigília", acao: "inventada" }] };
const pap = C.normalizarHomebrew("papel", papB);
t.ok("Papel: chave hbop-, Estresse limitado aos degraus, cor", /^hbop-a7a7a7a7-/.test(pap.chave) && pap.estresse === 12 && pap.cor === "#123abc");
t.iguais("Papel: só Conhecimentos que existem, até seis", pap.lista, ["rastro", "mundo", "saber", "emocional", "duelo", "reflexos"]);
t.ok("Papel: Principal e Únicas com chave derivada e ação válida", pap.principal === pap.chave + "-h0" && pap.unicas.join() === pap.chave + "-h1," + pap.chave + "-h2" && pap.habilidadesUnicas[1].acao === "passiva");
const semC = copia(pap); delete semC.chave; delete semC.principal; delete semC.unicas;
t.ok("normalizar de novo dá a mesma chave", C.normalizarHomebrew("papel", Object.assign(semC, { chave: "" })).chave === pap.chave);
const mot = C.normalizarHomebrew("motivacao", { nome: "Proteger o Farol", homebrewId: "b8b8b8b8", resumo: "Manter a luz acesa." });
const maz = C.normalizarHomebrew("mazela", { nome: "Estilhaços", homebrewId: "c9c9c9c9", resumo: "Vidro na pele.", remocao: ["kitPrimeirosSocorros", "magia"] });
const far = C.normalizarHomebrew("fardo", { nome: "Pesadelos", homebrewId: "d0d0d0d0", resumo: "Não dorme direito.", acumula: true });
t.ok("Motivação, Mazela (remoção só do que existe) e Fardo", /^hbmo-/.test(mot.chave) && maz.remocao.join() === "kitPrimeirosSocorros" && maz.processamento.length === 0 && far.acumula === true);

t.grupo("Oblívio Homebrew · na ficha");
const hb = { papeis: { [pap.chave]: pap }, motivacoes: { [mot.chave]: mot } };
const f = R.normalizar({ papel: pap.chave, motivacao: { chave: mot.chave }, atributos: { carne: 3 }, homebrew: hb });
t.ok("Papel e Motivação Homebrew sobrevivem, com as cópias", f.papel === pap.chave && f.motivacao.chave === mot.chave && f.homebrew.papeis[pap.chave] && f.homebrew.motivacoes[mot.chave]);
t.iguais("limite de Estresse: 12 do Papel + Carne 3", R.limiteTotal(f).total, 15);
R.concluirCriacao(f);
t.ok("concluir a criação: a Habilidade Principal entra com o Papel", R.temHabilidade(f, pap.principal) && C.habilidade[pap.principal].nome === "Olho Aberto");
t.ok("as Únicas do Papel ficam disponíveis para aprender (lista de Habilidades)", C.HABILIDADES.some((h) => h.chave === pap.chave + "-h1" && h.papel === pap.chave && h.tipo === "unica"));
const fN = R.normalizar(copia(f));
t.ok("normalizar de novo: a Habilidade Principal Homebrew fica", fN.habilidades.some((h) => h.chave === pap.principal));
const fM = R.normalizar(Object.assign(copia(fN), { homebrew: Object.assign(copia(fN.homebrew), { mazelas: { [maz.chave]: maz } }) }));
C.registrarHomebrew("mazela", maz);
const am = R.aplicarMazela(fM, maz.chave, {}, { tipo: "mesa" });
const fM2 = R.normalizar(copia(fM));
t.ok("Mazela Homebrew aplicada pelo mesmo caminho e com a cópia guardada", am.ok !== false && fM2.mazelas.some((m) => m.chave === maz.chave) && fM2.homebrew.mazelas[maz.chave], JSON.stringify(am).slice(0, 200));
C.registrarHomebrew("fardo", far);
const af = R.aplicarFardo(fM2, far.chave, () => 1, {});
const fF = R.normalizar(copia(fM2));
t.ok("Fardo Homebrew aplicado (sem rolagem) e com a cópia", af.ok && fF.fardos.some((x) => x.chave === far.chave) && fF.homebrew.fardos[far.chave]);
t.ok("a rolagem de Fardo (1D6) continua só com os do livro", C.FARDOS.filter((x) => x.d6).length === 6 && !far.d6);
t.ok("sem cópia e sem catálogo: some", R.normalizar({ papel: "hbop-zzzzzzzz-abcdef", motivacao: { chave: "hbmo-zzzzzzzz-abcdef" } }).papel === "" && R.normalizar({ motivacao: { chave: "hbmo-zzzzzzzz-abcdef" } }).motivacao.chave === "");

t.grupo("Oblívio Homebrew · biblioteca, arquivo, pacote e versão");
const limpa = (d) => { const x = copia(d); ["chave", "homebrewId", "homebrew", "nome", "pag", "principal", "unicas", "processamento"].forEach((k) => delete x[k]); return x; };
const gP = A.guardar("oblivio", "estrutural", "papel", { nome: "Quem Vigia", descricao: "Fica de olho.", valores: {}, def: limpa(pap) });
t.ok("Papel guardado (coluna \"papel\")", gP.ok && gP.registro.tipo === "papel" && gP.registro.modelo.def.lista.length === 6);
t.ok("da biblioteca volta com a mesma chave", H.deRegistro(Object.assign({}, gP.registro, { id: "a7a7a7a7-sintetico" })).def.chave === pap.chave);
t.ok("destino e resumo", A.destinoNaFicha(gP.registro, "oblivio").modo === "nativo" && /Estresse 12 \+ Carne · 3 habilidades/.test(A.resumo(gP.registro)));
const aP = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gP.registro), gP.registro))));
t.ok("exportar e importar: Conhecimentos e Habilidades voltam", aP.ok && aP.dados.modelo.def.habilidadesUnicas.length === 2 && aP.dados.modelo.def.lista.length === 6);
t.ok("pacote só de Oblívio", A.compativelComPacote(gP.registro, "oblivio").ok && !A.compativelComPacote(gP.registro, "vampiro").ok && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "mazela"));
const papNovo = C.normalizarHomebrew("papel", Object.assign(copia(papB), { estresse: 20 }));
const novas = H.versoesNovas(f, { papeis: [papNovo], motivacoes: [mot] });
const fU = copia(fN); H.atualizarVersao(fU, novas[0]);
const fU2 = R.normalizar(fU);
t.ok("versão nova do Papel: chave nova (também a da Principal), limite 20 + 3", novas.length === 1 && fU2.papel === papNovo.chave && fU2.habilidades.some((h) => h.chave === papNovo.principal) && R.limiteTotal(fU2).total === 23);

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
