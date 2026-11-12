/* =====================================================================
   R.A.M.A. — Tormenta20 — Jogo do Ano (v8.0) · aceitação do motor
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-tormenta20.js

   Personagens montados com as regras do Livro Básico, passando pelo
   mesmo motor da ficha, da Mesa e do Apps Script (js/tormenta20/):
   compra e rolagem de atributos; evolução com e sem multiclasse; uma
   mudança de Constituição que recalcula os PV; armadura e sobrecarga nas
   perícias certas; magia com aprimoramentos e uma sustentada; engenhoca;
   crítico com dado extra; manobra, sangramento e estabilização;
   encontro com ND fracionário; descanso, tesouro e XP; Ofício com
   especialização; salvar, reabrir, exportar e importar.
   Os dados são fixados por uma fila: nada depende de sorte.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };

const ARQUIVOS = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js", "js/tema-modelo.js"]
  .concat(["dados", "expressao", "racas", "classes-a", "classes-b", "classes-c", "origens", "deuses", "poderes", "equipamento",
    "magias", "magias-1", "magias-2", "magias-3", "magias-4", "magias-5", "ameacas", "ameacas-1", "ameacas-2", "ameacas-3", "ameacas-4",
    "ameacas-5", "ameacas-6", "ameacas-7", "parceiros", "itens-magicos", "itens-magicos-2", "mesa-dados", "regras", "mesa"].map((a) => "js/tormenta20/" + a + ".js"))
  .concat(["js/criaturas.js", "js/ficha.js", "js/validacao.js"]);
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  igual(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};
/* Uma fila de dados: cada chamada tira o próximo valor. */
function fila(...v) { const q = v.flat(); const f = () => { if (!q.length) throw new Error("fila vazia"); return q.shift(); }; f.resto = q; return f; }

const R = globalThis.RAMATormenta20, D = globalThis.RAMATormenta20Dados, MG = globalThis.RAMATormenta20Magias, A = globalThis.RAMATormenta20Ameacas;
const M = globalThis.RAMATormenta20Mesa, IM = globalThis.RAMATormenta20ItensMagicos, S = globalThis.RAMAFicha, V = globalThis.RAMAValidacao;
const item = (ref, estado, extra) => R.normalizarItem(Object.assign({ ref, estado: estado || "carregado" }, extra || {}));
const calc = (b) => R.calcular(R.normalizar(b));

/* Guerreiro humano de 1º nível (p. 19 e 64): Força, Constituição e
   Destreza +1 pela raça; soldado (p. 92). */
function guerreiro() {
  const b = R.fichaVazia();
  b.metodo = "pontos";
  b.atributosBase = { "for": 3, des: 1, con: 2, "int": 0, sab: 1, car: 0 };
  b.raca = { id: "humano", variante: "", atributos: ["for", "con", "des"], escolhas: {} };
  b.origem = { id: "soldado", beneficios: [{ tipo: "pericia", id: "fortitude" }, { tipo: "poder", id: "influenciaMilitar" }], escolhas: {} };
  b.niveis = [{ classe: "guerreiro", escolhas: { pericias: ["atletismo", "intimidacao"], ou: ["luta"] } }];
  b.inventario.itens = [item("espadaLonga", "empunhado", { mao: "principal" }), item("cotaDeMalha", "vestido")];
  return R.normalizar(b);
}
/* Arcanista elfo (bruxo) de 5º nível (p. 21 e 36). */
function arcanista() {
  const b = R.fichaVazia();
  b.atributosBase = { "for": -1, des: 2, con: 1, "int": 3, sab: 1, car: 0 };
  b.raca = { id: "elfo", variante: "", atributos: [], escolhas: {} };
  b.origem = { id: "estudioso", beneficios: [{ tipo: "pericia", id: "conhecimento" }, { tipo: "pericia", id: "investigacao" }], escolhas: {} };
  b.niveis = [{ classe: "arcanista", escolhas: { caminho: "bruxo", pericias: ["conhecimento", "intuicao"] } }];
  for (let i = 2; i <= 5; i++) b.niveis.push({ classe: "arcanista", escolhas: {} });
  b.magias = [{ id: "armaduraArcana", fonte: "classe:arcanista" }, { id: "bolaDeFogo", fonte: "classe:arcanista" }, { id: "velocidade", fonte: "classe:arcanista" }, { id: "conjurarMonstro", fonte: "classe:arcanista" }];
  return R.normalizar(b);
}

t.grupo("Atributos · compra por 10 pontos e seis rolagens de 4d6 (p. 17)");
{
  t.igual("tabela de custo do livro (–1 devolve 1; 3 custa 4; 4 custa 7)", [D.CUSTO_PONTOS["-1"], D.CUSTO_PONTOS["0"], D.CUSTO_PONTOS["1"], D.CUSTO_PONTOS["2"], D.CUSTO_PONTOS["3"], D.CUSTO_PONTOS["4"], D.PONTOS_INICIAIS], [-1, 0, 1, 2, 4, 7, 10]);
  const ok = R.custoDosPontos({ "for": 3, des: 1, con: 2, "int": 0, sab: 1, car: 0 });
  t.ok("For 3, Des 1, Con 2, Sab 1 = 4+1+2+1 = 8 pontos (sobram 2)", ok.valido && ok.custo === 8 && ok.restante === 2);
  t.ok("For 4 e Des 4 (14 pontos) passa do limite", !R.custoDosPontos({ "for": 4, des: 4, con: 0, "int": 0, sab: 0, car: 0 }).valido);
  t.ok("valor fora da tabela (5) é recusado", !R.custoDosPontos({ "for": 5, des: 0, con: 0, "int": 0, sab: 0, car: 0 }).valido);
  const c = calc(guerreiro());
  t.ok("valor base e ajuste da raça aparecem nas parcelas (humano +1)", c.atributos["for"].total === 4 && c.atributos["for"].parcelas.some((p) => /Humano|raça/i.test(p.rotulo) && p.valor === 1));
  t.igual("conversão da soma (p. 17): 7→–2, 8→–1, 10→0, 12→+1, 14→+2, 16→+3, 18→+4", [7, 8, 10, 12, 14, 16, 18].map(D.atributoDaRolagem), [-2, -1, 0, 1, 2, 3, 4]);
  const r = R.rolarAtributos(fila(6, 6, 6, 1, 5, 5, 4, 1, 4, 4, 2, 1, 4, 4, 4, 2, 6, 5, 1, 1, 2, 2, 2, 1));
  t.igual("descarta o menor de cada 4d6 e converte", r.valores, [4, 2, 0, 1, 1, -2]);
  t.ok("cada rolagem guarda os quatro dados e o descartado", r.rolagens[0].dados.length === 4 && r.rolagens[0].descartado === 1 && r.rolagens[0].soma === 18);
  const baixa = R.rolarAtributos(fila(1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 4, 1, 2, 3, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6));
  t.ok("soma dos modificadores abaixo de 6: rola de novo o menor até chegar", baixa.soma >= D.SOMA_MINIMA_ROLAGEM && baixa.refeitas > 0);
  const b = R.fichaVazia();
  t.ok("distribuir os seis valores nos atributos", R.distribuirAtributos(b, r.valores, ["for", "des", "con", "int", "sab", "car"]).ok && b.atributosBase["for"] === 4 && b.metodo === "rolagem");
  t.ok("repetir atributo na distribuição é recusado", !R.distribuirAtributos(R.fichaVazia(), r.valores, ["for", "for", "con", "int", "sab", "car"]).ok);
}

t.grupo("Evolução · níveis, XP, patamares e multiclasse (p. 30–31)");
{
  const b = guerreiro();
  let c = R.calcular(b);
  t.igual("guerreiro 1º: PV 20 + Con (3) = 23; PM 3", [c.pv.max, c.pm.max], [23, 3]);
  t.ok("sem XP não sobe", !R.podeSubir(b).ok);
  R.adicionarXp(b, 10000);
  for (let i = 0; i < 4; i++) R.subirNivel(b, "guerreiro", {});
  c = R.calcular(b);
  t.igual("guerreiro 5º sem multiclasse: PV 23 + 4 × (5 + 3) = 55; PM 15", [c.nivel, c.pv.max, c.pm.max], [5, 55, 15]);
  t.igual("patamar veterano a partir do 5º", c.patamar.chave || c.patamar, D.patamar(5).chave || D.patamar(5));
  t.ok("treino +2 até o 6º; ½ nível nas perícias", c.treino === 2 && c.pericias.luta.parcelas[0].valor === 2);
  const m = guerreiro();
  R.adicionarXp(m, 3000);
  R.subirNivel(m, "guerreiro", {});
  const r = R.subirNivel(m, "arcanista", { caminho: "mago" });
  const cm = R.calcular(m);
  t.ok("multiclasse: guerreiro 2 / arcanista 1", r.ok && cm.nivel === 3 && cm.niveisClasse.guerreiro === 2 && cm.niveisClasse.arcanista === 1);
  t.igual("a segunda classe não dá PV iniciais: 23 + (5+3) + (2+3) = 36", cm.pv.max, 36);
  t.ok("nem as perícias iniciais (Misticismo do arcanista fica sem treino)", !cm.pericias.misticismo.treinado && cm.pericias.luta.treinado);
  t.ok("as proficiências do guerreiro continuam, sem duplicar", cm.proficiencias.marciais && cm.fontes.filter((f) => /inicial/.test(f.id)).length === 1);
  t.ok("nível de personagem ≠ nível na classe: magias de 1º círculo no arcanista 1", cm.magias.fontes["classe:arcanista"] && cm.magias.fontes["classe:arcanista"].circuloMax === 1);
  t.ok("desfazer o último nível volta ao guerreiro 2", R.desfazerUltimoNivel(m).ok && R.calcular(m).nivel === 2 && !R.calcular(m).niveisClasse.arcanista);
}

t.grupo("Constituição muda, PV acompanham, o dano fica (p. 106)");
{
  const b = guerreiro();
  R.adicionarXp(b, 3000); R.subirNivel(b, "guerreiro", {}); R.subirNivel(b, "guerreiro", {});
  let c = R.calcular(b);
  const max0 = c.pv.max;
  R.aplicarDano(b, 10, "corte");
  c = R.calcular(b);
  t.igual("10 de corte (sem RD)", c.pv.atual, max0 - 10);
  b.atributosBase.con = 4;
  c = R.calcular(b);
  t.igual("Con +2 no 3º nível: +6 PV no máximo", c.pv.max, max0 + 6);
  t.igual("e o atual sobe junto (o dano sofrido continua 10)", c.pv.atual, c.pv.max - 10);
  t.ok("as parcelas mostram a Constituição × nível", c.pv.parcelas.some((p) => /Constituição/.test(p.rotulo) && p.valor === 15));
}

t.grupo("Armadura e sobrecarga nas perícias certas (p. 114, 117 e 157)");
{
  const b = guerreiro();
  let c = R.calcular(b);
  t.ok("cota de malha: penalidade –2 em Acrobacia, Furtividade e Ladinagem", c.penalidadeArmadura.total === -2 && ["acrobacia", "furtividade", "ladinagem"].every((k) => c.pericias[k].parcelas.some((p) => /armadura/i.test(p.rotulo) && p.valor === -2)));
  t.ok("Luta, Atletismo e Fortitude não sofrem", ["luta", "atletismo", "fortitude"].every((k) => !c.pericias[k].parcelas.some((p) => /armadura/i.test(p.rotulo))));
  t.igual("armadura pesada: deslocamento 6 m", c.deslocamento.terrestre, 6);
  const acro = c.pericias.acrobacia.total, luta = c.pericias.luta.total;
  for (let i = 0; i < 4; i++) b.inventario.itens.push(item("cotaDeMalha"));
  c = R.calcular(R.normalizar(b));
  t.ok("passou do limite (10 + 2 × Força): sobrecarregado", c.carga.sobrecarregado && c.carga.usada > c.carga.limite);
  t.igual("sobrecarga soma –5 à penalidade de armadura (Acrobacia –5)", c.pericias.acrobacia.total, acro - 5);
  t.igual("e Luta continua igual", c.pericias.luta.total, luta);
  t.igual("deslocamento –3 m", c.deslocamento.terrestre, 3);
}

t.grupo("Magia com aprimoramentos e magia sustentada (p. 169–176 e 224)");
{
  const b = arcanista();
  const c = R.calcular(b);
  const f = c.magias.fontes["classe:arcanista"];
  t.ok("bruxo: Inteligência é o atributo-chave; 2º círculo no 5º nível", f.atributo === "int" && f.circuloMax === 2);
  t.igual("CD = 10 + ½ nível + Int (10 + 2 + 5: base 3 e +2 de elfo)", R.prepararMagia(b, "bolaDeFogo", {}).cd, 17);
  const p = R.prepararMagia(b, "bolaDeFogo", { aprim: { 0: 1 } });
  t.ok("Bola de Fogo +2d6: custo 3 + 2 = 5 PM, 8d6", p.ok && p.custo === 5 && /^8d6/.test(String(p.dano)));
  const lim = R.prepararMagia(b, "bolaDeFogo", { aprim: { 0: 2 } });
  t.ok("passar do limite de PM do nível (5) é recusado antes de confirmar", !lim.ok && lim.erros.some((e) => /limite|PM/i.test(e)));
  const pm0 = c.pm.atual;
  const l = R.lancarMagia(b, "bolaDeFogo", { aprim: { 0: 1 } });
  t.ok("lançar cobra o custo final", l.ok && R.calcular(b).pm.atual === pm0 - 5);
  const s1 = R.lancarMagia(b, "velocidade", {});
  t.ok("Velocidade é sustentada: vira efeito ativo", s1.ok && s1.ativo && s1.ativo.sustentada);
  const pmS = R.calcular(b).pm.atual;
  const turno = R.inicioDoTurno(b);
  t.ok("início do turno cobra 1 PM da sustentada", turno.cobradas.length === 1 && R.calcular(b).pm.atual === pmS - 1);
  const s2 = R.lancarMagia(b, "conjurarMonstro", {});
  t.ok("uma sustentada por vez: a nova encerra a anterior", s2.ok && s2.encerradas.length === 1 && b.ativos.filter((a) => a.sustentada).length === 1);
  b.recursos.pm = 0; b.recursos.pmTemp = 0;
  const sem = R.inicioDoTurno(b);
  t.ok("sem PM no início do turno, a sustentada termina", sem.encerradas.length === 1 && !b.ativos.some((a) => a.sustentada));
  const arm = R.prepararMagia(R.normalizar(Object.assign(arcanista(), { inventario: { itens: [item("cotaDeMalha", "vestido")], tibar: 0, tc: 0, to: 0 } })), "armaduraArcana", {});
  t.ok("arcana de armadura pede teste de Misticismo antes de lançar", (arm.testes || []).some((x) => x.pericia === "misticismo"));
}

t.grupo("Poderes de magia viram aprimoramento de qualquer magia (p. 131)");
{
  const b = arcanista();
  b.poderes = [{ id: "magiaAmpliada", origem: "teste", escolhas: {} }, { id: "magiaDiscreta", origem: "teste", escolhas: {} }];
  b.inventario.itens = [item("couro", "vestido")];
  const n = R.normalizar(b);
  const base = R.prepararMagia(n, "bolaDeFogo", {});
  t.ok("o lançamento oferece Magia Ampliada e Magia Discreta", base.metamagias.map((x) => x.id).sort().join() === "magiaAmpliada,magiaDiscreta");
  const amp = R.prepararMagia(n, "bolaDeFogo", { metamagias: ["magiaAmpliada"] });
  t.ok("Ampliada: +2 PM e alcance médio → longo", amp.custo === base.custo + 2 && amp.al === "longo");
  const area = R.prepararMagia(n, "bolaDeFogo", { metamagias: ["magiaAmpliada"], ampliada: "area" });
  t.ok("ou a área dobrada", /dobrada/.test(area.area));
  t.ok("de armadura, a arcana pede Misticismo; Discreta tira o teste", base.testes.some((x) => x.pericia === "misticismo") && !R.prepararMagia(n, "bolaDeFogo", { metamagias: ["magiaDiscreta"] }).testes.some((x) => x.pericia === "misticismo"));
  const lim = R.prepararMagia(n, "bolaDeFogo", { aprim: { 0: 1 }, metamagias: ["magiaAmpliada"] });
  t.ok("o custo da metamagia conta no limite de PM (3 + 2 + 2 = 7 > 5)", !lim.ok && lim.erros.some((e) => /limite/.test(e)));
}

t.grupo("Engenhoca do Inventor (p. 70–71)");
{
  const b = R.fichaVazia();
  b.atributosBase = { "for": 0, des: 1, con: 1, "int": 3, sab: 1, car: 0 };
  b.raca = { id: "humano", variante: "", atributos: ["int", "des", "con"], escolhas: {} };
  b.niveis = [{ classe: "inventor", escolhas: { pericias: ["conhecimento", "cura", "luta", "percepcao"], oficios: ["engenhoqueiro"] } }, { classe: "inventor", escolhas: { poder: { id: "engenhoqueiro" } } }];
  b.inventario.tibar = 500;
  const n = R.normalizar(b);
  let c = R.calcular(n);
  t.ok("o Ofício fixo da classe treina a especialização escolhida", c.pericias["oficio:engenhoqueiro"] && c.pericias["oficio:engenhoqueiro"].treinado && !c.oficiosPendentes.length);
  t.ok("poder Engenhoqueiro (Int 3 e Ofício treinado)", c.tem.engenhoqueiro);
  t.igual("custo: T$ 100 × PM e CD 20 + PM (Curar Ferimentos, 1 PM)", R.custoDeEngenhoca("curarFerimentos"), { pm: 1, tibar: 100, cd: 21, tempo: "uma semana" });
  t.ok("2º círculo só a partir do 6º nível", !R.fabricarEngenhoca(n, "bolaDeFogo", "empunhada", fila(20)).ok);
  const fab = R.fabricarEngenhoca(n, "curarFerimentos", "empunhada", fila(20));
  t.ok("fabricar: sucesso cobra T$ 100 e cria a engenhoca", fab.ok && fab.sucesso && n.inventario.tibar === 400 && n.engenhocas.length === 1);
  const id = n.engenhocas[0].id;
  const p0 = R.prepararEngenhoca(n, id, {});
  t.igual("ativar: CD 15 + 1", p0.cdAtivacao, 16);
  const a1 = R.ativarEngenhoca(n, id, {}, fila(18));
  t.ok("primeira ativação funciona", a1.ok && a1.sucesso && n.engenhocas[0].ativacoesHoje === 1);
  t.igual("segunda ativação no dia: +5 na CD", R.prepararEngenhoca(n, id, {}).cdAtivacao, 21);
  const pmAntes = R.calcular(n).pm.atual;
  const comAprim = R.prepararEngenhoca(n, id, { aprim: { 1: 1 } });
  t.ok("aprimoramento: paga o PM e a CD sobe 1 por PM", comAprim.custoPM >= 1 && comAprim.cdAtivacao === 21 + comAprim.custoPM);
  const a2 = R.ativarEngenhoca(n, id, {}, fila(1));
  t.ok("falhou: enguiça e não ativa até consertar", a2.ok && !a2.sucesso && n.engenhocas[0].enguicada && !R.prepararEngenhoca(n, id, {}).ok);
  t.ok("consertar (uma hora) libera", R.consertarEngenhoca(n, id) && R.prepararEngenhoca(n, id, {}).ok);
  t.igual("sem aprimoramento, a ativação não gasta PM", R.calcular(n).pm.atual, pmAntes);
  n.inventario.itens.push(item("cotaDeMalha", "vestido"));
  t.ok("a penalidade de armadura entra no teste de ativação", R.prepararEngenhoca(n, id, {}).parcelasTeste.some((x) => /armadura/i.test(x.rotulo)));
  R.descansar(n, "normal");
  t.igual("o descanso zera as ativações do dia", n.engenhocas[0].ativacoesHoje, 0);
}

t.grupo("Ataque: Defesa antes do crítico; crítico multiplica só os dados da arma (p. 231)");
{
  const c = calc(guerreiro());
  const espada = c.ataques.filter((a) => a.ref === "espadaLonga")[0];
  t.ok("espada longa: 1d8 + 4, 19/x2", espada.dano === "1d8" && espada.danoFixo === 4 && espada.margem === 19 && espada.mult === 2);
  const r = R.rolarAtaque(fila(19, 5, 7, 3), espada, 15, { extras: [{ dados: "1d6", tipo: "fogo", rotulo: "Flamejante" }] });
  t.ok("19 natural que acerta: crítico", r.acertou && r.critico);
  t.igual("dois d8 da arma (x2), fixo 4 uma vez, 1d6 extra uma vez", [r.dano.dadosArma, r.dano.fixo, r.dano.extras[0].total, r.dano.total], [[5, 7], 4, 3, 19]);
  const erro = R.rolarAtaque(fila(19), espada, 30, {});
  t.ok("19 natural que não alcança a Defesa: erro, sem crítico", !erro.acertou && !erro.critico && !erro.dano);
  const imune = R.rolarAtaque(fila(20, 6), espada, 10, { imuneCritico: true });
  t.ok("imune a crítico: dano normal", imune.acertou && !imune.critico && imune.dano.dadosArma.length === 1);
}

t.grupo("Munição: cada disparo gasta uma (p. 151)");
{
  const b = guerreiro();
  b.inventario.itens.push(item("arcoCurto", "empunhado", { mao: "duas" }), item("flechas", "mochila", { quantidade: 2 }));
  const n = R.normalizar(b);
  const arco = R.calcular(n).ataques.filter((a) => a.ref === "arcoCurto")[0];
  t.ok("o arco pede flechas; dois pacotes = 40", arco.municao === "flechas" && R.municaoRestante(n, arco) === 40);
  for (let i = 0; i < 21; i++) R.consumirMunicao(n, arco);
  const fl = n.inventario.itens.filter((x) => x.ref === "flechas")[0];
  t.ok("21 disparos: abre o segundo pacote e sobram 19", R.municaoRestante(n, arco) === 19 && fl.quantidade === 1 && fl.municao === 19);
  for (let i = 0; i < 19; i++) R.consumirMunicao(n, arco);
  t.ok("acabou: o item sai e o próximo disparo é recusado", !n.inventario.itens.some((x) => x.ref === "flechas") && !R.consumirMunicao(n, arco).ok);
  t.ok("arma sem munição não gasta nada", R.consumirMunicao(n, R.calcular(n).ataques.filter((a) => a.ref === "espadaLonga")[0]).usa === false);
}

t.grupo("Manobra, sangramento e estabilização (p. 234 e 236)");
{
  const c = calc(guerreiro());
  t.ok("bônus de manobra = ataque corpo a corpo (agarrar com desarmado)", c.manobras.derrubar.total === 6 && c.manobras.agarrar.parcelas[0].rotulo.indexOf("desarmado") >= 0);
  const v = R.resolverManobra(fila(15, 10), "derrubar", 6, 3);
  t.ok("derrubar: 21 × 13 vence por 8 — caído e empurrado 1,5 m", v.venceu && v.condicao === "caido" && v.empurraoMetros === 1.5);
  const emp = R.resolverManobra(fila(10, 10), "empurrar", 6, 3);
  t.ok("empate de resultado? Não: 16 × 13; empurra 1,5 m (+1,5 a cada 5)", emp.venceu && emp.empurraoMetros === 1.5);
  const empate = R.resolverManobra(fila(10, 12), "agarrar", 5, 3);
  t.ok("empate (15 × 15): vence o maior bônus", empate.venceu && empate.oposto.desempate === "bônus" && empate.condicao === "agarrado");
  const denovo = R.resolverManobra(fila(10, 10, 4, 9), "desarmar", 4, 4);
  t.ok("empate com bônus iguais: rola de novo", denovo.oposto.rodadas.length === 2 && !denovo.venceu);
  const e = M.normalizar({});
  const ogro = M.adicionarAmeaca(e, "ogro", 1).participantes[0];
  const mo = M.manobraDaAmeaca(e, ogro.id);
  t.ok("ameaça Grande: +2 de tamanho no bônus de manobra", mo.parcelas.some((p) => /Tamanho/.test(p.rotulo) && p.valor === 2));
  const b = guerreiro();
  const pvMax = R.calcular(b).pv.max;
  const d = R.aplicarDano(b, pvMax + 3, "corte");
  t.ok("abaixo de 0 PV: sangrando", d.estado === "sangrando" && b.recursos.sangrando);
  const s1 = R.testeDeSangramento(b, fila(5, 4));
  t.ok("falhou na Constituição CD 15: perde 1d6 PV (4)", !s1.estabilizou && s1.perda === 4 && R.calcular(b).pv.atual === -7);
  const s2 = R.testeDeSangramento(b, fila(14));
  t.ok("passou (14 + Con 3 = 17): estável", s2.estabilizou && b.recursos.estavel && !b.recursos.sangrando);
  t.igual("limite de morte: –10 ou –½ PV máx, o mais baixo", D.limiteDeMorte(23), -11);
  const morto = R.aplicarDano(b, 10, null, { perdaDeVida: true });
  t.igual("–17 passa do limite: morto", morto.estado, "morto");
  const vivo = guerreiro(); R.aplicarDano(vivo, 25, "corte"); R.curar(vivo, 5);
  t.ok("cura acima de 0 tira o sangramento", R.calcular(vivo).pv.atual > 0 && !vivo.recursos.sangrando);
}

t.grupo("Encontro com ND fracionário e ameaças independentes (p. 282)");
{
  const quatro = A.ndDoEncontro([{ nd: "1/4", quantidade: 4 }]);
  t.igual("quatro de ND 1/4: ND 1", quatro.texto, "1");
  t.igual("dois de ND 1/2: ND 1", A.ndDoEncontro([{ nd: "1/2", quantidade: 2 }]).texto, "1");
  t.igual("dois de ND 5: ND 7", A.ndDoEncontro([{ nd: "5", quantidade: 2 }]).texto, "7");
  const misto = A.ndDoEncontro([{ nd: "2", quantidade: 1 }, { nd: "1/2", quantidade: 2 }]);
  t.ok("criaturas diferentes: o RAMA avisa que é aproximação", misto.aproximado === true);
  const frac = A.AMEACAS.filter((a) => a.ndNum < 1);
  t.ok("o catálogo tem ameaças de ND fracionário (" + frac.length + ")", frac.length >= 5 && frac.every((a) => /^1\/\d$/.test(a.nd)));
  const e = M.normalizar({});
  const g = M.adicionarAmeaca(e, frac[0].id, 3);
  t.ok("três ocorrências independentes", g.participantes.length === 3 && new Set(g.participantes.map((p) => p.id)).size === 3);
  M.danoEmAmeaca(e, g.participantes[0].id, 1, "corte");
  t.ok("dano numa não muda as outras nem o catálogo", g.participantes[0].pv.atual !== M.participante(e, g.participantes[1].id).pv.atual && A.AMEACA[frac[0].id].pv === M.participante(e, g.participantes[1].id).pv.max);
  M.registrarDesafio(e, { id: "d1", nome: frac[0].nome, nd: frac[0].nd, resultado: "vencido" });
  const xp = M.previaDeXp(e, ["d1"], 4, 1);
  t.ok("XP do ND fracionário: ND × 1000 ÷ grupo", xp && JSON.stringify(xp).indexOf(String(Math.floor(A.ndNumero(frac[0].nd) * 1000 / 4))) >= 0);
  const vista = M.vistaDosJogadores(e);
  t.ok("os jogadores não veem os PV numéricos das ameaças", vista.combate.participantes.every((p) => p.tipo === "pc" || p.pv === undefined || typeof p.pv !== "object" || p.pv.atual === undefined));
}

t.grupo("Descanso, tesouro e XP sem duplicar (p. 106, 258 e 326)");
{
  const b = guerreiro();
  R.adicionarXp(b, 3000); R.subirNivel(b, "guerreiro", {}); R.subirNivel(b, "guerreiro", {});
  R.aplicarDano(b, 20, "corte"); R.gastarPM(b, 5); R.receberPvTemp(b, 5);
  const antes = R.calcular(b);
  const d = R.descansar(b, "normal");
  const depois = R.calcular(b);
  t.ok("descanso normal: recupera o nível (3) em PV e PM", d.recuperacao === 3 && depois.pv.atual === antes.pv.atual + 3 && depois.pm.atual === antes.pm.atual + 3);
  t.ok("PV temporários somem no descanso", depois.pv.temp === 0);
  const b2 = guerreiro(); R.adicionarXp(b2, 3000); R.subirNivel(b2, "guerreiro", {}); R.subirNivel(b2, "guerreiro", {}); R.aplicarDano(b2, 20, "corte");
  t.igual("descanso ruim: metade (1)", R.descansar(b2, "ruim").recuperacao, 1);
  t.igual("XP: ND 5 vencido por 4 personagens = 1250 cada", IM.xpDoDesafio("5", 4, "vencido", 5).porPersonagem || IM.xpDoDesafio("5", 4, "vencido", 5).xp, 1250);
  const r1 = R.aplicarRecompensa(b, { xp: 1250, tibar: 300 }, "op-recompensa-0001");
  const r2 = R.aplicarRecompensa(b, { xp: 1250, tibar: 300 }, "op-recompensa-0001");
  t.ok("a mesma recompensa duas vezes entra uma vez só", r1.ok && r2.repetida && b.xp === 4250 && b.inventario.tibar === 300);
  const e = M.normalizar({});
  let n = 0; const rol = (x) => { n++; return 1 + (n * 7) % Number(/1d(\d+)/.exec(x)[1]); };
  const t1 = M.rolarTesouro(e, "op-tesouro-0001", "5", "padrao", rol, "Ogro");
  const t2 = M.rolarTesouro(e, "op-tesouro-0001", "5", "padrao", rol, "Ogro");
  t.ok("tesouro pela Tabela 8-1, uma vez por pedido (repetir devolve o mesmo)", t1.ok && t2.repetido && JSON.stringify(t1.tesouro.resultado) === JSON.stringify(t2.tesouro.resultado) && e.tesouros.length === 1);
}

t.grupo("Ofício: especializações separadas (p. 121)");
{
  const b = R.fichaVazia();
  b.niveis = [{ classe: "inventor", escolhas: { pericias: ["conhecimento", "cura", "luta", "percepcao"] } }];
  let c = calc(b);
  t.ok("sem escolher a especialização, o Ofício da classe fica pendente", c.oficiosPendentes.length === 1 && c.oficiosPendentes[0].onde === "classe");
  t.ok("definir a especialização treina só ela", R.definirOficio(b, c.oficiosPendentes[0], "alquimista").ok && calc(b).pericias["oficio:alquimista"].treinado && !calc(b).pericias["oficio:armeiro"]);
  b.origem = { id: "artesao", beneficios: [{ tipo: "pericia", id: "oficio", escolhas: {} }], escolhas: {} };
  c = calc(b);
  t.ok("Ofício da origem também pede a especialização", c.oficiosPendentes.some((p) => p.onde === "origem"));
  R.definirOficio(b, { onde: "origem" }, "armeiro");
  t.ok("e treina outra, separada", calc(b).pericias["oficio:armeiro"].treinado && calc(b).pericias["oficio:alquimista"].treinado);
  b.periciasInt = ["oficio:cozinheiro"];
  t.ok("Inteligência também treina um Ofício específico", calc(b).pericias["oficio:cozinheiro"] && calc(b).pericias["oficio:cozinheiro"].treinado);
}

t.grupo("Salvar, reabrir, exportar e importar (ficha de Tormenta20)");
{
  const bloco = arcanista();
  R.aplicarDano(bloco, 7, "fogo");
  R.lancarMagia(bloco, "velocidade", {});
  const f = S.criarFicha({ nome: "Elfa bruxa", tipoFicha: "tormenta20", tormenta20: bloco });
  t.igual("criarFicha guarda o tipo tormenta20", f.tipoFicha, "tormenta20");
  const f2 = S.normalizarFicha(JSON.parse(JSON.stringify(f)));
  t.ok("gravar e reabrir: continua Tormenta20, com níveis, magias, dano e efeito ativo", f2.tipoFicha === "tormenta20" && f2.tormenta20.niveis.length === 5 && f2.tormenta20.magias.length === 4 && f2.tormenta20.ativos.some((a) => a.sustentada));
  const c1 = R.calcular(R.normalizar(bloco)), c2 = R.calcular(R.normalizar(f2.tormenta20));
  const reaberta = R.normalizar(JSON.parse(JSON.stringify(f2.tormenta20)));
  t.ok("depois de reabrir, a sustentada continua contando (uma por vez)", R.lancarMagia(reaberta, "conjurarMonstro", {}).encerradas.length === 1);
  t.ok("o cálculo depois de reabrir é o mesmo (PV, PM, Defesa)", c1.pv.atual === c2.pv.atual && c1.pm.atual === c2.pm.atual && c1.defesa.total === c2.defesa.total);
  t.ok("nada calculado é gravado (sem pv.max, defesa ou perícias no bloco)", !("defesa" in f2.tormenta20) && !("pericias" in f2.tormenta20) && f2.tormenta20.recursos.pv !== undefined);
  const imp = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", f2))));
  t.ok("exportar e importar: tipo e bloco atravessam", imp.ok && imp.dados.tipoFicha === "tormenta20" && imp.dados.tormenta20.raca.id === "elfo" && imp.dados.tormenta20.niveis[0].escolhas.caminho === "bruxo");
  const ti = imp.dados.tormenta20, to = f2.tormenta20;
  t.ok("as referências ao catálogo voltam (origem, magias, efeito ativo da magia)", ti.origem.id === "estudioso" && ti.magias.map((m) => m.id).join() === to.magias.map((m) => m.id).join() && ti.ativos.some((a) => a.magia === "velocidade"));
  t.ok("as identidades nascem de novo (efeito ativo com id novo; registro de operações vazio)", ti.ativos[0].id && ti.ativos[0].id !== to.ativos[0].id && ti.operacoes.length === 0);
  const ci = R.calcular(R.normalizar(ti));
  t.ok("o cálculo da importada é o mesmo (PV, PM, Defesa, CD)", ci.pv.atual === c2.pv.atual && ci.pm.atual === c2.pm.atual && ci.defesa.total === c2.defesa.total && ci.magias.fontes["classe:arcanista"].cd === c2.magias.fontes["classe:arcanista"].cd);
  const comItem = S.criarFicha({ nome: "Guerreiro", tipoFicha: "tormenta20", tormenta20: guerreiro() });
  const impItem = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", comItem)))).dados.tormenta20;
  t.ok("itens: o catálogo (ref) fica, o id do item é novo", impItem.inventario.itens[0].ref === "espadaLonga" && impItem.inventario.itens[0].id !== comItem.tormenta20.inventario.itens[0].id);
  t.ok("ficha universal antiga não ganha bloco de Tormenta20", !S.normalizarFicha({ schemaVersion: 33, nome: "Antiga" }).tormenta20);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
