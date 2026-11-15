/* =====================================================================
   R.A.M.A. — testes: Ocupação e Descritor Homebrew de Malditos Goblins (v9.17)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-goblins.js

   Pelo motor de Goblins (o mesmo do Apps Script): chave versionada,
   modificadores, equipamento só do catálogo, técnicas por nível com uso
   diário; o descritor com "+1 à escolha" (como o Supimpa) generalizado;
   a cópia na ficha; biblioteca, arquivo, pacote e versão.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
globalThis.navigator = globalThis.navigator || { onLine: true };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/goblins/catalogo.js", "js/goblins/dados.js", "js/goblins/regras.js", "js/goblins/mesa.js", "js/goblins/homebrew-goblins.js",
  "js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/homebrew-adaptadores.js", "js/pacotes-homebrew.js"];
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
const G = globalThis, C = G.RAMAGoblinsCatalogo, R = G.RAMAGoblins, H = G.RAMAGoblinsHomebrew, A = G.RAMAHomebrewAdaptadores;
const copia = (x) => JSON.parse(JSON.stringify(x));

t.grupo("Ocupação e Descritor Homebrew · definição");
const ocB = { nome: "Vidreiro", homebrewId: "a1a1a1a1-sintetico", descricao: "Sopra vidro.", mod: { habilidade: 1, nocao: 5, inventado: 2 },
  equipamento: [{ rotulo: "", itens: ["adaga", "naoExiste"] }, { itens: ["fantasma"] }],
  tecnicas: [{ nivel: 1, nome: "Sopro", texto: "Faz bolhas." }, { nivel: 2, nome: "Lente", texto: "Vê longe." }, { nivel: 3, nome: "Vitral", texto: "Uma vez por dia, cega.", uso: "dia" }] };
const oc = C.normalizarOcupacaoHomebrew(ocB);
t.ok("chave hbgo-<id>-<hash>", /^hbgo-a1a1a1a1-[a-z0-9]+$/.test(oc.chave));
t.iguais("modificadores limitados (−1 a +2), só atributos que existem", oc.mod, { habilidade: 1, nocao: 2 });
t.iguais("equipamento só com itens do catálogo; opção vazia sai", oc.equipamento, [{ rotulo: "Adaga", itens: ["adaga"] }]);
t.ok("três técnicas com chave derivada e uso diário", oc.tecnicas.length === 3 && oc.tecnicas[2].chave === oc.chave + "-t3" && oc.tecnicas[2].uso === "dia" && !oc.tecnicas[0].uso);
const semC = copia(oc); delete semC.chave;
t.ok("normalizar de novo dá a mesma chave", C.normalizarOcupacaoHomebrew(Object.assign(semC, { chave: "" })).chave === oc.chave);
const de = C.normalizarDescritorHomebrew({ nome: "Esperto", homebrewId: "b2b2b2b2-sintetico", mod: { nocao: 1, combate: -1 } });
const deEsc = C.normalizarDescritorHomebrew({ nome: "Sortudo", homebrewId: "c3c3c3c3-sintetico", escolha: true });
t.ok("descritor: chave hbgd-, modificadores, escolha", /^hbgd-b2b2b2b2-/.test(de.chave) && de.mod.nocao === 1 && de.mod.combate === -1 && deEsc.escolha === true);

t.grupo("Ocupação e Descritor Homebrew · no motor");
const ficha = (extra) => R.normalizar(Object.assign({ ocupacao: oc.chave, descritor: de.chave, homebrew: { ocupacoes: { [oc.chave]: oc }, descritores: { [de.chave]: de } } }, extra || {}));
const f1 = ficha();
t.ok("ocupação e descritor Homebrew sobrevivem à normalização, com as cópias", f1.ocupacao === oc.chave && f1.descritor === de.chave && f1.homebrew.ocupacoes[oc.chave].nome === "Vidreiro" && f1.homebrew.descritores[de.chave].nome === "Esperto");
const c1 = R.calcular(f1);
t.iguais("atributos: base 2; Habilidade +1, Noção +2 +1, Combate −1", [c1.atributos.combate.valor, c1.atributos.habilidade.valor, c1.atributos.nocao.valor, c1.atributos.vitalidade.valor], [1, 3, 5, 2]);
t.ok("técnicas pelo nível (nível 1: só Sopro)", R.tecnicasDe(f1).map((x) => x.nome).join() === "Sopro" && R.tecnicasDe(ficha({ nivel: 3 })).length === 3);
const f3 = ficha({ nivel: 3 });
const u1 = R.usarTecnica(f3, oc.chave + "-t3", {}, () => 3);
const u2 = R.usarTecnica(f3, oc.chave + "-t3", {}, () => 3);
t.ok("técnica de 1 vez por dia: a ficha marca e recusa a segunda", u1.ok && !u2.ok && /já foi usada hoje/.test(u2.motivo || u2.erro || JSON.stringify(u2)), JSON.stringify([u1, u2]).slice(0, 300));
const fE = R.normalizar({ ocupacao: "mercenario", descritor: deEsc.chave, supimpa: "vitalidade", homebrew: { descritores: { [deEsc.chave]: deEsc } } });
t.iguais("descritor com escolha (como Supimpa): +1 no atributo escolhido", R.calcular(fE).atributos.vitalidade.valor, 3);
t.ok("pendência genérica: sem o atributo escolhido, a ficha pede", R.pendencias(R.normalizar({ ocupacao: "mercenario", descritor: deEsc.chave, homebrew: { descritores: { [deEsc.chave]: deEsc } } })).some((p) => /Sortudo: escolha o atributo/.test(p)));
t.ok("ocupação épica Homebrew também fica (cópia)", R.normalizar({ ocupacao: "mercenario", nivel: 3, epicas: [{ ocupacao: oc.chave, nivel: 1 }], homebrew: { ocupacoes: { [oc.chave]: oc } } }).epicas[0].ocupacao === oc.chave);
t.ok("sem cópia e sem catálogo: some", R.normalizar({ ocupacao: "hbgo-zzzzzzzz-abcdef", descritor: "hbgd-zzzzzzzz-abcdef" }).ocupacao === "" && R.normalizar({ descritor: "hbgd-zzzzzzzz-abcdef" }).descritor === "");
t.ok("escolhida de uma lista da biblioteca: a normalização embute a cópia", (() => { const o2 = C.normalizarOcupacaoHomebrew(Object.assign(copia(ocB), { homebrewId: "d4d4d4d4" })); C.registrarOcupacaoHomebrew(o2); const f = R.normalizar({ ocupacao: o2.chave }); return f.homebrew && f.homebrew.ocupacoes[o2.chave]; })());
t.ok("descritoresDisponiveis: os do livro e depois os Homebrew; os seis do livro intactos", C.descritoresDisponiveis().slice(0, 6).join() === C.DESCRITOR_D6.join() && C.DESCRITOR_D6.length === 6 && C.descritoresDisponiveis().indexOf(de.chave) >= 0);
t.ok("resumo da Mesa", (R.resumoParaMesa(f1).ocupacaoNome || "") === "Vidreiro");

t.grupo("Ocupação e Descritor · biblioteca, arquivo, pacote e versão");
const limpa = (d) => { const x = copia(d); ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao", "escolhas"].forEach((k) => delete x[k]); (x.tecnicas || []).forEach((t) => delete t.chave); return x; };
const gO = A.guardar("goblins", "estrutural", "ocupacao", { nome: "Vidreiro", descricao: "Sopra vidro.", valores: {}, def: limpa(oc) });
const gD = A.guardar("goblins", "estrutural", "descritor", { nome: "Esperto", descricao: "", valores: {}, def: limpa(de) });
t.ok("guardados: colunas \"ocupacao\" e \"descritor\"", gO.ok && gO.registro.tipo === "ocupacao" && gD.ok && gD.registro.tipo === "descritor");
t.ok("da biblioteca voltam com a mesma chave", H.deRegistro(Object.assign({}, gO.registro, { id: "a1a1a1a1-sintetico" })).def.chave === oc.chave && H.deRegistro(Object.assign({}, gD.registro, { id: "b2b2b2b2-sintetico" })).def.chave === de.chave);
t.ok("destino e resumo", A.destinoNaFicha(gO.registro, "goblins").modo === "nativo" && A.destinoNaFicha(gO.registro, "ordem").modo === "incompativel" && /Habilidade \+1, Noção \+2/.test(A.resumo(gO.registro)));
const ida = (g) => G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(g.registro), g.registro))));
const aO = ida(gO);
t.ok("exportar e importar: técnicas e equipamento voltam", aO.ok && aO.dados.modelo.def.tecnicas.length === 3 && aO.dados.modelo.def.equipamento[0].itens[0] === "adaga", JSON.stringify(aO.ok ? aO.dados.modelo.def : aO));
t.ok("pacote só de Goblins", A.compativelComPacote(gO.registro, "goblins").ok && !A.compativelComPacote(gD.registro, "tormenta20").ok && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "ocupacao"));
const ocNova = C.normalizarOcupacaoHomebrew(Object.assign(copia(ocB), { mod: { combate: 2 } }));
const novas = H.versoesNovas(f1, { ocupacoes: [ocNova], descritores: [de] });
t.ok("versão nova: só a ocupação mudou", novas.length === 1 && novas[0].def.chave === ocNova.chave);
const fU = copia(f1); H.atualizarVersao(fU, novas[0]);
const fU2 = R.normalizar(fU);
t.ok("atualizada: chave nova, cópia nova, atributos novos (Combate 2 + 2 − 1 = 3)", fU2.ocupacao === ocNova.chave && !fU2.homebrew.ocupacoes[oc.chave] && R.calcular(fU2).atributos.combate.valor === 3);

t.grupo("Painel \u201cHomebrew desta ficha\u201d (v9.22)");
{
  (0, eval)(await Deno.readTextFile(new URL("../js/homebrew-versoes.js", import.meta.url)));
  const U = G.RAMAUtil, elAntes = U.el, trocarAntes = U.trocar;
  const no = (tag) => ({ tag, filhos: [], appendChild(x) { this.filhos.push(x); return x; } });
  U.el = (tag, _a, filhos) => Object.assign(no(tag), { filhos: (filhos || []).filter(Boolean) });
  U.trocar = (caixa, filhos) => { caixa.filhos = filhos; };
  try {
    const V = G.RAMAHomebrewVersoes;
    const aba = () => no("div");
    const comCopia = V.comPainel(aba, "goblins", "RAMAGoblinsHomebrew", "RAMAGoblins")({ ficha: { goblins: f1 }, podeEditar: () => true });
    const semCopia = V.comPainel(aba, "goblins", "RAMAGoblinsHomebrew", "RAMAGoblins")({ ficha: { goblins: R.fichaVazia() }, podeEditar: () => true });
    t.ok("com cópias, a aba ganha a seção no fim", comCopia.filhos.length === 1 && /hb-versoes-secao/.test(comCopia.filhos[0].tag));
    t.ok("sem cópias, a aba fica como era", semCopia.filhos.length === 0);
    t.ok("os rótulos dos tipos dos outros sistemas", V.ROTULOS.ocupacao === "Ocupação" && V.ROTULOS.cla === "Clã" && V.ROTULOS.perfil === "Perfil");
  } finally { U.el = elAntes; U.trocar = trocarAntes; }
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
