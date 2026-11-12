/* =====================================================================
   R.A.M.A. — testes do Arquivos Secretos 9: Hell Hunters (v6.9)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-as9.js

   A fonte e o suplemento (ligado e desligado), as duas escolhas de
   Treinado pela Hell Hunters (PV ou PE), Veterano de Conflito Armado
   (Full Metal Jacket), Analisar Perigo, os quatro poderes de
   Combatente (requisitos, municiar, o ciclo dos dados de Tática de
   Abordagem), a trilha Incursor (CQB, reféns, alvo-prioritário), a
   trilha Piloto de Drone (marcos, modificações sem categoria, o segundo
   drone), os drones (bônus passivo × habilidade de duas mãos, a
   categoria até IV), os onze itens, as regalias de veículo, os Hell
   Hunters (Jason Bloom como combatente e como aliado), o gerador e a
   persistência (schema 30, exportar e importar). Sem DOM e sem rede;
   dados sintéticos.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

for (const caminho of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/arquivo3.js", "js/ordem/arquivo4.js", "js/ordem/arquivo5.js", "js/ordem/arquivo6.js", "js/ordem/arquivo7.js", "js/ordem/arquivo9.js",
  "js/ordem/fontes-em-uso.js",
  "js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/sync.js",
  "js/ordem/criaturas-dados.js", "js/ordem/criaturas.js", "js/geradores-criaturas.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const G = globalThis;
const C = G.RAMAOrdemCatalogo, P = G.RAMAOrdemPoderes, R = G.RAMAOrdemRegras, E = G.RAMAOrdemProgressao;
const A9 = G.RAMAOrdemArquivo9, A5 = G.RAMAOrdemArquivo5, A3 = G.RAMAOrdemArquivo3, A4 = G.RAMAOrdemArquivo4;
const CD = G.RAMAOrdemCondicoes, IT = G.RAMAOrdemItens, I = G.RAMAOrdemInventario;
const B = G.RAMAOrdemBiblioteca, F = G.RAMAFicha, V = G.RAMAValidacao, S = G.RAMASuplementos;
const PU = G.RAMAOrdemPericiasUsos, CR = G.RAMACriaturas, OC = G.RAMAOrdemCriaturas, GC = G.RAMAGeradoresCriaturas;
const DADOS = G.RAMAOrdemCriaturasDados;

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

function ficha(extra) {
  const o = R.fichaVazia();
  Object.keys(extra || {}).forEach((k) => { o[k] = extra[k]; });
  return R.normalizar(JSON.parse(JSON.stringify(o)));
}
function vaga(o, id) { return E.vagas(o).filter((v) => v.id === id)[0]; }
function escolher(o, id, valor, opcoes) {
  const v = vaga(o, id);
  if (!v) return { ok: false, motivo: "sem vaga " + id };
  return E.registrar(o, v, { valor: valor, opcoes: opcoes || {} });
}
function simular(o, id, valor, opcoes) {
  const v = vaga(o, id);
  if (!v) return { valido: false, motivos: ["sem vaga " + id] };
  return E.simular(o, v, { valor: valor, opcoes: opcoes || {} }, null).avaliacao;
}
function volta(o) { return R.normalizar(JSON.parse(JSON.stringify(o))); }
function interludio(o) { CD.novaCena(o.condicoes, null, { interludio: true }); return A9.aoComecarInterludio(o, A9.cenaDe(o)); }
function cena(o) { CD.novaCena(o.condicoes); }
const ATR = { agi: 2, for: 2, int: 2, pre: 1, vig: 2 };

const catItens = await IT.carregar();
function item(id, escolha, quantidade) {
  const m = IT.paraInventario(catItens.porId[id], { escolha, catalogo: catItens, quantidade });
  if (!m.ok) throw new Error(id + ": " + m.mensagem);
  return F.criarItem(m.tipo, m.dados);
}
function inv(itens) { return { itens: itens || [] }; }

/* =====================================================================
   FONTE E SUPLEMENTO
   ===================================================================== */

t.grupo("Fonte · Arquivos Secretos 9: Hell Hunters, v1.0");
{
  const l = C.livro("AS9");
  t.igual("no registro único dos livros", [l.sigla, l.nome, l.edicao, !!l.avulsa], ["AS9", "Arquivos Secretos 9", "v1.0", false]);
  t.ok("  a referência tem página", C.referencia(C.origem("treinadoHellHunters")) === "Arquivos Secretos 9, p. 38");
  const s = S.daFonte("ordem", "AS9");
  t.igual("suplemento ordem.as9, com capa", [s.id, s.capa], ["ordem.as9", "assets/sistemas/ordem-as9-capa.webp"]);
  let capas = true;
  for (const c of [s.capa, s.capa.replace(".webp", "-pequena.webp")]) { try { await Deno.stat(new URL("../" + c, import.meta.url)); } catch { capas = false; } }
  t.ok("  as duas imagens existem como assets locais", capas);
  t.ok("  na ordem: depois do AS7, antes dos Extras", (() => { const f = S.doSistema("ordem").map((x) => x.fontes[0]); return f.indexOf("AS9") === f.indexOf("AS7") + 1 && f[f.length - 1] === "EXTRA"; })());

  S.definirContexto({ sistema: "ordem", ficha: ["ordem.sah"] });
  t.ok("desligado na ficha: a fonte sai das escolhas novas", !C.fonteLiberada("AS9") && C.fonteLiberada("SAH"));
  t.ok("  origens, itens e criaturas do AS9 somem da biblioteca",
    !B.filtrar(B.secoes("origens"), "", {}).some((x) => x.entradas.some((e) => e.entrada.fonte === "AS9")));
  t.ok("  o gerador de Hell Hunters não aparece", !GC.doSistema("ordem").some((g) => g.id === "hellhunters" && g.disponivel()));
  const o = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: { tatica: "veterano" } });
  const cand = E.candidatosPoderClasse(o, "d3.poderClasse", {}).filter((c) => c.entrada.chave === "taticaDeAbordagem")[0];
  t.ok("  Tática de Abordagem indisponível para escolha nova (suplemento desligado)", !!cand && !cand.disponivel && cand.motivos.some((m) => /desligado/.test(m)));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as9"], campanha: ["ordem.sah"] });
  t.ok("ficha ∩ campanha: ligado só na ficha não basta", !C.fonteLiberada("AS9"));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as9"] });
  t.ok("ligado: a fonte volta, e o gerador também", C.fonteLiberada("AS9") && GC.doSistema("ordem").some((g) => g.id === "hellhunters" && g.disponivel()));
  t.ok("  e Tática de Abordagem é escolha válida", simular(o, "d3.poderClasse", "taticaDeAbordagem").valido, JSON.stringify(simular(o, "d3.poderClasse", "taticaDeAbordagem").motivos) + " graus " + JSON.stringify(E.estado(o, null).graus.tatica));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as9"] });
  escolher(o, "d3.poderClasse", "taticaDeAbordagem");
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("desligar depois NÃO apaga o que a ficha já tem", A9.temPoder(volta(o), "taticaDeAbordagem") || A9.temPoder(o, "taticaDeAbordagem"));
  S.definirContexto({ sistema: "ordem" });
}

/* =====================================================================
   ORIGENS (p. 38)
   ===================================================================== */

t.grupo("Origens · Treinado pela Hell Hunters e Veterano de Conflito Armado");
{
  const org = C.origem("treinadoHellHunters");
  t.igual("duas perícias entre Luta, Fortitude, Pontaria e Reflexos", [org.periciasAEscolher, org.periciasOpcoes], [2, ["luta", "fortitude", "pontaria", "reflexos"]]);
  function treinado(par, nex, escolha) {
    const pericias = {}; par.forEach((k) => { pericias[k] = "treinado"; });
    const o = ficha({ classe: "combatente", origem: "treinadoHellHunters", nex, atributos: ATR, pericias, periciasDaOrigem: par });
    const sem = R.normalizar(JSON.parse(JSON.stringify(o)));
    const pv0 = R.pontosDeVida(sem).total, pe0 = R.pontosDeEsforco(sem).total;
    const r = escolha ? escolher(o, "b.origem.treinadoHellHunters", "", { treino: escolha }) : null;
    return { o, r, dpv: R.pontosDeVida(o).total - pv0, dpe: R.pontosDeEsforco(o).total - pe0 };
  }
  t.ok("a escolha do treino é uma pendência da origem", E.estado(treinado(["luta", "fortitude"], 5).o, null).pendencias.some((p) => p.id === "b.origem.treinadoHellHunters"));
  const l5 = treinado(["luta", "fortitude"], 5, "luta");
  t.igual("Luta e Fortitude, NEX 5%: +2 PV, PE igual", [l5.dpv, l5.dpe], [2, 0]);
  const l25 = treinado(["luta", "fortitude"], 25, "luta");
  t.igual("  NEX 25% (4 degraus acima): +2 +2 PV", [l25.dpv, l25.dpe], [4, 0]);
  const p5 = treinado(["pontaria", "reflexos"], 5, "pontaria");
  t.igual("Pontaria e Reflexos, NEX 5%: +1 PE, PV igual", [p5.dpv, p5.dpe], [0, 1]);
  const p25 = treinado(["pontaria", "reflexos"], 25, "pontaria");
  t.igual("  NEX 25%: +1 +2 PE", [p25.dpv, p25.dpe], [0, 3]);
  const errado = treinado(["luta", "reflexos"], 5);
  t.ok("par trocado (Luta e Reflexos) com o treino de Luta: a escolha avisa o que falta", /Fortitude/.test(simular(errado.o, "b.origem.treinadoHellHunters", "", { treino: "luta" }).motivos.join(" ")));
  const vet = C.origem("veteranoConflitoArmado");
  t.igual("Veterano: Luta e Pontaria, Full Metal Jacket", [vet.pericias, vet.poder], [["luta", "pontaria"], "Full Metal Jacket"]);
  t.igual("Full Metal Jacket vê as penalidades numéricas da rolagem", A9.penalidades({ parcelas: [{ rotulo: "1d20", valor: 12 }, { rotulo: "Treinado", valor: 5 }, { rotulo: "Sobrecarregado", valor: -5 }] }).map((x) => x.valor), [-5]);
}

/* =====================================================================
   ANALISAR PERIGO (Tática, p. 38)
   ===================================================================== */

t.grupo("Perícia · Analisar Perigo");
{
  const u = PU.consulta("tatica", { incluirDesligados: true }).usos.filter((x) => x.nome === "Analisar Perigo")[0];
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("desligado: Analisar Perigo sai da consulta de Tática", !PU.consulta("tatica").usos.some((x) => x.nome === "Analisar Perigo"));
  S.definirContexto({ sistema: "ordem" });
  t.ok("uso de Tática, treinado, DT 15, ação de movimento, AS9 p. 38", !!u && u.treino === "treinado" && /15/.test(String(u.dt)) && u.fonte === "AS9" && u.pagina === 38);
  t.igual("bônus: 14 → 0, 15 → +2, 19 → +2, 20 → +3, 30 → +5", [14, 15, 19, 20, 30].map(A9.bonusDaAnalise), [0, 2, 2, 3, 5]);
  const leigo = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR });
  t.ok("destreinado em Tática: recusa", !A9.analisar(leigo, "an-0", 20).ok);
  const o = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR, pericias: { tatica: "treinado" } });
  const r = A9.analisar(o, "an-1", 22);
  t.igual("treinado, 22: +3", [r.ok, r.bonus], [true, 3]);
  t.ok("  o mesmo clique não refaz", A9.analisar(o, "an-1", 30).repetido);
  t.ok("  uma vez por cena", !A9.analisar(o, "an-2", 25).ok);
  cena(o);
  t.ok("  cena nova: de novo", A9.analisar(o, "an-3", 15).ok);
}

/* =====================================================================
   PODERES DE COMBATENTE (p. 39)
   ===================================================================== */

t.grupo("Poderes · requisitos");
{
  const po = (k) => P.TODOS.filter((p) => p.chave === k)[0];
  t.igual("os quatro, Combatente, AS9 p. 39", ["municiadorAmbulante", "ripostarOusado", "taticaDeAbordagem", "tiroIntuitivo"].map((k) => po(k) && [po(k).fonte, po(k).pagina]), [["AS9", 39], ["AS9", 39], ["AS9", 39], ["AS9", 39]]);
  const base = { classe: "combatente", origem: "academico", nex: 15 };
  t.ok("Municiador Ambulante pede Int 2", !simular(ficha(Object.assign({ atributos: Object.assign({}, ATR, { int: 1 }) }, base)), "d3.poderClasse", "municiadorAmbulante").valido &&
    simular(ficha(Object.assign({ atributos: ATR }, base)), "d3.poderClasse", "municiadorAmbulante").valido);
  t.ok("Ripostar Ousado pede Agi 2 e Luta treinada", !simular(ficha(Object.assign({ atributos: ATR }, base)), "d3.poderClasse", "ripostarOusado").valido &&
    simular(ficha(Object.assign({ atributos: ATR, pericias: { luta: "treinado" } }, base)), "d3.poderClasse", "ripostarOusado").valido);
  t.ok("Tática de Abordagem pede Int 1 e veterano em Tática", !simular(ficha(Object.assign({ atributos: ATR, pericias: { tatica: "treinado" } }, base)), "d3.poderClasse", "taticaDeAbordagem").valido &&
    simular(ficha(Object.assign({ atributos: ATR, pericias: { tatica: "veterano" } }, base)), "d3.poderClasse", "taticaDeAbordagem").valido);
  t.ok("Tiro Intuitivo pede veterano em Pontaria", !simular(ficha(Object.assign({ atributos: ATR, pericias: { pontaria: "treinado" } }, base)), "d3.poderClasse", "tiroIntuitivo").valido &&
    simular(ficha(Object.assign({ atributos: ATR, pericias: { pontaria: "veterano" } }, base)), "d3.poderClasse", "tiroIntuitivo").valido);
}

t.grupo("Tática de Abordagem · o ciclo dos dados");
{
  const o = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: { tatica: "veterano" } });
  escolher(o, "d3.poderClasse", "taticaDeAbordagem");
  t.ok("a ficha tem o poder", A9.temPoder(o, "taticaDeAbordagem"));
  t.igual("dados: 9 → 0, 10 → 1, 14 → 1, 15 → 2, 21 → 3", [9, 10, 14, 15, 21].map(A9.dadosPelaTatica), [0, 1, 1, 2, 3]);
  t.ok("fora do interlúdio: recusa", !A9.planejar(o, "tt-0", "Galpão", 21).ok);
  interludio(o);
  const p = A9.planejar(o, "tt-1", "Galpão do zumbi", 21);
  t.igual("no interlúdio, Tática 21: 3 dados", [p.ok, p.plano.dados, A9.dadosDeTatica(o)], [true, 3, 3]);
  t.ok("  uma vez por cena", !A9.planejar(o, "tt-2", "Outra", 15).ok);
  t.ok("  o mesmo clique não refaz", A9.planejar(o, "tt-1", "Galpão do zumbi", 21).repetido && A9.dados(o).tatica.planos.length === 1);
  cena(o);
  const g = A9.gastarTatica(o, "tg-1", p.plano.id, 2);
  t.igual("na cena do plano, gastar 2: resta 1", [g.ok, A9.dadosDeTatica(o)], [true, 1]);
  t.ok("  o mesmo gasto não desconta duas vezes", A9.gastarTatica(o, "tg-1", p.plano.id, 2).repetido && A9.dadosDeTatica(o) === 1);
  t.ok("  não gasta mais do que tem", !A9.gastarTatica(o, "tg-2", p.plano.id, 2).ok);
  t.igual("recarregar a ficha mantém o dado", A9.dadosDeTatica(volta(o)), 1);
  const fim = interludio(o);
  t.igual("início da próxima cena de interlúdio: o dado que sobrou some", [fim.perdidos, A9.dadosDeTatica(o)], [1, 0]);
  t.ok("  e um plano novo pode ser feito", A9.planejar(o, "tt-3", "Fuga", 9).ok && A9.dadosDeTatica(o) === 0);
}

t.grupo("Municiador Ambulante · pacotes sem espaço");
{
  const o = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR });
  escolher(o, "d3.poderClasse", "municiadorAmbulante");
  const balas = item("op.municao.balas-curtas", undefined, 3);
  const mochila = inv([balas]);
  const antes = R.capacidade(o, mochila).ocupado;
  t.ok("fora do interlúdio: recusa", !A9.municiar(o, "mu-0", [3, 4]).ok);
  interludio(o);
  const r = A9.municiar(o, "mu-1", [1, 1]);
  t.igual("Int 2: 2d6 (1 + 1) = 2 pacotes", [r.ok, r.pacotes], [true, 2]);
  t.igual("dois dos três pacotes deixam de ocupar espaço", antes - R.capacidade(o, mochila).ocupado, 2 * I.espacosDoItem(balas).unitario);
  A9.municiar(o, "mu-2", [6, 6]);
  t.igual("12 pacotes preparados: os três não ocupam", R.capacidade(o, mochila).ocupado, antes - 3 * I.espacosDoItem(balas).unitario);
}

/* =====================================================================
   TRILHA INCURSOR (p. 40)
   ===================================================================== */

t.grupo("Trilha · Incursor");
{
  const hab = P.HABILIDADES_TRILHA.filter((h) => h.trilha === "incursor").map((h) => [h.nex, h.nome]);
  t.igual("marcos 10/40/65/99", hab, [[10, "CQB"], [40, "Entrada Explosiva"], [65, "Proteger Reféns"], [99, "Alvo-prioritário"]]);
  const cqb = (pericias) => { const o = ficha({ classe: "combatente", origem: "academico", trilha: "incursor", nex: 10, atributos: ATR, pericias }); return o; };
  const g = (o, k) => C.grau(E.estado(o, null).graus[k]).bonus;
  const a = cqb({});
  t.ok("CQB: sem Pontaria, treina Pontaria", g(a, "pontaria") > 0 && !(g(a, "luta") > 0), JSON.stringify([E.estado(a, null).graus.pontaria, E.estado(a, null).graus.luta]));
  const b = cqb({ pontaria: "treinado" });
  t.ok("  já treinado em Pontaria: treina Luta", g(b, "luta") > 0);
  const c = cqb({ pontaria: "treinado", luta: "treinado" });
  const semCqb = ficha({ classe: "combatente", origem: "academico", nex: 10, atributos: ATR, pericias: { pontaria: "treinado", luta: "treinado" } });
  t.igual("  treinado nas duas: +2 em cada", ["pontaria", "luta"].map((k) => R.bonusDePericia(c, k, inv()).total - R.bonusDePericia(semCqb, k, inv()).total), [2, 2]);

  const o = ficha({ classe: "combatente", origem: "academico", trilha: "incursor", nex: 99, atributos: ATR });
  t.ok("Alvo-prioritário pede o VD do mestre", !A9.marcarAlvo(o, "ap-0", "Bruxo", "").ok);
  A9.marcarAlvo(o, "ap-1", "Zumbi de Sangue", 140);
  t.igual("VD 140: o dano zera os PV", A9.efeitoDoAlvo(o).tipo, "zerar");
  A9.marcarAlvo(o, "ap-2", "Kian", 320);
  t.igual("outro alvo, VD 320: +5 na margem (e o anterior sai)", [A9.efeitoDoAlvo(o).tipo, A9.efeitoDoAlvo(o).valor, A9.dados(o).alvo.nome], ["margem", 5, "Kian"]);
  ["Ana", "Bia", "Caio"].forEach((n, i) => A9.protegerRefem(o, "rf-" + i, n));
  t.ok("Proteger Reféns: um quarto refém na mesma rodada é recusado", !A9.protegerRefem(o, "rf-4", "Davi").ok);
  t.ok("  um dos três de novo, sim (várias vezes por rodada)", A9.protegerRefem(o, "rf-5", "ana").ok);
  A5.proximaRodada(o);
  t.ok("  rodada nova: outros reféns", A9.protegerRefem(o, "rf-6", "Davi").ok);
}

/* =====================================================================
   TRILHA PILOTO DE DRONE (p. 41) E DRONES (p. 44–46)
   ===================================================================== */

t.grupo("Trilha · Piloto de Drone");
{
  const hab = P.HABILIDADES_TRILHA.filter((h) => h.trilha === "pilotoDeDrone").map((h) => [h.nex, h.nome]);
  t.igual("marcos 10/40/65/99", hab, [[10, "Companheiro Drone"], [40, "Protetor dos Drones"], [65, "Ás dos Drones"], [99, "Mestre dos Drones"]]);
  const piloto = (nex) => ficha({ classe: "especialista", origem: "academico", trilha: "pilotoDeDrone", nex, atributos: ATR });
  t.igual("modificações da trilha: 10% 0, 40% 1, 65% 3, 99% 3 (antes da escolha)", [10, 40, 65, 99].map((n) => A9.limiteDaTrilha(piloto(n))), [0, 1, 3, 3]);
  t.igual("evitar efeito negativo: 3 PE; com Mestre dos Drones, 1", [A9.custoParaEvitar(piloto(40)), A9.custoParaEvitar(piloto(99))], [3, 1]);
  const o = piloto(99);
  t.ok("a escolha de 99% é só de quem tem o marco", !A9.escolher99(piloto(65), "seis").ok);
  A9.escolher99(o, "seis");
  t.igual("6 modificações, 1 drone", [A9.limiteDaTrilha(o), A9.dronesPermitidosPelaTrilha(o)], [6, 1]);
  A9.escolher99(o, "segundo");
  t.igual("ou um segundo drone com 3", [A9.limiteDaTrilha(o), A9.dronesPermitidosPelaTrilha(o)], [3, 2]);

  const d1 = item(A9.ID_DRONE, "protetor"); d1.ordem.as9.daTrilha = true;
  const d2 = item(A9.ID_DRONE, "medico"); d2.ordem.as9.daTrilha = true; d2.ordem.as9.segundo = true;
  const mochila = inv([d1, d2]);
  t.igual("dois drones da trilha no inventário", A9.dronesDaTrilha(o, mochila).length, 2);
  const mods = ["atirador", "espiao", "hacker"].map((k) => IT.aplicar(catItens.porId["as9.mod.drone." + k], d1, { daTrilha: true }));
  t.ok("três modificações da trilha no primeiro drone, sem acréscimo de categoria", mods.every((m) => m.ok && m.registro.semAcrescimoDeCategoria) && A9.drone(d1).categoria === 3);
  t.ok("  a quarta passa do limite de 3 (segundo drone)", !A9.podeModificarPelaTrilha(o, mochila, d1).ok);
  t.ok("  o tipo que o drone já tem não se repete", !IT.podeAplicar(catItens.porId["as9.mod.drone.protetor"], d1).ok);
}

t.grupo("Drones · bônus passivo, habilidade de duas mãos, categoria até IV");
{
  const o = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR });
  const def0 = R.defesa(o, inv()).total;
  const prot = item(A9.ID_DRONE, "protetor");
  t.igual("o drone guarda o tipo escolhido", prot.ordem.as9.tipo, "protetor");
  t.igual("Drone Protetor: +5 na Defesa, passivo (guardado)", R.defesa(o, inv([prot])).total - def0, 5);
  t.ok("  a habilidade (Alerta de Ameaça) não, sem operar com as duas mãos", !A9.temHabilidade(inv([prot]), "protetor"));
  prot.ordem.empunhada = true;
  t.ok("  operando: sim", A9.temHabilidade(inv([prot]), "protetor"));
  prot.ordem.as9.estado = "quebrado";
  t.igual("  quebrado: sem bônus e sem habilidade", [R.defesa(o, inv([prot])).total - def0, A9.temHabilidade(inv([prot]), "protetor")], [0, false]);
  const intel = item(A9.ID_DRONE, "inteligente");
  IT.aplicar(catItens.porId["as9.mod.drone.medico"], intel);
  t.ok("Inteligente: habilidades sem as mãos (inclusive a da modificação)", A9.temHabilidade(inv([intel]), "medico"));
  t.igual("  a modificação comum sobe a categoria: III → IV", A9.drone(intel).categoria, 4);
  t.ok("  e a próxima comum é recusada (até IV)", !IT.podeAplicar(catItens.porId["as9.mod.drone.atirador"], intel).ok);
  const espiao = item(A9.ID_DRONE, "espiao");
  R.calcular(o, inv([espiao]));
  t.igual("Drone Espião: +1d20 em Percepção", R.dadosDoTeste(o, "percepcao").quantos - R.dadosDoTeste(ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR }), "percepcao").quantos, 1);
  const atir = item(A9.ID_DRONE, "atirador");
  R.calcular(o, inv([atir]));
  t.igual("Drone Atirador: +1d20 no ataque, não num teste de Luta qualquer", [R.dadosDoTeste(o, "luta", { ataque: "corpo" }).quantos - R.dadosDoTeste(o, "luta").quantos], [1]);
  const med = item(A9.ID_DRONE, "medico");
  R.calcular(o, inv([med]));
  t.igual("Drone Médico, destreinado: considerado treinado em Medicina", R.bonusDePericia(o, "medicina", inv([med])).total - R.bonusDePericia(o, "medicina", inv()).total, C.grau("treinado").bonus);
  const oT = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR, pericias: { medicina: "treinado" } });
  R.calcular(oT, inv([med]));
  const d0 = R.dadosDoTeste(ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR, pericias: { medicina: "treinado" } }), "medicina").quantos;
  t.igual("  já treinado: +1d20 em Medicina", R.dadosDoTeste(oT, "medicina").quantos - d0, 1);
  const util = item(A9.ID_DRONE, "utilitario");
  t.ok("Utilitário: Luta não pode", !A9.definirDoDrone(util, "pericia", "luta").ok);
  t.ok("  Crime pode, e não muda depois", A9.definirDoDrone(util, "pericia", "crime").ok && !A9.definirDoDrone(util, "pericia", "furtividade").ok);
}

/* =====================================================================
   ITENS (p. 42–48) E REGALIAS (p. 42)
   ===================================================================== */

t.grupo("Itens · os onze e as sete modificações de drone");
{
  const as9 = catItens.itens.filter((e) => e.fonte === "AS9");
  t.igual("11 itens + 7 modificações", [as9.filter((e) => e.natureza === "item").length, as9.filter((e) => e.natureza === "modificacao").length], [11, 7]);
  const e = (id) => catItens.porId[id];
  t.igual("DMR: tática, duas mãos, 2d10, 19/x3, médio, balas longas, cat. III, 3 espaços",
    [e("as9.arma.dmr").arma.dano, e("as9.arma.dmr").arma.critico, e("as9.arma.dmr").arma.alcance, e("as9.arma.dmr").arma.municao, e("as9.arma.dmr").categoria, e("as9.arma.dmr").espacos],
    ["2d10", "19/x3", "medio", "op.municao.balas-longas", 3, 3]);
  t.igual("Espingarda serrada: uma mão, 3d6, x3, curto", [e("as9.arma.espingarda-serrada").arma.empunhadura, e("as9.arma.espingarda-serrada").arma.dano, e("as9.arma.espingarda-serrada").arma.critico], ["umaMao", "3d6", "x3"]);
  t.igual("Lançador portátil: as regras do lançador do AS4, uma granada", e("as9.arma.lancador-de-granadas-portatil").lancador.capacidade, 1);
  const lan = item("as9.arma.lancador-de-granadas-portatil");
  t.igual("  no inventário: capacidade 1", I.dadosDoItem(lan).lancador.capacidade, 1);
  t.ok("Pistola taser: arma de eletricidade com dardos condutores, distinta do taser operacional",
    e("as9.arma.pistola-taser").arma.municao === "as9.municao.dardos-condutores" && e("as9.arma.pistola-taser").id !== "op.geral.taser" && /operacional/.test(e("as9.arma.pistola-taser").notas.join(" ")));
  t.igual("Escudo balístico LED: escudo +2", [e("as9.protecao.escudo-balistico-led").protecao.tipo, e("as9.protecao.escudo-balistico-led").protecao.defesa], ["escudo", 2]);
  t.ok("Capacete tático: vestido, não ocupa o lugar da proteção em uso", e("as9.protecao.capacete-tatico").vestimenta && !e("as9.protecao.capacete-tatico").protecao);
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("desligado: os itens do AS9 não se oferecem", !C.fonteLiberada(e("as9.arma.dmr")));
  S.definirContexto({ sistema: "ordem" });
}

t.grupo("Regalias · Veículos Operacionais (AS3)");
{
  const ks = ["centralDeDrones", "estacaoDeArmas", "lancadoresDeFumaca"];
  const reg = (k) => A3.REGALIAS.filter((r) => r.chave === k)[0];
  t.ok("as três, AS9 p. 42", ks.every((k) => reg(k) && reg(k).fonte === "AS9" && reg(k).pagina === 42));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as3"] });
  t.ok("  sem o AS9 ligado, não se oferecem (a fonte não está liberada)", !C.fonteLiberada(reg("centralDeDrones").fonte));
  S.definirContexto({ sistema: "ordem" });
}

/* =====================================================================
   HELL HUNTERS (p. 20–35) E O GERADOR (p. 14)
   ===================================================================== */

t.grupo("Hell Hunters · Jason Bloom como combatente e como aliado");
{
  const hh = DADOS.criaturas.filter((c) => /^as9\./.test(c.id));
  t.igual("8 fichas de Pessoa + 8 perfis de aliado", [hh.filter((c) => !/-aliado$/.test(c.id)).length, hh.filter((c) => /-aliado$/.test(c.id)).length], [8, 8]);
  const jason = hh.filter((c) => c.id === "as9.criatura.jason-bloom")[0];
  t.ok("Jason: Pessoa, VD 140, AS9 p. 21", !!jason && jason.vd === 140 && jason.pagina === 21 && jason.tipo === "Pessoa");
  if (OC.carregar) await OC.carregar();
  const cj = OC.criatura("as9.criatura.jason-bloom");
  t.ok("  como combatente: ficha de Ordem com PV, VD e ataques", !!cj && CR.resumo(cj).pv > 0 && cj.acoes.some((a) => (a.ataques || []).length) && cj.ordem.vd === 140,
    cj ? JSON.stringify([CR.resumo(cj).pv, cj.ordem && cj.ordem.vd]) : "sem ficha");
  const aliado = hh.filter((c) => c.id === "as9.criatura.jason-bloom-aliado")[0];
  t.ok("  como aliado: perfil próprio", !!aliado);
  const o = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR });
  const d0 = R.dadosDoTeste(o, "fortitude").quantos;
  const r = A3.acompanhar(o, "al-1", "as9.criatura.jason-bloom-aliado", "Jason Bloom", true);
  t.ok("  acompanhando: +1d20 em Fortitude", r.ok && R.dadosDoTeste(volta(o), "fortitude").quantos - d0 === 1);
  const ryder = A3.acompanhar(o, "al-2", "as9.criatura.ryder-staten-aliado", "Ryder", true, ["crime", "tecnologia"]);
  t.ok("Ryder: duas perícias quaisquer", ryder.ok && R.dadosDoTeste(volta(o), "crime").quantos - R.dadosDoTeste(ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR }), "crime").quantos === 1);
}

t.grupo("Gerador de Mercenários Hell Hunters");
{
  const seq = [3, 2, 5, 1, 20];
  let i = 0;
  const g = OC.gerarHellHunters(() => seq[i++]);
  t.igual("1d10 = 3 → coluna 3–4; 1d6 2 e 5; 1d20 1 e 20", [g.coluna, g.tracos, g.aparencia], ["3–4", ["Percepção tática", "Coragem"], ["Porte atlético", "Mãos calejadas"]]);
  t.ok("  só narrativa, com referência", g.referencia === "Arquivos Secretos 9, p. 14");
}

/* =====================================================================
   PERSISTÊNCIA
   ===================================================================== */

t.grupo("Persistência · schema 33, exportar e importar");
{
  t.igual("schema 32 (o AS9 entrou no 30; BRUTAL subiu para 32; as fórmulas nos atributos, para 33; Tormenta20, para 34)", F.VERSAO_SCHEMA, 34);
  const antiga = F.normalizarFicha({ schemaVersion: 29, nome: "Antiga", tipoFicha: "ordem", ordem: { classe: "combatente" } });
  t.ok("ficha 29 abre com o estado vazio, sem conversão", !!antiga.ordem.arquivo9 && antiga.ordem.arquivo9.tatica.planos.length === 0);
  const o = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: { tatica: "veterano" } });
  escolher(o, "d3.poderClasse", "taticaDeAbordagem");
  interludio(o);
  A9.planejar(o, "tt-x", "Galpão", 20);
  const dr = item(A9.ID_DRONE, "utilitario");
  A9.definirDoDrone(dr, "pericia", "crime");
  dr.ordem.as9.daTrilha = true;
  const fs = F.normalizarFicha({ nome: "Teste", tipoFicha: "ordem", ordem: o, inventario: { itens: [dr] }, rituais: { itens: [] } });
  const ex = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fs))));
  const a9 = ex.ok ? ex.dados.ordem.arquivo9 : null;
  t.ok("exportar e importar: o plano volta com o id e os dados", !!a9 && a9.tatica.planos.length === 1 && !!a9.tatica.planos[0].id && a9.tatica.planos[0].restantes === 3);
  t.ok("  e os opIds (nada repete depois de importar)", !!a9 && A9.jaFeito(ex.dados.ordem, "tt-x"));
  const dv = ex.ok ? ex.dados.inventario.itens[0] : null;
  t.igual("  o drone volta com tipo, perícia e trilha", dv && dv.ordem.as9, { tipo: "utilitario", pericia: "crime", daTrilha: true });
  const lixo = { tipo: "voador", pericia: "luta", estado: "explodido", daTrilha: "sim" };
  const dest = {};
  A9.normalizarDadosDoItem(dest, { as9: lixo });
  t.igual("o que não vale no item não passa", dest.as9, {});
  const dup = JSON.parse(JSON.stringify(o));
  dup.arquivo9.tatica.planos.push(JSON.parse(JSON.stringify(dup.arquivo9.tatica.planos[0])));
  t.igual("plano duplicado (mesmo id) entra uma vez", volta(dup).arquivo9.tatica.planos.length, 1);
  const sync = await Deno.readTextFile(new URL("../js/sync.js", import.meta.url));
  t.ok("a sincronização conhece os planos por id", sync.indexOf("ordem.arquivo9.tatica.planos") >= 0 && sync.indexOf("ordem.arquivo9.usos") >= 0);
}

t.grupo("Servidor");
{
  const sis = await Deno.readTextFile(new URL("../backend/Sistemas.gs", import.meta.url));
  t.ok("o registro do servidor conhece ordem.as9", /ordem\.as9/.test(sis));
  const gs = await Deno.readTextFile(new URL("../backend/Campanhas.gs", import.meta.url));
  t.ok("o servidor aceita o AS9 como fonte de criatura", /as9/i.test(gs));
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
