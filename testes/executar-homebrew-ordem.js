/* =====================================================================
   R.A.M.A. — testes: classe e elemento Homebrew de Ordem (v9.8)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-ordem.js

   A classe Homebrew pelo MOTOR de Ordem: PV do 1º marco e dos seguintes
   em NEX, no nível (NEX & Experiência) e em Patentes quando a tabela
   existe — e, quando falta, nenhuma vaga e nenhuma tabela emprestada de
   Combatente/Especialista/Ocultista. Poderes e trilhas só da classe
   oficial que a mesa escolheu. A cópia na ficha é versionada; recarregar
   e exportar mantêm. A Ramificação planeja com ela. O elemento "Vidro":
   ritual de dois elementos, criatura, item e afinidade; referência
   pendente preservada; as regras oficiais não mudam.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/elementos.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ficha.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/ramificacao.js",
  "js/ordem/homebrew-ordem.js", "js/ordem/biblioteca.js", "js/ordem/regras.js", "js/ordem/rituais.js", "js/criaturas.js", "js/validacao.js", "js/homebrew-adaptadores.js"];
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
const G = globalThis, C = G.RAMAOrdemCatalogo, R = G.RAMAOrdemRegras, E = G.RAMAOrdemProgressao, H = G.RAMAOrdemHomebrew, EL = G.RAMAOrdemElementos, M = G.RAMAOrdemRamificacao;
const copia = (x) => JSON.parse(JSON.stringify(x));

t.grupo("Classe Homebrew · a definição");
const base = H.modeloDeOficial("combatente");
t.ok("o editor pode partir da tabela de uma classe oficial (cópia)", base.progressao.length === 20 && base.patentes && base.poderesDe === "combatente");
const bruto = Object.assign(copia(base), { nome: "Vigilante", homebrewId: "a1b2c3d4-sintetico", pvInicial: { base: 18, atributo: "vig" }, pvPorNex: { base: 5, atributo: "vig" }, peInicial: { base: 3, atributo: "pre" }, pePorNex: { base: 2, atributo: "pre" }, sanInicial: { base: 10, atributo: null }, sanPorNex: { base: 2, atributo: null }, poderesDe: "combatente", trilhasDe: "", patentes: null });
const vig = H.normalizarClasse(bruto);
t.ok("a chave é versionada (hbc-<id>-<hash>)", /^hbc-a1b2c3d4-[a-z0-9]+$/.test(vig.chave));
t.ok("mudar a definição muda a chave (a ficha em jogo fica com a dela)", H.normalizarClasse(Object.assign(copia(bruto), { pvInicial: { base: 19, atributo: "vig" } })).chave !== vig.chave);
t.ok("sem tabela de Patentes, a classe NÃO é oferecida em Patentes (com o motivo)", !H.disponivelNoTrilho(vig, { porPatente: true }).ok && /Patentes/.test(H.disponivelNoTrilho(vig, { porPatente: true }).motivo) && H.disponivelNoTrilho(vig, {}).ok);
t.iguais("o que falta é listado", H.faltas(vig), ["tabela de Evolução por Patentes"]);
t.ok("a prévia mostra o 1º marco e os ganhos", /NEX 5%: 20 PV/.test(H.previa(vig, { vig: 2 })[0]) && /\+7 PV/.test(H.previa(vig, { vig: 2 })[1]));

t.grupo("Classe Homebrew · no motor (NEX)");
const ficha = (extra) => R.normalizar(Object.assign({ classe: vig.chave, origem: "academico", nex: 5, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { classes: { [vig.chave]: vig } } }, extra || {}));
const o5 = ficha();
t.ok("a classe Homebrew sobrevive à normalização (não é apagada)", o5.classe === vig.chave && o5.homebrew.classes[vig.chave].nome === "Vigilante");
t.iguais("NEX 5%: PV = 18 + Vigor 2 = 20, PE = 3 + 2, SAN = 10", [R.calcular(o5).pv.total, R.calcular(o5).pe.total, R.calcular(o5).san.total], [20, 5, 10]);
const o10 = ficha({ nex: 10 });
t.iguais("NEX 10%: +5 + Vigor 2 → 27 PV; +2 + Pre 2 → 9 PE; +2 SAN", [R.calcular(o10).pv.total, R.calcular(o10).pe.total, R.calcular(o10).san.total], [27, 9, 12]);
const comb = R.normalizar({ classe: "combatente", origem: "academico", nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
t.ok("e não é a tabela do Combatente", R.calcular(comb).pv.total !== R.calcular(o10).pv.total);
const v10 = E.vagas(o10).map((v) => v.id);
t.ok("as vagas vêm da tabela da classe Homebrew (trilha em NEX 10%)", v10.indexOf("d2.trilha") >= 0);
const o15 = ficha({ nex: 15 });
const cands = E.candidatosPoderClasse(o15, "d3.poderClasse", {}).map((c) => c.entrada.chave);
t.ok("poderes: os do Combatente (\"usa os poderes de…\") e os gerais", cands.indexOf("armamentoPesado") >= 0 && cands.indexOf("hacker") < 0);
const semPoderes = H.normalizarClasse(Object.assign(copia(bruto), { poderesDe: "" }));
const oSem = R.normalizar({ classe: semPoderes.chave, origem: "academico", nex: 15, atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 }, homebrew: { classes: { [semPoderes.chave]: semPoderes } } });
t.ok("sem \"poderes de…\": só os gerais (nada de Combatente emprestado)", E.candidatosPoderClasse(oSem, "d3.poderClasse", {}).every((c) => c.entrada.tipo === "geral" || c.entrada.geral));
const trilhaComb = C.TRILHAS.filter((x) => x.classe === "combatente")[0];
t.ok("trilhas: com trilhasDe vazio, nenhuma trilha de classe serve", !C.trilhaServe(trilhaComb, vig.chave, o10));
const comTrilha = H.normalizarClasse(Object.assign(copia(bruto), { trilhasDe: "combatente" }));
C.registrarClasseHomebrew(comTrilha);
t.ok("  com \"trilhas de Combatente\", as do Combatente servem", C.trilhaServe(trilhaComb, comTrilha.chave, o10));

t.grupo("Classe Homebrew · nível e Patentes");
const oNivel = ficha({ opcionais: { nexExperiencia: true }, nivel: 2, nex: 5 });
t.ok("NEX & Experiência: o nível 2 usa a tabela da classe (ganha o 2º marco)", R.calcular(oNivel).pv.total === 27, String(R.calcular(oNivel).pv.total));
const oPat = ficha({ opcionais: { evolucaoPatentes: true }, prestigio: 60, patenteConquistada: 2 });
t.ok("Patentes sem tabela: nenhuma vaga (não usa a do Combatente) e não quebra", E.vagas(oPat).filter((v) => /^p\d/.test(v.id)).length === 0);
const comPat = H.normalizarClasse(Object.assign(copia(bruto), { patentes: { pv: { base: 15, porPatente: 6, atributo: "vig" }, pd: { base: 8, porPatente: 4, atributo: "pre" }, patentes: [{ escolhas: [], rotulos: ["Vigília"] }, { escolhas: ["atributo"], rotulos: [] }, { escolhas: ["poderClasse", "trilha"], rotulos: [] }, { escolhas: ["atributo"], rotulos: [] }, { escolhas: ["poderClasse"], rotulos: [] }] } }));
t.ok("com a tabela, a classe é oferecida em Patentes", H.disponivelNoTrilho(comPat, { porPatente: true }).ok);
const oPat2 = R.normalizar({ classe: comPat.chave, origem: "academico", opcionais: { evolucaoPatentes: true }, prestigio: 60, patenteConquistada: 2, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { classes: { [comPat.chave]: comPat } } });
t.ok("Patentes: PV da tabela da classe — 15 + Vigor 2, e (6 + Vigor 2) a cada patente nova (SAH p. 110): 33", R.calcular(oPat2).pv.total === 33, String(R.calcular(oPat2).pv.total));
const combPat = R.normalizar({ classe: "combatente", origem: "academico", opcionais: { evolucaoPatentes: true }, prestigio: 60, patenteConquistada: 2, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
t.ok("  e não a do Combatente (46)", R.calcular(combPat).pv.total === 46 && R.calcular(oPat2).pv.total !== 46);
t.ok("  e as vagas da patente vêm dela (atributo na 2ª, poder e trilha na 3ª)", E.vagas(oPat2).some((v) => v.tipo === "atributo") && E.vagas(oPat2).some((v) => v.tipo === "trilha"));

t.grupo("Classe Homebrew · cópia, recarga, exportação e Ramificação");
const recarregada = R.normalizar(copia(o10));
t.ok("recarregar mantém a classe e a cópia", recarregada.classe === vig.chave && recarregada.homebrew.classes[vig.chave].pvPorNex.base === 5);
const V = G.RAMAValidacao, F = G.RAMAFicha;
const fichaCompleta = F.normalizarFicha({ nome: "Agente sintética", tipoFicha: "ordem", ordem: copia(o10) });
const volta = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fichaCompleta))));
t.ok("exportar e importar a ficha: a classe Homebrew e a cópia voltam", volta.ok && volta.dados.ordem.classe === vig.chave && !!volta.dados.ordem.homebrew.classes[vig.chave], JSON.stringify(volta.ok ? volta.dados.ordem.classe : volta));
const fx = { ordem: copia(o10), rituais: [], inventario: { itens: [] } };
const plano = M.novoPlano(fx.ordem, fx.inventario, "Vigilante 10 → 20"); plano.alvo = { nex: 20 };
const mp = M.montar(fx, plano);
t.ok("a Ramificação projeta com a classe Homebrew (marcos e PV da tabela dela)", mp.marcos.length > 0 && R.calcular(mp.proj).pv.total === 27 + 2 * 7, String(R.calcular(mp.proj).pv.total));

t.grupo("Elemento Homebrew · Vidro");
EL._limpar();
const vidro = EL.normalizar({ nome: "Vidro", descricao: "Reflexos que cortam.", cor: "#9ad1d4", simbolo: "◇", homebrewId: "e1f2a3b4-sintetico", forteContra: ["morte"], permiteAfinidade: true });
t.ok("chave estável hbe-<nome>-<id>", /^hbe-vidro-e1f2a3b4$/.test(vidro.chave));
EL.registrar(vidro);
t.ok("o campo aceita; a regra oficial não o conhece", EL.aceito(vidro.chave) && !EL.oficial(vidro.chave) && EL.nome(vidro.chave) === "Vidro");
t.ok("o catálogo de Ordem responde pelo nome (sem herdar regra)", C.elemento(vidro.chave).nome === "Vidro" && C.elemento(vidro.chave).homebrew === true);
const RT = G.RAMAOrdemRituais;
const dRit = RT.normalizarDados({ elemento: vidro.chave, elementos: [vidro.chave, "energia"], todosOsElementos: true, circulo: 2 });
t.ok("ritual de dois elementos (Vidro e Energia): os dois ficam, com a cópia da definição", dRit.elementos.join() === vidro.chave + ",energia" && dRit.elementosHomebrew[vidro.chave].nome === "Vidro");
t.ok("  e o nome aparece pelo rituais.js", RT.nomeDoElemento(vidro.chave) === "Vidro");
const crit = G.RAMACriaturas.normalizar({ tipo: "criatura", sistema: "ordem", nome: "Espectro de Vidro", ordem: { vd: 60, elementos: [vidro.chave, "sangue"] } });
t.ok("criatura com Vidro: elemento e cópia guardados", crit.ordem.elementos.indexOf(vidro.chave) >= 0 && crit.ordem.elementosHomebrew[vidro.chave].cor === "#9ad1d4");
EL._limpar();
const reaberta = G.RAMACriaturas.normalizar(copia(crit));
t.ok("reabrir sem a biblioteca: a cópia registra o Vidro de novo", EL.nome(vidro.chave) === "Vidro" && reaberta.ordem.elementos.indexOf(vidro.chave) >= 0);
const pendente = G.RAMACriaturas.normalizar({ tipo: "criatura", sistema: "ordem", nome: "Sem definição", ordem: { elementos: ["hbe-cristal-00000000"] } });
t.ok("referência pendente (arquivo incompleto): preservada e identificada, nunca Medo nem \"sem elemento\"", pendente.ordem.elementos[0] === "hbe-cristal-00000000" && /não encontrado/.test(EL.nome("hbe-cristal-00000000")));
t.ok("lixo que não é elemento continua recusado", G.RAMACriaturas.normalizar({ tipo: "criatura", sistema: "ordem", nome: "X", ordem: { elementos: ["vidro", "<script>"] } }).ordem.elementos.length === 0);
const item = G.RAMAOrdemInventario.normalizarDados({ elemento: vidro.chave, grupo: "paranormal" }, "item");
t.ok("item paranormal de Vidro (com a cópia)", item.elemento === vidro.chave && item.elementosHomebrew[vidro.chave].nome === "Vidro");
const oAf = R.normalizar({ classe: "ocultista", origem: "academico", nex: 55, atributos: { agi: 1, for: 1, int: 2, pre: 2, vig: 1 }, afinidade: { elemento: vidro.chave }, homebrew: { elementos: { [vidro.chave]: vidro } } });
const af = E.estado(oAf, {}).afinidade;
t.ok("afinidade com Vidro: aceita, marcada Homebrew — sem efeito mecânico de elemento oficial", oAf.afinidade.elemento === vidro.chave && af.homebrew === true && af.escolhida === true);
t.iguais("as regras oficiais não mudam: afinidade oficial sem Medo", C.ELEMENTOS_AFINIDADE, ["conhecimento", "energia", "morte", "sangue"]);
t.ok("relação elemental só a que a mesa configurou (Vidro forte contra Morte)", EL.relacaoHomebrew(vidro.chave, "morte") === "forte" && EL.relacaoHomebrew(vidro.chave, "sangue") === "" && EL.relacaoHomebrew("sangue", vidro.chave) === "");

t.grupo("Na biblioteca (adaptador) e no arquivo");
const A = G.RAMAHomebrewAdaptadores;
EL.registrar(vidro);
const gEl = A.guardar("ordem", "estrutural", "elemento", { nome: "Vidro", descricao: "Reflexos.", valores: { cor: "#9ad1d4", forteContra: ["morte"], permiteAfinidade: true } });
t.ok("Elemento guardado: coluna \"elemento\", chave hbe-, cor e relação", gEl.ok && gEl.registro.tipo === "elemento" && /^hbe-vidro-/.test(gEl.registro.modelo.def.chave) && gEl.registro.modelo.def.forteContra[0] === "morte");
const renomeado = A.guardar("ordem", "estrutural", "elemento", { nome: "Vidro Negro", valores: gEl.registro.modelo.def, modeloAnterior: gEl.registro.modelo });
t.ok("renomear mantém a chave (referências não quebram)", renomeado.registro.modelo.def.chave === gEl.registro.modelo.def.chave);
const arqEl = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gEl.registro), gEl.registro))));
t.ok("exportar e importar o Elemento: mesma chave", arqEl.ok && arqEl.dados.modelo.def.chave === gEl.registro.modelo.def.chave, JSON.stringify(arqEl.ok ? arqEl.dados.modelo : arqEl));
const defSemChave = copia(vig); delete defSemChave.chave; delete defSemChave.homebrewId;
const gCl = A.guardar("ordem", "estrutural", "classe", { nome: "Vigilante", valores: {}, classe: defSemChave });
t.ok("Classe guardada: coluna \"classe\" e a definição inteira", gCl.ok && gCl.registro.tipo === "classe" && gCl.registro.modelo.def.progressao.length === 20);
const arqCl = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gCl.registro), gCl.registro))));
t.ok("exportar e importar a Classe: tabelas e recursos voltam", arqCl.ok && arqCl.dados.modelo.def.pvPorNex.base === 5 && arqCl.dados.modelo.def.progressao.length === 20);
const daBib = H.deRegistro(Object.assign({}, gCl.registro, { id: "a1b2c3d4-sintetico" }));
t.ok("da biblioteca para a ficha: a mesma versão gera a mesma chave", daBib.tipo === "classe" && daBib.def.chave === H.deRegistro(Object.assign({}, gCl.registro, { id: "a1b2c3d4-sintetico" })).def.chave);
t.ok("pacote: Classe de Ordem só em pacote de Ordem", A.compativelComPacote(gCl.registro, "ordem").ok && !A.compativelComPacote(gCl.registro, "tormenta20").ok);

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
