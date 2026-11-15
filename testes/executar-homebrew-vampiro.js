/* =====================================================================
   R.A.M.A. — testes: Clã, Predador, Disciplina e Vantagem Homebrew de Vampiro (v9.20)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-vampiro.js

   Pelo motor de Vampiro (o mesmo do Apps Script): chaves versionadas; a
   Disciplina com poderes que o motor ativa (custo, parada, duração); o
   Clã com as Disciplinas e a Compulsão; o Predador com o que dá; a
   Vantagem com efeito Social; a cópia; biblioteca, arquivo e versão.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
globalThis.navigator = globalThis.navigator || { onLine: true };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js"]
  .concat(["catalogo", "disciplinas-dados", "antagonistas-dados", "dados", "regras", "poderes", "cronica", "homebrew-vampiro"].map((n) => "js/vampiro/" + n + ".js"))
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
const G = globalThis, C = G.RAMAVampiroCatalogo, DS = G.RAMAVampiroDisciplinas, R = G.RAMAVampiro, P = G.RAMAVampiroPoderes, H = G.RAMAVampiroHomebrew, A = G.RAMAHomebrewAdaptadores;
const copia = (x) => JSON.parse(JSON.stringify(x));

t.grupo("Vampiro Homebrew · definições");
const discB = { nome: "Vitrificação", homebrewId: "a3a3a3a3-sintetico", tipo: "fisica", ressonancia: "melancolica",
  poderesHb: [{ nivel: 1, nome: "Pele de Vidro", checagens: 1, atributo: "vigor", duracao: "cena", efeito: "+1 em resistir dano." }, { nivel: 2, nome: "Estilhaço", checagens: 9, atributo: "inventado", duracao: "x", efeito: "Arremessa vidro." }] };
const vit = DS.normalizarDisciplinaHomebrew(discB);
t.ok("Disciplina: chave hbvd-, tipo, poderes com custo limitado, parada e duração válidas", /^hbvd-a3a3a3a3-/.test(vit.chave) && vit.tipo === "fisica" && vit.poderesHb[1].checagens === 3 && vit.poderesHb[1].atributo === "" && vit.poderesHb[1].duracao === "cena");
DS.registrarDisciplinaHomebrew(vit);
t.ok("os poderes entram no catálogo (daDisciplina, poder) como narrativos", DS.daDisciplina(vit.chave).length === 2 && DS.poder(vit.chave + "-p1").parada[0][0] === "vigor" && DS.poder(vit.chave + "-p1").custo.checagens === 1 && DS.poder(vit.chave + "-p1").narrativo);
const clB = { nome: "Vidreiros", homebrewId: "b4b4b4b4-sintetico", disciplinas: [vit.chave, "fortitude", "presenca", "alquimia", "naoExiste"], perdicao: { texto: "Racham sob luz forte." }, compulsao: { nome: "Polimento", penalidade: 9, termina: "Limpar algo." } };
const cla = C.normalizarHomebrew("cla", clB);
t.ok("Clã: três Disciplinas válidas (sem Alquimia), Compulsão com chave e penalidade limitada", /^hbvc-/.test(cla.chave) && cla.disciplinas.join() === vit.chave + ",fortitude,presenca" && cla.compulsao.penalidade === 3 && cla.compulsao.chave === cla.chave + "-c" && cla.compulsao.alvo === "todas");
const prB = { nome: "Vitralista", homebrewId: "c5c5c5c5-sintetico", especializacoes: [{ habilidade: "oficios", nome: "Vidro" }, { habilidade: "inventada", nome: "X" }],
  disciplinas: [vit.chave, "auspicios"], humanidade: -1, vantagens: [{ chave: "belo", pontos: 2 }], defeitos: [{ chave: "feio", pontos: 1 }, { chave: "belo", pontos: 1 }], parada: [["destreza", "oficios"]], proibidoPara: ["ventrue"] };
const pr = C.normalizarHomebrew("predador", prB);
t.ok("Predador: especialização válida, Disciplinas, Humanidade, vantagem e defeito do tipo certo, parada, proibição", /^hbvp-/.test(pr.chave) && pr.especializacoes.length === 1 && pr.disciplinas.length === 2 && pr.humanidade === -1 && pr.vantagens[0].chave === "belo" && pr.defeitos.length === 1 && pr.parada.length === 1 && pr.proibidoPara[0] === "ventrue");
const va = C.normalizarHomebrew("vantagem", { nome: "Reflexo Perfeito", homebrewId: "d6d6d6d6", tipo: "qualidade", niveis: [2, 9, 1], efeito: { social: 2 }, texto: "Brilha." });
t.ok("Vantagem: níveis válidos, efeito Social", /^hbvv-/.test(va.chave) && va.niveis.join() === "1,2" && va.efeito.social === 2 && va.grupo === "Homebrew");

t.grupo("Vampiro Homebrew · na ficha");
const hb = { disciplinas: { [vit.chave]: vit }, clas: { [cla.chave]: cla }, predadores: { [pr.chave]: pr }, vantagens: { [va.chave]: va } };
/* Um catálogo "novo" (como o servidor): tudo vem da cópia. */
delete DS.DISCIPLINAS[vit.chave]; delete C.CLAS[cla.chave]; delete C.PREDADORES[pr.chave];
const f = R.normalizar({ natureza: "vampiro", cla: cla.chave, predador: pr.chave, disciplinas: { [vit.chave]: 1 }, poderes: [{ chave: vit.chave + "-p1" }], vantagens: [{ chave: va.chave, nivel: 2 }], homebrew: hb,
  criacao: { predador: { especializacao: 0, disciplina: vit.chave, escolhas: {} } } });
t.ok("clã, predador, disciplina e vantagem Homebrew sobrevivem à normalização (registrados pela cópia)", f.cla === cla.chave && f.predador === pr.chave && f.disciplinas[vit.chave] === 1 && f.poderes.some((p) => p.chave === vit.chave + "-p1") && f.vantagens.some((v) => v.chave === va.chave));
t.ok("as cópias ficam em homebrew", f.homebrew.disciplinas[vit.chave] && f.homebrew.clas[cla.chave] && f.homebrew.predadores[pr.chave] && f.homebrew.vantagens[va.chave]);
t.ok("Disciplina do clã Homebrew conta (Vitrificação 1 + 1 do Predador)", R.valorDeDisciplina(f, vit.chave) >= 1, String(R.valorDeDisciplina(f, vit.chave)));
const conc = R.concessoes(f);
t.ok("o Predador dá a especialização, a Disciplina, a Humanidade e a Vantagem/Defeito", conc.some((x) => x.origem === "predador" && x.tipo === "especializacao" && x.habilidade === "oficios") && conc.some((x) => x.origem === "predador" && x.tipo === "humanidade" && x.valor === -1) && conc.some((x) => x.origem === "predador" && x.chave === "belo") && conc.some((x) => x.origem === "predador" && x.chave === "feio"));
const comp = R.iniciarCompulsao(f, "cla", () => 1);
t.ok("a Compulsão do clã Homebrew começa pelo mesmo caminho (−3 em todas as paradas)", comp.ok && f.estado.compulsao.chave === cla.compulsao.chave && f.estado.compulsao.penalidade === 3 && comp.eventos.some((e) => e.nome === "Polimento" || (e.dados && e.dados.nome === "Polimento") || JSON.stringify(e).indexOf("Polimento") >= 0), JSON.stringify(comp).slice(0, 200));
t.ok("sem cópia e sem catálogo: some", R.normalizar({ natureza: "vampiro", cla: "hbvc-zzzzzzzz-abcdef", predador: "hbvp-zzzzzzzz-abcdef" }).cla === "" && R.normalizar({ natureza: "vampiro", predador: "hbvp-zzzzzzzz-abcdef" }).predador === "");
t.ok("normalizar de novo mantém tudo", (() => { const n = R.normalizar(copia(f)); return n.cla === cla.chave && n.homebrew.disciplinas[vit.chave]; })());

t.grupo("Vampiro Homebrew · biblioteca, arquivo, pacote e versão");
const limpa = (d) => { const x = copia(d); ["chave", "homebrewId", "homebrew", "nome", "pagina", "descricao", "texto", "grupo"].forEach((k) => delete x[k]); if (x.compulsao) delete x.compulsao.chave; return x; };
const gC = A.guardar("vampiro", "estrutural", "cla", { nome: "Vidreiros", descricao: "", valores: {}, def: limpa(cla) });
const gD = A.guardar("vampiro", "estrutural", "disciplina", { nome: "Vitrificação", descricao: "", valores: {}, def: limpa(vit) });
const gV = A.guardar("vampiro", "estrutural", "vantagem", { nome: "Reflexo Perfeito", descricao: "Brilha.", valores: {}, def: limpa(va) });
t.ok("guardados: colunas cla, disciplina, vantagem", gC.ok && gC.registro.tipo === "cla" && gD.ok && gD.registro.tipo === "disciplina" && gV.ok && gV.registro.tipo === "vantagem");
t.ok("da biblioteca voltam com a mesma chave", H.deRegistro(Object.assign({}, gD.registro, { id: "a3a3a3a3-sintetico" })).def.chave === vit.chave && H.deRegistro(Object.assign({}, gV.registro, { id: "d6d6d6d6" })).def.chave === va.chave);
t.ok("destino e resumo", A.destinoNaFicha(gC.registro, "vampiro").modo === "nativo" && /física · 2 poderes/.test(A.resumo(gD.registro)) && /Vantagem · 1\/2 pts/.test(A.resumo(gV.registro)));
const aD = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gD.registro), gD.registro))));
t.ok("exportar e importar: os poderes da Disciplina voltam", aD.ok && aD.dados.modelo.def.poderesHb.length === 2 && aD.dados.modelo.def.tipo === "fisica");
t.ok("pacote só de Vampiro", A.compativelComPacote(gC.registro, "vampiro").ok && !A.compativelComPacote(gC.registro, "oblivio").ok && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "disciplina"));
const vitNova = DS.normalizarDisciplinaHomebrew(Object.assign(copia(discB), { tipo: "mental" }));
const novas = H.versoesNovas(f, { disciplinas: [vitNova], clas: [], predadores: [], vantagens: [] });
const fU = copia(f); H.atualizarVersao(fU, novas[0]);
const fU2 = R.normalizar(fU);
t.ok("versão nova da Disciplina: chave nova em toda a ficha (clã, predador, poderes)", novas.length === 1 && fU2.disciplinas[vitNova.chave] === 1 && fU2.poderes.some((p) => p.chave === vitNova.chave + "-p1") && fU2.homebrew.clas[cla.chave].disciplinas.indexOf(vitNova.chave) >= 0 && DS.DISCIPLINAS[vitNova.chave].tipo === "mental");

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
