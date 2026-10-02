/* =====================================================================
   R.A.M.A. — testes das criaturas (v2.28)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-criaturas.js

   O catálogo oficial (js/ordem/criaturas-dados.js), a conferência e a
   busca (js/ordem/criaturas.js), o modelo multi-sistema
   (js/criaturas.js) e as rolagens novas do motor (js/dados.js): testes
   com expressão própria, dano composto, crítico e somas. Sem DOM e sem
   rede. O lado do servidor (combate em blocos, ocorrência, resumo do
   Homebrew, privacidade) está em testes/criaturas-backend.js.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

for (const caminho of ["js/config.js", "js/util.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/criaturas.js", "js/ficha.js", "js/validacao.js", "js/sync.js",
  "js/ordem/criaturas-dados.js", "js/ordem/criaturas.js", "js/combate-turnos.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const D = globalThis.RAMADados;
const C = globalThis.RAMACriaturas;
const OC = globalThis.RAMAOrdemCriaturas;
const DADOS = globalThis.RAMAOrdemCriaturasDados;

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

/* O sorteio vira uma fila de faces combinadas. */
function faces(lista) {
  const fila = lista.slice();
  D.usarSorteio(() => (fila.length ? fila.shift() : 1));
}

/* =====================================================================
   CATÁLOGO
   ===================================================================== */

t.grupo("Catálogo · inventário e integridade");
const conferencia = OC.conferir(DADOS);
t.igual("nenhum erro de conferência (ids, campos, expressões, variantes)", conferencia.erros.slice(0, 5), []);
t.igual("contagem por livro bate com o inventário", conferencia.porLivro, { OPRPG: 67, SAH: 32, AS1: 12, AS2: 28, "OPRPG (variantes)": 5 });
const porNatureza = {};
DADOS.criaturas.filter((c) => !c.variante).forEach((c) => { const k = c.livro + ":" + c.natureza; porNatureza[k] = (porNatureza[k] || 0) + 1; });
t.igual("paranormais, pessoas e animais de cada livro", porNatureza,
  { "OPRPG:paranormal": 49, "OPRPG:humana": 11, "OPRPG:animal": 7, "SAH:paranormal": 13, "SAH:humana": 11, "SAH:animal": 8,
    "AS1:paranormal": 1, "AS1:humana": 11, "AS2:animal": 2, "AS2:paranormal": 4, "AS2:humana": 22 });
const ids = DADOS.criaturas.map((c) => c.id);
t.ok("ids únicos", new Set(ids).size === ids.length);
t.ok("O Terminal (aventura do SAH) está no catálogo, com página", DADOS.criaturas.some((c) => c.id === "sah.criatura.o-terminal" && c.pagina === 218));
t.ok("a ficha de exemplo do Marcado NÃO é criatura", !DADOS.criaturas.some((c) => /marcado/i.test(c.nome)));
t.ok("toda entrada tem livro e página", DADOS.criaturas.every((c) => c.livro && c.pagina > 0));

t.grupo("Catálogo · a conferência pega erro");
const ruim = { criaturas: [
  { id: "op.criatura.x", livro: "OPRPG", pagina: 1, nome: "X", natureza: "paranormal", elementos: ["sangue"], vd: 20, descricao: "d", pv: 10,
    percepcao: "1d20", iniciativa: "2d2O+5", fortitude: "1d20", reflexos: "1d20", vontade: "1d20", atributos: [1, 1, 1, 1, 1],
    acoes: [{ tipo: "padrao", nome: "Agredir", texto: "", ataques: [{ nome: "Garra", alcance: "corpo a corpo", quantidade: 1, teste: "", dano: ["2x6"] }] }] },
  { id: "op.criatura.x", livro: "OPRPG", pagina: 1, nome: "Y", natureza: "paranormal", elementos: [], vd: 20, descricao: "d", pv: 0,
    percepcao: "1d20", iniciativa: "1d20", fortitude: "1d20", reflexos: "1d20", vontade: "1d20", atributos: [1, 1, 1] },
] };
const erros = OC.conferir(ruim).erros.join(" | ");
t.ok("id repetido", /id repetido/.test(erros));
t.ok("expressão inválida", /iniciativa/.test(erros));
t.ok("ataque sem teste e com dano inválido", /teste inválido/.test(erros) && /dano inválido/.test(erros));
t.ok("campos obrigatórios (PV, atributos, elemento)", /sem PV/.test(erros) && /atributos incompletos/.test(erros) && /sem elemento/.test(erros));

/* =====================================================================
   MOTOR DE DADOS
   ===================================================================== */

t.grupo("Motor · teste com expressão própria");
faces([7, 15, 3]);
let r = D.teste("3d20+10");
t.igual("3d20+10: fica o maior, soma 10", [r.natural, r.total, r.expressao], [15, 25, "3d20+10"]);
faces([18, 4]);
r = D.teste("-2d20+5");
t.igual("-2d20+5: fica o MENOR de dois d20 (atributo 0)", [r.natural, r.total, r.selecao], [4, 9, "menor"]);
faces([12, 3]);
r = D.teste("1d20+2+1d4");
t.igual("dado extra entra fora do principal", [r.natural, r.total], [12, 17]);
t.ok("número sozinho não é teste", !D.testeValido("12") && !D.teste("12").ok);
t.ok("formato estranho é recusado", !D.termos("2d2O+5").ok && !D.termos("3d20++1").ok && !D.termos("").ok);

t.grupo("Motor · dano composto, por tipo, e crítico");
faces([3, 5, 6, 7, 2, 11]);
r = D.danoComposto({ partes: ["2d8+8 impacto", "2d12 Morte"] });
t.igual("as partes somam e o total por tipo é guardado", [r.total, r.porTipo], [3 + 5 + 8 + 6 + 7, [{ tipo: "impacto", total: 16 }, { tipo: "Morte", total: 13 }]]);
faces([1, 1, 1, 1, 1, 1, 9, 9]);
r = D.danoComposto({ partes: ["2d8+8 impacto", "2d12 Morte"], critico: true, multiplicador: 3 });
t.igual("crítico x3 multiplica só os dados da primeira parte (6d8), não o fixo nem a segunda", [r.expressao, r.total], ["6d8+8 impacto + 2d12 Morte", 6 + 8 + 18]);
faces([4, 4]);
r = D.danoComposto({ partes: ["1d4-10 fogo"] });
t.igual("dano nunca fica negativo", r.total, 0);
faces([2, 6]);
r = D.total("1d4+1d6+1");
t.igual("soma simples (duração, cura)", [r.total, r.tipo], [9, "soma"]);
t.ok("parte sem expressão é inválida", !D.danoValido(["Morte"]) && D.danoValido(["4d10+40 Morte"]));
D.restaurarSorteio();

/* =====================================================================
   MODELO
   ===================================================================== */

t.grupo("Modelo · criatura antiga continua igual");
const antiga = { tipo: "criatura", nome: "Corvo", visibilidade: "publico", categoria: "Animal", descricao: "Companheiro",
  status: [{ id: "vida", nome: "Vida", atual: 8, maximo: 12 }],
  atributos: [{ id: "agi", nome: "Agilidade", sigla: "AGI", valor: 3, dado: "2d20" }],
  pericias: [{ id: "voo", nome: "Voo", atributoId: "agi", bonus: 5, bonusTemporario: 1, dadosExtras: [] }],
  ataques: [{ id: "bico", nome: "Bico", periciaId: "voo", dado: "", dano: "1d6", danoExtra: "2", critico: 19, multiplicador: 2, descricao: "" }],
  habilidades: [] };
const antigaNorm = C.normalizar(antiga);
t.ok("sem sistema, sem versão e sem bloco de Ordem (não converte)", !("sistema" in antigaNorm) && !("ordem" in antigaNorm) && !("versao" in antigaNorm));
t.igual("é universal", C.sistemaDe(antigaNorm), "universal");
t.igual("normalizar duas vezes dá o mesmo", JSON.stringify(C.normalizar(antigaNorm)), JSON.stringify(antigaNorm));
t.igual("perícia e ataque pelo atributo, como sempre", C.pedidoDeAtaque(antigaNorm, antigaNorm.ataques[0]).expressao, "2d20");

await OC.carregar();
const nidere = OC.criatura("op.criatura.nidere");
t.grupo("Modelo · ficha de Ordem do catálogo");
t.igual("sistema e origem são eixos separados", [nidere.sistema, nidere.origem.tipo, nidere.origem.livro, nidere.origem.pagina], ["ordem", "catalogo", "OPRPG", 224]);
t.igual("vida no status 'vida' (o combate e a privacidade continuam valendo)", C.resumo(nidere).pv, 800);
t.igual("perícia com a PRÓPRIA expressão (nada recalculado)", nidere.pericias.map((p) => p.expressao), ["5d20+23", "4d20+20"]);
t.igual("ataque x2 guarda a quantidade, teste e dano", (() => { const a = nidere.acoes[0].ataques[0]; return [a.nome, a.quantidade, a.teste, a.dano]; })(),
  ["Garra Invertida", 2, "5d20+35", ["4d10+40 Morte"]]);
const rt = JSON.parse(JSON.stringify(nidere));
t.igual("ida e volta por JSON + normalizar preserva tudo", JSON.stringify(C.normalizar(rt)), JSON.stringify(C.normalizar(nidere)));
t.igual("normalizar é estável", JSON.stringify(C.normalizar(C.normalizar(nidere))), JSON.stringify(C.normalizar(nidere)));

const uivar = OC.criatura("sah.criatura.o-uivar");
t.igual("“—” é não se aplica, e não rola", [uivar.atributos[1].naoAplica, uivar.atributos[1].dado, C.classificar(C.NAO_SE_APLICA).tipo], [true, "", "na"]);
const terminal = OC.criatura("sah.criatura.o-terminal");
t.igual("“veja texto” é mostrado, nunca rolado", [terminal.ordem.reflexos, C.classificar(terminal.ordem.reflexos).tipo], ["veja texto", "texto"]);
t.igual("dano composto do Terminal", terminal.acoes[0].ataques[0].dano, ["3d6 impacto", "3d6 Morte"]);
const amanda = OC.criatura("sah.criatura.amanda-sousa");
t.igual("NPC sem VD: null, com nível", [amanda.ordem.vd, amanda.ordem.nivel, amanda.ordem.tamanho], [null, "Nível 3 · NEX 10%", null]);
t.igual("classificar: zero é zero, null é não informado", [C.classificar(0).tipo, C.classificar(null).tipo], ["numero", "nd"]);
t.igual("crítico: 19/x3, x3, 19 e padrão", ["19/x3", "x3", "19", ""].map((x) => C.textoDoCritico(C.normalizarCritico(x))), ["19/x3", "20/x3", "19/x2", "20/x2"]);
const espectro = OC.criatura("sah.criatura.espectro-inesquecido");
t.igual("PE vira status 'pe'", espectro.status.map((s) => s.id), ["vida", "pe"]);
t.ok("anfitrião: facetas são variantes com a base", ["amphitruo", "aeneas", "liber", "silenus", "plautus"].every((f) => {
  const v = OC.criatura("op.criatura.o-anfitriao." + f);
  return v && v.ordem.variante.de === "op.criatura.o-anfitriao" && U(v).pv === 250;
}));
function U(c) { return C.resumo(c); }

t.grupo("Modelo · validação");
const quebrada = C.normalizar(Object.assign(JSON.parse(JSON.stringify(nidere)), { pericias: [{ id: "x", nome: "Luta", expressao: "abc" }] }));
t.ok("perícia sem expressão válida", C.validar(quebrada).some((e) => /Luta/.test(e)));
const semVida = Object.assign(JSON.parse(JSON.stringify(nidere)), { status: [] });
t.ok("sem PV", C.validar(semVida).some((e) => /pontos de vida/.test(e)));
const requerFantasma = JSON.parse(JSON.stringify(nidere));
requerFantasma.habilidades[0].requer = { estado: "nao-existe", minimo: 1 };
t.ok("requisito de estado inexistente", C.validar(requerFantasma).some((e) => /estado inexistente/.test(e)));
t.igual("a ficha do catálogo passa limpa", C.validar(nidere), []);

/* =====================================================================
   OCORRÊNCIAS
   ===================================================================== */

t.grupo("Ocorrências · combate e aliado");
const um = C.paraCombate(OC.criatura("op.criatura.dama-de-sangue"), 1);
const dois = C.paraCombate(OC.criatura("op.criatura.dama-de-sangue"), 2);
t.ok("ids próprios, mesma origem", um.id !== dois.id && um.origemId === "op.criatura.dama-de-sangue" && um.origemId === dois.origemId);
t.igual("nomes numerados", [um.nome, dois.nome], ["Dama de Sangue #1", "Dama de Sangue #2"]);
t.ok("snapshot sem id e privado", !um.snapshot.id && um.snapshot.visibilidade === "privado");
t.ok("estado próprio desde o início", !!um.snapshot.instancia && um.snapshot.instancia.enigma === false);
C.definirNaInstancia(um.snapshot, "estado:corpos", 3);
C.definirNaInstancia(um.snapshot, "marcador:a5", true);
t.igual("mexer numa ocorrência não muda a outra", [C.valorDoEstado(um.snapshot, "corpos"), C.valorDoEstado(dois.snapshot, "corpos")], [3, 0]);
t.ok("nem o catálogo", !("instancia" in OC.criatura("op.criatura.dama-de-sangue")));
t.igual("estado acima do máximo é recusado", C.definirNaInstancia(um.snapshot, "estado:corpos", 9), false);
t.igual("estado que a ficha não tem é recusado", C.definirNaInstancia(um.snapshot, "estado:fantasma", 1), false);
t.igual("marcador só aceita booleano", C.definirNaInstancia(um.snapshot, "marcador:a5", "sim"), false);
t.igual("chave fora do formato é recusada", C.definirNaInstancia(um.snapshot, "estado:<script>", 1), false);
t.igual("uso fica entre 0 e 999", [C.definirNaInstancia(um.snapshot, "uso:a1", 2), C.definirNaInstancia(um.snapshot, "uso:a1", 1000)], [true, false]);
t.igual("zero sai do objeto (a ocorrência não engorda)", (C.definirNaInstancia(um.snapshot, "uso:a1", 0), um.snapshot.instancia.usos), {});
const aliado = C.criarAliado(OC.criatura("sah.criatura.lobo"), "");
t.ok("aliado do catálogo é ocorrência de Ordem com estado próprio", aliado.criatura.sistema === "ordem" && !!aliado.criatura.instancia && aliado.origemId === "sah.criatura.lobo");
t.igual("aliados normalizados preservam a ficha de Ordem", JSON.stringify(C.normalizarAliados([aliado])[0].criatura), JSON.stringify(aliado.criatura));

t.grupo("Ocorrências · Enigma e fases mudam a VISTA, não a ficha");
const n = C.paraCombate(OC.criatura("op.criatura.nidere"), 1).snapshot;
C.definirNaInstancia(n, "enigma", true);
const vista = C.vistaEfetiva(n);
t.igual("defesa e resistências do Enigma resolvido", [vista.ordem.defesa, vista.ordem.fortitude], [40, "3d20+25"]);
t.ok("habilidades desativadas pelo Enigma ficam marcadas, não somem",
  vista.habilidades.filter((h) => h.desativada).map((h) => h.nome).join() === "Regeneração Acelerada,Senso de Direção Perfeito");
t.igual("o valor de referência continua na ficha", n.ordem.defesa, 50);
const amigo = C.paraCombate(OC.criatura("sah.criatura.amigo-imaginario"), 1).snapshot;
C.definirNaInstancia(amigo, "estado:frenesi", 1);
const va = C.vistaEfetiva(amigo);
t.igual("fase com alteração (Frenesi): Fortitude, Vigor e escalada", [va.ordem.fortitude, va.atributos[4].valor, va.ordem.deslocamento.length], ["5d20+30", 5, 2]);
const dama = C.paraCombate(OC.criatura("op.criatura.dama-de-sangue"), 1).snapshot;
t.ok("habilidade que exige fase fica inativa até a fase", C.vistaEfetiva(dama).acoes.some((a) => a.inativa));
C.definirNaInstancia(dama, "estado:corpos", 7);
t.ok("  e ativa quando a fase chega", !C.vistaEfetiva(dama).acoes.some((a) => a.inativa));

t.grupo("Ocorrências · operação do combate aplicada localmente");
const combate = { participantes: [um], turno: { rodada: 0, ativoId: null }, estado: "preparando", rev: 1 };
const depois = globalThis.RAMACombateTurnos.aplicar(combate, [
  { tipo: "criatura_instancia", participanteId: um.id, chave: "enigma", valor: true },
  { tipo: "criatura_instancia", participanteId: um.id, chave: "estado:corpos", valor: 99 },
]);
t.ok("criatura_instancia muda a ocorrência na vista local", depois.participantes[0].snapshot.instancia.enigma === true);
t.igual("  com a mesma regra (estado acima do máximo não entra)", depois.participantes[0].snapshot.instancia.estados.corpos, 3);
t.ok("  e não mexe no combate confirmado", um.snapshot.instancia.enigma === false);

/* =====================================================================
   BIBLIOTECA
   ===================================================================== */

t.grupo("Biblioteca · busca e filtros combináveis");
const cat = OC.catalogoPronto();
const nomes = (f) => OC.filtrar(cat.indice, f).map((x) => x.nome);
t.ok("busca sem acento acha com acento", nomes({ busca: "anfitriao" }).indexOf("O Anfitrião") >= 0);
t.igual("natureza animal do SAH", nomes({ livro: "SAH", natureza: "animal" }).length, 8);
const sangueMedo = OC.filtrar(cat.indice, { elementos: ["sangue", "medo"], modoElementos: "todos" });
t.ok("“todos os marcados”: só quem tem Sangue E Medo", sangueMedo.length > 0 && sangueMedo.every((x) => x.elementos.includes("sangue") && x.elementos.includes("medo")));
const sangueOuMedo = OC.filtrar(cat.indice, { elementos: ["sangue", "medo"] });
t.ok("“qualquer um”: Sangue OU Medo, e uma criatura de vários elementos aparece", sangueOuMedo.length > sangueMedo.length && sangueOuMedo.some((x) => x.nome === "Degolificada"));
const faixa = OC.filtrar(cat.indice, { vdMin: 100, vdMax: 160 });
t.ok("faixa de VD", faixa.length > 0 && faixa.every((x) => x.vd >= 100 && x.vd <= 160));
t.ok("  e a faixa tira quem não tem VD (NPC com nível)", !faixa.some((x) => x.vd === null));
t.igual("filtros combinados", nomes({ livro: "OPRPG", natureza: "paranormal", elementos: ["energia"], vdMin: 380, busca: "anomalia" }), ["Anomalia"]);

t.grupo("Biblioteca · modelo oficial imutável");
const copia = OC.copiaParaHomebrew("op.criatura.zumbi-de-sangue");
t.igual("a cópia vira Homebrew com rastro", [copia.origem.tipo, copia.origem.copiadoDe, copia.visibilidade, "id" in copia], ["homebrew", "op.criatura.zumbi-de-sangue", "privado", false]);
copia.nome = "Zumbi mexido";
t.igual("mexer na cópia não mexe no catálogo", OC.criatura("op.criatura.zumbi-de-sangue").nome, "Zumbi de Sangue");
let congelado = false;
try { cat.porId["op.criatura.zumbi-de-sangue"].nome = "x"; } catch (e) { congelado = true; }
t.ok("o catálogo carregado é congelado", congelado || cat.porId["op.criatura.zumbi-de-sangue"].nome === "Zumbi de Sangue");
t.igual("imagens do catálogo pelo id (retrato 1:1 e corpo inteiro)", C.imagensDoCatalogo("op.criatura.o-anfitriao.liber"),
  { retrato: globalThis.RAMAUtil.url("assets/criaturas/op/o-anfitriao.liber/retrato.png"), corpo: globalThis.RAMAUtil.url("assets/criaturas/op/o-anfitriao.liber/corpo.png") });
t.ok("  a cópia no Homebrew usa a do original; criatura sem catálogo não tem", !!C.imagensDoCatalogo(copia) && C.imagensDoCatalogo(antigaNorm) === null);
const faltando = [];
for (const c of DADOS.criaturas) {
  const m = /^(op|sah|as1|as2)\.criatura\.(.+)$/.exec(c.id);
  for (const arq of ["retrato.png", "corpo.png"]) {
    /* A pasta pode estar num disco sincronizado (Google Drive), que às
       vezes demora a responder: uma segunda tentativa antes de acusar. */
    const url = new URL(`../assets/criaturas/${m[1]}/${m[2]}/${arq}`, import.meta.url);
    let achou = false;
    for (let tentativa = 0; tentativa < 3 && !achou; tentativa++) {
      try { await Deno.stat(url); achou = true; } catch (e) { await new Promise((r) => setTimeout(r, 100)); }
    }
    if (!achou) faltando.push(c.id + "/" + arq);
  }
}
t.igual("toda criatura tem as duas imagens (provisórias) no site", faltando, []);

t.grupo("Arquivo · exportar e importar não perdem a ficha de Ordem");
const V = globalThis.RAMAValidacao;
const F = globalThis.RAMAFicha;
const dama2 = OC.copiaParaHomebrew("op.criatura.dama-de-sangue");
const pacote = V.exportar("homebrew-criatura", dama2);
t.ok("o arquivo não leva nenhum id", !/"id":/.test(JSON.stringify(pacote)));
const volta = V.importado(JSON.parse(JSON.stringify(pacote)));
t.ok("a criatura importada é de Ordem, privada e sem id", volta.ok && volta.dados.sistema === "ordem" && volta.dados.visibilidade === "privado" && !volta.dados.id);
t.igual("fases, ações e requisitos voltam com os mesmos ids",
  [volta.dados.ordem.estados.map((e) => e.id), volta.dados.acoes.map((a) => a.id).slice(0, 3), volta.dados.acoes.filter((a) => a.requer).length],
  [["corpos"], ["a0", "a1", "a2"], dama2.acoes.filter((a) => a.requer).length]);
t.igual("  e o resto da ficha também", JSON.stringify(Object.assign({}, volta.dados, { origem: null })), JSON.stringify(Object.assign(C.normalizar(dama2), { origem: null })));
const comAliado = F.normalizarFicha({ schemaVersion: 14, nome: "Agente", aliados: [] });
const lobo = C.criarAliado(OC.criatura("sah.criatura.lobo"), "");
const damaAliada = C.criarAliado(OC.criatura("op.criatura.dama-de-sangue"), "");
C.definirNaInstancia(damaAliada.criatura, "estado:corpos", 4);
C.definirNaInstancia(damaAliada.criatura, "marcador:a3", true);
C.definirNaInstancia(damaAliada.criatura, "uso:a1", 1);
comAliado.aliados = [lobo, damaAliada];
const fichaVolta = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", comAliado))));
t.ok("a ficha com aliados de Ordem importa", fichaVolta.ok && fichaVolta.dados.aliados.length === 2);
const damaVolta = fichaVolta.ok ? fichaVolta.dados.aliados[1].criatura : null;
t.igual("  o estado da ocorrência do aliado atravessa (fase, marcador, uso)", damaVolta && damaVolta.instancia,
  { estados: { corpos: 4 }, usos: { a1: 1 }, marcadores: { a3: true }, enigma: false, nota: "" });
t.igual("  e o bloco de Ordem do aliado é o mesmo", damaVolta && JSON.stringify(damaVolta.ordem), JSON.stringify(damaAliada.criatura.ordem));
t.grupo("Arquivos Secretos 1 · ameaças, aliada e gerador");
const as1 = DADOS.criaturas.filter((c) => c.livro === "AS1");
t.igual("doze fichas, com página", as1.filter((c) => c.pagina > 0).length, 12);
t.ok("o Anulado é a criatura de Sangue (VD 100, p. 53)", as1.some((c) => c.id === "as1.criatura.anulado" && c.vd === 100 && c.pagina === 53 && c.natureza === "paranormal"));
const agatha = OC.criatura("as1.criatura.agatha-volkomenn");
const agathaDados = DADOS.criaturas.filter((c) => c.id === "as1.criatura.agatha-volkomenn")[0];
t.ok("Agatha Volkomenn é aliada (regras de aliado, OPRPG p. 170), sem estatística de combate", !!agatha && agathaDados.aliada === true && agathaDados.vd === null);
t.ok("  e vira aliado numa ficha como qualquer criatura", !!C.criarAliado(agatha, "").criatura);
t.ok("as ameaças do AS1 viram aliado ou combatente com id próprio", !!C.criarAliado(OC.criatura("as1.criatura.apostolo-do-sangue"), "").criatura.ordem);
const G = OC.GERADOR_DE_TRANSTORNADOS;
t.igual("gerador: cinco perfis com seis traços e vinte aparências (p. 23)", [G.perfis.length, G.perfis.every((p) => p.tracos.length === 6), G.aparencia.length], [5, true, 20]);
const maximos = OC.gerarTranstornado((faces) => faces);
t.igual("  com os dados no máximo: Convertido, o 6º traço duas vezes e a 20ª aparência",
  [maximos.perfil, maximos.tracos[0], maximos.aparencia[0], maximos.dados.perfil], ["Convertido", "Atraído por lugares tocados pelo Sangue", "Uma terceira perna", 10]);
t.igual("  com 1 no d10, Desesperado", OC.gerarTranstornado(() => 1).perfil, "Desesperado");

t.grupo("Arquivos Secretos 2 · ameaças, formas e aliados");
const as2 = DADOS.criaturas.filter((c) => c.livro === "AS2");
t.igual("17 fichas de ameaça e 11 perfis como aliado", [as2.filter((c) => !c.aliada).length, as2.filter((c) => c.aliada).length], [17, 11]);
t.igual("seis formas transformadas, cada uma na ficha de partida",
  as2.filter((c) => c.formas).map((c) => c.formas[0].nome).sort(), ["Colosso", "Fantasma", "Intenção assassina", "Juan Diabólico", "Mutilador Noturno", "X"]);
t.ok("as formas são da MESMA entrada: nenhuma vira criatura própria no catálogo", !as2.some((c) => /mutilador|colosso|fantasma|diabolico/.test(c.id)));
const busca = OC.filtrar(cat.indice, { busca: "mutilador" });
t.ok("buscar o nome da forma acha a ficha de partida", busca.some((x) => x.id === "as2.criatura.jonas-aguiar"));
const jonas = C.iniciarInstancia(OC.criatura("as2.criatura.jonas-aguiar"));
t.igual("ficha de partida: 120 PV, pvBase guardado", [jonas.status[0].maximo, jonas.ordem.pvBase], [120, 120]);
jonas.status[0].atual = 90;
C.definirNaInstancia(jonas, "estado:ferimentos", 2);
C.definirNaInstancia(jonas, "uso:a2", 1);
t.ok("trocar para o Mutilador Noturno vale", C.definirNaInstancia(jonas, "forma", "mutilador-noturno"));
t.igual("  máximo vira o da forma (260) e os PV atuais NÃO são restaurados", [jonas.status[0].atual, jonas.status[0].maximo], [90, 260]);
t.igual("  estados e usos da ocorrência continuam", [jonas.instancia.estados.ferimentos, jonas.instancia.usos.a2], [2, 1]);
const vj = C.vistaEfetiva(jonas);
t.ok("a vista mostra a ficha publicada da forma (Defesa 29, VD 140, Predador Perfeito)",
  vj.formaAtiva.nome === "Mutilador Noturno" && vj.ordem.defesa === 29 && vj.ordem.vd === 140 && vj.habilidades.some((h) => h.nome === "Predador Perfeito"));
t.ok("  as ações da forma têm ids próprios (o uso de uma não cai na outra)", vj.acoes.every((a) => a.id.indexOf("mutilador-noturno.") === 0));
t.ok("  o Filho da Dor da forma usa o mesmo contador de ferimentos", vj.acoes.some((a) => /Filho da Dor/.test(a.nome) && a.requer && a.requer.estado === "ferimentos"));
t.ok("  machucado pelo valor da forma (130)", C.estaMachucada(jonas));
t.ok("forma inexistente é recusada", !C.definirNaInstancia(jonas, "forma", "colosso"));
t.ok("criatura sem formas recusa a chave", !C.definirNaInstancia(C.iniciarInstancia(OC.criatura("op.criatura.zumbi-de-sangue")), "forma", ""));
C.definirNaInstancia(jonas, "forma", "");
t.igual("voltar à ficha de partida prende os atuais no máximo dela (120), sem restaurar", [jonas.status[0].atual, jonas.status[0].maximo], [90, 120]);
jonas.status[0].atual = 120;
C.definirNaInstancia(jonas, "forma", "mutilador-noturno");
C.definirNaInstancia(jonas, "forma", "");
t.igual("  ida e volta não ganha PV", jonas.status[0].atual, 120);
C.definirNaInstancia(jonas, "forma", "mutilador-noturno");
const jn = C.normalizar(JSON.parse(JSON.stringify(jonas)));
t.ok("a forma ativa atravessa a normalização (gravação, combate, aliado)", jn.instancia.forma === "mutilador-noturno" && jn.ordem.formas.length === 1);
const comb = C.paraCombate(jonas, 1);
t.ok("  uma ocorrência NOVA começa na ficha de partida, com os PV dela", !comb.snapshot.instancia.forma && comb.snapshot.status[0].maximo === 120);
const turnos = globalThis.RAMACombateTurnos;
const combateJ = { estado: "ativo", participantes: [Object.assign({}, comb, { id: "p1" })], turno: { rodada: 1, ativoId: "p1" } };
const depoisJ = turnos.aplicar(combateJ, [{ tipo: "criatura_instancia", participanteId: "p1", chave: "forma", valor: "colosso" },
  { tipo: "criatura_instancia", participanteId: "p1", chave: "forma", valor: "mutilador-noturno" }]);
t.igual("a operação de combate troca a forma pela mesma regra (forma alheia ignorada)",
  [depoisJ.participantes[0].snapshot.instancia.forma, depoisJ.participantes[0].snapshot.status[0].maximo], ["mutilador-noturno", 260]);
t.ok("Machado do Mutilador: o dano de Sangue multiplica no crítico", vj.acoes[0].ataques[0].multiplicaTudo === true);
faces([8, 8, 8, 8, 8, 8]);
const crit = D.danoComposto({ partes: vj.acoes[0].ataques[0].dano, critico: true, multiplicador: 3, multiplicaTodas: true });
t.igual("  crítico x3: 3d8+20 corte e 6d8 Sangue", crit.expressao.replace(/\s+/g, " "), "3d8+20 corte + 6d8 Sangue");
D.usarSorteio(null);
const kemiA = OC.criatura("as2.criatura.kemi-aliado");
t.ok("perfil como aliado: sem PV nem PE inventados", kemiA.status.length === 0 && kemiA.ordem.aliada === true);
t.ok("  aponta a ficha de ameaça da mesma pessoa", kemiA.ordem.ficha.id === "as2.criatura.kemi" && kemiA.ordem.ficha.pagina === 57);
t.ok("  passa na validação do catálogo e vira aliado", C.validar(kemiA).length === 0 && !!C.criarAliado(kemiA, "").criatura);
t.ok("Agatha (AS1) passa a usar o mesmo perfil de aliado", OC.criatura("as1.criatura.agatha-volkomenn").status.length === 0);
const felino = as2.filter((c) => c.id === "as2.criatura.felino-infernal")[0];
t.ok("os erros de impressão ficam em nota, com os valores publicados", felino.pv === 230 && felino.machucado === 125 && felino.notas.some((n) => /Arara-infernal/.test(n)));
const labirinto = as2.filter((c) => c.id === "as2.criatura.labirinto")[0];
t.ok("rituais de círculo “???” não ganham círculo deduzido", labirinto.formas[0].acoes.filter((a) => /Ritual/.test(a.nome)).every((a) => /círculo \?\?\?/.test(a.nome)));
const aliadoP = { id: "x", criatura: C.normalizar(kemiA), perigo: { cena: "c1", feridas: 1, morto: false, pendente: true, registros: [{ id: "r1", d6: 3, ferido: true, cena: "c1" }] } };
const aliadosN = C.normalizarAliados([aliadoP]);
t.ok("o registro de Aliados em Perigo atravessa a normalização do aliado", aliadosN[0].perigo.pendente === true && aliadosN[0].perigo.registros.length === 1);

t.grupo("Desempenho · catálogo leve");
t.ok("cada ficha cabe com folga numa célula de Homebrew (45 000)", Object.values(cat.porId).every((c) => JSON.stringify(c).length < 20000));
t.ok("o resumo de lista é pequeno", JSON.stringify(C.resumo(OC.criatura("op.criatura.o-anfitriao"))).length < 300);

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
  Deno.exit(1);
}
