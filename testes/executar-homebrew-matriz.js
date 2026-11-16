/* =====================================================================
   R.A.M.A. — testes: matriz de regressão do Homebrew por sistema (v9.36)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-matriz.js
       deno run --allow-read --allow-write=docs testes/executar-homebrew-matriz.js --gerar

   Para CADA sistema e CADA tipo/subtipo que o adaptador oferece:
     - o servidor aceita o tipo (TIPOS_HOMEBREW, ESTRUTURAIS_POR_SISTEMA)
       e a lista do adaptador é a mesma do servidor;
     - os pacotes listam o tipo;
     - o destino na ficha do próprio sistema diz o que entra (nativo ou
       Manual, sempre com o texto); em outro sistema, "incompatível"
       (o R.A.M.A. não converte); Universal entra como Manual, com o texto;
     - o pacote aceita no próprio sistema e recusa em outro.
   Com --gerar, escreve docs/HOMEBREW-COBERTURA.md (o inventário de
   cobertura: tipo, editor, destino, automação e pontos manuais) a partir
   dos mesmos adaptadores — o documento não fica desatualizado.
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
};
const G = globalThis, A = G.RAMAHomebrewAdaptadores, P = G.RAMAPacotesHomebrew;

/* O que o servidor aceita, lido do próprio Codigo.gs. */
const codigo = await Deno.readTextFile(new URL("../backend/Codigo.gs", import.meta.url));
const TIPOS_SERVIDOR = (0, eval)(codigo.match(/var TIPOS_HOMEBREW = (\[[^\]]*\]);/)[1]);
const EST_SERVIDOR = (0, eval)("(" + codigo.match(/var ESTRUTURAIS_POR_SISTEMA = (\{[^;]*\});/)[1] + ")");

/* Exemplos completos onde o destino depende do conteúdo. */
const EXEMPLOS = {
  "vampiro|habilidade|disciplina": { disciplina: "auspicios", nivel: 1 },
  "goblins|habilidade|magia": { r0: "Explode.", r1: "Faísca.", r2: "Fogo.", r3: "Inferno." },
  "tormenta20|habilidade|poder": { grupo: "geral" },
};
const registro = (s, g, st) => ({ id: "matriz-" + s + "-" + st, nome: "Exemplo " + st, descricao: "Sintético.", modelo: { versao: 1, sistema: s, grupo: g, subtipo: st, def: EXEMPLOS[s + "|" + g + "|" + st] || {} } });
const SISTEMAS = Object.keys(A.SISTEMAS);
const DE_SISTEMA = SISTEMAS.filter((s) => s !== "universal");
const GRUPOS = ["item", "habilidade", "estrutural"];
const linhas = [];

for (const s of SISTEMAS) {
  t.grupo(P.nomeDoSistema(s));
  const est = A.subtipos(s, "estrutural").map((x) => x.chave);
  if (s !== "universal") {
    const srv = EST_SERVIDOR[s] || [];
    t.ok("os tipos estruturais do adaptador são os que o servidor aceita", est.slice().sort().join() === srv.slice().sort().join(), "adaptador " + est.join(",") + " · servidor " + srv.join(","));
    t.ok("  cada um está em TIPOS_HOMEBREW, nos pacotes e é lido como estrutural sem o modelo", est.every((k) => TIPOS_SERVIDOR.indexOf(k) >= 0 && P.TIPOS.some((x) => x.chave === k) && A.grupoDe({ tipo: k }) === "estrutural"), est.filter((k) => !(TIPOS_SERVIDOR.indexOf(k) >= 0 && P.TIPOS.some((x) => x.chave === k) && A.grupoDe({ tipo: k }) === "estrutural")).join(","));
  }
  let semTexto = [], converte = [], pacote = [];
  for (const g of GRUPOS) {
    for (const spec of A.subtipos(s, g)) {
      const reg = registro(s, g, spec.chave);
      const d = A.destinoNaFicha(reg, s === "universal" ? "universal" : s);
      if (!d || !d.texto || ["nativo", "manual", "outro"].indexOf(d.modo) < 0) semTexto.push(g + "/" + spec.chave);
      for (const outro of DE_SISTEMA) {
        if (outro === s) continue;
        const d2 = A.destinoNaFicha(reg, outro);
        if (s === "universal" ? d2.modo !== "manual" && g !== "criatura" : d2.modo !== "incompativel" && g !== "criatura") converte.push(g + "/" + spec.chave + "→" + outro + ":" + d2.modo);
      }
      const pc = A.compativelComPacote(reg, s === "universal" ? "ordem" : s), pcOutro = A.compativelComPacote(reg, s === "ordem" ? "goblins" : "ordem");
      if (!pc || !pc.ok || (s !== "universal" && pcOutro && pcOutro.ok)) pacote.push(g + "/" + spec.chave);
      const editor = g === "estrutural" ? ((spec.campos || []).length ? "editor de campos" : "editor próprio (por etapas)") : (s === "ordem" && spec.chave === "ritual" ? "editor de rituais" : s === "ordem" && (spec.chave === "poderParanormal" || spec.chave === "poderClasse") ? "editor próprio (por etapas)" : "editor de campos");
      linhas.push({ s, g, st: spec.chave, rotulo: spec.rotulo, editor, modo: d ? d.modo : "?", texto: d ? d.texto : "" });
    }
  }
  t.ok("todo tipo diz o que entra na ficha do sistema (nativo ou Manual, com o texto)", !semTexto.length, semTexto.join(", "));
  t.ok(s === "universal" ? "  Universal entra nos outros sistemas como Manual (com o texto), sem converter regras" : "  em outro sistema: incompatível (o R.A.M.A. não converte)", !converte.length, converte.slice(0, 6).join(", "));
  t.ok("  o pacote aceita no próprio sistema" + (s === "universal" ? "" : " e recusa em outro"), !pacote.length, pacote.join(", "));
}

t.grupo("Ações Universais: recursos nativos por sistema");
{
  const F = G.RAMAFicha, Rc = G.RAMAHomebrewRecursos;
  const comRecurso = DE_SISTEMA.filter((s) => Rc.SISTEMAS[s] && Rc.SISTEMAS[s].aplicar);
  const semRecurso = DE_SISTEMA.filter((s) => !(Rc.SISTEMAS[s] && Rc.SISTEMAS[s].aplicar));
  t.ok("todo sistema tem adaptador de recursos (com recursos ou com o motivo)", DE_SISTEMA.every((s) => Rc.SISTEMAS[s] && (Rc.SISTEMAS[s].aplicar || Rc.SISTEMAS[s].sem)), DE_SISTEMA.filter((s) => !Rc.SISTEMAS[s]).join(","));
  linhas.recursos = { com: comRecurso, sem: semRecurso.map((s) => [s, Rc.SISTEMAS[s].sem]) };
  t.ok("  sem recurso nativo só Oblívio e BRUTAL (o motivo aparece)", semRecurso.slice().sort().join() === "brutal,oblivio", semRecurso.join(","));
  void F;
}

if (Deno.args.indexOf("--gerar") >= 0) {
  const nomeG = { item: "Item", habilidade: "Habilidade", estrutural: "Tipo estrutural" };
  const nomeM = { nativo: "Nativo", manual: "Manual", outro: "Fora da ficha" };
  let md = "# Homebrew — inventário de cobertura\n\n" +
    "Gerado por `testes/executar-homebrew-matriz.js --gerar` a partir dos\nadaptadores (`js/homebrew-adaptadores.js`): o que cada sistema oferece,\nem que editor, onde entra na ficha e o que fica com a mesa. A mesma\nsuíte confere, a cada execução, que o servidor e os pacotes aceitam\ncada tipo e que nenhum sistema converte conteúdo de outro.\n\n" +
    "Criaturas entram no combate, nos aliados e na consulta (os editores de\ncriatura de cada sistema), não na ficha de personagem.\n";
  for (const s of SISTEMAS) {
    md += "\n## " + P.nomeDoSistema(s) + "\n\n| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |\n|---|---|---|---|---|\n";
    linhas.filter((l) => l.s === s).forEach((l) => { md += "| " + nomeG[l.g] + " | " + l.rotulo + " | " + l.editor + " | " + (nomeM[l.modo] || l.modo) + " | " + l.texto.replace(/\|/g, "/") + " |\n"; });
  }
  md += "\n## Ações do Modelo Universal\n\nAs ações (custo, teste, efeito em recurso, usos) rodam em toda ficha\n(`js/homebrew-recursos.js`). Com recursos nativos: " + linhas.recursos.com.map((s) => P.nomeDoSistema(s)).join(", ") + ".\n\n";
  linhas.recursos.sem.forEach((x) => { md += "- **" + P.nomeDoSistema(x[0]) + "**: " + x[1] + "\n"; });
  md += "\nUm recurso que a ficha não tem pelo nome, a pessoa escolhe na lista\n(nada é ligado por nome parecido). Num teste, Ordem e Tormenta20 deixam\nsomar uma perícia nativa. O id da operação evita gravar duas vezes onde\no motor tem id (Ordem II, Tormenta20, Goblins, Vampiro).\n";
  await Deno.writeTextFile(new URL("../docs/HOMEBREW-COBERTURA.md", import.meta.url), md);
  console.log("\ndocs/HOMEBREW-COBERTURA.md escrito (" + linhas.length + " linhas).");
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
