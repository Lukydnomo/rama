/* =====================================================================
   R.A.M.A. — testes dos suplementos (v6.1)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-suplementos.js

   O cadastro, a seleção da ficha e da campanha (ausente × vazia), o
   contexto e o efeito real nos catálogos de Ordem: progressão,
   bibliotecas, rituais, itens, criaturas, usos de perícia, regras
   opcionais — e o que NÃO muda: o que a ficha já tem. Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = [
  "js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js",
  "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js",
  "js/ordem/efeitos.js", "js/ordem/condicoes.js", "js/ordem/consumo.js", "js/ordem/inventario.js",
  "js/ordem/personalizacao.js", "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/biblioteca.js",
  "js/ordem/regras.js", "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/criaturas-dados.js", "js/criaturas.js", "js/ordem/criaturas.js", "js/ordem/fontes-em-uso.js",
  "js/temas-dados.js", "js/oblivio/catalogo.js", "js/oblivio/regras.js", "js/vampiro/catalogo.js", "js/vampiro/disciplinas-dados.js",
  "js/vampiro/antagonistas-dados.js", "js/vampiro/dados.js", "js/vampiro/regras.js", "js/vampiro/poderes.js", "js/vampiro/cronica.js",
  "js/tema-modelo.js", "js/ficha.js",
];
globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
for (const caminho of ARQUIVOS) {
  let codigo;
  try { codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url)); }
  catch (e) { console.error("Arquivo ausente: " + caminho); Deno.exit(1); }
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  igual(n, a, b) { const ok = Object.is(a, b); t.ok(n, ok, ok ? "" : `obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`); },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};

const S = globalThis.RAMASuplementos, C = globalThis.RAMAOrdemCatalogo, P = globalThis.RAMAOrdemPoderes, E = globalThis.RAMAOrdemProgressao;
const OP = globalThis.RAMAOrdemOpcionais, B = globalThis.RAMAOrdemBiblioteca, RI = globalThis.RAMAOrdemRituais, IT = globalThis.RAMAOrdemItens;
const PU = globalThis.RAMAOrdemPericiasUsos, F = globalThis.RAMAFicha, FU = globalThis.RAMAOrdemFontesEmUso;

t.grupo("Cadastro");
{
  const l = S.doSistema("ordem");
  t.iguais("os oito de Ordem, na ordem (Extras por último)", l.map((s) => s.fontes[0]), ["SAH", "AS1", "AS2", "AS3", "AS4", "AS5", "AS6", "EXTRA"]);
  t.igual("AS3 é Hexatombe — Parte II", S.daFonte("ordem", "AS3").nome, "Arquivos Secretos 3: Hexatombe — Parte II");
  t.ok("ids estáveis", l.every((s) => /^ordem\.(sah|as[1-6]|extra)$/.test(s.id)));
  t.ok("nome, descrição e capa em todos", l.every((s) => s.nome && s.descricao && /^assets\/sistemas\/ordem-(sah|as\d|extra)-capa\.webp$/.test(s.capa)));
  let capas = true;
  for (const s of l) { for (const c of [s.capa, s.capa.replace(".webp", "-pequena.webp")]) { try { await Deno.stat(new URL("../" + c, import.meta.url)); } catch { capas = false; } } }
  t.ok("as capas (e as pequenas) existem como assets locais", capas);
  t.ok("o livro básico não é suplemento; os Extras são", !S.daFonte("ordem", "OPRPG") && S.daFonte("ordem", "EXTRA").id === "ordem.extra");
  t.ok("sistemas sem suplemento: fluxo direto", !S.temSuplementos("goblins") && !S.temSuplementos("vampiro") && S.temSuplementos("ordem"));
  t.ok("toda fonte de suplemento existe no registro de livros", l.every((s) => s.fontes.every((f) => C.LIVROS.some((x) => x.sigla === f))));
  t.igual("Hexatombe é ferramenta do AS2 (habilitar não liga)", S.daFerramenta("ordem", "hexatombe").id, "ordem.as2");
}

t.grupo("Seleção: ausente × vazia");
{
  t.igual("ausente: null (todos)", S.normalizarSelecao("ordem", undefined), null);
  t.iguais("vazia: só o livro básico", S.normalizarSelecao("ordem", []), []);
  t.iguais("ids desconhecidos e repetidos saem", S.normalizarSelecao("ordem", ["ordem.as2", "x", "ordem.as2", 3]), ["ordem.as2"]);
  t.igual("ausente = os oito ativos", S.ativos("ordem", null).length, 8);
  t.iguais("mapa da campanha por sistema", S.daCampanha({ ordem: ["ordem.sah"], goblins: [] }, "ordem"), ["ordem.sah"]);
  t.igual("campanha sem a chave: todos", S.daCampanha({ goblins: [] }, "ordem"), null);
}

t.grupo("Contexto: ficha ∩ campanha");
{
  S.definirContexto({ sistema: "ordem" });
  t.ok("sem seleção: tudo liberado (fichas antigas)", ["SAH", "AS1", "AS6"].every((f) => S.fonteLiberada("ordem", f)));
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("só o livro básico: suplementos fora", !S.fonteLiberada("ordem", "SAH") && !S.fonteLiberada("ordem", "AS6"));
  t.ok("…mas livro básico, Homebrew e sem fonte continuam", ["OPRPG", "HOMEBREW", ""].every((f) => S.fonteLiberada("ordem", f)));
  t.ok("…e os Extras saem junto (são suplemento)", !S.fonteLiberada("ordem", "EXTRA"));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.sah", "ordem.as1"], campanha: ["ordem.sah", "ordem.as2"] });
  t.ok("interseção: SAH sim, AS1 não (mesa), AS2 não (ficha)", S.fonteLiberada("ordem", "SAH") && !S.fonteLiberada("ordem", "AS1") && !S.fonteLiberada("ordem", "AS2"));
  t.ok("o motivo diz quem barrou", /campanha/.test(S.motivo("ordem", "AS1")) && /ficha/.test(S.motivo("ordem", "AS2")));
  t.ok("outro sistema não é afetado", S.fonteLiberada("vampiro", "AS1"));
  t.ok("ferramenta: a seleção da mesa decide", !S.ferramentaLiberada("ordem", "hacking", ["ordem.sah"]) && S.ferramentaLiberada("ordem", "hacking", null) && S.ferramentaLiberada("ordem", "combate", []));
}

t.grupo("Catálogos de Ordem");
{
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("C.fonteLiberada no item (fonte) e na criatura (livro)", !C.fonteLiberada({ fonte: "SAH" }) && !C.fonteLiberada({ livro: "AS2" }) && C.fonteLiberada({ fonte: "OPRPG" }) && C.fonteLiberada({}));
  const catR = RI.carregar ? await RI.carregar() : null;
  if (catR) {
    const so = RI.filtrar(catR, {});
    const todos = RI.filtrar(catR, { incluirDesligados: true });
    t.ok("rituais: só os do livro básico para novas escolhas (nem EXTRA)", so.every((r) => r.fonte === "OPRPG") && todos.length > so.length);
  } else t.ok("rituais: catálogo carregável", false, "RI.carregar ausente");
  const catI = IT.carregar ? await IT.carregar() : null;
  if (catI) {
    const so = IT.filtrar(catI, {});
    t.ok("itens: nada de SAH/AS*/EXTRA nas novas escolhas", so.every((i) => i.fonte === "OPRPG") && IT.filtrar(catI, { incluirDesligados: true }).length > so.length);
    t.ok("itens: o filtro de livro não oferece fonte desligada", IT.opcoesDeFiltro ? IT.opcoesDeFiltro(catI).fontes.every((f) => f.valor === "OPRPG") : true);
  } else t.ok("itens: catálogo carregável", false, "IT.carregar ausente");
  const secs = B.filtrar(B.secoes("origens"), "", {});
  t.ok("biblioteca de habilidades: origens só do livro básico (o Revoltado, de EXTRA, sai)", secs.every((s) => s.entradas.every((x) => (x.entrada.fonte || "OPRPG") === "OPRPG")) && secs.length > 0);
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.extra"] });
  t.ok("só os Extras ligados: o Revoltado volta, SAH não", B.filtrar(B.secoes("origens"), "", {}).some((s) => s.entradas.some((x) => x.entrada.fonte === "EXTRA")) && !C.fonteLiberada("SAH"));
  S.definirContexto({ sistema: "ordem", ficha: [] });
  const u = PU.consulta("investigacao");
  t.ok("usos de perícia: os de SAH saem, com o aviso", (u.desligados || []).indexOf("SAH") >= 0 && (u.especificos || []).every((e) => e.fonte !== "SAH"));
  t.ok("…e voltam com incluirDesligados", (PU.consulta("investigacao", { incluirDesligados: true }).especificos || []).some((e) => e.fonte === "SAH"));
  S.definirContexto({ sistema: "ordem" });
  t.ok("ficha antiga: rituais de todos os livros", catR ? RI.filtrar(catR, {}).some((r) => r.fonte === "SAH") : false);
}

t.grupo("Progressão: suplemento desligado fica à vista, com o motivo");
{
  S.definirContexto({ sistema: "ordem", ficha: [] });
  const o = globalThis.RAMAOrdemRegras.fichaVazia ? globalThis.RAMAOrdemRegras.fichaVazia() : null;
  const ordem = Object.assign({ classe: "combatente", nex: 20, escolhas: [], trilha: "", opcionais: {} }, o || {});
  ordem.classe = "combatente"; ordem.nex = 20;
  const vaga = E.vagas(ordem).filter((v) => /poderClasse/.test(v.id))[0];
  if (vaga) {
    const cands = E.candidatosPoderClasse(ordem, vaga.id, {});
    const deSup = cands.filter((c) => c.entrada.fonte && c.entrada.fonte !== "OPRPG" && c.entrada.fonte !== "EXTRA");
    t.ok("poderes de suplemento: indisponíveis para escolha nova", deSup.length > 0 && deSup.every((c) => !c.disponivel && c.motivos.some((m) => /desligado/.test(m))));
    t.ok("poderes do livro básico seguem disponíveis (os que não têm requisito)", cands.some((c) => (c.entrada.fonte || "OPRPG") === "OPRPG" && c.disponivel));
  } else t.ok("há vaga de poder de classe no NEX 20%", false);
  const trs = E.candidatosTrilha(ordem, vaga ? vaga.id : "", {}, false);
  t.ok("trilhas de suplemento: indisponíveis, as do básico não", trs.filter((x) => x.trilha.fonte && x.trilha.fonte !== "OPRPG").every((x) => !x.disponivel) && trs.some((x) => !x.trilha.fonte || x.trilha.fonte === "OPRPG"));
  S.definirContexto({ sistema: "ordem" });
}

t.grupo("Regra opcional ≠ suplemento");
{
  const regraAS2 = OP.REGRAS.filter((r) => r.fonte === "AS2")[0];
  const ficha = { opcionais: {} };
  S.definirContexto({ sistema: "ordem", ficha: [] });
  const c1 = OP.conflitos(ficha, regraAS2.chave, true);
  t.ok("AS2 desligado: a regra dele não liga (com o motivo)", c1.some((p) => p.tipo === "suplemento"));
  t.ok("…desligar a regra continua permitido", OP.conflitos({ opcionais: { [regraAS2.chave]: true } }, regraAS2.chave, false).length === 0);
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as2"] });
  t.ok("AS2 ligado: a regra fica disponível…", !OP.conflitos(ficha, regraAS2.chave, true).some((p) => p.tipo === "suplemento"));
  t.ok("…mas continua desligada até alguém ligar", !OP.ligada(ficha, regraAS2.chave));
  S.definirContexto({ sistema: "ordem" });
}

t.grupo("Ficha: persistência e o que já está em uso");
{
  const nova = F.criarFicha({ nome: "A", tipoFicha: "ordem", suplementos: ["ordem.as2", "ordem.zzz"] });
  t.iguais("criada com a seleção (ids desconhecidos fora)", nova.suplementos, ["ordem.as2"]);
  t.ok("só o livro básico continua lista vazia ao salvar e abrir", Array.isArray(F.normalizarFicha(JSON.parse(JSON.stringify(F.criarFicha({ nome: "B", tipoFicha: "ordem", suplementos: [] })))).suplementos) && F.normalizarFicha(F.criarFicha({ nome: "B", tipoFicha: "ordem", suplementos: [] })).suplementos.length === 0);
  const antiga = F.normalizarFicha({ schemaVersion: 26, nome: "Antiga", tipoFicha: "ordem" });
  t.ok("ficha antiga: sem o campo (todos ligados, como na 6.0.0)", !("suplementos" in antiga));
  t.igual("schema 28", F.VERSAO_SCHEMA, 28);
  const copia = F.normalizarFicha(JSON.parse(JSON.stringify(nova)));
  t.iguais("exportar/importar (JSON) mantém", copia.suplementos, ["ordem.as2"]);
  const comUso = { tipoFicha: "ordem", ordem: { origem: "mateiro", classe: "combatente", trilha: "", escolhas: [], opcionais: {} }, rituais: { itens: [{ nome: "R", origemCatalogoId: (globalThis.RAMAOrdemRituaisDados.rituais.find((r) => r.fonte === "SAH") || {}).id }] }, inventario: { itens: [] } };
  const uso = FU.emUso(comUso);
  t.ok("em uso: a origem e o ritual de SAH, pela fonte do catálogo", (uso.SAH || []).some((x) => /Origem: Mateiro/.test(x)) && (uso.SAH || []).some((x) => /^Ritual:/.test(x)));
  t.ok("item escrito à mão (sem catálogo) não vira suplemento", Object.keys(FU.emUso({ tipoFicha: "ordem", ordem: {}, inventario: { itens: [{ nome: "Faca do avô" }] } })).length === 0);
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("desligado e em uso: listado para o aviso (nada é removido)", FU.desligadosEmUso(comUso).some((x) => x.fonte === "SAH") && comUso.ordem.origem === "mateiro");
  S.definirContexto({ sistema: "ordem" });
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
