/* =====================================================================
   R.A.M.A. — testes do Companheiro Animal (v9.25.0)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-companheiro.js

   O motor (js/ordem/companheiro.js) pelos critérios de aceite: números
   de criação e de 10%, substitutas de perícia, marcos 60→75, crescimento,
   Elo que cai e volta, Transcender, Cobaia, conexão, trauma e o aliado
   guardado junto de um convencional. Sem DOM; dados sintéticos.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
for (const caminho of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/inventario.js", "js/ordem/companheiro.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}
const C = globalThis.RAMAOrdemCompanheiro;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0; const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  igual(nome, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(nome, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};
console.log(`${FORTE}R.A.M.A. — Companheiro Animal${FIM}`);

function ate(c, nex) { while (C.NEX[c.nexIndice] < nex) C.subirNex(c); return c; }

/* --- Critério: médio, Amigo de longa data, Predador --- */
t.grupo("Criação: médio, Amigo de longa data, Predador");
const base = C.normalizar({
  nome: "Bóris", especie: "cão", porteInicial: "medio", portePlanejado: "medio",
  distribuicao: { agi: 1, int: 1 }, origem: "longaData", especializacao: "predador",
  escolhas: { "esp.pericias": ["luta", "sentidos", "sobrevivencia", "atletismo", "reflexos"] },
});
let r = C.calcular(base);
t.igual("atributos AGI 2 / FOR 1 / INT 2 / PRE 1 / VIG 1", r.atributos, { agi: 2, for: 1, int: 2, pre: 1, vig: 1 });
t.igual("sem problemas de distribuição", r.problemasDistribuicao, []);
t.igual("PV 13", r.pv.maximo, 13);
t.igual("PE 4", r.pe.maximo, 4);
t.igual("COR 14", r.cor.maximo, 14);
t.igual("Elo 10%", r.elo, 10);
t.igual("Defesa 12", r.defesa, 12);
t.igual("limite de PE 1", r.limitePE, 1);
t.igual("carga 4", r.carga.capacidade, 4);
const vagaLivres = r.vagas.find((v) => v.id === "esp.pericias");
t.igual("5 perícias livres (3 + INT 2)", vagaLivres.quantidade, 5);
t.igual("treinadas: Vontade, Iniciativa, Furtividade e as 5", ["vontade", "iniciativa", "furtividade", "luta", "sentidos", "sobrevivencia", "atletismo", "reflexos"].every((p) => r.graus[p] === "treinado"), true);
t.igual("nenhuma pendência na criação", r.pendentes.map((v) => v.id), []);
t.igual("Presa Fácil ainda não em 5%", r.habilidades.find((h) => h.chave === "presaFacil").ativa, false);

const em10 = C.normalizar(base); C.subirNex(em10);
r = C.calcular(em10);
t.igual("10%: PV 17", r.pv.maximo, 17);
t.igual("10%: PE 8", r.pe.maximo, 8);
t.igual("10%: COR 18", r.cor.maximo, 18);
t.igual("10%: limite de PE 2", r.limitePE, 2);
t.igual("10%: Presa Fácil ativa, +1d6", [r.habilidades.find((h) => h.chave === "presaFacil").ativa, r.presaFacilDados], [true, 1]);
t.igual("recalcular duas vezes dá o mesmo", JSON.stringify(C.calcular(em10).pv), JSON.stringify(C.calcular(C.normalizar(em10)).pv));

/* --- Rinha + Agressor --- */
t.grupo("Rinha + Agressor: substitutas");
const rinha = C.normalizar({ porteInicial: "medio", distribuicao: { for: 1, vig: 1 }, origem: "rinha", especializacao: "agressor", escolhas: { "esp.fixa": "fortitude" } });
r = C.calcular(rinha);
t.igual("vagas de substituta para Luta e Fortitude", r.vagas.filter((v) => v.id.indexOf("esp.subst.") === 0).map((v) => v.id), ["esp.subst.luta", "esp.subst.fortitude"]);
rinha.escolhas["esp.fixa"] = "reflexos";
r = C.calcular(rinha);
t.igual("com Reflexos: só Luta pede substituta", r.vagas.filter((v) => v.id.indexOf("esp.subst.") === 0).map((v) => v.id), ["esp.subst.luta"]);
rinha.escolhas["esp.subst.luta"] = "luta";
r = C.calcular(rinha);
t.ok("substituta repetida é recusada", !!r.vagas.find((v) => v.id === "esp.subst.luta").problema);
rinha.escolhas["esp.subst.luta"] = "atletismo";
rinha.escolhas["esp.pericias"] = ["sentidos"];
r = C.calcular(rinha);
t.igual("substituta aceita e treinada", [r.vagas.find((v) => v.id === "esp.subst.luta").problema, r.graus.atletismo], [null, "treinado"]);
t.igual("Agressor: 1 + INT 1 livres", r.vagas.find((v) => v.id === "esp.pericias").quantidade, 2);

/* --- 60 → 65 → 70 → 75 --- */
t.grupo("Marcos 60 → 65 → 70 → 75 (Predador)");
const alto = ate(C.normalizar(base), 60);
alto.escolhas["poder.20"] = "ataquePesado"; alto.escolhas["poder.50"] = "instintivo";
alto.escolhas["atr.30"] = "agi"; alto.escolhas["atr.50"] = "agi";
alto.escolhas["grau.35"] = ["furtividade", "luta", "sentidos", "reflexos"];
alto.escolhas.conexao = "sangue";
r = C.calcular(alto);
t.igual("60%: sem poder extra", r.vagas.filter((v) => v.tipo === "poder").map((v) => v.id), ["poder.20", "poder.50"]);
t.igual("60%: Caçada ainda não", r.habilidades.find((h) => h.chave === "cacada").ativa, false);
C.subirNex(alto); r = C.calcular(alto);
t.igual("65%: Caçada ativa", r.habilidades.find((h) => h.chave === "cacada").ativa, true);
t.igual("65%: sem grau novo", r.vagas.filter((v) => v.tipo === "grau").map((v) => v.id), ["grau.35"]);
C.subirNex(alto); r = C.calcular(alto);
t.igual("70%: grau novo", r.vagas.filter((v) => v.tipo === "grau").map((v) => v.id), ["grau.35", "grau.70"]);
t.igual("70%: Presa Fácil 3d6", r.presaFacilDados, 3);
const vagas70 = r.vagas.map((v) => v.id).join();
C.subirNex(alto); r = C.calcular(alto);
t.igual("75%: nada novo", r.vagas.map((v) => v.id).join(), vagas70);

/* --- Crescimento --- */
t.grupo("Crescimento: pequeno para médio antes de 15%");
const filhote = C.normalizar({ porteInicial: "pequeno", portePlanejado: "medio", distribuicao: { agi: 1 }, origem: "palco", especializacao: "utilitario" });
r = C.calcular(filhote);
t.igual("um ponto a menos na criação (1)", r.pontosIniciais, 1);
t.igual("sem problema com 1 ponto", r.problemasDistribuicao, []);
t.igual("5%: PV 9, PE 5, COR 16", [r.pv.maximo, r.pe.maximo, r.cor.maximo], [9, 5, 16]);
C.subirNex(filhote);
t.ok("cresce em 10%", C.crescer(filhote));
t.ok("não cresce duas vezes no mesmo marco", !C.crescer(filhote));
r = C.calcular(filhote);
t.igual("10%: PV 12, PE 10, COR 21 (ganho ainda de pequeno)", [r.pv.maximo, r.pe.maximo, r.cor.maximo], [12, 10, 21]);
t.igual("10%: porte médio", r.porte.chave, "medio");
t.igual("um ponto de crescimento", r.vagas.filter((v) => v.id.indexOf("cresc.") === 0).map((v) => v.id), ["cresc.10"]);
C.subirNex(filhote); r = C.calcular(filhote);
t.igual("15%: PV 16, PE 14, COR 25 (ganho de médio)", [r.pv.maximo, r.pe.maximo, r.cor.maximo], [16, 14, 25]);
t.ok("não pode crescer além do planejado", !C.crescer(filhote));
const filhoteRuim = C.normalizar({ porteInicial: "pequeno", portePlanejado: "grande", distribuicao: {} });
t.igual("dois portes de crescimento: reduzir 0 → mostra a diferença", C.calcular(filhoteRuim).pontosIniciais, 0);

/* --- Elo --- */
t.grupo("Elo: escolha guardada quando cai");
const amigo = C.normalizar(Object.assign({}, base, { origem: "rua" }));
amigo.eloBase = 19;
r = C.calcular(amigo);
t.igual("19%: sem vaga de Elo", r.vagas.filter((v) => v.tipo === "poderElo").length, 0);
C.ajustarElo(amigo, 1, "Passar o interlúdio juntos");
r = C.calcular(amigo);
t.igual("20%: uma vaga", r.vagas.filter((v) => v.tipo === "poderElo").map((v) => v.id), ["elo.20"]);
amigo.escolhas["elo.20"] = "apoioMoral";
C.ajustarElo(amigo, -2, "Expor a risco de vida");
r = C.calcular(amigo);
t.igual("18%: poder guardado e inativo", r.poderesElo.map((p) => [p.chave, p.ativo]), [["apoioMoral", false]]);
t.igual("18%: nada pendente de Elo", r.pendentes.filter((v) => v.tipo === "poderElo").length, 0);
C.ajustarElo(amigo, 2, "Salvar o animal");
r = C.calcular(amigo);
t.igual("20% de novo: o mesmo poder, sem segunda escolha", [r.poderesElo.map((p) => [p.chave, p.ativo]), r.vagas.filter((v) => v.tipo === "poderElo").length], [[["apoioMoral", true]], 1]);
t.igual("registro de ajustes", amigo.eloRegistro.length, 3);

/* --- Transcender / Cobaia / conexão --- */
t.grupo("Transcender, Cobaia Paranormal e conexão");
const tr = ate(C.normalizar(base), 20);
const corSem = C.calcular(tr).cor.maximo;
tr.escolhas["poder.20"] = "transcender"; tr.escolhas["poder.20.paranormal"] = "comunicacaoTelepatica";
r = C.calcular(tr);
t.igual("Transcender tira só a COR do marco (−4)", corSem - r.cor.maximo, 4);
t.igual("poder paranormal recebido", r.paranormais.map((p) => p.chave), ["comunicacaoTelepatica"]);
const cob = C.normalizar({ porteInicial: "medio", distribuicao: { agi: 1, int: 1 }, origem: "cobaia", especializacao: "agressor", escolhas: { "origem.sequela": "paranormal" } });
r = C.calcular(cob);
t.igual("Cobaia Paranormal: COR inicial à metade (7)", r.cor.maximo, 7);
t.ok("Cobaia Paranormal pede um poder paranormal", r.vagas.some((v) => v.id === "origem.paranormal"));
C.subirNex(cob); t.igual("ganho seguinte normal (+4)", C.calcular(cob).cor.maximo, 11);
const cx = ate(C.normalizar(base), 50);
r = C.calcular(cx);
t.ok("50%: vaga de conexão", r.vagas.some((v) => v.id === "conexao"));
cx.escolhas.conexao = "morte";
C.subirNex(cx); C.descerNex(cx); C.subirNex(cx);
t.igual("conexão guardada", C.calcular(cx).conexao, "morte");
const pFuria = C.normalizar(ate(C.normalizar(base), 20));
pFuria.escolhas["poder.20"] = "transcender"; pFuria.escolhas["poder.20.paranormal"] = "furiaBestial";
t.ok("Fúria Bestial pede outros 2 de Sangue", /Sangue 2/.test(C.calcular(pFuria).vagas.find((v) => v.id === "poder.20.paranormal").problema || ""));
t.ok("Aprender Ritual fica fora", !C.paranormais().some((p) => /aprenderRitual/.test(p.chave)));
t.ok("poderes de Ordem entram", C.paranormais().some((p) => p.chave === "ordem:resistirAElemento"));

/* --- Janela de escolha: candidatos --- */
t.grupo("Candidatos da janela de escolha (v9.25.1)");
const jc = C.normalizar(ate(C.normalizar(base), 20));
jc.escolhas["poder.20"] = "transcender"; jc.escolhas["poder.20.paranormal"] = "hiperfagia";
r = C.calcular(jc);
const candP = C.candidatos(r, "poder.20.paranormal");
const achar = (k) => candP.find((c) => c.entrada.chave === k);
t.igual("todos os paranormais aparecem", candP.length, C.paranormais().length);
t.ok("trocar o único de Sangue: Sangue Vivo (pede outro de Sangue) fica indisponível", !achar("ordem:sangueVivo").disponivel && /Sangue 1/.test(achar("ordem:sangueVivo").motivo));
t.ok("o próprio escolhido continua disponível", achar("hiperfagia").disponivel);
t.ok("Placas Sanguinolentas: requisito de ritual impossível, escrito", !achar("ordem:placasSanguinolentas").disponivel && /não aprende rituais/.test(achar("ordem:placasSanguinolentas").requisitos[0].texto));
const candG = C.candidatos(r, "poder.20");
t.igual("poder geral: um candidato por poder", candG.length, C.PODERES.length);
t.ok("Tanque Animal sem VIG 2: indisponível, com ✗ no requisito", !candG.find((c) => c.entrada.chave === "tanqueAnimal").disponivel && candG.find((c) => c.entrada.chave === "tanqueAnimal").requisitos[0].ok === false);
t.ok("Reflexos Defensivos com AGI 2: disponível", candG.find((c) => c.entrada.chave === "reflexosDefensivos").disponivel);
t.igual("vaga desconhecida: lista vazia", C.candidatos(r, "nada"), []);

/* --- Trauma --- */
t.grupo("Trauma");
const medo = C.normalizar(base); medo.trauma.missao = "m1";
let cr = C.calcular(medo);
C.definirRecurso(medo, "cor", 5, cr.cor.maximo);
cr = C.calcular(medo);
t.ok("COR abaixo do máximo: Amedrontado", cr.amedrontado);
t.ok("0 abre um episódio", C.definirRecurso(medo, "cor", 0, cr.cor.maximo).abriuTrauma);
const reaberto = C.normalizar(JSON.parse(JSON.stringify(medo)));
C.definirRecurso(reaberto, "cor", 0, cr.cor.maximo);
t.igual("reabrir em 0 não cria outro", reaberto.trauma.episodios.length, 1);
C.definirRecurso(reaberto, "cor", 3, cr.cor.maximo); C.definirRecurso(reaberto, "cor", 0, cr.cor.maximo);
C.definirRecurso(reaberto, "cor", 3, cr.cor.maximo); C.definirRecurso(reaberto, "cor", 0, cr.cor.maximo);
cr = C.calcular(reaberto);
t.igual("três episódios na missão: incapaz", [cr.trauma.daMissao, cr.trauma.incapaz], [3, true]);

/* --- Guardar / normalizar --- */
t.grupo("Normalização e ida e volta");
const ida = JSON.parse(JSON.stringify(C.normalizar(alto)));
t.igual("ida e volta estável", JSON.stringify(C.normalizar(ida)), JSON.stringify(C.normalizar(C.normalizar(ida))));
t.igual("chave inválida descartada", Object.keys(C.normalizar({ escolhas: { "<script>": "x", "poder.20": "instintivo" } }).escolhas), ["poder.20"]);
t.igual("zerado só vale para base positiva", C.normalizar({ porteInicial: "minusculo", zerado: "for" }).zerado, "");
const zer = C.normalizar({ porteInicial: "medio", zerado: "for", distribuicao: { agi: 2, int: 1 } });
t.igual("zerar FOR dá +1 ponto (3)", [C.calcular(zer).pontosIniciais, C.calcular(zer).atributos.for, C.calcular(zer).problemasDistribuicao], [3, 0, []]);
t.igual("FOR 0: carga do porte (2)", C.calcular(zer).carga.capacidade, 2);

console.log(`\n${FORTE}${passaram} ok${FIM}${falharam ? `, ${VERMELHO}${falharam} falharam${FIM}: ${falhas.join("; ")}` : ""}`);
if (falharam) Deno.exit(1);
