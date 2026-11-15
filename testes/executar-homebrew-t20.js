/* =====================================================================
   R.A.M.A. — testes: Raça, Origem, Divindade e Classe Homebrew de Tormenta20 (v9.10–9.12)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-t20.js

   A raça Homebrew pelo MOTOR de Tormenta20 (o mesmo do Apps Script):
   chave versionada pelo conteúdo, só os efeitos que o motor já soma,
   tamanho e deslocamento, atributos fixos e à escolha, a escolha de
   perícia feita na criação (o "traço inicial") e o efeito na ficha. A
   cópia guardada na ficha sobrevive à normalização e à mesa; mudar a
   biblioteca não muda o personagem em jogo; sem cópia e sem catálogo,
   nada é inventado. Biblioteca, arquivo e pacote pelos adaptadores.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.location = globalThis.location || { search: "" };
globalThis.navigator = globalThis.navigator || { onLine: true };

const ARQUIVOS = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js", "js/tema-modelo.js"]
  .concat(["dados", "expressao", "racas", "classes-a", "classes-b", "classes-c", "origens", "deuses", "poderes", "equipamento",
    "magias", "magias-1", "magias-2", "magias-3", "magias-4", "magias-5", "ameacas", "ameacas-1", "ameacas-2", "ameacas-3", "ameacas-4",
    "ameacas-5", "ameacas-6", "ameacas-7", "parceiros", "itens-magicos", "itens-magicos-2", "mesa-dados", "regras", "mesa", "homebrew-t20"].map((a) => "js/tormenta20/" + a + ".js"))
  .concat(["js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/homebrew-adaptadores.js", "js/pacotes-homebrew.js"]);
for (const caminho of ARQUIVOS) {
  try { (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url))); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(n, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${n}`); } else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${n}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const G = globalThis, RA = G.RAMATormenta20Racas, R = G.RAMATormenta20, H = G.RAMATormenta20Homebrew, A = G.RAMAHomebrewAdaptadores;
const copia = (x) => JSON.parse(JSON.stringify(x));

/* ---------------- a definição ---------------- */
t.grupo("Raça Homebrew · a definição");
const bruta = {
  nome: "Vidrado", homebrewId: "f1e2d3c4-sintetico", descricao: "Gente de vidro soprado.", tamanho: "pequeno", deslocamento: 6,
  atributos: { fixo: { des: 2, sab: 1, "for": -1, car: 7 } },
  habilidades: [
    { nome: "Pele de Cristal", resumo: "Reflete o calor.", efeitos: [{ t: "bonus", alvo: "defesa", valor: 1 }, { t: "rd", valor: 5, tipos: ["fogo"] }, { t: "magia", id: "bolaDeFogo" }, { t: "bonus", alvo: "ataque", valor: 9 }] },
    { nome: "Olhar Lapidado", resumo: "Enxerga no escuro.", efeitos: [{ t: "sentido", valor: "visaoNoEscuro" }], escolhas: [{ tipo: "pericia", quantidade: 1, efeito: { t: "treino" } }, { tipo: "poderGeral" }] },
    { nome: "Têmpera", resumo: "Resistente.", efeitos: [{ t: "pvNivel", inicial: 3, valor: 1 }] },
    { id: "corpo", nome: "Truque", efeitos: [{ t: "tamanho", valor: "colossal" }] },
  ],
};
const vid = RA.normalizarRacaHomebrew(bruta);
t.ok("chave versionada hbr-<id>-<hash>", /^hbr-f1e2d3c4-[a-z0-9]+$/.test(vid.id));
t.ok("mudar a definição muda a chave (o personagem em jogo fica com a dele)", RA.normalizarRacaHomebrew(Object.assign(copia(bruta), { deslocamento: 9 })).id !== vid.id);
const semId = copia(vid); delete semId.id;
t.ok("normalizar de novo a mesma definição dá a mesma chave", RA.normalizarRacaHomebrew(Object.assign(semId, { id: "" })).id === vid.id);
t.iguais("atributos: limitados a −2…+2 (o +7 vira +2)", vid.atributos.fixo, { "for": -1, des: 2, sab: 1, car: 2 });
t.iguais("só efeitos que o motor já soma (magia e bônus em ataque saem)", vid.habilidades.filter((h) => h.id === "h1")[0].efeitos.map((e) => e.t), ["bonus", "rd"]);
t.iguais("uma escolha por habilidade, só de perícia (poder geral sai)", vid.habilidades.filter((h) => h.id === "h2")[0].escolhas, [{ id: "h2e", tipo: "pericia", quantidade: 1, efeito: { t: "treino" } }]);
t.ok("tamanho e deslocamento viram a habilidade \"Tamanho e deslocamento\" (a falsa \"corpo\" de entrada sai)", vid.habilidades[0].id === "corpo" && vid.habilidades[0].efeitos.length === 2 && vid.habilidades.filter((h) => h.id === "corpo").length === 1 && !JSON.stringify(vid).includes("colossal"));
t.ok("fonte Homebrew, referência \"Homebrew\"", vid.fonte === "HOMEBREW" && vid.homebrew && RA.referencia(vid) === "Homebrew" && RA.referencia(RA.RACA.anao) === "p. 20");
const media = RA.normalizarRacaHomebrew({ nome: "Comum", atributos: { escolha: { quantidade: 2, valor: 1 }, fixo: { con: 1 } } });
t.ok("Médio, 9m: sem a habilidade de corpo; escolha de atributos exclui o fixo", !media.habilidades.length && media.atributos.escolha.quantidade === 2 && media.atributos.escolha.exceto.join() === "con");

/* ---------------- no motor ---------------- */
t.grupo("Raça Homebrew · no motor (criação e ficha)");
const atrBase = { "for": 1, des: 1, con: 2, "int": 0, sab: 1, car: 0 };
const fichaCom = (raca, extra) => R.normalizar(Object.assign({ atributosBase: atrBase, raca: raca, origem: { id: "acolito", beneficios: [] }, niveis: [{ classe: "guerreiro", escolhas: {} }] }, extra || {}));
const f1 = fichaCom({ id: vid.id, escolhas: { h2e: ["furtividade"] } }, { homebrew: { racas: { [vid.id]: vid } } });
const c1 = R.calcular(f1);
const fHum = fichaCom({ id: "humano", atributos: ["for", "des", "con"], escolhas: {} });
t.ok("a raça Homebrew sobrevive à normalização, com a cópia", f1.raca.id === vid.id && f1.homebrew.racas[vid.id].nome === "Vidrado");
t.iguais("atributos: For 1−1, Des 1+2, Sab 1+1, Car 0+2", [c1.atr["for"], c1.atr.des, c1.atr.sab, c1.atr.car], [0, 3, 2, 2]);
t.iguais("PV: Guerreiro 20 + Con 2 + Têmpera 3 = 25", c1.pv.max, 25);
t.iguais("Defesa: 10 + Des 3 + Pele de Cristal 1 = 14", c1.defesa.total, 14);
t.iguais("tamanho Pequeno e deslocamento 6m", [c1.tamanho.chave, c1.deslocamento.terrestre], ["pequeno", 6]);
t.ok("redução de fogo 5 e visão no escuro", c1.rd.fogo === 5 && !!c1.sentidos.visaoNoEscuro);
t.ok("o traço escolhido na criação (Furtividade) entra treinado", c1.pericias.furtividade.treinado && !R.calcular(fichaCom({ id: vid.id, escolhas: {} }, { homebrew: { racas: { [vid.id]: vid } } })).pericias.furtividade.treinado);
t.ok("as habilidades aparecem como fontes de raça (Homebrew)", c1.fontes.some((f) => f.tipoFonte === "raca" && f.nome === "Pele de Cristal" && f.def.homebrew));
const bonus = RA.normalizarRacaHomebrew({ nome: "Talhado", homebrewId: "b0b0b0b0", atributos: { escolha: { quantidade: 2, valor: 1 } }, habilidades: [{ nome: "Talento", escolhas: [{ tipo: "pericia", quantidade: 2, efeito: { t: "bonus", valor: 2 } }] }] });
const f2 = fichaCom({ id: bonus.id, atributos: ["int", "car"], escolhas: { h1e: ["diplomacia", "atuacao"] } }, { homebrew: { racas: { [bonus.id]: bonus } } });
const c2 = R.calcular(f2), cH = R.calcular(fichaCom({ id: bonus.id, atributos: ["int", "car"], escolhas: {} }, { homebrew: { racas: { [bonus.id]: bonus } } }));
t.iguais("atributos à escolha: +1 em Int e Car", [c2.atr["int"], c2.atr.car], [1, 1]);
t.iguais("bônus à escolha: +2 em Diplomacia e Atuação", [c2.pericias.diplomacia.total - cH.pericias.diplomacia.total, c2.pericias.atuacao.total - cH.pericias.atuacao.total], [2, 2]);
t.ok("resumo da Mesa (servidor) mostra o nome da raça", R.resumoParaMesa(f1).raca === "Vidrado");

/* ---------------- a cópia ---------------- */
t.grupo("Raça Homebrew · cópia e versão");
t.ok("normalizar de novo (mesa, sincronia) mantém a cópia", R.normalizar(copia(f1)).homebrew.racas[vid.id].habilidades.length === vid.habilidades.length);
const outra = RA.normalizarRacaHomebrew(Object.assign(copia(bruta), { homebrewId: "c0c0c0c0-sintetico" }));
t.ok("sem cópia na ficha e desconhecida do catálogo: a chave some (nada inventado)", R.normalizar({ raca: { id: outra.id } }).raca.id === "");
RA.registrarRacaHomebrew(outra);
const escolhidaDaLista = R.normalizar({ raca: { id: outra.id }, niveis: [{ classe: "guerreiro" }] });
t.ok("escolhida de uma lista da biblioteca: a normalização embute a cópia", escolhidaDaLista.homebrew && escolhidaDaLista.homebrew.racas[outra.id].nome === "Vidrado");
t.ok("entra nas listas de escolha (racasDisponiveis) sem mexer em RACAS", RA.racasDisponiveis().some((r) => r.id === outra.id) && RA.RACAS.every((r) => !r.homebrew));
const v2 = RA.normalizarRacaHomebrew(Object.assign(copia(bruta), { deslocamento: 12 }));
RA.registrarRacaHomebrew(v2);
const emJogo = R.normalizar(copia(f1));
t.ok("editar a raça na biblioteca (nova versão) não muda o personagem em jogo", emJogo.raca.id === vid.id && R.calcular(emJogo).deslocamento.terrestre === 6);
const adulterada = copia(f1); adulterada.homebrew.racas[vid.id].habilidades.push({ nome: "Trapaça", efeitos: [{ t: "bonus", alvo: "ataque", valor: 10 }, { t: "imune", valor: "fogo" }] });
t.ok("a cópia da ficha passa pelo mesmo filtro (efeito fora da lista sai)", !JSON.stringify(R.normalizar(adulterada).homebrew).includes("imune") && !JSON.stringify(R.normalizar(adulterada).homebrew).includes("\"ataque\""));
t.ok("ficha com raça do livro: nenhum bloco homebrew", !("homebrew" in fHum) && !("homebrew" in R.fichaVazia()));

/* ---------------- textos ---------------- */
t.grupo("Raça Homebrew · prévia e revisão");
const pv = H.previaRaca(vid);
t.ok("a prévia diz atributos, corpo e cada habilidade", /Destreza \+2/.test(pv[0]) && /Pequeno, deslocamento 6m/.test(pv[1]) && pv.some((l) => /Pele de Cristal: \+1 em Defesa; redução de fogo 5/.test(l)) && pv.some((l) => /1 perícia à escolha, treinada/.test(l)));
const au = H.automacao(vid);
t.ok("revisão: o automático, a escolha de quem joga e o que fica com a mesa", au.automatico.some((l) => /Têmpera/.test(l)) && au.escolha.some((l) => /Olhar Lapidado/.test(l)) && au.mesa.length >= 1);

/* ---------------- biblioteca, arquivo, pacote ---------------- */
t.grupo("Raça Homebrew · biblioteca, arquivo e pacote");
const limpa = (d) => { const x = copia(d); ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach((k) => delete x[k]); x.habilidades = x.habilidades.filter((h) => h.id !== "corpo"); return x; };
t.ok("o cartão Raça está entre os tipos de Tormenta20", A.adaptador("tormenta20").tipos.some((x) => x.chave === "raca") && A.especDoSubtipo("tormenta20", "estrutural", "raca"));
const gR = A.guardar("tormenta20", "estrutural", "raca", { nome: "Vidrado", descricao: "Gente de vidro soprado.", valores: {}, def: limpa(vid) });
t.ok("Raça guardada: coluna \"raca\", grupo estrutural, a definição inteira", gR.ok && gR.registro.tipo === "raca" && gR.registro.modelo.grupo === "estrutural" && gR.registro.modelo.def.habilidades.length === 3);
const daBib = H.deRegistro(Object.assign({}, gR.registro, { id: "f1e2d3c4-sintetico" }));
t.ok("da biblioteca volta a mesma raça (mesma chave)", daBib.def.id === vid.id && daBib.def.descricao === "Gente de vidro soprado.");
t.ok("resumo da lista: tamanho e habilidades", /Pequeno · 3 habilidades/.test(A.resumo(gR.registro)));
t.ok("destino: nativa em T20, incompatível em Ordem", A.destinoNaFicha(gR.registro, "tormenta20").modo === "nativo" && A.destinoNaFicha(gR.registro, "ordem").modo === "incompativel");
const arq = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gR.registro), gR.registro))));
t.ok("exportar e importar: atributos, corpo e habilidades voltam", arq.ok && arq.dados.modelo.def.tamanho === "pequeno" && arq.dados.modelo.def.atributos.fixo.des === 2 && arq.dados.modelo.def.habilidades[0].efeitos[1].t === "rd" && !arq.dados.modelo.def.habilidades.some((h) => h.id === "corpo"), JSON.stringify(arq.ok ? arq.dados.modelo : arq));
t.ok("pacote: a Raça de T20 só em pacote de T20", A.compativelComPacote(gR.registro, "tormenta20").ok && !A.compativelComPacote(gR.registro, "ordem").ok && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "raca"));

/* ================= v9.11: Origem e Divindade ================= */
const OR = G.RAMATormenta20Origens, DE = G.RAMATormenta20Deuses;
t.grupo("Origem Homebrew de T20 · definição e motor");
const orgB = { nome: "Soprador de Vidro", homebrewId: "a9b8c7d6-sintetico", descricao: "Trabalhava nas fornalhas.", itens: ["Maçarico", { texto: "Avental de couro" }, ""],
  pericias: ["oficio:artesao", "investigacao", "inventada"], poderes: ["vontadeDeFerro", "fulgorSolar", "naoExiste"],
  unico: { nome: "Olho de Vidreiro", resumo: "Percebe defeitos.", efeitos: [{ t: "bonus", alvo: "defesa", valor: 1 }, { t: "magia", id: "x" }] } };
const sop = OR.normalizarHomebrew(orgB);
t.ok("chave versionada hbor-<id>-<hash>", /^hbor-a9b8c7d6-[a-z0-9]+$/.test(sop.id));
t.iguais("perícias e poderes válidos (concedido e inventados saem); itens em texto", [sop.pericias, sop.poderes, sop.itens], [["oficio:artesao", "investigacao"], ["vontadeDeFerro"], ["Maçarico", "Avental de couro"]]);
t.ok("poder único: só os efeitos aceitos, fonte Homebrew", sop.unico.id === "hbUnico" && sop.unico.efeitos.length === 1 && sop.fonte === "HOMEBREW");
const fOrg = (ben, extra) => R.normalizar(Object.assign({ atributosBase: Object.assign({}, atrBase, { sab: 1 }), raca: { id: "humano", atributos: ["for", "des", "con"] }, origem: { id: sop.id, beneficios: ben }, niveis: [{ classe: "guerreiro", escolhas: {} }], homebrew: { origens: { [sop.id]: sop } } }, extra || {}));
const fo = fOrg([{ tipo: "pericia", id: "investigacao" }, { tipo: "poder", id: "hbUnico" }]);
const co = R.calcular(fo), cSem = R.calcular(fichaCom({ id: "humano", atributos: ["for", "des", "con"] }));
t.ok("a origem Homebrew sobrevive à normalização, com a cópia", fo.origem.id === sop.id && fo.homebrew.origens[sop.id].unico.nome === "Olho de Vidreiro");
t.ok("benefício perícia: Investigação treinada", co.pericias.investigacao.treinado);
t.iguais("benefício poder único: +1 na Defesa", co.defesa.total - cSem.defesa.total, 1);
const fo2 = fOrg([{ tipo: "poder", id: "vontadeDeFerro" }, { tipo: "pericia", id: "oficio:artesao" }]);
t.ok("benefício poder geral (Vontade de Ferro) com as regras do livro", R.calcular(fo2).pericias.vontade.total - R.calcular(fo).pericias.vontade.total === 2);
t.ok("resumo da Mesa mostra a origem", R.resumoParaMesa(fo).origem === "Soprador de Vidro");
t.ok("sem cópia e sem catálogo: a origem some", R.normalizar({ origem: { id: "hbor-zzzzzzzz-abcdef", beneficios: [] } }).origem.id === "");
t.ok("entra nas listas (origensDisponiveis) sem mexer em ORIGENS", OR.origensDisponiveis().some((x) => x.id === sop.id) && OR.ORIGENS.every((x) => !x.homebrew));
const racaEOrigem = R.normalizar(Object.assign(copia(fo), { raca: { id: vid.id, escolhas: {} }, homebrew: { racas: { [vid.id]: vid }, origens: { [sop.id]: sop } } }));
t.ok("raça e origem Homebrew juntas: as duas cópias ficam", !!(racaEOrigem.homebrew.racas[vid.id] && racaEOrigem.homebrew.origens[sop.id]));

t.grupo("Divindade Homebrew de T20 · definição e motor");
const deusB = { nome: "Vitrea", titulo: "Deusa do Vidro", homebrewId: "d4c3b2a1-sintetico", energia: "positiva", armaPreferida: "adaga", devotos: ["anao", "guerreiro", "naoExiste"],
  obrigacoes: "Nunca quebra vidro de propósito.", poderes: ["fulgorSolar", "vontadeDeFerro"],
  poderesProprios: [{ nome: "Pele Translúcida", resumo: "Fica difícil de ver.", efeitos: [{ t: "bonus", alvo: "pericia.furtividade", valor: 2 }] }, { nome: "Brilho" }] };
const vit = DE.normalizarHomebrew(deusB);
t.ok("chave versionada hbdv-<id>-<hash>", /^hbdv-d4c3b2a1-[a-z0-9]+$/.test(vit.id));
t.iguais("poderes: só concedidos do livro, mais os próprios (chave da divindade)", vit.poderes, ["fulgorSolar", vit.id + "-p1", vit.id + "-p2"]);
t.iguais("devotos válidos; energia; arma", [vit.devotos, vit.energia, vit.armaPreferida], [["anao", "guerreiro"], "positiva", "adaga"]);
const semIdD = copia(vit); delete semIdD.id;
t.ok("normalizar de novo dá a mesma chave", DE.normalizarHomebrew(Object.assign(semIdD, { id: "" })).id === vit.id);
const fDev = (poder) => R.normalizar({ atributosBase: atrBase, raca: { id: "anao" }, origem: { id: "acolito", beneficios: [] }, niveis: [{ classe: "guerreiro", escolhas: {} }], divindade: { id: vit.id, energia: "", poderes: [{ id: poder }] }, homebrew: { deuses: { [vit.id]: vit } } });
const fd1 = fDev(vit.id + "-p1"), cd1 = R.calcular(fd1);
const cdSem = R.calcular(R.normalizar({ atributosBase: atrBase, raca: { id: "anao" }, origem: { id: "acolito", beneficios: [] }, niveis: [{ classe: "guerreiro", escolhas: {} }] }));
t.ok("a divindade Homebrew sobrevive à normalização, com a cópia", fd1.divindade.id === vit.id && fd1.homebrew.deuses[vit.id].nome === "Vitrea");
t.iguais("poder concedido próprio: +2 em Furtividade", cd1.pericias.furtividade.total - cdSem.pericias.furtividade.total, 2);
const fd2 = fDev("fulgorSolar"), cd2 = R.calcular(fd2);
const req2 = R.cumpreRequisitos(fd2, G.RAMATormenta20Poderes.PODER.fulgorSolar, null, cd2);
t.ok("poder concedido do livro: redução de frio 5 e o requisito \"devoto\" atendido", cd2.rd.frio === 5 && !JSON.stringify(req2).includes("devoto"), JSON.stringify(req2));
t.ok("devotos: anão pode, elfo arcanista não, humano sempre", DE.podeSerDevoto(vit, "anao", "", []) === true && DE.podeSerDevoto(vit, "elfo", "", ["arcanista"]) === false && DE.podeSerDevoto(vit, "humano", "", []) === true);
t.ok("resumo da Mesa mostra a divindade", R.resumoParaMesa(fd1).divindade === "Vitrea");
t.ok("sem cópia e sem catálogo: a divindade some", R.normalizar({ divindade: { id: "hbdv-zzzzzzzz-abcdef", poderes: [] } }).divindade === null);
t.ok("entra nas listas (deusesDisponiveis) sem mexer em DEUSES", DE.deusesDisponiveis().some((x) => x.id === vit.id) && DE.DEUSES.every((x) => !x.homebrew));
const tudoJunto = R.normalizar(Object.assign(copia(fd1), { origem: { id: sop.id, beneficios: [] }, homebrew: { deuses: { [vit.id]: vit }, origens: { [sop.id]: sop } } }));
const deNovo = R.normalizar(copia(tudoJunto));
t.ok("normalizar de novo mantém origem e divindade", !!(deNovo.homebrew.deuses[vit.id] && deNovo.homebrew.origens[sop.id]));

t.grupo("Origem e Divindade de T20 · biblioteca, arquivo e pacote");
const limpaD = (d) => { const x = copia(d); ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach((k) => delete x[k]); if (x.poderesProprios) { x.poderes = x.poderes.filter((k) => !/-p\d$/.test(k)); x.poderesProprios.forEach((p) => delete p.id); } return x; };
const gO = A.guardar("tormenta20", "estrutural", "origem", { nome: "Soprador de Vidro", descricao: "Trabalhava nas fornalhas.", valores: {}, def: limpaD(sop) });
const gD = A.guardar("tormenta20", "estrutural", "divindade", { nome: "Vitrea", descricao: "", valores: {}, def: limpaD(vit) });
t.ok("guardadas: colunas \"origem\" e \"divindade\" de T20", gO.ok && gO.registro.tipo === "origem" && gO.registro.modelo.sistema === "tormenta20" && gD.ok && gD.registro.tipo === "divindade");
t.ok("da biblioteca a origem volta com a mesma chave", H.deRegistro(Object.assign({}, gO.registro, { id: "a9b8c7d6-sintetico" })).def.id === sop.id);
t.ok("destino e resumo próprios de T20", /benefícios/.test(A.destinoNaFicha(gO.registro, "tormenta20").texto) && /Panteão/.test(A.destinoNaFicha(gD.registro, "tormenta20").texto) && /2 perícias · 1 poder · /.test(A.resumo(gO.registro)) && /energia positiva/.test(A.resumo(gD.registro)), A.resumo(gO.registro) + " | " + A.resumo(gD.registro));
const ida = (g) => G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(g.registro), g.registro))));
const aO = ida(gO), aD = ida(gD);
t.ok("exportar e importar: origem e divindade (com os poderes próprios) voltam", aO.ok && aO.dados.modelo.def.unico.nome === "Olho de Vidreiro" && aD.ok && aD.dados.modelo.def.poderesProprios.length === 2 && aD.dados.modelo.def.poderes.join() === "fulgorSolar", JSON.stringify(aD.ok ? aD.dados.modelo.def : aD));
t.ok("pacote: só em pacote de T20", A.compativelComPacote(gO.registro, "tormenta20").ok && !A.compativelComPacote(gD.registro, "ordem").ok && G.RAMAPacotesHomebrew.TIPOS.some((x) => x.chave === "divindade"));
t.ok("prévias", /Vontade de Ferro/.test(H.previaOrigem(sop).join(" ")) && /Pele Translúcida \(\+2 em Furtividade\)/.test(H.previaDeus(vit).join(" ")));

/* ================= v9.12: Classe ================= */
const CL = G.RAMATormenta20Classes;
t.grupo("Classe Homebrew de T20 · definição");
const clB = { nome: "Vidreiro", homebrewId: "c1a2b3c4-sintetico", atributo: "Destreza", pv: { inicial: 16, nivel: 4 }, pm: 4,
  pericias: { fixas: ["oficio", "reflexos", "inventada"], escolha: { n: 9, de: ["percepcao", "investigacao", "reflexos", "furtividade"] } },
  proficiencias: ["marciais", "voar"], magias: { tipo: "arcana", atributo: "int", progressao: "parcial", iniciais: 2, porNivel: 1 },
  niveisDePoder: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 99],
  habilidadesDaTabela: [
    { nivel: 1, nome: "Sopro Firme", resumo: "Resistente ao calor.", efeitos: [{ t: "rd", valor: 5, tipos: ["fogo"] }], escolhas: [{ tipo: "pericia", quantidade: 1, efeito: { t: "treino" } }] },
    { nivel: 3, nome: "Pele Temperada", efeitos: [{ t: "bonus", alvo: "defesa", valor: 2 }, { t: "imune", valor: "fogo" }] },
  ],
  poderesProprios: [{ nome: "Lâmina de Vidro", resumo: "+2 em Luta.", efeitos: [{ t: "bonus", alvo: "pericia.luta", valor: 2 }] }, { nome: "Catedral", ncMinimo: 10 }] };
const vdr = CL.normalizarHomebrew(clB);
t.ok("chave versionada hbcl-<id>-<hash>", /^hbcl-c1a2b3c4-[a-z0-9]+$/.test(vdr.id));
t.iguais("perícias: fixas válidas; à escolha sem as fixas e limitada às opções", [vdr.pericias.fixas, vdr.pericias.escolha], [["oficio", "reflexos"], { n: 3, de: ["percepcao", "investigacao", "furtividade"] }]);
t.iguais("proficiências válidas; magias parciais (até o 4º círculo)", [vdr.proficiencias, vdr.magias.circulos], [["marciais"], { 1: 1, 6: 2, 10: 3, 14: 4 }]);
t.iguais("tabela: magias e Sopro Firme no 1º, Pele Temperada no 3º, poder nos pares", [vdr.tabela[1], vdr.tabela[2], vdr.tabela[3], vdr.tabela[20]], [["magias", "h1"], ["poder"], ["h2"], ["poder"]]);
t.ok("só efeitos aceitos (imune sai); escolha de perícia na habilidade", vdr.habilidades.h2.efeitos.length === 1 && vdr.habilidades.h1.escolhas[0].id === "h1e");
t.ok("poderes: os próprios (chave da classe, nível mínimo) e Aumento de Atributo", vdr.poderes.length === 3 && vdr.poderes[0].id === vdr.id + "-cp1" && vdr.poderes[1].req.nc === 10 && vdr.poderes[2].aumento);
const semIdC = copia(vdr); delete semIdC.id;
t.ok("normalizar de novo (com tabela e poderes montados) dá a mesma chave", CL.normalizarHomebrew(Object.assign(semIdC, { id: "" })).id === vdr.id);

t.grupo("Classe Homebrew de T20 · no motor");
const fCl = (niveis, extra) => R.normalizar(Object.assign({ atributosBase: { "for": 0, des: 2, con: 2, "int": 2, sab: 0, car: 0 }, raca: { id: "humano", atributos: ["for", "sab", "car"] }, origem: { id: "acolito", beneficios: [] },
  niveis: niveis, homebrew: { classes: { [vdr.id]: vdr } } }, extra || {}));
const nv1 = [{ classe: vdr.id, escolhas: { pericias: ["percepcao", "investigacao"], oficios: ["artesao"], h1e: ["furtividade"] } }];
const c1c = R.calcular(fCl(nv1));
t.ok("a classe Homebrew sobrevive à normalização, com a cópia", fCl(nv1).niveis[0].classe === vdr.id && fCl(nv1).homebrew.classes[vdr.id].nome === "Vidreiro");
t.iguais("1º nível: PV 16 + Con 2 = 18; PM 4 + Int 2 (magias somam) = 6", [c1c.pv.max, c1c.pm.max], [18, 6]);
t.ok("perícias fixas e escolhidas treinadas; Ofício com especialização", c1c.pericias.reflexos.treinado && c1c.pericias.percepcao.treinado && c1c.pericias.investigacao.treinado && !!c1c.pericias["oficio:artesao"] && c1c.pericias["oficio:artesao"].treinado);
t.ok("Sopro Firme: redução de fogo 5 e a perícia escolhida (Furtividade) treinada", c1c.rd.fogo === 5 && c1c.pericias.furtividade.treinado);
t.ok("proficiência marcial; magias arcanas de 1º círculo pela Inteligência", c1c.proficiencias.marciais && c1c.magias.fontes["classe:" + vdr.id].circuloMax === 1 && c1c.magias.fontes["classe:" + vdr.id].atributo === "int");
const nv3 = nv1.concat([{ classe: vdr.id, escolhas: { poder: { id: vdr.id + "-cp1" } } }, { classe: vdr.id, escolhas: {} }]);
const c3c = R.calcular(fCl(nv3));
t.iguais("3º nível: PV 18 + 2 × (4 + 2) = 30; Pele Temperada +2 Defesa", [c3c.pv.max, c3c.defesa.total - c1c.defesa.total], [30, 2]);
t.iguais("o poder de classe escolhido no 2º nível: +2 em Luta", c3c.pericias.luta.total - c1c.pericias.luta.total - 1, 2);
const fSub = fCl(nv1);
const sub = R.subirNivel(fSub, vdr.id, { poder: { id: vdr.id + "-cp2" } }, { ignorarXp: true });
t.ok("subir de nível confere o nível mínimo do poder de classe (Catedral: 10º)", !sub.ok && /10º nível de Vidreiro/.test(sub.motivo), JSON.stringify(sub));
const multi = R.normalizar(Object.assign(copia(fCl(nv1)), { niveis: [{ classe: "guerreiro", escolhas: {} }, { classe: vdr.id, escolhas: {} }] }));
const cm = R.calcular(multi);
t.iguais("multiclasse (Guerreiro 1 / Vidreiro 1): PV 20 + 2 + 4 + 2 = 28", cm.pv.max, 28);
t.ok("resumo da Mesa mostra a classe", /Vidreiro 1/.test(R.resumoParaMesa(fCl(nv1)).classes));
const semCopiaC = R.normalizar({ niveis: [{ classe: "hbcl-zzzzzzzz-abcdef", escolhas: {} }] });
t.ok("sem cópia e sem catálogo: o nível FICA (nada apagado) e o motor o ignora", semCopiaC.niveis.length === 1 && !semCopiaC.homebrew && R.calcular(semCopiaC).pv.max >= 1);
t.ok("entra nas listas (classesDisponiveis) sem mexer em CLASSES", CL.classesDisponiveis().some((x) => x.id === vdr.id) && CL.CLASSES.every((x) => !x.homebrew));
t.ok("nome do poder de classe Homebrew (poderes avulsos)", R.nomeDoPoder ? R.nomeDoPoder(vdr.id + "-cp1") === "Lâmina de Vidro" : true);

t.grupo("Classe de T20 · biblioteca, arquivo e pacote");
const limpaC = (d) => { const x = copia(d); ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao", "habilidades", "tabela", "poderes"].forEach((k) => delete x[k]); x.poderesProprios.forEach((p) => delete p.id); return x; };
const gC = A.guardar("tormenta20", "estrutural", "classe", { nome: "Vidreiro", descricao: "", valores: {}, def: limpaC(vdr) });
t.ok("guardada: coluna \"classe\", sistema tormenta20", gC.ok && gC.registro.tipo === "classe" && gC.registro.modelo.sistema === "tormenta20" && !gC.registro.modelo.def.tabela);
t.ok("da biblioteca volta com a mesma chave", H.deRegistro(Object.assign({}, gC.registro, { id: "c1a2b3c4-sintetico" })).def.id === CL.normalizarHomebrew(Object.assign(limpaC(vdr), { nome: "Vidreiro", descricao: "", homebrewId: "c1a2b3c4-sintetico" })).id);
t.ok("destino e resumo de T20", /subir de nível/.test(A.destinoNaFicha(gC.registro, "tormenta20").texto) && /PV 16 \+ Con · PM 4\/nível · magias arcanas/.test(A.resumo(gC.registro)), A.resumo(gC.registro));
const aC = G.RAMAValidacao.importado(JSON.parse(JSON.stringify(G.RAMAValidacao.exportar(G.RAMAValidacao.tipoDeExportacao(gC.registro), gC.registro))));
t.ok("exportar e importar: habilidades, níveis de poder e poderes voltam (pelo motor de T20)", aC.ok && aC.dados.modelo.def.habilidadesDaTabela.length === 2 && aC.dados.modelo.def.niveisDePoder.length === 10 && aC.dados.modelo.def.poderesProprios.length === 2 && !aC.dados.modelo.def.tabela, JSON.stringify(aC.ok ? Object.keys(aC.dados.modelo.def) : aC));
t.ok("pacote: só em pacote de T20", A.compativelComPacote(gC.registro, "tormenta20").ok && !A.compativelComPacote(gC.registro, "ordem").ok);
t.ok("prévia", /1º nível: 18 PV/.test(H.previaClasse(vdr)[0]) && H.previaClasse(vdr).some((l) => /3º nível · Pele Temperada: \+2 em Defesa/.test(l)));

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
