/* =====================================================================
   R.A.M.A. — testes de Ordem Paranormal RPG II (Experimental) (v9.0)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ordem2.js

   Sem navegador e sem rede. Os dados são uma FILA de resultados
   combinados: cada teste diz o que cai, e o motor nunca sorteia
   sozinho. Dados sintéticos (as fichas prontas são as dos playtests).
   ===================================================================== */

const ARQUIVOS = ["js/ordem2/catalogo.js", "js/ordem2/regras.js", "js/ordem2/motor.js", "js/ordem2/mesa.js"];
globalThis.window = globalThis;
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}\n${e.stack}`); Deno.exit(1); }
}

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, obtido, esperado) { const ok = Object.is(obtido, esperado); t.ok(nome, ok, ok ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); },
  iguais(nome, obtido, esperado) { const a = JSON.stringify(obtido), b = JSON.stringify(esperado); t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`); },
};

const K = globalThis.RAMAOrdem2Catalogo, R = globalThis.RAMAOrdem2, MO = globalThis.RAMAOrdem2Motor, ME = globalThis.RAMAOrdem2Mesa;

function fila(...faces) {
  const q = faces.flat();
  const f = () => { if (!q.length) throw new Error("fila de dados vazia"); return q.shift(); };
  f.resta = () => q.length;
  return f;
}
const nada = () => { throw new Error("rolou sem esperar"); };
/* Uma montagem crua (dados com faces dadas), para testar a resolução. */
function montagem(faces, extra) {
  return Object.assign({ rotulo: "Teste", dados: faces.map((f, i) => ({ faces: f, fonte: "d" + i, tipo: i === 0 ? "atributo" : i === 1 ? "pericia" : "bonus" })), pavor: 0, dt: 7, modificador: 0, criticoMin: 6, custos: { pd: 0 }, beta: true }, extra || {});
}
const MESTRE = { mestre: true, pode: [] };
const jog = (...ids) => ({ mestre: false, pode: ids });
function mesa(perfil, presets) {
  const e = ME.estadoVazio(perfil || "beta-vigilia");
  const fichas = {};
  (presets || []).forEach((id) => { fichas[id] = { nome: K.preset(id).nome, bloco: R.dePreset(id) }; });
  return { e, fichas };
}
function ap(m, op, papel, rolar) { return ME.aplicar(m.e, m.fichas, op, papel || MESTRE, rolar || nada); }

/* =================================================================== */
t.grupo("Catálogo · perícias, perfis de regras e fontes");
{
  t.igual("20 perícias no Alpha (p. 17)", K.PERICIAS_ALPHA.length, 20);
  t.igual("20 perícias no Beta (p. 9)", K.PERICIAS_BETA.length, 20);
  const ch = K.listaDePericias().map((p) => p.chave);
  t.ok("v9.4: UMA lista (22): a do Alpha + Animais e Ofício do Beta", ch.length === 22 && ["maquinas", "tecnologia", "animais", "metalurgia", "pesquisar"].every((c) => ch.indexOf(c) >= 0) && ch.indexOf("inspecionar") < 0);
  t.ok("o argumento antigo (perfil) não muda a lista", JSON.stringify(K.listaDePericias("beta-vigilia")) === JSON.stringify(K.listaDePericias("alpha-contemporaneo")));
  t.iguais("aliases de entrada: Bruxaria → Ocultismo, Inspecionar → Pesquisar, Ofício → metalurgia", [K.pericia(null, "bruxaria").chave, K.pericia(null, "inspecionar").chave, K.pericia(null, "oficio").chave], ["ocultismo", "pesquisar", "metalurgia"]);
  t.iguais("  nomes contemporâneos em qualquer ambientação", [K.nomeDaPericia("beta-vigilia", "ocultismo", "vigilia"), K.nomeDaPericia(null, "metalurgia"), K.nomeDaPericia(null, "inspecionar")], ["Ocultismo", "Ofício", "Pesquisar"]);
  t.igual("Compartilhar usa Pesquisar (um comportamento só)", K.periciaDePesquisa("beta-vigilia"), "pesquisar");
  t.ok("cada divergência tem fonte, escolha e teste", K.DIVERGENCIAS.every((d) => d.fontes && d.escolha && d.teste));
  t.ok("o bloco paranormal é consultável e NÃO conjura (etapa 3)", K.PARANORMAL.disponivel === false && /d20/.test(K.PARANORMAL.texto));
}

t.grupo("Fichas prontas · conferidas com os playtests");
{
  t.igual("14 presets (Alan, 5 do Ato II, 8 do Beta)", K.PRESETS.length, 14);
  t.iguais("os do Beta são nível 3", K.PRESETS.filter((p) => p.perfilRegras === "beta-vigilia").map((p) => p.nivel), [3, 3, 3, 3, 3, 3, 3, 3]);
  t.iguais("os do Ato II são nível 6 e Alan nível 2", K.PRESETS.filter((p) => p.perfilRegras === "alpha-contemporaneo").map((p) => p.id + ":" + p.nivel), ["alan:2", "amanda:6", "antonio:6", "heitor:6", "raven:6", "val:6"]);
  const rh = R.dePreset("rhiona");
  t.iguais("Rhiona 22/12, Físico d10", [rh.recursos.pv.max, rh.recursos.pd.max, rh.base.atributos.fisico], [22, 12, 10]);
  const martelo = rh.itens.find((i) => i.nome === "Martelo de forja");
  t.iguais("  Martelo de forja: corpo a corpo, dano RA+3", [martelo.alcance, martelo.dano], ["corpo", 3]);
  t.iguais("  Ofício (Metalurgia) d8 preservado com a especialização", (() => { const p = rh.base.pericias.find((x) => x.chave === "metalurgia"); return [p.dado, p.especializacao, p.rotuloImpresso]; })(), [8, "Metalurgia", "Ofício (Metalurgia)"]);
  const val = R.dePreset("val");
  t.iguais("Val 18/32 com a Prontidão unificada (2 PD, rolar de novo); a original fica na procedência", [val.recursos.pv.max, val.recursos.pd.max, val.habilidades[0].ref, R.motorDe(val.habilidades[0]).pd, val.procedencia.habilidadesOriginais[0].ref], [18, 32, "prontidao", 2, "prontidao_alpha"]);
  t.iguais("Alan: Executor Cientista, PV 10 / PD 16, Ímpeto unificado (5 espaços)", (() => { const a = R.dePreset("alan"); return [a.perfil, a.ocupacao.nome, a.recursos.pv.max, a.recursos.pd.max, R.motorDe(R.habilidadesDoTipo(a, "impeto")[0]).espacos]; })(), ["executor", "Cientista", 10, 16, 5]);
  t.iguais("Heitor (Executor do Ato II): o Ímpeto unificado — +d4 por 1, passo ou ação extra por 3", (() => { const h = R.dePreset("heitor"); return R.motorDe(R.habilidadesDoTipo(h, "impeto")[0]).opcoes.map((o) => o.custo + ":" + (o.faces || o.efeito)); })(), ["1:4", "3:passoAtributo", "3:acaoExtra"]);
  t.iguais("Muirenn (Executor Beta): Ímpeto de 5 que esvazia no fim da cena", (() => { const m = R.motorDe(R.habilidadesDoTipo(R.dePreset("muirenn"), "impeto")[0]); return [m.espacos, m.zeraFimCena]; })(), [5, true]);
  t.iguais("Foco Mental de Alan 2 PD/+d4 e de Amanda 4 PD/+d8", [R.motorDe(R.dePreset("alan").habilidades[0]).pd, R.motorDe(R.dePreset("amanda").habilidades[1]).faces], [2, 8]);
  t.ok("PV/PD dos presets são os impressos (Sorcha 22, Guardiã já anotada)", R.dePreset("sorcha").recursos.pv.max === 22);
  const c1 = R.dePreset("rhiona"), c2 = R.dePreset("rhiona");
  t.ok("cada cópia ganha ids próprios", c1.habilidades[0].id !== c2.habilidades[0].id && c1.itens[0].id !== c2.itens[0].id && c1.base.pericias[0].id !== c2.base.pericias[0].id);
  t.iguais("procedência: preset, fonte, versão dos dados", [c1.procedencia.preset, c1.procedencia.fonte, c1.procedencia.versaoDados, c1.modoCriacao], ["rhiona", "beta", K.VERSAO_DADOS, "pronta"]);
  const sira = R.dePreset("sira");
  t.iguais("atributo impresso divergente não muda o atributo-base (Sira: Luta/Mente impresso → Físico)", [R.atributoBase(sira, "luta"), sira.base.pericias.find((p) => p.chave === "luta").atributoImpresso], ["fisico", "mente"]);
  t.ok("presets conferidos: Alan é Cientista (a ficha vale sobre a missão)", K.preset("alan").ocupacao === "Cientista");
  t.iguais("rótulo livre não vira grau (Rhiona → Rowan: Confiança, grau 0)", [rh.relacoes[0].rotulo, rh.relacoes[0].grau], ["Confiança", 0]);
  t.iguais("  Cormac: Vínculo = grau 2, Afinidade = grau 1", R.dePreset("cormac").relacoes.filter((r) => r.grau).map((r) => r.nome + ":" + r.grau), ["Cavan:2", "Malik:1"]);
  t.ok("um preset desatualizado só avisa", (() => { const b = R.dePreset("rowan"); b.procedencia.versaoDados = K.VERSAO_DADOS + 1; const antes = JSON.stringify(b.base); const n = R.normalizar(b); return R.presetDesatualizado(n) && JSON.stringify(n.base) === antes; })());
}

t.grupo("Criação guiada (experimental) e livre");
{
  const base = { perfilRegras: "beta-vigilia", perfil: "executor", ocupacaoNome: "Ferreira", ocupacaoId: "ferreira", atributos: { fisico: 8, mente: 8, emocao: 6 }, pericias: [{ chave: "luta", dado: 8 }, { chave: "vigor", dado: 8 }, { chave: "atletismo", dado: 8 }, { chave: "medicina", dado: 6 }, { chave: "furtividade", dado: 4 }] };
  t.ok("d6 nos três e 2 passos livres; 8 passos de perícia, teto d8", R.conferirGuiada(base).ok, R.conferirGuiada(base).erros.join("; "));
  t.ok("3 passos de atributo é demais", !R.conferirGuiada(Object.assign({}, base, { atributos: { fisico: 10, mente: 8, emocao: 6 } })).ok);
  t.ok("d10 é o teto do atributo na guiada (d12 recusado)", !R.conferirGuiada(Object.assign({}, base, { atributos: { fisico: 12, mente: 6, emocao: 6 } })).ok);
  t.ok("d20 recusado na guiada", R.conferirGuiada(Object.assign({}, base, { atributos: { fisico: 20, mente: 6, emocao: 6 } })).erros.some((e) => /d20/.test(e)));
  t.ok("perícia d10 recusada (teto d8)", !R.conferirGuiada(Object.assign({}, base, { pericias: [{ chave: "luta", dado: 10 }] })).ok);
  t.ok("mais de 8 passos de perícia recusado", !R.conferirGuiada(Object.assign({}, base, { pericias: [{ chave: "luta", dado: 8 }, { chave: "vigor", dado: 8 }, { chave: "atletismo", dado: 8 }, { chave: "medicina", dado: 8 }, { chave: "crime", dado: 6 }] })).ok);
  const g = R.deGuiada(Object.assign({}, base, { habilidadeOcupacao: "segredo_do_aco" }));
  t.iguais("nível 1, 16 PV e 12 PD de referência", [g.bloco.nivel, g.bloco.recursos.pv.max, g.bloco.recursos.pd.max, g.bloco.modoCriacao], [1, 16, 12, "guiada"]);
  t.iguais("  habilidade de perfil (Ímpeto unificado) + a de ocupação escolhida", g.bloco.habilidades.map((h) => h.ref), ["impeto", "segredo_do_aco"]);
  const g2 = R.deGuiada(Object.assign({}, base, { pv: 20, pd: 10 }));
  t.iguais("  PV/PD editáveis, marcados como editados", [g2.bloco.recursos.pv.max, g2.bloco.escolhas.pvPdReferencia.editados], [20, true]);
  const g3 = R.deGuiada(Object.assign({}, base, { ambientacao: "contemporaneo", perfil: "executor", ocupacaoNome: "Bartender", ocupacaoId: "" }));
  t.iguais("contemporâneo: o mesmo Ímpeto (a ambientação não muda a regra); ocupação personalizada sem habilidade", [g3.bloco.habilidades.map((h) => h.ref).join(","), g3.bloco.ocupacao.personalizada, g3.bloco.ambientacao], ["impeto", true, "contemporaneo"]);
  const livre = R.normalizar({ perfilRegras: "alpha-contemporaneo", nivel: 10, base: { atributos: { fisico: 12, mente: 20, emocao: 4 } }, recursos: { pv: { max: 40 }, pd: { max: 50 } } });
  t.iguais("livre aceita direto (nível 10, d20 por efeito anotado)", [livre.nivel, livre.base.atributos.mente, livre.recursos.pv.atual], [10, 20, 40]);
}

t.grupo("Testes · soma, RA/RB, crítico, falha crítica (Alpha pp. 18–20; Beta pp. 10–12)");
{
  const r1 = MO.resolver(montagem([6, 8], { dt: 30 }), { faces: [6, 6], pavor: 0 }, {});
  t.iguais("6/6 é crítico mesmo com DT 30", [r1.critico, r1.sucesso, r1.total], [true, true, 12]);
  const r2 = MO.resolver(montagem([6, 8], { dt: 2 }), { faces: [1, 1], pavor: 0 }, {});
  t.iguais("1/1 é falha crítica mesmo com DT 2", [r2.falhaCritica, r2.sucesso], [true, false]);
  const r3 = MO.resolver(montagem([6, 8]), { faces: [6, 3], pavor: 0 }, {});
  t.iguais("RA/RB pelo resultado, não pelo dado: d6=6, d8=3 → RA 6, RB 3", [r3.ra, r3.rb, r3.total], [6, 3, 9]);
  const r4 = MO.resolver(montagem([6, 6]), { faces: [5, 5], pavor: 0 }, {});
  t.igual("5/5 não é crítico (precisa ≥ 6)", r4.critico, false);
  const r5 = MO.resolver(montagem([6, 8, 4, 10]), { faces: [2, 7, 4, 9], pavor: 0 }, {});
  t.iguais("quatro dados: soma sugerida dos três maiores (decisão de implementação)", [r5.soma, r5.dados.map((d) => d.somado)], [20, [false, true, true, true]]);
  const r6 = MO.resolver(montagem([6, 8, 4, 10]), { faces: [2, 7, 4, 9], pavor: 0 }, { soma: [0, 1, 2] });
  t.iguais("  com seleção explícita de três", [r6.soma, r6.somaEscolhida], [13, true]);
  const r7 = MO.resolver(montagem([6, 8, 6]), { faces: [6, 2, 6], pavor: 0 }, {});
  t.iguais("três dados: crítico com dois 6 e soma dos três", [r7.critico, r7.soma], [true, 14]);
  const b = R.dePreset("rhiona");
  const extra = MO.montar(b, { pericia: "luta", bonus: [{ faces: 6 }, { faces: 6 }, { faces: 6 }] });
  t.ok("no máximo quatro dados por teste", !extra.ok && /quatro/.test(extra.motivo));
  const m8 = MO.montar(b, { pericia: "luta", atributo: "mente", rotulo: "Luta com Mente" });
  t.iguais("o Mestre troca o atributo do teste (d6 de Mente + d10 de Luta)", [m8.montagem.dados.map((d) => d.faces), m8.montagem.atributoTrocado], [[6, 10], true]);
  t.igual("DT padrão 7", m8.montagem.dt, 7);
  const passo = MO.montar(b, { pericia: "luta", passos: [{ alvo: "pericia", n: 2 }] });
  t.igual("passo além de d12 para em d12 (sem d20 autorizado)", passo.montagem.dados[1].faces, 12);
  const passo20 = MO.montar(b, { pericia: "luta", passos: [{ alvo: "pericia", n: 2 }] }, { permitir20: true });
  t.igual("  d20 só quando o efeito autoriza", passo20.montagem.dados[1].faces, 20);
  const c5 = R.dePreset("cormac"), esp = c5.itens.find((i) => i.efeitos.indexOf("critico5") >= 0);
  const m9 = MO.montar(c5, { pericia: "luta", tipo: "ataque", alcance: "corpo", arma: esp.id });
  t.iguais("espada de Cormac: crítico com dois 5", [m9.montagem.criticoMin, MO.resolver(m9.montagem, { faces: [5, 5], pavor: 0 }, {}).critico], [5, true]);
  t.igual("crítico Beta em ataque soma as duas maiores", MO.pontuacao(MO.resolver(montagem([8, 8, 6]), { faces: [6, 6, 4], pavor: 0 }, {}), true), 12);
}

t.grupo("Pavor (Beta p. 24) e decisões provisórias");
{
  const p1 = MO.resolver(montagem([8, 6], { pavor: 6 }), { faces: [7, 2], pavor: 4 }, {});
  t.iguais("[7,2] vs pavor 4: o 2 é anulado, resultado 7", [p1.total, p1.dados.map((d) => d.anulado)], [7, [false, true]]);
  const p2 = MO.resolver(montagem([6, 6], { pavor: 6 }), { faces: [3, 1], pavor: 5 }, {});
  t.iguais("[3,1] vs pavor 5: tudo anulado → falha crítica, valor 0", [p2.total, p2.falhaCritica, p2.semSobreviventes], [0, true, true]);
  const p3 = MO.resolver(montagem([6, 6], { pavor: 6 }), { faces: [4, 3], pavor: 4 }, {});
  t.iguais("empate com o pavor permanece", [p3.total, p3.dados[0].anulado], [4, false]);
  const p4 = MO.resolver(montagem([6, 6], { pavor: 6 }), { faces: [6, 6], pavor: 6 }, {});
  t.igual("crítico lê os sobreviventes (6/6 com pavor 6 continua crítico)", p4.critico, true);
  const p5 = MO.resolver(montagem([6, 8], { pavor: 6 }), { faces: [6, 6], pavor: 1 }, {});
  t.ok("pavor 1: o efeito termina", p5.pavor.terminou);
  const b = R.dePreset("cavan"); b.estado.pavor = 6;
  const mc = MO.montar(b, { pericia: "medicina", usar: { pavor: { controlar: 3 } } });
  t.iguais("controlar 3 passos de d6 pára em d4 (piso) e custa 3 PD", [mc.montagem.pavor, mc.montagem.custos.pd], [4, 3]);
  const ma = MO.montar(b, { pericia: "medicina", usar: { pavor: { abracar: true } } });
  t.iguais("abraçar: o pavor vira dado bônus SÓ neste teste (5 PD)", [ma.montagem.pavor, ma.montagem.dados.length, ma.montagem.custos.pd, b.estado.pavor], [0, 3, 5, 6]);
  const res = MO.resolver(ma.montagem, { faces: [3, 3, 3], pavor: 0 }, {});
  MO.aposTeste(b, ma.montagem, res);
  t.igual("  e o pavor continua para os próximos testes", b.estado.pavor, 6);
  MO.darPavor(b);
  t.igual("receber pavor de novo aumenta um passo", b.estado.pavor, 8);
}

t.grupo("Habilidades · Análise, Ímpeto, Prontidão, Avaliação");
{
  const m = mesa("beta-vigilia", ["rhiona", "sira", "muirenn"]);
  const rh = m.fichas.rhiona.bloco, an = R.habilidadesDoTipo(rh, "analise")[0];
  ap(m, { tipo: "usarHabilidade", quem: "rhiona", habilidade: an.id }, jog("rhiona"));
  ap(m, { tipo: "usarHabilidade", quem: "rhiona", habilidade: an.id }, jog("rhiona"));
  ap(m, { tipo: "usarHabilidade", quem: "rhiona", habilidade: an.id }, jog("rhiona"));
  t.igual("Análise: +2 por ação, máximo 4", an.estado.marcadores, 4);
  const r = ap(m, { tipo: "teste", quem: "rhiona", pedido: { pericia: "luta", dt: 13 } }, jog("rhiona"), fila(9, 3));
  t.ok("com marcadores, o teste espera a escolha pós-rolagem", r.ok && r.resultado.aguardando && r.resultado.opcoes.analise === 4, JSON.stringify(r));
  const tid = r.resultado.teste;
  const r2 = ap(m, { tipo: "resolverTeste", testeId: tid, ajustes: [{ indice: 1, delta: 1 }, { indice: 1, delta: 1 }] }, jog("rhiona"));
  const tt = m.e.testes.find((x) => x.id === tid);
  t.iguais("+1 +1 no d10 (9 e 3 → 9 e 5) = 14", [tt.resultado.dados.map((d) => d.valor), tt.resultado.total], [[9, 5], 14]);
  const r3 = ap(m, { tipo: "resolverTeste", testeId: tid, ajustes: [{ indice: 0, delta: 1 }, { indice: 0, delta: 1 }, { indice: 0, delta: 1 }] }, jog("rhiona"));
  t.ok("não passa do máximo de marcadores", !r3.ok && /insuficientes/.test(r3.motivo));
  ap(m, { tipo: "resolverTeste", testeId: tid, ajustes: [{ indice: 0, delta: 1 }], confirmar: true }, jog("rhiona"));
  t.iguais("+1 no d10 já em 10 continua 10 (dentro das faces); marcadores gastos", [m.e.testes.find((x) => x.id === tid).resultado.dados[0].valor, an.estado.marcadores], [10, 1]);
  const mu = m.fichas.muirenn.bloco, imp = R.habilidadesDoTipo(mu, "impeto")[0];
  ap(m, { tipo: "teste", quem: "muirenn", pedido: { pericia: "luta", dt: 20 } }, jog("muirenn"), fila(2, 2));
  t.igual("Ímpeto Beta: falha preenche 1 espaço", imp.estado.espacos, 1);
  const semEspaco = ap(m, { tipo: "teste", quem: "muirenn", pedido: { pericia: "luta", usar: { impeto: 1 } } }, jog("muirenn"), nada);
  t.ok("  opção de 3 espaços para dado não existe / sem espaços recusa", !semEspaco.ok);
  ap(m, { tipo: "teste", quem: "muirenn", pedido: { pericia: "luta", dt: 20, usar: { impeto: 0 } } }, jog("muirenn"), fila(3, 3, 2));
  t.iguais("  +d4 por 1 espaço (3 dados rolados); falhou de novo → volta a 1", [m.e.testes[m.e.testes.length - 1].montagem.dados.length, imp.estado.espacos], [3, 1]);
  imp.estado.espacos = 5;
  ap(m, { tipo: "teste", quem: "muirenn", pedido: { pericia: "luta", dt: 20 } }, jog("muirenn"), fila(2, 2));
  t.igual("  não passa de 5 espaços", imp.estado.espacos, 5);
  const ue = ap(m, { tipo: "usarHabilidade", quem: "muirenn", habilidade: imp.id, opcao: 1, atributo: "fisico" }, jog("muirenn"));
  t.ok("  3 espaços: +1 passo de atributo até o fim da cena", ue.ok && R.dadoDoAtributo(mu, "fisico") === 10 && imp.estado.espacos === 2);
  ap(m, { tipo: "novaCena" });
  t.iguais("fim de cena: ímpeto Beta esvazia, Análise perde marcadores, passo termina", [imp.estado.espacos, an.estado.marcadores, R.dadoDoAtributo(mu, "fisico")], [0, 0, 8]);
  /* Prontidão (Beta): 2 PD, um dado que não deu 1, uma vez por rodada. */
  const si = m.fichas.sira.bloco;
  const rp = ap(m, { tipo: "teste", quem: "sira", pedido: { pericia: "furtividade", dt: 12 } }, jog("sira"), fila(1, 4));
  t.ok("Prontidão própria abre a escolha", rp.resultado.aguardando && rp.resultado.opcoes.prontidao.some((x) => x.por === "sira"));
  const um = ap(m, { tipo: "resolverTeste", testeId: rp.resultado.teste, rerrolar: { indice: 0, fonte: "prontidao", por: "sira" } }, jog("sira"));
  t.ok("  não rola de novo um dado que deu 1", !um.ok && /deu 1/.test(um.motivo));
  const pdAntes = si.recursos.pd.atual;
  ap(m, { tipo: "resolverTeste", testeId: rp.resultado.teste, rerrolar: { indice: 1, fonte: "prontidao", por: "sira" } }, jog("sira"), fila(10));
  const de2 = ap(m, { tipo: "resolverTeste", testeId: rp.resultado.teste, rerrolar: { indice: 1, fonte: "prontidao", por: "sira" } }, jog("sira"), fila(10));
  t.iguais("  2 PD, 4 vira 10, e só uma vez", [pdAntes - si.recursos.pd.atual, m.e.testes.find((x) => x.id === rp.resultado.teste).resultado.dados[1].valor, de2.ok], [2, 10, false]);
  /* Avaliação (v9.4: o efeito da Análise) em Amanda, do Ato II. */
  const ma = mesa("alpha-contemporaneo", ["amanda"]);
  const av = () => R.habilidadesDoTipo(ma.fichas.amanda.bloco, "analise")[0];
  t.iguais("Amanda: Avaliação com o efeito unificado (marcadores, sem custo de PD)", [av().ref, av().nome, R.motorDe(av()).maximo], ["avaliacao", "Avaliação", 4]);
  const pdAm = ma.fichas.amanda.bloco.recursos.pd.atual;
  ap(ma, { tipo: "usarHabilidade", quem: "amanda", habilidade: av().id }, jog("amanda"));
  ap(ma, { tipo: "usarHabilidade", quem: "amanda", habilidade: av().id }, jog("amanda"));
  const cheia = ap(ma, { tipo: "usarHabilidade", quem: "amanda", habilidade: av().id }, jog("amanda"));
  t.iguais("  ação → 2 marcadores; não passa de 4; sem PD", [av().estado.marcadores, pdAm - ma.fichas.amanda.bloco.recursos.pd.atual, cheia.ok], [4, 0, true]);
  ap(ma, { tipo: "novaCena" });
  t.igual("  os marcadores somem no fim da cena", av().estado.marcadores, 0);
}

t.grupo("Ajuda e Mentoria; relações (Beta pp. 24–25)");
{
  const m = mesa("beta-vigilia", ["cavan", "rhiona", "cormac", "rowan"]);
  const d4 = ap(m, { tipo: "ajudar", quem: "cavan", alvo: "rhiona", pericia: "crime" }, jog("cavan"));
  t.ok("ajuda com d4 é recusada", !d4.ok && /d4/.test(d4.motivo));
  const aj = ap(m, { tipo: "ajudar", quem: "cavan", alvo: "rhiona", pericia: "atletismo" }, jog("cavan"), fila(6, 8));
  t.ok("ajuda com d10: +2 passos; Mentoria rola contra DT 7", aj.ok && m.e.ajudas[0].passos === 2 && m.e.ajudas[0].mentoria === 8, JSON.stringify(m.e.ajudas[0]));
  const ta = ap(m, { tipo: "teste", quem: "rhiona", pedido: { pericia: "persuasao", dt: 10 } }, jog("rhiona"), fila(2, 3));
  const tt = m.e.testes.find((x) => x.id === ta.resultado.teste);
  t.iguais("  o teste ajudado: Persuasão d6 +2 passos = d10; Mentoria disponível", [tt.montagem.dados[1].faces, ta.resultado.opcoes.mentoria.valor], [10, 8]);
  ap(m, { tipo: "resolverTeste", testeId: tt.id, mentoria: { indice: 0 }, confirmar: true }, jog("rhiona"));
  t.iguais("  troca o 2 pela RA 8 do mentor", [tt.resultado.dados[0].valor, tt.resultado.total], [6, 9]);
  const co = m.fichas.cormac.bloco, vinc = co.relacoes.find((r) => r.grau === 2);
  vinc.alvoPersonagemId = "cavan";
  m.fichas.cavan.bloco.recursos.pd.atual = 3;
  const mot = ap(m, { tipo: "invocarRelacao", quem: "cormac", relacao: vinc.id, beneficio: "motivar" }, jog("cormac"), fila(3, 4));
  t.iguais("Vínculo: motivar a pessoa → 2d4 PD (ficha ligada)", [mot.ok, m.fichas.cavan.bloco.recursos.pd.atual], [true, 10]);
  const de2 = ap(m, { tipo: "invocarRelacao", quem: "cormac", relacao: vinc.id, beneficio: "teste" }, jog("cormac"));
  t.ok("  uma invocação por relação por missão", !de2.ok && /missão/.test(de2.motivo));
  ap(m, { tipo: "novaMissao", nome: "A caverna" });
  const de3 = ap(m, { tipo: "invocarRelacao", quem: "cormac", relacao: vinc.id, beneficio: "teste" }, jog("cormac"));
  t.ok("  resgate de uso: nova missão renova", de3.ok && co.estado.reservas.some((r) => r.faces === 8));
  const semGrau = ap(m, { tipo: "invocarRelacao", quem: "rhiona", relacao: m.fichas.rhiona.bloco.relacoes[0].id, beneficio: "teste" }, jog("rhiona"));
  t.ok("relação sem grau não é invocada (pede a escolha do grau)", !semGrau.ok && /grau/.test(semGrau.motivo));
  const af = co.relacoes.find((r) => r.grau === 1);
  const mot2 = ap(m, { tipo: "invocarRelacao", quem: "cormac", relacao: af.id, beneficio: "motivar" }, jog("cormac"));
  t.ok("Afinidade não motiva (só Vínculo e Devoção)", !mot2.ok);
  const outro = ap(m, { tipo: "teste", quem: "rhiona", pedido: { pericia: "luta" } }, jog("cormac"));
  t.ok("ninguém age pelo personagem de outra pessoa", !outro.ok);
}

t.grupo("Dano, armadura, lesão e trauma (Beta pp. 21–24)");
{
  const sorcha = R.dePreset("sorcha");
  t.igual("Elmo aberto: 1 ponto de armadura", R.armaduraMax(sorcha), 1);
  const rh = R.dePreset("rhiona");
  rh.itens.push(R.normalizarItem({ nome: "Gibão", armadura: 1, vestido: true }));
  t.igual("Segredo do Aço: +1 ponto com item de armadura vestido", R.armaduraMax(rh), 2);
  MO.aplicarDano(rh, { valor: 14, tipo: "fisico", armadura: true });
  t.iguais("armadura: −10 nessa ocorrência (14 → 4); 1 ponto gasto, sem recuperar", [rh.recursos.pv.atual, R.armaduraAtual(rh)], [18, 1]);
  MO.aplicarDano(rh, { valor: 3, tipo: "fisico", armadura: true });
  t.igual("  dano menor que 10 reduz só até 0", rh.recursos.pv.atual, 18);
  MO.aplicarDano(rh, { valor: 30, tipo: "fisico", armadura: false });
  t.iguais("zero de PV: teste de lesão pendente (DT 7)", [rh.recursos.pv.atual, rh.estado.pendentes[0].tipo, rh.estado.pendentes[0].dt], [0, "lesao", 7]);
  const pend = rh.estado.pendentes[0].id;
  const sucesso = MO.resolver(montagem([10, 8], { dt: 7 }), { faces: [5, 4], pavor: 0 }, {});
  MO.resolverPendente(rh, pend, sucesso, nada, 1);
  t.iguais("  sucesso: inconsciente e moribundo", [rh.estado.inconsciente, rh.estado.moribundo], [true, true]);
  MO.fimDeRodada(rh, 1);
  t.igual("  não testa no fim da rodada em que ficou moribundo", rh.estado.pendentes.length, 0);
  MO.fimDeRodada(rh, 2);
  t.iguais("  testa no fim da rodada seguinte, DT 10 (o rótulo \"teste de morte\" é o de lesão)", [rh.estado.pendentes.length, rh.estado.pendentes[0].dt], [1, 10]);
  const falha = MO.resolver(montagem([10, 8], { dt: 10 }), { faces: [2, 3], pavor: 0 }, {});
  MO.resolverPendente(rh, rh.estado.pendentes[0].id, falha, fila(10), 2);
  t.iguais("  falha: d20 na tabela → 10 Laceração Profunda (máx. PV −2) e sai de moribundo", [rh.estado.lesoes.map((l) => l.ref), R.pvMax(rh), rh.estado.moribundo], [["laceracao"], 20, false]);
  MO.aplicarDano(rh, { valor: 1, tipo: "fisico" });
  MO.resolverPendente(rh, rh.estado.pendentes[0].id, MO.resolver(montagem([10, 8], { dt: 13 }), { faces: [2, 3], pavor: 0 }, {}), fila(10), 3);
  t.igual("duplicata de Laceração acumula", rh.estado.lesoes.filter((l) => l.ref === "laceracao").length, 2);
  MO.aplicarDano(rh, { valor: 1, tipo: "fisico" });
  MO.resolverPendente(rh, rh.estado.pendentes[0].id, MO.resolver(montagem([10, 8], { dt: 16 }), { faces: [2, 3], pavor: 0 }, {}), fila(11, 11, 14), 3);
  MO.aplicarDano(rh, { valor: 1, tipo: "fisico" });
  MO.resolverPendente(rh, rh.estado.pendentes[0].id, MO.resolver(montagem([10, 8], { dt: 19 }), { faces: [2, 3], pavor: 0 }, {}), fila(11, 15), 3);
  t.iguais("outra duplicata rola de novo (Sem Olho repetido → Músculo)", rh.estado.lesoes.map((l) => l.ref), ["laceracao", "laceracao", "semOlho", "musculo"]);
  t.iguais("  modificador numérico: −1 em Percepção (Sem Olho)", R.modificadorNumerico(rh, "percepcao", "mente").valor, -1);
  MO.fimDeCena(rh);
  t.iguais("fim da cena com 0 PV: recupera 1 PV; contadores de cena zeram", [rh.recursos.pv.atual, rh.estado.testesLesao], [1, 0]);
  /* Lesão: falha crítica e crítico. */
  const r2 = R.dePreset("rowan");
  MO.aplicarDano(r2, { valor: 99, tipo: "fisico" });
  MO.resolverPendente(r2, r2.estado.pendentes[0].id, MO.resolver(montagem([8, 6]), { faces: [1, 1], pavor: 0 }, {}), nada, 1);
  t.igual("falha crítica no teste de lesão: morre (fica no histórico)", r2.estado.morto && r2.historico.some((h) => h.tipo === "morte"), true);
  /* Não letal. */
  const nl = R.dePreset("malik");
  MO.aplicarDano(nl, { valor: 10, tipo: "fisico", naoLetal: true });
  MO.aplicarDano(nl, { valor: 10, tipo: "fisico" });
  const pn = nl.estado.pendentes[0];
  t.iguais("não letal anotado à parte; zero pela soma → +d6 no teste e 2d20", [nl.recursos.naoLetal, pn.naoLetal, MO.pedidoDoPendente(nl, pn).bonus[0].faces], [10, true, 6]);
  MO.resolverPendente(nl, pn.id, MO.resolver(montagem([6, 4, 6]), { faces: [2, 1, 3], pavor: 0 }, {}), fila(3, 19), 1);
  t.ok("  2d20 escolhendo o melhor (3 e 19 → Contusão)", nl.efeitos.some((e) => e.fonte === "Contusão"));
  /* Morte lenta. */
  const ml = R.dePreset("sira");
  MO.aplicarDano(ml, { valor: 99, tipo: "fisico" });
  MO.resolverPendente(ml, ml.estado.pendentes[0].id, MO.resolver(montagem([8, 6], { dt: 7 }), { faces: [2, 1], pavor: 0 }, {}), fila(6), 4);
  t.iguais("Morte lenta: 1 PV, acorda, age", [ml.recursos.pv.atual, ml.estado.morteLenta, ml.estado.morto], [1, true, false]);
  MO.fimDeRodada(ml, 4);
  t.igual("  na rodada em que veio não morre", ml.estado.morto, false);
  MO.fimDeRodada(ml, 5);
  t.igual("  morre ao fim da rodada seguinte", ml.estado.morto, true);
  /* Patamar. */
  const pt = R.dePreset("cavan");
  t.igual("patamar não informado: +0 no d20", MO.rolarNaTabela(K.LESOES, pt, false, fila(9)).valor, 9);
  pt.patamar = "elite";
  t.igual("patamar informado (elite): +2", MO.rolarNaTabela(K.LESOES, pt, false, fila(9)).valor, 11);
  /* Trauma. */
  const tr = R.dePreset("cavan");
  MO.aplicarDano(tr, { valor: 99, tipo: "emocional" });
  t.iguais("zero de PD por efeito externo: teste de trauma (DT 7)", [tr.recursos.pd.atual, tr.estado.pendentes[0].tipo], [0, "trauma"]);
  const tr2 = R.dePreset("cavan");
  MO.pagarCustos(tr2, { pd: 15 });
  t.iguais("gasto voluntário até 0 PD não dispara trauma", [tr2.recursos.pd.atual, tr2.estado.pendentes.length], [0, 0]);
  MO.resolverPendente(tr, tr.estado.pendentes[0].id, MO.resolver(montagem([6, 8], { dt: 7 }), { faces: [2, 3], pavor: 0 }, {}), fila(5), 1);
  MO.aplicarDano(tr, { valor: 2, tipo: "emocional" });
  t.ok("TEPT: +1 no dano emocional", tr.historico.some((h) => /Estresse/.test(h.texto)) && tr.estado.pendentes.length === 1);
  const rv = R.dePreset("raven");
  rv.perfilRegras = "beta-vigilia";
  MO.aplicarDano(rv, { valor: 99, tipo: "emocional" });
  const mr = MO.pedidoDoPendente(rv, rv.estado.pendentes[0]);
  t.ok("Estoico: +d6 no teste de trauma", mr.bonus.some((x) => x.faces === 6));
  MO.resolverPendente(rv, rv.estado.pendentes[0].id, MO.resolver(montagem([6, 6, 6], { dt: 7 }), { faces: [4, 4, 1], pavor: 0 }, {}), nada, 1);
  t.igual("  primeiro teste de trauma da cena recupera 9 PD", rv.recursos.pd.atual, 9);
}

t.grupo("Zero de PV/PD · uma regra para todos (v9.4)");
{
  const al = R.dePreset("alan");
  MO.aplicarDano(al, { valor: 10, tipo: "fisico" });
  t.iguais("Alan (do Alpha) a 0 PV: teste de lesão DT 7, como qualquer ficha", [al.estado.pendentes[0].tipo, al.estado.pendentes[0].dt], ["lesao", 7]);
  MO.resolverPendente(al, al.estado.pendentes[0].id, MO.resolver(montagem([6, 6], { dt: 7 }), { faces: [4, 4], pavor: 0 }, {}), nada);
  t.igual("  o contador sobe…", al.estado.testesLesao, 1);
  MO.fimDeCena(al);
  t.igual("  …e zera no fim da cena (para todos)", al.estado.testesLesao, 0);
  const a2 = R.dePreset("antonio");
  MO.aplicarDano(a2, { valor: 99, tipo: "emocional" });
  t.igual("0 PD por dano externo: teste de trauma (não mais Disciplina do Alpha)", a2.estado.pendentes[0].tipo, "trauma");
  /* Pendência antiga gravada antes da v9.4: resolve pela regra congelada. */
  const leg = R.normalizar({ perfilRegras: "alpha-contemporaneo", recursos: { pv: { max: 10, atual: 0 } }, estado: { pendentes: [{ id: "pv0", tipo: "vigorAlpha", dt: 7, motivo: "antiga" }] } });
  t.igual("ficha antiga com teste de Vigor pendente: a pendência continua", leg.estado.pendentes[0].tipo, "vigorAlpha");
  MO.resolverPendente(leg, "pv0", MO.resolver(montagem([6, 6], { dt: 7 }), { faces: [2, 3], pavor: 0 }, {}), nada);
  t.igual("  e resolve pela regra em que foi criada (falhou: morre)", leg.estado.morto, true);
}

t.grupo("Combate Beta · fases, simultaneidade e ataque mútuo (pp. 18–21)");
{
  t.iguais("ataque mútuo: empate 9×9 → os dois acertam", (() => { const a = MO.resolver(montagem([8, 8]), { faces: [5, 4], pavor: 0 }, {}), b = MO.resolver(montagem([8, 8]), { faces: [3, 6], pavor: 0 }, {}); const r = MO.ataqueMutuo(a, b); return [r.acertaA, r.acertaB]; })(), [true, true]);
  t.iguais("  empate 5×5 abaixo da DT 7 → os dois erram", (() => { const a = MO.resolver(montagem([8, 8]), { faces: [2, 3], pavor: 0 }, {}), b = MO.resolver(montagem([8, 8]), { faces: [4, 1], pavor: 0 }, {}); const r = MO.ataqueMutuo(a, b); return [r.acertaA, r.acertaB]; })(), [false, false]);
  t.iguais("  maior acerta, menor não", (() => { const a = MO.resolver(montagem([8, 8]), { faces: [6, 4], pavor: 0 }, {}), b = MO.resolver(montagem([8, 8]), { faces: [4, 4], pavor: 0 }, {}); const r = MO.ataqueMutuo(a, b); return [r.acertaA, r.acertaB]; })(), [true, false]);
  const mod = MO.modificadoresDeAtaque({ alcance: "longo", cobertura: "leve", distancia: true, ocultacao: "leve" });
  t.iguais("modificadores: longo +3, cobertura leve +3 (DT 13), ocultação −1 passo", [mod.dt, mod.passos], [13, -1]);
  t.iguais("alvo caído: +1 passo corpo a corpo, DT +3 à distância (p. 21)", [MO.modificadoresDeAtaque({ alvoCaido: true }).passos, MO.modificadoresDeAtaque({ alvoCaido: true, distancia: true }).dt], [1, 10]);
  t.ok("cobertura total impede o ataque", !MO.modificadoresDeAtaque({ cobertura: "total" }).ok);

  const m = mesa("beta-vigilia", ["rowan", "rhiona"]);
  ap(m, { tipo: "iniciarCombate", personagens: ["rowan", "rhiona"], npcs: [{ nome: "Afogado", pv: 4, atributos: { fisico: 8 }, pericias: { luta: 6, pontaria: 6, acrobacia: 4, percepcao: 4 }, ataques: [{ nome: "Arpão", alcance: "distancia", dano: 2 }, { nome: "Garras", alcance: "corpo", dano: 1 }] }], antecipar: false });
  const npc = m.e.combate.participantes.find((p) => p.tipo === "npc");
  const arco = m.fichas.rowan.bloco.itens.find((i) => i.alcance === "distancia");
  t.iguais("três fases por padrão", m.e.combate.ordemFases, ["geral", "distancia", "corpo"]);
  ap(m, { tipo: "declarar", quem: "rowan", acao: "agredirDistancia", alvo: npc.id, arma: arco.id }, jog("rowan"));
  ap(m, { tipo: "declarar", ator: npc.id, acao: "agredirDistancia", alvo: "pc-rowan" });
  ap(m, { tipo: "declarar", ator: "pc-rhiona", acao: "agredirCorpo", alvo: npc.id, arma: m.fichas.rhiona.bloco.itens[0].id }, jog("rhiona"));
  const tarde = ap(m, { tipo: "declarar", quem: "rowan", acao: "agredirCorpo", alvo: npc.id }, jog("rowan"));
  t.ok("uma ação padrão por rodada", !tarde.ok && /já agiu/.test(tarde.motivo));
  ap(m, { tipo: "aplicarFase" }); /* geral: ninguém */
  ap(m, { tipo: "aplicarFase" });
  ap(m, { tipo: "aplicarFase" }, MESTRE, fila(6, 8, 5, 5));
  const pvRowanAntes = m.fichas.rowan.bloco.recursos.pv.atual;
  ap(m, { tipo: "aplicarFase" });
  t.iguais("simultâneo: o NPC cai e o disparo dele também acerta Rowan", [npc.bloco.recursos.pv.atual, pvRowanAntes - m.fichas.rowan.bloco.recursos.pv.atual], [0, 7]);
  ap(m, { tipo: "aplicarFase" }, MESTRE, fila(4, 4));
  ap(m, { tipo: "aplicarFase" });
  const decl = m.e.combate.declaracoes.find((d) => d.ator === "pc-rhiona");
  t.igual("quem caiu antes do corpo a corpo não é atacado/age depois: a ação de Rhiona segue, o NPC fora não age", m.e.combate.participantes.find((p) => p.id === npc.id).bloco.estado.inconsciente, true);
  t.ok("  Rhiona ainda resolve a ação dela (o alvo já caído não faz diferença no dado)", decl.estado !== "declarada");
  ap(m, { tipo: "proximaRodada" });
  t.iguais("próxima rodada: fase 0, ninguém agiu", [m.e.combate.rodada, m.e.combate.fase, Object.keys(m.e.combate.agiu).length], [2, 0, 0]);
  const caido = ap(m, { tipo: "declarar", ator: npc.id, acao: "agredirCorpo", alvo: "pc-rhiona" });
  t.ok("fora de combate não declara", !caido.ok);
  ap(m, { tipo: "configurarFases", ordem: ["corpo", "distancia", "geral"] });
  t.iguais("a ordem das fases é configurável", m.e.combate.ordemFases, ["corpo", "distancia", "geral"]);

  /* Ataque mútuo pela mesa. */
  const m2 = mesa("beta-vigilia", ["sira"]);
  ap(m2, { tipo: "iniciarCombate", personagens: ["sira"], npcs: [{ nome: "Cria", pv: 20, pericias: { luta: 8, acrobacia: 4 }, ataques: [{ nome: "Mordida", alcance: "corpo", dano: 2 }] }], antecipar: false });
  const cria = m2.e.combate.participantes.find((p) => p.tipo === "npc");
  ap(m2, { tipo: "declarar", quem: "sira", acao: "agredirCorpo", alvo: cria.id, arma: m2.fichas.sira.bloco.itens[0].id }, jog("sira"));
  ap(m2, { tipo: "declarar", ator: cria.id, acao: "agredirCorpo", alvo: "pc-sira" });
  ap(m2, { tipo: "aplicarFase" }); ap(m2, { tipo: "aplicarFase" });
  ap(m2, { tipo: "aplicarFase" }); ap(m2, { tipo: "aplicarFase" });
  const pvS = m2.fichas.sira.bloco.recursos.pv.atual;
  ap(m2, { tipo: "aplicarFase" }, MESTRE, fila(5, 4, 3, 6));
  const rf = ap(m2, { tipo: "aplicarFase" });
  t.iguais("ataque mútuo pela mesa: 9×9 empate, os dois acertam (Sira RA 5+3, Cria RA 6+2)", [20 - cria.bloco.recursos.pv.atual, pvS - m2.fichas.sira.bloco.recursos.pv.atual], [8, 8]);

  /* Rodada antecipada: Antecipação Tática (Sira) — habilidade à parte. */
  const m3 = mesa("beta-vigilia", ["sira"]);
  ap(m3, { tipo: "iniciarCombate", personagens: ["sira"], npcs: [{ nome: "Cultista", pv: 8 }] });
  const at3 = R.habilidadesDoTipo(m3.fichas.sira.bloco, "rodadaAntecipada")[0];
  const pdS3 = m3.fichas.sira.bloco.recursos.pd.atual;
  const ant = ap(m3, { tipo: "usarHabilidade", quem: "sira", habilidade: at3.id }, jog("sira"));
  t.iguais("Antecipação Tática (Sira): 2 PD → rodada antecipada", [ant.ok, pdS3 - m3.fichas.sira.bloco.recursos.pd.atual, m3.e.combate.antecipados.length], [true, 2, 1]);
  const npc3 = m3.e.combate.participantes.find((p) => p.tipo === "npc");
  t.ok("  na rodada antecipada o NPC não age", !ap(m3, { tipo: "declarar", ator: npc3.id, acao: "agredirCorpo", alvo: "pc-sira" }).ok);
  t.ok("Val (Prontidão antiga) NÃO ganha Antecipação Tática na migração", !R.habilidadesDoTipo(R.dePreset("val"), "rodadaAntecipada").length && R.habilidadesDoTipo(R.dePreset("val"), "prontidao").length === 1);
}

t.grupo("Conflito simplificado do Alpha: não inicia ações (v9.4)");
{
  const m = mesa("alpha-contemporaneo", ["heitor", "alan"]);
  ap(m, { tipo: "iniciarCombate", personagens: ["heitor", "alan"], antecipar: false });
  const pv = m.fichas.alan.bloco.recursos.pv.atual;
  const r = ap(m, { tipo: "conflitoAlpha", atacante: "pc-heitor", defensor: "pc-alan", defesa: "lutar", armadoAtacante: true }, MESTRE, nada);
  t.ok("chamado direto (ou de uma aba antiga): recusado, sem rolar nem causar dano", !r.ok && /combate em fases/.test(r.motivo) && m.fichas.alan.bloco.recursos.pv.atual === pv);
  t.iguais("cenas do Alpha usam o combate em três fases", m.e.combate.ordemFases, K.ORDEM_FASES_PADRAO);
}

t.grupo("Investigação (Alpha pp. 21–23; Beta pp. 13–15)");
{
  const ponto = { id: "p1", nome: "Quadro na parede", descricao: "Uma pintura de uma menina num balanço.", revelado: true, contextual: "Esconde um cofre.", notaPrivada: "Solução: o cofre abre com 0310.",
    pistas: [{ id: "q1", pericias: ["percepcao"], dt: 6, texto: "Marcas de mão perto do quadro." }, { id: "q2", pericias: ["percepcao"], dt: 8, texto: "Uma gota de sangue seco." }, { id: "q3", pericias: ["aptidao:artes"], dt: 6, texto: "A menina não tem boca." }] };
  const m = mesa("alpha-contemporaneo", ["alan", "val", "amanda"]);
  ap(m, { tipo: "ponto", ponto });
  const r = ap(m, { tipo: "investigar", quem: "alan", ponto: "p1", pericia: "percepcao", modo: "nada" }, jog("alan"));
  t.iguais("revelação passiva pela face nominal (Percepção d8 → DT 6 e 8)", r.resultado.novas.map((n) => n.pista), ["q1", "q2"]);
  const pdAntes = m.fichas.alan.bloco.recursos.pd.atual;
  ap(m, { tipo: "investigar", quem: "alan", ponto: "p1", pericia: "percepcao", modo: "examinar", confirmar: true }, jog("alan"), fila(8, 8));
  t.igual("Examinar sem informação nova: −1 PD", pdAntes - m.fichas.alan.bloco.recursos.pd.atual, 1);
  const am = ap(m, { tipo: "investigar", quem: "amanda", ponto: "p1", pericia: "percepcao", modo: "examinar", confirmar: true }, jog("amanda"), fila(1, 4));
  t.ok("Amanda: Percepção d10 passiva já pega q1 e q2", am.ok && m.e.investigacao.descobertas.amanda.length === 2);
  const v = ap(m, { tipo: "investigar", quem: "val", ponto: "p1", pericia: "percepcao", segunda: "medicina", modo: "nada" }, jog("val"));
  t.ok("Varredura Ampla: duas perícias na passiva", v.ok);
  const v3 = ap(m, { tipo: "investigar", quem: "val", ponto: "p1", pericia: "percepcao", segunda: "medicina", modo: "observar" }, jog("val"));
  t.ok("  com Observar, a segunda perícia é a observação (nunca três perícias na mesma ação)", v3.ok && v3.resultado.novas.length === 0);
  t.iguais("Examinar não tem DT (sem falha: o Ímpeto de Alan não enche)", [m.e.testes.find((x) => x.quem === "alan" && x.montagem.examinar).montagem.dt, R.habilidadesDoTipo(m.fichas.alan.bloco, "impeto")[0].estado.espacos], [null, 0]);
  const naoVal = ap(m, { tipo: "investigar", quem: "alan", ponto: "p1", pericia: "percepcao", segunda: "medicina", modo: "nada" }, jog("alan"));
  t.ok("  sem Varredura Ampla, duas perícias são recusadas", !naoVal.ok);
  const vista = ME.vista(m.e, jog("alan"));
  const txt = JSON.stringify(vista);
  t.ok("vista do jogador: sem nota privada, contexto, DT nem pistas não descobertas", txt.indexOf("0310") < 0 && txt.indexOf("Esconde um cofre") < 0 && txt.indexOf("menina não tem boca") < 0 && vista.investigacao.pontos[0].pistas === undefined);
  t.iguais("  só as perícias listadas do ponto", vista.investigacao.pontos[0].pericias, ["percepcao", "aptidao:artes"]);
  t.ok("  descobertas só dos próprios personagens", Object.keys(vista.investigacao.descobertas).join() === "alan");
  /* Recapitular e Compartilhar. */
  ap(m, { tipo: "recapitular", quem: "alan", descricao: "As marcas e o sangue: alguém mexe no quadro." }, jog("alan"));
  const sol = m.e.investigacao.solicitacoes.find((s) => s.tipo === "recapitular");
  const cedo = ap(m, { tipo: "teste", quem: "alan", contexto: { solicitacao: sol.id } }, jog("alan"));
  t.ok("Recapitular espera a aprovação do Mestre", !cedo.ok && /aprovação/.test(cedo.motivo));
  ap(m, { tipo: "resolverSolicitacao", id: sol.id, aprovar: true });
  ap(m, { tipo: "teste", quem: "alan", contexto: { solicitacao: sol.id }, confirmar: true }, jog("alan"), fila(6, 5));
  t.iguais("  Intuição contra DT 10; sucesso trava Recapitular na cena", [m.e.testes[m.e.testes.length - 1].montagem.dt, m.e.investigacao.travas.recapitular], [10, true]);
  t.ok("  outra recapitulação é recusada", !ap(m, { tipo: "recapitular", quem: "val" }, jog("val")).ok);
  ap(m, { tipo: "compartilhar", quem: "alan", aliado: "amanda", descricao: "O sangue é recente." }, jog("alan"));
  const sc = m.e.investigacao.solicitacoes.find((s) => s.tipo === "compartilhar");
  t.igual("Compartilhar: o aliado testa Pesquisar (DT 10)", sc.pericia, "pesquisar");
  ap(m, { tipo: "novaCena" });
  t.igual("nova cena destrava", m.e.investigacao.travas.recapitular, false);
  const mb = mesa("beta-vigilia", ["cavan", "rhiona"]);
  ap(mb, { tipo: "ponto", ponto: { id: "pb", nome: "Potes de argila", descricao: "Dois potes tampados.", pistas: [{ id: "b1", pericias: ["percepcao"], dt: 6, texto: "Talvez tenham algo dentro." }, { id: "b2", pericias: ["medicina"], dt: 6, texto: "Bálsamo de confrei." }] } });
  const ob = ap(mb, { tipo: "investigar", quem: "cavan", ponto: "pb", pericia: "percepcao", segunda: "medicina", modo: "observar" }, jog("cavan"));
  t.ok("Observar com segunda perícia (passiva) — vale em qualquer ambientação", ob.ok && mb.e.investigacao.descobertas.cavan.length === 2);
  ap(mb, { tipo: "compartilhar", quem: "cavan", aliado: "rhiona" }, jog("cavan"));
  t.igual("  Compartilhar na Vigília também usa Pesquisar (Inspecionar é alias)", mb.e.investigacao.solicitacoes[0].pericia, "pesquisar");
  const it = ap(mb, { tipo: "investigar", quem: "rhiona", ponto: "pb", modo: "interagir", descricao: "Abro os potes." }, jog("rhiona"));
  t.ok("  Interagir é a alternativa a Investigar (sem passiva)", it.ok && !mb.e.investigacao.descobertas.rhiona);
  const ia = ap(m, { tipo: "investigar", quem: "val", ponto: "p1", pericia: "percepcao", modo: "interagir", descricao: "Levanto o quadro." }, jog("val"));
  t.ok("  no contemporâneo, idem: Interagir não entrega passiva", ia.ok && !ia.resultado.novas);
  /* Crítico examinando: aviso ao Mestre, sem descoberta fabricada. */
  const mc = mesa("alpha-contemporaneo", ["amanda"]);
  ap(mc, { tipo: "ponto", ponto: { id: "pc", nome: "Gaveta", descricao: "Uma gaveta.", revelado: true, pistas: [{ id: "c1", pericias: ["percepcao"], dt: 20, texto: "SEGREDO-PRIVADO" }] } });
  const cr = ap(mc, { tipo: "investigar", quem: "amanda", ponto: "pc", pericia: "percepcao", modo: "examinar", confirmar: true }, jog("amanda"), fila(8, 8));
  const descA = mc.e.investigacao.descobertas.amanda || [];
  t.ok("crítico examinando: o Mestre é avisado (solicitação), nada é revelado sozinho", cr.ok && mc.e.investigacao.solicitacoes.some((x) => x.tipo === "critico" && x.quem === "amanda") && !descA.some((d) => d.critico) && JSON.stringify(ME.vista(mc.e, jog("amanda"))).indexOf("SEGREDO-PRIVADO") < 0);
}

t.grupo("Testes pedidos, pendentes e fim de cena");
{
  const m = mesa("beta-vigilia", ["rowan"]);
  const p = ap(m, { tipo: "pedirTeste", rotulo: "Escalar o paredão", pericia: "atletismo", dt: 10, alvos: ["rowan"] });
  const esp = ap(m, { tipo: "teste", quem: "rowan", contexto: { pedido: p.resultado.pedido } }, jog("rowan"), fila(6, 5));
  t.ok("com Prontidão própria o teste espera; a resposta só vale ao confirmar", esp.resultado.aguardando && !m.e.pedidos[0].respostas.rowan);
  ap(m, { tipo: "resolverTeste", testeId: esp.resultado.teste, confirmar: true }, jog("rowan"));
  t.iguais("a resposta fica no pedido", [m.e.pedidos[0].respostas.rowan.total, m.e.pedidos[0].respostas.rowan.sucesso], [11, true]);
  t.ok("  não responde duas vezes", !ap(m, { tipo: "teste", quem: "rowan", contexto: { pedido: p.resultado.pedido } }, jog("rowan")).ok);
  ap(m, { tipo: "dano", personagem: "rowan", valor: 30, danoTipo: "fisico" });
  const pend = m.fichas.rowan.bloco.estado.pendentes[0];
  ap(m, { tipo: "teste", quem: "rowan", contexto: { pendente: pend.id }, confirmar: true }, jog("rowan"), fila(6, 6));
  t.iguais("teste de lesão pela mesa: crítico → 1 PV", [m.fichas.rowan.bloco.recursos.pv.atual, m.fichas.rowan.bloco.estado.inconsciente], [1, false]);
  ap(m, { tipo: "corrigir", personagem: "rowan", alvo: "contadores" });
  t.ok("correção do Mestre fica no histórico, marcada", m.fichas.rowan.bloco.historico.some((h) => h.corrigido));
}

t.grupo("Normalização · sem conversão silenciosa");
{
  const b = R.dePreset("rhiona");
  const n = R.normalizar(JSON.parse(JSON.stringify(b)));
  t.ok("normalizar é estável", JSON.stringify(n) === JSON.stringify(R.normalizar(JSON.parse(JSON.stringify(n)))));
  t.iguais("perfil desconhecido: regras unificadas, ambientação padrão (contemporâneo)", (() => { const x = R.normalizar({ perfilRegras: "gama" }); return [x.regras, x.versaoRegras, x.ambientacao, x.perfilRegras]; })(), [K.REGRAS.id, 1, "contemporaneo", undefined]);
  t.ok("o resumo da mesa não inventa números", (() => { const r = R.resumoParaMesa(b); return r.pv.max === 22 && r.pd.max === 12 && r.ambientacao === "vigilia"; })());
  const e = ME.normalizar(JSON.parse(JSON.stringify(ME.estadoVazio("alpha-contemporaneo"))));
  t.iguais("mesa antiga: perfil vira ambientação; regra única", [e.ambientacao, e.regras, e.perfil], ["contemporaneo", K.REGRAS.id, undefined]);
  const emig = ME.normalizar({ perfil: "beta-vigilia" });
  t.iguais("  mesa gravada na v9.3 (perfil Beta): migra para Contos da Vigília e guarda o legado", [emig.ambientacao, emig.migracao.de], ["vigilia", "beta-vigilia"]);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  - " + f).join("\n")); Deno.exit(1); }
