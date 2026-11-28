/* =====================================================================
   R.A.M.A. — testes da Ajuda e dos tutoriais (sem navegador)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ajuda.js

   Confere o conteúdo, não a tela: artigos com id único e relacionados
   que existem; todo bloco com a fonte dele (livro com nome e edição;
   página só no formato impresso, nunca estimada); a busca por tarefa e
   por sintoma; um tutorial (artigo + percurso + ficha de exemplo) para
   cada sistema registrado em js/sistemas.js, e cada ficha de exemplo
   normalizando no próprio sistema; o "Ajuda desta tela" apontando para
   guias que existem; e o roteiro do tutorial inicial com as oito etapas.
   ===================================================================== */

import { carregarMotores, receitas } from "./gerar-demos-ajuda.js";

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0; const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
};
const RAIZ = new URL("../", import.meta.url);

await carregarMotores();
(0, eval)(await Deno.readTextFile(new URL("js/ajuda/artigos.js", RAIZ)));
const A = globalThis.RAMAAjuda;
const S = globalThis.RAMASistemas;

console.log(`${FORTE}R.A.M.A. — Ajuda e tutoriais${FIM}`);

t.grupo("Artigos");
const ids = A.ARTIGOS.map((a) => a.id);
t.ok("ids únicos", new Set(ids).size === ids.length);
t.ok("área conhecida em todo artigo", A.ARTIGOS.every((a) => A.AREAS.some((x) => x.chave === a.area)));
t.ok("relacionados apontam para artigos que existem", A.ARTIGOS.every((a) => (a.relacionados || []).every((r) => ids.includes(r))), A.ARTIGOS.filter((a) => (a.relacionados || []).some((r) => !ids.includes(r))).map((a) => a.id).join(","));
t.ok("todo artigo tem título, resumo e termos", A.ARTIGOS.every((a) => a.titulo && a.resumo && (a.termos || []).length));
t.ok("cada área principal tem guias", ["personagens", "campanhas", "catalogo", "homebrew", "perfil", "faq", "primeiros-passos"].every((ar) => A.ARTIGOS.some((a) => a.area === ar)));

t.grupo("Fontes");
const blocos = A.ARTIGOS.flatMap((a) => a.blocos.map((b) => ({ a, b })));
t.ok("todo bloco diz a fonte", blocos.every(({ b }) => b.fonte), blocos.filter(({ b }) => !b.fonte).map(({ a }) => a.id).join(","));
const livros = blocos.filter(({ b }) => !b.fonte.rama);
t.ok("fonte de livro tem nome", livros.every(({ b }) => b.fonte.livro && b.fonte.livro.length > 5));
t.ok("página no formato impresso (p. N, p. N–M, p. N, N e N)", livros.every(({ b }) => !b.fonte.paginas || /^p\. \d+([–-]\d+)?((, \d+([–-]\d+)?)*( e \d+([–-]\d+)?)?)$/.test(b.fonte.paginas)), livros.filter(({ b }) => b.fonte.paginas && !/^p\. \d/.test(b.fonte.paginas)).map(({ b }) => b.fonte.paginas).join("; "));
t.ok("nenhuma página estimada", !JSON.stringify(A.ARTIGOS).match(/aprox|cerca de p|~ ?p\./i));
t.ok("sem página: só o livro e uma seção", livros.every(({ b }) => b.fonte.paginas || b.fonte.secao || b.fonte.interpretacao));
t.ok("conteúdo de fã marcado como tal", livros.filter(({ b }) => /Melhor Amigo/.test(b.fonte.livro)).every(({ b }) => b.fonte.fa) && /fã, não oficial/.test(A.textoDaFonte({ livro: "X", fa: true })));
t.ok("interpretação do RAMA marcada", /Interpretação do RAMA/.test(A.textoDaFonte(blocos.find(({ b }) => b.fonte.interpretacao).b.fonte)));
t.ok("trecho de plataforma: Funcionamento do RAMA", A.textoDaFonte({ rama: true }) === "Funcionamento do RAMA");
const ritual = A.artigo("adicionar-ritual");
t.ok("artigo com regras de fontes diferentes: cada trecho com a sua", new Set(ritual.blocos.map((b) => A.textoDaFonte(b.fonte))).size === ritual.blocos.length);
t.ok("Ordem II explica os playtests e a regra unificada", (() => { const o2 = A.artigo("tutorial-ordem2"); return o2.blocos.some((b) => /Alpha/.test(b.fonte.livro || "")) && o2.blocos.some((b) => /Beta/.test(b.fonte.livro || "")) && o2.blocos.some((b) => b.fonte.interpretacao); })());

t.grupo("Busca por tarefa e sintoma");
const primeiro = (q) => (A.buscar(q)[0] || {}).id;
const entre = (q, id, n) => A.buscar(q).slice(0, n || 3).some((a) => a.id === id);
t.ok("“compartilhar” → Compartilhar uma ficha", primeiro("compartilhar") === "compartilhar-ficha");
t.ok("“mestre” → Começar como mestre", entre("mestre", "comecar-mestre", 2));
t.ok("“compartilhar com o mestre” → vínculo e compartilhamento", entre("compartilhar com o mestre", "vincular-personagem") && entre("compartilhar com o mestre", "compartilhar-ficha"));
t.ok("“não consigo editar” → o sintoma", primeiro("não consigo editar") === "faq-nao-consigo-editar");
t.ok("“nao consigo editar” sem acento também", primeiro("nao consigo editar") === "faq-nao-consigo-editar");
t.ok("“somente leitura” → o sintoma", primeiro("somente leitura") === "faq-nao-consigo-editar");
t.ok("“importar ficha” → Importar e exportar", primeiro("importar ficha") === "importar-ficha");
t.ok("“adicionar ritual” → Adicionar ritual", primeiro("adicionar ritual") === "adicionar-ritual");
t.ok("“vampiro” acha o tutorial do sistema", entre("vampiro", "tutorial-vampiro", 2));
t.ok("busca sem resultado volta vazia (a tela oferece caminhos)", A.buscar("qwertyzx").length === 0);

t.grupo("Tutoriais por sistema");
const sistemas = S.lista().map((s) => s.id);
globalThis.document = globalThis.document || {};
(0, eval)(await Deno.readTextFile(new URL("js/ajuda/tutoriais-sistemas.js", RAIZ)));
(0, eval)(await Deno.readTextFile(new URL("js/ajuda/demos.js", RAIZ)));
const TS = globalThis.RAMAAjudaTutoriaisSistemas;
for (const id of sistemas) {
  const art = A.artigo("tutorial-" + id);
  const p = TS.percurso(id);
  t.ok(S.de(id).nome + (S.de(id).edicao ? " (" + S.de(id).edicao + ")" : "") + ": artigo, percurso com etapa de teste e fim", !!art && !!p && p.passos.length >= 4 && p.passos.some((x) => x.id === "teste") && p.passos[p.passos.length - 1].final);
  t.ok("  o artigo aponta para a ficha de exemplo do sistema", (art.acoes || []).some((x) => x.href === "ficha/?demo=" + id));
  t.ok("  o nome no artigo traz a edição", !S.de(id).edicao || art.titulo.includes(S.de(id).edicao.replace("3ª ed.", "3ª ed")) || art.titulo.includes(S.de(id).edicao), art.titulo);
}
t.ok("nenhum percurso para sistema que não existe", TS.SISTEMAS.every((id) => sistemas.includes(id)));

t.grupo("Fichas de exemplo");
const F = globalThis.RAMAFicha;
const r = receitas();
for (const id of Object.keys(r)) {
  const arq = JSON.parse(await Deno.readTextFile(new URL("assets/ajuda/demos/" + id + ".json", RAIZ)));
  const n = F.normalizarFicha(JSON.parse(JSON.stringify(arq.ficha)));
  t.ok(id + ": o arquivo normaliza no próprio sistema", n.tipoFicha === id && F.sistemaDe(n).id === id && !!n[S.de(id).ficha.bloco]);
  t.ok("  está em dia com o gerador (schema e motor)", arq.ficha.schemaVersion === F.VERSAO_SCHEMA, "rode testes/gerar-demos-ajuda.js");
  if (arq.foto) t.ok("  a foto existe no projeto", await Deno.stat(new URL(arq.foto, RAIZ)).then(() => true, () => false));
}
t.ok("todo sistema com motor tem ficha de exemplo", sistemas.filter((id) => id !== "universal").every((id) => Object.keys(r).includes(id)));
const U = globalThis.RAMAAjudaDemos.universal();
t.ok("Universal do tutorial inicial: atributos, recursos, perícias, habilidades e itens preenchidos",
  U.ficha.tipoFicha === "universal" && U.ficha.atributos.some((a) => a.valor > 0) && U.ficha.status.every((s) => s.maximo > 0) &&
  U.ficha.pericias.length >= 6 && globalThis.RAMAHabilidades.contar(U.ficha.habilidades).habilidades >= 3 && U.ficha.inventario.itens.length >= 5);
t.ok("  a arma usa uma perícia da ficha", U.ficha.inventario.itens.some((i) => i.tipo === "arma" && U.ficha.pericias.some((p) => p.id === i.periciaId)));
t.ok("  cada abertura é uma demonstração nova (ids novos)", globalThis.RAMAAjudaDemos.universal().ficha.pericias[0].id !== U.ficha.pericias[0].id);

t.grupo("Ajuda desta tela e tutorial inicial");
const app = await Deno.readTextFile(new URL("js/app.js", RAIZ));
const mapa = app.match(/AJUDA_DA_SECAO = \{([^}]*)\}/)[1];
const destinos = [...mapa.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
t.ok("cada seção aponta para um guia que existe", destinos.length >= 6 && destinos.every((d) => ids.includes(d)), destinos.filter((d) => !ids.includes(d)).join(","));
const ficha = await Deno.readTextFile(new URL("js/paginas/ficha.js", RAIZ));
t.ok("a ficha aponta para um guia que existe", ids.includes(ficha.match(/definirAjuda\("([a-z0-9-]+)"\)/)[1]));
t.ok("Ajuda na navegação principal", /chave: "ajuda",\s+rotulo: "Ajuda"/.test(app));
globalThis.RAMAAuth = { tutorialPendente: () => true };
(0, eval)(await Deno.readTextFile(new URL("js/ajuda/tutorial-inicial.js", RAIZ)));
const TI = globalThis.RAMAAjudaTutorialInicial;
const passos = TI.passos({ revisao: false });
t.ok("oito etapas, a última com a conclusão", passos.length === 8 && passos[7].final);
t.ok("práticas: recurso, rolagem, habilidade e item, permissão, personalização", ["modos", "rolagem", "habilidade-item", "campanhas", "personalizar"].every((id) => passos.find((p) => p.id === id && p.tarefa)));
t.ok("a abertura fala do livro do sistema", /livro ou o PDF/.test(passos[0].texto.join(" ")));
globalThis.location = { search: "?voltar=" + encodeURIComponent("ficha/?id=abc") };
t.igual = (n, a, b) => t.ok(n, a === b, a + " ≠ " + b);
t.igual("voltar: destino do próprio site é aceito", TI.destino(), "ficha/?id=abc");
for (const ruim of ["https://outro.site/", "//outro.site", "/ficha/?id=1", "ficha/?tutorial=inicial", "javascript:alert(1)"]) {
  globalThis.location = { search: "?voltar=" + encodeURIComponent(ruim) };
  t.igual("voltar: recusa " + ruim, TI.destino(), "");
}

console.log(`\n${FORTE}${passaram} ok${FIM}${falharam ? `, ${VERMELHO}${falharam} falharam${FIM}: ${falhas.join("; ")}` : ""}`);
if (falharam) Deno.exit(1);
