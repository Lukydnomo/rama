/* =====================================================================
   R.A.M.A. — testes do Inventário em grade (v9.23.0, Extras)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-grade.js

   O motor (js/ordem/grade.js) e a carga (RAMAOrdemRegras.capacidade)
   com a regra ligada, pelos critérios de aceite: células e limites com
   mochila, mãos e duas mãos, slots extras, formas (L, barra, 5 células,
   qualquer n), frações e espaço zero, fichas antigas com o que não cabe,
   desligar e religar. Sem DOM; dados sintéticos.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
for (const caminho of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/grade.js", "js/ordem/regras.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}
const R = globalThis.RAMAOrdemRegras, G = globalThis.RAMAOrdemGrade, I = globalThis.RAMAOrdemInventario, O = globalThis.RAMAOrdemOpcionais;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0; const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  igual(nome, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(nome, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};
console.log(`${FORTE}R.A.M.A. — Inventário em grade${FIM}`);

let seq = 0;
function item(nome, tipo, ordem) { return { id: "i" + (++seq), nome, tipo, ordem: Object.assign({ quantidade: 1 }, ordem) }; }
function ficha(forca, opc) {
  const o = R.normalizar({ atributos: { agi: 1, for: forca, int: 1, pre: 1, vig: 1 } });
  o.opcionais = Object.assign({ inventarioGrade: true }, opc || {});
  return o;
}
/* A montagem como a tela faz: recipientes e células da capacidade. */
function montar(o, inv) {
  const c = R.capacidade(o, inv);
  const ef = R.itensEfetivos(o, inv);
  return G.montar({
    itens: inv.itens, config: o.inventarioGrade, principal: c.grade.principal,
    recipientes: c.grade.recipientes,
    espacosDe: (it) => (ef.porId ? ef.porId[it.id] : ef.find((e) => e.id === it.id)).espacos.unitarioEfetivo,
    quantidadeDe: (it) => I.dadosDoItem(it).quantidade,
    duasMaos: (it) => !!(I.dadosDoItem(it).arma && I.dadosDoItem(it).arma.empunhadura === "duasMaos"),
  });
}
const ref = (est, it, i) => est.unidades.find((u) => u.item === it && u.indice === (i || 0));

t.grupo("Capacidade: B, mochilas, limite e máximo");
{
  const o = ficha(2);
  const mochila = item("Mochila militar", "item", { espacos: 0, capacidade: 5 });
  const inv = { itens: [mochila] };
  const c = R.capacidade(o, inv);
  t.igual("limite próprio 10 e mochila +5 → 20 células principais e 5 na mochila", [c.grade.principal, c.grade.recipientes[0].celulas], [20, 5]);
  t.igual("sem penalidade até 15, máximo 25", [c.limite, c.maximo], [15, 25]);
  inv.itens.push(item("Carga", "item", { espacos: 15 }));
  t.ok("carga 15 fica sem penalidade", !R.capacidade(o, inv).sobrecarregado);
  inv.itens[1].ordem.espacos = 15.5;
  t.ok("15,5 ativa a sobrecarga", R.capacidade(o, inv).sobrecarregado && !R.capacidade(o, inv).acimaDoMaximo);
  inv.itens = [];
  const sem = R.capacidade(o, inv);
  t.igual("retirar a mochila: limite normal 10, grade principal continua 20", [sem.limite, sem.grade.principal], [10, 20]);
  const desligada = R.capacidade(Object.assign({}, o, { opcionais: {} }), { itens: [mochila] });
  t.igual("regra desligada: a conta de sempre (15, máximo 30)", [desligada.limite, desligada.maximo, !!desligada.grade], [15, 30, false]);
  /* ajuste negativo antes do piso: Força 2 (10), ajuste −13, mochila +5 */
  const neg = ficha(2); neg.temporarios.capacidade = -13;
  const cn = R.capacidade(neg, { itens: [mochila] });
  t.igual("ajuste negativo come a mochila antes do piso: B 0, limite 2 (como sem grade), grade da mochila com 5", [cn.grade.B, cn.limite, cn.maximo, cn.grade.recipientes[0].celulas], [0, 2, 2, 5]);
  const duas = item("Duas mochilas", "item", { espacos: 0, capacidade: 5, quantidade: 2 });
  const cd = R.capacidade(o, { itens: [duas] });
  t.igual("um registro de mochila com quantidade 2 conta uma vez (como o motor de sempre)", [cd.grade.recipientes.length, cd.limite], [1, 15]);
}

t.grupo("Mãos, corpo e carga");
{
  const o = ficha(2);
  const facas = item("Machadinha", "arma", { espacos: 2, quantidade: 2 });
  const colete = item("Proteção leve", "armadura", { espacos: 2, protecao: { tipo: "leve" } });
  const inv = { itens: [facas, colete] };
  let est = montar(o, inv); G.organizar(est); G.gravarTudo(est);
  t.igual("duas unidades de 2 espaços guardadas → carga 4 (+2 da proteção = 6)", R.capacidade(o, inv).ocupado, 6);
  est = montar(o, inv);
  const r = G.mover(est, ref(est, facas, 0), { local: "corpo", slot: "maoDireita" }); G.sincronizar(facas);
  t.ok("segurar uma: ok", r.ok);
  t.igual("segurada não pesa: as machadinhas contam 2 (carga 4)", R.capacidade(o, inv).ocupado, 4);
  t.ok("e a unidade segurada liberou as 2 células", est.grades.principal.cheia.filter((u) => u === facas.id + "#0").length === 0 && facas.ordem.empunhada === true);
  G.mover(est, ref(est, facas, 0), G.primeiroEncaixe(est, ref(est, facas, 0))); G.sincronizar(facas);
  t.igual("guardar de novo restaura os 4 (carga 6)", R.capacidade(o, inv).ocupado, 6);
  const rp = G.mover(est, ref(est, colete, 0), { local: "corpo", slot: "peitoral" }); G.sincronizar(colete);
  t.ok("proteção no peitoral: libera células, continua contando 2 e fica em uso (soma na Defesa)", rp.ok && R.capacidade(o, inv).ocupado === 6 &&
    colete.ordem.emUso === true && R.protecaoEmUso(inv).item === colete);
}
{
  const o = ficha(3);
  const fuzil = item("Fuzil", "arma", { espacos: 2, arma: { empunhadura: "duasMaos" } });
  const inv = { itens: [fuzil] };
  let est = montar(o, inv); G.organizar(est); G.gravarTudo(est);
  t.ok("arma de duas mãos não vai para uma mão só", !G.mover(est, ref(est, fuzil), { local: "corpo", slot: "maoEsquerda" }).ok);
  const r = G.mover(est, ref(est, fuzil), { local: "corpo", slot: "maos" });
  t.ok("com as duas livres, empunhar ocupa as duas", r.ok && est.corpo.maoEsquerda && est.corpo.maoDireita && R.capacidade(o, inv).ocupado === 0);
  G.mover(est, ref(est, fuzil), G.primeiroEncaixe(est, ref(est, fuzil)));
  t.ok("guardar libera as duas e devolve o valor de UMA arma (2)", !est.corpo.maoEsquerda && !est.corpo.maoDireita && R.capacidade(o, inv).ocupado === 2);
}

t.grupo("Slots extras");
{
  const o = ficha(3);
  const camisa = item("Camisa", "item", { espacos: 1 }), casaco = item("Casaco", "item", { espacos: 1 });
  const inv = { itens: [camisa, casaco] };
  let est = montar(o, inv); G.organizar(est); G.gravarTudo(est);
  G.mover(est, ref(est, camisa), { local: "corpo", slot: "peitoral" });
  t.ok("peitoral ocupado: o casaco não entra no mesmo slot", !G.mover(est, ref(est, casaco), { local: "corpo", slot: "peitoral" }).ok);
  const extra = G.adicionarSlot(o.inventarioGrade, "peitoral");
  est = montar(o, inv);
  t.ok("com um slot extra no peitoral, o casaco veste por cima", G.mover(est, ref(est, casaco), { local: "corpo", slot: extra.id }).ok);
  t.ok("vestidos continuam contando (2)", R.capacidade(o, inv).ocupado === 2);
  const antes = JSON.stringify(inv.itens.map((i) => i.ordem.grade));
  /* excluir e cancelar = não chamar removerSlot: nada muda */
  t.ok("cancelar a exclusão preserva as duas peças e posições", JSON.stringify(inv.itens.map((i) => i.ordem.grade)) === antes && G.slots(o.inventarioGrade).length === 7);
  t.ok("slots-base são permanentes", !G.removerSlot(o.inventarioGrade, "peitoral"));
  G.removerSlot(o.inventarioGrade, extra.id);
  est = montar(o, inv);
  t.ok("excluído o extra, a peça que estava nele fica pendente (não some)", est.pendentes.some((u) => u.item === casaco) && R.capacidade(o, inv).ocupado === 2);
}

t.grupo("Formas, frações e espaço zero");
{
  const o = ficha(2);
  const mochila = item("Mochila", "item", { espacos: 0, capacidade: 4 });
  const tres = item("Kit", "item", { espacos: 3 });
  const inv = { itens: [mochila, tres] };
  const est = montar(o, inv);
  /* mochila de 4 = 2 × 2; ocupa uma célula para sobrar um L */
  const bloqueio = item("Pedra", "item", { espacos: 1 }); inv.itens.push(bloqueio);
  const est2 = montar(o, inv);
  G.mover(est2, ref(est2, bloqueio), { local: "grade", recipiente: mochila.id, x: 1, y: 0, forma: [[0, 0]] });
  t.ok("reta de 3 não cabe na mochila 2 × 2", !G.cabe(est2, ref(est2, tres), { local: "grade", recipiente: mochila.id, x: 0, y: 0, forma: [[0, 0], [1, 0], [2, 0]] }).ok);
  const L = [[0, 0], [0, 1], [1, 1]];
  t.ok("o L encaixa nas três células livres", G.mover(est2, ref(est2, tres), { local: "grade", recipiente: mochila.id, x: 0, y: 0, forma: L }).ok);
  const cinco = G.presets(5, 5).map((p) => p.forma);
  t.ok("5 células: barra e bloco 2 × 2 + 1 entre as formas", cinco.some((f) => f.length === 5 && f.every((c) => c[1] === 0)) && cinco.some((f) => JSON.stringify(f) === JSON.stringify([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]])));
  let g = { forma: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]], meia: null };
  for (let k = 0; k < 4; k++) g = G.girarComMeia(g.forma, g.meia);
  t.ok("girar 4 vezes volta à forma e mantém 5 células", g.forma.length === 5 && G.conectada(g.forma));
  t.ok("qualquer n (7, 12): formas ligadas com exatamente n células", [7, 12].every((n) => G.presets(n, 6).every((p) => p.forma.length === n && G.conectada(p.forma))));
  t.ok("forma desconexa é recusada", !G.formaValida([[0, 0], [2, 0]], 2));
  void est;
}
{
  const o = ficha(1);
  const a = item("Bilhete A", "item", { espacos: 0.5 }), b = item("Bilhete B", "item", { espacos: 0.5 }), c = item("Bilhete C", "item", { espacos: 0.5 });
  const um = item("Lanterna", "item", { espacos: 1.5 });
  const caneta = item("Caneta", "item", { espacos: 0 });
  const inv = { itens: [a, b, c, um, caneta] };
  const est = montar(o, inv);
  t.ok("dois itens de 0,5 completam uma célula", G.mover(est, ref(est, a), { local: "grade", recipiente: "principal", x: 0, y: 0, forma: [], meia: [0, 0] }).ok &&
    G.mover(est, ref(est, b), { local: "grade", recipiente: "principal", x: 0, y: 0, forma: [], meia: [0, 0] }).ok);
  t.ok("um terceiro 0,5 não cabe na célula cheia", !G.cabe(est, ref(est, c), { local: "grade", recipiente: "principal", x: 0, y: 0, forma: [], meia: [0, 0] }).ok);
  t.ok("1,5: uma célula inteira e meia célula ao lado; a outra metade serve a um 0,5",
    G.mover(est, ref(est, um), { local: "grade", recipiente: "principal", x: 1, y: 0, forma: [[0, 0]], meia: [1, 0] }).ok &&
    G.mover(est, ref(est, c), { local: "grade", recipiente: "principal", x: 2, y: 0, forma: [], meia: [0, 0] }).ok);
  G.organizar(est); G.gravarTudo(est);
  t.ok("espaço zero fica na faixa do recipiente", est.grades.principal.zero.some((u) => u.item === caneta));
}

t.grade = null;
t.grupo("Fichas existentes, desligar e religar");
{
  const o = ficha(1); /* B 5 → 10 células */
  o.opcionais = {};
  const prot = item("Proteção pesada", "armadura", { espacos: 5, emUso: true });
  const caixas = item("Caixas", "item", { espacos: 4, quantidade: 3 });
  const inv = { itens: [prot, caixas] };
  t.ok("(ficha antiga acima do máximo sem a regra)", R.capacidade(o, inv).acimaDoMaximo);
  o.opcionais = { inventarioGrade: true };
  let est = montar(o, inv); G.organizar(est); G.gravarTudo(est);
  t.ok("ativar: a proteção em uso vai para o peitoral", prot.ordem.grade.unidades[0].local === "corpo");
  t.ok("o que não coube fica pendente, identificado e contado", est.pendentes.length === 1 && R.capacidade(o, inv).ocupado === 17);
  const pend = est.pendentes[0];
  t.ok("pendente não é destino de nada (não há 'mover para pendente')", !G.cabe(est, pend, { local: "pendente" }).ok);
  const salvo = JSON.parse(JSON.stringify(inv));
  salvo.itens.forEach((i) => { i.ordem = I.normalizarDados(i.ordem, i.tipo); });
  est = montar(o, salvo);
  t.ok("salvar e reabrir preserva cada unidade e a pendência", est.unidades.length === 4 && est.pendentes.length === 1);
  o.opcionais = {};
  t.ok("desligar: lista e conta de sempre (posições guardadas nos itens)", !R.capacidade(o, salvo).grade && !!salvo.itens[1].ordem.grade);
  o.opcionais = { inventarioGrade: true };
  est = montar(o, salvo);
  t.ok("religar recupera as posições ainda válidas", est.faltando.length === 0 && est.unidades.filter((u) => u.lugar && u.lugar.local !== "pendente").length === 3);
  salvo.itens[1].ordem.quantidade = 2;
  est = montar(o, salvo);
  t.ok("quantidade menor: a unidade a mais sai, ninguém some do resto", est.unidades.filter((u) => u.item === salvo.itens[1]).length === 2);
}
{
  const o = ficha(2);
  const m = item("Mochila", "item", { espacos: 1, capacidade: 4 });
  const inv = { itens: [m] };
  const est = montar(o, inv);
  t.ok("uma mochila não vai dentro dela mesma", /dentro dela mesma/.test(G.cabe(est, ref(est, m), { local: "grade", recipiente: m.id, x: 0, y: 0, forma: [[0, 0]] }).motivo || ""));
  const dentro = item("Livro", "item", { espacos: 1 }); inv.itens.push(dentro);
  const e2 = montar(o, inv);
  G.mover(e2, ref(e2, dentro), { local: "grade", recipiente: m.id, x: 0, y: 0, forma: [[0, 0]] }); G.gravarTudo(e2);
  inv.itens.shift();
  const e3 = montar(o, inv);
  t.ok("tirar a mochila não apaga o conteúdo: fica pendente", e3.pendentes.some((u) => u.item === dentro) && inv.itens.length === 1);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
