/* =====================================================================
   R.A.M.A. — testes do Arquivos Secretos 6 (v5.3)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-as6.js

   A fonte e os catálogos (origens, poderes, ritual, itens, fichas), os
   pré-requisitos na progressão, as contas (Especialista em Proteção
   Leve, gerais), o estado da ficha (js/ordem/arquivo6.js: Salto de
   Dados, Escudo, Grilhões, Médico de Campo, doenças e venenos, Hesitação
   Forçada, Grão-Mestre) e a Evolução Modular (vagas, associação,
   desligar). Sem DOM e sem rede; dados sintéticos.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

for (const caminho of ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/arquivo3.js", "js/ordem/arquivo5.js", "js/ordem/arquivo6.js",
  "js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/sync.js",
  "js/ordem/criaturas-dados.js", "js/ordem/criaturas.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const G = globalThis;
const C = G.RAMAOrdemCatalogo, P = G.RAMAOrdemPoderes, R = G.RAMAOrdemRegras, E = G.RAMAOrdemProgressao;
const OP = G.RAMAOrdemOpcionais, A6 = G.RAMAOrdemArquivo6, A5 = G.RAMAOrdemArquivo5, A3 = G.RAMAOrdemArquivo3;
const EF = G.RAMAOrdemEfeitos, CD = G.RAMAOrdemCondicoes, IT = G.RAMAOrdemItens, RT = G.RAMAOrdemRituais;
const B = G.RAMAOrdemBiblioteca, S = G.RAMAFicha, SY = G.RAMASync, D = G.RAMADados;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, obtido, esperado) {
    const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
    t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`);
  },
};

const INV = { itens: [] };
function ficha(extra) {
  const o = R.fichaVazia();
  Object.keys(extra || {}).forEach((k) => { o[k] = extra[k]; });
  return R.normalizar(JSON.parse(JSON.stringify(o)));
}
function reg(etapa, tipo, valor, opcoes) {
  return { id: "r-" + etapa.replace(/\./g, "_"), etapa, tipo, valor, opcoes: opcoes || {}, registradoEm: "2026-10-30T10:00:00.000Z" };
}
function vaga(o, id) { return E.vagas(o).filter((v) => v.id === id)[0]; }
function avaliar(o, id, valor, opcoes) {
  const v = vaga(o, id);
  if (!v) return { valido: false, semVaga: true, motivos: ["sem vaga " + id] };
  return E.simular(o, v, { valor, opcoes: opcoes || {} }, null).avaliacao;
}
function volta(o) { return R.normalizar(JSON.parse(JSON.stringify(o))); }
function cena(o) { const antes = o.condicoes.cena.id; CD.novaCena(o.condicoes); A6.aoTrocarDeCena(o, antes); }
const ATR = { agi: 2, for: 2, int: 2, pre: 2, vig: 2 };

const catItens = await IT.carregar();
const catRit = await RT.carregar();

/* =====================================================================
   FONTE E CATÁLOGOS
   ===================================================================== */

t.grupo("Fonte · Arquivos Secretos 6, v1.0 (não é Extra)");
const livro = C.livro("AS6");
t.igual("no registro único dos livros", [livro.sigla, livro.nome, livro.edicao, !!livro.avulsa], ["AS6", "Arquivos Secretos 6", "v1.0", false]);
t.ok("  ehAvulsa é falso e a referência tem página", !C.ehAvulsa("AS6") && C.referencia(C.origem("cientistaExPanacea")) === "Arquivos Secretos 6, p. 66");
t.ok("  e aparece nos mapas de rótulo (biblioteca, rituais, itens)", C.mapaDosLivros("curto").AS6 === "Arquivos Secretos 6" && RT.ROTULO_FONTE.AS6 === "Arquivos Secretos 6");
const tudoAs6 = [].concat(C.ORIGENS, P.TODOS, catItens.itens, catRit.rituais).filter((e) => e.fonte === "AS6");
t.ok("nenhuma entrada do AS6 ficou como Extra nem sem página", tudoAs6.length > 0 && tudoAs6.every((e) => e.fonte === "AS6" && e.pagina >= 66 && e.pagina <= 76));

t.grupo("Origens (p. 66)");
const orgs = C.ORIGENS.filter((o) => o.fonte === "AS6");
t.igual("três origens, com as perícias do livro", orgs.map((o) => o.chave + ":" + o.pericias.join("+")),
  ["cientistaExPanacea:atualidades+ciencias", "segurancaExPanacea:luta+pontaria", "cobaiaSobrevivente:fortitude+vontade"]);
const exp = C.origem("cientistaExPanacea").substituicoes[0];
t.ok("Existe uma Explicação: no teste de Ocultismo, 2 PE para usar Ciências", exp.de === "ocultismo" && exp.para === "ciencias" && exp.custo === 2);
t.ok("  é troca de perícia no teste — nada de efeito permanente nem treino", !(C.origem("cientistaExPanacea").efeitos || []).length);
const cont = C.origem("segurancaExPanacea").acoesNoTeste[0];
t.ok("Técnicas de Contenção: +5 no teste de manobra por 2 PE, só confirmando a manobra", cont.valor === 5 && cont.custo === 2 && cont.pericias.join() === "luta" && /manobra/.test(cont.condicao));
t.ok("Forças para Enfrentar: o trauma é uma escolha de texto, e o cartão tem controles", C.origem("cobaiaSobrevivente").controles && C.origem("cobaiaSobrevivente").escolhas[0].chave === "trauma");
if (B) {
  const sec = B.secoes("origens").filter((s) => /Arquivos Secretos 6/.test(s.titulo))[0];
  t.ok("a biblioteca tem uma seção de origens do AS6, com as três", !!sec && sec.entradas.length === 3);
  t.igual("  filtro por livro AS6 na aba de gerais: três poderes", B.filtrar(B.secoes("gerais"), "", { livro: "AS6" }).reduce((n, s) => n + s.entradas.length, 0), 3);
}

t.grupo("Poderes (p. 67–71)");
const pod = P.TODOS.filter((p) => p.fonte === "AS6");
t.igual("15 poderes: 9 de classe, 3 gerais e 3 paranormais", pod.map((p) => p.tipo).sort().join(","),
  "classe,classe,classe,classe,classe,classe,classe,classe,classe,geral,geral,geral,paranormal,paranormal,paranormal");
t.igual("  classes e páginas", pod.filter((p) => p.tipo === "classe").map((p) => p.classes[0] + ":" + p.pagina),
  ["combatente:67", "combatente:67", "especialista:68", "especialista:68", "especialista:68", "especialista:68", "especialista:68", "ocultista:69", "ocultista:69"]);
t.ok("Escudo Espiral (Morte 1) e Salto de Dados (Energia 2); Grilhões sem requisito", JSON.stringify(P.poder("escudoEspiralTemporal").requisitos) === JSON.stringify([{ tipo: "elemento", elemento: "morte", quantidade: 1 }]) &&
  JSON.stringify(P.poder("saltoDeDados").requisitos) === JSON.stringify([{ tipo: "elemento", elemento: "energia", quantidade: 2 }]) && !P.poder("grilhoesDeLodo").requisitos.length);
t.ok("Adaptação Climática: +2 em Fortitude, e a nota diz que NÃO é imunidade a fogo/frio", P.poder("adaptacaoClimatica").efeitos[0].valor === 2 && /não é imunidade a dano de fogo ou de frio/.test(P.poder("adaptacaoClimatica").nota));

t.grupo("Pré-requisitos, conferidos na progressão");
const comb = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: { luta: "treinado" } });
const combSem = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: {} });
t.ok("Análise Combativa: treinado em Luta passa; sem Luta nem Pontaria, não", avaliar(comb, "d3.poderClasse", "analiseCombativa").valido && !avaliar(combSem, "d3.poderClasse", "analiseCombativa").valido);
const med = (nex, extra) => ficha(Object.assign({ classe: "especialista", origem: "academico", trilha: "medico", nex, atributos: ATR, pericias: { medicina: "treinado" } }, extra || {}));
t.ok("Médico da Salvação: com Paramédico (NEX 10 da trilha) passa em NEX 15", avaliar(med(15), "d3.poderClasse", "medicoDaSalvacao").valido);
t.ok("  sem a trilha Médico de Campo, não", !avaliar(ficha({ classe: "especialista", origem: "academico", nex: 15, atributos: ATR, pericias: { medicina: "treinado" } }), "d3.poderClasse", "medicoDaSalvacao").valido);
t.ok("Veterano da Equipe de Trauma: NEX 45 (Equipe em 40) passa; NEX 15 não", avaliar(med(45), "d9.poderClasse", "veteranoDaEquipeDeTrauma").valido && !avaliar(med(15), "d3.poderClasse", "veteranoDaEquipeDeTrauma").valido);
t.ok("Resgatar da Morte: precisa de Resgate (NEX 65) — NEX 60 não, NEX 75 sim", !avaliar(med(60), "d12.poderClasse", "resgatarDaMorte").valido && avaliar(med(75), "d15.poderClasse", "resgatarDaMorte").valido);
const comEsp = med(30, { escolhas: [reg("d3.poderClasse", "poderClasse", "especialistaEmEmergencias")] });
t.ok("Doutor em Emergências: com Especialista em Emergências passa; sem, não", avaliar(comEsp, "d6.poderClasse", "doutorEmEmergencias").valido && !avaliar(med(30), "d6.poderClasse", "doutorEmEmergencias").valido);
t.ok("Farmacêutico de Campo: Medicina e Profissão treinadas", avaliar(med(15, { pericias: { medicina: "treinado", profissao: "treinado" } }), "d3.poderClasse", "farmaceuticoDeCampo").valido &&
  !avaliar(med(15), "d3.poderClasse", "farmaceuticoDeCampo").valido);
const ocu = (nex, escolhas) => ficha({ classe: "ocultista", origem: "academico", nex, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 1 }, escolhas: escolhas || [] });
const espCo = reg("d3.poderClasse", "poderClasse", "especialistaEmElemento", { elemento: "conhecimento" });
t.ok("Dominador de Elemento: Especialista no MESMO elemento e NEX 30", avaliar(ocu(30, [espCo]), "d6.poderClasse", "dominadorDeElemento", { elemento: "conhecimento" }).valido &&
  !avaliar(ocu(30, [espCo]), "d6.poderClasse", "dominadorDeElemento", { elemento: "energia" }).valido);
const mesCo = reg("d9.poderClasse", "poderClasse", "mestreEmElemento", { elemento: "conhecimento" });
t.ok("Grão-Mestre em Elemento: Mestre no mesmo elemento e NEX 60", avaliar(ocu(60, [espCo, mesCo]), "d12.poderClasse", "graoMestreEmElemento", { elemento: "conhecimento" }).valido &&
  !avaliar(ocu(60, [espCo]), "d12.poderClasse", "graoMestreEmElemento", { elemento: "conhecimento" }).valido);
const comSorr = ficha({ classe: "combatente", origem: "academico", nex: 30, atributos: ATR, pericias: { luta: "treinado" }, escolhas: [reg("d3.poderClasse", "poderClasse", "sorrateiro")] });
t.ok("Muito Sorrateiro: só com Sorrateiro", avaliar(comSorr, "d6.poderClasse", "muitoSorrateiro").valido && !avaliar(comb, "d3.poderClasse", "muitoSorrateiro").valido);
t.ok("Especialista em Armas Improvisadas: For 2 ou Agi 2 e Luta", avaliar(comb, "d3.poderClasse", "especialistaEmArmasImprovisadas").valido && !avaliar(combSem, "d3.poderClasse", "especialistaEmArmasImprovisadas").valido);
const ocuT = ficha({ classe: "ocultista", origem: "academico", nex: 15, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 1 } });
t.ok("Escudo Espiral Temporal (Transcender): sem poder de Morte, recusado", !avaliar(ocuT, "d3.poderClasse", "transcender", { poder: { valor: "escudoEspiralTemporal", opcoes: {} } }).valido);

t.grupo("Contas: Especialista em Proteção Leve e os gerais");
const defBase = (o, inv) => R.calcular(o, inv).defesa.total;
const leve = { itens: [S.criarItem("armadura", { nome: "Leve", defesa: 5, ordem: { protecao: { tipo: "leve" }, emUso: true } })] };
const pesada = { itens: [S.criarItem("armadura", { nome: "Pesada", defesa: 10, ordem: { protecao: { tipo: "pesada" }, emUso: true } })] };
const naMochila = { itens: [S.criarItem("armadura", { nome: "Leve", defesa: 5, ordem: { protecao: { tipo: "leve" } } })] };
const epl = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: { luta: "treinado" }, escolhas: [reg("d3.poderClasse", "poderClasse", "especialistaEmProtecaoLeve")] });
t.ok("proteção leve em uso: +2 na Defesa", defBase(epl, leve) === defBase(comb, leve) + 2);
t.ok("  e +2 em Reflexos", R.bonusDePericia(epl, "reflexos", leve).total === R.bonusDePericia(comb, "reflexos", leve).total + 2);
t.ok("  pesada em uso, ou leve só na mochila: nada", defBase(epl, pesada) === defBase(comb, pesada) && defBase(epl, naMochila) === defBase(comb, naMochila));
const ad = ficha({ classe: "combatente", origem: "academico", nex: 15, atributos: ATR, pericias: { luta: "treinado" }, escolhas: [reg("d3.poderClasse", "poderClasse", "adaptacaoClimatica")] });
t.ok("Adaptação Climática: +2 em Fortitude na conta", R.bonusDePericia(ad, "fortitude", INV).total === R.bonusDePericia(comb, "fortitude", INV).total + 2);

t.grupo("Ritual: Hesitação Forçada (p. 72)");
const hes = catRit.porId["as6.ritual.hesitacao-forcada"];
t.ok("Sangue e Conhecimento, 1º círculo, sustentada, Vontade parcial", hes && hes.elementos.join("+") === "sangue+conhecimento" && hes.todosOsElementos && hes.circulo === 1 && hes.duracao === "sustentada" && hes.resistencia === "Vontade parcial");
const rh = RT.paraFicha(hes, {});
const ritFicha = rh && rh.ok ? rh.ritual || rh.dados || rh : null;
const versoesH = hes.versoes.map((v) => v.nome + ":" + (v.custo || 0) + ":" + (v.requisito || ""));
t.igual("Discente +2 PE (2º círculo); Verdadeiro +5 PE (3º círculo e afinidade)", versoesH.slice(-2), ["Discente:2:2º círculo", "Verdadeiro:5:3º círculo e afinidade"]);
t.ok("  a Verdadeira muda a resistência e o dado (o menor), sem repetir a Normal", /Vontade anula/.test(hes.versoes[hes.versoes.length - 1].alteracoes) && /MENOR/.test(hes.versoes[hes.versoes.length - 1].alteracoes));
t.ok("o efeito estruturado existe, com as três versões e nenhum número inventado", EF.ritualComEfeito("as6.ritual.hesitacao-forcada") && Object.keys(EF.ritualComEfeito("as6.ritual.hesitacao-forcada").versoes).join() === "Normal,Discente,Verdadeiro");

t.grupo("Itens, maldições e modificações (p. 73–74)");
const it6 = catItens.itens.filter((e) => e.fonte === "AS6");
t.igual("sete entradas", it6.map((e) => e.id.split(".").slice(1).join(".")).sort(),
  ["amaldicoado.anel-invertido", "arma.lanca-nitrogenio", "geral.aplicador-de-adrenalina", "maldicao.medicamento.aceleracao-espiral", "maldicao.medicamento.esforco-espiral",
    "mod.medicamento.emulsificante-quimico", "mod.medicamento.potencializador-quimico"]);
const lanca = catItens.porId["as6.arma.lanca-nitrogenio"];
t.ok("Lança-nitrogênio: categoria III, pesada, duas mãos, curto, 6d6 frio, x2, combustível", lanca.categoria === 3 && lanca.arma.tipoDano === "Frio" && lanca.arma.multiplicador === 2 && lanca.espacos === 2 && lanca.arma.proficiencia === "pesada" &&
  lanca.arma.empunhadura === "duasMaos" && lanca.arma.dano === "6d6" && lanca.arma.municao === "op.municao.combustivel");
t.ok("Anel Invertido: Morte, categoria II, 0,5 espaço", catItens.porId["as6.amaldicoado.anel-invertido"].elemento === "morte" && catItens.porId["as6.amaldicoado.anel-invertido"].espacos === 0.5);
function noInventario(id, extra) {
  const m = IT.paraInventario(catItens.porId[id], Object.assign({ quantidade: 1, catalogo: catItens }, extra || {}));
  return S.criarItem(m.tipo, m.dados);
}
const cic = noInventario("op.geral.cicatrizante");
const apl = noInventario("as6.geral.aplicador-de-adrenalina");
t.ok("o cicatrizante e o Aplicador contam como medicamento (marcador)", IT.marcadoresDoItem(cic).tags.medicamento && IT.marcadoresDoItem(apl).tags.medicamento);
const velhoCic = S.criarItem("item", { nome: "Cicatrizante", origemCatalogoId: "op.geral.cicatrizante", ordem: { categoria: "I" } });
t.ok("  inclusive um cicatrizante antigo, sem o marcador", IT.marcadoresDoItem(velhoCic).tags.medicamento);
const pot = catItens.porId["as6.mod.medicamento.potencializador-quimico"];
const emu = catItens.porId["as6.mod.medicamento.emulsificante-quimico"];
const acel = catItens.porId["as6.maldicao.medicamento.aceleracao-espiral"];
t.ok("Potencializador: cabe no cicatrizante (cura), não numa arma", IT.podeAplicar(pot, cic, "cura").ok && !IT.podeAplicar(pot, noInventario("op.arma.faca"), "cura").ok);
t.ok("  a melhoria precisa existir no medicamento (cicatrizante não tem bônus em testes)", !IT.podeAplicar(pot, cic, "bonus").ok);
t.ok("Emulsificante: o efeito adicional tem de ser outro medicamento", !IT.podeAplicar(emu, cic, "op.geral.cicatrizante").ok && IT.podeAplicar(emu, cic, "sah.medicamento.antibiotico").ok);
t.ok("  de categoria igual ou menor (o Aplicador, I, aceita antibiótico, I)", IT.podeAplicar(emu, apl, "sah.medicamento.antibiotico").ok);
IT.aplicar(pot, cic, { escolha: "cura" });
t.ok("modificação igual não se acumula", !IT.podeAplicar(pot, cic, "cura").ok);
IT.aplicar(acel, cic, {});
const ajc = R.ajustesDoItem ? R.ajustesDoItem(cic) : null;
t.ok("a maldição segue a regra padrão: a primeira soma II (e a modificação, I)", !ajc || ajc.categoria.map((x) => x.valor).join(",") === "1,2");
t.ok("o catálogo não muda com a modificação da instância", catItens.porId["op.geral.cicatrizante"].categoria === 1 && !(catItens.porId["op.geral.cicatrizante"].modificacoes || []).length);

t.grupo("Fichas: 11 ameaças e 4 aliados");
const cru = (id) => G.RAMAOrdemCriaturasDados.criaturas.filter((c) => c.id === id)[0];
const crs = G.RAMAOrdemCriaturasDados.criaturas.filter((c) => c.livro === "AS6");
t.igual("as páginas certas, inclusive as do meio da narrativa", crs.filter((c) => !c.aliada).map((c) => c.pagina + ":" + c.vd),
  ["28:40", "33:100", "37:80", "41:20", "56:40", "57:120", "58:48", "60:20", "61:80", "62:320", "63:180"]);
t.igual("  e os quatro perfis como aliado, ligados à ficha de ameaça", crs.filter((c) => c.aliada).map((c) => c.ficha.id),
  ["as6.criatura.alice-cruzes", "as6.criatura.ketan-arjuna", "as6.criatura.laila-verdante", "as6.criatura.dr-neruda"]);
const ketan = cru("as6.criatura.ketan-arjuna");
t.ok("Ketan: a prótese é um contador de 45 PV, e as ações que dependem dela a exigem", ketan.estados[0].maximo === 45 &&
  ["Atirar e Fatiar", "Defesa Improvisada", "Reparo na Hora"].every((n) => ketan.acoes.filter((a) => a.nome === n)[0].requer[0] === "protese"));
const est = cru("as6.criatura.estimulo");
t.ok("Estímulo: a DT da presença é rolada (8d10), não um número inventado", est.presenca.dt === null && est.habilidades.some((h) => (h.rolagens || []).some((r) => r.expressao === "8d10")));
t.ok("  Rodar Simulação troca atributos só nos testes", est.acoes.some((a) => a.nome === "Rodar Simulação" && /apenas testes/.test(a.texto)));
const ssa = cru("as6.criatura.experimento-ssabaka");
t.ok("Ssabáka: cura atual e perda PERMANENTE de PV máximos separadas", ssa.acoes.some((a) => a.nome === "Sofrimento Duradouro" && a.rolagens.length === 2 && /permanente/.test(a.rolagens[1].rotulo)));
const hik = cru("as6.criatura.hikikomori");
t.ok("Hikikomori: eletricidade nos ataques, Energia na onda do casulo", JSON.stringify(hik.acoes).indexOf("eletricidade") >= 0 && /Energia/.test(JSON.stringify(hik.habilidades)));
t.ok("Alice e Laila aliadas: bônus fixos na ficha (AS3), Ketan e Neruda no texto", !!A3.EFEITOS_DE_ALIADO["as6.criatura.alice-cruzes-aliado"] && !!A3.EFEITOS_DE_ALIADO["as6.criatura.laila-verdante-aliado"] &&
  !A3.EFEITOS_DE_ALIADO["as6.criatura.ketan-arjuna-aliado"]);

/* =====================================================================
   O ESTADO DA FICHA
   ===================================================================== */

t.grupo("Salto de Dados: marcar, voltar, consumir uma vez");
const sd = ficha({ classe: "ocultista", origem: "academico", nex: 45, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 2 },
  escolhas: [reg("d3.poderClasse", "poderClasse", "transcender", { poder: { valor: "afortunado", opcoes: {} } }),
    reg("d6.poderClasse", "poderClasse", "transcender", { poder: { valor: "causalidadeFortuita", opcoes: {} } }),
    reg("d9.poderClasse", "poderClasse", "transcender", { poder: { valor: "saltoDeDados", opcoes: {} } })] });
t.ok("o poder está na ficha (Energia 2: dois poderes de Energia antes)", A6.temPoder(sd, "saltoDeDados"));
t.ok("  com um só poder de Energia, Transcender para ele é recusado", !avaliar(ficha({ classe: "ocultista", origem: "academico", nex: 30, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 2 },
  escolhas: [reg("d3.poderClasse", "poderClasse", "transcender", { poder: { valor: "afortunado", opcoes: {} } })] }), "d6.poderClasse", "transcender", { poder: { valor: "saltoDeDados", opcoes: {} } }).valido);
sd.recursos = { pv: 20, pe: 8, san: 30, pd: null };
const m1 = A6.marcar(sd, "op-marca-1");
t.ok("marcar guarda o retrato do estado de agora (depois dos 2 PE, que a tela cobra antes)", m1.ok && m1.marca.retrato.recursos.pe === 8);
sd.recursos.pv = 3; sd.recursos.pe = 1;
EF.aplicar(sd.condicoes, EF.criarInstancia({ modelo: "cond:abalado" }), "nova");
sd.nome = "Nome mudado"; sd.nex = 50;
const v1 = A6.voltar(sd, "op-volta-1");
t.ok("voltar devolve PV, PE e as condições do retrato", v1.ok && sd.recursos.pv === 20 && sd.recursos.pe === 8 && !sd.condicoes.efeitos.some((x) => EF.ativa(x) && x.modelo === "cond:abalado"));
t.ok("  e não mexe em identidade nem progressão", sd.nome === "Nome mudado" && sd.nex === 50);
t.ok("  a marca foi consumida", !A6.dados(sd).salto.marca && A6.dados(sd).salto.consumidas.length === 1);
t.ok("o mesmo id de operação (reenvio, outra aba) não volta de novo", A6.voltar(sd, "op-volta-1").repetido === true);
t.ok("outra operação sem marca: recusada", !A6.voltar(sd, "op-volta-2").ok);
const velha = JSON.parse(JSON.stringify(sd));
velha.arquivo6.salto.marca = JSON.parse(JSON.stringify(m1.marca));
t.ok("uma cópia antiga com a marca consumida NÃO a traz de volta", !volta(velha).arquivo6.salto.marca);
const m2 = A6.marcar(sd, "op-marca-2");
t.ok("depois de recarregar a ficha, a marca nova continua valendo", m2.ok && A6.validadeDaMarca(volta(sd)).valida && volta(sd).arquivo6.salto.marca.id === m2.marca.id);
t.ok("  e o retrato não guarda o próprio arquivo6 (a marca não volta de um retrato)", JSON.stringify(m2.marca.retrato).indexOf("salto") < 0);

t.grupo("Escudo Espiral Temporal: uma vez por rodada, RD, Energia, envelhecer");
const es = ficha({ classe: "ocultista", origem: "academico", nex: 15, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 2 },
  escolhas: [reg("d3.poderClasse", "poderClasse", "transcender", { poder: { valor: "potencialAprimorado", opcoes: {} } })] });
const esC = ficha(Object.assign({}, es, { nex: 30, escolhas: es.escolhas.concat([reg("d6.poderClasse", "poderClasse", "transcender", { poder: { valor: "escudoEspiralTemporal", opcoes: {} } })]) }));
t.ok("munição: RD 20; e na mesma rodada, sem afinidade, não de novo", A6.registrarEscudo(esC, "municao").rd === 20 && !A6.registrarEscudo(esC, "arma").ok);
A5.proximaRodada(esC);
t.ok("  na rodada seguinte: arma corpo a corpo, RD 10", A6.registrarEscudo(esC, "arma").rd === 10);
A5.proximaRodada(esC);
t.ok("  dano de Energia: a RD não funciona", A6.registrarEscudo(esC, "arma", true).rd === 0);
const faca = noInventario("op.arma.faca");
const lutador = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR, pericias: { luta: "treinado" } });
const antes = R.armaEfetiva(lutador, { itens: [faca] }, faca).dados.quantos;
A6.envelhecer(faca);
t.ok("a arma envelhecida perde 1 dado no ataque", R.armaEfetiva(lutador, { itens: [faca] }, faca).dados.quantos === antes - 1);
A6.envelhecer(faca);
t.ok("  envelhecida de novo: quebrada (e o campo sobrevive à normalização do item)", G.RAMAOrdemInventario.dadosDoItem(S.normalizarItem(faca)).envelhecida === 2);

t.grupo("Grilhões de Lodo: área da cena, DT e resolução explícita");
const gl = ficha(Object.assign({}, es, { escolhas: es.escolhas.concat([reg("d6.poderClasse", "poderClasse", "transcender", { poder: { valor: "grilhoesDeLodo", opcoes: {} } })]), nex: 30 }));
const dtG = A6.dtDosGrilhoes(gl, INV);
t.ok("DT = 10 + limite de PE + o atributo mais alto", dtG === 10 + R.calcular(gl, INV).limitePe.total + 3);
t.ok("criar registra a área desta cena; 3d6 e lento sem afinidade", A6.criarGrilhoes(gl, dtG).ok && A6.grilhoesNaCena(gl) && A6.planoDosGrilhoes(gl).dano === "3d6" && A6.planoDosGrilhoes(gl).condicao === "lento");
t.ok("  resolver de novo só por clique, contando", A6.resolverGrilhoes(gl).area.resolucoes === 2);
cena(gl);
t.ok("  e a área acaba com a cena", !A6.grilhoesNaCena(gl));

t.grupo("Médico de Campo: Paramédico, Salvação, Equipe, Resgate");
const md = med(65, { escolhas: [reg("d3.poderClasse", "poderClasse", "medicoDaSalvacao")] });
const pl = A6.planoDoParamedico(md, 2);
t.ok("Paramédico com Médico da Salvação: d12; em NEX 65, até 4 dados (+1 PE cada)", pl.dado === 12 && pl.maximo === 4 && pl.expressao === "4d12" && pl.custo === 4);
t.ok("  sem o poder: d10", A6.planoDoParamedico(med(15), 0).expressao === "2d10");
t.ok("como ação de movimento: uma vez por rodada", A6.registrarSalvacao(md).ok && !A6.registrarSalvacao(md).ok);
const vet = med(45, { escolhas: [reg("d9.poderClasse", "poderClasse", "veteranoDaEquipeDeTrauma")] });
t.ok("Equipe de Trauma: 1 condição; com o Veterano, 3", A6.limiteDaEquipe(med(45)) === 1 && A6.limiteDaEquipe(vet) === 3);
const rg = med(75, { escolhas: [reg("d15.poderClasse", "poderClasse", "resgatarDaMorte")] });
t.ok("Resgatar da Morte: uma vez por ser por cena", A6.registrarResgate(rg, "Lia").ok && !A6.registrarResgate(rg, "lia").ok && A6.registrarResgate(rg, "Bruno").ok);
cena(rg);
t.ok("  e na cena seguinte, de novo", A6.registrarResgate(rg, "Lia").ok);
t.ok("Farmacêutico: custo 2 + 2 × categoria", A6.custoDaFabricacao("0") === 2 && A6.custoDaFabricacao("I") === 4 && A6.custoDaFabricacao("II") === 6);
t.ok("  também com a categoria do catálogo normalizado (número)", A6.custoDaFabricacao(catItens.porId["sah.medicamento.antibiotico"].categoria) === 4 && A6.custoDaFabricacao(0) === 2);
const fa = med(15, { pericias: { medicina: "treinado", profissao: "treinado" }, escolhas: [reg("d3.poderClasse", "poderClasse", "farmaceuticoDeCampo")] });
t.ok("  fora do interlúdio, recusado", !A6.registrarFabricacao(fa, "fab-1", { id: "i1", nome: "x" }, "op.geral.cicatrizante", "k1", 4).ok);
CD.novaCena(fa.condicoes, null, { interludio: true });
t.ok("  no interlúdio, registra uma vez só (o mesmo id não fabrica de novo)", A6.registrarFabricacao(fa, "fab-1", { id: "i1", nome: "x" }, "op.geral.cicatrizante", "k1", 4).ok &&
  A6.registrarFabricacao(fa, "fab-1", { id: "i1", nome: "x" }, "op.geral.cicatrizante", "k1", 4).repetido && A6.dados(fa).fabricacoes.length === 1);
t.ok("kit de medicina: pelo nome (Kit de perícia (Medicina))", A6.ehKitDeMedicina({ nome: "Kit de perícia (Medicina)" }) && !A6.ehKitDeMedicina({ nome: "Kit de perícia (Crime)" }));

t.grupo("Forças para Enfrentar (Cobaia Sobrevivente)");
const cob = ficha({ classe: "combatente", origem: "cobaiaSobrevivente", nex: 5, atributos: ATR });
const ab = EF.aplicar(cob.condicoes, EF.criarInstancia({ modelo: "cond:abalado", origem: { tipo: "habilidade", nome: "Forças para Enfrentar (trauma)" } }), "nova");
const oc = A6.registrarOcorrencia(cob, ab.instancia.id, "mesa");
const outra = EF.aplicar(cob.condicoes, EF.criarInstancia({ modelo: "cond:frustrado" }), "nova");
const imu = A6.comprarImunidade(cob, oc.ocorrencia.id);
t.ok("os 2 PE dão imunidade a medo na cena; o abalado da ocorrência sai", imu.ok && !EF.ativa(EF.achar(cob.condicoes, ab.instancia.id)) && A6.imuneAMedoNaCena(cob));
t.ok("  uma condição que não é de medo, de outra fonte, fica", EF.ativa(EF.achar(cob.condicoes, outra.instancia.id)));
t.ok("  e um novo abalado é recusado na cena", !EF.aplicar(cob.condicoes, EF.criarInstancia({ modelo: "cond:abalado" }), "nova").ok);
cena(cob);
t.ok("  na cena seguinte, a imunidade posta aqui sai", !A6.imuneAMedoNaCena(cob) && cob.condicoes.imunidades.indexOf("categoria:medo") < 0);

t.grupo("Doenças e venenos (p. 75–76)");
t.igual("cinco doenças e cinco venenos", [A6.DOENCAS.length, A6.VENENOS.length], [5, 5]);
t.ok("todos os venenos com Fortitude DT 25", A6.VENENOS.every((v) => v.dt === 25));
const dn = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR });
const cf = EF.aplicar(dn.condicoes, EF.criarInstancia({ modelo: "cond:enjoado", origem: { tipo: "manual", nome: "outra fonte" } }), "nova");
const ca = A6.registrarAfeccao(dn, "doenca", "criseAlergica", { estagio: 1 });
t.ok("Crise Alérgica I: −2 em testes, como efeito com a origem", ca.ok && EF.achar(dn.condicoes, ca.afeccao.efeitos[0]).modificadores[0].valor === -2);
const idEstagio1 = ca.afeccao.efeitos[0];
A6.mudarEstagio(dn, ca.afeccao.id, 3);
t.ok("  III: −5 e enjoado; o efeito do estágio I saiu", A6.acharAfeccao(dn, ca.afeccao.id).efeitos.length === 2 && !EF.ativa(EF.achar(dn.condicoes, idEstagio1)));
A6.mudarEstagio(dn, ca.afeccao.id, 0);
t.ok("  curar tira só o que a doença pôs: o enjoado de outra fonte fica", A6.acharAfeccao(dn, ca.afeccao.id).encerrada && EF.ativa(EF.achar(dn.condicoes, cf.instancia.id)));
const hp = A6.registrarAfeccao(dn, "doenca", "criseHipertensiva", { estagio: 4 });
t.ok("Crise Hipertensiva IV: avisa que é fatal, sem matar sozinha", hp.efeito.fatal === true && dn.recursos.pv === null);
const ic = A6.registrarAfeccao(dn, "doenca", "infeccaoCerebral", { estagio: 3 });
const icEf = ic.afeccao.efeitos.map((id) => EF.achar(dn.condicoes, id));
t.ok("Infecção Cerebral III: Intelecto vira 0 nos testes (o atributo da ficha não muda)", icEf.some((x) => x.modificadores.some((m) => m.alvo === "atributo:int" && m.valor === -2)) && R.atributo(dn, "int") === 2);
const ig = A6.registrarAfeccao(dn, "doenca", "infeccaoGeneralizada", { estagio: 3 });
t.ok("Infecção Generalizada III: inconsciente liga o contador próprio", dn.condicoes.inconsciente.ativa === true);
const rc = A6.registrarAfeccao(dn, "veneno", "ricina", { resistiu: true, rodadas: 2 });
t.ok("Ricina resistida: 2d6 por 1d4+1 rodadas — perda de PV, contada por clique", A6.rodadaDeRicina(dn, rc.afeccao.id).expressao === "2d6" && A6.rodadaDeRicina(dn, rc.afeccao.id).acabou && !A6.rodadaDeRicina(dn, rc.afeccao.id).ok);
const bt = A6.registrarAfeccao(dn, "veneno", "batracotoxina", {});
t.ok("Batracotoxina (falhou): exausta, paralisada e asfixiada", bt.afeccao.efeitos.length === 3);
const bt2 = A6.registrarAfeccao(dn, "veneno", "batracotoxina", { resistiu: true });
t.ok("  resistiu: só exausta (o parêntese do livro)", bt2.afeccao.efeitos.length === 1 && EF.achar(dn.condicoes, bt2.afeccao.efeitos[0]).modelo === "cond:exausto");
t.ok("tratamento: +5, ou +10 (Doutor), guardado e gasto uma vez", A6.guardarTratamento(dn, ig.afeccao.id, 10).ok && A6.gastarTratamento(dn, ig.afeccao.id) === 10 && A6.gastarTratamento(dn, ig.afeccao.id) === 0);
t.ok("o estado atravessa gravar e reabrir (com o histórico)", volta(dn).arquivo6.afeccoes.length === A6.dados(dn).afeccoes.length && volta(dn).arquivo6.afeccoes[0].historico.length >= 2);

t.grupo("Hesitação Forçada no alvo e Grão-Mestre");
const alvo = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR });
const h1 = EF.aplicar(alvo.condicoes, EF.criarInstancia({ modelo: "ritual:as6.ritual.hesitacao-forcada", nome: "Hesitação Forçada", versao: "Normal", origem: { tipo: "ritual", nome: "Hesitação Forçada" }, duracao: { tipo: "ateRemover" } }), "nova");
t.ok("ativa, sem rolagem de novo antes de falhar", A6.hesitacoesAtivas(alvo).length === 1 && A6.rolagemDaHesitacao(alvo) === null);
A6.testeDaHesitacao(alvo, h1.instancia.id, false);
t.ok("falhou: rola de novo o MAIOR dado neste turno", A6.rolagemDaHesitacao(alvo).dado === "maior");
A6.testeDaHesitacao(alvo, h1.instancia.id, true);
t.ok("um sucesso não encerra", A6.hesitacoesAtivas(alvo).length === 1 && A6.rolagemDaHesitacao(alvo) === null);
A6.testeDaHesitacao(alvo, h1.instancia.id, true);
t.ok("dois sucessos seguidos encerram", A6.hesitacoesAtivas(alvo).length === 0);
const h2 = EF.aplicar(alvo.condicoes, EF.criarInstancia({ modelo: "ritual:as6.ritual.hesitacao-forcada", nome: "Hesitação Forçada", versao: "Verdadeiro", duracao: { tipo: "ateRemover" } }), "nova");
t.ok("Verdadeira: o MENOR dado, sempre", A6.rolagemDaHesitacao(alvo).dado === "menor");
t.ok("  e um sucesso (Vontade anula) já encerra", A6.testeDaHesitacao(alvo, h2.instancia.id, true).encerrou);
const gm = ocu(60, [espCo, mesCo, reg("d12.poderClasse", "poderClasse", "graoMestreEmElemento", { elemento: "conhecimento" })]);
const ritCo = { nome: "Sinal", ordem: { elemento: "conhecimento", circulo: 1 } };
t.ok("Grão-Mestre: vale em ritual do elemento escolhido, não em outro", A6.graoMestreNoRitual(gm, ritCo).join() === "conhecimento" && !A6.graoMestreNoRitual(gm, { nome: "X", ordem: { elemento: "sangue", circulo: 1 } }).length);
t.ok("  um ritual de vários elementos conta nos dois (Hesitação Forçada)", A6.graoMestreNoRitual(gm, { nome: "H", ordem: { elemento: "sangue", elementos: ["sangue", "conhecimento"], todosOsElementos: true, circulo: 1 } }).join() === "conhecimento");
const dom = ocu(30, [espCo, reg("d6.poderClasse", "poderClasse", "dominadorDeElemento", { elemento: "conhecimento" })]);
t.ok("Dominador (Conhecimento): Eletrocussão (Energia) pode virar Conhecimento; Sangue não", A6.dominadorNoRitual(dom, { nome: "Eletrocussão", ordem: { elemento: "energia", circulo: 1 } }).join() === "conhecimento" &&
  !A6.dominadorNoRitual(dom, { nome: "X", ordem: { elemento: "sangue", circulo: 1 } }).length);

/* =====================================================================
   EVOLUÇÃO MODULAR
   ===================================================================== */

t.grupo("Evolução Modular: regra de fã, desligada, na categoria certa");
const rm = OP.regra("evolucaoModular");
t.ok("existe, do AS6 (p. 80), marcada como conteúdo de fã de Jonas “DemonRider”", rm && rm.fonte === "AS6" && rm.pagina === 80 && rm.fa && /DemonRider/.test(rm.fa.autor) && /não oficial/.test(rm.fa.aviso));
t.ok("  começa desligada e mora em “Poderes e trilhas”", !OP.ligada(R.normalizar(R.fichaVazia()), "evolucaoModular") && OP.categoriaDe("evolucaoModular").chave === "poderes");

t.grupo("Evolução Modular: as vagas");
function contar(o) {
  const vs = E.vagas(o);
  return { util: vs.filter((v) => v.grupoModular === "utilidade").length, comb: vs.filter((v) => v.grupoModular === "combate").length,
    normal: vs.filter((v) => /\.poderClasse$/.test(v.id)).length, vers: vs.filter((v) => v.tipo === "versatilidade")[0] };
}
const mod = (nex, extra) => ficha(Object.assign({ classe: "combatente", origem: "academico", nex, atributos: ATR, pericias: { luta: "treinado" }, opcionais: { evolucaoModular: true } }, extra || {}));
t.igual("NEX 55%: cinco de utilidade e cinco de combate, nenhuma “Poder de classe”", contar(mod(55)), { util: 5, comb: 5, normal: 0, vers: contar(mod(55)).vers });
const c50 = contar(mod(50));
t.igual("NEX 50%: cinco de utilidade e quatro de combate", [c50.util, c50.comb], [5, 4]);
t.ok("  e a Versatilidade vira a modular (só a trilha)", c50.vers && c50.vers.modular === true);
t.igual("NEX 99%: dez de utilidade e nove de combate (o que o livro conta no nível 20)", [contar(mod(99)).util, contar(mod(99)).comb], [10, 9]);
t.igual("NEX 10%: a primeira, de utilidade", [contar(mod(10)).util, contar(mod(10)).comb], [1, 0]);
const nxe = ficha({ classe: "combatente", origem: "academico", nex: 0, nivel: 11, nivelDefinido: true, atributos: ATR, pericias: { luta: "treinado" }, opcionais: { evolucaoModular: true, nexExperiencia: true } });
t.igual("com NEX & Experiência, segue o nível (nível 11 = cinco e cinco)", [contar(nxe).util, contar(nxe).comb], [5, 5]);
const mund = ficha({ classe: "mundano", origem: "academico", nex: 0, atributos: ATR, opcionais: { evolucaoModular: true } });
t.ok("sem a progressão comum (Mundano): nenhuma vaga modular", !C.classe("mundano") || contar(mund).util + contar(mund).comb === 0);
t.ok("desligada: tudo como sempre (três “Poder de classe” até NEX 55)", contar(ficha({ classe: "combatente", origem: "academico", nex: 55, atributos: ATR, pericias: { luta: "treinado" } })).normal === 3);

t.grupo("Evolução Modular: grupos na escolha");
const m15 = mod(15);
t.ok("vaga de combate (NEX 15) aceita Reflexos Defensivos; recusa Incansável (utilidade)", avaliar(m15, "d3.poderCombate", "reflexosDefensivos").valido && !avaliar(m15, "d3.poderCombate", "incansavel").valido);
t.ok("  vaga de utilidade (NEX 10) aceita Incansável", avaliar(m15, "d2.poderUtilidade", "incansavel").valido);
t.ok("  um poder geral entra em qualquer uma", avaliar(m15, "d3.poderCombate", "atletico").valido && avaliar(m15, "d2.poderUtilidade", "atletico").valido);
t.ok("  e um de outra classe continua recusado", !avaliar(m15, "d2.poderUtilidade", "hacker").valido);
const cands = E.candidatosPoderClasse(m15, "d3.poderCombate", null);
t.ok("os candidatos do outro grupo aparecem indisponíveis, com o motivo", cands.some((c) => c.entrada.chave === "incansavel" && !c.disponivel && c.motivos.some((x) => /utilidade/.test(x))));
const versM = mod(50, { trilha: "aniquilador" });
t.ok("Versatilidade modular: “poder de classe” é recusado; a trilha não", !avaliar(versM, "d10.versatilidade", "poderClasse", { poder: { valor: "reflexosDefensivos", opcoes: {} } }).valido);
t.ok("a mesa reclassifica um ambíguo (Combatente Esforçado) na ficha", (() => {
  const o = mod(15, { atributos: { agi: 2, for: 3, int: 2, pre: 2, vig: 2 } });
  const antesR = avaliar(o, "d2.poderUtilidade", "combatenteEsforcado").valido;
  A6.ajustarGrupo(o, "combatenteEsforcado", "utilidade");
  return !antesR && avaliar(o, "d2.poderUtilidade", "combatenteEsforcado").valido;
})());
t.ok("  e não reclassifica um que não é ambíguo", !A6.ajustarGrupo(mod(15), "reflexosDefensivos", "utilidade").ok);

t.grupo("Evolução Modular: ligar, associar, desligar — sem perder nem duplicar");
const antiga = ficha({ classe: "combatente", origem: "academico", nex: 30, atributos: ATR, pericias: { luta: "treinado" },
  escolhas: [reg("d3.poderClasse", "poderClasse", "reflexosDefensivos"), reg("d6.poderClasse", "poderClasse", "incansavel")] });
const defAntes = R.calcular(antiga, INV).defesa.total;
OP.definir(antiga, "evolucaoModular", true);
const est1 = E.estado(antiga, null);
t.ok("ligar não concede nada sozinho: as escolhas ficam guardadas, fora", est1.fora.length === 2 && R.calcular(antiga, INV).defesa.total === defAntes - 2);
t.ok("  e o motivo diz para associar", est1.fora.every((f) => /Associe/.test(f.motivos[0])));
const sug = E.associacoesModulares(antiga);
t.igual("sugestões: cada uma na vaga do mesmo degrau, se o grupo couber", sug.map((x) => x.registro.valor + "→" + (x.sugerida && x.sugerida.id)), ["reflexosDefensivos→d3.poderCombate", "incansavel→d6.poderUtilidade"]);
sug.forEach((x) => E.associarModular(antiga, x.registro.id, x.sugerida.id));
t.ok("associadas: valem de novo, uma vez só", R.calcular(antiga, INV).defesa.total === defAntes && E.estado(antiga, null).adquiridos.filter((a) => a.chave === "reflexosDefensivos" && a.valido).length === 1);
t.ok("  associar de novo é recusado (sem duplicar)", !E.associarModular(antiga, sug[0].registro.id, "d5.poderCombate").ok);
t.ok("  a cópia sabe de onde veio, e o original continua guardado", antiga.escolhas.filter((r) => r.associadoDe === sug[0].registro.id).length === 1 && antiga.escolhas.some((r) => r.id === sug[0].registro.id));
t.ok("  e a associação sobrevive a gravar e reabrir", volta(antiga).escolhas.some((r) => r.associadoDe === sug[0].registro.id));
const extraMod = reg("d5.poderCombate", "poderClasse", "combateDefensivo");
antiga.escolhas.push(extraMod);
OP.definir(antiga, "evolucaoModular", false);
const est2 = E.estado(antiga, null);
t.ok("desligar: as normais voltam; as modulares (inclusive só-modular) ficam suspensas, guardadas", R.calcular(antiga, INV).defesa.total === defAntes &&
  est2.fora.length === 3 && est2.fora.some((f) => f.registro.etapa === "d5.poderCombate" && /desligada/.test(f.motivos[0])) &&
  !est2.adquiridos.some((a) => a.chave === "combateDefensivo"));
OP.definir(antiga, "evolucaoModular", true);
t.ok("religar: tudo de volta, sem duplicar", E.estado(antiga, null).adquiridos.filter((a) => a.chave === "reflexosDefensivos").length === 1 &&
  E.estado(antiga, null).adquiridos.some((a) => a.chave === "combateDefensivo"));

t.grupo("Persistência: schema, sincronização, exportação");
t.igual("schema 26", S.VERSAO_SCHEMA, 26);
const fs = S.normalizarFicha({ nome: "Teste", tipoFicha: "ordem", ordem: JSON.parse(JSON.stringify(dn)) });
t.ok("a ficha normalizada guarda o bloco arquivo6", fs.ordem.arquivo6 && fs.ordem.arquivo6.afeccoes.length === A6.dados(dn).afeccoes.length);
const V = G.RAMAValidacao;
const ex = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fs))));

t.ok("exportar e importar: o bloco atravessa", ex.ok && ex.dados.ordem.arquivo6 && ex.dados.ordem.arquivo6.afeccoes.length === fs.ordem.arquivo6.afeccoes.length);
t.ok("  e as afecções continuam apontando para os efeitos que puseram", ex.ok && ex.dados.ordem.arquivo6.afeccoes.filter((a) => !a.encerrada).every((a) => a.efeitos.every((id) => !!EF.achar(ex.dados.ordem.condicoes, id))));
const fsM = S.normalizarFicha({ nome: "Modular", tipoFicha: "ordem", ordem: JSON.parse(JSON.stringify(antiga)) });
const exM = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fsM))));
const assoc = exM.ok ? exM.dados.ordem.escolhas.filter((r) => r.associadoDe) : [];
t.ok("a associação da Evolução Modular atravessa a exportação (pela posição)", assoc.length === 2 && assoc.every((r) => exM.dados.ordem.escolhas.some((x) => x.id === r.associadoDe && /\.poderClasse$/.test(x.etapa))));
const vazio25 = S.normalizarFicha({ schemaVersion: 25, nome: "Antiga", tipoFicha: "ordem", ordem: { classe: "combatente", nex: 5 } });
t.ok("uma ficha 25 abre com o estado vazio, sem conversão", vazio25.ordem.arquivo6 && !vazio25.ordem.arquivo6.afeccoes.length && !vazio25.ordem.arquivo6.salto.marca);

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
  Deno.exit(1);
}
