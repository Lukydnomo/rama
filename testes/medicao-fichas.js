/* =====================================================================
   R.A.M.A. — fichas para medir (v2.46)
   ---------------------------------------------------------------------
   Monta, com as fábricas e o motor do próprio site, as fichas usadas
   pelas medições de interface e de backend:

     ordem       Jeff — o retrato público do CRIS guardado em
                 testes/fixtures/cris, convertido pelo mesmo caminho da
                 importação (classe, trilha, poderes, rituais, armas,
                 proteção, munição). É a ficha de Ordem "de verdade".
     universal   uma ficha universal em uso: 30 perícias com fórmulas,
                 campos de defesa, inventário e anotações.

   Sem rede e sem gravar nada: devolve objetos. Quem chama decide o que
   fazer com eles (o servidor local cria os personagens; o medidor de
   cálculo os usa direto).
   ===================================================================== */

const RAIZ = new URL("../", import.meta.url);

const ARQUIVOS = [
  "js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js",
  "js/ordem/condicoes.js", "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js",
  "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/maldicoes.js", "js/ordem/arquivo2.js", "js/ordem/arquivo3.js", "js/ordem/arquivo4.js", "js/ordem/arquivo5.js", "js/criaturas.js",
  "js/ficha.js", "js/validacao.js", "js/importar-cris.js",
];

/* Carrega o motor do site no escopo global (como o navegador faria). */
export async function carregarMotor(alvo) {
  const g = alvo || globalThis;
  if (g.RAMAImportarCris && g.RAMAOrdemRegras) return g;
  g.window = g;
  if (!g.document) g.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
  if (!g.navigator) g.navigator = { onLine: true };
  if (!g.location) g.location = { search: "" };
  for (const caminho of ARQUIVOS) {
    (0, eval)(await Deno.readTextFile(new URL(caminho, RAIZ)));
  }
  return g;
}

function fsValue(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsValue(x)])) } };
}

/* O núcleo do Cris.gs (sem rede) monta o retrato a partir do documento. */
async function nucleoDoCris(g) {
  if (g.RamaCrisCore) return g.RamaCrisCore;
  const fonte = await Deno.readTextFile(new URL("backend/Cris.gs", RAIZ));
  (0, eval)(fonte.replace(/function crisDentroDoLimite[\s\S]*$/, "") + "\nglobalThis.RamaCrisCore = RamaCrisCore;");
  return g.RamaCrisCore;
}

export async function fichasParaMedir() {
  const g = await carregarMotor();
  const Core = await nucleoDoCris(g);
  const X = g.RAMAImportarCris, F = g.RAMAFicha, R = g.RAMAOrdemRegras, E = g.RAMAOrdemProgressao;
  const IT = g.RAMAOrdemItens, RS = g.RAMAOrdemRituais;
  const deps = {
    F, R, E, H: g.RAMAHabilidades, ITM: IT, RS, C: g.RAMAOrdemCatalogo, P: g.RAMAOrdemPoderes, U: g.RAMAUtil, V: g.RAMAValidacao,
    catalogoItens: await IT.carregar(), catalogoRituais: await RS.carregar(),
  };

  const doc = JSON.parse(await Deno.readTextFile(new URL("testes/fixtures/cris/jeff-cris-publico.json", RAIZ)));
  const link = "https://crisordemparanormal.com/agente/OwH4ajq32U6pYGVlJBHa";
  const fs = {
    name: "projects/cris-ordem-paranormal/databases/(default)/documents/characters/OwH4ajq32U6pYGVlJBHa",
    fields: fsValue(doc).mapValue.fields, updateTime: "2026-10-03T00:00:00Z",
  };
  const retrato = JSON.parse(JSON.stringify(Core.pacote(fs, link, "2026-10-03T12:00:00Z")));
  const convertida = X.converter(retrato, {}, deps);
  if (!convertida.ok) throw new Error("A ficha do Jeff não converteu: " + JSON.stringify(convertida.avisos || []).slice(0, 300));
  const ordem = JSON.parse(JSON.stringify(convertida.ficha));
  ordem.nome = "Jeff (medição)";

  /* Uma ficha em jogo carrega mais do que o retrato: itens do catálogo
     (armas, proteção, utensílios), rituais e condições ativas. É sobre
     isso que a tela calcula a cada mudança. */
  const catItens = deps.catalogoItens.itens || deps.catalogoItens.entradas || deps.catalogoItens;
  const listaItens = (Array.isArray(catItens) ? catItens : Object.values(catItens.porId || {}))
    .filter((e) => e && e.natureza === "item" && !e.escolha);
  const escolhidos = [];
  ["arma", "protecao", "geral", "municao"].forEach((tipo) => {
    listaItens.filter((e) => (e.tipoItem || "geral") === tipo).slice(0, 5).forEach((e) => escolhidos.push(e));
  });
  escolhidos.forEach((e) => {
    const r = IT.paraInventario(e, {});
    if (r.ok) ordem.inventario.itens.push(F.criarItem(r.tipo === "arma" || r.tipo === "protecao" ? (r.tipo === "arma" ? "arma" : "armadura") : "item", r.dados));
  });
  const catRituais = deps.catalogoRituais.rituais || [];
  catRituais.filter((e) => !e.escolha && e.circulo <= 2).slice(0, 8).forEach((e) => {
    const r = RS.paraFicha(e, {});
    if (r.ok) ordem.rituais.itens.push(F.criarRitual(F.normalizarRitual(r.dados)));
  });
  const EF = g.RAMAOrdemEfeitos;
  const cond = ordem.ordem.condicoes || (ordem.ordem.condicoes = {});
  cond.efeitos = (cond.efeitos || []).concat([
    EF.criarInstancia({ modelo: "cond:abalado", quando: "2026-10-03T12:00:00.000Z" }),
    EF.criarInstancia({ modelo: "cond:fraco", quando: "2026-10-03T12:00:00.000Z" }),
  ].filter(Boolean));
  const normal = F.normalizarFicha(JSON.parse(JSON.stringify(ordem)));
  Object.keys(ordem).forEach((k) => delete ordem[k]);
  Object.assign(ordem, JSON.parse(JSON.stringify(normal)));

  const universal = F.normalizarFicha(F.criarFicha({ nome: "Lia (medição)", tipoFicha: "universal" }));
  const atr = universal.atributos;
  universal.pericias = Array.from({ length: 30 }, (_, i) => ({
    id: "pm-" + i, nome: "Perícia " + i, atributoId: i % 4 === 3 ? null : atr[i % atr.length].id,
    bonus: i % 5, bonusTemporario: 0, dadosExtras: i % 7 === 0 ? [{ id: "dx-" + i, operacao: "+", dado: "1d4" }] : [],
    formula: i % 4 === 3 ? "(@" + atr[0].sigla + "/2 + 1)d6 + @" + atr[1].sigla : "", contagem: "soma",
  }));
  universal.status.forEach((s, i) => { s.maximo = 10 + i * 5; s.atual = s.maximo; });
  universal.defesa.campos = [{ id: "cd-1", nome: "Armadura", valor: 4 }, { id: "cd-2", nome: "Reflexo", valor: 2 }];
  universal.inventario.itens = Array.from({ length: 25 }, (_, i) => F.criarItem(i % 5 === 0 ? "arma" : "item", {
    nome: (i % 5 === 0 ? "Arma " : "Item ") + i, categoria: "Geral", peso: 1, dano: i % 5 === 0 ? "1d8" : "",
    descricao: "Descrição razoavelmente comprida do item número " + i + ".",
  }));
  universal.anotacoes = { pastas: [], soltas: Array.from({ length: 6 }, (_, i) => Object.assign(F.criarNota("Sessão " + i), { conteudo: "Registro de campo. ".repeat(80) })) };

  return { ordem, universal: JSON.parse(JSON.stringify(universal)) };
}
