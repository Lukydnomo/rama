/* =====================================================================
   R.A.M.A. — testes do Homebrew por sistema e do Modelo Universal (v9.7)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-homebrew-sistemas.js

   Os adaptadores (js/homebrew-adaptadores.js) contra os MOTORES de
   verdade: um item de cada sistema, com um subtipo que muda campos, vai
   para a biblioteca, volta para a ficha e passa pelo normalizador do
   próprio motor sem perder os números (e o motor usa: a arma de T20 dá
   ataque, a proteção de Goblins conta, a arma de Ordem II tem dano).
   Trocar o subtipo não deixa campo escondido no registro. Os registros de
   antes (arma, armadura, mochila, ritual) continuam lidos, agrupados. O
   Modelo Universal: campos com chave estável, fórmulas validadas (nada
   de código) e o Kit de Cura (2 cargas, 1d6, recupera um recurso; a
   carga gasta continua gasta depois de salvar e reabrir a ficha).
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url));
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/inventario.js", "js/ficha.js",
  "js/tormenta20/dados.js", "js/tormenta20/equipamento.js", "js/tormenta20/regras.js",
  "js/goblins/catalogo.js", "js/goblins/regras.js",
  "js/vampiro/catalogo.js", "js/vampiro/dados.js", "js/vampiro/disciplinas-dados.js", "js/vampiro/poderes.js", "js/vampiro/regras.js",
  "js/oblivio/catalogo.js", "js/oblivio/regras.js",
  "js/ordem2/catalogo.js", "js/ordem2/regras.js",
  "js/brutal/catalogo.js", "js/brutal/regras.js",
  "js/validacao.js", "js/criaturas.js", "js/homebrew-adaptadores.js", "js/pacotes-homebrew.js"];
for (const c of ARQ) {
  try { (0, eval)(await ler(c)); } catch (e) { console.error("Falhou ao carregar " + c + ": " + e.message); Deno.exit(1); }
}
const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(n, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${n}`); } else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${n}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const A = globalThis.RAMAHomebrewAdaptadores, G = globalThis;
const guardar = (s, g, st, valores, extra) => {
  const r = A.guardar(s, g, st, Object.assign({ nome: "Teste " + st, descricao: "Sintético.", valores }, extra || {}));
  if (!r.ok) throw new Error(s + "/" + st + ": " + r.erro + " " + JSON.stringify(r.campos || {}));
  return JSON.parse(JSON.stringify(r.registro)); /* como o servidor devolve */
};

t.grupo("Cada sistema: item nativo → ficha → motor");
t.iguais("todos os sistemas do registro têm adaptador", G.RAMASistemas.lista().map((s) => s.id).filter((id) => !A.adaptador(id)), []);

const espada = guardar("tormenta20", "item", "arma", { proficiencia: "marcial", proposito: "corpo", empunhadura: "umaMao", dano: "1d10", margem: 19, mult: 3, tipo: "C", preco: 40, espacos: 1 });
const t20item = G.RAMATormenta20.normalizarItem(A.paraFicha(espada));
const base = G.RAMATormenta20.itemBase(t20item);
t.ok("T20 · arma: o motor lê a definição (dano, margem, multiplicador, proficiência)", base && base.dano === "1d10" && base.margem === 19 && base.mult === 3 && base.proficiencia === "marcial" && base.categoria === "arma");
const escudo = guardar("tormenta20", "item", "escudo", { defesa: 2, penalidade: -2, preco: 15, espacos: 2 });
t.ok("T20 · escudo (subtipo que muda campos): Defesa e penalidade, categoria escudo", G.RAMATormenta20.itemBase(G.RAMATormenta20.normalizarItem(A.paraFicha(escudo))).tipoArmadura === "escudo");
const kit = guardar("tormenta20", "item", "ferramenta", { preco: 50, espacos: 1, bonusPericia: "ladinagem", bonusValor: 2, bonusCondicao: "abrir fechaduras" });
const kb = G.RAMATormenta20.itemBase(G.RAMATormenta20.normalizarItem(A.paraFicha(kit)));
t.ok("T20 · ferramenta com bônus de perícia no formato de efeitos do motor", kb.efeitos[0].alvo === "pericia.ladinagem" && kb.efeitos[0].valor === 2 && kb.espacos === 1);
const fichaT20 = G.RAMATormenta20.normalizar({}); fichaT20.inventario.itens.push(Object.assign(t20item, { estado: "empunhado" }));
const calc = G.RAMATormenta20.calcular(fichaT20);
const temAtaque = JSON.stringify(calc).includes("Teste arma");
t.ok("T20 · empunhada, a arma Homebrew aparece nos ataques calculados", temAtaque);

const gArma = guardar("goblins", "item", "arma", { maos: 2, ataque: "distancia", bonus: 3, municao: 6, recarga: true });
const gNovo = A.paraFicha(gArma);
const gFicha = G.RAMAGoblins.normalizar({});
G.RAMAGoblins.adicionarItem(gFicha, "", gNovo);
const gItem = gFicha.itens[gFicha.itens.length - 1];
const gDef = G.RAMAGoblins.defDoItem(gItem);
t.ok("Goblins · arma pelo adicionarItem do motor: mãos, ataque, bônus, munição e recarga", gDef.arma && gDef.arma.maos === 2 && gDef.arma.ataque === "distancia" && gDef.arma.bonus === 3 && gDef.arma.recarga === true);
const gProt = guardar("goblins", "item", "protecao", { uso: "cabeca", durabilidade: 2 });
G.RAMAGoblins.adicionarItem(gFicha, "", A.paraFicha(gProt));
t.ok("Goblins · proteção: uso e durabilidade no defDoItem", G.RAMAGoblins.defDoItem(gFicha.itens[gFicha.itens.length - 1]).protecao.durabilidade === 2);

const vArmaChave = Object.keys(G.RAMAVampiroCatalogo.ARMAS)[2];
const vArma = guardar("vampiro", "item", "arma", { arma: vArmaChave, dano: 3 });
const vFicha = G.RAMAVampiro.normalizar({ equipamento: [A.paraFicha(vArma)] });
t.ok("Vampiro · arma sobre uma base do V5, com dano próprio, sobrevive ao normalizar", vFicha.equipamento[0].arma === vArmaChave && vFicha.equipamento[0].dano === 3 && vFicha.equipamento[0].personalizado === true);
t.ok("Vampiro · arma sem base é recusada no editor (campo obrigatório)", !A.guardar("vampiro", "item", "arma", { nome: "X", valores: {} }).ok);

const oChave = Object.keys(G.RAMAOblivioCatalogo.equipamento)[0];
const oEq = guardar("oblivio", "item", "equipamento", { chave: oChave });
const oItem = G.RAMAOblivio.normalizarItem(A.paraFicha(oEq));
t.ok("Oblívio · equipamento sobre uma base do catálogo: a chave dá as regras, o nome é o seu", oItem.chave === oChave && oItem.nome === "Teste equipamento");
const oNarr = G.RAMAOblivio.normalizarItem(A.paraFicha(guardar("oblivio", "item", "outro", {})));
t.ok("Oblívio · objeto narrativo: sem chave, sem número inventado", oNarr.chave === "" && oNarr.usos === null);

const o2Arma = guardar("ordem2", "item", "arma", { alcance: "distancia", dano: 4, categoria: "Fogo" });
const o2 = G.RAMAOrdem2.normalizarItem(A.paraFicha(o2Arma));
t.ok("Ordem II · arma: tipo, alcance e dano no normalizador da edição", o2.tipo === "arma" && o2.alcance === "distancia" && o2.dano === 4);
const o2Per = G.RAMAOrdem2Catalogo.PERICIAS[0][0];
const o2Eq = G.RAMAOrdem2.normalizarItem(A.paraFicha(guardar("ordem2", "item", "equipamento", { pericia: o2Per, passos: 2 })));
t.ok("Ordem II · equipamento com passos numa perícia", o2Eq.passos[G.RAMAOrdem2Catalogo.chaveDePericia(o2Per)] === 2);

const bApego = guardar("brutal", "item", "apego", {});
t.iguais("BRUTAL · o item é o Apego (nome e texto, sem Defesa nem PV)", Object.keys(A.paraFicha(bApego)).sort(), ["nome", "texto"]);

const oArma = guardar("ordem", "item", "arma", { proficiencia: "tatica", tipoArma: "fogo", dano: "2d6", critico: 19, multiplicador: 3, categoria: 1, espacos: 1, alcance: "medio" });
const fichaOrdem = G.RAMAFicha.normalizarItem(oArma);
t.ok("Ordem · arma no formato do RAMAFicha: dano, crítico e o bloco de Ordem (categoria, proficiência, alcance)", oArma.tipo === "arma" && fichaOrdem.dano === "2d6" && fichaOrdem.ordem.categoria === 1 && fichaOrdem.ordem.arma.proficiencia === "tatica" && fichaOrdem.ordem.arma.alcance === "medio");
const oProt = guardar("ordem", "item", "protecao", { tipoProtecao: "pesada", defesa: 5, categoria: 2, espacos: 2 });
t.ok("Ordem · proteção vira armadura com tipo e Defesa", oProt.tipo === "armadura" && oProt.defesa === 5 && G.RAMAFicha.normalizarItem(oProt).ordem.protecao.tipo === "pesada");

t.grupo("Trocar o subtipo não deixa campo escondido valendo");
const misturado = guardar("tormenta20", "item", "armadura", { dano: "9d9", margem: 2, defesa: 4, penalidade: -1 });
t.ok("valores de Arma no rascunho não vão para uma Armadura", misturado.modelo.def.dano === undefined && misturado.modelo.def.margem === undefined && misturado.modelo.def.defesa === 4);

t.grupo("Registros de antes (sem modelo)");
const antigos = [{ tipo: "arma", nome: "Faca" }, { tipo: "armadura", nome: "Colete" }, { tipo: "mochila", nome: "Bolsa" }, { tipo: "ritual", nome: "Selo" }, { tipo: "item", nome: "Lanterna" }, { tipo: "habilidade", nome: "Olhar" }];
t.iguais("continuam Universal, agrupados em Item e Habilidade", antigos.map((r) => A.sistemaDe(r) + "/" + A.grupoDe(r) + "/" + A.subtipoDe(r)), ["universal/item/arma", "universal/item/protecao", "universal/item/recipiente", "universal/habilidade/ritual", "universal/item/equipamento", "universal/habilidade/habilidade"]);
t.ok("criatura antiga: o sistema nativo de sempre", A.sistemaDe({ tipo: "criatura", sistema: "ordem", ordem: { vd: 20 } }) === "ordem" && A.sistemaDe({ tipo: "criatura", sistema: "vampiro" }) === "vampiro" && A.sistemaDe({ tipo: "criatura" }) === "universal");
t.ok("pacotes: registro antigo segue a regra de antes; nativo só no sistema dele; Universal em qualquer um",
  A.compativelComPacote(antigos[0], "brutal") === null && A.compativelComPacote(espada, "tormenta20").ok && !A.compativelComPacote(espada, "ordem").ok && A.compativelComPacote(guardar("universal", "item", "equipamento", {}), "vampiro").ok);
t.ok("a regra dos pacotes da tela usa os adaptadores", !G.RAMAPacotesHomebrew.compatibilidade(espada, "goblins").ok && G.RAMAPacotesHomebrew.compatibilidade(espada, "tormenta20").ok);

t.grupo("Destino na ficha");
t.iguais("nativo, Manual (Universal num sistema cadastrado) e incompatível", [A.destinoNaFicha(espada, "tormenta20").modo, A.destinoNaFicha(guardar("universal", "item", "equipamento", {}), "tormenta20").modo, A.destinoNaFicha(espada, "goblins").modo], ["nativo", "manual", "incompativel"]);
const hT20 = guardar("tormenta20", "habilidade", "magia", { tipoMagia: "arcana", circulo: 2, escola: "Evocação" });
const hT20texto = guardar("tormenta20", "habilidade", "habilidade", { fonte: "raça" });
t.ok("magia de T20 é nativa (v9.14); habilidade só de texto continua Manual, com o motivo", A.destinoNaFicha(hT20, "tormenta20").modo === "nativo" && A.destinoNaFicha(hT20texto, "tormenta20").modo === "manual" && /só de texto.*Magia e Poder/.test(A.destinoNaFicha(hT20texto, "tormenta20").texto));
t.ok("Universal em T20 entra como item narrativo marcado Manual", /Manual/.test(A.narrativoPara(guardar("universal", "item", "equipamento", {}), "tormenta20").notas));

t.grupo("Modelo Universal");
const u = A.normalizarUniversal({ campos: [{ rotulo: "Peso extra", tipo: "numero", min: 0, max: 10, unidade: "kg" }, { rotulo: "Raridade", tipo: "opcoes", opcoes: ["comum", "rara"] }, { rotulo: "Peso extra", tipo: "texto" }], valores: { peso_extra: 50, raridade: "lendária" } });
t.iguais("campos ganham chave estável e única (o rótulo repetido vira outra chave)", u.campos.map((c) => c.chave), ["peso_extra", "raridade", "peso_extra_2"]);
t.ok("valores respeitam faixa e opções", u.valores.peso_extra === 10 && u.valores.raridade === undefined);
const renomeado = A.normalizarUniversal({ campos: [{ chave: "peso_extra", rotulo: "Carga adicional", tipo: "numero" }], valores: { peso_extra: 3 } });
t.ok("renomear mantém a chave e o valor", renomeado.campos[0].chave === "peso_extra" && renomeado.valores.peso_extra === 3);
t.ok("fórmula só de dados: código é recusado", A.normalizarAcao({ efeito: { tipo: "recuperar", expressao: "alert(1)" } }).efeito.expressao === "" && A.normalizarAcao({ teste: "1d20+2" }).teste === "1d20+2" && A.normalizarAcao({ teste: "Math.random()" }).teste === "");

const kitDeCura = guardar("universal", "item", "consumivel", { peso: 0.5 }, { nome: "Kit de Cura", universal: { acoes: [{ id: "curar", nome: "Usar o kit", usos: { max: 2, recuperacao: "descanso" }, efeito: { tipo: "recuperar", recurso: "Vida", expressao: "1d6" }, alvo: "proprio", chave: "curar" }] } });
t.ok("o Kit de Cura guarda a ação (2 usos, 1d6, recupera Vida)", kitDeCura.universal.acoes[0].usos.max === 2 && kitDeCura.universal.acoes[0].efeito.expressao === "1d6");
t.ok("  e a prévia descreve a ação", /2 usos.*recupera 1d6 de Vida/.test(A.previaDaAcao(kitDeCura.universal.acoes[0])));
const itemNaFicha = G.RAMAFicha.normalizarItem(Object.assign({}, kitDeCura, { tipo: "item" }));
t.ok("na ficha Universal o item leva o bloco universal", itemNaFicha.universal && itemNaFicha.universal.acoes.length === 1);
const fichaU = { status: [{ id: "v1", nome: "Vida", atual: 3, maximo: 10 }, { id: "e1", nome: "Esforço", atual: 5, maximo: 5 }] };
const rolar4 = () => ({ ok: true, total: 4 });
const r1 = A.executarAcao(itemNaFicha.universal, "curar", fichaU, rolar4);
t.ok("usar: rola 1d6 (4) e recupera Vida 3 → 7, gastando 1 uso", r1.ok && r1.mudancas[0].para === 7 && r1.estado.usos.curar === 1 && A.usosRestantes(Object.assign({}, itemNaFicha.universal, { estado: r1.estado }), itemNaFicha.universal.acoes[0]) === 1);
itemNaFicha.universal.estado = r1.estado;
const salvo = JSON.parse(JSON.stringify(G.RAMAFicha.normalizarItem(itemNaFicha)));
t.ok("salvar e reabrir: a carga gasta continua gasta", salvo.universal.estado.usos.curar === 1);
const r2 = A.executarAcao(salvo.universal, "curar", { status: [{ id: "v1", nome: "Vida", atual: 9, maximo: 10 }] }, rolar4);
t.ok("a cura não passa do máximo (9 + 4 → 10)", r2.ok && r2.mudancas[0].para === 10);
salvo.universal.estado = r2.estado;
const r3 = A.executarAcao(salvo.universal, "curar", fichaU, rolar4);
t.ok("sem usos: recusa, sem rolar nem mudar nada", !r3.ok && /Sem usos/.test(r3.motivo));
t.ok("recuperar por descanso devolve os usos", A.recuperarUsos(salvo.universal, "descanso").usos.curar === undefined && A.recuperarUsos(salvo.universal, "cena").usos.curar === 2);
const semRecurso = A.executarAcao(itemNaFicha.universal, "curar", { status: [{ id: "x", nome: "PV", atual: 1, maximo: 5 }] }, rolar4);
t.ok("a ficha não tem \"Vida\": não mapeia sozinho pelo nome parecido — pede escolha (Manual)", !semRecurso.ok && semRecurso.manual);
t.ok("  com o recurso escolhido pela pessoa, aplica", A.executarAcao(itemNaFicha.universal, "curar", { status: [{ id: "x", nome: "PV", atual: 1, maximo: 5 }] }, rolar4, { recursoEfeito: "x" }).mudancas[0].para === 5);
const comCusto = A.normalizarUniversal({ acoes: [{ chave: "golpe", nome: "Golpe", custo: { recurso: "Esforço", quantidade: 2 }, teste: "1d20+3", efeito: { tipo: "rolar", expressao: "2d6" } }] });
const rc = A.executarAcao(comCusto, "golpe", fichaU, rolar4);
t.ok("item Universal com custo e rolagem: paga 2 de Esforço e rola o teste e o efeito", rc.ok && rc.mudancas[0].nome === "Esforço" && rc.mudancas[0].para === 3 && rc.rolagens.length === 2);
t.ok("  sem Esforço suficiente, recusa", !A.executarAcao(comCusto, "golpe", { status: [{ id: "e1", nome: "Esforço", atual: 1, maximo: 5 }] }, rolar4).ok);

t.grupo("Exportar, importar, editar e reabrir");
const V = G.RAMAValidacao;
const idaEVolta = (reg) => V.importado(JSON.parse(JSON.stringify(V.exportar(V.tipoDeExportacao(reg), reg))));
const vEspada = idaEVolta(espada);
t.ok("T20 · a arma volta do arquivo com o modelo e a definição nativa", vEspada.ok && vEspada.dados.modelo.sistema === "tormenta20" && vEspada.dados.modelo.def.dano === "1d10" && vEspada.dados.modelo.def.margem === 19 && vEspada.dados.visibilidade === "privado");
const vO2 = idaEVolta(o2Arma);
t.ok("Ordem II · a arma volta igual", vO2.ok && vO2.dados.modelo.def.dano === 4 && vO2.dados.modelo.def.alcance === "distancia");
const vHab = idaEVolta(hT20);
t.ok("T20 · a magia (habilidade) volta com círculo e escola", vHab.ok && vHab.dados.modelo.grupo === "habilidade" && vHab.dados.modelo.def.circulo === 2 && vHab.dados.modelo.def.escola === "Evocação");
const vKit = idaEVolta(kitDeCura);
t.ok("Universal · o Kit de Cura volta com a ação (chave, usos, efeito)", vKit.ok && vKit.dados.universal.acoes[0].chave === "curar" && vKit.dados.universal.acoes[0].usos.max === 2);
const editado = A.guardar("tormenta20", "item", "arma", { nome: vEspada.dados.nome, valores: Object.assign({}, vEspada.dados.modelo.def, { dano: "2d6" }) });
t.ok("editar o importado e salvar mantém o resto", editado.ok && editado.registro.modelo.def.dano === "2d6" && editado.registro.modelo.def.margem === 19);
const forjado = V.importado({ rama: true, tipo: "homebrew-item", versaoFormato: 1, dados: { nome: "X", tipo: "item", modelo: { sistema: "inexistente", grupo: "item", subtipo: "arma" } } });
t.ok("arquivo de sistema desconhecido é recusado (nada é inventado)", !forjado.ok);
const fichaComKit = G.RAMAFicha.normalizarFicha({ nome: "Teste", inventario: { itens: [Object.assign({}, kitDeCura, { tipo: "item", universal: Object.assign({}, kitDeCura.universal, { estado: { usos: { curar: 1 } } }) })] } });
const fichaVolta = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fichaComKit))));
const kitVolta = fichaVolta.ok && fichaVolta.dados.inventario.itens.find((i) => i.nome === "Kit de Cura");
t.ok("ficha exportada e importada: o Kit de Cura volta com 1 carga gasta", kitVolta && kitVolta.universal.estado.usos.curar === 1, JSON.stringify(fichaVolta.ok ? (kitVolta || {}).universal : fichaVolta));

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
