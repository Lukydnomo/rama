/* =====================================================================
   R.A.M.A. — testes do Arquivos Secretos 7 (v6.5)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-as7.js

   A fonte e o suplemento, as origens (Exorcizado, Sensitivo Rebelde),
   Resguardar Espírito, o Vampirismo, os cinco itens, as duas trilhas
   Monstruoso (marcos, elemento, procedimento do dia, sacrifícios,
   braços, Tatuagem sem duplicar, reação, rituais de 4º círculo), o
   tempo do jogo (dia, cena e rodada sem repetir ao recarregar), as
   ameaças (Pessoa × paranormal, os estados da Apóstata, o piso de PV do
   Verdadeiro Raziel), as regras debaixo d'água (desligadas por padrão,
   não oficiais) e a persistência (schema 29, exportar e importar, o
   servidor com a mesma régua). Sem DOM e sem rede; dados sintéticos.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

for (const caminho of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/arquivo3.js", "js/ordem/arquivo4.js", "js/ordem/arquivo5.js", "js/ordem/arquivo6.js", "js/ordem/arquivo7.js",
  "js/ordem/fontes-em-uso.js",
  "js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/sync.js",
  "js/ordem/criaturas-dados.js", "js/ordem/criaturas.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const G = globalThis;
const C = G.RAMAOrdemCatalogo, P = G.RAMAOrdemPoderes, R = G.RAMAOrdemRegras, E = G.RAMAOrdemProgressao;
const OP = G.RAMAOrdemOpcionais, A7 = G.RAMAOrdemArquivo7, A5 = G.RAMAOrdemArquivo5, A3 = G.RAMAOrdemArquivo3;
const CD = G.RAMAOrdemCondicoes, IT = G.RAMAOrdemItens, RT = G.RAMAOrdemRituais, I = G.RAMAOrdemInventario;
const B = G.RAMAOrdemBiblioteca, F = G.RAMAFicha, SY = G.RAMASync, V = G.RAMAValidacao, S = G.RAMASuplementos;
const PU = G.RAMAOrdemPericiasUsos, CR = G.RAMACriaturas, OC = G.RAMAOrdemCriaturas, FU = G.RAMAOrdemFontesEmUso;
const DADOS = G.RAMAOrdemCriaturasDados;

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

const ATR = { agi: 2, for: 2, int: 2, pre: 2, vig: 2 };
function ficha(extra) {
  const o = R.fichaVazia();
  Object.keys(extra || {}).forEach((k) => { o[k] = extra[k]; });
  return R.normalizar(JSON.parse(JSON.stringify(o)));
}
function vaga(o, id) { return E.vagas(o).filter((v) => v.id === id)[0]; }
function escolher(o, id, valor, opcoes) {
  const v = vaga(o, id);
  if (!v) return { ok: false, motivo: "sem vaga " + id };
  return E.registrar(o, v, { valor: valor, opcoes: opcoes || {} });
}
function simular(o, id, valor, opcoes) {
  const v = vaga(o, id);
  if (!v) return { valido: false, motivos: ["sem vaga " + id] };
  return E.simular(o, v, { valor: valor, opcoes: opcoes || {} }, null).avaliacao;
}
function volta(o) { return R.normalizar(JSON.parse(JSON.stringify(o))); }
function novaCena(o) { const antes = A7.cenaDe(o); CD.novaCena(o.condicoes); return A7.aoTrocarDeCena(o, antes); }
function novoDia(o) { A3.avancar(o, "dia"); }
function comp(el, q) { return { id: "comp-" + el, nome: "Componentes ritualísticos de " + A7.NOME_DO_ELEMENTO[el], tipo: "item", origemCatalogoId: "op.paranormal.componentes", ordem: { elemento: el, quantidade: q || 3 } }; }

/* Monstruoso: a trilha, o NEX e o elemento do primeiro marco. */
function monstruoso(classe, nex, elemento, extra) {
  const especialista = classe === "especialista";
  const o = ficha(Object.assign({ classe, origem: "academico", trilha: especialista ? "monstruosoEspecialista" : "monstruosoOcultista",
    nex, atributos: { agi: 2, for: 2, int: 2, pre: 3, vig: 2 } }, extra || {}));
  if (elemento) escolher(o, especialista ? "b.serExperimentado" : "b.serEscarificado", "", { elemento });
  return o;
}

const catItens = await IT.carregar();
const catRit = await RT.carregar();

/* =====================================================================
   FONTE E SUPLEMENTO
   ===================================================================== */

t.grupo("Fonte · Arquivos Secretos 7, v1.0");
{
  const l = C.livro("AS7");
  t.igual("no registro único dos livros (não é Extra)", [l.sigla, l.nome, l.edicao, !!l.avulsa], ["AS7", "Arquivos Secretos 7", "v1.0", false]);
  t.ok("  a referência tem página", C.referencia(C.origem("exorcizado")) === "Arquivos Secretos 7, p. 80");
  const s = S.daFonte("ordem", "AS7");
  t.igual("suplemento ordem.as7, com capa e miniatura", [s.id, s.capa], ["ordem.as7", "assets/sistemas/ordem-as7-capa.webp"]);
  let capas = true;
  for (const c of [s.capa, s.capa.replace(".webp", "-pequena.webp")]) { try { await Deno.stat(new URL("../" + c, import.meta.url)); } catch { capas = false; } }
  t.ok("  as duas imagens existem como assets locais", capas);
  t.ok("  na ordem: depois do AS6, antes dos Extras", (() => { const f = S.doSistema("ordem").map((x) => x.fontes[0]); return f.indexOf("AS7") === f.indexOf("AS6") + 1 && f[f.length - 1] === "EXTRA"; })());
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.sah"] });
  t.ok("desligado na ficha: a fonte sai das escolhas novas", !C.fonteLiberada("AS7") && C.fonteLiberada("SAH"));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as7"], campanha: ["ordem.sah"] });
  t.ok("  ficha ∩ campanha: ligado só na ficha não basta", !C.fonteLiberada("AS7"));
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("  seleção vazia (só o básico) ≠ ausente", !C.fonteLiberada("AS7"));
  S.definirContexto({ sistema: "ordem" });
  t.ok("  ausente: tudo liberado (fichas antigas)", C.fonteLiberada("AS7"));
  const exo = ficha({ classe: "combatente", origem: "exorcizado", nex: 5, atributos: ATR });
  t.ok("o que já está em uso é apontado (desligar não apaga)", (FU.emUso({ tipoFicha: "ordem", ordem: exo }).AS7 || []).some((x) => /Exorcizado/.test(x)));
  t.ok("habilitar o suplemento não liga regra opcional", !OP.ligada(ficha({ classe: "combatente" }), "regrasSubaquaticas"));
}

/* =====================================================================
   ORIGENS
   ===================================================================== */

t.grupo("Origens · Exorcizado (p. 80)");
{
  const org = C.origem("exorcizado");
  t.igual("Fortitude e Ocultismo", org.pericias, ["fortitude", "ocultismo"]);
  const o = ficha({ classe: "combatente", origem: "exorcizado", nex: 5, atributos: ATR });
  t.ok("o elemento é uma pendência da origem", E.estado(o, null).pendencias.some((p) => p.id === "b.origem.exorcizado"));
  t.ok("Medo não é elemento possível", !simular(o, "b.origem.exorcizado", "", { elemento: "medo" }).valido);
  escolher(o, "b.origem.exorcizado", "", { elemento: "sangue" });
  t.igual("RD 5 contra o elemento escolhido", R.resistencias(o, { itens: [] }).dano.filter((d) => d.tipo === "sangue").map((d) => d.conta.total), [5]);
  t.igual("  e o elemento é lido da escolha", A7.elementoDoExorcizado(o), "sangue");
  t.ok("o contato não é inferido: sem registro, nenhuma perda", A7.dados(o).contatos.length === 0);
  t.ok("primeiro contato da cena: registra", A7.registrarContato(o, "op-ct-1", "sangue", 2).ok && A7.contatoNaCena(o).perdeu === 2);
  t.ok("  o mesmo opId não repete (recarregar)", A7.registrarContato(o, "op-ct-1", "sangue", 2).repetido && A7.dados(o).contatos.length === 1);
  t.ok("  outro contato na mesma cena é recusado", !A7.registrarContato(o, "op-ct-2", "sangue", 2).ok);
  novaCena(o);
  t.ok("  na cena seguinte, de novo", A7.registrarContato(o, "op-ct-3", "sangue", 2).ok && A7.dados(o).contatos.length === 2);
}

t.grupo("Origens · Sensitivo Rebelde (p. 80)");
{
  const org = C.origem("sensitivoRebelde");
  t.igual("Intuição e Vontade", org.pericias, ["intuicao", "vontade"]);
  const ac = org.acoesNoTeste[0];
  t.igual("–2 SAN por +5, em Diplomacia, Enganação, Intimidação ou Intuição", [ac.custoSan, ac.valor, ac.pericias], [2, 5, ["diplomacia", "enganacao", "intimidacao", "intuicao"]]);
  t.ok("  é uma ação no teste (uma vez por teste), não bônus fixo", R.bonusDePericia(ficha({ classe: "combatente", origem: "sensitivoRebelde", atributos: ATR }), "diplomacia", { itens: [] }).total ===
    R.bonusDePericia(ficha({ classe: "combatente", origem: "academico", atributos: ATR }), "diplomacia", { itens: [] }).total);
}

t.grupo("Religião · Resguardar Espírito (p. 80)");
{
  const u = PU.consulta("religiao", { incluirDesligados: true }).usos.filter((x) => x.nome === "Resguardar Espírito")[0];
  t.ok("na consulta dos usos de Religião, com fonte e página", !!u && u.fonte === "AS7" && u.pagina === 80 && u.treino === "treinado" && u.dt === "20");
  S.definirContexto({ sistema: "ordem", ficha: [] });
  t.ok("  sai da consulta com o suplemento desligado", !PU.consulta("religiao").usos.some((x) => x.nome === "Resguardar Espírito"));
  S.definirContexto({ sistema: "ordem" });
}

/* =====================================================================
   VAMPIRISMO
   ===================================================================== */

t.grupo("Ritual · Vampirismo (p. 76)");
{
  const r = catRit.rituais.filter((x) => x.id === "as7.ritual.vampirismo")[0];
  t.igual("Sangue, 2º círculo, completa, toque, cena", [r.elementos, r.circulo, r.execucao, r.alcance, r.duracao], [["sangue"], 2, "completa", "toque", "cena"]);
  t.igual("Discente +5 e Verdadeiro +10 são ACRÉSCIMOS ao custo do círculo", r.versoes.map((v) => [v.nome, v.custo, v.custoTotal]), [["Normal", 0, 3], ["Discente", 5, 8], ["Verdadeiro", 10, 13]]);
  t.igual("as formas", ["Normal", "Discente", "Verdadeiro"].map(A7.formaDaVersao), ["normal", "discente", "verdadeiro"]);

  const o = ficha({ classe: "ocultista", origem: "academico", nex: 40, atributos: ATR });
  t.ok("conjurar registra o corpo da cena", A7.registrarCorpo(o, "op-vp-1", "Cultista", "discente", true).ok);
  t.ok("  o mesmo opId não registra de novo", A7.registrarCorpo(o, "op-vp-1", "Cultista", "discente", true).repetido && A7.corposDaCena(o).length === 1);
  t.ok("  conjurar não é comer: nenhum vaso consumido", A7.dados(o).vampirismo.consumos.length === 0);
  const corpo = A7.corposDaCena(o)[0];
  t.ok("Audição pede o ritual; Olfato, o ser; Tato, a perícia", !A7.consumir(o, { opId: "op-c-0", corpoId: corpo.id, vasos: ["audicao"] }).ok &&
    !A7.consumir(o, { opId: "op-c-0b", corpoId: corpo.id, vasos: ["olfato"] }).ok && !A7.consumir(o, { opId: "op-c-0c", corpoId: corpo.id, vasos: ["tato"] }).ok);
  const c1 = A7.consumir(o, { opId: "op-c-1", corpoId: corpo.id, vasos: ["visao", "paladar", "tato"], paladar: 17, escolhas: { tato: "ocultismo" }, grauAtual: { ocultismo: "treinado" } });
  t.ok("comer: Visão +10 (discente), Paladar com o total rolado", c1.ok && c1.feitos.filter((x) => x.vaso === "visao")[0].valor === 10 && c1.feitos.filter((x) => x.vaso === "paladar")[0].valor === 17);
  t.igual("  Tato discente: veterano em Ocultismo até o fim da cena (o grau gravado não muda)", [R.grauDaPericia(o, "ocultismo"), o.pericias.ocultismo || "destreinado"], ["veterano", "destreinado"]);
  t.ok("os mesmos vasos não podem ser consumidos de novo", !A7.consumir(o, { opId: "op-c-2", corpoId: corpo.id, vasos: ["visao"] }).ok);
  t.ok("  o mesmo opId de refeição não repete", A7.consumir(o, { opId: "op-c-1", corpoId: corpo.id, vasos: ["olfato"], escolhas: { olfato: "x" } }).repetido);
  const c3 = A7.consumir(o, { opId: "op-c-3", corpoId: corpo.id, vasos: ["olfato"], paraMim: false, beneficiario: "Aliada", escolhas: { olfato: "o irmão" } });
  t.ok("outro beneficiário: registrado, sem efeito nesta ficha", c3.ok && A7.consumosDaCena(o, true).length === 3 && A7.consumosDaCena(o, false).length === 4);
  const encerrados = novaCena(o).corposEncerrados;
  t.igual("a cena acabou: o corpo encerra", encerrados, ["Cultista"]);
  t.ok("  e os efeitos temporários saem (o grau volta)", R.grauDaPericia(o, "ocultismo") === "destreinado");
  t.ok("  o corpo encerrado nunca mais é alvo", !A7.registrarCorpo(o, "op-vp-2", "cultista", "normal", true).ok);
  const sobre = A7.consumir(o, { opId: "op-c-4", corpoId: corpo.id, vasos: ["audicao"], escolhas: { audicao: "x" } });
  t.ok("  nem refeição", !sobre.ok);
  const j = volta(o);
  t.ok("recarregar não reabre nem duplica", A7.corpoEncerrado(j, "Cultista") && A7.dados(j).vampirismo.consumos.length === 4 && A7.corposDaCena(j).length === 0);
}

/* =====================================================================
   ITENS
   ===================================================================== */

t.grupo("Itens (p. 78–79)");
{
  const ids = ["as7.paranormal.carranca-cacadora", "as7.amaldicoado.cajado-da-cruz-de-sangue", "as7.paranormal.pe-de-coelho", "as7.paranormal.sal-dourado", "as7.amaldicoado.terco-maculado"];
  t.ok("os cinco no catálogo, com fonte AS7 e página", ids.every((id) => catItens.itens.some((e) => e.id === id && e.fonte === "AS7" && e.pagina > 0)));

  const carranca = { id: "it-car", nome: "Carranca Caçadora", tipo: "item", origemCatalogoId: A7.ID_CARRANCA, ordem: {} };
  t.ok("Carranca: guia até a criatura", A7.carrancaGuiar(carranca, "op-cg-1", "Stryzga", "c1").ok);
  t.ok("  uma por vez", !A7.carrancaGuiar(carranca, "op-cg-2", "Outra", "c1").ok);
  t.ok("  terminar consome o material", A7.carrancaTerminar(carranca).ok);
  t.ok("  a mesma criatura nunca mais; outra, sim", !A7.carrancaGuiar(carranca, "op-cg-3", "stryzga", "c2").ok && A7.carrancaGuiar(carranca, "op-cg-4", "Incinerado", "c2").ok);

  const o = ficha({ classe: "combatente", origem: "academico", atributos: ATR });
  const pe = { id: "it-pe", nome: "Pé de Coelho", tipo: "item", origemCatalogoId: A7.ID_PE, ordem: {} };
  const inv = { itens: [pe] };
  t.ok("Pé de Coelho: só vestido", !A7.peAtivar(pe, A7.cenaDe(o)).ok);
  pe.ordem.vestida = true;
  t.ok("  ativado: +1d4 nos testes da cena", A7.peAtivar(pe, A7.cenaDe(o)).ok && A7.dadosExtras(o, inv, { pericia: "luta" }).some((d) => d.peDeCoelho && d.dado === "1d4"));
  t.ok("  uma vez por cena", !A7.peAtivar(pe, A7.cenaDe(o)).ok);
  novaCena(o);
  t.ok("  na cena seguinte, desligado até ativar de novo", !A7.peDeCoelhoAtivo(o, inv));

  const sal = { id: "it-sal", nome: "Sal Dourado", tipo: "item", origemCatalogoId: A7.ID_SAL, ordem: {} };
  t.ok("Sal Dourado: três linhas…", A7.salUsar(sal, "linha", "porta", "c1").ok && A7.salUsar(sal, "linha", "janela", "c1").ok && A7.salUsar(sal, "linha", "x", "c1").vazio);
  t.ok("  …e vazio", !A7.salUsar(sal, "linha", "y", "c1").ok);
  const sal2 = { id: "it-sal2", nome: "Sal Dourado", tipo: "item", origemCatalogoId: A7.ID_SAL, ordem: {} };
  t.ok("  o círculo esvazia de uma vez", A7.salUsar(sal2, "circulo", "sala", "c1").vazio);

  const terco = { id: "it-tc", nome: "Terço Maculado", tipo: "item", origemCatalogoId: A7.ID_TERCO, ordem: { amaldicoado: true, elemento: "sangue", grupo: "amaldicoado" } };
  t.ok("Terço: vestir pede a súplica", !A7.tercoVestir(terco, "").ok && A7.tercoVestir(terco, "Proteja minha irmã").ok && A7.tercoAtivo(terco));
  t.ok("  cumprido: vira item mundano", A7.tercoEncerrar(terco, "cumprido").ok && !A7.tercoAtivo(terco) && !terco.ordem.amaldicoado && !terco.ordem.elemento);

  const oc = ficha({ classe: "ocultista", origem: "academico", nex: 40, atributos: ATR });
  const cajado = { id: "it-cj", nome: "Cajado da Cruz de Sangue", tipo: "item", origemCatalogoId: A7.ID_CAJADO, ordem: { empunhada: true } };
  const invC = { itens: [cajado] };
  const sangue = { nome: "Hemofagia", origemCatalogoId: "op.ritual.hemofagia", ordem: { elemento: "sangue", circulo: 1 } };
  const morte = { nome: "Decadência", origemCatalogoId: "op.ritual.decadencia", ordem: { elemento: "morte", circulo: 1 } };
  t.ok("Cajado: sem ritual de Sangue conhecido, nada", !A7.cajadoAtivo(oc, invC, [morte]));
  t.ok("  com um ritual de Sangue: –1 PE e +1 na DT nos de Sangue", A7.cajadoAtivo(oc, invC, [sangue]) &&
    A7.menosPeDoRitual(oc, sangue, invC, [sangue]).menosPe === 1 && A7.dtExtraDoRitual(oc, sangue, invC, [sangue]).valor === 1);
  t.ok("  nos outros elementos, nada", A7.menosPeDoRitual(oc, morte, invC, [sangue, morte]).menosPe === 0);
  t.ok("  só para ocultista", !A7.cajadoAtivo(ficha({ classe: "especialista", atributos: ATR }), invC, [sangue]));
  cajado.ordem.empunhada = false;
  t.ok("  só empunhado", !A7.cajadoAtivo(oc, invC, [sangue]));

  const d = I.normalizarDados({ as7: { guiadas: [{ criatura: "Stryzga", terminado: true }], usados: 2, lixo: 1 } }, "item");
  t.ok("o estado do item volta sem id (importação) e ganha um; campo estranho sai", d.as7.guiadas.length === 1 && !!d.as7.guiadas[0].id && d.as7.usados === 2 && !("lixo" in d.as7));
}

/* =====================================================================
   TRILHAS MONSTRUOSO
   ===================================================================== */

t.grupo("Trilhas · ids próprios, a original preservada");
{
  t.ok("Monstruoso (SAH) continua com a mesma chave", C.trilha("monstruoso").fonte === "SAH");
  const te = C.trilha("monstruosoEspecialista"), to = C.trilha("monstruosoOcultista");
  t.igual("as variantes do AS7", [te.classe, te.fonte, te.pagina, to.classe, to.fonte, to.pagina], ["especialista", "AS7", 81, "ocultista", "AS7", 85]);
  t.igual("quatro marcos cada", [P.habilidadesDaTrilha("monstruosoEspecialista").map((h) => h.nex), P.habilidadesDaTrilha("monstruosoOcultista").map((h) => h.nex)], [[10, 40, 65, 99], [10, 40, 65, 99]]);
  const e = monstruoso("especialista", 10, "");
  t.ok("o elemento é pendência do primeiro marco", E.estado(e, null).pendencias.some((p) => p.id === "b.serExperimentado"));
  t.ok("  Medo não vale", !simular(e, "b.serExperimentado", "", { elemento: "medo" }).valido);
  escolher(e, "b.serExperimentado", "", { elemento: "energia" });
  t.igual("  e a variante lê o elemento", [A7.variante(e).elemento, A7.variante(e).marco], ["energia", 10]);
  t.ok("a trilha usa a Progressão de NEX mesmo sem a regra", E.usaProgressaoDeNex(monstruoso("ocultista", 35, "sangue")) &&
    E.vagas(monstruoso("ocultista", 35, "sangue")).some((v) => v.id === "x25.alteracao") && !E.vagas(monstruoso("ocultista", 35, "sangue")).some((v) => /transcender/.test(v.id)));
  const af = monstruoso("ocultista", 50, "morte", { afinidade: { elemento: "sangue" } });
  t.ok("afinidade com outro elemento é apontada", JSON.stringify(E.estado(af, null)).indexOf("Ser Escarificado") >= 0);
}

t.grupo("Trilhas · penalidade social, uma só (a do maior marco)");
{
  const pen = (nex) => A7.penalidadeSocial(monstruoso("especialista", nex, "sangue")).map((m) => [m.efeito.tipo, m.efeito.valor]);
  t.igual("10: –2", pen(10), [["bonusPericia", -2]]);
  t.igual("40: –5", pen(40), [["bonusPericia", -5]]);
  t.igual("65: –1 dado", pen(65), [["dadosPericia", -1]]);
  t.igual("99: –2 dados", pen(99), [["dadosPericia", -2]]);
  const base = ficha({ classe: "especialista", origem: "academico", nex: 40, atributos: { agi: 2, for: 2, int: 2, pre: 3, vig: 2 } });
  t.igual("na conta de Diplomacia", R.bonusDePericia(monstruoso("especialista", 40, "sangue"), "diplomacia", { itens: [] }).total - R.bonusDePericia(base, "diplomacia", { itens: [] }).total, -5);
  t.igual("Ser Expurgado: Presença –1 para sempre", R.atributo(monstruoso("especialista", 65, "sangue"), "pre"), 2);
}

t.grupo("Trilhas · procedimento do dia (dia da cronologia)");
{
  const o = monstruoso("especialista", 40, "energia");
  const inv = { itens: [comp("energia", 2)] };
  t.ok("sem componente do elemento, recusa", !A7.fazerProcedimento(o, { itens: [comp("sangue")] }, { opId: "op-pr-0", componente: { modo: "item", id: "comp-sangue" }, rolagem: 5, atual: 10, maximo: 30 }).ok);
  const r = A7.fazerProcedimento(o, inv, { opId: "op-pr-1", componente: { modo: "item", id: "comp-energia" }, rolagem: 7, sacrificio: 1, atual: 10, maximo: 30 });
  t.ok("faz: consome 1 componente e recupera os PV rolados", r.ok && inv.itens[0].ordem.quantidade === 1 && o.recursos.pv === 17 && r.registro.cura.expressao === "2d8+2");
  t.ok("  o mesmo opId não faz de novo (recarregar)", A7.fazerProcedimento(o, inv, { opId: "op-pr-1", componente: { modo: "item", id: "comp-energia" }, rolagem: 7, atual: 17, maximo: 30 }).repetido && inv.itens[0].ordem.quantidade === 1);
  t.ok("  um por dia", !A7.fazerProcedimento(o, inv, { opId: "op-pr-2", componente: { modo: "item", id: "comp-energia" }, rolagem: 7, atual: 17, maximo: 30 }).ok);
  t.ok("efeitos do dia: Agilidade nos PE, deslocamento +6, Defesa +2 +2 por ponto queimado", (() => {
    const tipos = A7.efeitosDoDia(o).map((m) => m.efeito);
    return tipos.some((x) => x.tipo === "atributoDoPe" && x.atributo === "agi") && tipos.some((x) => x.tipo === "deslocamento" && x.valor === 6) && tipos.some((x) => x.tipo === "defesa" && x.valor === 4);
  })());
  t.ok("  +1d6 (+1d6 por ponto) nos ataques — dado, não bônus fixo", A7.dadosExtras(o, inv, { ataque: "corpo" }).some((d) => d.dado === "2d6"));
  const semSac = R.pontosDeVida(o).total;
  t.igual("sacrifício: Vigor –1 nos testes…", R.atributo(o, "vig"), 1);
  t.igual("  …mas não nos PV, PE e SAN", [R.atributoSemSacrificio(o, "vig")], [2]);
  const sem = monstruoso("especialista", 40, "energia");
  t.igual("  PV iguais aos de quem não sacrificou", semSac, R.pontosDeVida(sem).total);
  t.igual("  nem na contagem de perícias treinadas", E.estado(o, null).graus ? Object.keys(E.estado(o, null).graus).length : 0, E.estado(sem, null).graus ? Object.keys(E.estado(sem, null).graus).length : 0);
  t.ok("não dá para sacrificar além dos pontos próprios", (() => {
    const x = monstruoso("especialista", 40, "energia"); novoDia(x);
    return !A7.fazerProcedimento(x, { itens: [comp("energia")] }, { opId: "op-pr-9", componente: { modo: "item", id: "comp-energia" }, rolagem: 1, sacrificio: 3, atual: 1, maximo: 9 }).ok;
  })());
  const j = volta(o);
  t.ok("recarregar no mesmo dia: os efeitos continuam, sem repetir", A7.ativoHoje(j) && A7.dados(j).procedimento.registros.length === 1 && R.atributo(j, "vig") === 1);
  novoDia(o);
  t.ok("novo dia: os efeitos saem e o atributo volta", !A7.ativoHoje(o) && R.atributo(o, "vig") === 2 && A7.efeitosDoDia(o).length === 0);
  t.ok("  sem procedimento no dia: marcado, sem inventar penalidade", A7.marcarSemProcedimento(o).ok && A7.semProcedimentoHoje(o));
}

t.grupo("Trilhas · Morte: o limite de morrendo acompanha o dia");
{
  const o = monstruoso("especialista", 40, "morte");
  A7.fazerProcedimento(o, { itens: [comp("morte")] }, { opId: "op-mo-1", componente: { modo: "item", id: "comp-morte" }, rolagem: 3, sacrificio: 1, atual: 5, maximo: 20 });
  t.igual("Ser Testado: +1 turno morrendo, +1 por ponto necrosado", o.condicoes.limiteExtra.morrendo, 2);
  t.igual("  PV temporários da cena: 2d8 +2d8 por ponto", A7.temporariosDaCena(o).expressao, "4d8");
  t.ok("  uma vez por cena", A7.registrarUsoLimitado(o, "pvDaCena", "op-tc-1").ok && A7.temporariosDaCena(o).jaRecebido && !A7.registrarUsoLimitado(o, "pvDaCena", "op-tc-2").ok);
  novoDia(o);
  t.ok("novo dia: o limite sai sozinho", !("morrendo" in o.condicoes.limiteExtra));
}

t.grupo("Trilhas · braços e usos por rodada e cena");
{
  const o = monstruoso("especialista", 65, "sangue");
  A7.fazerProcedimento(o, { itens: [comp("sangue")] }, { opId: "op-br-1", componente: { modo: "item", id: "comp-sangue" }, rolagem: 3, atual: 5, maximo: 20 });
  t.igual("braço de Sangue: Força +1 no dia", R.atributo(o, "for"), 3);
  t.ok("  +1d8 em corpo a corpo", A7.dadosExtras(o, { itens: [] }, { ataque: "corpo" }).some((d) => d.dado === "1d8"));
  t.igual("  dano de Ser Testado vira d8", A7.danoExtra(o).expressao, "1d8");
  t.ok("ataque do braço: um por rodada", A7.registrarUsoLimitado(o, "bracoSangue", "op-b-1").ok && !A7.registrarUsoLimitado(o, "bracoSangue", "op-b-2").ok);
  A5.proximaRodada(o);
  t.ok("  na rodada seguinte, de novo", A7.registrarUsoLimitado(o, "bracoSangue", "op-b-3").ok);
  const m = monstruoso("especialista", 65, "morte");
  A7.fazerProcedimento(m, { itens: [comp("morte")] }, { opId: "op-br-2", componente: { modo: "item", id: "comp-morte" }, rolagem: 3, atual: 5, maximo: 20 });
  t.ok("braço de Morte: cada item, só a primeira vez", A7.registrarToque(m, "op-tq-1", "Faca", "envelhecer").ok && !A7.registrarToque(m, "op-tq-2", "faca", "passado").ok);
}

t.grupo("Trilhas · Ocultista: PE, DT, Tatuagem sem duplicar, reação");
{
  const o = monstruoso("ocultista", 40, "conhecimento", { atributos: { agi: 2, for: 2, int: 4, pre: 1, vig: 2 } });
  const peAntes = R.pontosDeEsforco(o).total;
  A7.fazerProcedimento(o, { itens: [comp("conhecimento")] }, { opId: "op-es-1", componente: { modo: "item", id: "comp-conhecimento" }, rolagem: 4, atual: 2, maximo: 20 });
  t.igual("escarificação: Intelecto no lugar da Presença na DT", R.atributoDaDt(o), "int");
  t.ok("  e nos PE (com +1 no atributo)", R.pontosDeEsforco(o).total > peAntes && R.atributo(o, "int") === 5);
  const marcado = { nome: "Terceiro Olho", origemCatalogoId: "op.ritual.terceiro-olho", ordem: { elemento: "conhecimento", circulo: 1 } };
  A7.definirEscolha(o, "rituaisMarcados", [A7.chaveDoRitual(marcado)]);
  t.igual("Tatuagem ampliada: –1 PE no marcado", A7.menosPeDoRitual(o, marcado, { itens: [] }, [marcado]).menosPe, 1);
  const comPoder = monstruoso("ocultista", 40, "conhecimento");
  comPoder.escolhas.push({ id: "tp", etapa: "d3.poderClasse", tipo: "poderClasse", valor: "tatuagemRitualistica", opcoes: {}, registradoEm: "2026-10-30T10:00:00.000Z" });
  A7.fazerProcedimento(comPoder, { itens: [comp("conhecimento")] }, { opId: "op-es-2", componente: { modo: "item", id: "comp-conhecimento" }, rolagem: 4, atual: 2, maximo: 20 });
  A7.definirEscolha(comPoder, "rituaisMarcados", [A7.chaveDoRitual(marcado)]);
  t.igual("  quem já tem o poder não recebe outro –1", A7.menosPeDoRitual(comPoder, marcado, { itens: [] }, [marcado]).menosPe, 1);
  t.ok("reação: só sob a condição do elemento", !A7.podeReacao(o, { categorias: ["fadiga"] }).ok && A7.podeReacao(o, { categorias: ["mental"] }).ok);
  A7.registrarUsoLimitado(o, "reacaoPerfurado", "op-re-1");
  t.ok("  uma vez por cena", !A7.podeReacao(o, { categorias: ["mental"] }).ok && (novaCena(o), A7.podeReacao(o, { categorias: ["mental"] }).ok));
  const r65 = monstruoso("ocultista", 65, "conhecimento");
  A7.fazerProcedimento(r65, { itens: [comp("conhecimento")] }, { opId: "op-es-3", componente: { modo: "item", id: "comp-conhecimento" }, rolagem: 4, atual: 2, maximo: 20 });
  A7.definirEscolha(r65, "rituaisMarcados", [A7.chaveDoRitual(marcado)]);
  t.igual("Ser Rasgado: +2 na DT dos marcados", A7.dtExtraDoRitual(r65, marcado, { itens: [] }, [marcado]).valor, 2);
  const r99 = monstruoso("ocultista", 99, "morte");
  A7.definirEscolha(r99, "ritual99elemento", "op.ritual.fim-inevitavel");
  A7.definirEscolha(r99, "ritual99medo", "op.ritual.convocar-o-algoz");
  t.igual("Ser Mutilado: os de 4º círculo só no dia da escarificação", A7.rituaisDoDia(r99, []).length, 0);
  A7.fazerProcedimento(r99, { itens: [comp("morte")] }, { opId: "op-es-4", componente: { modo: "item", id: "comp-morte" }, rolagem: 4, atual: 2, maximo: 20 });
  t.ok("  no dia: os dois (e Cicatrização de Ser Rasgado), sem virar ritual aprendido", A7.rituaisDoDia(r99, []).map((x) => x.id).join() === "op.ritual.cicatrizacao,op.ritual.fim-inevitavel,op.ritual.convocar-o-algoz" && !r99.rituais);
  t.ok("  o de Medo conta como do elemento (o catálogo não muda)", A7.ritualDoElementoDaTrilha(r99, { nome: "Convocar o Algoz", origemCatalogoId: "op.ritual.convocar-o-algoz", elemento: "medo" }));
}

/* =====================================================================
   EXPOSIÇÃO, INFECÇÃO, DEBAIXO D'ÁGUA
   ===================================================================== */

t.grupo("Exposição em dobro (com NEX & Experiência)");
{
  const sem = monstruoso("ocultista", 10, "sangue");
  t.ok("sem a regra: recusa (o NEX sobe pela progressão)", !A7.registrarExposicao(sem, "op-x-0", "moderada").ok);
  const com = monstruoso("ocultista", 10, "sangue", { opcionais: { nexExperiencia: true } });
  com.nex = 10;
  const r = A7.registrarExposicao(com, "op-x-1", "profunda");
  t.ok("com a regra: profunda vale 4", r.ok && r.valor === 4 && r.dobro);
  t.ok("  o mesmo opId não soma de novo", A7.registrarExposicao(com, "op-x-1", "profunda").repetido && A7.dados(com).exposicoes.length === 1);
}

t.grupo("Mentem Corrumpere · infecção da Apóstata");
{
  const o = ficha({ classe: "combatente", origem: "academico", atributos: ATR });
  t.ok("infectar: estágio I, treinado em Religião (sem gravar o grau)", A7.infectar(o, "op-in-1", 1, false).ok && R.grauDaPericia(o, "religiao") === "treinado" && !(o.pericias && o.pericias.religiao));
  t.igual("DT 20 +1 por dia infectado", (novoDia(o), A7.dtDaInfeccao(o)), 21);
  const f1 = A7.registrarTesteDiario(o, "op-ti-1", 10);
  t.ok("um teste por dia", !f1.passou && !A7.registrarTesteDiario(o, "op-ti-2", 30).ok);
  novoDia(o);
  const f2 = A7.registrarTesteDiario(o, "op-ti-3", 10);
  t.igual("dois dias de falha no estágio I obrigam o primeiro rito", [f2.falhasSeguidas, f2.obrigaRito, f2.dt], [2, 1, 22]);
  t.ok("os estágios só avançam", !A7.avancarInfeccao(o, 1).ok && A7.avancarInfeccao(o, 2).ok);
  const limpa = ficha({ classe: "combatente", origem: "academico", atributos: ATR });
  t.igual("  estágio II: treinado (+5) e mais +5 em Religião; alquebrado", [R.bonusDePericia(o, "religiao", { itens: [] }).total - R.bonusDePericia(limpa, "religiao", { itens: [] }).total, A7.condicoesDoEstagio(2)], [10, ["alquebrado"]]);
  t.ok("só a morte da criatura cura: a tela marca", A7.curarInfeccao(o).ok && !A7.dados(o).infeccao.ativa);
}

t.grupo("Debaixo d'água (p. 92–93): não oficial, desligado por padrão");
{
  const r = OP.regra("regrasSubaquaticas");
  t.ok("regra opcional com o aviso de não oficial e não canônica", r.fonte === "AS7" && r.pagina === 92 && /não oficiais e não canônicas/.test(r.naoOficial.aviso));
  t.ok("  não é Extra e não inventa autor", r.fonte !== "EXTRA" && !r.autor && /Dragão Brasil/.test(r.naoOficial.procedencia));
  t.ok("  desligada por padrão", !OP.ligada(ficha({ classe: "combatente" }), "regrasSubaquaticas"));
  const o = ficha({ classe: "combatente", origem: "academico", atributos: ATR });
  t.ok("desligada: entrar na água é recusado", !A7.entrarNaAgua(o, { profundidade: 60 }).ok);
  const l = ficha({ classe: "combatente", origem: "academico", atributos: ATR, opcionais: { regrasSubaquaticas: true } });
  t.ok("ligada: contextual (só com a ficha submersa)", A7.entrarNaAgua(l, { profundidade: 60 }).ok && A7.dados(l).submerso.ativo);
  t.igual("Pressão 50–99 m: DT 20, fatigado", (() => { const x = A7.resolverPressao(l, "op-p-1", 12); return [x.dt, x.condicao]; })(), [20, "fatigado"]);
  t.ok("  o mesmo opId não repete", A7.resolverPressao(l, "op-p-1", 12).repetido && A7.dados(l).submerso.testes === 1);
  A7.mudarProfundidade(l, 150);
  t.igual("100–299 m: DT 25 +1 por teste anterior", [A7.dtDaPressao(l).dt, A7.resolverPressao(l, "op-p-2", 30).metade, A7.dtDaPressao(l).dt], [25, true, 26]);
  A7.mudarProfundidade(l, 300);
  t.igual("300 m: DT 25 +5 por teste anterior", (A7.resolverPressao(l, "op-p-3", 1), A7.dtDaPressao(l).dt), 30);
  t.ok("Pressão é perigo desta regra, não perigo complexo do AS5", !(G.RAMAOrdemPerigos && G.RAMAOrdemPerigos.perigo && G.RAMAOrdemPerigos.perigo("pressao")));
  t.ok("sair da água: nada fica", A7.sairDaAgua(l).ok && !A7.dados(l).submerso.ativo && A7.dtDaPressao(l) === null);
}

/* =====================================================================
   AMEAÇAS
   ===================================================================== */

t.grupo("Ameaças (p. 40–45, 65–73)");
{
  const de = (id) => DADOS.criaturas.filter((c) => c.id === "as7.criatura." + id)[0];
  t.ok("Raziel, O Verdadeiro Raziel, Alvira, Sabara, Velisar e Zéfero são Pessoa", ["raziel", "o-verdadeiro-raziel", "alvira", "sabara", "velisar", "zefero"].every((k) => de(k) && de(k).natureza === "humana"));
  t.ok("Incinerado, Stryzga e Apóstata são paranormais", ["incinerado", "stryzga", "apostata"].every((k) => de(k).natureza === "paranormal"));
  t.ok("conferência do catálogo sem erros", OC.conferir(DADOS).erros.filter((e) => /^as7\./.test(e)).length === 0);
  const ap = CR.normalizar(OC.paraCriatura ? OC.paraCriatura(de("apostata")) : de("apostata"));
  t.igual("Apóstata: estados de patamar, exposição e os dois fios", ap.ordem.estados.map((e) => [e.id, e.maximo]), [["patamar", 4], ["exposta", 3], ["fio-1", 22], ["fio-2", 22]]);
  t.igual("  as formas dos patamares", ap.ordem.formas.map((f) => [f.id, f.pv]), [["vd160", 333], ["vd240", 555], ["vd320", 777]]);
  const oc = CR.normalizar(JSON.parse(JSON.stringify(ap)));
  t.ok("  as chaves da mecânica valem na ocorrência", CR.definirNaInstancia(oc, "estado:patamar", 4) && CR.definirNaInstancia(oc, "forma", "vd320") &&
    CR.definirNaInstancia(oc, "uso:rito.sucessos", 3) && CR.definirNaInstancia(oc, "uso:gnosis.balistico", 2) && CR.definirNaInstancia(oc, "marcador:manifestada", true));
  t.ok("  e as fora da régua, não", !CR.definirNaInstancia(oc, "estado:patamar", 5) && !CR.definirNaInstancia(oc, "estado:fio-1", 23));
  t.ok("Velisar e Stryzga: armadilhas e alimentações por uso", CR.definirNaInstancia(oc, "uso:armadilha.gas", 2) && CR.definirNaInstancia(oc, "uso:alimentou.ana-souza", 3));
  const rz = CR.normalizar(OC.paraCriatura ? OC.paraCriatura(de("raziel")) : de("raziel"));
  const vida = rz.status.filter((s) => s.id === "vida")[0];
  vida.atual = 30;
  CR.definirNaInstancia(rz, "forma", "verdadeiro");
  t.igual("Fúria Sanguinária: com menos de 200 PV, fica com 200", [vida.maximo, vida.atual], [400, 200]);
  t.ok("  voltar à ficha de partida não restaura", CR.definirNaInstancia(rz, "forma", "") && rz.status.filter((s) => s.id === "vida")[0].atual <= 200);
  t.ok("as imagens provisórias existem", await (async () => {
    for (const c of DADOS.criaturas.filter((x) => /^as7\./.test(x.id))) {
      for (const arq of ["retrato.png", "corpo.png"]) {
        try { await Deno.stat(new URL("../assets/criaturas/as7/" + c.id.replace("as7.criatura.", "") + "/" + arq, import.meta.url)); } catch { return false; }
      }
    }
    return true;
  })());
}

/* =====================================================================
   PERSISTÊNCIA
   ===================================================================== */

t.grupo("Persistência · schema 29, exportar e importar");
{
  t.igual("schema 29", F.VERSAO_SCHEMA, 29);
  const antiga = F.normalizarFicha({ schemaVersion: 28, nome: "Antiga", tipoFicha: "ordem", ordem: { classe: "combatente" } });
  t.ok("ficha 28 abre com o estado vazio, sem conversão destrutiva", !!antiga.ordem.arquivo7 && antiga.ordem.arquivo7.procedimento.registros.length === 0);
  const o = monstruoso("especialista", 40, "sangue");
  A7.fazerProcedimento(o, { itens: [comp("sangue")] }, { opId: "op-pe-1", componente: { modo: "item", id: "comp-sangue" }, rolagem: 3, atual: 5, maximo: 20 });
  A7.registrarCorpo(o, "op-pe-2", "Alvo", "normal", true);
  const fs = F.normalizarFicha({ nome: "Teste", tipoFicha: "ordem", ordem: o, inventario: { itens: [] }, rituais: { itens: [] } });
  const ex = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fs))));
  const a7 = ex.ok ? ex.dados.ordem.arquivo7 : null;
  t.ok("exportar e importar: os registros voltam com os ids", !!a7 && a7.procedimento.registros.length === 1 && !!a7.procedimento.registros[0].id && a7.vampirismo.corpos.length === 1 && !!a7.vampirismo.corpos[0].id);
  t.ok("  e os opIds (nada repete depois de importar)", !!a7 && A7.jaFeito(ex.dados.ordem, "op-pe-1"));
  const dup = JSON.parse(JSON.stringify(o));
  dup.arquivo7.procedimento.registros.push(JSON.parse(JSON.stringify(dup.arquivo7.procedimento.registros[0])));
  t.igual("registro duplicado (mesmo id) entra uma vez", volta(dup).arquivo7.procedimento.registros.length, 1);
  t.ok("a sincronização conhece as listas do AS7 por id", JSON.stringify(SY).length > 0 && (await Deno.readTextFile(new URL("../js/sync.js", import.meta.url))).indexOf("ordem.arquivo7.vampirismo.consumos") >= 0);
}

t.grupo("Servidor · a mesma régua da ocorrência");
{
  const gs = await Deno.readTextFile(new URL("../backend/Campanhas.gs", import.meta.url));
  t.ok("o servidor aplica o piso de PV da forma (pvMinimoAoAssumir)", /pvMinimoAoAssumir/.test(gs));
  const sis = await Deno.readTextFile(new URL("../backend/Sistemas.gs", import.meta.url));
  t.ok("o registro do servidor conhece ordem.as7", /ordem\.as7/.test(sis));
  t.ok("o servidor aceita o AS7 como fonte de criatura", /AS7/.test(gs));
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
