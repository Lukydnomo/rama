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

t.grupo("Ficha de Conhecimento Homebrew (v9.27)");
{
  const fcB = { nome: "Os Vidreiros de Murano", homebrewId: "e7e7e7e7-sintetico", cla: cla.chave, descricao: "Uma linhagem de sopradores.",
    niveis: [{ nome: "Olho Treinado", uso: "historia", texto: "Uma pista sobre um objeto de vidro." }, { nome: "Forno Antigo", uso: "inventado", texto: "Um Refúgio com forno." }, {}, {}, {}, { nome: "Sexto" }] };
  const fc = C.normalizarHomebrew("conhecimento", fcB);
  t.ok("chave hbvf-<id>-<hash>; no máximo 5 níveis, numerados", /^hbvf-e7e7e7e7-[a-z0-9]+$/.test(fc.chave) && fc.niveis.length === 5 && fc.niveis[4].nivel === 5, JSON.stringify(fc.niveis.map((n) => n.nivel)));
  t.ok("limite de uso só os do livro; nível sem nome ganha \u201cNível N\u201d", fc.niveis[0].uso === "historia" && fc.niveis[1].uso === "" && fc.niveis[2].nome === "Nível 3");
  t.ok("clã exclusivo: do livro ou Homebrew; outro texto não", fc.cla === cla.chave && C.normalizarHomebrew("conhecimento", { cla: "brujah" }).cla === "brujah" && C.normalizarHomebrew("conhecimento", { cla: "inventado" }).cla === "");
  const fc2 = C.normalizarHomebrew("conhecimento", { nome: "Curta", homebrewId: "f8f8f8f8-sintetico", niveis: [{ nome: "Um" }, { nome: "Dois" }] });
  const hbF = Object.assign(copia(hb), { fichas: { [fc.chave]: fc, [fc2.chave]: fc2 } });
  const ff = R.normalizar({ natureza: "vampiro", cla: cla.chave, predador: pr.chave, homebrew: hbF, fichas: [{ ficha: fc.chave, nivel: 1 }, { ficha: fc2.chave, nivel: 2 }, { ficha: fc2.chave, nivel: 3 }] });
  t.ok("na ficha: a cópia registra, os níveis que existem ficam e o nível 3 de uma ficha de 2 níveis sai", ff.fichas.length === 2 && ff.fichas.some((x) => x.ficha === fc2.chave && x.nivel === 2) && !!ff.homebrew.fichas[fc.chave] && C.FICHAS_DE_CONHECIMENTO[fc.chave].nome === "Os Vidreiros de Murano", JSON.stringify(ff.fichas));
  R.receberXP(ff, 30, "teste");
  t.ok("comprar com XP: 3 XP por ponto, cada nível à parte", R.validarCompra(ff, { tipo: "ficha", alvo: fc.chave, para: 2 }).ok && R.validarCompra(ff, { tipo: "ficha", alvo: fc.chave, para: 2 }).custo === 6);
  const fBuy = R.normalizar({ natureza: "vampiro", cla: "toreador" });
  C.registrarHomebrew("conhecimento", fc2); C.registrarHomebrew("vantagem", va);
  R.receberXP(fBuy, 40, "teste");
  const rb1 = R.comprar(fBuy, { tipo: "ficha", alvo: fc2.chave, para: 1 }), rb2 = R.comprar(fBuy, { tipo: "vantagem", alvo: va.chave, para: 2 });
  t.ok("  comprar já grava a cópia na ficha (Ficha de Conhecimento e Vantagem Homebrew)", rb1.ok && rb2.ok && !!fBuy.homebrew.fichas[fc2.chave] && !!fBuy.homebrew.vantagens[va.chave], JSON.stringify([rb1.ok ? "" : rb1, rb2.ok ? "" : rb2, fBuy.homebrew]));
  t.ok("  e sobrevive a normalizar sem a biblioteca (pela cópia)", (() => { const k = fc2.chave; const def = C.FICHAS_DE_CONHECIMENTO[k]; delete C.FICHAS_DE_CONHECIMENTO[k]; const y = R.normalizar(copia(fBuy)); C.FICHAS_DE_CONHECIMENTO[k] = def; return y.fichas.some((x) => x.ficha === k); })());
  t.ok("  um nível que a ficha não tem é recusado", /não tem o nível 3/.test(R.validarCompra(ff, { tipo: "ficha", alvo: fc2.chave, para: 3 }).motivo || JSON.stringify(R.validarCompra(ff, { tipo: "ficha", alvo: fc2.chave, para: 3 }))));
  const outroCla = R.normalizar({ natureza: "vampiro", cla: "brujah", homebrew: hbF, fichas: [] });
  R.receberXP(outroCla, 30, "teste");
  t.ok("  exclusiva do clã Homebrew: outro clã não compra", !R.validarCompra(outroCla, { tipo: "ficha", alvo: fc.chave, para: 1 }).ok);
  const semCopia = R.normalizar({ natureza: "vampiro", cla: "brujah", fichas: [{ ficha: "hbvf-zzzzzzzz-abc123", nivel: 1 }] });
  t.ok("sem cópia e sem catálogo, a ficha some (nada é inventado)", semCopia.fichas.length === 0);
  t.ok("prévia: o clã e os níveis com o limite de uso", /Exclusiva do clã Vidreiros/.test(H.previa("conhecimento", fc)[0]) && /Nível 1 · Olho Treinado \(1× por história\)/.test(H.previa("conhecimento", fc).join(" ")));
  const gF = A.guardar("vampiro", "estrutural", "conhecimento", { nome: "Os Vidreiros de Murano", descricao: "Uma linhagem.", valores: {}, def: (() => { const x = copia(fc); ["chave", "homebrewId", "homebrew", "nome", "pagina", "descricao"].forEach((k) => delete x[k]); return x; })() });
  t.ok("biblioteca: guarda e volta com os níveis", gF.ok && H.deRegistro(Object.assign({}, gF.registro, { id: "e7e7e7e7-sintetico" })).def.niveis.length === 5, JSON.stringify(gF.ok ? [gF.registro.modelo, H.deRegistro(Object.assign({}, gF.registro, { id: "e7e7e7e7-sintetico" }))] : gF).slice(0, 700));
  t.ok("destino e pacote: só Vampiro", A.destinoNaFicha(gF.registro, "vampiro").modo === "nativo" && A.destinoNaFicha(gF.registro, "ordem").modo === "incompativel" && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "conhecimento"));
  const fcN = C.normalizarHomebrew("conhecimento", Object.assign(copia(fcB), { niveis: [{ nome: "Olho Muito Treinado" }] }));
  const novas = H.versoesNovas(ff, { fichas: [fcN] });
  t.ok("versão nova da biblioteca é oferecida e atualizar troca a chave", novas.length === 1 && (() => { const x = copia(ff); H.atualizarVersao(x, novas[0]); const y = R.normalizar(x); return y.fichas.some((z) => z.ficha === fcN.chave) && !y.homebrew.fichas[fc.chave]; })());
}

t.grupo("Poder de Disciplina Homebrew no motor (v9.29)");
{
  const pdB = { nome: "Olhar de Cristal", homebrewId: "a9a9a9a9-sintetico", disciplina: "auspicios", nivel: 2, checagens: 1, atributo: "raciocinio", duracao: "cena", efeito: "Vê através de vidro." };
  const pd = DS.normalizarPoderHomebrew(pdB);
  t.ok("chave hbvq-<id>-<hash>, numa Disciplina do livro", /^hbvq-a9a9a9a9-[a-z0-9]+$/.test(pd.chave) && pd.disciplina === "auspicios" && pd.nivel === 2);
  t.ok("Disciplina Homebrew, Alquimia ou inventada: recusado (sem poder no motor)", DS.normalizarPoderHomebrew(Object.assign(copia(pdB), { disciplina: vit.chave })) === null && DS.normalizarPoderHomebrew(Object.assign(copia(pdB), { disciplina: "alquimia" })) === null && DS.normalizarPoderHomebrew(Object.assign(copia(pdB), { disciplina: "x" })) === null);
  DS.registrarPoderHomebrew(pd);
  const e = DS.poder(pd.chave);
  t.ok("entra na lista da Disciplina, com custo, parada e duração dos poderes do livro", DS.daDisciplina("auspicios").some((x) => x.chave === pd.chave) && e.custo.checagens === 1 && e.parada[0][0] === "raciocinio" && e.duracao === "cena" && e.narrativo);
  const fP = R.normalizar({ natureza: "vampiro", cla: "toreador", disciplinas: { auspicios: 2 } });
  R.receberXP(fP, 60, "teste");
  const okP = R.podeAdquirirPoder(fP, pd.chave, { disciplina: "auspicios", nivel: 2 });
  t.ok("pode ser adquirido com Auspícios 2 (e não com 1)", okP.ok && !R.podeAdquirirPoder(fP, pd.chave, { disciplina: "auspicios", nivel: 1 }).ok);
  const r1 = R.aplicarOperacao(fP, "op-teste-1", (b) => { b.poderes.push({ id: "po-x", chave: pd.chave, origem: "ajuste" }); return { ok: true, eventos: [] }; });
  t.ok("adicionado à mão (operação): a cópia da DEFINIÇÃO vai para a ficha", r1.ok && fP.homebrew.poderes[pd.chave] && fP.homebrew.poderes[pd.chave].checagens === 1 && fP.homebrew.poderes[pd.chave].atributo === "raciocinio", JSON.stringify(fP.homebrew));
  const idx = DS.PODERES.findIndex((x) => x.chave === pd.chave); const guard = DS.PODERES.splice(idx, 1)[0];
  const y = R.normalizar(copia(fP));
  t.ok("reaberta (o servidor, sem a biblioteca): o poder volta pela cópia", y.poderes.some((x) => x.chave === pd.chave) && DS.poder(pd.chave).custo.checagens === 1);
  if (!DS.PODERES.some((x) => x.chave === pd.chave)) DS.PODERES.push(guard);
  const g = A.guardar("vampiro", "habilidade", "disciplina", { nome: "Olhar de Cristal", descricao: "Vê através de vidro.", valores: { disciplina: "auspicios", nivel: 2, checagens: 1, atributo: "raciocinio", duracao: "cena" } });
  const xr = g.ok ? H.deRegistro(Object.assign({}, g.registro, { id: "a9a9a9a9-sintetico" })) : null;
  t.ok("biblioteca: o registro de Habilidade vira o poder (mesma chave)", xr && xr.tipo === "poder" && xr.def.chave === pd.chave, JSON.stringify(g.ok ? g.registro.modelo : g));
  t.ok("destino na ficha: nativo", g.ok && A.destinoNaFicha(g.registro, "vampiro").modo === "nativo");
  const gV = A.guardar("vampiro", "habilidade", "disciplina", { nome: "Velho", descricao: "", valores: { disciplina: "Auspícios" } });
  t.ok("um registro antigo, com a Disciplina em texto, continua Manual (nada é inventado)", gV.ok && A.destinoNaFicha(gV.registro, "vampiro").modo === "manual" && H.deRegistro(gV.registro) === null);
  t.ok("prévia", /Auspícios ●● · 1 Checagem\(ns\) · Raciocínio \+ Auspícios · uma cena/.test(H.previa("poder", pd)[0]), H.previa("poder", pd)[0]);
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
