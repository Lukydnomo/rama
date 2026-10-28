/* =====================================================================
   R.A.M.A. — testes de Oblívio (catálogo, motor da Persona, combate,
   Ameaças, mesa e Buraco)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-oblivio.js

   Sem navegador e sem rede. Os dados são uma FILA de resultados
   combinados (rolador): cada teste diz exatamente o que cai, e o motor
   nunca sorteia sozinho. Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = [
  "js/oblivio/catalogo.js", "js/oblivio/ameacas-dados.js", "js/oblivio/buraco-dados.js",
  "js/oblivio/regras.js", "js/oblivio/combate.js", "js/oblivio/ameacas.js", "js/oblivio/mesa.js", "js/oblivio/buraco.js", "js/oblivio/habilidades.js",
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

const C = globalThis.RAMAOblivioCatalogo, R = globalThis.RAMAOblivio, K = globalThis.RAMAOblivioCombate;
const A = globalThis.RAMAOblivioAmeacas, AM = globalThis.RAMAOblivioMotorAmeacas, M = globalThis.RAMAOblivioMesa;
const B = globalThis.RAMAOblivioBuraco, BM = globalThis.RAMAOblivioMotorBuraco;

/* Uma fila de dados: cada chamada tira o próximo; acabou, é erro. */
function fila(...valores) {
  const f = valores.slice();
  const rolador = (faces) => {
    if (!f.length) throw new Error("fila de dados vazia (pediu d" + faces + ")");
    const v = f.shift();
    if (v < 1 || v > faces) throw new Error("valor " + v + " fora de d" + faces);
    return v;
  };
  rolador.restam = () => f.length;
  return rolador;
}

/* Uma Persona pronta: papel, atributos, especializações, limite
   distribuído e Habilidade Principal. */
function persona(papel, atr, regioes) {
  const o = R.fichaVazia();
  o.papel = papel;
  Object.assign(o.atributos, atr);
  const p = C.papel[papel];
  p.lista.slice(0, 3).forEach((k) => o.especializacoes.push({ id: R.novoId("es"), conhecimento: k, origem: "papel" }));
  const extra = C.CONHECIMENTOS.map((c) => c.chave).filter((k) => !o.especializacoes.some((s) => s.conhecimento === k));
  for (let i = 0; i < R.metade(o.atributos.mente); i++) o.especializacoes.push({ id: R.novoId("es"), conhecimento: extra[i], origem: "mente" });
  const lim = R.limiteTotal(o).total;
  const mapa = regioes || R.sugerirDistribuicao(o);
  o.corpo.regioes.forEach((r) => { if (mapa[r.chave] !== undefined) r.limite = mapa[r.chave]; });
  const soma = o.corpo.regioes.reduce((s, r) => s + r.limite, 0);
  if (soma !== lim) R.regiao(o, "torso").limite += lim - soma;
  R.concluirCriacao(o);
  return o;
}

/* =====================================================================
   CATÁLOGO
   ===================================================================== */
t.grupo("Oblívio · catálogo");
t.iguais("cinco Atributos Fixos", C.ATRIBUTOS.map((a) => a.nome), ["Carne", "Força", "Fuga", "Determinação", "Mente"]);
t.igual("dez Conhecimentos", C.CONHECIMENTOS.length, 10);
t.iguais("cinco Papéis com o limite do livro", C.PAPEIS.map((p) => p.nome + " " + p.estresse), ["Quem Age 15", "Quem Cuida 10", "Quem Protege 20", "Quem Resolve 15", "Quem Sabe 10"]);
t.iguais("listas de especialização do Papel (p. 54–62)", C.PAPEIS.map((p) => p.lista.join(",")), [
  "esforco,mundo,rastro,bandidagem,reflexos,duelo", "esforco,saber,mistico,rastro,social,emocional",
  "esforco,saber,mundo,rastro,reflexos,duelo", "esforco,saber,social,emocional,reflexos,duelo", "saber,mistico,mundo,rastro,emocional,duelo"]);
const nomesHab = C.HABILIDADES.map((h) => h.nome);
["Voracidade", "Ataque em Dupla", "Estocada", "Sede de Sangue", "Ajudar os Necessitados", "Abrir Feridas", "Bálsamo", "Última Esperança",
 "Escudo Humano", "Armadura de Espinhos", "Peso Pesado", "Repartir a Dor", "Dar uma Mãozinha", "Animar os Ânimos", "Cópia Barata", "Instrução Decisiva",
 "Repertório de Conhecimento", "Feedback Defensivo", "Plano de Contingência", "Ponto Fraco",
 "Aprender com a Prática", "Aumento de Atributo", "Cão Velho", "Saber é Poder", "Todos por Um"].forEach((n) => t.ok("habilidade " + n, nomesHab.includes(n)));
t.iguais("tipos de ação das habilidades conferidos nas páginas", ["voracidade", "ataqueEmDupla", "estocada", "ajudarOsNecessitados", "abrirFeridas", "darUmaMaozinha", "instrucaoDecisiva", "repertorioDeConhecimento", "feedbackDefensivo", "planoDeContingencia", "todosPorUm"].map((k) => C.habilidade[k].acao),
  ["passiva", "completa", "regular+movimento", "extra", "regular", "extra", "regular", "extra", "regular", "extra", "completa"]);
["Bandoleira", "Contrapeso", "Efetividade", "Radiante", "Vida Longa", "Empunhadura", "Extensão", "Incendiária", "Mortal", "Suporte de Carregador", "Amarra", "Bélica", "Espaçosa", "Reforço", "Versátil"].forEach((n) => t.ok("modificação " + n, C.MODIFICACOES.some((m) => m.nome === n)));
["Botando para Fora", "Carne Fraca", "Confusão", "Coragem Cega", "Ferida", "Fome", "Jura de Morte", "Lentidão", "No Chão", "No Escuro", "Pavor", "Pegando Fogo", "Sem Fôlego", "Sem Reação"].forEach((n) => t.ok("mazela " + n, C.MAZELAS.some((m) => m.nome === n)));
t.iguais("Fardos 1–6", C.FARDOS.map((f) => f.nome), ["Guilhotina", "Deterioração", "Covardia", "Mal das Pernas", "Fragilidade", "Ataque Cardíaco"]);
t.igual("catálogo de equipamentos (p. 67–76): 31 itens", C.EQUIPAMENTOS.length, 31);
t.iguais("armas e dano (conferidos na imagem)", C.EQUIPAMENTOS.filter((e) => e.classe === "arma").map((e) => e.nome + " " + e.dano + " " + e.peso), [
  "Arremessável 1d4 leve", "Disparo Médio 1d6 leve", "Lâmina Curta 1d2 leve", "Lâmina de Guerra 2d4 leve", "Taco 1d4 leve",
  "Corda 1d6 media", "Disparo Longo 1d8 media", "Lâmina Longa 2d6 media", "Disparo Absoluto 1d10 pesada", "Haste Grande 1d10 pesada"]);
t.iguais("proteções: bônus e limite (p. 75–76)", C.EQUIPAMENTOS.filter((e) => e.bonusProtecao).map((e) => e.nome + " +" + e.bonusProtecao + "/" + e.limiteEstresse), [
  "Escudo Leve +1/5", "Vestimenta Leve +2/6", "Escudo Médio +2/9", "Vestimenta Média +3/10", "Escudo Pesado +3/14", "Vestimenta Pesada +4/15"]);
t.igual("página do PDF a partir da impressa", C.paginaDoPdf(48) + "/" + C.paginaDoPdf(126) + "/" + C.paginaDoPdf(13), "44/122/11");

/* =====================================================================
   CRIAÇÃO E FÓRMULAS
   ===================================================================== */
t.grupo("Oblívio · criação de cada Papel");
const exemplosDoLivro = {
  age: { carne: 0, forca: 0, fuga: 6, determinacao: 2, mente: 2 },
  protege: { carne: 4, forca: 4, fuga: 0, determinacao: 2, mente: 0 },
  sabe: { carne: 2, forca: 0, fuga: 2, determinacao: 2, mente: 4 },
  cuida: { carne: 3, forca: 0, fuga: 1, determinacao: 2, mente: 4 },
  resolve: { carne: 2, forca: 2, fuga: 2, determinacao: 3, mente: 1 },
};
const limitesEsperados = { age: 15, protege: 24, sabe: 12, cuida: 13, resolve: 17 };
for (const papel of Object.keys(exemplosDoLivro)) {
  const o = persona(papel, exemplosDoLivro[papel]);
  const v = R.validarCriacao(o);
  t.ok(C.papel[papel].nome + ": criação válida", v.ok, JSON.stringify(v.erros));
  t.igual("  limite = base do Papel + Carne", R.limiteTotal(o).total, limitesEsperados[papel]);
  t.ok("  Habilidade Principal concedida", R.temHabilidade(o, C.papel[papel].principal));
  t.igual("  só a Principal (adicionais dependem da Testemunha)", o.habilidades.length, 1);
  t.igual("  3 + metade de Mente especializações", o.especializacoes.length, 3 + R.metade(o.atributos.mente));
}
{
  const o = persona("sabe", exemplosDoLivro.sabe);
  t.igual("Ana (Quem Sabe): Mente 4 dá 2 especializações extras (p. 24)", o.especializacoes.filter((s) => s.origem === "mente").length, 2);
  t.igual("Ana: limite 12 (p. 41)", R.limiteTotal(o).total, 12);
  const m = R.calcularMutaveis(o);
  t.igual("Coragem inicial (DET 2 + MEN 4)/2 = 3", o.coragem, 3);
  t.igual("Proteção (CAR 2 + FUG 2)/2 = 2", m.protecao.total, 2);
  const j = persona("protege", exemplosDoLivro.protege);
  t.igual("Juliana: Fôlego (CAR 4 + DET 2)/2 = 3 (p. 21)", R.calcularMutaveis(j).folego.total, 3);
  const ar = persona("age", exemplosDoLivro.age);
  t.igual("Arthur: Velocidade (FUG 6 + DET 2)/2 = 4 (p. 35)", R.calcularMutaveis(ar).velocidade.total, 4);
  ar.escolhas.dano = "fuga";
  t.igual("Arthur: Dano (FOR 0 + FUG 6)/2 = 3 com Fuga (p. 36)", R.calcularMutaveis(ar).dano.total, 3);
  ar.escolhas.dano = "carne";
  t.igual("  e 0 com Carne — a escolha fica registrada", R.calcularMutaveis(ar).dano.total, 0);
  const impar = R.fichaVazia(); impar.atributos = { carne: 3, forca: 4, fuga: 3, determinacao: 0, mente: 0 };
  t.igual("arredonda para baixo: (3+3)/2=3, (4+3)/2=3", R.calcularMutaveis(impar).protecao.total + "/" + R.calcularMutaveis(impar).dano.total, "3/3");
}
{
  const o = persona("age", exemplosDoLivro.age);
  o.atributos.fuga = 7;
  t.ok("11 pontos: recusado", !R.validarCriacao(o).ok);
  o.atributos.fuga = 6; o.atributos.mente = 11; o.atributos.fuga = -5;
  t.ok("fora de 0 a 10: recusado", R.validarCriacao(o).erros.some((e) => e.campo === "fuga" || e.campo === "mente"));
  const p2 = persona("cuida", exemplosDoLivro.cuida);
  p2.especializacoes[0].conhecimento = "duelo";
  t.ok("especialização do Papel fora da lista: recusada", !R.validarCriacao(p2).ok);
  const p3 = persona("protege", exemplosDoLivro.protege);
  R.regiao(p3, "bracoE").limite = 0;
  t.ok("região presente com 0: recusada", R.validarCriacao(p3).erros.some((e) => e.campo === "corpo"));
  const p4 = persona("protege", exemplosDoLivro.protege);
  R.regiao(p4, "torso").limite += 2;
  t.ok("limite distribuído além do total: recusado", R.validarCriacao(p4).erros.some((e) => /Tire 2/.test(e.texto)));
  const sug = persona("sabe", exemplosDoLivro.sabe);
  const antes = JSON.stringify(sug.corpo.regioes.map((r) => r.limite));
  R.sugerirDistribuicao(sug);
  t.igual("sugerir distribuição não sobrescreve o que foi escolhido", JSON.stringify(sug.corpo.regioes.map((r) => r.limite)), antes);
  t.igual("dois Quem Age no grupo não são proibidos", R.validarCriacao(persona("age", exemplosDoLivro.age)).ok && R.validarCriacao(persona("age", exemplosDoLivro.age)).ok, true);
}
{
  /* Equipamento inicial (p. 67): conta os carregados também. */
  const o = persona("protege", { carne: 2, forca: 2, fuga: 2, determinacao: 2, mente: 2 });
  ["fogueira", "racao", "laminaDeGuerra", "vestimentaLeve"].forEach((k) => R.adicionarItem(o, k));
  t.igual("7 espaços (5 + Carne 2)", R.espacosDeInventario(o).total, 7);
  t.ok("Fogueira+Ração+Lâmina+Vestimenta = 7: cabe (exemplo da p. 67)", R.validarCriacao(o).ok, JSON.stringify(R.validarCriacao(o).erros));
  R.adicionarItem(o, "estimulante");
  t.ok("mais um Estimulante: passa do limite, mesmo que algo vá carregado", R.validarCriacao(o).erros.some((e) => e.campo === "equipamentos"));
  const forte = persona("age", { carne: 0, forca: 4, fuga: 2, determinacao: 2, mente: 2 });
  R.adicionarItem(forte, "laminaLonga");
  t.ok("arma média sem Força 5: recusada", R.validarCriacao(forte).erros.some((e) => /Força 5/.test(e.texto)));
}

/* =====================================================================
   ZONA DE ACERTO E TESTES
   ===================================================================== */
t.grupo("Oblívio · Zona de Acerto e Testes de Conhecimento");
const tabela = [];
for (const dif of ["reduzida", "normal", "aumentada"]) {
  const linha = [];
  for (let v = 1; v <= 20; v++) linha.push(K.classificarD20(v, dif, 0)[0] + K.classificarD20(v, dif, 0).slice(-6, -5));
  tabela.push(linha);
}
t.igual("Reduzida: 1 FE, 2–9 FR, 10–19 SR, 20 SE", ["reduzida"].map(() => [1, 2, 9, 10, 19, 20].map((v) => K.classificarD20(v, "reduzida", 0)).join(","))[0], "falhaExtrema,falhaRegular,falhaRegular,sucessoRegular,sucessoRegular,sucessoExtremo");
t.igual("Normal: 2–12 FR, 13–19 SR", [12, 13, 19].map((v) => K.classificarD20(v, "normal", 0)).join(","), "falhaRegular,sucessoRegular,sucessoRegular");
t.igual("Aumentada: 2–15 FR, 16–19 SR", [15, 16].map((v) => K.classificarD20(v, "aumentada", 0)).join(","), "falhaRegular,sucessoRegular");
{
  const ana = persona("sabe", exemplosDoLivro.sabe);
  const mont = K.montarTeste(ana, "mundo", {});
  const r = K.rolarTeste(ana, mont, fila(11));
  t.igual("Ana, Mundo especializado: 11 + 2 = 13, Sucesso Regular (p. 48)", r.total + " " + r.resultado, "13 sucessoRegular");
  t.ok("  mostra dado original, bônus e total", r.faces[0] === 11 && r.somaBonus === 2 && r.bonus[0].fonte === "Especialização");
  ana.ajustes.bonusEspecializacao = 3;
  t.igual("ajuste da mesa +3 (p. 40): 11 + 3 = 14", K.rolarTeste(ana, K.montarTeste(ana, "mundo", {}), fila(11)).total, 14);
  ana.ajustes.bonusEspecializacao = 2;
  const ju = persona("protege", exemplosDoLivro.protege);
  const aumentado = K.rolarTeste(ju, K.montarTeste(ju, "esforco", { dificuldade: "aumentada" }), fila(14));
  t.igual("Esforço aumentado especializado: 14 + 2 = 16, sucesso (p. 52)", aumentado.resultado, "sucessoRegular");
  const nat19 = K.rolarTeste(ju, K.montarTeste(ju, "esforco", {}), fila(19));
  t.igual("total 21 conta como Sucesso Extremo (C6)", nat19.resultado, "sucessoExtremo");
  ju.coragem = 5;
  R.gastarCoragem(ju, "reduzirExtremo", { valor: 2 });
  const r18 = K.rolarTeste(ju, K.montarTeste(ju, "social", {}), fila(18));
  t.igual("Reduzir Extremo (2): 18 vira Extremo no próximo teste", r18.resultado, "sucessoExtremo");
  t.igual("  e o efeito é consumido uma vez só", K.rolarTeste(ju, K.montarTeste(ju, "social", {}), fila(18)).resultado, "sucessoRegular");
  t.igual("  custou 2 de Coragem", ju.coragem, 3);
  R.aplicarMazela(ju, "pavor", {}, {});
  const comPavor = K.rolarTeste(ju, K.montarTeste(ju, "esforco", {}), fila(14));
  t.igual("Pavor: o bônus subtrai (14 − 2 = 12, falha)", comPavor.total + " " + comPavor.resultado, "12 falhaRegular");
  const ar = persona("age", exemplosDoLivro.age);
  R.aplicarMazela(ar, "semReacao", {}, {});
  t.igual("Sem Reação: falha automática fora do Rastro", K.rolarTeste(ar, K.montarTeste(ar, "duelo", {}), fila(20)).resultado, "falhaRegular");
  t.igual("  mas o Rastro para se recuperar rola", K.rolarTeste(ar, K.montarTeste(ar, "rastro", { recuperarSemReacao: true }), fila(15)).sucesso, true);
  const lento = persona("age", exemplosDoLivro.age);
  R.aplicarMazela(lento, "lentidao", {}, {});
  t.igual("Lentidão: Reflexos com a dificuldade aumentada", K.montarTeste(lento, "reflexos", {}).dificuldade, "aumentada");
  t.igual("  e Fuga pela metade (6 → 3)", R.atributosEfetivos(lento).fuga, 3);
  t.igual("duas reduções e um aumento: reduzida", K.combinarDificuldade("normal", [-1, -1, +1]), "reduzida");
}
t.grupo("Oblívio · disputa de testes (p. 49)");
t.igual("sucesso vence falha", K.compararDisputa({ resultado: "sucessoRegular", total: 13 }, { resultado: "falhaRegular", total: 12 }), "a");
t.igual("Extremo vence Regular", K.compararDisputa({ resultado: "sucessoRegular", total: 19 }, { resultado: "sucessoExtremo", total: 20 }), "b");
t.igual("Falha Regular vence Extrema", K.compararDisputa({ resultado: "falhaRegular", total: 2 }, { resultado: "falhaExtrema", total: 1 }), "a");
t.igual("mesma categoria: maior total (Juliana 15 x Arthur 14)", K.compararDisputa({ resultado: "sucessoRegular", total: 14 }, { resultado: "sucessoRegular", total: 15 }), "b");
t.igual("empate fica para a Testemunha", K.compararDisputa({ resultado: "sucessoRegular", total: 14 }, { resultado: "sucessoRegular", total: 14 }), "empate");
t.grupo("Oblívio · zonas alternativas da ficha (D5)");
t.igual("1D6 normal: 1 FE, 2–3 FR, 4–5 SR, 6 SE", [1, 2, 3, 4, 5, 6].map((v) => K.classificarFicha("d6", v, "normal")).join(","), "falhaExtrema,falhaRegular,falhaRegular,sucessoRegular,sucessoRegular,sucessoExtremo");
t.igual("2D6 aumentada: 10 é o único Sucesso Regular", [9, 10, 11].map((v) => K.classificarFicha("2d6", v, "aumentada")).join(","), "falhaRegular,sucessoRegular,sucessoExtremo");
{
  const o = persona("sabe", exemplosDoLivro.sabe);
  o.ajustes.zona = "d6";
  const r = K.rolarTeste(o, K.montarTeste(o, "mundo", {}), fila(4));
  t.ok("modo D6 da mesa: rola 1d6, sem somar bônus (limitação documentada)", r.zona === "d6" && r.somaBonus === 0 && r.resultado === "sucessoRegular");
}

/* =====================================================================
   ATAQUES
   ===================================================================== */
t.grupo("Oblívio · ataque: um dado por região, falhas e sucessos");
{
  const ju = persona("protege", exemplosDoLivro.protege, { torso: 8, bracoE: 4, bracoD: 4, pernaE: 4, pernaD: 4 });
  const prep = K.prepararAtaque(ju, { regioes: ["bracoE", "bracoD", "torso"] });
  t.ok("preparar com 3 regiões", prep.ok);
  const r = K.rolarAtaque(ju, prep, fila(4, 13, 16));
  t.iguais("cada dado fica na região declarada antes", r.ataque.dados.map((d) => d.regiao + ":" + d.usado), ["bracoE:4", "bracoD:13", "torso:16"]);
  const c = K.concluirAtaque(ju, r.ataque);
  t.igual("2 sucessos (exemplo da Cilada, p. 51)", c.sucessos, 2);
  t.igual("a falha põe 1 de Estresse no braço que falhou", R.regiao(ju, "bracoE").estresse, 1);
  t.igual("e não em outra região", R.regiao(ju, "bracoD").estresse + R.regiao(ju, "torso").estresse, 0);
  t.ok("concluir de novo não aplica duas vezes", K.concluirAtaque(ju, r.ataque).repetida && R.regiao(ju, "bracoE").estresse === 1);
  const e2 = K.prepararAtaque(ju, { regioes: ["pernaE"] });
  const r2 = K.rolarAtaque(ju, e2, fila(1));
  K.concluirAtaque(ju, r2.ataque);
  t.igual("Falha Extrema: 2 de Estresse", R.regiao(ju, "pernaE").estresse, 2);
  const ext = K.rolarAtaque(ju, K.prepararAtaque(ju, { regioes: ["torso"] }), fila(20));
  t.igual("Sucesso Extremo vale 2 sucessos", K.concluirAtaque(ju, ext.ataque).sucessos, 2);
  t.ok("região repetida sem Sobrecarga: recusada", !K.prepararAtaque(ju, { regioes: ["torso", "torso"] }).ok);
  t.ok("6 dados: recusado", !K.prepararAtaque(ju, { regioes: ["torso", "bracoE", "bracoD", "pernaE", "pernaD", "torso"] }).ok);
  R.regiao(ju, "bracoD").estresse = 4;
  t.ok("região esgotada não pode ser arriscada", !K.prepararAtaque(ju, { regioes: ["bracoD"] }).ok);
}
t.grupo("Oblívio · Coragem no ataque: resolução pendente");
{
  const ar = persona("age", exemplosDoLivro.age);
  ar.coragem = 4;
  const r = K.rolarAtaque(ar, K.prepararAtaque(ar, { regioes: ["bracoD", "bracoE", "torso"] }), fila(5, 1, 13));
  const opc = K.opcoesDoAtaque(ar, r.ataque);
  t.ok("oferece comprar a Falha Regular (1) e a Extrema (2)", opc.some((o) => o.tipo === "comprarSucesso" && o.custo === 1) && opc.some((o) => o.tipo === "comprarSucesso" && o.custo === 2));
  t.igual("nada aplicado enquanto pendente", R.regiao(ar, "bracoD").estresse + ar.coragem, 4);
  K.escolherNoAtaque(ar, r.ataque, { tipo: "comprarSucesso", dado: r.ataque.dados[0].id });
  const c = K.concluirAtaque(ar, r.ataque);
  t.igual("comprado vira sucesso: 2 sucessos", c.sucessos, 2);
  t.igual("a falha comprada não põe Estresse; a Extrema põe 2", R.regiao(ar, "bracoD").estresse + "/" + R.regiao(ar, "bracoE").estresse, "0/2");
  t.igual("gastou 1 de Coragem", ar.coragem, 3);
  const r2 = K.rolarAtaque(ar, K.prepararAtaque(ar, { regioes: ["torso"] }), fila(20));
  K.escolherNoAtaque(ar, r2.ataque, { tipo: "aumentarExtremo", dado: r2.ataque.dados[0].id });
  t.igual("Aumentar Extremo: 3 sucessos", K.concluirAtaque(ar, r2.ataque).sucessos, 3);
  ar.coragem = 1;
  const r3 = K.rolarAtaque(ar, K.prepararAtaque(ar, { regioes: ["pernaD"] }), fila(1));
  t.ok("Coragem 1 não compra Falha Extrema", !K.escolherNoAtaque(ar, r3.ataque, { tipo: "comprarSucesso", dado: r3.ataque.dados[0].id }).ok);
}
t.grupo("Oblívio · Dar uma Mãozinha (Quem Resolve)");
{
  const ar = persona("age", exemplosDoLivro.age);
  const r = K.rolarAtaque(ar, K.prepararAtaque(ar, { regioes: ["torso", "bracoD"] }), fila(5, 1));
  const m1 = K.escolherNoAtaque(ar, r.ataque, { tipo: "darUmaMaozinha", dado: r.ataque.dados[0].id }, fila(5));
  t.ok("1D6 4–6: a falha vira sucesso", m1.ok && r.ataque.dados[0].resultado === "sucessoRegular");
  const m2 = K.escolherNoAtaque(ar, r.ataque, { tipo: "darUmaMaozinha", dado: r.ataque.dados[1].id }, fila(2));
  t.igual("1D6 1–3: continua falha e Quem Resolve sofre o grau (Extrema = 2)", m2.maozinha.estresseEmQuemResolve, 2);
}
t.grupo("Oblívio · Proteção desgastada por Personas diferentes (C1)");
{
  const p = K.novoEstadoDeProtecao(3);
  const a1 = K.aplicarSucessos(p, 2, "juliana");
  t.ok("Juliana: 2 sucessos contra 3 não acertam; restante 1", !a1.acertou && p.restante === 1);
  const a2 = K.aplicarSucessos(p, 1, "ana");
  t.ok("Ana: 1 sucesso fecha (igual ou maior que a Proteção) e acerta", a2.acertou && p.restante === 0 && p.zerada.atacante === "ana");
  t.iguais("desgaste registra a origem de cada parcela", p.desgastes.map((d) => d.atacante + ":" + d.valor), ["juliana:2", "ana:1"]);
  t.ok("zerada: o próximo ataque acerta sem rolar", K.aplicarSucessos(p, 0, "arthur").jaZerada);
  K.inicioDoTurno(p, "juliana", "alvo");
  t.igual("turno de outro não restaura", p.restante, 0);
  K.inicioDoTurno(p, "ana", "alvo");
  t.igual("início do próximo turno de quem acertou: volta CHEIA", p.restante, 3);
  const q = K.novoEstadoDeProtecao(2);
  K.aplicarSucessos(q, 1, "x");
  K.atualizarCompleta(q, 4);
  t.igual("a completa mudou (escudo): restante = nova completa − desgaste, sem voltar cheia", q.restante, 3);
  const carcaca = K.novoEstadoDeProtecao(2);
  K.aplicarSucessos(carcaca, 1, "arthur");
  t.igual("exemplo da Carcaça (p. 35): 1 sucesso deixa 1", carcaca.restante, 1);
  t.ok("  comprando 1 sucesso a mais, 2 ≥ 2 acerta", K.aplicarSucessos(K.novoEstadoDeProtecao(2), 2, "arthur").acertou);
  const mir = K.novoEstadoDeProtecao(3);
  t.ok("Mirar: Proteção 3 + 3 que a região ainda aguenta = 6 (p. 89)", !K.aplicarSucessos(mir, 5, "x", { mirar: { capacidade: 3 } }).acertou && K.aplicarSucessos(K.novoEstadoDeProtecao(3), 6, "x", { mirar: { capacidade: 3 } }).acertou);
  t.ok("  errando a mira, os sucessos desgastam sem causar dano (C4)", mir.restante === 0 && mir.desgastes.length === 1);
  const fd = K.novoEstadoDeProtecao(2); fd.persistente = 2;
  K.aplicarSucessos(fd, 2, "a");
  t.ok("Feedback Defensivo persiste com a Proteção zerada", !fd.zerada && K.aplicarSucessos(fd, 2, "a").acertou);
  const sem = K.prepararAtaque(persona("age", exemplosDoLivro.age), { semRegioes: true });
  t.ok("alvo sem Proteção: ataque sem regiões, sem dados (só Ação Regular)", sem.ok && sem.semRegioes && sem.dados.length === 0);
}
t.grupo("Oblívio · dano e armas");
{
  const ar = persona("age", { carne: 0, forca: 4, fuga: 6, determinacao: 0, mente: 0 });
  ar.escolhas.dano = "fuga";
  R.adicionarItem(ar, "laminaDeGuerra");
  const l = ar.inventario.itens[0];
  R.equipar(ar, l.id, "bracoD");
  const prep = K.prepararAtaque(ar, { regioes: ["bracoD", "torso"], arma: l.id });
  t.ok("arma leve com a região que empunha arriscada: dano da arma", prep.armaValida);
  const r = K.rolarAtaque(ar, prep, fila(15, 15));
  K.concluirAtaque(ar, r.ataque);
  const comp = K.composicaoDoDano(ar, r.ataque, { primeiroAcertoNoAlvo: false });
  t.igual("2D4 + Dano 5", comp.expressaoArma + " + " + comp.somas[0].valor, "2d4 + 5");
  t.igual("rolado 3+2+5 = 10", K.rolarDano(comp, fila(3, 2)).total, 10);
  const vor = K.composicaoDoDano(ar, r.ataque, { primeiroAcertoNoAlvo: true });
  t.ok("Voracidade: Dano dobrado no primeiro acerto", vor.somas[0].valor === 10 && /Voracidade/.test(vor.somas[0].fonte));
  const semArma = K.prepararAtaque(ar, { regioes: ["torso"], arma: l.id });
  t.ok("sem arriscar a região da arma: só o atributo de Dano", !semArma.armaValida && /região/.test(semArma.motivoSemArma));
  const forte = persona("protege", { carne: 5, forca: 5, fuga: 0, determinacao: 0, mente: 0 });
  R.adicionarItem(forte, "laminaLonga"); const ll = forte.inventario.itens[0];
  R.equipar(forte, ll.id, "bracoD");
  t.ok("arma média com 1 região: só o atributo", !K.prepararAtaque(forte, { regioes: ["bracoD"], arma: ll.id }).armaValida);
  t.ok("  com 2 regiões: dano da arma", K.prepararAtaque(forte, { regioes: ["bracoD", "bracoE"], arma: ll.id }).armaValida);
  R.aplicarModificacao(forte, ll.id, "contrapeso");
  t.ok("Contrapeso: 1 região basta", K.prepararAtaque(forte, { regioes: ["bracoD"], arma: ll.id }).armaValida);
  const pistola = persona("age", exemplosDoLivro.age);
  R.adicionarItem(pistola, "disparoMedio"); R.adicionarItem(pistola, "municao");
  const pi = pistola.inventario.itens[0], mu = pistola.inventario.itens[1];
  R.equipar(pistola, pi.id, "bracoD");
  for (let i = 0; i < 3; i++) K.concluirAtaque(pistola, K.rolarAtaque(pistola, K.prepararAtaque(pistola, { regioes: ["bracoD"], arma: pi.id }), fila(15)).ataque);
  t.ok("Disparo Médio: após 3 ataques pede recarga", !K.prepararAtaque(pistola, { regioes: ["bracoD"], arma: pi.id }).ok);
  const rec = K.recarregar(pistola, pi.id, mu.id);
  t.ok("recarga gasta 1 uso de Munição e zera", rec.ok && pi.ataques === 0 && mu.usos === 4 && rec.acao === "regular");
  const tc = K.composicaoDoDano(pistola, { prep: { arma: pi.id, armaValida: true } }, { tiroCerteiro: true });
  t.igual("Tiro Certeiro após Mirar: dados dobrados (2d6)", tc.expressaoArma, "2d6");
  R.aplicarModificacao(pistola, pi.id, "mortal");
  t.igual("Mortal: +1 dado (1d6 → 2d6; com Tiro Certeiro 4d6)", K.composicaoDoDano(pistola, { prep: { arma: pi.id, armaValida: true } }, { tiroCerteiro: true }).expressaoArma, "4d6");
  t.igual("Fragilidade do alvo: +1 dado", K.composicaoDoDano(pistola, { prep: { arma: pi.id, armaValida: true } }, { alvoFragilidade: true }).expressaoArma, "3d6");
}

/* =====================================================================
   ESTRESSE, PRÓTESES, SOBRECARGA
   ===================================================================== */
t.grupo("Oblívio · Estresse e Fora de Ação");
{
  const ana = persona("sabe", exemplosDoLivro.sabe, { torso: 4, bracoE: 2, bracoD: 2, pernaE: 2, pernaD: 2 });
  R.receberEstresse(ana, 2, { regiao: "bracoD" });
  t.igual("Estresse sobe a partir de zero (não é PV)", R.regiao(ana, "bracoD").estresse, 2);
  const tr = R.receberEstresse(ana, 2, { regiao: "bracoD" });
  t.ok("região cheia: o excesso vai para o Torso", R.regiao(ana, "torso").estresse === 2 && tr.eventos.some((e) => e.transbordo));
  const ex = R.receberEstresse(ana, 9, { regiao: "torso" });
  t.ok("além do Torso: excesso registrado, não some calado", ex.eventos.some((e) => e.tipo === "excesso"));
  t.ok("Torso esgotado: Fora de Ação mesmo com outras regiões livres", ex.atingiuLimite);
  const b = persona("protege", exemplosDoLivro.protege);
  b.corpo.regioes.forEach((r) => { if (r.chave !== "torso") r.estresse = r.limite; });
  t.ok("todas as regiões menos o Torso esgotadas ainda não é Fora de Ação", !R.deveFicarForaDeAcao(b));
  const fr = persona("protege", exemplosDoLivro.protege);
  R.aplicarMazela(fr, "carneFraca", {}, {});
  R.receberEstresse(fr, 3, { regiao: "torso" });
  t.ok("Carne Fraca: o próximo Estresse dobra e a mazela termina", R.regiao(fr, "torso").estresse === 6 && !R.temMazela(fr, "carneFraca"));
  const fe = persona("protege", exemplosDoLivro.protege);
  R.receberEstresse(fe, 12, { regiao: "torso" });
  t.ok("Ferida: metade do limite (24/2) de uma vez", R.temMazela(fe, "ferida") && R.mazelaDe(fe, "ferida").param.dano === 12);
}
t.grupo("Oblívio · equipamento absorvendo Estresse (p. 66–67)");
{
  const o = persona("protege", { carne: 5, forca: 5, fuga: 0, determinacao: 0, mente: 0 });
  R.adicionarItem(o, "escudoLeve"); const esc = o.inventario.itens[0];
  R.equipar(o, esc.id, "bracoE");
  R.receberEstresse(o, 3, { regiao: "bracoE", item: esc.id });
  t.ok("vai inteiro para o escudo, nada no corpo", esc.estresse === 3 && R.regiao(o, "bracoE").estresse === 0);
  const r = R.receberEstresse(o, 4, { regiao: "bracoE", item: esc.id });
  t.ok("passa do limite (5): destruído e o excesso (2) vai para a região que o empunhava", esc.estado === "destruido" && R.regiao(o, "bracoE").estresse === 2 && r.eventos.some((e) => e.tipo === "itemDestruido"));
  const k = persona("protege", { carne: 5, forca: 5, fuga: 0, determinacao: 0, mente: 0 });
  R.adicionarItem(k, "escudoMedio"); R.adicionarItem(k, "kitDeReparos");
  const em = k.inventario.itens[0];
  R.equipar(k, em.id, "bracoE");
  R.receberEstresse(k, 6, { regiao: "bracoE", item: em.id });
  R.repararItem(k, em.id, 5);
  t.igual("Kit de Reparos recupera 5 do equipamento", em.estresse, 1);
  const mg = persona("protege", { carne: 5, forca: 5, fuga: 0, determinacao: 0, mente: 0 });
  R.adicionarItem(mg, "escudoLeve"); const el = mg.inventario.itens[0];
  R.equipar(mg, el.id, "bracoE");
  R.regiao(mg, "bracoE").estresse = R.regiao(mg, "bracoE").limite - 1;
  R.receberEstresse(mg, 1, { regiao: "bracoE" });
  t.ok("Manter a Guarda: a região do escudo esgotou, ele cai", el.estado === "derrubado");
  t.igual("  e deixa de somar Proteção", R.protecaoCompleta(mg).partes.some((p) => /Escudo/.test(p.fonte)), false);
}
t.grupo("Oblívio · próteses, perda de regiões e Sobrecarga");
{
  const o = persona("age", { carne: 2, forca: 2, fuga: 2, determinacao: 2, mente: 2 });
  R.regiao(o, "pernaE").estado = "protese";
  o.escolhas.menosRegioes = "proteses";
  t.ok("prótese acima de 5: recusada", (R.regiao(o, "pernaE").limite = 6, !R.validarCriacao(o).ok));
  R.regiao(o, "pernaE").limite = 3; R.regiao(o, "torso").limite += R.limiteTotal(o).total - o.corpo.regioes.reduce((s, r) => s + r.limite, 0);
  R.receberEstresse(o, 2, { regiao: "pernaE" });
  R.ganharCoragem(o, 5);
  R.gastarCoragem(o, "recuperarEstresse", { pontos: 1 });
  t.igual("Coragem não recupera prótese", R.regiao(o, "pernaE").estresse, 2);
  R.adicionarItem(o, "kitDeReparos");
  R.recuperarEstresse(o, 5, { fonte: "kitDeReparos" });
  t.igual("Kit de Reparos recupera a prótese", R.regiao(o, "pernaE").estresse, 0);
  /* Carne 2: destruída com mais de 1 Falha Extrema. */
  K.concluirAtaque(o, K.rolarAtaque(o, K.prepararAtaque(o, { regioes: ["pernaE"] }), fila(1)).ataque);
  t.igual("1ª Falha Extrema na prótese: contada", R.regiao(o, "pernaE").falhasExtremas, 1);
  const d2 = K.concluirAtaque(o, K.rolarAtaque(o, K.prepararAtaque(o, { regioes: ["pernaE"] }), fila(1)).ataque);
  t.ok("2ª (acima de metade de Carne): destruída e a região some", R.regiao(o, "pernaE").estado === "ausente" && d2.eventos.some((e) => e.tipo === "proteseDestruida"));
  t.ok("  o limite dela volta para redistribuir (pendência)", R.pendencias(o).some((p) => p.tipo === "distribuirLimite"));
  const ir = persona("protege", exemplosDoLivro.protege);
  t.ok("sem Ir Além: repetir região é recusado", !K.prepararAtaque(ir, { regioes: ["bracoD", "bracoD"] }).ok);
  ir.escolhas.menosRegioes = "irAlem";
  const sob = K.prepararAtaque(ir, { regioes: ["bracoD", "bracoD", "bracoD", "torso", "pernaD"] });
  t.ok("Sobrecarga: braço 3 vezes + torso + perna (exemplo p. 44)", sob.ok);
  const rs = K.rolarAtaque(ir, sob, fila(2, 3, 15, 15, 15));
  K.concluirAtaque(ir, rs.ataque);
  t.igual("as duas falhas do braço caem no braço (2)", R.regiao(ir, "bracoD").estresse, 2);
  const ap = persona("sabe", exemplosDoLivro.sabe);
  ap.coragemIniciada = false;
  R.regiao(ap, "bracoE").estado = "ausente"; R.regiao(ap, "bracoD").estado = "ausente";
  ap.escolhas.menosRegioes = "aprimorar";
  R.concluirCriacao(ap);
  t.igual("Aprimorar o Corpo (Ana sem os dois braços): limite 14 (p. 44)", R.limiteTotal(ap).total, 14);
  t.igual("  e Coragem 5", ap.coragem, 5);
  R.concluirCriacao(ap);
  t.igual("  idempotente: concluir de novo não soma de novo", R.limiteTotal(ap).total + "/" + ap.coragem, "14/5");
}

/* =====================================================================
   FORA DE AÇÃO, FARDOS, MISSÃO
   ===================================================================== */
t.grupo("Oblívio · Fora de Ação: as três vezes na mesma Missão");
{
  const o = persona("protege", exemplosDoLivro.protege);
  R.iniciarMissao(o, "missao-1");
  const f1 = R.entrarForaDeAcao(o, { rodada: 3, cena: "c1" }, fila(5));
  t.ok("1ª vez: No Chão e Sem Reação + Fardo", f1.vez === 1 && R.temMazela(o, "noChao") && R.temMazela(o, "semReacao") && o.fardos.length === 1);
  t.igual("  o Fardo saiu da tabela (5: Fragilidade)", o.fardos[0].chave, "fragilidade");
  R.fimDaRodada(o, { rodada: 3, cena: "c1" });
  t.ok("  ainda Fora de Ação no fim da MESMA rodada", o.foraDeAcao.ativo);
  R.receberEstresse(o, 0, {});
  const lim = R.limiteTotal(o).total;
  o.corpo.regioes.forEach((r) => { r.estresse = r.limite; });
  R.fimDaRodada(o, { rodada: 4, cena: "c1" });
  t.ok("  volta no fim da próxima rodada e recupera metade do limite", !o.foraDeAcao.ativo && R.calcular(o).estresseTotal === lim - R.metade(lim));
  t.ok("  sem as mazelas de Fora de Ação", !R.temMazela(o, "noChao") && !R.temMazela(o, "semReacao"));
  R.descansar(o, {});
  t.igual("Descansar não zera a contagem da Missão", R.ocorrenciasNaMissao(o), 1);
  const f2 = R.entrarForaDeAcao(o, { rodada: 7, cena: "c2" }, fila(1, 2));
  t.ok("2ª vez: volta só no início da próxima cena", f2.vez === 2 && o.foraDeAcao.retorno.saida === "inicioDaProximaCena");
  R.fimDaRodada(o, { rodada: 8 });
  t.ok("  o fim da rodada não a traz de volta", o.foraDeAcao.ativo);
  R.inicioDaCena(o, { cena: "c3" });
  t.ok("  a cena nova traz", !o.foraDeAcao.ativo);
  const f3 = R.entrarForaDeAcao(o, {}, fila(3));
  t.ok("3ª vez: morte — e a ficha continua existindo", f3.morta && o.morte && R.estadoDaPersona(o) === "morta");
  t.ok("Fora de Ação e morte são estados distintos", R.calcular(o).estado === "morta");
  const p = persona("age", exemplosDoLivro.age);
  R.iniciarMissao(p, "m-a"); R.entrarForaDeAcao(p, {}, fila(5)); R.fimDaRodada(p, { rodada: 1, forcarRetorno: true });
  R.concluirMissao(p, "m-a", 0);
  R.iniciarMissao(p, "m-b");
  t.igual("concluir a Missão zera a contagem (a próxima começa do zero)", R.ocorrenciasNaMissao(p), 0);
  const mortal = persona("age", exemplosDoLivro.age); R.iniciarMissao(mortal, "m");
  t.igual("Buraco Mortal / Devorar os Restos: conta 2 vezes", R.entrarForaDeAcao(mortal, { vezes: 2 }, fila(5)).vez, 2);
  const mata = persona("age", exemplosDoLivro.age);
  t.ok("causa que mata direto (Maremoto)", R.entrarForaDeAcao(mata, { mata: true, causa: "Maremoto" }).morta);
}
t.grupo("Oblívio · Fardos válidos");
{
  const o = persona("age", exemplosDoLivro.age);
  R.aplicarFardo(o, "covardia", fila());
  const r = R.rolarFardo(o, fila(3, 3, 4));
  t.ok("Covardia não acumula: rola de novo até um válido", r.chave === "malDasPernas" && r.eventos.filter((e) => e.tipo === "fardoRepetido").length === 2);
  t.ok("Mal das Pernas: −1 no limite, pede redistribuição", R.limiteTotal(o).total === 14 && R.pendencias(o).some((p) => p.tipo === "distribuirLimite"));
  const g = persona("age", exemplosDoLivro.age);
  R.regiao(g, "bracoE").estresse = 2;
  R.aplicarFardo(g, "guilhotina", fila(1));
  t.ok("Guilhotina 1D4=1: perde o braço esquerdo", R.regiao(g, "bracoE").estado === "ausente");
  R.aplicarFardo(g, "guilhotina", fila(1, 1, 3));
  t.ok("  já sem o braço: rola até achar uma região que possui", R.regiao(g, "pernaE").estado === "ausente");
  const sem = persona("age", exemplosDoLivro.age);
  ["bracoE", "bracoD", "pernaE", "pernaD"].forEach((k) => { R.regiao(sem, k).estado = "ausente"; });
  t.igual("sem membros, Guilhotina é impossível: rola outro Fardo", R.rolarFardo(sem, fila(1, 4)).chave, "malDasPernas");
  const d = persona("protege", exemplosDoLivro.protege);
  R.aplicarFardo(d, "deterioracao", fila(6, 1, 4));
  t.ok("Deterioração: 6 rola de novo; Carne −4 (mín. 0), máximo 9", d.atributos.carne === 0 && d.maximos.carne === 9);
  t.ok("Fardo não sai por cura comum", !R.removerMazela(d, "fragilidade", "balsamo").ok && d.fardos.length === 1);
}
t.grupo("Oblívio · conclusão de Missão e progressão");
{
  const o = persona("protege", exemplosDoLivro.protege);
  R.iniciarMissao(o, "m1");
  const r = R.concluirMissao(o, "m1", 1);
  t.ok("+metade de Carne (2) no limite", R.limiteTotal(o).total === 26);
  t.ok("1 + 1 morto = 2 habilidades a escolher", o.escolhasPendentes.some((p) => p.tipo === "habilidades" && p.quantas === 2));
  t.ok("a mesma Missão não aplica duas vezes", R.concluirMissao(o, "m1", 1).repetida && R.limiteTotal(o).total === 26);
  const ca = persona("age", { carne: 1, forca: 3, fuga: 2, determinacao: 2, mente: 2 });
  R.concluirMissao(ca, "m", 0);
  t.igual("Carne 1: ganha 1 (mín. 1)", R.limiteTotal(ca).total, 17);
  t.ok("habilidade única de outro Papel: recusada", !R.adquirirHabilidade(o, "estocada", {}, "progressao").ok);
  t.ok("Armadura de Espinhos (do Papel): aceita", R.adquirirHabilidade(o, "armaduraDeEspinhos", {}, "progressao").ok);
  t.ok("Aumento de Atributo: exatamente 3 pontos", !R.adquirirHabilidade(o, "aumentoDeAtributo", { carne: 2 }, "progressao").ok && R.adquirirHabilidade(o, "aumentoDeAtributo", { carne: 1, forca: 2 }, "progressao").ok);
  t.igual("  Carne 5 → limite e Proteção recalculados", R.limiteTotal(o).total, 27);
  t.ok("Cão Velho: imunidade à mazela escolhida", R.adquirirHabilidade(o, "caoVelho", { mazela: "pavor" }, "mesa").ok && R.aplicarMazela(o, "pavor", {}, {}).imune);
  t.ok("Saber é Poder: nova especialização", R.adquirirHabilidade(o, "saberEPoder", { conhecimento: "social" }, "mesa").ok && R.bonusDeEspecializacao(o, "social") === 2);
}

/* =====================================================================
   MAZELAS RECORRENTES, CURA
   ===================================================================== */
t.grupo("Oblívio · mazelas recorrentes sem duplicar");
{
  const o = persona("protege", exemplosDoLivro.protege);
  R.aplicarMazela(o, "ferida", { dano: 2 }, {});
  R.aplicarMazela(o, "ferida", { dano: 1 }, {});
  t.igual("Ferida aplicada duas vezes: uma só, com o maior dano", o.mazelas.filter((m) => m.chave === "ferida").length + "/" + R.mazelaDe(o, "ferida").param.dano, "1/2");
  R.fimDaRodada(o, { rodada: 1 });
  t.igual("fim da rodada: a Ferida repete o dano guardado (2)", R.regiao(o, "torso").estresse, 2);
  R.aplicarMazela(o, "pegandoFogo", { dano: 6 }, {});
  R.fimDaRodada(o, { rodada: 2 });
  t.igual("Pegando Fogo: metade do original (3) + Ferida (2)", R.regiao(o, "torso").estresse, 7);
  R.fimDaRodada(o, { rodada: 3 });
  t.igual("  na próxima, 1 a menos (2)", R.mazelaDe(o, "pegandoFogo").param.proximo, 1);
  R.fimDaRodada(o, { rodada: 4 });
  t.ok("  zera e termina", !R.temMazela(o, "pegandoFogo"));
  const b = persona("cuida", exemplosDoLivro.cuida);
  R.aplicarMazela(b, "botandoParaFora", {}, {});
  t.igual("Botando para Fora: Carne fora da Proteção ((0+1)/2=0)", R.protecaoCompleta(b).total, 0);
  R.fimDoTurno(b, {});
  t.igual("  1 de Estresse no fim do turno", R.calcular(b).estresseTotal, 1);
  t.ok("Jura de Morte não sai com Ração", !R.removerMazela(b, "botandoParaFora", "racao").ok);
  t.ok("  mas sai com Kit de Primeiros Socorros", R.removerMazela(b, "botandoParaFora", "kitPrimeirosSocorros").ok);
  const sf = persona("protege", { carne: 2, forca: 2, fuga: 2, determinacao: 0, mente: 4 });
  R.aplicarMazela(sf, "semFolego", {}, {});
  const fim = R.fimDoTurno(sf, {});
  t.ok("Sem Fôlego por Fôlego (1) turnos e depois Fora de Ação", fim.eventos.some((e) => e.tipo === "atingiuLimite" && e.motivo === "semFolego"));
  const pv = persona("age", exemplosDoLivro.age);
  pv.coragem = 1;
  R.aplicarMazela(pv, "pavor", {}, {});
  R.fimDaRodada(pv, { rodada: 1 }); R.fimDaRodada(pv, { rodada: 2 });
  t.igual("Pavor: Coragem e depois Determinação", pv.coragem + "/" + R.atributosEfetivos(pv).determinacao, "0/1");
  R.perderCoragem(pv, 1, {});
  t.ok("perder Coragem sem ter: Pavor (já tem, não duplica)", pv.mazelas.filter((m) => m.chave === "pavor").length === 1);
  const cc = persona("age", exemplosDoLivro.age);
  R.ganharCoragem(cc, 3, "Ação Corajosa");
  t.igual("Coragem Cega: +3 de uma vez reduz a Proteção em 3", R.protecaoCompleta(cc).total, Math.max(0, R.metade(0 + 6) - 3));
  t.igual("Coragem pode passar de 10", (R.ganharCoragem(cc, 9, "x"), cc.coragem > 10), true);
  const cov = persona("age", exemplosDoLivro.age); cov.coragem = 6;
  R.aplicarFardo(cov, "covardia", fila());
  R.perderCoragem(cov, 1, { porFalha: true });
  t.igual("Covardia: perde o dobro ao falhar", cov.coragem, 4);
}
t.grupo("Oblívio · recuperação, Fome, cura temporária");
{
  const o = persona("protege", exemplosDoLivro.protege, { torso: 8, bracoE: 4, bracoD: 4, pernaE: 4, pernaD: 4 });
  R.receberEstresse(o, 6, { regiao: "torso" }); R.receberEstresse(o, 3, { regiao: "bracoD" });
  R.recuperarEstresse(o, 5, { fonte: "racao", distribuicao: { bracoD: 3, torso: 2 } });
  t.igual("Ração dividida entre regiões, como a Persona escolheu", R.regiao(o, "bracoD").estresse + "/" + R.regiao(o, "torso").estresse, "0/4");
  const f = persona("protege", exemplosDoLivro.protege);
  R.receberEstresse(f, 8, { regiao: "torso", });
  R.descansar(f, {});
  t.ok("descansar sem ter comido: Fome e Carne Fraca", R.temMazela(f, "fome") && R.temMazela(f, "carneFraca"));
  R.receberEstresse(f, 4, { regiao: "torso" });
  const e = R.calcular(f).estresseTotal;
  R.recuperarEstresse(f, 4, { fonte: "habilidade" });
  t.igual("Fome: cura que não é Ração pela metade (4 → 2)", e - R.calcular(f).estresseTotal, 2);
  const k = persona("protege", exemplosDoLivro.protege);
  R.receberEstresse(k, 6, { regiao: "torso" });
  R.recuperarEstresse(k, 5, { fonte: "kitPrimeirosSocorros", temporaria: true });
  t.igual("Kit de Primeiros Socorros: cura temporária", R.regiao(k, "torso").estresse, 1);
  R.inicioDaCena(k, { cena: "c2" });
  t.igual("  volta no início da próxima cena", R.regiao(k, "torso").estresse, 6);
  const big = persona("protege", exemplosDoLivro.protege, { torso: 8, bracoE: 4, bracoD: 4, pernaE: 4, pernaD: 4 });
  R.receberEstresse(big, 6, { regiao: "torso", semFerida: true }); R.receberEstresse(big, 4, { regiao: "bracoD", semFerida: true });
  R.recuperarEstresse(big, 10, { fonte: "descanso" });
  t.ok("recuperar 10+ de uma vez: Carne Fraca", R.temMazela(big, "carneFraca"));
  const com = persona("protege", exemplosDoLivro.protege);
  R.adicionarItem(com, "racao");
  R.receberEstresse(com, 2, { regiao: "torso" });
  R.comerRacao(com, com.inventario.itens[0].id);
  R.descansar(com, {});
  t.ok("comeu antes do Descanso: sem Fome", !R.temMazela(com, "fome"));
}

/* =====================================================================
   INVENTÁRIO, MODIFICAÇÕES, FABRICAÇÃO
   ===================================================================== */
t.grupo("Oblívio · modificações (pp. 77–79)");
{
  const o = persona("protege", { carne: 5, forca: 5, fuga: 0, determinacao: 0, mente: 0 });
  ["laminaCurta", "laminaLonga", "vestimentaLeve", "bombaDeEstalo", "kitDeReparos", "escudoMedio", "disparoAbsoluto"].forEach((k) => R.adicionarItem(o, k));
  t.ok("inventário acima do limite vira pendência (não some nada)", R.pendencias(o).some((p) => p.tipo === "inventarioCheio"));
  const [lc, ll, vl, bomba, kit, esc, abs] = o.inventario.itens;
  t.ok("Contrapeso não serve em arma leve", !R.aceitaModificacao(lc, "contrapeso").ok);
  t.ok("Vida Longa não serve em Bomba", !R.aceitaModificacao(bomba, "vidaLonga").ok);
  t.ok("Vida Longa no Kit: +1 uso", R.aplicarModificacao(o, kit.id, "vidaLonga").ok && kit.usos === 6);
  t.ok("Consumível aceita 1 modificação", !R.aceitaModificacao(kit, "efetividade").ok);
  t.ok("Leve aceita 2", R.aplicarModificacao(o, lc.id, "empunhadura").ok && R.aplicarModificacao(o, lc.id, "mortal").ok && !R.aceitaModificacao(lc, "extensao").ok);
  t.ok("Mortal não repete", !R.aceitaModificacao(ll, "mortal").ok || R.aplicarModificacao(o, ll.id, "mortal").ok && !R.aceitaModificacao(ll, "mortal").ok);
  t.ok("Reforço repete (Vestimenta Leve +2 → +4)", R.aplicarModificacao(o, vl.id, "reforco").ok && R.aplicarModificacao(o, vl.id, "reforco").ok);
  t.ok("Extensão não serve em Disparo Absoluto (até Longo)", !R.aceitaModificacao(abs, "extensao").ok);
  t.ok("Amarra só em escudo", !R.aceitaModificacao(vl, "amarra").ok && R.aceitaModificacao(esc, "amarra").ok);
  t.ok("Versátil pede o Conhecimento", !R.aplicarModificacao(o, vl.id, "versatil", {}).ok);
  t.igual("cada modificação ocupa +1 espaço guardado", R.espacosDoItem(lc), 3);
  R.equipar(o, vl.id, "torso");
  t.ok("Reforço soma no bônus vestido", R.protecaoCompleta(o).partes.some((p) => p.valor === 4));
  R.aplicarModificacao(o, esc.id, "belica");
  t.ok("Bélica: o escudo vira arma e aceita mod de arma", R.aceitaModificacao(esc, "empunhadura").ok);
  R.adicionarItem(o, "vestimentaMedia");
  const vm = o.inventario.itens[o.inventario.itens.length - 1];
  t.ok("duas Vestimentas: recusado", !R.equipar(o, vm.id, "bracoD").ok);
}
t.grupo("Oblívio · fabricar (p. 88)");
{
  const o = persona("sabe", exemplosDoLivro.sabe);
  R.adicionarItem(o, "recurso", { qtd: 5 });
  t.ok("não fabrica Recurso nem Kit de Reparos", R.custoDeFabricacao({ chave: "recurso" }).erro && R.custoDeFabricacao({ chave: "kitDeReparos" }).erro);
  t.igual("Kit de Primeiros Socorros custa 5 (usos)", R.custoDeFabricacao({ chave: "kitPrimeirosSocorros" }).recursos, 5);
  t.igual("Durável médio custa 3", R.custoDeFabricacao({ chave: "laminaLonga" }).recursos, 3);
  t.ok("teste falhou: nada é fabricado e os Recursos ficam", !R.fabricar(o, { chave: "laminaDeGuerra" }, { sucesso: false }).ok && R.contarRecursos(o) === 5);
  const r = R.fabricar(o, { chave: "laminaDeGuerra" }, { sucesso: true });
  t.ok("sem Kit de Reparos: limite e dano pela metade, na INSTÂNCIA", r.ok && r.item.fabricado.metade && R.limiteDoItem(r.item) === 2 && C.equipamento.laminaDeGuerra.limiteEstresse === 4);
  t.igual("gastou 2 Recursos", R.contarRecursos(o), 3);
  R.adicionarItem(o, "kitDeReparos");
  const kit = o.inventario.itens.filter((i) => i.chave === "kitDeReparos")[0];
  const r2 = R.fabricar(o, { chave: "taco" }, { sucesso: true, kitId: kit.id });
  t.ok("com 1 uso do Kit: inteiro", r2.ok && !r2.item.fabricado.metade && kit.usos === 4);
  t.ok("sem Recursos: recusado", !R.fabricar(o, { chave: "laminaLonga" }, { sucesso: true }).ok);
}

/* =====================================================================
   OPERAÇÕES IDEMPOTENTES
   ===================================================================== */
t.grupo("Oblívio · operação repetida não aplica duas vezes");
{
  const o = persona("age", exemplosDoLivro.age);
  const op = (x) => R.receberEstresse(x, 2, { regiao: "torso" });
  R.aplicarOperacao(o, "op-1", op);
  const de2 = R.aplicarOperacao(o, "op-1", op);
  t.ok("o mesmo opId chega duas vezes: aplica uma", de2.repetida && R.regiao(o, "torso").estresse === 2);
  t.ok("sem opId: recusado", !R.aplicarOperacao(o, "", op).ok);
  const n = R.normalizar(JSON.parse(JSON.stringify(o)));
  t.ok("normalizar preserva o registro de operações", n.operacoes.includes("op-1"));
  t.iguais("normalizar ida e volta não perde estado", R.calcular(n).regioes.map((r) => r.estresse), R.calcular(o).regioes.map((r) => r.estresse));
}

/* Os módulos de Ameaças, mesa e Buraco têm os próprios grupos. */
const extras = await import("./oblivio-mesa.js").catch((e) => { console.error(e); return null; });
if (extras) await extras.testarMesa({ t, fila, persona, exemplosDoLivro });
const habs = await import("./oblivio-habilidades.js").catch((e) => { console.error(e); return null; });
if (habs) await habs.testarHabilidades({ t, fila, persona, exemplosDoLivro });

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
