/* =====================================================================
   R.A.M.A. — testes de Vampiro: A Máscara (V5)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-vampiro.js

   Sem navegador e sem rede. Os dados são uma FILA de resultados
   combinados (rolador): cada teste diz exatamente o que cai, e o motor
   nunca sorteia sozinho. Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = [
  "js/vampiro/catalogo.js", "js/vampiro/disciplinas-dados.js", "js/vampiro/antagonistas-dados.js",
  "js/vampiro/dados.js", "js/vampiro/regras.js", "js/vampiro/poderes.js", "js/vampiro/cronica.js",
];
globalThis.window = globalThis;
for (const caminho of ARQUIVOS) {
  let codigo;
  try { codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url)); }
  catch (e) { console.error(`Arquivo ausente: ${caminho}`); Deno.exit(1); }
  try { (0, eval)(codigo); }
  catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}\n${e.stack}`); Deno.exit(1); }
}

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

const C = globalThis.RAMAVampiroCatalogo, DS = globalThis.RAMAVampiroDisciplinas, D = globalThis.RAMAVampiroDados;
const R = globalThis.RAMAVampiro, P = globalThis.RAMAVampiroPoderes, CR = globalThis.RAMAVampiroCronica, AN = globalThis.RAMAVampiroAntagonistas;

/* Fila de dados: cada chamada tira o próximo; acabou, falha alto. */
function fila(...faces) {
  const q = faces.flat();
  const f = () => { if (!q.length) throw new Error("fila de dados vazia"); return q.shift(); };
  f.resta = () => q.length;
  return f;
}

/* Um vampiro pronto (Brujah neófito), sem passar pela tela. */
function brujah() {
  const o = R.fichaVazia("vampiro");
  Object.assign(o, { conceito: "Punk", cla: "brujah", senhor: "Ana", geracao: 13, idade: "neofito", ambicao: "Derrubar o Príncipe", desejo: "Uma briga" });
  Object.assign(o.atributos, { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, autocontrole: 2, inteligencia: 2, raciocinio: 2, determinacao: 1 });
  o.criacao.distribuicao = "especialista";
  Object.assign(o.habilidades, { briga: 4, atletismo: 3, intimidacao: 3, manha: 3, persuasao: 2, furtividade: 2, armasBrancas: 2, conducao: 1, percepcao: 1, sobrevivencia: 1 });
  o.especializacoes.push({ id: "es-1", habilidade: "briga", nome: "Membros", origem: "criacao" });
  o.disciplinas = { potencia: 2, celeridade: 1 };
  o.poderes = [{ id: "p1", chave: "corpoLetal", origem: "criacao" }, { id: "p2", chave: "poderio", origem: "criacao" }, { id: "p3", chave: "reflexosRapidos", origem: "criacao" }];
  R.escolherPredador(o, "viraLata", { especializacao: 1, disciplina: "celeridade", poder: "gracaFelina" });
  o.vantagens.push({ id: "v1", chave: "recursos", pontos: 2, origem: "criacao" }, { id: "v2", chave: "aliados", pontos: 3, origem: "criacao" }, { id: "v3", chave: "refugio", pontos: 2, origem: "criacao" }, { id: "v4", chave: "inimigos", pontos: 2, origem: "criacao" });
  const cv = { id: "cv1", texto: "Nunca abandonar um amigo" };
  o.convicoes.push(cv);
  o.pilares.push({ id: "pi1", nome: "Irmã", convicaoId: "cv1", estado: "vivo" });
  return o;
}

/* =====================================================================
   CATÁLOGO
   ===================================================================== */
t.grupo("Catálogo · V5, não edições anteriores");
t.igual("nove Atributos", C.ATRIBUTOS.length, 9);
t.igual("27 Habilidades", C.HABILIDADES.length, 27);
t.iguais("Atributos de V5 por categoria", C.ATRIBUTOS.map((a) => a.nome), ["Força", "Destreza", "Vigor", "Carisma", "Manipulação", "Autocontrole", "Inteligência", "Raciocínio", "Determinação"]);
t.ok("sem Pontos de Sangue, Virtudes ou Trilhas no catálogo", !JSON.stringify(C).match(/Pontos de Sangue|Virtude|Consci[eê]ncia|Autocontrole e Coragem/));
t.iguais("especialização na compra: Erudição, Ofícios, Performance, Ciência", C.HABILIDADES.filter((h) => h.especializacaoNaCompra).map((h) => h.chave).sort(), ["ciencia", "erudicao", "oficios", "performance"]);
t.iguais("sete clãs + Caitiff + Sangue-Ralo", Object.keys(C.CLAS).sort(), ["brujah", "caitiff", "gangrel", "malkaviano", "nosferatu", "sangueRalo", "toreador", "tremere", "ventrue"]);
t.iguais("Disciplinas do Tremere", C.CLAS.tremere.disciplinas, ["auspicios", "dominacao", "feiticaria"]);
t.iguais("dez tipos de Predador", Object.keys(C.PREDADORES).sort(), ["consensualista", "fazendeiro", "osiris", "sacoleiro", "sandman", "sanguessuga", "sceneQueen", "sereia", "trinchador", "viraLata"]);
t.iguais("Geração 12ª: Potência 1–3; 4ª: 5–10; 14ª: 0", [C.GERACOES[12], C.GERACOES[4], C.GERACOES[14]], [[1, 3], [5, 10], [0, 0]]);
t.iguais("Potência 3: Surto +3, recupera 2, bônus +1, rerrola até 2, Perdição 3", (({ surto, recupera, bonusPoder, rerrolagem, perdicao }) => [surto, recupera, bonusPoder, rerrolagem, perdicao])(C.potencia(3)), [3, 2, 1, 2, 3]);
t.igual("Página impressa 175 é a 177 do PDF", C.paginaDoPdf(175), 177);
t.igual("Página impressa 306 é a 310 do PDF", C.paginaDoPdf(306), 310);
t.iguais("Distribuições de Habilidades", Object.values(C.DISTRIBUICOES_DE_HABILIDADES).map((d) => d.valores.length), [19, 15, 10]);
const todasDisciplinas = ["animalismo", "auspicios", "celeridade", "dominacao", "fortitude", "ofuscacao", "potencia", "presenca", "proteanismo", "feiticaria"];
for (const d of todasDisciplinas) {
  const ps = DS.daDisciplina(d);
  t.ok(DS.DISCIPLINAS[d].nome + ": poderes dos níveis 1 a 5, com página", [1, 2, 3, 4, 5].every((n) => ps.some((p) => p.nivel === n)) && ps.every((p) => p.pagina >= 244 && p.pagina <= 287));
}
t.ok("todos os poderes com amálgama apontam para uma Disciplina real", DS.PODERES.every((p) => !p.amalgama || DS.DISCIPLINAS[p.amalgama.disciplina]));
t.ok("pré-requisitos apontam para poderes existentes", DS.PODERES.every((p) => !p.prereq || DS.poder(p.prereq)));
t.ok("Rituais de 1 a 5, Dif = nível + 1", [1, 2, 3, 4, 5].every((n) => DS.RITUAIS.some((r) => r.nivel === n)) && DS.RITUAIS.every((r) => r.dificuldade === r.nivel + 1));
t.iguais("três métodos de Alquimia", Object.keys(DS.METODOS_DE_ALQUIMIA), ["athanorCorporis", "calcinatio", "fixatio"]);

/* =====================================================================
   MOTOR DE DADOS
   ===================================================================== */
t.grupo("Dados · sucessos, pares de 10, margem");
t.igual("6–9 e 10 são sucesso", D.contar([1, 5, 6, 9, 10]).sucessos, 3);
t.igual("um par de 10 vale 4", D.contar([10, 10]).sucessos, 4);
t.igual("três 10 valem 5 (um par + um)", D.contar([10, 10, 10]).sucessos, 5);
t.igual("quatro 10 valem 8", D.contar([10, 10, 10, 10]).sucessos, 8);
t.ok("um 10 sozinho não é crítico", !D.contar([10, 6]).critico);
let r = D.rolar({ parada: 5, fome: 0, dificuldade: 3 }, fila(10, 10, 6, 2, 3));
t.ok("vitória crítica com margem 2", r.classificacao.vitoriaCritica && r.classificacao.margem === 2);
r = D.rolar({ parada: 4 }, fila(7, 8, 1, 1));
t.ok("sem Dificuldade, não anuncia vitória", r.classificacao.vitoria === undefined && r.classificacao.sucessos === 2 && !r.classificacao.julgado);
D.julgar(r, { dificuldade: 3 });
t.ok("julgada depois: falha, pode vencer a um custo", r.classificacao.vitoria === false && r.classificacao.podeVencerACusto && r.classificacao.faltam === 1);
r = D.rolar({ parada: 3, dificuldade: 2 }, fila(1, 2, 3));
t.ok("falha total: nenhum sucesso", r.classificacao.falhaTotal);

t.grupo("Dados · Fome substitui, não soma");
r = D.rolar({ parada: 5, fome: 2, dificuldade: 1 }, fila(1, 2, 3, 4, 5));
t.ok("parada 5 com Fome 2: 5 dados, 2 de Fome", r.dados.length === 5 && r.dados.filter((d) => d.fome).length === 2);
r = D.rolar({ parada: 2, fome: 4, dificuldade: 1 }, fila(6, 6));
t.ok("Fome maior que a parada: só a parada, toda de Fome", r.dados.length === 2 && r.dados.every((d) => d.fome));
r = D.rolar({ parada: 3, fome: 3, tipo: "trilha", dificuldade: 1 }, fila(6, 6, 6));
t.ok("testes de trilha não têm dado de Fome", r.dados.every((d) => !d.fome));
t.ok("rótulo acessível diz que o dado é de Fome", D.rotuloDoDado({ face: 1, fome: true }).includes("dado de Fome") && D.rotuloDoDado({ face: 1, fome: true }).includes("bestial"));

t.grupo("Dados · bestiais");
r = D.rolar({ parada: 4, fome: 1, dificuldade: 2 }, fila(10, 3, 4, 10));
t.ok("crítico bestial: vitória crítica com 10 de Fome", r.classificacao.criticoBestial);
r = D.rolar({ parada: 4, fome: 1, dificuldade: 2 }, fila(6, 6, 3, 10));
t.ok("10 de Fome sozinho numa vitória não é crítico nem bestial", r.classificacao.vitoria && !r.classificacao.vitoriaCritica && !r.classificacao.criticoBestial);
r = D.rolar({ parada: 4, fome: 1, dificuldade: 6 }, fila(10, 10, 3, 10));
t.ok("10 de Fome num par, mas teste fracassado: nada bestial crítico", !r.classificacao.criticoBestial && r.classificacao.vitoria === false);
r = D.rolar({ parada: 3, fome: 1, dificuldade: 3 }, fila(6, 2, 1));
t.ok("falha bestial: fracassou com 1 de Fome", r.classificacao.falhaBestial);
r = D.rolar({ parada: 3, fome: 1, dificuldade: 1 }, fila(6, 2, 1));
t.ok("1 de Fome numa vitória não é falha bestial", r.classificacao.vitoria && !r.classificacao.falhaBestial);

t.grupo("Dados · Força de Vontade rerrola até 3 comuns, uma vez");
r = D.rolar({ parada: 5, fome: 1, dificuldade: 2 }, fila(10, 3, 4, 5, 10));
t.ok("antes: crítico bestial", r.classificacao.criticoBestial);
t.ok("não rerrola dado de Fome", !D.rerrolar(r, [4], fila(1)).ok);
t.ok("não rerrola mais de 3", !D.rerrolar(r, [0, 1, 2, 3], fila(1, 1, 1, 1)).ok);
t.ok("rerrola inclusive o 10 comum para evitar o bestial", D.rerrolar(r, [0, 1], fila(7, 2)).ok);
t.ok("depois: reclassificado, sem crítico bestial", !r.classificacao.criticoBestial && r.classificacao.vitoria && r.dados[0].face === 7 && r.dados[0].original === 10);
t.ok("o resultado novo vale e a rolagem não rerrola de novo", !D.rerrolar(r, [2], fila(9)).ok);
r = D.rolar({ parada: 3, tipo: "trilha", dificuldade: 2 }, fila(1, 1, 1));
t.ok("trilha não rerrola", !D.rerrolar(r, [0], fila(9)).ok);
r = D.rolar({ parada: 3, tipo: "rolagemUnica", dificuldade: 2 }, fila(1, 1, 1));
t.ok("conflito de rolagem única não rerrola", !D.rerrolar(r, [0], fila(9)).ok);
D.concluir(r);
t.ok("concluída, nada muda", !D.julgar(r, { dificuldade: 1 }).ok);

t.grupo("Dados · disputas, automáticas, Checagens");
t.igual("empate na disputa: quem age vence", D.disputa({ dados: [{ face: 6 }] }, { dados: [{ face: 7 }] }).vence, "agente");
t.ok("vitória automática com parada ≥ 2× Dificuldade", D.vitoriaAutomatica(6, 3) && !D.vitoriaAutomatica(5, 3));
t.igual("pegar a metade arredonda para baixo", D.pegarAMetade(7), 3);
t.iguais("Checagem: um dado, 6+", [D.checagem(fila(6)).sucesso, D.checagem(fila(5)).sucesso], [true, false]);
t.ok("Checagem com dois dados fica com o melhor", D.checagem(fila(2, 8), { dados: 2 }).sucesso);
t.iguais("conflito: margem + arma no perdedor", D.resolverConflito(4, 1, { armaA: 2 }).danoEmB, 5);
t.iguais("empate bilateral: os dois como margem 1", (({ danoEmA, danoEmB }) => [danoEmA, danoEmB])(D.resolverConflito(3, 3, { bilateral: true, armaA: 1, armaB: 0 })), [1, 2]);
t.igual("rolagem única: dobro da Dificuldade − sucessos", D.danoDeRolagemUnica(3, 4), 5);

/* =====================================================================
   CRIAÇÃO
   ===================================================================== */
t.grupo("Criação · regular");
let o = brujah();
let v = R.validarCriacao(o);
t.ok("Brujah neófito regular, sem pendências", v.completa && v.regular, JSON.stringify(v.pendencias));
let calc = R.calcular(o);
t.igual("Vitalidade = Vigor + 3", calc.vitalidade.max, 6);
t.igual("Força de Vontade = Autocontrole + Determinação", calc.forcaDeVontade.max, 3);
t.igual("Vira-lata: −1 Humanidade (7 → 6)", calc.humanidade, 6);
t.ok("Vira-lata: +1 Celeridade com origem predador", calc.disciplinas.celeridade.valor === 2 && calc.disciplinas.celeridade.composicao.some((x) => x.fonte === "predador"));
t.ok("Vira-lata: especialização com origem predador", calc.especializacoes.some((e) => e.origem === "predador" && e.nome === "Agarramento"));
t.ok("Vira-lata: Contatos 3 sem gastar o orçamento", calc.vantagens.some((x) => x.chave === "contatos" && x.pontos === 3 && x.origem === "predador"));
t.igual("Potência do neófito: 1", calc.potencia, 1);
t.igual("XP inicial do neófito: 15", calc.xp.disponivel, 15);

t.grupo("Criação · trocar o Predador não duplica");
R.escolherPredador(o, "sandman", { especializacao: 1, disciplina: "ofuscacao", poder: "mantoDeSombras" });
calc = R.calcular(o);
t.igual("Sandman: Humanidade volta a 7", calc.humanidade, 7);
t.ok("Sandman: some a Celeridade do Vira-lata", calc.disciplinas.celeridade.valor === 1 && !calc.disciplinas.celeridade.composicao.some((x) => x.fonte === "predador"));
t.ok("Sandman: Ofuscação 1", calc.disciplinas.ofuscacao && calc.disciplinas.ofuscacao.valor === 1);
t.ok("Sandman: Recursos +1 e nenhum Contatos do Vira-lata", !calc.vantagens.some((x) => x.chave === "contatos") && calc.vantagens.some((x) => x.chave === "recursos" && x.origem === "predador"));
t.igual("as vantagens compradas na criação ficam intactas", o.vantagens.length, 4);
R.escolherPredador(o, "viraLata", { especializacao: 1, disciplina: "celeridade", poder: "gracaFelina" });
t.igual("de volta ao Vira-lata, uma concessão só de cada", R.concessoes(o).filter((x) => x.tipo === "vantagem" && x.chave === "contatos").length, 1);

t.grupo("Criação · validação e restrições");
let x = brujah(); x.atributos.forca = 5;
t.ok("atributos fora de 4/3/3/3/2/2/2/2/1 são pendência", R.validarCriacao(x).pendencias.some((p) => p.etapa === 4));
x = brujah(); x.cla = "ventrue"; x.perdicaoParametro = "Soldados"; x.disciplinas = { dominacao: 2, fortitude: 1 }; x.poderes = [{ id: "a", chave: "compelir" }, { id: "b", chave: "nublarMemoria" }, { id: "c", chave: "resiliencia" }];
R.escolherPredador(x, "fazendeiro", { especializacao: 0, disciplina: "animalismo", poder: "sentirABesta" });
t.ok("Ventrue não pode ser Fazendeiro", R.validarCriacao(x).pendencias.some((p) => /não é permitido/.test(p.texto)));
x = brujah(); R.escolherPredador(x, "osiris", { especializacao: 0, disciplina: "feiticaria", poder: "umGostoPorSangue", escolhas: { 0: { fama: 2, rebanho: 1 }, 1: { inimigos: 2 } } });
t.ok("Osíris: Feitiçaria de Sangue só para Tremere", R.validarCriacao(x).pendencias.some((p) => /só para Tremere/.test(p.texto)));
x = brujah(); R.escolherPredador(x, "osiris", { especializacao: 0, disciplina: "presenca", poder: "fascinio", escolhas: { 0: { fama: 2 } } });
t.ok("Osíris: repartir exatamente 3 pontos", R.validarCriacao(x).pendencias.some((p) => /Reparta 3/.test(p.texto)));
x = brujah(); x.vantagens = x.vantagens.filter((y) => y.chave !== "inimigos");
t.ok("faltam os 2 pontos de Defeitos além dos do Predador", R.validarCriacao(x).pendencias.some((p) => /Defeitos: 2/.test(p.texto)));
x = brujah(); x.habilidades.erudicao = 1; x.habilidades.percepcao = 0;
t.ok("Erudição precisa da especialização gratuita", R.validarCriacao(x).pendencias.some((p) => /Erudição precisa/.test(p.texto)));
x = brujah(); x.poderes = x.poderes.slice(0, 2);
t.ok("poderes: um por ponto de Disciplina", R.validarCriacao(x).pendencias.some((p) => /poder/.test(p.texto)));
x = brujah(); x.especializacoes = [{ id: "es-r", habilidade: "briga", nome: "agarramento", origem: "criacao" }];
t.ok("a especialização livre igual à do Predador é pendência", R.validarCriacao(x).pendencias.some((p) => p.etapa === 5 && /repetida/.test(p.texto)));
x = brujah(); R.escolherPredador(x, "viraLata", { especializacao: 1, disciplina: "potencia", poder: "centelhaDeFuria" });
t.ok("o poder do Predador também confere o amálgama (Centelha de Fúria sem Presença 3)", R.validarCriacao(x).pendencias.some((p) => p.etapa === 7 && /amálgama/.test(p.texto)));
x = brujah(); x.disciplinas = { potencia: 1, celeridade: 2 };
t.ok("um poder que perdeu o nível (Poderio com Potência 1) volta a ser pendência", R.validarCriacao(x).pendencias.some((p) => /Poderio exige/.test(p.texto)));

t.grupo("Criação · todos os perfis de Habilidades");
for (const [chave, dist] of Object.entries(C.DISTRIBUICOES_DE_HABILIDADES)) {
  const y = brujah();
  y.criacao.distribuicao = chave;
  y.habilidades = {};
  C.HABILIDADES.slice(0, dist.valores.length).forEach((h, i) => { y.habilidades[h.chave] = dist.valores[i]; });
  y.especializacoes = [{ id: "e", habilidade: C.HABILIDADES[0].chave, nome: "x", origem: "criacao" }];
  ["oficios", "erudicao", "ciencia", "performance"].forEach((k) => { if (y.habilidades[k]) y.especializacoes.push({ id: "g" + k, habilidade: k, nome: "g", origem: "gratis" }); });
  const p = R.validarCriacao(y).pendencias.filter((q) => q.etapa === 5);
  t.ok(dist.nome + " aceita a distribuição do livro", !p.length, JSON.stringify(p));
}

t.grupo("Criação · Caitiff e Sangue-Ralo são modelos diferentes");
x = brujah(); x.cla = "caitiff"; x.disciplinas = { proteanismo: 2, auspicios: 1 }; x.poderes = [{ id: "a", chave: "olhosDaBesta" }, { id: "b", chave: "armasFerais" }, { id: "c", chave: "sentidosAgucados" }];
t.ok("Caitiff: quaisquer duas Disciplinas", !R.validarCriacao(x).pendencias.some((p) => p.etapa === 6), JSON.stringify(R.validarCriacao(x).pendencias));
t.ok("Caitiff: Defeito Suspeito por origem clã", R.calcular(x).vantagens.some((v) => v.chave === "suspeito" && v.origem === "cla"));
t.igual("Caitiff: Disciplina custa 6 × nível", R.custoDeNivel(x, "disciplina", "proteanismo", 3), 18);
let ralo = R.fichaVazia("vampiro");
Object.assign(ralo, { cla: "sangueRalo", geracao: 15, idade: "crianca", conceito: "x" });
ralo.sangueRalo = { qualidades: ["alquimista"], defeitos: ["denteDeLeite"] };
ralo.disciplinas = { alquimia: 1 }; ralo.metodoAlquimia = "fixatio";
ralo.formulas = [{ id: "f1", chave: "neblina", origem: "criacao" }];
t.igual("Sangue-Ralo: Potência 0", R.calcular(ralo).potencia, 0);
t.ok("Sangue-Ralo: sem Disciplinas intrínsecas, sem Predador exigido", !R.validarCriacao(ralo).pendencias.some((p) => p.etapa === 6 || p.etapa === 7), JSON.stringify(R.validarCriacao(ralo).pendencias.filter((p) => p.etapa === 6 || p.etapa === 7)));
ralo.sangueRalo.defeitos = [];
t.ok("Sangue-Ralo: Qualidades e Defeitos em igual número", R.validarCriacao(ralo).pendencias.some((p) => /mesmo número/.test(p.texto)));
ralo.sangueRalo.defeitos = ["denteDeLeite"];
t.ok("Sangue-Ralo não ganha Celeridade de clã nenhum", !R.calcular(ralo).disciplinas.celeridade);

/* =====================================================================
   PARADAS
   ===================================================================== */
t.grupo("Paradas · composição e regras");
o = brujah(); R.concluirCriacao(o);
let par = R.montarParada(o, { atributo: "forca", habilidade: "briga", especializacao: "es-1" });
t.igual("Força 4 + Briga 4 + especialização 1 = 9", par.total, 9);
t.ok("a especialização é dado da parada, não bônus no resultado", par.composicao.some((x) => x.tipo === "especializacao" && x.valor === 1));
par = R.montarParada(o, { atributo: "forca", habilidade: "briga", especializacao: "inexistente" });
t.igual("especialização de outra Habilidade não entra", par.total, 8);
par = R.montarParada(o, { atributo: "destreza", habilidade: "atletismo", surto: true });
t.ok("Surto de Sangue: +2 com Potência 1", par.composicao.some((x) => x.tipo === "surto" && x.valor === 2));
par = R.montarParada(o, { atributo: "carisma", disciplina: "potencia" });
t.ok("Potência 1 não dá bônus de poder", !par.composicao.some((x) => x.tipo === "potencia"));
o.potenciaBase = 3;
par = R.montarParada(o, { atributo: "carisma", disciplina: "potencia" });
t.ok("Potência do Sangue 3: +1 em paradas de Disciplina", par.composicao.some((x) => x.tipo === "potencia" && x.valor === 1));
par = R.montarParada(o, { atributo: "carisma", habilidade: "persuasao" });
t.ok("…mas não em parada sem Disciplina", !par.composicao.some((x) => x.tipo === "potencia"));
o.potenciaBase = 1;
o.vitalidade.superficial = 6;
par = R.montarParada(o, { atributo: "forca", habilidade: "briga" });
t.ok("Vitalidade Debilitada: −2 em físicas", par.composicao.some((x) => x.fonte === "Vitalidade Debilitada" && x.valor === -2));
par = R.montarParada(o, { atributo: "carisma", habilidade: "persuasao" });
t.ok("…não em sociais", !par.composicao.some((x) => x.fonte === "Vitalidade Debilitada"));
o.vitalidade.superficial = 0;
par = R.montarParada(o, { atributo: "determinacao", modificadores: [{ fonte: "x", valor: -9 }] });
t.igual("nenhuma parada fica abaixo de 1", par.total, 1);
o.ajustes.push({ id: "h", tipo: "humanidade", valor: -2, origem: "teste" });
par = R.montarParada(o, { atributo: "carisma", habilidade: "persuasao", contexto: ["humanos"] });
t.ok("Humanidade 4: −2 para interagir com humanos", par.composicao.some((x) => x.fonte === "Humanidade 4" && x.valor === -2));
o.ajustes = [];

t.grupo("Paradas · o teste rolado pela ficha");
o = brujah(); R.concluirCriacao(o); o.fome = 2;
let rt = R.rolarTeste(o, { atributo: "forca", habilidade: "briga", dificuldade: 3 }, fila(10, 4, 4, 4, 4, 4, 4, 10));
t.ok("8 dados, 2 de Fome, crítico bestial", rt.ok && rt.resultado.parada === 8 && rt.resultado.fome === 2 && rt.resultado.classificacao.criticoBestial);
let rr = R.rerrolarComFdV(o, rt.resultado, [0], fila(5));
t.ok("FdV rerrola e custa 1 Superficial sem dividir", rr.ok && o.forcaDeVontade.superficial === 1);
t.ok("depois do gasto, não é mais crítico bestial", !rt.resultado.classificacao.criticoBestial);
let ct = R.concluirTeste(o, rt.resultado);
t.ok("concluir sem bestial não pede consequência", ct.ok && !ct.eventos.some((e) => e.tipo === "criticoBestial"));
rt = R.rolarTeste(o, { atributo: "forca", habilidade: "briga", dificuldade: 6 }, fila(2, 2, 2, 2, 2, 2, 6, 1));
ct = R.concluirTeste(o, rt.resultado);
t.ok("falha bestial vira pendência de escolha, sem consequência automática", ct.eventos.some((e) => e.tipo === "falhaBestial") && o.fome === 2 && !o.estado.compulsao);
let cb = R.consequenciaBestial(o, { tipo: "fome" });
t.ok("a escolhida (Fome +1) é aplicada, só ela", cb.ok && o.fome === 3 && !o.estado.compulsao);
rt = R.rolarTeste(o, { atributo: "forca", habilidade: "briga" }, fila(6, 6, 6, 6, 6, 6, 6, 6));
t.ok("teste sem Dificuldade não conclui", !R.concluirTeste(o, rt.resultado).ok);

/* =====================================================================
   CHECAGENS, FOME
   ===================================================================== */
t.grupo("Checagens de Sangue");
o = brujah(); R.concluirCriacao(o); o.fome = 1;
let ch = R.checagemDeSangue(o, { motivo: "teste" }, fila(6));
t.ok("sucesso: Fome não muda", ch.ok && ch.sucesso && o.fome === 1);
ch = R.checagemDeSangue(o, { motivo: "teste" }, fila(3));
t.ok("falha: Fome +1", ch.ok && !ch.sucesso && o.fome === 2);
o.potenciaBase = 3;
ch = R.checagemDeSangue(o, { motivo: "poder", nivelDoPoder: 2 }, fila(2, 7));
t.ok("Potência 3 rerrola Checagem de poder nível 2 (dois dados, o melhor)", ch.sucesso && ch.faces.length === 2);
ch = R.checagemDeSangue(o, { motivo: "poder", nivelDoPoder: 3 }, fila(2));
t.ok("…mas não de nível 3", ch.faces.length === 1);
o.potenciaBase = 1;
o.fome = 5;
t.ok("Fome 5: Checagem voluntária recusada", !R.checagemDeSangue(o, { motivo: "x" }, fila(6)).ok);
ch = R.checagemDeSangue(o, { motivo: "forçada", forcada: true }, fila(2));
t.ok("Fome 5, forçada, falha: frenesi de fome Dif 4 pendente", ch.ok && ch.eventos.some((e) => e.tipo === "frenesiPendente" && e.dificuldade === 4) && o.fome === 5);
ch = R.checagemDeSangue(o, { motivo: "despertar", forcada: true, contexto: "despertar" }, fila(2));
t.ok("despertar com Fome 5 e falha: Torpor (não frenesi)", ch.consequencia === "torpor" && o.estado.torpor);
o = brujah(); R.concluirCriacao(o); o.fome = 1;
let pd = P.ativarPoder(o, "poderio", {}, fila(1));
t.ok("poder com Checagem falha: Fome +1, mas o poder vale", pd.ok && o.fome === 2 && R.temEfeito(o, "poderio"));
o.fome = 3;
const multi = R.checagens(o, 2, { motivo: "Majestade" }, fila(2, 2));
t.ok("cada Checagem resolvida: duas falhas, Fome +2", multi.falhas === 2 && o.fome === 5);

t.grupo("Rubor, Surto, cura vampírica");
o = brujah(); R.concluirCriacao(o); o.fome = 1;
t.ok("Rubor de Vida por Checagem, dura a noite", R.ruborDeVida(o, fila(7)).ok && R.temEfeito(o, "ruborDeVida"));
o.vitalidade.superficial = 3;
t.ok("curar Superficial: 1 Checagem, remove a quantidade da Potência (1)", R.curarSuperficial(o, fila(8)).ok && o.vitalidade.superficial === 2);
t.ok("uma vez por turno", !R.curarSuperficial(o, fila(8)).ok);
o.vitalidade.agravado = 2; o.fome = 1;
let ca = R.curarAgravado(o, fila(6, 6, 6));
t.ok("curar Agravado: 3 Checagens, 1 Agravado", ca.ok && o.vitalidade.agravado === 1);
t.ok("só 1 Agravado por noite", !R.curarAgravado(o, fila(6, 6, 6)).ok);
R.novaNoite(o, fila(6));
t.ok("noite nova (com despertar) libera de novo", R.curarAgravado(o, fila(6, 6, 6)).ok && o.vitalidade.agravado === 0);

/* =====================================================================
   DANO
   ===================================================================== */
t.grupo("Dano · metade, conversão, Debilitação, Torpor");
o = brujah(); R.concluirCriacao(o);
R.sofrerDano(o, { trilha: "vitalidade", tipo: "superficial", valor: 5 });
t.igual("Superficial 5 → 3 (metade, arred. para cima)", o.vitalidade.superficial, 3);
R.sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: 2 });
t.iguais("Agravado não divide", [o.vitalidade.superficial, o.vitalidade.agravado], [3, 2]);
let d1 = R.sofrerDano(o, { trilha: "vitalidade", tipo: "superficial", valor: 2 });
t.ok("trilha cheia: Debilitado", d1.eventos.some((e) => e.tipo === "debilitado") && R.calcular(o).vitalidade.debilitado);
R.sofrerDano(o, { trilha: "vitalidade", tipo: "superficial", valor: 2 });
t.iguais("cada dano a mais converte 1 Superficial em Agravado", [o.vitalidade.superficial, o.vitalidade.agravado], [3, 3]);
let dt = R.sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: 3 });
t.ok("Vitalidade toda Agravada: vampiro em Torpor", o.estado.torpor && dt.eventos.some((e) => e.tipo === "torpor"));
dt = R.sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: 1, fonte: "fogo" });
t.ok("em Torpor, fogo: Morte Final, a ficha fica", o.estado.morteFinal && o.atributos.forca === 4);
o = brujah(); R.concluirCriacao(o);
R.gastarForcaDeVontade(o, 1);
R.gastarForcaDeVontade(o, 1);
t.igual("gasto voluntário não divide", o.forcaDeVontade.superficial, 2);
R.gastarForcaDeVontade(o, 1); R.gastarForcaDeVontade(o, 1);
t.iguais("gastando com tudo Superficial, vira Agravado", [o.forcaDeVontade.superficial, o.forcaDeVontade.agravado], [2, 1]);
let mort = R.fichaVazia("mortal");
mort.atributos.vigor = 2;
R.sofrerDano(mort, { trilha: "vitalidade", tipo: "agravado", valor: 5 });
t.igual("mortal com a Vitalidade toda Agravada: morte, não Torpor", R.calcular(mort).estado, "morte");
o = brujah(); o.disciplinas.fortitude = 2; o.poderes.push({ id: "f", chave: "resiliencia" }, { id: "g", chave: "tenacidade" });
t.igual("Resiliência soma Fortitude à Vitalidade", R.calcular(o).vitalidade.max, 8);
R.adicionarEfeito(o, { chave: "tenacidade", nome: "Tenacidade", origem: { tipo: "poder", chave: "tenacidade" }, duracao: "cena" });
R.sofrerDano(o, { trilha: "vitalidade", tipo: "superficial", valor: 5 });
t.igual("Tenacidade: 5 − 2 = 3 antes de dividir → 2", o.vitalidade.superficial, 2);

t.grupo("Estaca, sol, Torpor");
o = brujah(); R.concluirCriacao(o);
R.estaquear(o);
t.ok("estacado: paralisado, consciente", o.estado.estacado && R.calcular(o).estado === "estacado");
t.ok("estacado não usa Disciplina física", !R.rolarTeste(o, { atributo: "forca", disciplina: "potencia", dificuldade: 1 }, fila(6, 6, 6, 6, 6, 6)).ok);
ralo.estado.estacado = false;
t.ok("sangue-ralo não fica paralisado pela estaca", R.estaquear(ralo).eventos.some((e) => e.tipo === "estacaSemEfeito") && !ralo.estado.estacado);
o = brujah(); R.concluirCriacao(o);
R.luzDoSol(o);
t.igual("sol: Agravado = Gravidade da Perdição (2)", o.vitalidade.agravado, 2);
R.luzDoSol(ralo);
t.igual("sol no sangue-ralo: 1 Superficial", ralo.vitalidade.superficial, 1);
o = brujah(); R.concluirCriacao(o); R.entrarEmTorpor(o, "voluntario");
t.ok("Torpor pela Humanidade 6: um mês", o.estado.torpor.dias === 30);
t.ok("não desperta antes do tempo", !R.despertarDoTorpor(o, "tempo").ok);
t.ok("sangue mais potente interrompe, Fome 4", R.despertarDoTorpor(o, "sangue").ok && o.fome === 4);

/* =====================================================================
   HUMANIDADE
   ===================================================================== */
t.grupo("Humanidade · Máculas, Remorso, Degeneração, zero");
o = brujah(); R.concluirCriacao(o);
R.adicionarMaculas(o, 2, "violou um Princípio");
t.igual("2 Máculas", o.maculas, 2);
let rm = R.testarRemorso(o, fila(1, 6));
t.ok("Remorso usa os espaços vazios (10 − 6 − 2 = 2), sem Fome; sucesso mantém", rm.resultado.parada === 2 && rm.resultado.fome === 0 && R.humanidade(o) === 6 && o.maculas === 0);
R.adicionarMaculas(o, 1, "x");
rm = R.testarRemorso(o, fila(1, 1, 1));
t.ok("sem sucesso: −1 Humanidade, Máculas limpas", R.humanidade(o) === 5 && o.maculas === 0);
R.adicionarMaculas(o, 5, "x");
rm = R.testarRemorso(o, fila(3));
t.ok("sem espaço vazio: mínimo 1 dado", rm.resultado.parada === 1);
o = brujah(); R.concluirCriacao(o);
let dg = R.adicionarMaculas(o, 6, "atroz");
t.ok("excesso de Máculas: Degeneração, Agravado à FdV por Mácula que não coube", o.estado.degeneracao && o.forcaDeVontade.agravado === 2 && dg.eventos.some((e) => e.tipo === "degeneracao" && e.excesso === 2));
par = R.montarParada(o, { atributo: "carisma", habilidade: "persuasao" });
t.ok("Degeneração: −2 em todas as paradas", par.composicao.some((x) => x.fonte === "Degeneração"));
R.adicionarMaculas(o, 1, "convicção", { convicao: true, mitigar: 1 });
t.igual("Convicção mitiga a Mácula", o.maculas, 6);
o = brujah(); R.concluirCriacao(o);
o.ajustes.push({ id: "z", tipo: "humanidade", valor: -5, origem: "teste" });
let hz = R.mudarHumanidade(o, -1, "remorso", "x");
t.ok("Humanidade 0: wassail, frenesi, a ficha fica", o.estado.wassail && o.estado.frenesi && hz.eventos.some((e) => e.tipo === "humanidadeZero") && o.conceito === "Punk");
o = brujah(); R.concluirCriacao(o);
let ep = R.eventoDePilar(o, "pi1", "pilarDestruidoPorVoce");
t.ok("Pilar destruído pelas suas ações: 3 Máculas e o registro", o.maculas === 3 && o.pilares[0].estado === "destruido" && ep.eventos.some((e) => e.tipo === "pilarDestruido"));
let tp = R.transferirPilar(o, "pi1", "Sobrinho", fila(1, 1, 1, 1, 1, 1));
t.ok("transferência falha: a Convicção se perde, sem trocar a relação em silêncio", !tp.resultado.classificacao.vitoria && o.convicoes[0].perdida && o.pilares.length === 1);

/* =====================================================================
   FRENESI E COMPULSÕES
   ===================================================================== */
t.grupo("Frenesi e Compulsões são estados diferentes");
o = brujah(); R.concluirCriacao(o);
let pf = R.paradaDeFrenesi(o, "furia");
t.igual("frenesi de fúria: FdV 3 + 1/3 Humanidade 2 − Perdição Brujah 2 = 3", pf.total, 3);
let tf = R.testarFrenesi(o, { tipo: "furia", dificuldade: 2 }, fila(6, 6, 1));
t.ok("vitória comum: resiste, perde o turno", tf.resistiu && tf.eventos.some((e) => e.tipo === "frenesiResistido" && e.perdeTurno));
tf = R.testarFrenesi(o, { tipo: "furia", dificuldade: 3 }, fila(6, 1, 1));
t.ok("falha: entra em frenesi", !tf.resistiu && o.estado.frenesi && o.estado.frenesi.tipo === "furia");
t.ok("em frenesi não ganha Compulsão", !R.iniciarCompulsao(o, "dano").ok);
t.ok("em frenesi a FdV não rerrola", !R.rerrolarComFdV(o, R.rolarTeste(o, { atributo: "forca", habilidade: "briga", dificuldade: 1 }, fila(1, 1, 1, 1, 1, 1, 1, 1)).resultado, [0], fila(6)).ok);
R.fimDaCena(o);
t.ok("o frenesi acaba com a cena", !o.estado.frenesi);
let ci = R.iniciarCompulsao(o, "aleatoria", fila(10));
t.ok("tabela: 10 = Compulsão de clã (Brujah: Rebelião)", ci.ok && o.estado.compulsao.cla && o.estado.compulsao.chave === "rebeliao");
par = R.montarParada(o, { atributo: "carisma", habilidade: "persuasao" });
t.ok("Rebelião: −2 em todas", par.composicao.some((x) => /Rebelião/.test(x.fonte) && x.valor === -2));
R.encerrarCompulsao(o, "fez o oposto do esperado");
t.ok("encerrada ao registrar o cumprimento", !o.estado.compulsao);
let cc = R.fichaVazia("vampiro"); cc.cla = "caitiff"; cc.fome = 2;
R.iniciarCompulsao(cc, "aleatoria", fila(10, 2));
t.igual("Caitiff: o 10 é rerrolado (sem Compulsão de clã)", cc.estado.compulsao.chave, "fome");
R.alimentar(cc, { fonte: "humanoGoles" }, fila());
t.ok("Compulsão de Fome termina ao saciar", !cc.estado.compulsao);
let gang = brujah(); gang.cla = "gangrel"; gang.disciplinas = { animalismo: 2, fortitude: 1 }; R.concluirCriacao(gang);
R.entrarEmFrenesi(gang, "furia", true);
R.encerrarFrenesi(gang, "fim", [{ atributo: "inteligencia" }]);
t.ok("Gangrel curtindo a onda: um aspecto só, −1 num Atributo", R.calcular(gang).atributos.inteligencia.valor === 1 && R.temEfeito(gang, "aspectosAnimais"));
R.novaNoite(gang, fila(6));
t.ok("o aspecto dura até uma noite depois", R.temEfeito(gang, "aspectosAnimais"));
R.novaNoite(gang, fila(6));
t.ok("…e some na segunda noite", !R.temEfeito(gang, "aspectosAnimais"));
let tre = brujah(); tre.cla = "tremere"; R.concluirCriacao(tre);
R.iniciarCompulsao(tre, "cla");
rt = R.rolarTeste(tre, { atributo: "inteligencia", habilidade: "persuasao", dificuldade: 1 }, fila(10, 10, 1, 1));
R.concluirTeste(tre, rt.resultado);
t.ok("Perfeccionismo termina numa vitória crítica de Habilidade", !tre.estado.compulsao);

/* =====================================================================
   ALIMENTAÇÃO
   ===================================================================== */
t.grupo("Alimentação · fontes e Potência");
o = brujah(); R.concluirCriacao(o); o.fome = 4;
let pa = R.planejarAlimentacao(o, { fonte: "humanoSemDano" });
t.ok("planejar não muda nada", pa.ok && pa.fomeFinal === 2 && o.fome === 4);
R.alimentar(o, { fonte: "humanoSemDano", ressonancia: { tipo: "colerica", temperamento: "intenso" } }, fila());
t.ok("sacia 2; Ressonância colérica intensa", o.fome === 2 && o.ressonancia.tipo === "colerica");
par = R.montarParada(o, { atributo: "forca", disciplina: "potencia" });
t.ok("Ressonância intensa: +1 na Disciplina correspondente", par.composicao.some((x) => x.tipo === "ressonancia"));
o.fome = 3;
t.ok("matar exige confirmação", !R.alimentar(o, { fonte: "humanoDrenado" }, fila()).ok);
R.alimentar(o, { fonte: "humanoDrenado", confirmarMorte: true }, fila());
t.igual("só drenar e matar chega a Fome 0", o.fome, 0);
o.fome = 2;
R.alimentar(o, { fonte: "humanoFerido", quantidade: 2 }, fila());
t.igual("sem matar, Fome mínima 1", o.fome, 1);
o.potenciaBase = 3; o.fome = 3;
pa = R.planejarAlimentacao(o, { fonte: "animalGrande" });
t.ok("Potência 3: animal não sacia", pa.sacia === 0 && pa.fomeFinal === 3);
o.potenciaBase = 2; o.fome = 3;
R.alimentar(o, { fonte: "animalMedio" }, fila());
t.ok("Potência 2: animal sacia a metade (precisa do dobro)", o.fome === 3 && o.fracaoDeFome === 1);
R.alimentar(o, { fonte: "animalMedio" }, fila());
t.ok("…dois animais saciam 1", o.fome === 2 && o.fracaoDeFome === 0);
o.geracao = 10; o.potenciaBase = 4; o.fome = 4;
pa = R.planejarAlimentacao(o, { fonte: "humanoSemDano" });
t.igual("Potência 4: humano sacia 1 a menos", pa.sacia, 1);
o.geracao = 13; o.potenciaBase = 1; o.fome = 4;
pa = R.planejarAlimentacao(o, { fonte: "vampiro", fomeDoDoador: 2, potenciaDoDoador: 4 });
t.igual("doador com 2+ de Potência acima: sacia o dobro", pa.sacia, 4);
pa = R.planejarAlimentacao(o, { fonte: "vampiro", fomeDoDoador: 2, potenciaDoDoador: 1 });
t.igual("mesma Potência: 1 por ponto", pa.sacia, 2);
let vent = brujah(); vent.cla = "ventrue"; R.concluirCriacao(vent); vent.fome = 3;
pa = R.planejarAlimentacao(vent, { fonte: "humanoGoles" });
t.ok("Ventrue fora da preferência: custo em FdV = Gravidade", pa.custos.some((c) => c.tipo === "forcaDeVontade" && c.valor === 2));
o.fome = 2; o.ressonancia = { tipo: "sanguinea", temperamento: "agudo", discrasia: "", fonte: "" };
R.aumentarFome(o, 3);
t.ok("Fome 5: a Ressonância acaba", !o.ressonancia);

t.grupo("Laços de Sangue");
o = brujah(); R.concluirCriacao(o);
R.beberDeVampiro(o, "anc", "Ancião");
R.beberDeVampiro(o, "anc", "Ancião");
t.igual("na mesma noite não conta duas vezes", o.lacos[0].forca, 1);
R.novaNoite(o, fila(6)); R.beberDeVampiro(o, "anc", "Ancião");
R.novaNoite(o, fila(6)); let lc = R.beberDeVampiro(o, "anc", "Ancião");
t.ok("três noites: Laço completo", o.lacos[0].forca === 3 && lc.eventos.some((e) => e.completo));
R.enfraquecerLacos(o, 1);
t.igual("um mês sem beber: −1", o.lacos[0].forca, 2);

/* =====================================================================
   EXPERIÊNCIA
   ===================================================================== */
t.grupo("Experiência · cada nível cobrado");
o = brujah(); R.concluirCriacao(o);
t.igual("Força de Vontade não é comprável (não há custo)", C.CUSTOS_XP.forcaDeVontade, undefined);
t.igual("Atributo 2 → 4: 15 + 20 = 35", R.custoDeCompra(o, "atributo", "carisma", 3, 4) + R.custoDeCompra(o, "atributo", "carisma", 2, 3), 35);
t.igual("Disciplina do clã 1 → 3: 10 + 15 = 25", R.custoDeCompra(o, "disciplina", "celeridade", 1, 3), 25);
t.igual("Disciplina de fora 0 → 2: 7 + 14 = 21", R.custoDeCompra(o, "disciplina", "dominacao", 0, 2), 21);
o.xp.recebido = 100;
let cp = R.comprar(o, { tipo: "habilidade", alvo: "medicina", para: 2 });
t.ok("Medicina 0 → 2: 3 + 6 = 9 XP", cp.ok && cp.compra.custo === 9 && R.valorDeHabilidade(o, "medicina") === 2);
t.ok("Potência acima do limite da geração é recusada", !R.comprar(o, { tipo: "potencia", para: 4 }).ok);
t.ok("Humanidade sem autorização do Narrador é recusada", !R.comprar(o, { tipo: "humanidade", para: 7 }).ok);
t.ok("Disciplina sem a Ressonância é recusada", !R.comprar(o, { tipo: "disciplina", alvo: "presenca", para: 1, poderes: ["fascinio"] }).ok);
cp = R.comprar(o, { tipo: "disciplina", alvo: "presenca", para: 1, poderes: ["fascinio"], ressonancia: true });
t.ok("Presença 1 com o poder escolhido", cp.ok && R.temPoder(o, "fascinio"));
t.ok("nível 2 exige poder de nível ≤ 2", !R.comprar(o, { tipo: "disciplina", alvo: "presenca", para: 2, poderes: ["majestade"], ressonancia: true }).ok);
t.ok("amálgama: Centelha de Fúria exige Presença 3", !R.podeAdquirirPoder(o, "centelhaDeFuria", { disciplina: "potencia", nivel: 3 }).ok);
t.ok("especialização além do valor da Habilidade é recusada", R.comprar(o, { tipo: "especializacao", alvo: "medicina", nome: "Flebotomia" }).ok && R.comprar(o, { tipo: "especializacao", alvo: "medicina", nome: "Cirurgia" }).ok && !R.comprar(o, { tipo: "especializacao", alvo: "medicina", nome: "Trauma" }).ok);
t.ok("Força de Vontade não se compra direto", !R.comprar(o, { tipo: "forcaDeVontade", para: 5 }).ok);
t.igual("25 Fichas de Conhecimento catalogadas", Object.keys(C.FICHAS_DE_CONHECIMENTO).length, 25);
t.ok("Ficha de clã: Descendente de Hardestadt é só Ventrue", !R.comprar(o, { tipo: "ficha", alvo: "hardestadt", para: 1 }).ok);
cp = R.comprar(o, { tipo: "ficha", alvo: "tyler", para: 3 });
t.ok("nível 3 de uma Ficha custa 3 pontos (9 XP) e não concede os anteriores", cp.ok && cp.compra.custo === 9 && o.fichas.length === 1 && o.fichas[0].nivel === 3);
t.ok("o mesmo nível não se compra duas vezes", !R.comprar(o, { tipo: "ficha", alvo: "tyler", para: 3 }).ok);
t.igual("Ficha desconhecida é descartada ao normalizar", R.normalizar(Object.assign({}, o, { fichas: [{ ficha: "inventada", nivel: 1 }] })).fichas.length, 0);
const antes = R.calcular(o).xp.disponivel;
o.xp.recebido = 0;
t.ok("sem XP, recusa e não gasta", !R.comprar(o, { tipo: "atributo", alvo: "vigor", para: 4 }).ok && R.calcular(o).xp.gasto === 115 - antes);

/* =====================================================================
   PODERES, RITUAIS, ALQUIMIA
   ===================================================================== */
t.grupo("Poderes · ativação, custo, expiração");
o = brujah(); R.concluirCriacao(o); o.fome = 1;
let ap = P.ativarPoder(o, "poderio", {}, fila(6));
t.ok("Poderio: 1 Checagem, efeito de cena", ap.ok && R.temEfeito(o, "poderio") && o.fome === 1);
par = R.montarParada(o, { atributo: "forca", habilidade: "atletismo", contexto: ["forcaBruta"] });
t.ok("Poderio ativo soma Potência a feitos de Força", par.composicao.some((x) => x.poder === "poderio" && x.valor === 2));
R.fimDaCena(o);
t.ok("expira no fim da cena", !R.temEfeito(o, "poderio"));
t.ok("poder passivo não se ativa", !P.ativarPoder(o, "corpoLetal", {}, fila()).ok);
t.ok("sem o poder, recusa", !P.ativarPoder(o, "majestade", {}, fila()).ok);
o.fome = 5;
t.ok("Fome 5: não ativa poder com custo", !P.ativarPoder(o, "poderio", {}, fila(6)).ok);
let pres = brujah(); pres.disciplinas = { presenca: 2, celeridade: 1 }; pres.poderes = [{ id: "a", chave: "fascinio" }, { id: "b", chave: "amedrontar" }, { id: "c", chave: "reflexosRapidos" }]; R.concluirCriacao(pres);
R.adicionarEfeito(pres, { chave: "fascinio", nome: "Fascínio", origem: { tipo: "poder", chave: "fascinio" }, duracao: "cena" });
R.adicionarEfeito(pres, { chave: "transe", nome: "Transe", origem: { tipo: "poder", chave: "transe" }, duracao: "cena" });
par = R.montarParada(pres, { atributo: "carisma", habilidade: "persuasao" });
t.igual("Presença não se acumula: Fascínio entra uma vez", par.composicao.filter((x) => x.tipo === "poder").length, 1);
let sb = brujah(); sb.disciplinas = { animalismo: 3 }; sb.poderes = [{ id: "a", chave: "sentirABesta" }, { id: "b", chave: "sussurrosSelvagens" }, { id: "c", chave: "subjugarABesta" }]; R.concluirCriacao(sb); sb.fome = 1;
let at = P.ativarPoder(sb, "subjugarABesta", { oposicao: 2 }, fila(6, 7, 7, 1, 1, 1, 1));
t.ok("poder com parada: resultado pendente para a mesa julgar", at.ok && at.resultado && at.resultado.pendente);
let rp = P.resolverPoder(sb, at.resultado);
t.ok("resolvido com vitória: efeito aplicado", rp.ok && R.temEfeito(sb, "subjugarABesta"));

t.grupo("Rituais e Alquimia");
let tr = brujah(); tr.cla = "tremere"; tr.disciplinas = { feiticaria: 2, auspicios: 1 };
tr.poderes = [{ id: "a", chave: "umGostoPorSangue" }, { id: "b", chave: "extinguirVitae" }, { id: "c", chave: "sentidosAgucados" }];
tr.rituais = [{ id: "r1", chave: "andarilhoDoFogo", origem: "xp" }, { id: "r2", chave: "despertarComFrescor", origem: "criacao" }];
R.concluirCriacao(tr); tr.fome = 1;
t.ok("Ritual de nível 3 exige Feitiçaria 3", !P.executarRitual(tr, "andarilhoDoFogo", {}, fila(6)).ok);
let er = P.executarRitual(tr, "despertarComFrescor", {}, fila(6, 7, 7, 1, 1, 1));
t.ok("Ritual nível 1: Checagem e Inteligência + Feitiçaria contra Dif 2", er.ok && er.resultado.dificuldade === 2);
let rr2 = P.resolverRitual(tr, er.resultado);
t.ok("efeito ativo do Ritual", rr2.ok && R.temEfeito(tr, "despertarComFrescor"));
let al = R.fichaVazia("vampiro"); Object.assign(al, { cla: "sangueRalo", geracao: 14, idade: "crianca" });
al.sangueRalo = { qualidades: ["alquimista"], defeitos: ["carneMorta"] }; al.disciplinas = { alquimia: 1 }; al.metodoAlquimia = "fixatio";
al.formulas = [{ id: "f", chave: "neblina", origem: "criacao" }]; al.atributos.inteligencia = 3; al.fome = 1;
let ds = P.destilar(al, "neblina", { laboratorio: true }, fila(6, 6, 6, 6, 6));
t.ok("destilar cobra a Checagem do Alquimista e rola Inteligência + Alquimia", ds.ok && ds.resultado.parada === 4);
let cd = P.concluirDestilacao(al, ds.resultado);
t.ok("4 sucessos: a fórmula funciona e fica guardada", cd.ok && cd.pronta.qualidade === "funciona");
let af = P.ativarFormula(al, cd.pronta.id, {}, fila(6));
t.ok("ativar paga a ativação (outra Checagem) e consome a dose", af.ok && R.temEfeito(al, "neblina") && cd.pronta.consumida);
t.ok("a mesma dose não se usa duas vezes", !P.ativarFormula(al, cd.pronta.id, {}, fila(6)).ok);
t.ok("Fixatio sem laboratório: fórmula de nível 4 recusada", !(() => { al.formulas.push({ id: "g", chave: "impetoAereo" }); al.disciplinas.alquimia = 4; return P.destilar(al, "impetoAereo", {}, fila(6)); })().ok);

/* =====================================================================
   RESSONÂNCIA, DIABLERIE
   ===================================================================== */
t.grupo("Ressonância e sangue-ralo");
let rx = R.ressonanciaAleatoria(fila(9, 9, 10));
t.iguais("d10 9 → intenso potencialmente agudo; 9 → agudo; 10 → sanguínea", [rx.temperamento, rx.tipo], ["agudo", "sanguinea"]);
rx = R.ressonanciaAleatoria(fila(3));
t.igual("1–5: sem Ressonância", rx.tipo, "");
let r2 = R.fichaVazia("vampiro"); Object.assign(r2, { cla: "sangueRalo", geracao: 14 }); r2.fome = 3;
R.alimentar(r2, { fonte: "humanoSemDano", ressonancia: { tipo: "colerica", temperamento: "intenso", disciplina: "potencia", poderes: ["corpoLetal", "poderio"] } }, fila());
t.igual("sangue-ralo: Ressonância intensa dá 2 pontos temporários na Disciplina", R.valorDeDisciplina(r2, "potencia"), 2);
R.aumentarFome(r2, 5);
t.igual("…que somem com Fome 5", R.valorDeDisciplina(r2, "potencia"), 0);

t.grupo("Diablerie em etapas");
o = brujah(); R.concluirCriacao(o);
let est = { vitorias: 0, potenciaDaVitima: 2 };
let dbt = R.diablerieTurno(o, est, fila(6, 6, 6, 1, 1, 1, 1));
t.ok("cada turno: Força + Determinação Dif 3", dbt.ok && est.vitorias === 1 && !est.encerrada);
dbt = R.diablerieTurno(o, est, fila(1, 1, 1, 1, 1));
t.ok("uma falha apaga a centelha (sem diablerie)", est.encerrada && est.apagada && !est.consumada);
o = brujah(); R.concluirCriacao(o);
let dc = R.diablerieConsumada(o, { determinacao: 1, potencia: 2, geracao: 11, disciplinas: ["dominacao"] }, fila(6, 6, 6, 6, 6, 6, 6, 6, 1, 1, 1));
t.ok("consumada: −1 Humanidade e XP restrita às Disciplinas da vítima", R.humanidade(o) === 5 && Object.values(o.xp.creditos).some((c) => c.restrito.disciplinas.includes("dominacao")));
t.igual("geração cai um passo", o.geracao, 12);

/* =====================================================================
   MOMENTOS E IDEMPOTÊNCIA
   ===================================================================== */
t.grupo("Momentos · sessão não é noite");
o = brujah(); R.concluirCriacao(o);
o.forcaDeVontade.superficial = 3;
R.inicioDaSessao(o, { continuaCena: true });
t.igual("sessão que continua a cena: FdV fica", o.forcaDeVontade.superficial, 3);
R.inicioDaSessao(o, {});
t.igual("sessão nova: recupera max(Autocontrole, Determinação) = 2", o.forcaDeVontade.superficial, 1);
t.igual("começar sessão não é despertar: a noite não anda", o.tempo.noite, 0);
t.ok("Desejo: 1 vez por sessão", R.cumprirDesejo(o).ok && !R.cumprirDesejo(o).ok);
o.forcaDeVontade.agravado = 1;
R.fimDaSessao(o, { ambicao: true, xp: 1 }, fila());
t.ok("fim da sessão com a Ambição: 1 Agravado de FdV; XP recebida", o.forcaDeVontade.agravado === 0 && o.xp.recebido === 1);
let op = R.aplicarOperacao(o, "op-noite-1", (z) => R.novaNoite(z, fila(6)));
let op2 = R.aplicarOperacao(o, "op-noite-1", (z) => R.novaNoite(z, fila(6)));
t.ok("a mesma operação não avança a noite duas vezes", op.ok && op2.repetida && o.tempo.noite === 1);
o.marcas.noite.curaAgravado = true;
const copia = R.normalizar(JSON.parse(JSON.stringify(o)));
t.ok("normalizar (recarregar) não cura nem conta noite nova", copia.marcas.noite.curaAgravado && copia.tempo.noite === 1 && copia.forcaDeVontade.superficial === o.forcaDeVontade.superficial);
t.iguais("normalizar preserva o bloco inteiro", JSON.stringify(R.normalizar(JSON.parse(JSON.stringify(o)))).length > 1000, true);

/* =====================================================================
   CRÔNICA E ANTAGONISTAS
   ===================================================================== */
if (CR) {
  t.grupo("Crônica · estado, vista dos jogadores");
  let e = CR.normalizar({});
  CR.adicionarPrincipio(e, "Não matarás inocentes");
  const pn = CR.adicionarPN(e, { nome: "Príncipe", modelo: "harpiaDeElisio", visivel: true, notasPrivadas: "segredo" });
  const oculto = CR.adicionarPN(e, { nome: "Espião", visivel: false });
  CR.adicionarRelacao(e, { de: "pc-1", para: pn.id, tipo: "Senhor", descricao: "Abraço", visivel: true });
  CR.adicionarRelacao(e, { de: pn.id, para: "pc-1", tipo: "Inimigo secreto", visivel: false });
  CR.adicionarRelacao(e, { de: oculto.id, para: "pc-1", tipo: "Vigia", visivel: true });
  const vista = CR.vistaDosJogadores(e, ["pc-1"]);
  t.ok("PN oculto não vai para os jogadores", !vista.personagens.some((p) => p.id === oculto.id));
  t.ok("o PN visível vai sem as notas privadas", vista.personagens.some((p) => p.id === pn.id && p.notasPrivadas === undefined));
  t.ok("relação privada não vai", vista.relacoes.length === 1 && vista.relacoes[0].tipo === "Senhor");
  t.ok("relação visível com um PN oculto também não (não revela que ele existe)", !vista.relacoes.some((r) => r.de === oculto.id));
  t.ok("notas privadas nunca vão", !JSON.stringify(vista).includes("segredo"));
  t.ok("Princípios vão (são da crônica)", vista.principios.length === 1);
  const sessao = CR.iniciarSessao(e, { continuaCena: false });
  t.ok("iniciar sessão não começa noite nova", e.noite === 0 && sessao.momentos.some((m) => m.tipo === "inicioDaSessao") && !sessao.momentos.some((m) => m.tipo === "novaNoite"));
  CR.novaNoite(e);
  t.igual("noite nova, separada", e.noite, 1);
  CR.definirCoterie(e, { nome: "Os Insones", tipo: "grupoDeCaca", membros: ["pc-1", "pc-2", "pc-3", "pc-4"] });
  t.igual("Grupo de Caça: Chasse 3", e.coterie.dominio.chasse, 3);
  t.ok("custos do tipo saem da parada da coterie (1 ponto por membro)", CR.parada(e).total === 4 && CR.parada(e).gasto === 3 && CR.parada(e).livre === 1);
  t.igual("Dificuldade de caça pelo Chasse 3", C.dificuldadeDeCacaDoChasse(3), 4);
}
if (AN) {
  t.grupo("Antagonistas · fisiologias diferentes");
  t.ok("mortais, animais, vampiros e criaturas", ["mortal", "animal", "vampiro", "criatura"].every((n) => AN.LISTA.some((a) => a.natureza === n)));
  const lobo = AN.LISTA.find((a) => a.chave === "lobisomem");
  t.ok("lobisomem: Agravado só de prata e fogo, sem Fome", lobo && lobo.semFome && /prata/.test(lobo.especial));
  const carn = AN.LISTA.find((a) => a.chave === "carnical");
  t.ok("carniçal: uma Disciplina com valor 1", carn && carn.disciplinas === 1);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { for (const f of falhas) console.log("  - " + f); Deno.exit(1); }
