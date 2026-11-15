/* =====================================================================
   R.A.M.A. — testes: classe, elemento, origem e trilha Homebrew de Ordem (v9.8–9.9)
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

/* ===================== v9.9: Origem e Trilha ===================== */
t.grupo("Origem Homebrew · definição e motor");
const P = G.RAMAOrdemPoderes;
const orgBruta = { nome: "Vidraceiro", homebrewId: "e5f6a7b8-sintetico", pericias: ["profissao", "percepcao"], poder: "Olho Treinado", resumo: "Percebe rachaduras e reflexos.", efeitos: [{ tipo: "defesa", valor: 1 }, { tipo: "pvPorNex", valor: 1 }, { tipo: "inventado", valor: 9 }, { tipo: "bonusPericia", valor: 2, pericias: ["percepcao"] }] };
const vidr = H.normalizarOrigem(orgBruta);
t.ok("chave versionada hbo-<id>-<hash>", /^hbo-e5f6a7b8-[a-z0-9]+$/.test(vidr.chave));
t.ok("só efeitos que o motor já calcula (o inventado sai)", vidr.efeitos.map((e) => e.tipo).join() === "defesa,pvPorNex,bonusPericia" && vidr.automacao === "calculo");
t.ok("fonte Homebrew: nunca bloqueada por suplemento, referência \"Homebrew\"", vidr.fonte === "HOMEBREW" && C.fonteLiberada(vidr) && C.referencia(vidr) === "Homebrew");
const fOrg = (extra) => R.normalizar(Object.assign({ classe: "combatente", origem: vidr.chave, nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { origens: { [vidr.chave]: vidr } } }, extra || {}));
const oOrg = fOrg();
const oAcad = R.normalizar({ classe: "combatente", origem: "academico", nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
t.ok("a origem Homebrew sobrevive à normalização, com a cópia", oOrg.origem === vidr.chave && oOrg.homebrew.origens[vidr.chave].poder === "Olho Treinado");
t.iguais("efeitos na conta: +1 Defesa e +1 PV por marco (NEX 10% = 2 marcos)", [R.calcular(oOrg).defesa.total - R.calcular(oAcad).defesa.total, R.calcular(oOrg).pv.total - R.calcular(oAcad).pv.total], [1, 2]);
t.ok("a origem entra nas listas de escolha (origensDisponiveis)", C.origensDisponiveis().some((x) => x.chave === vidr.chave) && C.ORIGENS.every((x) => !x.homebrew));
const outra = H.normalizarOrigem(Object.assign(copia(orgBruta), { efeitos: [] }));
t.ok("sem efeito: informativa, outra versão, outra chave", outra.automacao === "informacao" && outra.chave !== vidr.chave);
const semCopia = R.normalizar({ classe: "combatente", origem: outra.chave, nex: 5, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
t.ok("sem cópia na ficha mas desconhecida do catálogo: some (nada inventado)", semCopia.origem === "");
C.registrarOrigemHomebrew(outra);
const embutida = R.normalizar({ classe: "combatente", origem: outra.chave, nex: 5, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
t.ok("escolhida de uma lista da biblioteca: a normalização embute a cópia", embutida.origem === outra.chave && embutida.homebrew.origens[outra.chave].nome === "Vidraceiro");
t.ok("as opções da origem: escolher N entre uma lista", H.normalizarOrigem({ nome: "X", periciasAEscolher: 2, periciasOpcoes: ["luta", "pontaria", "fortitude"] }).periciasOpcoes.length === 3 && !("periciasOpcoes" in H.normalizarOrigem({ nome: "X", periciasAEscolher: 2, periciasOpcoes: ["luta"] })));

t.grupo("Trilha Homebrew · definição e motor");
const trBruta = { nome: "Lapidador", homebrewId: "c9d0e1f2-sintetico", classe: "combatente", resumo: "Corta o Outro Lado.", requisitos: [{ tipo: "treinado", pericia: "profissao" }],
  poderes: [{ nex: 10, nome: "Primeiro Corte", resumo: "x", efeitos: [{ tipo: "pvFixo", valor: 3 }] }, { nex: 40, nome: "Faceta", efeitos: [{ tipo: "defesa", valor: 1 }] }, { nex: 65, nome: "Brilho" }, { nex: 99, nome: "Diamante" }] };
const lap = H.normalizarTrilha(trBruta);
t.ok("chave versionada hbt-, classe, requisito e os 4 poderes em 10/40/65/99", /^hbt-c9d0e1f2-/.test(lap.chave) && lap.classe === "combatente" && lap.requisitos[0].pericia === "profissao" && lap.poderes.map((p) => p.nex).join() === "10,40,65,99");
const fTr = (nex, extra) => R.normalizar(Object.assign({ classe: "combatente", origem: "academico", trilha: lap.chave, nex: nex, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, pericias: { profissao: "treinado" }, homebrew: { trilhas: { [lap.chave]: lap } } }, extra || {}));
const t10 = fTr(10), t40 = fTr(40);
const semTr = (nex) => R.normalizar({ classe: "combatente", origem: "academico", nex: nex, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, pericias: { profissao: "treinado" } });
t.ok("a trilha sobrevive à normalização, com a cópia", t10.trilha === lap.chave && t10.homebrew.trilhas[lap.chave].poderes.length === 4);
t.ok("os poderes viram habilidades de trilha (referência Homebrew)", P.habilidadesDaTrilha(lap.chave).length === 4 && P.referencia(P.habilidadesDaTrilha(lap.chave)[0]) === "Homebrew");
t.iguais("NEX 10%: Primeiro Corte dá +3 PV; ainda sem a Faceta", [R.calcular(t10).pv.total - R.calcular(semTr(10)).pv.total, R.calcular(t10).defesa.total - R.calcular(semTr(10)).defesa.total], [3, 0]);
t.iguais("NEX 40%: e a Faceta dá +1 Defesa", R.calcular(t40).defesa.total - R.calcular(semTr(40)).defesa.total, 1);
t.ok("aparece entre as trilhas do Combatente (vaga de Trilha)", C.trilhasDaClasse("combatente", t10).some((x) => x.chave === lap.chave) && !C.trilhasDaClasse("ocultista").some((x) => x.chave === lap.chave));
const oc = R.normalizar({ classe: "ocultista", origem: "academico", trilha: lap.chave, nex: 10, atributos: { agi: 1, for: 1, int: 2, pre: 2, vig: 1 }, homebrew: { trilhas: { [lap.chave]: lap } } });
t.ok("numa ficha de outra classe, a trilha não serve (vínculo quebrado some)", oc.trilha === "");
const vigT = H.normalizarClasse(Object.assign(copia(bruto), { trilhasDe: "combatente" }));
const hbTr = R.normalizar({ classe: vigT.chave, origem: "academico", trilha: lap.chave, nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { classes: { [vigT.chave]: vigT }, trilhas: { [lap.chave]: lap } } });
const hbOf = R.normalizar({ classe: vigT.chave, origem: "academico", trilha: "guerreiro", nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { classes: { [vigT.chave]: vigT } } });
t.ok("classe Homebrew com \"trilhas do Combatente\": a trilha Homebrew e a oficial ficam (antes sumiam)", hbTr.trilha === lap.chave && hbOf.trilha === "guerreiro");
const proj = copia(R.normalizar({ classe: "combatente", origem: "academico", nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, pericias: { profissao: "treinado" } }));
delete proj.homebrew;
t.ok("embutir: a escolha (vaga, Ramificação) leva a cópia", H.embutir(proj, lap.chave) && proj.homebrew.trilhas[lap.chave].nome === "Lapidador");

t.grupo("Origem e Trilha · biblioteca, arquivo e pacote");
const limpa = (d) => { const x = copia(d); ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach((k) => delete x[k]); return x; };
const gOr = A.guardar("ordem", "estrutural", "origem", { nome: "Vidraceiro", descricao: "Trabalhava com vidro.", valores: {}, def: limpa(vidr) });
t.ok("Origem guardada: coluna \"origem\", grupo estrutural", gOr.ok && gOr.registro.tipo === "origem" && gOr.registro.modelo.grupo === "estrutural" && gOr.registro.modelo.def.poder === "Olho Treinado");
const dbOr = H.deRegistro(Object.assign({}, gOr.registro, { id: "e5f6a7b8-sintetico" }));
t.ok("da biblioteca: o texto do poder não vira a descrição", dbOr.tipo === "origem" && dbOr.def.resumo === "Percebe rachaduras e reflexos." && dbOr.def.descricao === "Trabalhava com vidro.");
const arqOr = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gOr.registro), gOr.registro))));
t.ok("exportar e importar a Origem: perícias, poder e efeitos voltam", arqOr.ok && arqOr.dados.modelo.def.pericias.join() === "profissao,percepcao" && arqOr.dados.modelo.def.efeitos.length === 3, JSON.stringify(arqOr.ok ? arqOr.dados.modelo : arqOr));
const lapL = limpa(lap); delete lapL.resumo;
const gTr = A.guardar("ordem", "estrutural", "trilha", { nome: "Lapidador", descricao: "Corta o Outro Lado.", valores: {}, def: lapL });
t.ok("Trilha guardada: coluna \"trilha\"", gTr.ok && gTr.registro.tipo === "trilha" && gTr.registro.modelo.def.poderes.length === 4);
const arqTr = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gTr.registro), gTr.registro))));
t.ok("exportar e importar a Trilha: classe, requisito e poderes voltam", arqTr.ok && arqTr.dados.modelo.def.classe === "combatente" && arqTr.dados.modelo.def.poderes[1].efeitos[0].tipo === "defesa" && arqTr.dados.modelo.def.requisitos.length === 1);
t.ok("da biblioteca, a Trilha tem o resumo pela descrição", H.deRegistro(Object.assign({}, gTr.registro, { id: "x" })).def.resumo === "Corta o Outro Lado.");
t.ok("pacote: Origem e Trilha de Ordem só em pacote de Ordem", A.compativelComPacote(gOr.registro, "ordem").ok && !A.compativelComPacote(gTr.registro, "vampiro").ok);
t.ok("o resumo da lista diz o essencial", /2 perícias/.test(A.resumo(gOr.registro)) && /para Combatente/.test(A.resumo(gTr.registro)));

/* ===================== v9.15: atualizar a versão de uma cópia ===================== */
t.grupo("Ordem Homebrew · atualizar a cópia para a versão da biblioteca");
const fVer = R.normalizar({ classe: "combatente", origem: vidr.chave, trilha: lap.chave, nex: 40, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, pericias: { profissao: "treinado" }, homebrew: { origens: { [vidr.chave]: vidr }, trilhas: { [lap.chave]: lap } } });
t.iguais("as cópias da ficha", H.copiasDaFicha(fVer).map((c) => c.tipo + ":" + c.homebrewId.slice(0, 8)), ["origem:e5f6a7b8", "trilha:c9d0e1f2"]);
const vidrNova = H.normalizarOrigem(Object.assign(copia(orgBruta), { efeitos: [{ tipo: "defesa", valor: 3 }] }));
const lapNova = H.normalizarTrilha(Object.assign(copia(trBruta), { poderes: [{ nex: 10, nome: "Primeiro Corte", efeitos: [{ tipo: "pvFixo", valor: 6 }] }, { nex: 40, nome: "Faceta" }, { nex: 65, nome: "Brilho" }, { nex: 99, nome: "Diamante" }] }));
const novasO = H.versoesNovas(fVer, { origens: [vidrNova], trilhas: [lapNova], classes: [] });
t.ok("versões novas: origem e trilha do mesmo registro, com outra chave", novasO.length === 2 && novasO[0].def.chave === vidrNova.chave && novasO[1].def.chave === lapNova.chave);
const fAtu = copia(fVer);
novasO.forEach((n) => H.atualizarVersao(fAtu, n));
const fAtu2 = R.normalizar(fAtu);
t.ok("atualizada: chaves novas na ficha e nas cópias; as antigas saem", fAtu2.origem === vidrNova.chave && fAtu2.trilha === lapNova.chave && fAtu2.homebrew.origens[vidrNova.chave] && !fAtu2.homebrew.origens[vidr.chave] && !fAtu2.homebrew.trilhas[lap.chave]);
t.iguais("os números seguem a versão nova: Defesa +3 no lugar de +1 e da Faceta (+1); sem o +1 PV por marco (−8 em NEX 40%) e Primeiro Corte +6 em vez de +3", [R.calcular(fAtu2).defesa.total - R.calcular(fVer).defesa.total, R.calcular(fAtu2).pv.total - R.calcular(fVer).pv.total], [1, -5]);

/* ===================== v9.16: escolha de perícia nos poderes ===================== */
t.grupo("Ordem Homebrew · escolha de perícia no poder (trilha e origem)");
t.iguais("escolhaDoPoder: modo, lista e bônus (lista de uma perícia vira qualquer)", [H.escolhaDoPoder({ modo: "treinarOuBonus", entre: ["diplomacia", "enganacao", "inventada"], valor: 9 }), H.escolhaDoPoder({ modo: "treinar", entre: ["luta"] }), H.escolhaDoPoder({ modo: "x" })],
  [{ modo: "treinarOuBonus", entre: ["diplomacia", "enganacao"], valor: 5 }, { modo: "treinar", entre: [] }, null]);
const trEsc = H.normalizarTrilha(Object.assign(copia(trBruta), { homebrewId: "e1e1e1e1-sintetico", requisitos: [], poderes: [{ nex: 10, nome: "Lábia de Vidro", escolha: { modo: "treinarOuBonus", entre: ["diplomacia", "enganacao"], valor: 2 } }, { nex: 40, nome: "B" }, { nex: 65, nome: "C" }, { nex: 99, nome: "D" }] }));
const fEsc = R.normalizar({ classe: "combatente", origem: "academico", trilha: trEsc.chave, nex: 10, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { trilhas: { [trEsc.chave]: trEsc } } });
const habEsc = P.habilidadesDaTrilha(trEsc.chave)[0];
t.ok("o poder vira habilidade de trilha com a opção \"Perícia\" (entre Diplomacia e Enganação)", habEsc.opcoes.length === 1 && habEsc.opcoes[0].entre.join() === "diplomacia,enganacao" && habEsc.efeitos.some((e) => e.tipo === "treinarOuBonus" && e.opcao === "pericia"));
const vEsc = E.vagas(fEsc).filter((v) => (v.rotulo || "").indexOf("Lábia de Vidro") >= 0 || v.beneficio === trEsc.chave + "-p10")[0];
t.ok("a Progressão pede a escolha (vaga de opção do poder)", !!vEsc, JSON.stringify(E.vagas(fEsc).map((v) => v.id + ":" + v.rotulo)).slice(0, 400));
const okDip = vEsc ? E.simular(fEsc, vEsc, { valor: "", opcoes: { pericia: "diplomacia" } }, null).avaliacao.valido : false;
const okLuta = vEsc ? E.simular(fEsc, vEsc, { valor: "", opcoes: { pericia: "luta" } }, null).avaliacao.valido : true;
t.ok("só vale perícia da lista (Diplomacia sim; Luta não)", okDip && !okLuta);
if (vEsc) E.registrar(fEsc, vEsc, { valor: "", opcoes: { pericia: "diplomacia" } });
const grauDip = E.estado(fEsc).graus ? E.estado(fEsc).graus.diplomacia : (R.bonusDePericia(fEsc, "diplomacia", []).total > 0 ? 1 : 0);
t.ok("escolhida Diplomacia: fica treinado", grauDip >= 1 || /reinad/.test(JSON.stringify(R.bonusDePericia(fEsc, "diplomacia", []))), String(grauDip));

const orgEsc = H.normalizarOrigem(Object.assign(copia(orgBruta), { homebrewId: "f2f2f2f2-sintetico", efeitos: [], escolhaHb: { modo: "bonus", valor: 2 } }));
t.ok("origem: a escolha vira escolhas + efeitosEscolha (formato das do livro)", orgEsc.escolhas[0].chave === "pericia" && orgEsc.efeitosEscolha[0].tipo === "bonusPericia" && orgEsc.automacao === "calculo" && /Escolha \(na Progressão\): \+2 numa perícia à escolha/.test(H.previaOrigem(orgEsc).join(" ")));
const fOE = R.normalizar({ classe: "combatente", origem: orgEsc.chave, nex: 5, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 }, homebrew: { origens: { [orgEsc.chave]: orgEsc } } });
const vOE = E.vagas(fOE).filter((v) => v.id === "b.origem." + orgEsc.chave)[0];
t.ok("a Progressão pede a perícia da origem", !!vOE);
const antesOE = R.bonusDePericia(fOE, "investigacao", []).total;
if (vOE) E.registrar(fOE, vOE, { valor: "", opcoes: { pericia: "investigacao" } });
t.iguais("escolhida Investigação: +2 na conta", R.bonusDePericia(fOE, "investigacao", []).total - antesOE, 2);

t.grupo("Classe Homebrew · Mundano e Sobrevivente viram agente (v9.23)");
{
  const P = G.RAMAOrdemPoderes;
  const forma = (g) => ({ pv: g.pv, pe: g.pe, san: g.san, pares: g.pericias.pares.map((p) => p.slice().sort().join("|")).sort(), fixas: g.pericias.fixas.slice().sort(), livres: g.pericias.livres, prof: g.proficiencias.slice().sort() });
  ["mundano", "sobrevivente"].forEach((de) => {
    const dif = ["combatente", "especialista", "ocultista"].filter((k) => JSON.stringify(forma(C.ganhosDeTransicao(C.classe(k), de))) !== JSON.stringify(forma(C.TRANSICOES[de].classes[k])));
    t.ok("a conta reproduz a tabela do livro nas três classes (" + de + ")", !dif.length, dif.map((k) => k + ": " + JSON.stringify(forma(C.ganhosDeTransicao(C.classe(k), de)))).join("; "));
  });
  C.registrarClasseHomebrew(vig);
  const gm = C.TRANSICOES.mundano.classes[vig.chave], gs = C.TRANSICOES.sobrevivente.classes[vig.chave];
  t.iguais("Vigilante, de Mundano: +10 PV, +2 PE, +2 SAN (o que falta para o novato)", [gm.pv, gm.pe, gm.san], [10, 2, 2]);
  t.iguais("Vigilante, de Sobrevivente: 4 PV, 1 PE e 4 SAN a menos, nunca abaixo de 0", [gs.pv, gs.pe, gs.san], [6, 1, 0]);
  const tre = P.treinamento("mundano", vig.chave);
  t.ok("o treinamento existe, com as perícias da classe e a marca de Homebrew", tre && tre.homebrew && tre.opcoes.some((o) => o.chave === "par0") && /Vigilante/.test(tre.nome), JSON.stringify(tre && tre.opcoes));
  const atr = { agi: 1, for: 2, int: 1, pre: 2, vig: 2 };
  const om = R.normalizar({ classe: "mundano", origem: "academico", atributos: atr });
  const rt = E.transicionar(om, vig.chave, { id: "tr-hb-m" });
  H.embutir(om, vig.chave);
  const om2 = R.normalizar(JSON.parse(JSON.stringify(om)));
  t.ok("Mundano → Vigilante: classe, NEX 5%, trajetória e a cópia na ficha", rt.ok && om2.classe === vig.chave && om2.nex === 5 && om2.trajetoria[0].para === vig.chave && !!om2.homebrew.classes[vig.chave], JSON.stringify(rt.ok ? om2.trajetoria : rt));
  t.iguais("  recursos = os de um Vigilante novato (18 + Vig 2, 3 + Pre 2, 10)", [R.calcular(om2).pv.total, R.calcular(om2).pe.total, R.calcular(om2).san.total], [20, 5, 10]);
  const ids = E.vagas(om2).map((v) => v.id);
  t.ok("  o ponto de atributo e o treinamento ficam em Falta decidir", ids.indexOf("t.atributo") >= 0 && ids.indexOf("t.treinamento") >= 0, ids.join(","));
  const os = R.normalizar({ classe: "sobrevivente", estagio: 2, origem: "academico", atributos: atr });
  const pvS = R.calcular(os).pv.total, peS = R.calcular(os).pe.total;
  const rs = E.transicionar(os, vig.chave, { id: "tr-hb-s" });
  H.embutir(os, vig.chave);
  const os2 = R.normalizar(JSON.parse(JSON.stringify(os)));
  t.ok("Sobrevivente → Vigilante: +6 PV e +1 PE sobre o que tinha, sem ponto de atributo", rs.ok && R.calcular(os2).pv.total === pvS + 6 && R.calcular(os2).pe.total === peS + 1 && E.vagas(os2).every((v) => v.id !== "t.atributo"), [pvS, R.calcular(os2).pv.total, peS, R.calcular(os2).pe.total].join(","));
}

t.grupo("Classe Homebrew · conjura rituais como o Ocultista (v9.24)");
{
  t.ok("sem a marca, a definição não ganha a tabela (a chave das classes de antes não muda)", !("circuloPorNex" in vig) && H.normalizarClasse(copia(bruto)).chave === vig.chave);
  const doOc = H.modeloDeOficial("ocultista");
  t.iguais("partir do Ocultista traz os círculos dele", H.normalizarClasse(doOc).circuloPorNex.map((f) => f.nex), [5, 25, 55, 85]);
  t.iguais("círculos fora de ordem ou sem o anterior saem pela regra", H.circulosPorNex([{ nex: 10, circulo: 1 }, { nex: 5, circulo: 2 }]), [{ nex: 10, circulo: 1 }]);
  t.iguais("  e o 3º sem o 2º não entra", H.circulosPorNex([{ nex: 5, circulo: 1 }, { nex: 40, circulo: 3 }]), [{ nex: 5, circulo: 1 }]);
  t.ok("  NEX que não é marco é recusado", H.circulosPorNex([{ nex: 7, circulo: 1 }]) === null);
  const mago = H.normalizarClasse(Object.assign(copia(bruto), { nome: "Arcanista", homebrewId: "e5e5e5e5-sintetico", circuloPorNex: [{ nex: 5, circulo: 1 }, { nex: 30, circulo: 2 }] }));
  t.ok("a marca muda a chave (é outra versão)", mago.chave !== H.normalizarClasse(Object.assign(copia(bruto), { nome: "Arcanista", homebrewId: "e5e5e5e5-sintetico" })).chave);
  t.ok("a prévia diz em que NEX cada círculo abre", /2º círculo em NEX 30%/.test(H.previa(mago).join(" ")));
  const fm = (nex) => R.normalizar({ classe: mago.chave, origem: "academico", nex, atributos: { agi: 1, for: 1, int: 1, pre: 2, vig: 2 }, homebrew: { classes: { [mago.chave]: mago } } });
  t.iguais("círculo máximo pelo NEX da tabela da mesa (5% → 1º, 25% → 1º, 30% → 2º)", [R.rituais(fm(5)).circuloMaximo, R.rituais(fm(25)).circuloMaximo, R.rituais(fm(30)).circuloMaximo], [1, 1, 2]);
  const AP = G.RAMAOrdemAprendizado;
  t.iguais("NEX 15%: os três iniciais e um ritual por avanço, como o Ocultista", E.concessoesDeRitual(fm(15)).map((c) => c.id), ["d1.rituaisIniciais", "d2.ritualClasse", "d3.ritualClasse"]);
  const d2 = E.concessoesDeRitual(fm(15)).filter((c) => c.id === "d2.ritualClasse")[0];
  t.ok("  rotulada como ritual de classe", d2 && d2.classeHomebrew && AP.rotuloDaConcessao(d2) === "Ritual de classe", JSON.stringify(d2));
  t.ok("a classe sem a marca não conjura", R.rituais(ficha({ nex: 30 })).circuloMaximo === 0 && E.concessoesDeRitual(ficha({ nex: 30 })).length === 0);
}

t.grupo("Elemento Homebrew · poderes, itens e maldições (v9.25)");
{
  for (const c of ["js/ordem/itens-dados.js", "js/ordem/itens.js"]) (0, eval)(await Deno.readTextFile(new URL("../" + c, import.meta.url)));
  const IT = G.RAMAOrdemItens;
  EL.registrar(vidro);
  const oc = (extra) => R.normalizar(Object.assign({ classe: "ocultista", origem: "academico", nex: 15, atributos: { agi: 1, for: 1, int: 2, pre: 2, vig: 1 } }, extra || {}));
  const o15 = oc();
  const vagaP = E.vagas(o15).filter((v) => v.id === "d3.poderClasse")[0];
  const sim = (valor, opcoes) => E.simular(copia(o15), vagaP, { valor, opcoes }, {}).avaliacao;
  t.ok("Especialista em Elemento aceita Vidro (a regra é genérica: +2 na DT dos rituais dele)", vagaP && sim("especialistaEmElemento", { elemento: vidro.chave }).valido, JSON.stringify(vagaP ? sim("especialistaEmElemento", { elemento: vidro.chave }) : E.vagas(o15).map((v) => v.id)));
  const gm = vagaP ? sim("dominadorDeElemento", { elemento: vidro.chave }) : null;
  t.ok("Dominador de Elemento (opressão do livro) recusa Vidro, com o motivo", gm && !gm.valido && /elementos do livro/.test(JSON.stringify(gm)), JSON.stringify(gm));
  t.ok("  e um texto qualquer continua inválido", vagaP && /elemento inválido/.test(JSON.stringify(sim("especialistaEmElemento", { elemento: "vidro" }))));
  const P = G.RAMAOrdemPoderes;
  const aceitam = ["especialistaEmElemento", "mestreEmElemento", "acostumadoAMaldicao", "aprenderRitual", "resistirAElemento", "cicatrizado"].filter((k) => (P.poder(k).opcoes || []).some((op) => op.tipo === "elemento" && op.aceitaHomebrew));
  const recusam = ["dominadorDeElemento", "graoMestreEmElemento", "serAmaldicoado", "serExperimentado", "serEscarificado"].filter((k) => P.poder(k) && (P.poder(k).opcoes || []).some((op) => op.tipo === "elemento" && op.aceitaHomebrew));
  t.ok("só os poderes de regra genérica aceitam Homebrew (seis); os de efeito por elemento do livro, não", aceitam.length === 6 && recusam.length === 0, aceitam.join(",") + " | " + recusam.join(","));
  const vagaE = { id: "d3.poderClasse", tipo: "poderClasse" };
  const semCopia = oc();
  E.registrar(semCopia, vagaP || vagaE, { valor: "especialistaEmElemento", opcoes: { elemento: vidro.chave } });
  t.ok("escolher Vidro num poder guarda a cópia do elemento na ficha", semCopia.homebrew && semCopia.homebrew.elementos && semCopia.homebrew.elementos[vidro.chave] && semCopia.homebrew.elementos[vidro.chave].nome === "Vidro");
  t.ok("  e o nome do poder diz o elemento", /Especialista em Vidro/.test(semCopia.escolhas[0].nome), semCopia.escolhas[0].nome);
  const pelaTela = oc();
  const rca = E.confirmarAquisicao(pelaTela, [], { tipo: "escolha", vaga: "d3.poderClasse", candidato: { valor: "especialistaEmElemento", opcoes: { elemento: vidro.chave } }, novos: [] }, {});
  t.ok("  pelo caminho da janela (confirmarAquisicao) a cópia também vem", rca.ok && pelaTela.homebrew && pelaTela.homebrew.elementos && !!pelaTela.homebrew.elementos[vidro.chave], JSON.stringify(rca));
  const rd = R.normalizar(Object.assign(copia(semCopia), {}));
  t.ok("  recarregada, a escolha e a cópia continuam", rd.escolhas[0].opcoes.elemento === vidro.chave && !!rd.homebrew.elementos[vidro.chave]);
  const comp = IT.opcoesDaEscolha({ tipo: "elemento", semMedo: true });
  t.ok("itens: Componentes, catalisador e afins oferecem Vidro (sem Medo quando o livro tira)", comp.some((o) => o.valor === vidro.chave && o.rotulo === "Vidro") && !comp.some((o) => o.valor === "medo"));
  t.ok("  uma escolha marcada só para os oficiais não oferece", !IT.opcoesDaEscolha({ tipo: "elemento", soOficiais: true }).some((o) => o.valor === vidro.chave));
  const CATI = IT.normalizarCatalogo(G.RAMAOrdemItensDados);
  const entComp = CATI.porId["op.paranormal.componentes"];
  const protecao = CATI.porId["op.maldicao.acessorio.protecao-elemental"];
  if (protecao) {
    const reg = IT.modificacaoParaItem(protecao, { escolha: vidro.chave });
    t.ok("maldição Proteção elemental contra Vidro: elemento e cópia no registro", reg.ok && reg.registro.elemento === vidro.chave && reg.registro.elementosHomebrew[vidro.chave].nome === "Vidro" && /Vidro/.test(reg.registro.nome), JSON.stringify(reg));
    const itemM = G.RAMAOrdemInventario.normalizarDados({ grupo: "paranormal", modificacoes: [reg.registro] }, "item");
    const m0 = (itemM.modificacoes || [])[0];
    t.ok("  a ficha guarda a maldição de Vidro (com a cópia)", m0 && m0.elemento === vidro.chave && m0.elementosHomebrew && m0.elementosHomebrew[vidro.chave], JSON.stringify(itemM.modificacoes));
    t.ok("  sem preço de maldição do livro para Vidro (tabela só dos oficiais)", !IT.PRECO_DA_MALDICAO[vidro.chave]);
  } else t.ok("catálogo de itens com porId", false, Object.keys(IT).join(","));
  if (entComp) {
    const inst = IT.paraInventario(entComp, { escolha: vidro.chave });
    t.ok("Componentes ritualísticos de Vidro: o item leva o elemento e a cópia", inst.ok !== false && JSON.stringify(inst).indexOf(vidro.chave) >= 0 && /Vidro/.test(JSON.stringify(inst)), JSON.stringify(inst).slice(0, 300));
  }
}

t.grupo("Elemento Homebrew · origens Exorcizado e Ferido por Ritual (v9.28)");
{
  EL.registrar(vidro);
  const base = (origem) => R.normalizar({ classe: "combatente", origem, nex: 5, atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 2 }, homebrew: { elementos: { [vidro.chave]: vidro } } });
  const ex = base("exorcizado");
  const vEx = E.vagas(ex).filter((v) => v.id === "b.origem.exorcizado")[0];
  const simEx = vEx ? E.simular(copia(ex), vEx, { valor: "", opcoes: { elemento: vidro.chave } }, {}).avaliacao : null;
  t.ok("Exorcizado aceita Vidro (RD 5 contra o elemento: regra genérica)", simEx && simEx.valido, JSON.stringify(simEx || E.vagas(ex).map((v) => v.id)));
  if (vEx) E.registrar(ex, vEx, { valor: "", opcoes: { elemento: vidro.chave } });
  const rdEx = R.resistencias ? R.resistencias(ex) : null;
  const linha = rdEx ? JSON.stringify(rdEx) : "";
  t.ok("  e a RD 5 contra Vidro entra na conta", rdEx && linha.indexOf(vidro.chave) >= 0 && /Vidro/.test(linha), linha.slice(0, 300));
  const fr = base("feridoPorRitual");
  const vFr = E.vagas(fr).filter((v) => v.id === "b.origem.feridoPorRitual")[0];
  const simFr = vFr ? E.simular(copia(fr), vFr, { valor: "", opcoes: { elemento: vidro.chave } }, {}).avaliacao : null;
  t.ok("Ferido por Ritual recusa Vidro (perícia por elemento é tabela do livro)", simFr && !simFr.valido && /elementos do livro/.test(JSON.stringify(simFr)), JSON.stringify(simFr));
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
