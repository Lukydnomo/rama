/* =====================================================================
   R.A.M.A. — testes: habilidades características de classes Homebrew de
   Ordem (js/ordem/habilidades-classe.js)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-habilidades-classe.js

   Pelo MOTOR de Ordem, sem DOM: a definição (ids, estágios, predefinições
   oficiais, Eclético ↔ Engenhosidade, conjuração), a chave das classes
   antigas, a concessão nos marcos sem vaga de poder, a escolha validada
   pela vaga própria, o estágio que vale (sem somar o anterior) em NEX,
   nível e Patentes, os passivos estáveis, as opções de uso com o custo
   do trilho, a versão guardada na ficha e a exportação/importação.
   Dados sintéticos (classe fictícia "Sentinela").
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
const ARQ = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/elementos.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ficha.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js", "js/ordem/progressao.js", "js/ordem/ramificacao.js",
  "js/ordem/habilidades-classe.js", "js/ordem/homebrew-ordem.js", "js/ordem/biblioteca.js", "js/ordem/regras.js", "js/ordem/rituais.js", "js/criaturas.js", "js/validacao.js", "js/homebrew-adaptadores.js"];
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
const G = globalThis, C = G.RAMAOrdemCatalogo, R = G.RAMAOrdemRegras, E = G.RAMAOrdemProgressao, H = G.RAMAOrdemHomebrew, HC = G.RAMAOrdemHabilidadesClasse, P = G.RAMAOrdemPoderes, OP = G.RAMAOrdemOpcionais;
const F = G.RAMAFicha, V = G.RAMAValidacao;
const copia = (x) => JSON.parse(JSON.stringify(x));

/* A classe fictícia do exemplo do pedido. */
const PRECISAO = { chave: "hprecisao1", nome: "Precisão Calculada", descricao: "Gaste PE para somar no teste de ataque.", escolha: null,
  estagios: [{ nex: 5, patente: 0, custo: 2, custoPatente: 1, efeitos: [{ tipo: "bonusAtaque", valor: 5 }] }, { nex: 25, patente: 2, custo: 3, custoPatente: 2, efeitos: [{ tipo: "bonusAtaque", valor: 10 }] }] };
const FOCO = { chave: "hfoco0001", nome: "Foco Treinado", descricao: "Duas perícias treinadas (exceto Luta e Pontaria): gaste PE para somar um dado.",
  escolha: { tipo: "pericias", quantidade: 2, modo: "treinada", exceto: ["luta", "pontaria"] },
  estagios: [{ nex: 5, patente: 0, custo: 1, custoPatente: null, efeitos: [{ tipo: "dadoTeste", dado: "1d6", alvo: "escolha" }] }, { nex: 40, patente: 3, custo: 2, custoPatente: null, efeitos: [{ tipo: "dadoTeste", dado: "1d10", alvo: "escolha" }] }] };
const GUARDA = { chave: "hguarda01", nome: "Guarda Alta", descricao: "+2 em Defesa a partir de NEX 15%.", escolha: null,
  estagios: [{ nex: 15, patente: 1, custo: 0, custoPatente: null, efeitos: [{ tipo: "defesa", valor: 2 }] }] };
const base = H.modeloDeOficial("combatente");
const brutoSentinela = Object.assign(copia(base), { nome: "Sentinela", homebrewId: "s3nt1n3la-sintetico", poderesDe: "especialista", trilhasDe: "",
  habilidadesCaracteristicas: [PRECISAO, FOCO, GUARDA] });
const sent = H.normalizarClasse(brutoSentinela);

t.grupo("Definição");
t.ok("três habilidades, com ids estáveis", sent.habilidadesCaracteristicas.map((h) => h.chave).join() === "hprecisao1,hfoco0001,hguarda01");
t.ok("cada estágio guarda custo, custo em Patentes e efeitos", sent.habilidadesCaracteristicas[0].estagios[1].custo === 3 && sent.habilidadesCaracteristicas[0].estagios[1].custoPatente === 2);
const ruim = H.normalizarClasse(Object.assign(copia(brutoSentinela), { habilidadesCaracteristicas: [{ id: "X!", nome: "sem id" }, { chave: "habokay1", estagios: [{ nex: 7, efeitos: [{ tipo: "js", codigo: "alert(1)" }] }, { nex: 10, efeitos: [{ tipo: "bonusTeste", valor: 999, alvo: "lista", pericias: ["inexistente"] }] }] }] }));
t.ok("id inválido é recusado; marco inexistente sai; tipo desconhecido sai; valor limitado; lista vazia vira todas", ruim.habilidadesCaracteristicas.length === 1 && ruim.habilidadesCaracteristicas[0].estagios.length === 1 && ruim.habilidadesCaracteristicas[0].estagios[0].efeitos[0].valor === 30 && ruim.habilidadesCaracteristicas[0].estagios[0].efeitos[0].alvo === "todas");
t.ok("sem escolha, efeito que aponta para a escolha sai", H.normalizarClasse(Object.assign(copia(brutoSentinela), { habilidadesCaracteristicas: [Object.assign(copia(FOCO), { escolha: null })] })).habilidadesCaracteristicas[0].estagios[0].efeitos.length === 0);
t.ok("o texto da descrição nunca vira efeito", sent.habilidadesCaracteristicas.every((h) => h.estagios.every((s) => s.efeitos.every((e) => HC.POR_TIPO[e.tipo]))));

t.grupo("Classes antigas e versões");
const antiga = Object.assign(copia(base), { nome: "Antiga", homebrewId: "antiga-sintetica", habilidadesIniciais: ["Fúria"] });
delete antiga.habilidadesCaracteristicas;
const dAntiga = H.normalizarClasse(antiga);
t.ok("classe antiga (sem o campo novo): nada é acrescentado e o texto fica", !("habilidadesCaracteristicas" in dAntiga) && dAntiga.habilidadesIniciais[0] === "Fúria");
t.ok("  e a chave é a mesma de sempre (normalizar de novo não cria versão)", H.normalizarClasse(copia(dAntiga)).chave === dAntiga.chave);
t.ok("nome igual não liga habilidades: o vínculo é pelo id", !("habilidadesCaracteristicas" in H.normalizarClasse(Object.assign(copia(antiga), { habilidadesIniciais: ["Ataque Especial"] }))));
const sentV2 = H.normalizarClasse(Object.assign(copia(brutoSentinela), { habilidadesCaracteristicas: [Object.assign(copia(PRECISAO), { nome: "Precisão Fria" }), FOCO, GUARDA] }));
t.ok("editar a habilidade cria outra versão da classe (outra chave)", sentV2.chave !== sent.chave);
t.ok("  a vaga da escolha mantém o id (a escolha sobrevive à versão)", HC.vagaId(sentV2.habilidadesCaracteristicas[1]) === HC.vagaId(sent.habilidadesCaracteristicas[1]));
t.ok("  e as entradas do catálogo não colidem entre versões", HC.chaveDaEntrada(sentV2.habilidadesCaracteristicas[0], sentV2) !== HC.chaveDaEntrada(sent.habilidadesCaracteristicas[0], sent));

t.grupo("Predefinições oficiais (cópias adaptáveis)");
const pEsp = HC.presetsDaClasse("especialista");
t.iguais("Especialista: Eclético, Perito e Engenhosidade", pEsp.map((h) => h.base), ["ecletico", "perito", "engenhosidade"]);
t.ok("Engenhosidade aponta para o Eclético da mesma classe (pelo id)", pEsp[2].estagios[0].efeitos[0].alvo === pEsp[0].chave && pEsp[2].estagios[1].efeitos[0].grau === "expert");
t.ok("Perito: duas perícias treinadas, exceto Luta e Pontaria; 2 PE +1d6 … 5 PE +1d12", pEsp[1].escolha.quantidade === 2 && pEsp[1].escolha.exceto.join() === "luta,pontaria" && pEsp[1].estagios[3].custo === 5 && pEsp[1].estagios[3].efeitos[0].dado === "1d12");
t.ok("Engenhosidade não existe na Evolução por Patentes", pEsp[2].estagios.every((s) => s.patente === null));
t.ok("ids novos a cada cópia (adaptar não mexe na oficial)", HC.presetsDaClasse("especialista")[0].chave !== pEsp[0].chave && P.poder("ecletico").resumo.indexOf("2 PE") >= 0);
const doComb = H.modeloDeOficial("combatente");
t.ok("Começar do Combatente traz Ataque Especial (+5 ataque ou dano; 2 PE … 5 PE)", doComb.habilidadesCaracteristicas.length === 1 && doComb.habilidadesCaracteristicas[0].estagios[0].efeitos.map((e) => e.tipo).join() === "bonusAtaque,bonusDano");
const doOc = H.normalizarClasse(Object.assign(H.modeloDeOficial("ocultista"), { nome: "Vidente", homebrewId: "vidente-sint" }));
t.ok("Começar do Ocultista: Escolhido pelo Outro Lado usa a tabela de círculos da classe", doOc.habilidadesCaracteristicas[0].estagios[0].efeitos[0].tipo === "conjuracao" && doOc.circuloPorNex.length === 4);
const semTabela = H.normalizarClasse(Object.assign(copia(brutoSentinela), { circuloPorNex: undefined, habilidadesCaracteristicas: [HC.dePreset("escolhidoPeloOutroLado")] }));
t.ok("conjuração sem tabela: entra a do Ocultista (uma configuração só, sem contradição)", semTabela.circuloPorNex && semTabela.circuloPorNex[0].circulo === 1);
t.ok("independente dos poderes: a Sentinela usa poderes do Especialista e tem a sua Precisão, sem Ataque Especial", sent.poderesDe === "especialista" && !sent.habilidadesCaracteristicas.some((h) => h.base === "ataqueEspecial"));

/* ---- no motor ---- */
const ficha = (extra) => R.normalizar(Object.assign({ classe: sent.chave, origem: "academico", nex: 5, atributos: { agi: 1, for: 2, int: 2, pre: 2, vig: 2 },
  pericias: { diplomacia: "treinado", investigacao: "treinado", luta: "treinado" }, homebrew: { classes: { [sent.chave]: copia(sent) } } }, extra || {}));
const temCartao = (o, id) => E.automaticas(o).some((a) => a.id === "hbh|" + id);

t.grupo("Concessão nos marcos, sem vaga de poder");
const o5 = ficha();
t.ok("NEX 5%: Precisão e Foco chegam; Guarda ainda não", temCartao(o5, "hprecisao1") && temCartao(o5, "hfoco0001") && !temCartao(o5, "hguarda01"));
const vagas5 = E.vagas(o5);
t.ok("nenhuma vaga de poder foi usada para concedê-las", vagas5.filter((v) => v.tipo === "poderClasse").length === E.vagas(R.normalizar(Object.assign(copia(o5), { classe: sent.chave }))).filter((v) => v.tipo === "poderClasse").length && !vagas5.some((v) => v.tipo === "poderClasse" && v.degrau === 1));
t.ok("a escolha do Foco vem numa vaga própria (b.hbh-<id>)", vagas5.some((v) => v.id === "b.hbh-hfoco0001" && v.tipo === "opcoesBeneficio"));
t.ok("a Precisão (sem escolha) não pede vaga", !vagas5.some((v) => v.id === "b.hbh-hprecisao1"));
t.ok("o cartão diz que a escolha está pendente", /escolha pendente/.test(E.automaticas(o5).filter((a) => a.id === "hbh|hfoco0001")[0].estagio));

t.grupo("Escolha validada");
const vagaFoco = vagas5.filter((v) => v.id === "b.hbh-hfoco0001")[0];
const comLuta = copia(o5); E.registrar(comLuta, vagaFoco, { valor: "", opcoes: { pericias: ["luta", "diplomacia"] } });
const avLuta = E.estado(comLuta).avaliacoes[comLuta.escolhas[0].id];
t.ok("Luta não pode (exceção da habilidade)", avLuta && !avLuta.valido && avLuta.motivos.join(" ").indexOf("Luta") >= 0, JSON.stringify(avLuta && avLuta.motivos));
const naoTreinada = copia(o5); E.registrar(naoTreinada, vagaFoco, { valor: "", opcoes: { pericias: ["ocultismo", "diplomacia"] } });
t.ok("perícia não treinada não pode", !E.estado(naoTreinada).avaliacoes[naoTreinada.escolhas[0].id].valido);
const uma = copia(o5); E.registrar(uma, vagaFoco, { valor: "", opcoes: { pericias: ["diplomacia"] } });
t.ok("uma só não completa", E.estado(uma).pendencias.some((p) => p.id === "b.hbh-hfoco0001"));
const boa = copia(o5); E.registrar(boa, vagaFoco, { valor: "", opcoes: { pericias: ["diplomacia", "investigacao"] } });
t.ok("Diplomacia e Investigação: completa e sem pendência", !E.estado(boa).pendencias.some((p) => p.id === "b.hbh-hfoco0001") && E.estado(boa).avaliacoes[boa.escolhas[0].id].valido);
t.ok("o cartão mostra as escolhidas (um cartão só)", E.automaticas(boa).filter((a) => a.habilidadeClasse === "hfoco0001").length === 1 && /Diplomacia, Investigação/.test(E.automaticas(boa).filter((a) => a.id === "hbh|hfoco0001")[0].estagio));

t.grupo("Uso nos testes elegíveis");
const efs = (o) => E.estado(o).efeitos;
const opDip = HC.opcoesDeTeste(boa, R.trilho(boa), "diplomacia", 1, efs(boa));
t.ok("Diplomacia (escolhida): Foco +1d6 por 1 PE", opDip.length === 1 && opDip[0].dado === "1d6" && opDip[0].custo === 1);
t.ok("Ocultismo (não escolhida): nada", HC.opcoesDeTeste(boa, R.trilho(boa), "ocultismo", 0, efs(boa)).length === 0);
t.ok("sem a escolha feita, o teste não oferece", HC.opcoesDeTeste(o5, R.trilho(o5), "diplomacia", 1, efs(o5)).length === 0);
const boa40 = copia(boa); boa40.nex = 40;
const op40 = HC.opcoesDeTeste(boa40, R.trilho(boa40), "diplomacia", 1, efs(boa40));
t.ok("NEX 40%: o estágio novo SUBSTITUI (+1d10 por 2 PE; nada de +1d6 junto)", op40.length === 1 && op40[0].dado === "1d10" && op40[0].custo === 2);
const volta = copia(boa40); volta.nex = 35;
t.ok("voltando a NEX 35%: o 1º estágio de novo", HC.opcoesDeTeste(volta, R.trilho(volta), "diplomacia", 1, efs(volta))[0].dado === "1d6");

t.grupo("Ataque (exemplo do pedido)");
const atk5 = HC.opcoesDeAtaque(o5, R.trilho(o5), efs(o5));
t.ok("NEX 5%: +5 por 2 PE", atk5.length === 1 && atk5[0].valor === 5 && atk5[0].custo === 2);
const o25 = ficha({ nex: 25 });
const atk25 = HC.opcoesDeAtaque(o25, R.trilho(o25), efs(o25));
t.ok("NEX 25%: +10 por 3 PE — não +15", atk25.length === 1 && atk25[0].valor === 10 && atk25[0].custo === 3);
t.ok("o bônus é do uso: a perícia de ataque da ficha não muda", R.bonusDePericia(o25, "luta", { itens: [] }).total === R.bonusDePericia(o5, "luta", { itens: [] }).total);
const oNivel = ficha({ nex: 5 }); OP.definir(oNivel, "nexExperiencia", true); oNivel.nivel = 5;
t.ok("NEX & Experiência: o nível 5 já é o marco de NEX 25% (+10)", HC.opcoesDeAtaque(oNivel, R.trilho(oNivel), efs(oNivel))[0].valor === 10, JSON.stringify(R.trilho(oNivel)));

t.grupo("Passivo estável");
const o15 = ficha({ nex: 15 });
const d15 = R.calcular(o15).defesa;
t.ok("NEX 15%: +2 em Defesa, com a habilidade como origem", d15.total - R.calcular(o5).defesa.total === 2 && d15.parcelas.some((p) => p.rotulo === "Guarda Alta" && p.valor === 2), JSON.stringify(d15.parcelas));
const reaberta = R.normalizar(JSON.parse(JSON.stringify(R.normalizar(JSON.parse(JSON.stringify(o15))))));
t.ok("reabrir duas vezes: a mesma Defesa (nada soma de novo)", R.calcular(reaberta).defesa.total === d15.total);

t.grupo("Evolução por Patentes (marcos e custos próprios)");
const oPat = R.normalizar(Object.assign(copia(ficha()), {})); OP.definir(oPat, "evolucaoPatentes", true);
oPat.prestigio = 0; oPat.patenteConquistada = 0;
const tp = R.trilho(oPat);
t.ok("recruta: Precisão por 1 (custo de Patentes)", tp.porPatente && HC.opcoesDeAtaque(oPat, tp, efs(oPat))[0].custo === 1, JSON.stringify(tp));
t.ok("  Guarda Alta (operador) ainda não", !temCartao(oPat, "hguarda01"));

t.grupo("Eclético + Engenhosidade e Ataque Especial (predefinições na ficha)");
const espHb = H.normalizarClasse(Object.assign(H.modeloDeOficial("especialista"), { nome: "Perita", homebrewId: "perita-sint", habilidadesCaracteristicas: pEsp }));
const fEsp = (nex) => R.normalizar({ classe: espHb.chave, origem: "academico", nex: nex, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 2 }, pericias: { diplomacia: "treinado" }, homebrew: { classes: { [espHb.chave]: copia(espHb) } } });
const e5 = fEsp(5);
const opOc5 = HC.opcoesDeTeste(e5, R.trilho(e5), "ocultismo", 0, efs(e5));
t.ok("NEX 5%, Ocultismo destreinado: Eclético (+5, benefícios de treinado) por 2 PE", opOc5.length === 1 && opOc5[0].treino === "treinado" && opOc5[0].valor === 5 && opOc5[0].custo === 2);
t.ok("perícia já treinada: Eclético não oferece", HC.opcoesDeTeste(e5, R.trilho(e5), "diplomacia", 1, efs(e5)).filter((o) => o.treino).length === 0);
const e40 = fEsp(40), op40e = HC.opcoesDeTeste(e40, R.trilho(e40), "ocultismo", 0, efs(e40)).filter((o) => o.treino);
t.ok("NEX 40%: Eclético (treinado, 2 PE) ou Eclético + Engenhosidade (veterano, +10, 4 PE)", op40e.length === 2 && op40e[1].treino === "veterano" && op40e[1].valor === 10 && op40e[1].custo === 4);
const e75 = fEsp(75), op75 = HC.opcoesDeTeste(e75, R.trilho(e75), "ocultismo", 0, efs(e75)).filter((o) => o.treino);
t.ok("NEX 75%: expert por 6 PE (o estágio de Engenhosidade substitui o de veterano)", op75.length === 2 && op75[1].treino === "expert" && op75[1].custo === 6);
const combHb = H.normalizarClasse(Object.assign(H.modeloDeOficial("combatente"), { nome: "Lutador", homebrewId: "lutador-sint", poderesDe: "", trilhasDe: "" }));
const fComb = R.normalizar({ classe: combHb.chave, origem: "academico", nex: 55, atributos: { agi: 1, for: 3, int: 1, pre: 2, vig: 2 }, homebrew: { classes: { [combHb.chave]: copia(combHb) } } });
const aeAtk = HC.opcoesDeAtaque(fComb, R.trilho(fComb), efs(fComb)), aeDano = HC.opcoesDeDano(fComb, R.trilho(fComb), efs(fComb));
t.ok("Ataque Especial adaptado sem ser Combatente: NEX 55% → +15 por 4 PE, no ataque ou no dano", aeAtk[0].valor === 15 && aeAtk[0].custo === 4 && aeDano[0].valor === 15);

t.grupo("Cópia na ficha, exportação e importação");
const fichaCompleta = F.normalizarFicha({ nome: "Agente sintética", tipoFicha: "ordem", ordem: copia(boa) });
const voltou = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fichaCompleta))));
const oVolta = voltou.ok ? voltou.dados.ordem : null;
t.ok("exportar/importar em JSON preserva a configuração e a escolha", !!oVolta && oVolta.homebrew.classes[sent.chave].habilidadesCaracteristicas.length === 3 && HC.escolhidas(oVolta, sent.habilidadesCaracteristicas[1]).join() === "diplomacia,investigacao", JSON.stringify(Object.keys(voltou)));
t.ok("  e funciona sem a biblioteca (só a cópia da ficha)", !!oVolta && HC.opcoesDeTeste(R.normalizar(oVolta), R.trilho(oVolta), "diplomacia", 1, efs(R.normalizar(oVolta))).length === 1);
const comV1 = ficha(); const versoes = H.versoesNovas(comV1, { classes: [Object.assign({ meu: true }, sentV2)] });
t.ok("a biblioteca com versão nova não muda a ficha sozinha (só oferece)", versoes.length === 1 && comV1.classe === sent.chave);
const atual = copia(boa); H.atualizarVersao(atual, versoes[0]);
t.ok("atualizar explicitamente: classe nova, escolha preservada pelo id", atual.classe === sentV2.chave && HC.escolhidas(atual, sentV2.habilidadesCaracteristicas[1]).join() === "diplomacia,investigacao" && temCartao(R.normalizar(atual), "hprecisao1"));

t.grupo("Transição para agente");
C.registrarClasseHomebrew(sent);
t.ok("os ganhos da transição citam as habilidades que chegam no 1º marco", C.TRANSICOES.mundano.classes[sent.chave].habilidades.join() === "Precisão Calculada,Foco Treinado");
C.registrarClasseHomebrew(dAntiga);
t.ok("  e as só de texto de uma classe antiga continuam lá", C.TRANSICOES.mundano.classes[dAntiga.chave].habilidades.indexOf("Fúria") >= 0);

t.grupo("Classes oficiais intactas");
const combOficial = R.normalizar({ classe: "combatente", origem: "academico", nex: 25, atributos: { agi: 1, for: 2, int: 1, pre: 2, vig: 2 } });
t.ok("Combatente oficial: nenhuma habilidade Homebrew, Ataque Especial como sempre", HC.ativas(combOficial, R.trilho(combOficial)).length === 0 && E.automaticas(combOficial).some((a) => a.id === "auto|ataqueEspecial"));

console.log(`\n${FORTE}${passaram} ok${FIM}${falharam ? `, ${VERMELHO}${falharam} falharam${FIM}` : ""}`);
if (falharam) Deno.exit(1);
