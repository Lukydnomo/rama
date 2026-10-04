/* =====================================================================
   R.A.M.A. — testes da importação do CRIS (v2.34)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-cris.js

   O conversor (js/importar-cris.js) roda sem DOM, sem rede e sem gravar:
   recebe o retrato que o servidor devolveria e monta a ficha com as
   fábricas e o motor do R.A.M.A. Os casos reais são dois retratos
   públicos guardados em testes/fixtures/cris (Jeff e Gina); mudanças
   posteriores no CRIS não mexem neles. O resto é sintético.

   O retrato do Jeff passa pelo mesmo núcleo do servidor (backend/Cris.gs)
   a partir de um documento Firestore montado aqui — o caminho inteiro,
   menos a rede.
   ===================================================================== */

const ARQUIVOS = [
  "js/config.js", "js/util.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js",
  "js/ordem/condicoes.js", "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js",
  "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/maldicoes.js", "js/ordem/arquivo2.js", "js/ordem/arquivo3.js", "js/ordem/arquivo4.js", "js/criaturas.js",
  "js/ficha.js", "js/validacao.js", "js/importar-cris.js",
];

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}
/* Só o núcleo do servidor: a ação (UrlFetchApp, CacheService) fica de fora. */
(0, eval)((await Deno.readTextFile(new URL("../backend/Cris.gs", import.meta.url))).replace(/function crisDentroDoLimite[\s\S]*$/, "") + "\nglobalThis.RamaCrisCore = RamaCrisCore;");

const ler = async (c) => JSON.parse(await Deno.readTextFile(new URL("./fixtures/cris/" + c, import.meta.url)));

/* ---------- coletor ---------- */
const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, obtido, esperado) { const ok = Object.is(obtido, esperado); t.ok(nome, ok, ok ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); },
  iguais(nome, obtido, esperado) { const a = JSON.stringify(obtido), b = JSON.stringify(esperado); t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`); },
};

const X = globalThis.RAMAImportarCris, F = globalThis.RAMAFicha, R = globalThis.RAMAOrdemRegras, E = globalThis.RAMAOrdemProgressao;
const V = globalThis.RAMAValidacao, H = globalThis.RAMAHabilidades, IT = globalThis.RAMAOrdemItens, RS = globalThis.RAMAOrdemRituais;
const deps = {
  F, R, E, H, ITM: IT, RS, C: globalThis.RAMAOrdemCatalogo, P: globalThis.RAMAOrdemPoderes, U: globalThis.RAMAUtil, V: globalThis.RAMAValidacao,
  catalogoItens: await IT.carregar(), catalogoRituais: await RS.carregar(),
};

function fsValue(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsValue(x)])) } };
}
const LINK_JEFF = "https://crisordemparanormal.com/agente/OwH4ajq32U6pYGVlJBHa";
function retratoDe(doc, link) {
  const id = /agente\/([A-Za-z0-9_-]+)/.exec(link)[1];
  const fs = { name: "projects/cris-ordem-paranormal/databases/(default)/documents/characters/" + id, fields: fsValue(doc).mapValue.fields, updateTime: "2026-10-03T00:00:00Z" };
  return JSON.parse(JSON.stringify(globalThis.RamaCrisCore.pacote(fs, link, "2026-10-03T12:00:00Z")));
}
const jeffDoc = await ler("jeff-cris-publico.json");
const esperado = await ler("jeff-esperado.json");
const gina = await ler("gina-retrato.json");
const converter = (retrato, dec) => X.converter(JSON.parse(JSON.stringify(retrato)), dec || {}, deps);
const calcular = (f) => R.calcular(f.ordem, f.inventario);
const estado = (f) => E.estado(f.ordem, { inventario: f.inventario, rituais: f.rituais.itens });
const arma = (f, nome) => f.inventario.itens.find((i) => i.nome === nome);
const efetiva = (f, item) => R.armaEfetiva(f.ordem, f.inventario, item, f.pericias);
function categoria(f, item) {
  const u = R.usoPorCategoria(f.ordem, f.inventario);
  const todos = Object.values(u.categorias).flatMap((c) => c.itens).concat(u.acimaDeIV);
  const reg = todos.find((x) => x.id === item.id);
  return reg ? reg.efetiva : null;
}
const espacos = (f, item) => (R.ocupacaoDoInventario(f.ordem, f.inventario).itens.find((x) => x.id === item.id) || {}).total;
const revisao = (r, chave) => r.pendencias.find((p) => p.chave === chave);
const aviso = (r, codigo) => r.avisos.filter((a) => a.codigo === codigo);

console.log(`${FORTE}R.A.M.A. — importação do CRIS${FIM}`);

/* =====================================================================
   LINK, TEXTO, EXPRESSÕES
   ===================================================================== */
t.grupo("Link");
{
  const v = X.validarLink(LINK_JEFF + "/?aba=2#x");
  t.ok("link público com parâmetros e fragmento: aceito, sem eles", v.ok && v.url === LINK_JEFF);
  t.igual("  o id mantém as maiúsculas", v.documentId, "OwH4ajq32U6pYGVlJBHa");
  ["http://crisordemparanormal.com/agente/abc", "https://crisordemparanormal.com.evil.com/agente/abc", "https://evil.com/agente/abc",
    "https://crisordemparanormal.com/agente/", "https://crisordemparanormal.com/agente/a/b", "https://crisordemparanormal.com/agente/a%2Fb",
    "https://crisordemparanormal.com/campanha/abc", "javascript:alert(1)", "https://crisordemparanormal.com/agente/" + "a".repeat(129), "", null].forEach((l) => {
    t.ok("recusado: " + String(l).slice(0, 70), !X.validarLink(l).ok);
  });
  t.ok("servidor sem a ação: a mensagem diz o que atualizar", /Cris\.gs/.test(X.mensagemDeErro({ ok: false, erro: "acao_desconhecida" })));
  t.ok("ficha privada: mensagem própria", /pública/.test(X.mensagemDeErro({ ok: false, erro: "cris_nao_publica" })));
  t.ok("erro sem código conhecido: mensagem genérica, sem exceção", typeof X.mensagemDeErro(null) === "string");
}

t.grupo("Texto seguro (HTML vira texto, nada é executado)");
{
  const s = X.textoSeguro('<p>Um <b>dois</b></p><script>alert(1)</script><ul><li>a</li><li>b</li></ul><img src=x onerror=alert(1)>&lt;tag&gt; &amp; &#65;');
  t.ok("sem tag nenhuma", !/[<>]/.test(s.replace("<tag>", "")));
  t.ok("o conteúdo de script some", !/alert/.test(s));
  t.ok("parágrafos e listas viram linhas", /Um dois\n\n/.test(s) && /• a\n• b/.test(s));
  t.ok("entidades decodificadas", /<tag> & A/.test(s));
  t.igual("limite respeitado", X.textoSeguro("x".repeat(50), 10).length, 10);
}

t.grupo("Expressões de dano (analisador restrito, sem eval)");
{
  const e = X.analisarExpressao("2d4 + 1d8 + 2");
  t.ok("2d4+1d8+2: dois dados e uma constante", e.ok && e.termos.length === 3 && e.termos[2].valor === 2);
  ["1d6*2", "eval(1)", "1d6+(2)", "2d", "d20", "1d0", "1d6+abc", "1".repeat(300)].forEach((x) => t.ok("recusada: " + x.slice(0, 20), !X.analisarExpressao(x).ok));
  t.ok("dado subtraído é reconhecido como negativo", X.analisarExpressao("2d6-1d4").termos[1].negativo === true);
}

/* =====================================================================
   JEFF (caso obrigatório)
   ===================================================================== */
const retratoJeff = retratoDe(jeffDoc, LINK_JEFF);
const rJ = converter(retratoJeff);
const fJ = rJ.ficha, oJ = fJ.ordem, cJ = calcular(fJ);

t.grupo("Jeff · identidade, progressão e atributos");
t.ok("converte sem erro", rJ.ok && !rJ.bloqueado);
t.igual("classe Combatente", oJ.classe, "combatente");
t.igual("origem Vítima", oJ.origem, "vitima");
t.igual("NEX 40%", oJ.nex, esperado.nex);
t.iguais("FOR 3 AGI 2 INT 1 PRE 2 VIG 2", [oJ.atributos.for, oJ.atributos.agi, oJ.atributos.int, oJ.atributos.pre, oJ.atributos.vig], [3, 2, 1, 2, 2]);
t.ok("Jogando sem Sanidade ligada (isPdOn)", oJ.opcionais.semSanidade === true && !oJ.opcionais.nexExperiencia);
t.igual("trilha: Aniquilador sugerida, para confirmar", (revisao(rJ, "trilha") || {}).padrao, "aniquilador");
t.ok("  a sugestão cita as habilidades que a sustentam", /A Favorita/.test((revisao(rJ, "trilha") || {}).texto || ""));
t.ok("marco de importação registrado", oJ.importacao && oJ.importacao.marco.nex === 40 && oJ.importacao.marco.modo === "nex");

t.grupo("Jeff · recursos e defesas");
t.iguais("PV 1/64", [oJ.recursos.pv, cJ.pv.total], [1, 64]);
t.iguais("PD 1/43", [oJ.recursos.pd, cJ.pd.total], [1, 43]);
t.iguais("PE 32/32 preservado", [oJ.recursos.pe, cJ.pe.total], [32, 32]);
t.iguais("SAN 41/41 preservada", [oJ.recursos.san, cJ.san.total], [41, 41]);
t.iguais("Defesa 17, bloqueio 10, esquiva 27", [cJ.defesa.total, cJ.bloqueio.total, cJ.esquiva.total], [17, 10, 27]);
t.iguais("deslocamento 9, capacidade 15, limite de PE 8", [cJ.deslocamento.total, cJ.carga.limite, cJ.limitePe.total], [9, 15, 8]);
t.igual("nenhum ajuste de recurso foi preciso", oJ.ajustes.length, 0);

t.grupo("Jeff · perícias");
t.iguais("veteranas: Fortitude, Luta, Reflexos", ["fortitude", "luta", "reflexos"].map((k) => oJ.pericias[k]), ["veterano", "veterano", "veterano"]);
t.iguais("treinadas: Crime, Intimidação, Vontade", ["crime", "intimidacao", "vontade"].map((k) => oJ.pericias[k]), ["treinado", "treinado", "treinado"]);
t.iguais("Intuição e Religião com Presença", [R.atributoDaPericia(oJ, "intuicao"), R.atributoDaPericia(oJ, "religiao")], ["pre", "pre"]);
t.ok("o treino não é somado duas vezes (Luta = +10)", R.bonusDePericia(oJ, "luta", fJ.inventario).total === 10);

t.grupo("Jeff · itens e ataque");
const faca = arma(fJ, "Faca");
const efFaca = efetiva(fJ, faca);
t.igual("3 itens no inventário", fJ.inventario.itens.length, 3);
t.igual("a Faca não é duplicada pelo ataque", fJ.inventario.itens.filter((i) => i.tipo === "arma").length, 1);
t.igual("Faca vem do catálogo", faca.origemCatalogoId, "op.arma.faca");
t.iguais("5 modificações reconhecidas", (faca.ordem.modificacoes || []).map((m) => m.nome), esperado.faca.modificacoes);
t.iguais("margem 17, ×2", [efFaca.margem, efFaca.multiplicador], [17, 2]);
t.igual("atributo do dano: Força", faca.ordem.arma.atributoDano, "for");
const rolFaca = rJ.itens.find((i) => i.nome === "Faca").rolagens;
t.igual("dano normal 2d4+1d8+5", rolFaca.normal, esperado.faca.danoNormalRama);
t.igual("crítico no R.A.M.A. 4d4+2d8+5", rolFaca.criticoRama, esperado.faca.danoCriticoRama);
t.igual("  o do CRIS fica registrado: 4d4+2d8+7", rolFaca.criticoCris, esperado.faca.danoCriticoCris);
t.ok("  a diferença de crítico aparece na revisão", !!revisao(rJ, "critico:item:item-1") && oJ.importacao.criticos.length === 1);
t.ok("Lancinante: 1d8 de Sangue que multiplica no crítico", faca.danoExtra === "1d8" && faca.ordem.arma.extraMultiplica === true);
t.ok("Golpe Pesado: +1 dado como ajuste com motivo", faca.ordem.ajustesImportados.dadosDano === 1 && /Golpe Pesado/.test(faca.ordem.ajustesImportados.motivo));
t.igual("categoria IV (observada), 1 espaço", categoria(fJ, faca), 4);
t.igual("  espaços", espacos(fJ, faca), 1);
t.ok("  sem a Favorita confirmada, a redução é ajuste com motivo", faca.ordem.ajustesImportados.categoria === -2 && /favorita/.test(faca.ordem.ajustesImportados.motivo));
const moletom = arma(fJ, "Moletom - Proteção Leve");
t.ok("Moletom: Proteção Leve do catálogo, em uso", moletom.origemCatalogoId === "op.protecao.leve" && moletom.ordem.emUso === true);
t.iguais("  Defesa +5, categoria III, 2 espaços, Sádica", [R.defesaDaProtecao(moletom).total, categoria(fJ, moletom), espacos(fJ, moletom), moletom.ordem.modificacoes.map((m) => m.nome).join()], [5, 3, 2, "Sádica"]);
const dedo = arma(fJ, "Dedo Decepado (Sangue Fervente)");
t.iguais("Dedo: categoria II, 1 espaço, guardado", [categoria(fJ, dedo), espacos(fJ, dedo), dedo.ordem.equipadoNaOrigem], [2, 1, false]);
t.ok("  procedência de Sangue Fervente vai para a revisão", (revisao(rJ, "procedencia:poder-6") || {}).padrao === "ficha");

t.grupo("Jeff · progressão sem história inventada");
const estJ = estado(fJ);
t.igual("nenhuma pendência no NEX importado", estJ.pendencias.length, 0);
t.ok("as etapas até NEX 40% são histórico indisponível", estJ.historicoImportado.length >= 4 && estJ.historicoImportado.every((h) => h.degrau <= 8));
t.igual("nenhum registro de escolha inventado", (oJ.escolhas.registros || oJ.escolhas || []).length, 0);
t.ok("sem favorita inventada", !(oJ.escolhas.registros || oJ.escolhas || []).some((x) => x.etapa === "b.aFavorita"));
t.ok("Ataque Especial e Cicatrizes Psicológicas vêm das regras, sem duplicar", oJ.importacao.aquisicoes.filter((a) => a.representacao === "regras").length === 3);
t.igual("7 poderes observados", oJ.importacao.aquisicoes.length, esperado.poderesObservados);
t.ok("Transcender não é inferido", !estJ.adquiridos.some((a) => a.chave === "transcender"));
t.igual("o NEX não desce abaixo do marco", R.minimoDoMarco(oJ).nex, 40);

t.grupo("Jeff · decisões");
{
  const r = converter(retratoJeff, { favorita: "item:item-1" });
  const f = arma(r.ficha, "Faca");
  t.igual("Favorita confirmada: categoria IV pela regra", categoria(r.ficha, f), 4);
  t.ok("  sem ajuste de categoria", !("categoria" in (f.ordem.ajustesImportados || {})));
  t.ok("  A Favorita registrada com a Faca", (r.ficha.ordem.escolhas.registros || r.ficha.ordem.escolhas).some((x) => x.etapa === "b.aFavorita" && x.opcoes.itens[0] === f.id));
  const semTrilha = converter(retratoJeff, { trilha: "" });
  t.ok("sem trilha: a progressão pede a trilha", estado(semTrilha.ficha).pendencias.some((p) => p.id === "d2.trilha"));
  const lixo = converter(retratoJeff, { trilha: "naoexiste", favorita: "item:999" });
  t.ok("decisão inválida é ignorada (fica a sugestão)", lixo.ficha.ordem.trilha === "aniquilador" && categoria(lixo.ficha, arma(lixo.ficha, "Faca")) === 4);
}

t.grupo("Jeff · contas vivas (nada de valor final como base)");
{
  const f = JSON.parse(JSON.stringify(fJ));
  const fa = arma(f, "Faca");
  const antes = efetiva(f, fa);
  fa.ordem.modificacoes = fa.ordem.modificacoes.filter((m) => m.nome !== "Cruel");
  t.igual("tirar Cruel tira 2 do dano", efetiva(f, fa).extra.total, antes.extra.total - 2);
  fa.ordem.modificacoes = fa.ordem.modificacoes.filter((m) => m.nome !== "Predadora");
  t.igual("tirar Predadora devolve a margem da faca (19)", efetiva(f, fa).margem, 19);
  f.ordem.atributos.for = 4;
  t.igual("FOR 4: o dano acompanha", efetiva(f, fa).extra.total, antes.extra.total - 2 + 1);
  const dupla = F.normalizarFicha(JSON.parse(JSON.stringify(F.normalizarFicha(JSON.parse(JSON.stringify(fJ))))));
  const c2 = calcular(dupla);
  t.iguais("normalizar de novo não muda a conta", [c2.pv.total, c2.defesa.total, efetiva(dupla, arma(dupla, "Faca")).dano], [64, 17, efFaca.dano]);
  const de2 = converter(retratoJeff);
  t.iguais("converter de novo dá o mesmo resumo", de2.resumo, rJ.resumo);
}

t.grupo("Jeff · evolução acima do marco");
{
  const f = JSON.parse(JSON.stringify(fJ));
  f.ordem.nex = 45;
  const o = R.normalizar(f.ordem);
  const est = E.estado(o, { inventario: f.inventario, rituais: [] });
  t.ok("NEX 45%: só as etapas novas pedem escolha", est.pendencias.length > 0 && est.pendencias.every((p) => (p.vaga ? p.vaga.degrau : p.degrau || 9) >= 9));
  t.ok("  nenhuma etapa histórica volta a pedir", !est.pendencias.some((p) => /^d[2-8]\./.test(p.id)));
  t.ok("  PV sobe com o NEX", R.calcular(o, f.inventario).pv.total > 64);
}

t.grupo("Jeff · exportar e importar sem perder vínculos");
{
  const f = JSON.parse(JSON.stringify(converter(retratoJeff, { favorita: "item:item-1" }).ficha));
  const agi = f.atributos.find((a) => a.sigla === "AGI");
  const luta = f.pericias.find((p) => /^Luta/.test(p.nome));
  luta.atributoId = agi.id;
  arma(f, "Faca").periciaId = luta.id;
  const pacote = V.exportar("personagem", f);
  const texto = JSON.stringify(pacote);
  t.ok("o arquivo não leva ids nem dados de conta", !/"id":/.test(texto) && !/ownerId|hashSenha|token"/.test(texto));
  const imp = V.importado(JSON.parse(texto));
  t.ok("importa pelo caminho de sempre", imp.ok && imp.tipo === "personagem");
  const g = imp.dados;
  const luta2 = g.pericias.find((p) => /^Luta/.test(p.nome));
  t.igual("a perícia da ficha principal continua em AGI (não volta para FOR)", g.atributos.find((a) => a.id === luta2.atributoId).sigla, "AGI");
  t.ok("todas as perícias mantêm o atributo", g.pericias.every((p, i) => g.atributos.find((a) => a.id === p.atributoId).sigla === f.atributos.find((a) => a.id === f.pericias[i].atributoId).sigla));
  t.igual("o item continua ligado à perícia", arma(g, "Faca").periciaId, luta2.id);
  t.ok("a Favorita aponta para a Faca nova", (g.ordem.escolhas.registros || g.ordem.escolhas).some((x) => x.etapa === "b.aFavorita" && x.opcoes.itens[0] === arma(g, "Faca").id));
  t.igual("  e a categoria continua IV pela regra", categoria(g, arma(g, "Faca")), 4);
  t.ok("o marco e os ajustes atravessam", g.ordem.importacao && g.ordem.importacao.aquisicoes.length === 7 && arma(g, "Faca").ordem.ajustesImportados.dadosDano === 1);
  const cg = calcular(g);
  t.iguais("as contas batem depois da volta", [cg.pv.total, cg.defesa.total, cg.esquiva.total], [64, 17, 27]);
  t.igual("nenhum aviso num arquivo novo", (imp.avisos || []).length, 0);
  const velho = JSON.parse(texto.replace(/"#ref:[a-z]+:\d+"/g, '"00000000-0000-0000-0000-00000000dead"'));
  const impV = V.importado(velho);
  const lutaV = impV.dados.pericias.find((p) => /^Luta/.test(p.nome));
  t.ok("arquivo antigo: importa", impV.ok);
  t.igual("  a perícia volta ao atributo padrão dela, não ao primeiro", impV.dados.atributos.find((a) => a.id === lutaV.atributoId).sigla, "FOR");
  t.ok("  e a prévia avisa o que não deu para reconstruir", impV.avisos.some((a) => /versão anterior/.test(a)) && impV.avisos.some((a) => /Faca/.test(a)));
  t.ok("  vínculo sem destino não aponta para a primeira coisa da lista", arma(impV.dados, "Faca").periciaId === null || arma(impV.dados, "Faca").periciaId === undefined);
}

/* =====================================================================
   GINA (segundo caso real)
   ===================================================================== */
const rG = converter(gina);
const fG = rG.ficha, oG = fG.ordem, cG = calcular(fG), estG = estado(fG);

t.grupo("Gina · identidade, recursos e defesas");
t.ok("converte sem erro", rG.ok);
t.iguais("Ocultista, Cultista Arrependido, NEX 65%", [oG.classe, oG.origem, oG.nex], ["ocultista", "cultistaarrependido", 65]);
t.iguais("FOR 2 AGI 2 INT 4 PRE 3 VIG 1", [oG.atributos.for, oG.atributos.agi, oG.atributos.int, oG.atributos.pre, oG.atributos.vig], [2, 2, 4, 3, 1]);
t.iguais("PV 75/75, PE 104/104, SAN 80/80", [oG.recursos.pv, cG.pv.total, oG.recursos.pe, cG.pe.total, oG.recursos.san, cG.san.total], [75, 75, 104, 104, 80, 80]);
t.ok("PD desligada; o valor guardado (109) fica", !oG.opcionais.semSanidade && oG.recursos.pd === 109 && oG.importacao.observacoes.some((x) => /PD no CRIS: 109\/109/.test(x)));
t.ok("SAN: a metade de Traços do Outro Lado vai para a revisão, mantendo 80", (revisao(rG, "maximo:san") || {}).valor === "cris");
t.iguais("Defesa 17, bloqueio 10, esquiva 32", [cG.defesa.total, cG.bloqueio.total, cG.esquiva.total], [17, 10, 32]);
t.iguais("11 itens, 14 poderes, 19 rituais", [fG.inventario.itens.length, oG.importacao.aquisicoes.length, fG.rituais.itens.length], [11, 14, 19]);

t.grupo("Gina · trilha e poderes");
t.igual("trilha sugerida: Lâmina Paranormal", oG.trilha, "laminaparanormal");
t.ok("habilidades da Lâmina vêm das regras", ["laminaMaldita", "gladiadorParanormal", "conjuracaoMarcial"].every((k) => oG.importacao.aquisicoes.some((a) => a.chave === k && a.representacao === "regras")));
const saber = oG.importacao.aquisicoes.find((a) => a.chave === "saberAmpliado");
t.ok("Saber Ampliado entra sem inferir uma segunda trilha (provável Versatilidade)", saber && saber.representacao === "importada" && oG.trilha === "laminaparanormal" && /Versatilidade/.test(saber.procedencia));
t.ok("Expansão de Conhecimento não abre vaga nem duplica", !estG.pendencias.some((p) => /outraClasse|poderClasse/.test(p.id)) && estG.adquiridos.filter((a) => a.chave === "expansaoDeConhecimento").length === 1);
t.ok("Golpe Pesado: provável Expansão de Conhecimento", /Expansão de Conhecimento/.test(oG.importacao.aquisicoes.find((a) => a.chave === "golpePesado").procedencia));
t.ok("Sangue de Ferro: procedência vs. Dedo Decepado na revisão", revisao(rG, "procedencia:ce4d4548-c4bf-4f7b-9523-2ba79a670859") !== undefined);
t.igual("  sem benefício duplo: um Sangue de Ferro só", estG.adquiridos.filter((a) => a.chave === "sangueDeFerro").length, 1);
{
  const r = converter(gina, { "procedencia:ce4d4548-c4bf-4f7b-9523-2ba79a670859": "item" });
  const est = estado(r.ficha);
  t.ok("  vindo do item: sem efeito fora dele", !est.adquiridos.some((a) => a.chave === "sangueDeFerro") && r.ficha.ordem.importacao.aquisicoes.find((a) => a.chave === "sangueDeFerro").representacao === "item");
  t.igual("  e o PV observado (75) entra como ajuste revisado", calcular(r.ficha).pv.total, 75);
}
t.ok("Sensitivo: o R.A.M.A. soma e o CRIS não — revisão, seguindo o R.A.M.A.", (revisao(rG, "pericias:automaticas") || {}).valor === "rama" && R.bonusDePericia(oG, "diplomacia", fG.inventario).total === 10);

t.grupo("Gina · itens");
const soco = arma(fG, "Soco (Soqueira)");
t.ok("ataque ligado à soqueira configura a arma (Ocultismo, Intelecto)", soco.tipo === "arma" && soco.ordem.pericia === "ocultismo" && soco.ordem.arma.atributoDano === "int");
t.ok("  Lancinante: 1d8 que multiplica", soco.danoExtra === "1d8" && soco.ordem.arma.extraMultiplica === true);
t.ok("  dano adicional (4d8, 2d6) descrito, sem rolagem automática", /4d8 Sangue; 2d6 Sangue/.test(soco.descricao) && aviso(rG, "dano_adicional").length === 1);
t.igual("  dano normal 2d4+1d8+5", rG.itens.find((i) => i.nome === "Soco (Soqueira)").rolagens.normal, "2d4+1d8+5");
t.ok("  maldições opostas mantidas como no CRIS, com aviso", aviso(rG, "mod_fora_da_regra").length === 2);
const vest = arma(fG, "Vestimenta (+5 Ocultismo, +1 Força, +2 Vontade)");
t.ok("bônus no NOME do item não viram efeito", vest.origemCatalogoId === "op.geral.vestimenta" && !R.bonusDePericia(oG, "ocultismo", fG.inventario).parcelas.some((p) => /Vestimenta/.test(p.rotulo)));
t.igual("  Ocultismo fica no total do CRIS (+15) por ajuste com motivo", R.bonusDePericia(oG, "ocultismo", fG.inventario).total, 15);
t.igual("  Força continua 2", R.atributo(oG, "for"), 2);
t.ok("item personalizado entra com valores observados", arma(fG, "Componentes Ritualísticos de Sangue, Morte e Conhecimento").categoria === "Importado do CRIS");
t.ok("Defesa +5: bônus extra com o motivo (maldição Defesa do Sigilo, sem automação)", oG.bonusExtra.defesa === 5 && /Sigilos de Kian/.test(rG.comparacao.find((c) => c.campo === "Defesa").motivo));

t.grupo("Gina · rituais");
const amal = fG.rituais.itens.find((x) => x.nome === "Amaldiçoar Arma");
t.ok("Amaldiçoar Arma: elemento “Varia” vai para a revisão", amal.elemento === "Varia" && revisao(rG, "ritual-elemento:d09bc291-e493-4f51-bb93-b37e4ee90200") !== undefined);
{
  const r = converter(gina, { "ritual-elemento:d09bc291-e493-4f51-bb93-b37e4ee90200": "sangue" });
  t.igual("  com a escolha, o elemento é Sangue", r.ficha.rituais.itens.find((x) => x.nome === "Amaldiçoar Arma").ordem.elemento, "sangue");
}
const pert = fG.rituais.itens.find((x) => x.nome === "Perturbação");
t.ok("ritual do catálogo com versões, custo e descrição", pert.origemCatalogoId && pert.versoes.length >= 3 && pert.ordem.custo === 1 && pert.descricao.length > 20);
t.ok("círculos e elementos variados", new Set(fG.rituais.itens.map((x) => x.circulo)).size >= 3 && new Set(fG.rituais.itens.map((x) => x.elemento)).size >= 5);
const barganha = fG.rituais.itens.find((x) => x.nome === "Barganha Insana");
t.ok("ritual fora do catálogo: personalizado, texto puro", barganha && !barganha.origemCatalogoId && barganha.circulo === "3º círculo" && !/[<>]/.test(barganha.descricao));
t.ok("rituais importados são conhecidos (histórico indisponível), sem regranjear concessões", Object.values(estG.rituais.porRitual).filter((x) => x.importado).length === 19 && estG.rituais.concessoes.length === 0 && estG.rituais.semAquisicao.length === 0);
{
  const f = JSON.parse(JSON.stringify(fG));
  f.ordem.nex = 70;
  const est = E.estado(R.normalizar(f.ordem), { inventario: f.inventario, rituais: f.rituais.itens });
  t.iguais("NEX 70%: só o que a etapa nova dá", est.pendencias.map((p) => p.id).sort(), ["afinidade", "d14.grauTreinamento", "d14.ritualClasse"]);
}
{
  const imp = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fG))));
  const est = estado(imp.dados);
  t.ok("exportar e importar: os 19 rituais seguem conhecidos", imp.ok && Object.values(est.rituais.porRitual).filter((x) => x.importado).length === 19);
  t.iguais("  e os recursos batem", [calcular(imp.dados).pv.total, calcular(imp.dados).san.total], [75, 80]);
}

/* =====================================================================
   CASOS SINTÉTICOS
   ===================================================================== */
const LINK_S = "https://crisordemparanormal.com/agente/Sintetico_1";
function sintetico(mais) {
  const base = {
    name: "Agente Sintético", player: "", className: "Especialista", backgroundName: "Acadêmico", nex: "10%", nexString: "10%",
    isNexLevelOn: false, isPdOn: false, isSobrevivendoAoHorror: false, private: false,
    attributes: { str: 1, dex: 2, int: 3, pre: 1, con: 1 },
    currentPv: 0, maxPv: 0, currentPe: 0, maxPe: 0, currentSan: 0, maxSan: 0, currentPd: 0, maxPd: 0,
    skills: [], powers: [], inventory: [], attacks: [], rituals: [], description: {},
  };
  return retratoDe(Object.assign(base, mais || {}), LINK_S);
}

t.grupo("Sintéticos · bordas");
{
  const r = converter(sintetico());
  t.ok("listas vazias e zeros: converte", r.ok);
  t.iguais("  PV atual zero é zero (não descanso)", [r.ficha.ordem.recursos.pv, r.ficha.ordem.recursos.pe], [0, 0]);
  t.ok("  máximos zerados vão para a revisão, sem chute", !!revisao(r, "maximo:pv"));
  const semCampos = sintetico(); delete semCampos.ficha.skills; delete semCampos.ficha.powers; delete semCampos.ficha.inventory; delete semCampos.ficha.rituals; delete semCampos.ficha.attacks;
  t.ok("campos ausentes: converte com listas vazias", converter(semCampos).ok);
  const priv = sintetico(); priv.ficha.private = true;
  t.ok("retrato privado é bloqueado", !converter(priv).ok && converter(priv).avisos[0].codigo === "cris_nao_publica");
  const outro = sintetico(); outro.adaptador = "outro-v9";
  t.ok("adaptador desconhecido é bloqueado", !converter(outro).ok);
  const troca = sintetico(); troca.fonte.documentId = "Outro";
  t.ok("fonte que não bate com o link é bloqueada", !converter(troca).ok);
  t.ok("sem catálogos: erro claro, sem exceção", !X.converter(sintetico(), {}, { F }).ok);
}
{
  const r = converter(sintetico({ nex: "99%", nexString: "35%" }));
  t.igual("NEX 99%", r.ficha.ordem.nex, 99);
  t.ok("  nexString diferente não manda no NEX", r.ficha.ordem.importacao.observacoes.some((x) => /nexString/.test(x)));
  const n = converter(sintetico({ isNexLevelOn: true, nex: "7", nexString: "35%" }));
  t.iguais("NEX & Experiência: nível 7, exposição 35% (nível não é porcentagem)", [n.ficha.ordem.nivel, n.ficha.ordem.nex, n.ficha.ordem.opcionais.nexExperiencia], [7, 35, true]);
  t.igual("  o marco é por nível", n.ficha.ordem.importacao.marco.modo, "nivel");
  const n2 = converter(sintetico({ isNexLevelOn: true, nex: "4", nexString: "" }));
  t.ok("  sem a exposição: revisão pede o NEX", !!revisao(n2, "exposicao"));
  const sah = converter(sintetico({ isSobrevivendoAoHorror: true }));
  t.iguais("conteúdo do SaH não liga regra opcional", Object.keys(sah.ficha.ordem.opcionais).filter((k) => sah.ficha.ordem.opcionais[k]), []);
  const pd = converter(sintetico({ isPdOn: true, maxPd: 10, currentPd: 3 }));
  t.ok("PD ligada: Jogando sem Sanidade", pd.ficha.ordem.opcionais.semSanidade === true && pd.ficha.ordem.recursos.pd === 3);
}
{
  const s = converter(sintetico({ className: "Sobrevivente", nex: "0%" }));
  t.ok("Sobrevivente: estágio pedido na revisão, marco por estágio", !!revisao(s, "estagio") && s.ficha.ordem.importacao.marco.modo === "estagio");
  const m = converter(sintetico({ className: "Mundano", nex: "0%" }));
  t.ok("Mundano: converte em NEX 0%", m.ok && m.ficha.ordem.nex === 0);
  const c = converter(sintetico({ className: "Combatente", nex: "5%" }));
  t.ok("Combatente em NEX 5%: sem trilha a decidir", c.ok && !revisao(c, "trilha"));
  const desconhecida = converter(sintetico({ className: "Bardo" }));
  t.ok("classe fora do catálogo: revisão escolhe", !!revisao(desconhecida, "classe"));
  const origem = converter(sintetico({ backgroundName: "Origem Inventada" }));
  t.ok("origem fora do catálogo: revisão, nome guardado como texto", !!revisao(origem, "origem") && origem.preservadosComoTexto.some((p) => p.texto === "Origem Inventada"));
}
{
  const r = converter(sintetico({
    inventory: [{ id: "a1", name: "Machadinha Lendária", itemType: "weapon", damage: "1d6", criticalRange: 20, criticalMult: 3, type: "Corpo a Corpo", handling: "Leve", proficiencie: "Armas Simples", slots: "1", category: "I", equipped: true, mods: [] }],
    attacks: [
      { id: "x1", itemId: "a1", name: "Golpe", damage: "1d6+1d4+1d8+3", criticalRange: 20, criticalMult: 3, skillUsed: "Luta", damageAttribute: "Força", damageType: "Corte", aditionalDamage: [] },
      { id: "x2", itemId: "a1", name: "Arremesso", damage: "1d6", criticalRange: 20, criticalMult: 3, skillUsed: "Pontaria", damageAttribute: "Agilidade", damageType: "Corte", aditionalDamage: [] },
      { id: "x3", itemId: "fantasma", name: "Mordida", damage: "1d6*2", criticalRange: 20, criticalMult: 2, skillUsed: "Luta", damageAttribute: "", damageType: "Perfuração", aditionalDamage: [] },
    ],
    powers: [{ id: "p1", name: "Dom Inventado", description: "<p>Faz algo <script>alert(1)</script>bom.</p>" }],
    description: { history: "<p>Linha 1</p><p>Linha 2</p>" },
  }));
  const it = arma(r.ficha, "Machadinha Lendária");
  t.ok("arma personalizada: valores observados, x3", r.ok && it && it.multiplicador === 3 && it.ordem.pericia === "luta");
  t.ok("  dois ataques na mesma arma: o segundo fica descrito", /Arremesso/.test(it.descricao) && aviso(r, "varios_ataques").length === 1);
  t.ok("  dano com três parcelas: o excedente fica descrito", aviso(r, "dano_composto").length === 1);
  const orfao = r.ficha.inventario.itens.find((i) => /Ataque: Mordida/.test(i.nome));
  t.ok("ataque sem item: arma de 0 espaço identificada", orfao && orfao.ordem.espacos === 0 && aviso(r, "ataque_sem_item").length === 1);
  t.ok("  expressão fora do formato: preservada com limitação", aviso(r, "expressao_nao_suportada").length === 1 && /1d6\*2/.test(orfao.descricao));
  const habs = H.todasAsHabilidades(r.ficha.habilidades);
  t.ok("poder personalizado vira habilidade de texto na pasta Importado do CRIS", habs.some((h) => h.nome === "Dom Inventado" && !/script|alert|</.test(h.texto)));
  const notas = r.ficha.anotacoes.pastas.find((p) => p.nome === "Importado do CRIS");
  t.ok("descrição em anotações, como texto puro", notas && notas.notas.some((n) => n.titulo === "História" && n.conteudo === "Linha 1\n\nLinha 2"));
  t.ok("a nota de origem guarda o link e não sincroniza", notas.notas[0].conteudo.includes(LINK_S) && /não sincronizam/.test(notas.notas[0].conteudo));
  t.ok("nada do documento bruto do CRIS fica na ficha", !JSON.stringify(r.ficha).includes("\"skills\""));
}

/* =====================================================================
   MEKO — ficha do CRIS refeita à mão no R.A.M.A. (v2.34.3)
   Os valores-alvo saem da ficha manual: o que a importação monta tem de
   dar a mesma conta, pelos mesmos motivos.
   ===================================================================== */
const meko = await ler("meko-retrato.json");
const rM = converter(meko);
const fM = rM.ficha, oM = fM.ordem, cM = calcular(fM);
const aqM = (nome) => oM.importacao.aquisicoes.find((a) => a.nomeOriginal === nome);
t.grupo("Meko · contra a ficha refeita à mão");
t.iguais("Especialista T.I., Atirador de Elite, nível 10 · exposição 50%", [oM.classe, oM.origem, oM.trilha, oM.nivel, oM.nex], ["especialista", "ti", "atirador", 10, 50]);
t.iguais("PV 53, PE 54, SAN 52 (como na manual)", [cM.pv.total, cM.pe.total, cM.san.total], [53, 54, 52]);
t.ok("  o +4 de PE vem de Coincidências Inexplicáveis (AGI), não de ajuste", !oM.ajustes.some((a) => a.alvo === "pe") && cM.pe.parcelas.some((x) => /Coincid/i.test(x.rotulo) && x.valor === 4));
t.iguais("Defesa 24, bloqueio 15, esquiva 34, deslocamento 9, limite de PE 10", [cM.defesa.total, cM.bloqueio.total, cM.esquiva.total, cM.deslocamento.total, cM.limitePe.total], [24, 15, 34, 9, 10]);
t.ok("alterações de exposição reconhecidas (Arrepios na Espinha e Coincidências Inexplicáveis)", aqM("NEX 25% - Arrepios na Espinha").chave === "alteracao25" && aqM("NEX 35% - Coincidências Inexplicáveis").chave === "alteracao35");
t.iguais("  Coincidências: AGI e Atletismo, inferidos dos números do CRIS", aqM("NEX 35% - Coincidências Inexplicáveis").opcoes, { atributo: "agi", penalidade: "atletismo" });
t.ok("  Atletismo 0 pela penalidade, sem ajuste avulso", R.bonusDePericia(oM, "atletismo", fM.inventario).total === 0 && !oM.ajustes.some((a) => a.alvo === "pericia:atletismo"));
t.ok("  Arrepios: a perícia penalizada fica para a revisão (o CRIS não deixa inferir)", (rM.pendencias.find((p) => /Arrepios/.test(p.rotulo)) || {}).valor === "");
t.igual("  Ocultismo 14 = veterano 10 + Arrepios 2 + 2 do CRIS", R.bonusDePericia(oM, "ocultismo", fM.inventario).total, 14);
{
  const chave = rM.pendencias.find((p) => /Arrepios/.test(p.rotulo)).chave;
  const r2 = converter(meko, { [chave]: "intimidacao" });
  const conta = R.bonusDePericia(r2.ficha.ordem, "intimidacao", r2.ficha.inventario);
  t.ok("  escolhendo Intimidação: −5 + Sensitivo 5 + 2, como na manual", conta.total === 2 && conta.parcelas.some((x) => /Arrepios/i.test(x.rotulo) && x.valor === -5) && r2.ficha.ordem.ajustes.some((a) => a.alvo === "pericia:intimidacao" && a.valor === 2));
}
t.ok("Combater com Duas Armas e Ataque de Oportunidade: poderes de outra classe", aqM("Combater com Duas Armas").chave === "combaterComDuasArmas" && /Especialista Diletante/.test(aqM("Ataque de Oportunidade").procedencia));
t.ok("Paramédico: provável Versatilidade", /Versatilidade/.test(aqM("NEX 10% - Paramédico").procedencia));
t.ok("“Balas Curtas (Explosiva)”: a modificação do nome é aplicada", (arma(fM, "Balas Curtas (Explosiva)").ordem.modificacoes || []).some((m) => m.nome === "Explosiva") && aviso(rM, "mod_do_nome").length === 2);
t.iguais("Revólver 3d6 19/x3; Fuzil 3d8 19/x3", [efetiva(fM, arma(fM, "Revólver")).dano, efetiva(fM, arma(fM, "Revólver")).margem, efetiva(fM, arma(fM, "Fuzil de Caça")).dano, efetiva(fM, arma(fM, "Fuzil de Caça")).multiplicador], ["3d6", 19, "3d8", 3]);
t.ok("Capturar Momento do catálogo (Arquivos Secretos 2)", fM.rituais.itens[0].origemCatalogoId === "as2.ritual.capturar-momento");
t.igual("13 itens, um por linha do CRIS", fM.inventario.itens.length, 13);

t.grupo("Conferência da ficha criada");
for (const [nome, r] of [["Jeff", rJ], ["Gina", rG], ["Meko", rM]]) {
  t.ok(nome + ": todos os valores conferidos, na ficha e depois de exportar e importar, sem divergência",
    r.conferencia.divergente === 0 && r.conferencia.arquivo === true && r.conferencia.total >= 100,
    JSON.stringify(r.conferencia) + " " + r.comparacao.filter((l) => l.situacao === "divergente").map((l) => l.campo + ": " + l.problema).join("; "));
}
t.ok("cada linha tem grupo, situação e valor final", rG.comparacao.every((l) => l.grupo && l.situacao && "final" in l && !("ler" in l)));
t.ok("grupos cobertos: identidade, atributos, recursos, defesas, perícias, itens, ataques, rituais, poderes e contagens",
  ["Identidade", "Atributos", "Recursos", "Defesas", "Perícias", "Itens", "Ataques", "Rituais", "Poderes", "Contagens"].every((g) => rG.comparacao.some((l) => l.grupo === g)));
t.ok("perícia conferida por grau e atributo, além do total", rJ.comparacao.some((l) => l.campo === "Intuição · grau e atributo" && l.final === "Destreinado · PRE"));
t.ok("ataque conferido por dano, crítico, perícia e teste", ["· dano", "· margem e multiplicador", "· perícia e atributo do dano", "· bônus no teste"].every((suf) => rJ.comparacao.some((l) => l.campo === "Ataque Faca " + suf)));
{
  const exagero = converter(sintetico({ bonusDefense: 400 }));
  const linhaDef = exagero.comparacao.find((l) => l.campo === "Defesa");
  t.ok("a conferência pega o que não fecha (bônus de Defesa acima do limite do R.A.M.A.)", linhaDef.situacao === "divergente" && aviso(exagero, "conferencia_divergente").length === 1);
  const mil = converter(sintetico({ className: "Combatente", nex: "5%", attacks: [{ id: "z", name: "Piada", damage: "1d4", criticalRange: 1, criticalMult: 999, skillUsed: "Luta", damageAttribute: "Força", aditionalDamage: [] }] }));
  t.ok("crítico ×999: fica ×10, com aviso, sem divergência", mil.conferencia.divergente === 0 && aviso(mil, "critico_fora_do_limite").length === 1 &&
    efetiva(mil.ficha, mil.ficha.inventario.itens.find((i) => /Piada/.test(i.nome))).multiplicador === 10);
}

t.grupo("Sintéticos · formatos vistos em fichas reais do CRIS (v2.34.1)");
{
  const n = converter(sintetico({ className: "Ocultista", isNexLevelOn: true, nex: "55%", nexString: "55%" }));
  t.iguais("NEX & Experiência com o progresso em porcentagem: 55% é nível 11, exposição 55%", [n.ok, n.ficha.ordem.nivel, n.ficha.ordem.nex], [true, 11, 55]);
  const n99 = converter(sintetico({ className: "Ocultista", isNexLevelOn: true, nex: "99%", nexString: "100%" }));
  t.iguais("  99% é nível 20; exposição 100% vira 99%", [n99.ok, n99.ficha.ordem.nivel, n99.ficha.ordem.nex], [true, 20, 99]);

  const carga = sintetico({ attributes: { str: 1, dex: 2, int: 3, pre: 1, con: 1 }, currentLoad: 4, maxLoad: 5, block: 0, evade: 0,
    inventory: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: "c" + i, name: "Lanterna Tática", itemType: "misc", slots: "1", category: "0", equipped: false, mods: [] })) });
  const rc = converter(carga);
  t.ok("sobrecarga só no R.A.M.A.: decisão “carga”, padrão manter o CRIS", (revisao(rc, "carga") || {}).valor === "cris");
  t.ok("  com o ajuste, a ficha não fica sobrecarregada", !calcular(rc.ficha).carga.sobrecarregado && rc.ficha.ordem.ajustes.some((a) => a.alvo === "capacidade"));
  const rr = converter(carga, { carga: "rama" });
  const cr = calcular(rr.ficha);
  t.ok("  seguindo o R.A.M.A.: sobrecarregada, e a penalidade não é desfeita por ajuste", cr.carga.sobrecarregado && cr.defesa.total === 10 + 2 - 5 && !rr.ficha.ordem.ajustes.some((a) => /^pericia:/.test(a.alvo) || a.alvo === "deslocamento"));

  const temp = converter(sintetico({ className: "Combatente", nex: "5%", currentPv: 50, maxPv: 0 }), { "maximo:pv": "rama" });
  t.ok("máximo pela regra e PV atual acima dele: fica no máximo, com observação", temp.ficha.ordem.recursos.pv === calcular(temp.ficha).pv.total);
  const temp2 = converter(sintetico({ className: "Combatente", nex: "5%" }));
  const maxPv = calcular(temp2.ficha).pv.total;
  const temp3 = converter(sintetico({ className: "Combatente", nex: "5%", currentPv: maxPv + 7, maxPv: maxPv }));
  t.iguais("PV atual acima do máximo no CRIS: o excedente vira PV temporário", [temp3.ficha.ordem.recursos.pv, temp3.ficha.ordem.temporarios.pv], [maxPv, 7]);

  const res = converter(sintetico({ className: "Ocultista", nex: "20%", powers: [{ id: "r1", name: "Resistir a Sangue", description: "" }] }));
  const aqRes = res.ficha.ordem.importacao.aquisicoes.find((a) => a.nomeOriginal === "Resistir a Sangue");
  t.ok("“Resistir a Sangue” é Resistir a Elemento com Sangue escolhido", aqRes && aqRes.chave === "resistirAElemento" && aqRes.opcoes.elemento === "sangue");

  const rit = converter(sintetico({ className: "Ocultista", nex: "20%", rituals: [{ id: "x", name: "Perturbação - Grimório", circle: "1", element: "Conhecimento" }] }));
  t.ok("ritual com sufixo (“Perturbação - Grimório”) é o do catálogo", !!rit.ficha.rituais.itens[0].origemCatalogoId);

  const comp = converter(sintetico({ inventory: [
    { id: "k1", name: "Componentes Ritualísticos de Sangue", itemType: "misc", slots: "1", category: "0", equipped: false, mods: [] },
    { id: "k2", name: "Componentes Ritualísticos de Morte, Sangue", itemType: "misc", slots: "2", category: "0", equipped: false, mods: [] },
  ] }));
  t.ok("componentes de um elemento: item do catálogo; de vários: uma linha personalizada", comp.ficha.inventario.itens.length === 2 &&
    comp.ficha.inventario.itens[0].origemCatalogoId === "op.paranormal.componentes" && !comp.ficha.inventario.itens[1].origemCatalogoId);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
