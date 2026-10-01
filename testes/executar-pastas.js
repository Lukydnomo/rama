/* =====================================================================
   R.A.M.A. — testes da organização da página Personagens (v2.26)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-pastas.js

   O registro de sistemas (js/sistemas.js) e a conta da listagem
   (js/personagens-organizacao.js): pasta aberta, busca, filtro de
   sistema, agrupamento e estados vazios. Sem DOM e sem rede; dados
   sintéticos. O lado do servidor está em testes/pastas-backend.js.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { createElement: () => ({}), addEventListener() {}, querySelector: () => null };

for (const caminho of ["js/util.js", "js/sistemas.js", "js/personagens-organizacao.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const S = globalThis.RAMASistemas;
const O = globalThis.RAMAOrganizacaoPersonagens;

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

/* ---------- registro de sistemas ---------- */

t.grupo("Registro de sistemas");
t.igual("Ordem Paranormal é conhecido", [S.de("ordem").nome, S.de("ordem").conhecido], ["Ordem Paranormal", true]);
t.igual("Universal é conhecido", [S.de("universal").nome, S.de("universal").antigo], ["Universal", false]);
t.igual("ficha antiga (vazio) segue a compatibilidade: universal, marcada como antiga", [S.de("").id, S.de("").antigo, S.de(undefined).id, S.de(null).id], ["universal", true, "universal", "universal"]);
const futuro = S.de("Tormenta20");
t.igual("identificador desconhecido fica com o próprio id", [futuro.id, futuro.conhecido], ["tormenta20", false]);
t.ok("  e com nome que diz que não é reconhecido", /não reconhecido/.test(futuro.nome) && futuro.nome.indexOf("tormenta20") >= 0);
t.igual("a lista traz os conhecidos na ordem de exibição", S.lista().map((s) => s.id), ["ordem", "universal"]);
t.igual("os desconhecidos vêm depois", [S.de("zeta"), S.de("universal"), S.de("alfa"), S.de("ordem")].sort(S.comparar).map((s) => s.id), ["ordem", "universal", "alfa", "zeta"]);

/* ---------- dados sintéticos ---------- */

const PASTAS = [{ id: "sabado", nome: "Campanha de sábado" }, { id: "morto", nome: "Arquivo morto" }];
const base = () => [
  { id: "1", nome: "Lia Ordem", campanha: "Mesa", classe: "Combatente", origem: "Militar", sistema: "ordem", pastaId: "sabado" },
  { id: "2", nome: "Beto Livre", campanha: "", classe: "Bardo", origem: "", sistema: "universal", pastaId: "sabado" },
  { id: "3", nome: "Caio Antigo", campanha: "", classe: "", origem: "", sistema: "", pastaId: null },
  { id: "4", nome: "Duda Futura", campanha: "", classe: "", origem: "", sistema: "tormenta20", pastaId: null },
  { id: "5", nome: "Eva Ordem", campanha: "Outra", classe: "Ocultista", origem: "Acadêmico", sistema: "ordem", pastaId: null },
  { id: "6", nome: "Fábio Pendente", campanha: "", classe: "", origem: "", sistema: null, pastaId: "morto" },
];
const ids = (lista) => lista.map((p) => p.id);

t.grupo("Pasta aberta");
let r = base();
t.igual("Todos considera todas as pastas", ids(O.montar(r, PASTAS, { pasta: "todos" }).visiveis), ["1", "2", "3", "4", "5", "6"]);
t.igual("Sem pasta só os não organizados", ids(O.montar(r, PASTAS, { pasta: "sem-pasta" }).visiveis), ["3", "4", "5"]);
t.igual("abrir uma pasta restringe aos dela", ids(O.montar(r, PASTAS, { pasta: "sabado" }).visiveis), ["1", "2"]);
t.igual("pasta que não existe mais volta para Todos", O.montar(r, PASTAS, { pasta: "apagada" }).pasta, "todos");
t.igual("contagens por pasta", O.montar(r, PASTAS, {}).contagens, { todos: 6, semPasta: 3, porPasta: { sabado: 2, morto: 1 } });
t.igual("vínculo para pasta inexistente conta como Sem pasta", O.contagens([{ id: "x", pastaId: "sumiu" }], PASTAS).semPasta, 1);

t.grupo("Busca e sistema dentro da seleção");
t.igual("filtro Ordem dentro da pasta (uma pasta mistura sistemas)", ids(O.montar(r, PASTAS, { pasta: "sabado", sistema: "ordem" }).visiveis), ["1"]);
t.igual("filtro Universal inclui as fichas antigas", ids(O.montar(r, PASTAS, { pasta: "todos", sistema: "universal" }).visiveis), ["2", "3"]);
t.igual("filtro do sistema desconhecido", ids(O.montar(r, PASTAS, { pasta: "todos", sistema: "tormenta20" }).visiveis), ["4"]);
t.igual("busca por nome atua na seleção", ids(O.montar(r, PASTAS, { pasta: "sem-pasta", busca: "eva" }).visiveis), ["5"]);
t.igual("busca por campanha, classe e origem, sem acento", [
  ids(O.montar(r, PASTAS, { busca: "outra" }).visiveis),
  ids(O.montar(r, PASTAS, { busca: "bardo" }).visiveis),
  ids(O.montar(r, PASTAS, { busca: "academico" }).visiveis),
], [["5"], ["2"], ["5"]]);
t.igual("busca e sistema juntos", ids(O.montar(r, PASTAS, { busca: "ordem", sistema: "ordem", pasta: "sabado" }).visiveis), ["1"]);
t.igual("a busca não acha o que está fora da pasta aberta", ids(O.montar(r, PASTAS, { pasta: "sabado", busca: "eva" }).visiveis), []);

t.grupo("Agrupar por sistema");
const g = O.montar(r, PASTAS, { pasta: "todos", agrupar: true }).grupos;
t.igual("grupos na ordem do registro, desconhecido e pendente no fim", g.map((x) => x.sistema.id), ["ordem", "universal", "tormenta20", "?"]);
t.igual("cada grupo com os seus", g.map((x) => ids(x.itens)), [["1", "5"], ["2", "3"], ["4"], ["6"]]);
t.igual("agrupar dentro da pasta", O.montar(r, PASTAS, { pasta: "sabado", agrupar: true }).grupos.map((x) => x.sistema.id), ["ordem", "universal"]);
t.igual("agrupar com filtro: um grupo só", O.montar(r, PASTAS, { sistema: "ordem", agrupar: true }).grupos.length, 1);
t.ok("sem agrupar, não há grupos", O.montar(r, PASTAS, {}).grupos === null);
t.igual("o pendente é diferente da ficha antiga", [O.sistemaDe({ sistema: null }).pendente, O.sistemaDe({ sistema: "" }).id], [true, "universal"]);

t.grupo("Sistemas oferecidos no filtro");
const ofertas = O.montar(r, PASTAS, { pasta: "sabado" }).sistemas;
t.igual("os conhecidos sempre, com a contagem da seleção", ofertas.map((o) => [o.sistema.id, o.n]), [["ordem", 1], ["universal", 1]]);
t.igual("os desconhecidos presentes entram", O.montar(r, PASTAS, { pasta: "todos" }).sistemas.map((o) => o.sistema.id), ["ordem", "universal", "tormenta20", "?"]);

t.grupo("Estados vazios");
t.igual("sem nenhum personagem", O.montar([], PASTAS, {}).vazio, "nenhum");
t.igual("pasta vazia", O.montar(r, PASTAS.concat([{ id: "nova", nome: "Nova" }]), { pasta: "nova" }).vazio, "pasta");
t.igual("todos em pastas", O.montar(r.filter((p) => p.pastaId), PASTAS, { pasta: "sem-pasta" }).vazio, "sem-pasta");
t.igual("filtros sem resultado", O.montar(r, PASTAS, { busca: "ninguém com este nome" }).vazio, "filtros");
t.igual("com resultado, nenhum estado vazio", O.montar(r, PASTAS, {}).vazio, null);
t.ok("filtrando é sinalizado", O.montar(r, PASTAS, { busca: " x " }).filtrando && O.montar(r, PASTAS, { sistema: "ordem" }).filtrando && !O.montar(r, PASTAS, {}).filtrando);

t.grupo("Nada muda de lugar ao filtrar ou agrupar");
r = base();
const antes = JSON.stringify(r);
O.montar(r, PASTAS, { pasta: "sabado", busca: "lia", sistema: "ordem", agrupar: true });
O.montar(r, PASTAS, { pasta: "todos", sistema: "tormenta20", agrupar: true });
t.ok("os registros saem idênticos (pasta e sistema intactos)", JSON.stringify(r) === antes);

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
