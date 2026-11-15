/* =====================================================================
   R.A.M.A. — testes: Arquétipo e Estilo Homebrew de BRUTAL (v9.18)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-brutal.js

   Pelo catálogo, pela ficha e pela MESA de BRUTAL (os três rodam no
   Apps Script): chave versionada do Arquétipo, estável do Estilo; a
   cópia na ficha; o resumo leva a cópia e a mesa a registra; Estilo
   Homebrew reduz a Dificuldade; a Iniciativa pelo número.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
globalThis.navigator = globalThis.navigator || { onLine: true };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/brutal/catalogo.js", "js/brutal/regras.js", "js/brutal/mesa.js", "js/brutal/homebrew-brutal.js",
  "js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/homebrew-adaptadores.js", "js/pacotes-homebrew.js"];
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
const G = globalThis, K = G.RAMABrutalCatalogo, R = G.RAMABrutal, M = G.RAMABrutalMesa, H = G.RAMABrutalHomebrew, A = G.RAMAHomebrewAdaptadores;
const copia = (x) => JSON.parse(JSON.stringify(x));

t.grupo("Arquétipo e Estilo Homebrew · definição");
const est = K.normalizarEstiloHomebrew({ nome: "Estiloso", homebrewId: "e5e5e5e5-sintetico", texto: "Chamar atenção e brilhar." });
t.ok("Estilo: chave estável (sem versão)", est.chave === "hbbe-e5e5e5e5sint" && K.normalizarEstiloHomebrew({ nome: "Outro nome", homebrewId: "e5e5e5e5-sintetico" }).chave === est.chave, est.chave);
K.registrarEstiloHomebrew(est);
const arqB = { nome: "Vlogueira", homebrewId: "f6f6f6f6-sintetico", adjetivos: "Curiosa · Barulhenta · Leal", cor: "#FF8800", iniciativa: 2, resumo: "Grava tudo.",
  estilos: [est.chave, "ligeiro", "potente", "naoExiste"], habilidade: { nome: "Ao Vivo", cena: "Sem restrição", recarga: "inicioSessao", texto: "Uma vez por sessão, todos ouvem." } };
const vlog = K.normalizarArquetipoHomebrew(arqB);
t.ok("Arquétipo: chave hbba-<id>-<hash>, dois Estilos válidos, cor, Habilidade com chave", /^hbba-f6f6f6f6-/.test(vlog.chave) && vlog.estilos.join() === est.chave + ",ligeiro" && vlog.cor === "#ff8800" && vlog.habilidade.chave === vlog.chave + "-h" && vlog.habilidade.recarga === "inicioSessao");
const semC = copia(vlog); delete semC.chave;
t.ok("normalizar de novo dá a mesma chave", K.normalizarArquetipoHomebrew(Object.assign(semC, { chave: "" })).chave === vlog.chave);
K.registrarArquetipoHomebrew(vlog);
t.ok("listas: arquétipos e estilos disponíveis (os do livro intactos)", K.arquetiposDisponiveis().indexOf(vlog.chave) === 8 && K.ORDEM_ARQUETIPOS.length === 8 && K.estilosDisponiveis().indexOf(est.chave) === 5 && K.ORDEM_ESTILOS.length === 5);
t.ok("Iniciativa pelo número: depois da Atleta (2º), antes da Valentona (3º)", (() => { const o = K.arquetiposPorIniciativa(); return o.indexOf(vlog.chave) === o.indexOf("atleta") + 1 && o.indexOf("valentona") === o.indexOf(vlog.chave) + 1; })());

t.grupo("Arquétipo Homebrew · ficha e mesa");
const f = R.normalizar({ arquetipo: vlog.chave });
t.ok("a ficha guarda a cópia do Arquétipo e do Estilo Homebrew dele", f.arquetipo === vlog.chave && f.homebrew.arquetipos[vlog.chave].nome === "Vlogueira" && f.homebrew.estilos[est.chave].nome === "Estiloso");
t.ok("normalizar de novo mantém", R.normalizar(copia(f)).homebrew.arquetipos[vlog.chave]);
const res = R.resumoParaMesa(f);
t.ok("o resumo para a mesa leva a cópia (e os Estilos)", res.arquetipo === vlog.chave && res.homebrew && res.homebrew.arquetipos[vlog.chave] && res.estilos.join() === est.chave + ",ligeiro" && res.iniciativa === 2);
t.ok("sem cópia e sem catálogo: some", R.normalizar({ arquetipo: "hbba-zzzzzzzz-abcdef" }).arquetipo === "");
/* Uma mesa "nova" (catálogo sem o Arquétipo): a cópia vinda do resumo registra. */
delete K.ARQUETIPOS[vlog.chave]; delete K.ESTILOS[est.chave];
const e0 = M.sincronizarElenco(M.normalizar({}), [{ id: "p1", nome: "Lu", resumo: res }, { id: "p2", nome: "Bia", resumo: { arquetipo: "atleta" } }]);
t.ok("mesa: sincronizar registra a cópia do Arquétipo e guarda em estado.homebrew", e0.sobreviventes.p1.arquetipo === vlog.chave && e0.sobreviventes.p1.estilos.join() === est.chave + ",ligeiro" && e0.homebrew.arquetipos[vlog.chave]);
delete K.ARQUETIPOS[vlog.chave]; delete K.ESTILOS[est.chave];
const e1 = M.normalizar(copia(e0));
t.ok("mesa: normalizar (servidor) registra pela cópia e mantém a Sobrevivente", e1.sobreviventes.p1.arquetipo === vlog.chave && e1.sobreviventes.p1.estilos.indexOf(est.chave) >= 0 && e1.homebrew.estilos[est.chave]);
t.iguais("Estilo Homebrew da Sobrevivente reduz a Dificuldade em 1", [M.dificuldade(e1.sobreviventes.p1, est.chave, []).valor, M.dificuldade(e1.sobreviventes.p1, "", []).valor], [M.dificuldade(e1.sobreviventes.p1, "", []).valor - 1, K.LIMITES.dificuldade]);

t.grupo("Arquétipo e Estilo · biblioteca, arquivo, pacote e versão");
const limpa = (d) => { const x = copia(d); ["chave", "homebrewId", "homebrew", "nome", "pagina"].forEach((k) => delete x[k]); if (x.habilidade) delete x.habilidade.chave; return x; };
const gA = A.guardar("brutal", "estrutural", "arquetipo", { nome: "Vlogueira", descricao: "Grava tudo.", valores: {}, def: limpa(vlog) });
const gE = A.guardar("brutal", "estrutural", "estilo", { nome: "Estiloso", descricao: "", valores: {}, def: { texto: est.texto } });
t.ok("guardados: colunas \"arquetipo\" e \"estilo\"", gA.ok && gA.registro.tipo === "arquetipo" && gE.ok && gE.registro.tipo === "estilo");
t.ok("da biblioteca voltam com a mesma chave", H.deRegistro(Object.assign({}, gA.registro, { id: "f6f6f6f6-sintetico" })).def.chave === vlog.chave && H.deRegistro(Object.assign({}, gE.registro, { id: "e5e5e5e5-sintetico" })).def.chave === est.chave);
t.ok("destino e resumo", A.destinoNaFicha(gA.registro, "brutal").modo === "nativo" && A.destinoNaFicha(gA.registro, "goblins").modo === "incompativel" && /Iniciativa 2º/.test(A.resumo(gA.registro)));
const aA = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gA.registro), gA.registro))));
t.ok("exportar e importar: Estilos e Habilidade voltam", aA.ok && aA.dados.modelo.def.estilos.length === 2 && aA.dados.modelo.def.habilidade.recarga === "inicioSessao", JSON.stringify(aA.ok ? aA.dados.modelo.def : aA));
t.ok("pacote só de BRUTAL", A.compativelComPacote(gA.registro, "brutal").ok && !A.compativelComPacote(gE.registro, "ordem").ok && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "arquetipo"));
K.registrarEstiloHomebrew(est);
const vNova = K.normalizarArquetipoHomebrew(Object.assign(copia(arqB), { iniciativa: 5 }));
const fV = R.normalizar(copia(f));
const novas = H.versoesNovas(fV, { arquetipos: [vNova] });
t.ok("versão nova do Arquétipo: atualizar troca a chave e a cópia", novas.length === 1 && (() => { H.atualizarVersao(fV, novas[0]); const n = R.normalizar(fV); return n.arquetipo === vNova.chave && n.homebrew.arquetipos[vNova.chave].iniciativa === 5 && !n.homebrew.arquetipos[vlog.chave]; })());

t.grupo("Modelos de mesa e Vantagem Homebrew (v9.32)");
{
  const DIR = { diretora: true }, nada = () => { throw new Error("rolou"); };
  const am = K.normalizarAmeacaHomebrew({ nome: "Vidraceiro", homebrewId: "f1f1f1f1-sintetico", adjetivos: "Frio · Cortante · Paciente", texto: "Corta com cacos.", acoesUnicas: ["restringir", "segurar", "inventada"], intentoTexto: "Uma Sobrevivente se corta em vidro.", intentoPh: 2 });
  t.ok("Ameaça: chave hbbm-, Ações Únicas só do livro, Intento Único com PH", /^hbbm-f1f1f1f1-/.test(am.chave) && am.acoesUnicas.join() === "restringir,segurar" && am.intento === am.chave && am.intentoPh === 2);
  const ap = K.normalizarApavoroHomebrew({ nome: "Estilhaçar!", homebrewId: "f2f2f2f2-sintetico", cena: "Encontro", recarga: "fimEncontro", custo: 4, texto: "Todas descartam 1 dado." });
  t.ok("Apavoro: chave hbbp-, cena, recarga, custo", /^hbbp-f2f2f2f2-/.test(ap.chave) && ap.cena === "Encontro" && ap.custo === 4);
  const as = K.normalizarAssassinoHomebrew({ nome: "O Vidraceiro", homebrewId: "f3f3f3f3-sintetico", ameacas: [am.chave, "estrategico"], dados: 5, ph: 2, sustos: 2, acoesUnicas: ["restringir", "acidentar"], apavoro: ap.chave, resumo: "Mora numa vidraria." });
  t.ok("Assassino: chave hbbk-, aponta para a Ameaça e o Apavoro Homebrew", /^hbbk-f3f3f3f3-/.test(as.chave) && as.ameacas[0] === am.chave && as.apavoro === ap.chave);
  const hbMesa = { ameacas: { [am.chave]: am }, apavoros: { [ap.chave]: ap }, assassinos: { [as.chave]: as } };
  const e = M.estadoVazio();
  M.sincronizarElenco(e, [{ id: "p1", nome: "Lu", resumo: { arquetipo: "atleta" } }]);
  const r = M.aplicar(e, { tipo: "configurarAssassino", modelo: as.chave, aplicarPilha: true, homebrew: hbMesa }, DIR, nada);
  t.ok("configurar o Assassino Homebrew: os valores do modelo (como os prontos)", r.ok && e.assassino.modelo === as.chave && e.assassino.ameacas[0] === am.chave && e.assassino.apavoro === ap.chave && e.diretora.pilha === 5 && e.diretora.ph === 2, JSON.stringify(r.ok ? e.assassino : r));
  t.ok("  a mesa guarda as cópias dos três modelos", e.homebrew && e.homebrew.assassinos[as.chave] && e.homebrew.ameacas[am.chave] && e.homebrew.apavoros[ap.chave]);
  const e2 = M.normalizar(copia(e));
  t.ok("  reaberta (o servidor, sem a biblioteca): continua com o Assassino e as cópias", e2.assassino.modelo === as.chave && e2.assassino.ameacas[0] === am.chave && e2.homebrew.apavoros[ap.chave]);
  const semEncontro = M.aplicar(e, { tipo: "apavoroHomebrew" }, DIR, nada);
  t.ok("Apavoro de Encontro fora de Encontro: recusado, com o motivo", !semEncontro.ok && /Encontro/.test(semEncontro.motivo));
  const e3 = copia(e); e3.encontro = { rodada: 1, participantes: ["p1"], ordem: ["p1", "assassino"], vez: 0, meta: 3 }; e3.diretora.ph = 5;
  const u1 = M.aplicar(e3, { tipo: "apavoroHomebrew" }, DIR, nada), u2 = M.aplicar(e3, { tipo: "apavoroHomebrew" }, DIR, nada);
  t.ok("  num Encontro: paga os 4 PH, marca o uso e recusa o segundo (volta no fim do Encontro)", u1.ok && e3.diretora.ph === 1 && e3.diretora.usos[ap.chave] && !u2.ok, JSON.stringify([u1, u2]));
  const ph0 = e.diretora.ph;
  const it = M.aplicar(e, { tipo: "intentoUnicoHomebrew" }, DIR, nada);
  t.ok("Intento Único Homebrew: a Diretora marca e ganha os PH", it.ok && e.diretora.ph === ph0 + 2);
  t.ok("  só a Diretora (as operações novas estão na lista dela)", M.OPS_DA_DIRETORA.indexOf("apavoroHomebrew") >= 0 && M.OPS_DA_DIRETORA.indexOf("intentoUnicoHomebrew") >= 0 && !M.aplicar(e, { tipo: "intentoUnicoHomebrew" }, { diretora: false, sobrevivente: "p1" }, nada).ok);
  const gV = A.guardar("brutal", "habilidade", "vantagem", { nome: "Respirar Fundo", descricao: "Recupera o fôlego.", valores: { estilo: "firme", custo: 3, recarga: "fimEncontro", efeito: "dado", valor: 1 } });
  const xv = gV.ok ? H.deRegistro(Object.assign({}, gV.registro, { id: "f4f4f4f4-sintetico" })) : null;
  t.ok("Vantagem: vira uma Vantagem da mesa (Estilo, custo, recarga, efeito)", xv && xv.tipo === "vantagem" && xv.def.custo === 3 && xv.def.efeito === "dado" && xv.def.estilo === "firme", JSON.stringify(xv));
  const rv = M.aplicar(e, { tipo: "vantagemDaMesa", vantagem: Object.assign({}, xv.def, { id: "" }) }, DIR, nada);
  t.ok("  a Diretora traz para a mesa (o motor aplica como as da mesa)", rv.ok && e.vantagensDaMesa.some((v) => v.nome === "Respirar Fundo" && v.efeito === "dado"));
  const velho = H.deRegistro({ id: "x", nome: "Antiga", descricao: "Texto.", modelo: { sistema: "brutal", grupo: "habilidade", subtipo: "vantagem", def: { tensao: "2", janela: "uma vez por cena" } } });
  t.ok("  um registro antigo (Tensão e janela em texto): custo 2, efeito manual, a janela no texto", velho.def.custo === 2 && velho.def.efeito === "manual" && /Janela: uma vez por cena/.test(velho.def.texto));
  const gA = A.guardar("brutal", "estrutural", "assassino", { nome: "O Vidraceiro", descricao: "Mora numa vidraria.", valores: {}, def: (() => { const x = copia(as); ["chave", "homebrewId", "homebrew", "nome", "pagina", "resumo"].forEach((k) => delete x[k]); return x; })() });
  t.ok("biblioteca: o Assassino volta com a mesma chave; destino nativo; pacote", gA.ok && H.deRegistro(Object.assign({}, gA.registro, { id: "f3f3f3f3-sintetico" })).def.chave === as.chave && A.destinoNaFicha(gA.registro, "brutal").modo === "nativo" && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "assassino"));
  t.ok("prévias", /Intento Único: Uma Sobrevivente se corta em vidro \(\+2 PH/.test(H.previaAmeaca(am).join(" ")) && /Dados 5 · PH 2/.test(H.previaAssassino(as).join(" ")) && /4 PH/.test(H.previaApavoro(ap)[0]));
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
