/* =====================================================================
   R.A.M.A. — testes do Catálogo (v6.12)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-catalogo.js

   Sem navegador: as categorias de cada sistema (só as que têm conteúdo),
   as entradas com nome, busca e referência, a consulta aberta de cada
   uma (com um construtor de elementos mínimo), os filtros por fonte,
   elemento, círculo e VD onde se aplicam, os itens novos de Vampiro V5
   (capítulo Itens, p. 378–381) sem duplicar armas e armaduras, Projetos
   e Jogo Ponderado, e o que a página NÃO faz (contexto de suplemento).
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }), createTextNode: (t) => ({ texto: t }) };
globalThis.navigator = { onLine: true };
globalThis.location = { search: "", pathname: "/catalogo/" };

const raiz = new URL("../", import.meta.url);
const ler = (c) => Deno.readTextFile(new URL(c, raiz));
for (const c of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/biblioteca.js",
  "js/ordem/regras.js", "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/criaturas.js", "js/ordem/criaturas.js",
  "js/vampiro/catalogo.js", "js/vampiro/disciplinas-dados.js", "js/vampiro/antagonistas-dados.js",
  "js/oblivio/catalogo.js", "js/oblivio/ameacas-dados.js", "js/oblivio/buraco-dados.js", "js/oblivio/regras.js", "js/oblivio/buraco.js",
  "js/goblins/catalogo.js", "js/goblins/dados.js", "js/goblins/mesa.js",
  "js/brutal/catalogo.js", "js/brutal/regras.js", "js/brutal/mesa.js"].concat(["dados", "expressao", "racas", "classes-a", "classes-b", "classes-c", "origens", "deuses", "poderes", "equipamento", "magias", "magias-1", "magias-2", "magias-3", "magias-4", "magias-5", "ameacas", "ameacas-1", "ameacas-2", "ameacas-3", "ameacas-4", "ameacas-5", "ameacas-6", "ameacas-7", "parceiros", "itens-magicos", "itens-magicos-2", "mesa-dados", "regras"].map((a) => "js/tormenta20/" + a + ".js"))) {
  (0, eval)(await ler(c));
}
const U0 = globalThis.RAMAUtil;
globalThis.RAMAUtil = Object.assign({}, U0, { el: (tag, o, filhos) => ({ tag, texto: (o && o.texto) || "", filhos: [].concat(filhos || []).filter(Boolean), addEventListener() {}, removeEventListener() {}, getAttribute() { return ""; }, setAttribute() {} }), $: () => null });
globalThis.RAMAUI = { recolhivel: (o) => ({ titulo: o.titulo }), painel: (t, c) => ({ tag: "section", texto: t, filhos: [c] }), simbolo: () => null };
(0, eval)(await ler("js/geradores-criaturas.js"));
(0, eval)(await ler("js/fichas-nativas.js"));
globalThis.RAMABibliotecaCriaturas = { abrir: () => ({}) };
let iniciada = null;
globalThis.RAMAApp = { iniciar: (k) => { iniciada = k; }, titulo: () => ({}) };
const fonteDaPagina = await ler("js/paginas/catalogo.js");
(0, eval)(fonteDaPagina);
const PC = globalThis.RAMAPaginaCatalogo, V = globalThis.RAMAVampiroCatalogo, RT = globalThis.RAMAOrdemRituais, IT = globalThis.RAMAOrdemItens;
await RT.carregar(); await IT.carregar();
const tudo = (n) => !n ? "" : (typeof n === "string" ? n : [n.texto || ""].concat((n.filhos || []).map(tudo)).filter(Boolean).join(" | "));

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  igual(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};
const ids = (s) => PC.categoriasDe(s).map((c) => c.id);
const busca = (s, cat, termo) => PC.entradasDe(s, cat).filter((x) => x.chave.indexOf(U0.chaveDeBusca(termo)) >= 0 || U0.chaveDeBusca(x.nome).indexOf(U0.chaveDeBusca(termo)) >= 0);

t.grupo("Página · menu, endereço e escopo");
{
  t.ok("registra a página 'catalogo' no app", iniciada === "catalogo");
  const app = await ler("js/app.js");
  t.ok("o menu tem Catálogo no lugar de Criaturas", /chave: "catalogo",\s+rotulo: "Catálogo",\s+caminho: "catalogo\/"/.test(app) && !/rotulo: "Criaturas"/.test(app));
  t.ok("não define contexto de suplemento nem toca em aquisição (só consulta)", !/definirContexto|registrar\(|paraFicha\(|paraInventario\(/.test(fonteDaPagina));
  t.ok("sistema e categoria ficam no endereço", /q\.set\("sistema"/.test(fonteDaPagina) && /q\.set\("categoria"/.test(fonteDaPagina));
}

t.grupo("Categorias · só as que têm conteúdo");
{
  t.igual("Ordem", ids("ordem"), ["rituais", "itens", "poderes", "habilidades", "origens", "criaturas", "pericias", "geradores"]);
  t.igual("Oblívio", ids("oblivio"), ["criaturas", "equipamentos", "habilidades", "papeis", "conhecimentos", "motivacoes", "mazelas", "fardos", "geradores"]);
  t.igual("Vampiro (sem Geradores: o sistema não tem)", ids("vampiro"), ["criaturas", "disciplinas", "rituais", "alquimia", "clas", "predadores", "vantagens", "fichas", "equipamentos", "mesa"]);
  t.igual("Malditos Goblins", ids("goblins"), ["criaturas", "armas", "protecoes", "equipamentos", "magicos", "magias", "ocupacoes", "caracteristicas", "adaptacoes", "aventuras", "geradores"]);
  t.igual("BRUTAL (Corte Rápido)", ids("brutal"), ["arquetipos", "estilos", "vantagens", "acoes", "assassinos"]);
  t.igual("Tormenta20 (Jogo do Ano)", ids("tormenta20"), ["racas", "classes", "origens", "divindades", "pericias", "poderes", "magias", "equipamento", "itensMagicos", "ameacas", "perigos", "regras"]);
  const erros = [];
  for (const s of ["ordem", "oblivio", "vampiro", "goblins", "brutal", "tormenta20"]) {
    for (const c of PC.categoriasDe(s)) {
      if (c.tipo) continue;
      const l = PC.entradasDe(s, c.id);
      if (!l.length) erros.push(s + "/" + c.id + " vazia");
      const vistos = {};
      for (const x of l) {
        if (!x.nome || !x.chave || !x.id) erros.push(s + "/" + c.id + ": entrada sem nome/id/busca");
        if (vistos[x.id]) erros.push(s + "/" + c.id + ": id repetido " + x.id);
        vistos[x.id] = true;
        try { const d = x.detalhes(); if (!d) erros.push(s + "/" + c.id + "/" + x.nome + ": consulta vazia"); } catch (e) { erros.push(s + "/" + c.id + "/" + x.nome + ": " + e.message); }
      }
    }
  }
  t.ok("toda entrada tem nome, id único, busca e uma consulta que abre", !erros.length, erros.slice(0, 4).join(" · "));
}

t.grupo("Ordem · os mesmos dados das fichas");
{
  t.igual("rituais: os 108 do catálogo", PC.entradasDe("ordem", "rituais").length, RT.catalogoPronto().rituais.length);
  t.igual("itens: as 320 entradas", PC.entradasDe("ordem", "itens").length, IT.catalogoPronto().itens.length);
  const rit = PC.entradasDe("ordem", "rituais").filter((x) => x.id === "op.ritual.cicatrizacao")[0];
  t.ok("ritual com símbolo e filtros por fonte, elemento e círculo", !!rit && typeof rit.simbolo === "function" && rit.f.fonte === "OPRPG" && rit.f.elemento === "morte" && rit.f.circulo === "1");
  const ordemCats = globalThis.RAMAPaginaCatalogo.CATEGORIAS.ordem;
  const filtrosDe = (id) => ordemCats.filter((c) => c.id === id)[0].filtros().map((f) => f.chave);
  t.igual("filtros de rituais", filtrosDe("rituais"), ["fonte", "elemento", "circulo"]);
  t.igual("filtros de poderes", filtrosDe("poderes"), ["fonte", "tipo", "classe", "elemento"]);
  t.ok("origens: as 60, com fonte", PC.entradasDe("ordem", "origens").length === globalThis.RAMAOrdemCatalogo.ORIGENS.length);
  t.ok("habilidades de trilha incluem as do AS9 (Incursor)", busca("ordem", "habilidades", "Alvo-prioritário").length >= 1);
  t.ok("criaturas de Ordem: a biblioteca do combate (VD, fonte, Copiar para o Homebrew)", /RAMABibliotecaCriaturas\.abrir\(\{\s*embutido: area, aba: "oficial"/.test(fonteDaPagina));
}

t.grupo("Vampiro V5 · capítulo Itens (p. 378–381)");
{
  const novos = ["sacoAntissol", "caoscopio", "mirasx", "armasCamufladas", "incendiariasCaseiras", "lancadorDeRedes", "urnaAncestral", "pedrasEntalhadas", "terraDaSepultura", "dinheiroVelho", "sanguePreservado"];
  t.igual("as 11 entradas que faltavam", novos.filter((k) => V.EQUIPAMENTOS[k]).length, 11);
  t.ok("todas com livro e página entre 378 e 381", novos.every((k) => V.EQUIPAMENTOS[k].pagina >= 378 && V.EQUIPAMENTOS[k].pagina <= 381 && V.EQUIPAMENTOS[k].texto.length > 40));
  const nomesArmas = Object.values(V.ARMAS).map((a) => U0.chaveDeBusca(a.nome));
  t.ok("sem duplicar as armas que já existiam (sopro de dragão, Raufoss, hafla, lança-chamas, Molotov, lançador de estacas)",
    !Object.values(V.EQUIPAMENTOS).some((x) => nomesArmas.indexOf(U0.chaveDeBusca(x.nome)) >= 0) && ["soproDeDragao", "raufoss", "hafla", "lancaChamas", "molotov", "lancadorDeEstacas"].every((k) => V.ARMAS[k] && V.ARMAS[k].pagina >= 380));
  t.ok("armas e armaduras da tabela de Conflito com a página (304)", ["impactoLeve", "disparoPesado"].every((k) => V.ARMAS[k].pagina === 304) && V.ARMADURAS.kevlar.pagina === 304);
  for (const termo of ["Caoscópio", "MirasX", "Saco Antissol", "Lançador de redes", "Urna Ancestral", "Dinheiro Velho"]) {
    t.ok("a busca acha " + termo, busca("vampiro", "equipamentos", termo).length === 1);
  }
  t.ok("o sobrenatural diz que a mecânica fica com o Narrador", /a cargo do Narrador/.test(tudo(busca("vampiro", "equipamentos", "Terra da Sepultura")[0].detalhes())));
  const caos = tudo(busca("vampiro", "equipamentos", "caoscopio")[0].detalhes());
  t.ok("Caoscópio: Inteligência + Percepção, Dificuldade 6, p. 378", /Inteligência \+ Percepção/.test(caos) && /Dificuldade 6/.test(caos) && /p\. 378/.test(caos));
}

t.grupo("Vampiro V5 · Projetos e Jogo Ponderado");
{
  const mesa = PC.entradasDe("vampiro", "mesa");
  t.igual("duas referências", mesa.map((x) => x.nome), ["Projetos", "Orientação para o Jogo Ponderado"]);
  t.igual("páginas do livro", [V.REFERENCIAS_DA_MESA.projetos.paginas, V.REFERENCIAS_DA_MESA.jogoPonderado.paginas], ["415–418", "419–423"]);
  const proj = tudo(mesa[0].detalhes());
  t.ok("Projetos: Escopo, Lançamento (Escopo + 2), Dado do Projeto em 10", /Escopo/.test(proj) && /Escopo \+ 2/.test(proj) && /começa em 10/.test(proj));
  t.ok("a busca acha a Carta X e Linhas e Véus", busca("vampiro", "mesa", "Carta X").length === 1 && busca("vampiro", "mesa", "Linhas e Véus").length === 1);
}

t.grupo("Tormenta20 · os mesmos dados da ficha e da Mesa");
{
  const T = (m) => globalThis["RAMATormenta20" + m];
  const n = (cat) => PC.entradasDe("tormenta20", cat).length;
  t.igual("17 raças e 14 classes", [n("racas"), n("classes")], [17, 14]);
  t.igual("origens do básico + a origem própria", n("origens"), T("Origens").ORIGENS.length + 1);
  t.igual("as 20 divindades", n("divindades"), T("Deuses").DEUSES.length);
  t.igual("todas as magias (1º ao 5º círculo)", n("magias"), T("Magias").MAGIAS.length);
  t.ok("magias filtram por tipo, círculo e escola", PC.entradasDe("tormenta20", "magias").every((x) => x.f.tipo && /º círculo/.test(x.f.circulo) && x.f.escola));
  const bola = tudo(busca("tormenta20", "magias", "Bola de Fogo")[0].detalhes());
  t.ok("a consulta da magia mostra os aprimoramentos e a página", /Aprimoramentos/.test(bola) && /PM/.test(bola) && /p\. \d+/.test(bola));
  t.ok("poderes gerais e de classe, com requisitos em texto", n("poderes") > T("Poderes").PODERES.length && /Destreza|Força|nível|treinado/.test(PC.entradasDe("tormenta20", "poderes").map((x) => x.linha).join(" ")));
  t.igual("as 80 ameaças com ND (nativo)", n("ameacas"), T("Ameacas").AMEACAS.length);
  const kobold = PC.entradasDe("tormenta20", "ameacas").filter((x) => /ND 1\/4|ND 1\/2/.test(x.marcas.join(" ")));
  t.ok("ND fracionário aparece como fração", kobold.length > 0);
  const ficha = tudo(PC.entradasDe("tormenta20", "ameacas")[0].detalhes());
  t.ok("a ficha de ameaça tem Defesa, PV, resistências e ataques", /Defesa/.test(ficha) && /PV/.test(ficha) && /Fort/.test(ficha) && /Ataques/.test(ficha));
  t.ok("perigos: armadilhas, perigos complexos, doenças e ambiente", ["Armadilha", "Perigo complexo", "Doença", "Ambiente"].every((k) => PC.entradasDe("tormenta20", "perigos").some((x) => x.f.tipo === k)));
  t.ok("condições, manobras, parceiros e a tabela de NPC", ["Condição", "Manobra", "Parceiro", "Tabela"].every((k) => PC.entradasDe("tormenta20", "regras").some((x) => x.f.tipo === k)));
  t.ok("equipamento inclui materiais especiais e melhorias", ["Material especial", "Melhoria (superior)", "Escudo", "Munição"].every((k) => PC.entradasDe("tormenta20", "equipamento").some((x) => x.f.tipo === k)));
  t.ok("ameaças: Copiar para o Homebrew", /Copiar para o Homebrew/.test(fonteDaPagina) && /sistema: "tormenta20"/.test(fonteDaPagina));
}

t.grupo("Outros sistemas · os dados das fichas e das campanhas");
{
  t.ok("Oblívio: 31 equipamentos + 15 modificações", PC.entradasDe("oblivio", "equipamentos").length === globalThis.RAMAOblivioCatalogo.EQUIPAMENTOS.length + globalThis.RAMAOblivioCatalogo.MODIFICACOES.length);
  t.ok("Oblívio: habilidades com o papel", PC.entradasDe("oblivio", "habilidades").some((x) => /Quem Age/.test(x.linha)));
  t.ok("Vampiro: Alquimia separada das Disciplinas", PC.entradasDe("vampiro", "disciplinas").every((x) => x.f.disciplina !== "alquimia") && PC.entradasDe("vampiro", "alquimia").length >= 7);
  t.ok("Goblins: ocupações com as técnicas na consulta", /Mestre de Armas/.test(tudo(PC.entradasDe("goblins", "ocupacoes").filter((x) => x.nome === "Mercenário")[0].detalhes())));
  t.ok("Goblins: tabelas de aventura (inspiração, viajantes, masmorras)", ["Inspiração", "Viajantes", "Templo Esquecido"].every((n) => busca("goblins", "aventuras", n).length >= 1));
  t.ok("criaturas nativas com a ficha completa (fichas-nativas)", /RAMAFichasNativas\.(oblivio|vampiro|goblins)/.test(fonteDaPagina));
}

t.grupo("BRUTAL · os mesmos dados da ficha e da Mesa da Diretora");
{
  const BRC = globalThis.RAMABrutalCatalogo;
  const detalheDe = (cat, nome) => tudo(PC.entradasDe("brutal", cat).filter((x) => x.nome === nome)[0].detalhes());
  t.igual("8 Arquétipos", PC.entradasDe("brutal", "arquetipos").length, 8);
  t.ok("Valentona: Firme e Potente, Cara Lavada", /Firme e Potente/.test(detalheDe("arquetipos", "Valentona")) && /Cara Lavada/.test(detalheDe("arquetipos", "Valentona")));
  t.igual("5 Estilos", PC.entradasDe("brutal", "estilos").length, 5);
  t.igual("8 Vantagens (3 Gerais + 5 de Estilo)", PC.entradasDe("brutal", "vantagens").length, BRC.ORDEM_VANTAGENS.length);
  t.ok("Tratar Feridas mostra a lacuna do custo", /Lacuna/.test(detalheDe("vantagens", "Tratar Feridas")));
  t.igual("Ações: 6 de Encontro + 12 do Assassino", PC.entradasDe("brutal", "acoes").length, 18);
  t.ok("Assassinos: os 4 prontos, Ameaças, Apavoros e Intentos", ["Bruto", "Sangria", "Rato", "Profeta", "Brutamontes", "Buh!"].every((n) => busca("brutal", "assassinos", n).length >= 1));
  t.ok("filtro por Estilo nos Arquétipos (vários valores)", PC.entradasDe("brutal", "arquetipos").filter((x) => String(x.f.estilo).split(",").indexOf("Sagaz") >= 0).length === 4);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
