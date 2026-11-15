/* =====================================================================
   R.A.M.A. — testes: ações do Modelo Universal nas fichas de sistema (v9.35)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-acoes.js

   Uma ação Universal (custo, teste, efeito em recurso, usos) rodando em
   cada ficha pelos recursos NATIVOS (js/homebrew-recursos.js): Ordem
   (PV/PE/SAN), Ordem II (PV/PD), Tormenta20 (PV/PM), Goblins (Vitalidade
   pelos ferimentos), Vampiro (Vitalidade e Força de Vontade pelo dano
   Superficial). Oblívio e BRUTAL: o recurso fica com a mesa (o motivo
   aparece). A perícia nativa soma ao teste (Ordem, Tormenta20). Reenvio:
   o mesmo id de operação não grava duas vezes onde o motor tem id.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js", "js/tema-modelo.js",
  "js/ordem/catalogo.js", "js/ordem/elementos.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ficha.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/ramificacao.js",
  "js/ordem/homebrew-ordem.js", "js/ordem/biblioteca.js", "js/ordem/regras.js", "js/ordem/rituais.js"]
  .concat(["dados", "expressao", "racas", "classes-a", "classes-b", "classes-c", "origens", "deuses", "poderes", "equipamento",
    "magias", "magias-1", "magias-2", "magias-3", "magias-4", "magias-5", "ameacas", "ameacas-1", "ameacas-2", "ameacas-3", "ameacas-4",
    "ameacas-5", "ameacas-6", "ameacas-7", "parceiros", "itens-magicos", "itens-magicos-2", "mesa-dados", "regras", "mesa", "homebrew-t20"].map((a) => "js/tormenta20/" + a + ".js"))
  .concat(["catalogo", "dados", "regras", "mesa", "homebrew-goblins"].map((n) => "js/goblins/" + n + ".js"))
  .concat(["catalogo", "disciplinas-dados", "antagonistas-dados", "dados", "regras", "poderes", "cronica", "homebrew-vampiro"].map((n) => "js/vampiro/" + n + ".js"))
  .concat(["catalogo", "regras", "motor", "mesa", "ameacas", "procedimentos", "evolucao", "paranormal", "homebrew-ordem2"].map((n) => "js/ordem2/" + n + ".js"))
  .concat(["catalogo", "ameacas-dados", "buraco-dados", "regras", "combate", "ameacas", "mesa", "buraco", "habilidades", "homebrew-oblivio"].map((n) => "js/oblivio/" + n + ".js"))
  .concat(["catalogo", "regras", "mesa", "homebrew-brutal"].map((n) => "js/brutal/" + n + ".js"))
  .concat(["js/criaturas.js", "js/validacao.js", "js/homebrew-adaptadores.js", "js/pacotes-homebrew.js", "js/homebrew-recursos.js"]);
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
const G = globalThis, A = G.RAMAHomebrewAdaptadores, Rc = G.RAMAHomebrewRecursos, F = G.RAMAFicha;
const copia = (x) => JSON.parse(JSON.stringify(x));
/* O rolador de teste: devolve sempre o mesmo total por expressão. */
const rolar = (tab) => (exp) => ({ ok: true, total: tab[exp] !== undefined ? tab[exp] : 10 });
const acao = (custo, efeito, extra) => A.normalizarUniversal({ acoes: [Object.assign({ chave: "uso", nome: "Usar", usos: { max: 2 }, custo: custo ? { recurso: custo, quantidade: 1 } : null, teste: "1d20", efeito: { tipo: "recuperar", recurso: efeito, expressao: "3" } }, extra || {})] });
const rodar = (ficha, u, esc) => A.executarAcao(u, "uso", { status: Rc.recursos(ficha) }, rolar({ "1d20": 12, "3": 3 }), esc);
const r = (ficha, id) => Rc.recursos(ficha).filter((x) => x.id === id)[0];

t.grupo("Universal (a ficha de sempre)");
{
  const f = F.criarFicha({ nome: "U", tipoFicha: "universal" });
  f.status = [{ id: "s1", nome: "PV", atual: 5, maximo: 10 }, { id: "s2", nome: "PE", atual: 3, maximo: 5 }];
  const res = rodar(f, acao("PE", "PV"));
  t.ok("custo em PE, cura em PV, pelos recursos da ficha", res.ok && res.mudancas.length === 2);
  Rc.aplicar(f, res.mudancas);
  t.iguais("  gravado", [f.status[0].atual, f.status[1].atual], [8, 2]);
}

t.grupo("Ordem Paranormal: PV, PE e SAN nativos");
{
  const R = G.RAMAOrdemRegras;
  const f = F.criarFicha({ nome: "O", tipoFicha: "ordem" });
  f.ordem = R.normalizar({ classe: "combatente", origem: "academico", nex: 5, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
  const pvMax = R.pontosDeVida(f.ordem).total, peMax = R.pontosDeEsforco(f.ordem).total;
  f.ordem.recursos.pv = pvMax - 5;
  t.iguais("os recursos são os do motor (atual e máximo)", Rc.recursos(f).map((x) => x.id), ["pv", "pe", "san"]);
  const res = rodar(f, acao("PE", "PV"));
  t.ok("a ação acha PE e PV pelo nome", res.ok && res.mudancas.some((m) => m.statusId === "pe") && res.mudancas.some((m) => m.statusId === "pv"), JSON.stringify(res));
  Rc.aplicar(f, res.mudancas, "op1");
  t.iguais("  gravado em ordem.recursos (−1 PE; +3 PV)", [f.ordem.recursos.pe, f.ordem.recursos.pv], [peMax - 1, pvMax - 2]);
  const pers = Rc.pericias(f);
  const luta = pers.filter((p) => p.id === "luta")[0];
  t.ok("perícias nativas com o bônus de agora", pers.length > 10 && luta && typeof luta.bonus === "number");
  const comP = rodar(f, acao("", "PV"), { bonusTeste: 5, rotuloTeste: "Luta" });
  t.ok("  a perícia escolhida soma ao teste (1d20+5)", comP.rolagens[0].expressao === "1d20+5" && /Luta/.test(comP.rolagens[0].rotulo));
}

t.grupo("Ordem Paranormal RPG II: PV e PD");
{
  const R = G.RAMAOrdem2;
  const f = F.criarFicha({ nome: "O2", tipoFicha: "ordem2" });
  f.ordem2 = R.normalizar({});
  f.ordem2.recursos.pv.atual = f.ordem2.recursos.pv.max - 6;
  const res = rodar(f, acao("PD", "PV"));
  t.ok("custo em PD, cura em PV", res.ok && res.mudancas.length === 2, JSON.stringify(res));
  const pd0 = f.ordem2.recursos.pd.atual;
  Rc.aplicar(f, res.mudancas, "op-o2");
  Rc.aplicar(f, res.mudancas, "op-o2");
  t.ok("  gravado pela operação; o reenvio (mesmo id) não grava de novo", f.ordem2.recursos.pd.atual === pd0 - 1 && f.ordem2.operacoes.filter((x) => x === "op-o2").length === 1);
}

t.grupo("Tormenta20: PV e PM");
{
  const R = G.RAMATormenta20;
  const f = F.criarFicha({ nome: "T", tipoFicha: "tormenta20" });
  f.tormenta20 = R.normalizar({ atributosBase: { "for": 1, des: 1, con: 2, "int": 0, sab: 1, car: 0 }, raca: { id: "humano", atributos: ["for", "des", "con"], escolhas: {} }, origem: { id: "acolito", beneficios: [] }, niveis: [{ classe: "arcanista", escolhas: {} }] });
  const pm = r(f, "pm"), pv = r(f, "pv");
  const res = rodar(f, acao("PM", "PV"));
  t.ok("custo em PM", res.ok && res.mudancas.some((m) => m.statusId === "pm" && m.para === pm.atual - 1), JSON.stringify(res));
  Rc.aplicar(f, res.mudancas, "op-t20");
  t.ok("  gravado (o motor calcula o atual de novo)", r(f, "pm").atual === pm.atual - 1 && r(f, "pv").atual === pv.atual);
  Rc.aplicar(f, [{ statusId: "pm", para: 0 }], "op-t20");
  t.ok("  reenvio com o mesmo id: ignorado", r(f, "pm").atual === pm.atual - 1);
  t.ok("perícias nativas de T20", Rc.pericias(f).some((p) => p.id === "luta"));
}

t.grupo("Malditos Goblins: Vitalidade pelos ferimentos");
{
  const R = G.RAMAGoblins;
  const f = F.criarFicha({ nome: "G", tipoFicha: "goblins" });
  const o = R.fichaVazia(); o.ocupacao = "gatuno"; o.descritor = "mediocre"; o.ferimentos = 2;
  f.goblins = R.normalizar(o);
  const vit = r(f, "vitalidade");
  t.ok("Vitalidade = atributo − ferimentos", vit.atual === vit.maximo - 2);
  const semNome = rodar(f, acao("PE", "Vida"));
  t.ok("recurso que a ficha não tem pelo nome: Manual (a pessoa escolhe)", !semNome.ok && semNome.manual);
  const res = rodar(f, acao("", "Vida"), { recursoEfeito: "vitalidade" });
  Rc.aplicar(f, res.mudancas, "op-g1");
  t.ok("  escolhida a Vitalidade: a cura tira ferimentos", res.ok && f.goblins.ferimentos === 0, JSON.stringify(res));
  Rc.aplicar(f, [{ statusId: "vitalidade", para: 1 }], "op-g1");
  t.ok("  reenvio com o mesmo id: ignorado", f.goblins.ferimentos === 0);
}

t.grupo("Vampiro: Vitalidade e Força de Vontade pelo dano Superficial");
{
  const R = G.RAMAVampiro;
  const f = F.criarFicha({ nome: "V", tipoFicha: "vampiro" });
  f.vampiro = R.normalizar({ natureza: "vampiro", cla: "brujah" });
  const fdv = r(f, "forcaDeVontade");
  const res = rodar(f, A.normalizarUniversal({ acoes: [{ chave: "uso", nome: "Esforço", custo: { recurso: "Força de Vontade", quantidade: 1 }, efeito: { tipo: "manual", texto: "a mesa" } }] }));
  t.ok("custo em Força de Vontade (nome com espaço) e efeito manual", res.ok && res.manual && res.mudancas[0].statusId === "forcaDeVontade");
  Rc.aplicar(f, res.mudancas, "op-v1");
  t.ok("  vira 1 de dano Superficial", f.vampiro.forcaDeVontade.superficial === 1 && r(f, "forcaDeVontade").atual === fdv.atual - 1);
  Rc.aplicar(f, [{ statusId: "forcaDeVontade", para: fdv.atual }], "op-v2");
  t.ok("  recuperar tira o Superficial", f.vampiro.forcaDeVontade.superficial === 0);
}

t.grupo("Oblívio e BRUTAL: o recurso fica com a mesa (com o motivo)");
{
  const fo = F.criarFicha({ nome: "Ob", tipoFicha: "oblivio" }); fo.oblivio = G.RAMAOblivio.normalizar({});
  const fb = F.criarFicha({ nome: "Br", tipoFicha: "brutal" }); fb.brutal = G.RAMABrutal.normalizar({});
  t.ok("sem recursos nativos; o porquê", !Rc.recursos(fo).length && /região/.test(Rc.semRecursos(fo)) && !Rc.recursos(fb).length && /Diretora/.test(Rc.semRecursos(fb)));
  const so = rodar(fo, A.normalizarUniversal({ acoes: [{ chave: "uso", nome: "Teste", usos: { max: 1 }, teste: "1d6", efeito: { tipo: "manual", texto: "a mesa" } }] }));
  t.ok("  o teste e os usos funcionam (o efeito é Manual)", so.ok && so.rolagens.length === 1 && so.manual && so.estado.usos.uso === 1);
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
