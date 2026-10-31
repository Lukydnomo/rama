/* =====================================================================
   R.A.M.A. — testes de Malditos Goblins (3ª edição)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-goblins.js

   Sem navegador e sem rede. Os dados são uma FILA de resultados
   combinados: cada teste diz exatamente o que cai, e o motor nunca
   sorteia sozinho. Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = ["js/goblins/catalogo.js", "js/goblins/dados.js", "js/goblins/regras.js", "js/goblins/mesa.js"];
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

const C = globalThis.RAMAGoblinsCatalogo, D = globalThis.RAMAGoblinsDados, R = globalThis.RAMAGoblins, M = globalThis.RAMAGoblinsMesa;

function fila(...faces) {
  const q = faces.flat();
  const f = (n) => { if (!q.length) throw new Error("fila de dados vazia"); const v = q.shift(); return v; };
  f.resta = () => q.length;
  return f;
}

/* Um goblin pronto, sem tela. */
function goblin(ocupacao, descritor, extra) {
  const o = R.fichaVazia();
  o.ocupacao = ocupacao; o.descritor = descritor || "mediocre";
  o.caracteristicas = [{ id: "ca-1", chave: "pintas", quantidade: null }];
  o.equipamentoInicial = 0;
  if (ocupacao === "mercenario") o.escolhas.armaFavorita = "espada";
  if (ocupacao === "cacador") o.escolhas.especieInimiga = "Lobo";
  if (ocupacao === "bruxo") o.escolhas.magias = ["fogo", "cura", "morte"];
  Object.assign(o, extra || {});
  const r = R.concluirCriacao(o, fila(1, 1, 1, 1, 1, 1, 1, 1));
  if (!r.ok) throw new Error("criação: " + r.motivo);
  return o;
}
function item(o, chave) { return o.itens.filter((i) => i.chave === chave)[0]; }

/* =================================================================== */
t.grupo("Motor de dados: hits, dificuldade, explosões");
{
  let r = D.rolar({ parada: 3, tipo: "teste" }, fila(1, 4, 5));
  t.igual("4 e 5 são hits, 1 não", r.classificacao.hits, 2);
  t.igual("2 hits: Conseguiu!", r.classificacao.rotulo, "Conseguiu!");
  r = D.rolar({ parada: 2, tipo: "teste" }, fila(3, 2));
  t.igual("0 hits: Falhou!", r.classificacao.rotulo, "Falhou!");
  r = D.rolar({ parada: 2, tipo: "teste" }, fila(3, 4));
  t.igual("1 hit: Conseguiu, mas deu ruim…", r.classificacao.rotulo, "Conseguiu, mas deu ruim…");
  r = D.rolar({ parada: 2, tipo: "teste" }, fila(6, 5, 4));
  t.igual("6 explode: 2 iniciais + 1 de explosão = 3 hits", r.classificacao.hits, 3);
  t.igual("3+ hits: épico", r.classificacao.rotulo, "Conseguiu e foi épico!");
  t.igual("um dado de explosão", r.classificacao.explosoes, 1);
  t.igual("explosão aponta para o 6 que a gerou", r.dados[2].de, 0);
  r = D.rolar({ parada: 1, tipo: "teste" }, fila(6, 6, 6, 6, 2));
  t.igual("cadeia de explosões não é cortada: 4 seis + 1", r.dados.length, 5);
  t.igual("cadeia: 4 hits", r.classificacao.hits, 4);
  t.igual("teste com 4 hits continua rotulado épico (3+)", r.classificacao.nivel, 3);
  let m = D.montarParada({ fonte: "Habilidade", valor: 2 }, [], "facil");
  t.igual("fácil: +1 dado", m.parada, 3);
  m = D.montarParada({ fonte: "Habilidade", valor: 2 }, [], "dificil");
  t.igual("difícil: −1 dado", m.parada, 1);
  m = D.montarParada({ fonte: "Combate", valor: 3 }, [{ fonte: "Espada", valor: 2 }], "", { dobrar: "Ataque Brutal" });
  t.igual("dobrar: o dobro da parada inteira (3+2)×2", m.parada, 10);
  r = D.rolar({ parada: 4, tipo: "ataque" }, fila(6, 6, 6, 5, 6, 4, 1, 2));
  t.igual("ataque não tem teto de 3: hits = ferimentos", r.classificacao.ferimentos, 6);
  r = D.rolar({ parada: 2, tipo: "teste", explosoes: "manual" }, fila(6, 3));
  t.igual("explosão manual: fica pendente", r.explosoesPendentes, 1);
  t.ok("manual: não concluída", !r.concluida);
  D.explodir(r, fila(6));
  t.igual("explodiu e saiu 6: outra pendente", r.explosoesPendentes, 1);
  D.recusarExplosoes(r);
  t.ok("recusou: concluída", r.concluida && r.explosoesRecusadas === 1);
  t.igual("hits: 6 + 6 = 2", r.classificacao.hits, 2);
}

t.grupo("Explosão de goblin e Voz Goblin");
{
  let r = D.rolar({ parada: 3, tipo: "teste" }, fila(1, 1, 1));
  t.ok("todos os dados em 1: o goblin explode", r.classificacao.goblinExplode);
  r = D.rolar({ parada: 3, tipo: "teste", vozGoblin: true }, fila(1, 1, 1));
  t.ok("com a Voz Goblin: não explode", !r.classificacao.goblinExplode && r.classificacao.vozSalvou);
  r = D.rolar({ parada: 3, tipo: "ataque", podeExplodirGoblin: false }, fila(1, 1, 1));
  t.ok("rolagem de inimigo: não explode", !r.classificacao.goblinExplode && r.classificacao.todosUm);
  r = D.rolar({ parada: 2, tipo: "teste" }, fila(1, 2));
  t.ok("um 1 e um 2: não explode", !r.classificacao.goblinExplode);
  const o = goblin("gatuno");
  const tr = R.testar(o, { atributo: "habilidade" }, fila(1, 1, 1));
  t.igual("na ficha: todos 1 marca a situação explodiu", o.estado.situacao, "explodiu");
  t.ok("e o histórico guarda", o.historico.some((h) => h.tipo === "fim"));
  const o2 = goblin("gatuno"); o2.opcoes.vozGoblin = true; o2.estado.vozGoblin = "ativa";
  R.testar(o2, { atributo: "habilidade" }, fila(1, 1, 1));
  t.igual("Voz Goblin ativa: continua vivo", o2.estado.situacao, "ativo");
  const o3 = goblin("gatuno"); o3.opcoes.vozGoblin = true; o3.estado.vozGoblin = "perdida";
  R.testar(o3, { atributo: "habilidade" }, fila(1, 1, 1));
  t.igual("Voz perdida (falou sem a voz): explode", o3.estado.situacao, "explodiu");
}

t.grupo("Parada sem dados (lacuna do livro)");
{
  let r = D.rolar({ parada: 0, tipo: "teste" }, fila());
  t.ok("0 dados sem decisão: lacuna, nada rolado", r.lacuna && r.dados.length === 0 && !r.classificacao.goblinExplode);
  r = D.rolar({ parada: 0, tipo: "teste", seZero: "falha" }, fila());
  t.ok("como falha: 0 hits, sem explosão de goblin", r.classificacao.hits === 0 && !r.classificacao.goblinExplode && r.zeroComoFalha);
  r = D.rolar({ parada: -1, tipo: "teste", seZero: "umDado" }, fila(1));
  t.ok("regra da casa (1 dado): marcado, e um 1 não explode o goblin", r.casaUmDado && !r.classificacao.goblinExplode);
  const o = goblin("mercenario", "atrapalhado");
  const tr = R.testar(o, { atributo: "habilidade", dificuldade: "dificil" }, fila());
  t.ok("ficha com Habilidade 1 em teste difícil: pede decisão", tr.ok && tr.lacuna);
}

t.grupo("Sorteios e quantidades");
{
  let s = D.sortear({ id: "nome", dados: "colunaLinha", entradas: C.NOMES }, fila(6, 4));
  t.igual("nome: coluna 6, linha 4 = Nhack (exemplo do livro)", s.resultado, "Nhack");
  s = D.sortear({ dados: "colunaLinha", entradas: C.CARACTERISTICA_2D6 }, fila(1, 5));
  t.igual("característica: coluna 1, linha 5 = Flutulência", s.resultado, "flutulencia");
  s = D.sortear({ dados: "2d6", entradas: C.VIAJANTE_2D6 }, fila(1, 1));
  t.igual("2d6 somados: 2 = Dragão", s.resultado.texto, "Um Dragão");
  let q = D.quantidade("1d6-2", fila(1));
  t.ok("1d6−2 com 1: zero (nunca negativo)", q.total === 0 && q.minimoZero);
  q = D.quantidade("3d6", fila(2, 3, 4));
  t.igual("3d6", q.total, 9);
  q = D.quantidade("1d6+5", fila(6));
  t.igual("1d6+5", q.total, 11);
  t.ok("chance 1 em 6 sai no 6", D.chance("1em6", fila(6)).saiu && !D.chance("1em6", fila(5)).saiu);
}

t.grupo("Pescaria (Vale dos Goblins)");
{
  const p = D.pescar(fila(1, 2, 3, 4, 5), "rio");
  t.iguais("5 dados", p.dados, [1, 2, 3, 4, 5]);
  t.ok("rerrola escolhidos", D.rerrolarPescaria(p, [0, 1], fila(5, 5)).ok);
  t.ok("segunda rerrolagem", D.rerrolarPescaria(p, [2], fila(5)).ok);
  t.ok("terceira: recusada", !D.rerrolarPescaria(p, [3], fila(5)).ok);
  const c = D.concluirPescaria(p, C.VALE.pesos, C.VALE.peixes);
  t.iguais("quatro 5: Espinhento de 1 kg", [c.peixe.nome, c.peixe.gramas], ["Espinhento", 1000]);
  const p2 = D.pescar(fila(1, 2, 3, 4, 6), "lago");
  t.ok("sem combinação: nada", D.concluirPescaria(p2, C.VALE.pesos, C.VALE.peixes).peixe === null);
  const p3 = D.pescar(fila(2, 2, 6, 6, 1), "lago");
  const c3 = D.concluirPescaria(p3, C.VALE.pesos, C.VALE.peixes, 2);
  t.ok("dois pares: a pessoa escolhe (Soneca de 400 g)", c3.peixe.nome === "Soneca" && c3.peixe.gramas === 400 && c3.peixe.empate);
}

t.grupo("Criação: atributos em camadas, Supimpa, característica");
{
  const o = R.fichaVazia();
  o.ocupacao = "mercenario"; o.descritor = "covarde";
  let c = R.calcular(o);
  t.igual("Mercenário covarde: Combate 2+1−1 = 2", c.atributos.combate.valor, 2);
  o.descritor = "supimpa";
  t.ok("Supimpa sem escolha: pendência", R.pendencias(o).some((p) => p.indexOf("Supimpa") === 0));
  o.supimpa = "nocao";
  c = R.calcular(o);
  t.igual("Supimpa em Noção: 3", c.atributos.nocao.valor, 3);
  t.ok("composição mostra a origem", c.atributos.nocao.composicao.some((x) => x.fonte === "Supimpa"));
  const n = R.normalizar(JSON.parse(JSON.stringify(o)));
  const n2 = R.normalizar(JSON.parse(JSON.stringify(n)));
  t.igual("abrir e salvar não soma bônus de novo", R.calcular(n2).atributos.nocao.valor, 3);
  const sc = R.sortearCaracteristicas(fila(1, 6, 3, 4, 2, 2, 2));
  t.iguais("“Role 2 vezes” rola duas outras (Olhos extras com 1d6 = 2; Cabeção)", sc.caracteristicas.map((x) => [x.chave, x.quantidade]), [["olhosExtras", 2], ["cabecao", null]]);
  const a = R.fichaVazia();
  R.criarAleatoria(a, fila(2, 3, 4, 6, 2, 2));
  t.iguais("aleatória: Zzzz, Líder supimpa, Cabeção", [a.criacao.nomeSugerido, a.ocupacao, a.descritor, a.caracteristicas[0].chave], ["Zzzz", "lider", "supimpa", "cabecao"]);
  t.ok("pendências do que é escolha (Supimpa, equipamento)", R.pendencias(a).length >= 2);
  const b = R.fichaVazia();
  R.criarAleatoria(b, fila(1, 6, 1, 1, 3, 3));
  t.igual("nome “última coisa que comeu” vira pendência", b.criacao.pendenciaDeNome, "comida");
}

t.grupo("Equipamento inicial entra UMA vez");
{
  const o = goblin("mercenario");
  t.igual("Espada e Escudo", o.itens.map((i) => i.chave).join(","), "espada,escudo");
  t.ok("Espada empunhada, Escudo vestido", item(o, "espada").equipado && item(o, "escudo").equipado);
  t.iguais("Escudo: durabilidade 2/2", item(o, "escudo").durabilidade, { atual: 2, original: 2 });
  R.concluirCriacao(o, fila());
  t.igual("concluir de novo não duplica", o.itens.length, 2);
  const b = goblin("bruxo", "mediocre", { equipamentoInicial: 1 });
  t.igual("Bruxo: Varinha e Cachecol", b.itens.map((i) => i.chave).join(","), "varinha,cachecol");
  const c = goblin("cacador", "mediocre", { equipamentoInicial: 1 });
  t.iguais("Caçador: Arco (munição 10)", item(c, "arcoEFlecha").municao, { atual: 10, max: 10 });
}

t.grupo("Ferimentos: igual à Vitalidade vive, MAIS morre");
{
  const o = goblin("lider");
  const vit = R.calcular(o).atributos.vitalidade.valor;
  t.igual("Líder medíocre: Vitalidade 3", vit, 3);
  R.sofrer(o, { ferimentos: 3 });
  t.igual("3 ferimentos (igual): vivo", o.estado.situacao, "ativo");
  t.ok("no limite", R.calcular(o).noLimite);
  R.sofrer(o, { ferimentos: 1 });
  t.igual("4 ferimentos (mais): morto", o.estado.situacao, "morto");
  R.curar(o, "todos");
  t.igual("curar depois não ressuscita", o.estado.situacao, "morto");
  t.ok("a ficha continua lá (itens, histórico)", o.itens.length > 0 && o.historico.length > 0);
  const d = goblin("gatuno");
  R.sofrer(d, { ferimentos: 2 });
  R.novoDia(d, {}, fila());
  t.igual("noite de descanso: −1 ferimento", d.ferimentos, 1);
  R.novoDia(d, { descansou: false }, fila());
  t.igual("dia sem descanso: não cura", d.ferimentos, 1);
}

t.grupo("Redução temporária de Vitalidade (Cura 0)");
{
  const o = goblin("bruxo");
  R.sofrer(o, { ferimentos: 2 });
  const r = R.conjurar(o, { magia: "cura" }, fila(2, 3, 1));
  t.igual("Cura com 0 hits", r.resultado, 0);
  t.igual("Vitalidade 2 → 1 até o fim do dia", R.calcular(o).atributos.vitalidade.valor, 1);
  t.igual("2 ferimentos > 1 de Vitalidade: morto", o.estado.situacao, "morto");
  const p = goblin("bruxo");
  R.conjurar(p, { magia: "cura" }, fila(2, 3, 1));
  t.ok("efeito com marco fimDoDia", p.efeitos.some((e) => e.chave === "curaFalhou" && e.ate === "fimDoDia"));
  R.novoDia(p, {}, fila());
  t.igual("dia novo: Vitalidade volta", R.calcular(p).atributos.vitalidade.valor, 2);
}

t.grupo("Ataque: armas, técnicas, munição, recarga");
{
  const o = goblin("mercenario");
  let m = R.montarAtaque(o, { armaId: item(o, "espada").id });
  t.igual("Combate 3 + Espada 2 + Mestre de Armas 1 = 6", m.parada, 6);
  let a = R.atacar(o, { armaId: item(o, "espada").id }, fila(6, 5, 4, 1, 2, 3, 6, 2));
  t.igual("ferimentos = hits com explosões (3 + o 6 da explosão)", a.ferimentos, 4);
  t.ok("Ataque Giratório só no nível 2", !a.giratorio);
  o.nivel = 2;
  a = R.atacar(o, { armaId: item(o, "espada").id }, fila(4, 1, 1, 1, 1, 1));
  t.ok("nível 2: ofereceu Ataque Giratório", a.giratorio);
  const g = R.atacar(o, { armaId: item(o, "espada").id, giratorio: true }, fila(4, 1, 1, 1, 1, 1));
  t.ok("o giratório não oferece outro", g.ok && !g.giratorio);
  o.nivel = 3;
  m = R.montarAtaque(o, { armaId: item(o, "espada").id, brutal: true });
  t.igual("Ataque Brutal: dobro (6×2)", m.parada, 12);
  R.atacar(o, { armaId: item(o, "espada").id, brutal: true }, fila(Array(12).fill(2)));
  t.ok("Ataque Brutal: 1 vez por dia", !R.montarAtaque(o, { armaId: item(o, "espada").id, brutal: true }).ok);
  R.novoDia(o, {}, fila());
  t.ok("dia novo: volta", R.montarAtaque(o, { armaId: item(o, "espada").id, brutal: true }).ok);

  const c = goblin("incendiario", "mediocre", { equipamentoInicial: 2 });
  const bac = item(c, "bacamarte");
  t.iguais("Bacamarte: Munição [2]", bac.municao, { atual: 2, max: 2 });
  R.atacar(c, { armaId: bac.id }, fila(2, 2, 2, 2, 2));
  t.iguais("atirou: munição 1/2", bac.municao, { atual: 1, max: 2 });
  t.ok("Recarga: precisa recarregar", bac.precisaRecarregar);
  t.ok("não ataca sem recarregar", !R.montarAtaque(c, { armaId: bac.id }).ok);
  R.recarregar(c, bac.id);
  R.atacar(c, { armaId: bac.id }, fila(2, 2, 2, 2, 2));
  R.recarregar(c, bac.id);
  t.ok("sem munição: não ataca", /sem munição/.test(R.montarAtaque(c, { armaId: bac.id }).motivo));
  R.reabastecer(c, bac.id);
  t.igual("reabasteceu", bac.municao.atual, 2);

  const h = goblin("cacador");
  const adaga = item(h, "adaga");
  m = R.montarAtaque(h, { armaId: adaga.id, modo: "arremesso", alvo: { especie: "lobo" } });
  t.igual("Caçador: Combate 3 + Adaga 1 + Inimigo (lobo) 1 = 5", m.parada, 5);
  R.atacar(h, { armaId: adaga.id, modo: "arremesso" }, fila(2, 2, 2, 2));
  t.ok("arremessada: fica onde caiu", adaga.arremessado && !adaga.equipado);
  t.ok("não ataca com ela até pegar", !R.montarAtaque(h, { armaId: adaga.id }).ok);
  R.pegarDeVolta(h, adaga.id); R.equipar(h, adaga.id, true);
  t.ok("pegou de volta", R.montarAtaque(h, { armaId: adaga.id }).ok);

  const gt = goblin("gatuno"); gt.nivel = 3;
  R.usarTecnica(gt, "esconder", {}, fila());
  t.ok("Esconder: escondido sem teste", R.temEfeito(gt, "escondido"));
  m = R.montarAtaque(gt, { armaId: item(gt, "adaga").id });
  t.igual("escondido: Ataque Furtivo +2 (2 + 1 + 2)", m.parada, 5);
  R.atacar(gt, { armaId: item(gt, "adaga").id }, fila(2, 2, 2, 2, 2));
  t.ok("atacar acaba com o Escondido", !R.temEfeito(gt, "escondido"));
  t.ok("Esconder: 1 vez por dia", !R.usarTecnica(gt, "esconder", {}, fila()).ok);
}

t.grupo("Esquiva, bloqueio, durabilidade, Sorte");
{
  const o = goblin("mercenario");
  const es = R.esquivar(o, {}, fila(5, 6, 1, 2));
  t.igual("esquiva: Combate 3 → 2 hits + explosão (1) = 2", es.rolagem.classificacao.hits, 2);
  t.ok("esquivou: não ataca no próximo turno", !R.montarAtaque(o, { armaId: item(o, "espada").id }).ok);
  const escudo = item(o, "escudo");
  let r = R.receberAtaque(o, { acertos: 5, esquiva: 2, protecaoId: escudo.id, fonte: "Lobo" });
  t.igual("5 − 2 da esquiva − 2 do escudo = 1 ferimento", r.recebidos, 1);
  t.iguais("Escudo: durabilidade 0/2", escudo.durabilidade, { atual: 0, original: 2 });
  t.ok("Durabilidade zero não bloqueia", !R.receberAtaque(o, { acertos: 1, protecaoId: escudo.id }).ok);
  R.fimDoTurno(o);
  t.ok("passou o turno: pode atacar de novo", R.montarAtaque(o, { armaId: item(o, "espada").id }).ok);
  t.ok("etéreo não deixa bloquear", !R.receberAtaque(o, { acertos: 1, protecaoId: escudo.id, etereo: true }).ok);
  const c = goblin("cacador", "mediocre", { equipamentoInicial: 2 });
  const chapeu = item(c, "chapeu");
  t.ok("Sorte só contra distância", !R.receberAtaque(c, { acertos: 3, sorteId: chapeu.id }).ok);
  r = R.receberAtaque(c, { acertos: 3, sorteId: chapeu.id, distancia: true });
  t.ok("Sorte: chapéu destruído, dano ignorado", r.recebidos === 0 && chapeu.destruido && c.ferimentos === 0);
  t.ok("item destruído continua na lista", c.itens.includes(chapeu));
  const pf = R.fichaVazia(); pf.ocupacao = "lider"; pf.descritor = "mediocre"; pf.caracteristicas = [{ id: "c", chave: "cabecao" }]; pf.equipamentoInicial = 1;
  R.concluirCriacao(pf, fila());
  t.ok("Cabeção: o Elmo inicial fica guardado (não pode usar elmo)", !item(pf, "elmo").equipado);
  t.ok("e não deixa equipar", !R.equipar(pf, item(pf, "elmo").id, true).ok);
}

t.grupo("Resistência e Imunidade do Incendiário");
{
  const o = goblin("incendiario");
  let r = R.receberAtaque(o, { acertos: 3, armaDeFogo: true });
  t.igual("Resistência: tiro de arma de fogo −1", r.recebidos, 2);
  o.ferimentos = 0;
  r = R.sofrer(o, { ferimentos: 1, fogo: true });
  t.igual("1 de fogo − 1 = 0", r.recebidos, 0);
  o.nivel = 3;
  r = R.sofrer(o, { ferimentos: 4, fogo: true });
  t.igual("Imunidade: fogo não fere", r.recebidos, 0);
  o.nivel = 2;
  R.sofrer(o, { ferimentos: 3 });
  t.ok("Delírio pede a condição declarada", !R.usarTecnica(o, "delirio", {}, fila()).ok);
  R.usarTecnica(o, "delirio", { confirmado: true, oque: "o celeiro" }, fila());
  t.igual("Delírio: todos os ferimentos fora", o.ferimentos, 0);
}

t.grupo("Magia");
{
  const o = goblin("bruxo");
  t.ok("não-Bruxo sem livro não conjura", !R.montarConjuracao(goblin("gatuno"), { magia: "fogo" }).ok);
  let r = R.conjurar(o, { magia: "fogo" }, fila(1, 2, 3));
  t.ok("Fogo 0 hits: 1 ferimento em quem conjurou", r.resultado === 0 && o.ferimentos === 1);
  r = R.conjurar(o, { magia: "fogo" }, fila(4, 5, 2));
  t.ok("Fogo 2: pede alvo visível, 3 automáticos", r.resultado === 2 && r.efeito.alvos.ferimentos === 3 && r.efeito.alvos.automatico);
  r = R.conjurar(o, { magia: "fogo" }, fila(4, 5, 6, 2));
  t.igual("Fogo 3+: todos à frente, 4 de fogo", r.efeito.alvos.ferimentos, 4);
  o.nivel = 2;
  const var1 = goblin("bruxo", "mediocre", { equipamentoInicial: 1 }); var1.nivel = 2;
  let m = R.montarConjuracao(var1, { magia: "cura", condutorId: item(var1, "varinha").id });
  t.igual("Noção 3 + Condutor (Varinha, pela técnica) + Arcano (Cachecol) = 5", m.parada, 5);
  m = R.montarConjuracao(var1, { magia: "cura", ciranda: 2 });
  t.igual("Ciranda com 2 amigos: +2 (3 + Arcano 1 + 2)", m.parada, 6);
  m = R.montarConjuracao(var1, { magia: "cura", ciranda: 1 });
  t.igual("Ciranda com 1 só: não vale", m.parada, 4);
  const imp = goblin("bruxo"); imp.nivel = 3;
  r = R.conjurar(imp, { magia: "cura", implacavel: 2 }, fila());
  t.ok("Implacável: escolhe o resultado sem rolar", r.resultado === 2 && r.rolagem === null);
  t.ok("Implacável: 1 vez por dia", !R.conjurar(imp, { magia: "cura", implacavel: 2 }, fila()).ok);
  const mo = goblin("bruxo");
  R.conjurar(mo, { magia: "morte" }, fila(1, 2, 3));
  t.iguais("Morte 0: permanente −1 Habilidade e −1 Vitalidade", [R.calcular(mo).atributos.habilidade.valor, R.calcular(mo).atributos.vitalidade.valor], [1, 1]);
  t.ok("ajuste permanente registrado com motivo", mo.ajustes.length === 2 && mo.estado.marcas.includes("esqueleto"));
  R.novoDia(mo, {}, fila());
  t.igual("permanente não some no dia novo", R.calcular(mo).atributos.habilidade.valor, 1);
  const ge = goblin("bruxo"); ge.escolhas.magias = ["gelo", "cura", "morte"];
  R.conjurar(ge, { magia: "gelo" }, fila(1, 2, 3));
  t.ok("Gelo 0: braço congelado até o fim do dia", R.temEfeito(ge, "bracoCongelado"));
  const nec = goblin("gatuno");
  R.adicionarItem(nec, "necronomicon");
  t.ok("Necronomicon: qualquer goblin conjura Morte", R.montarConjuracao(nec, { magia: "morte" }).ok && !R.montarConjuracao(nec, { magia: "fogo" }).ok);
}

t.grupo("Técnicas com aliados, efeitos com marcos");
{
  const l = goblin("lider");
  let r = R.usarTecnica(l, "gritoDeGuerra", {}, fila(4, 1));
  t.ok("Grito de Guerra com 1 hit: efeito para os aliados", r.paraAliados && r.paraAliados.mods.combate === 1 && r.paraAliados.ate === "fimDaBatalha");
  t.ok("1 vez por dia", !R.usarTecnica(l, "gritoDeGuerra", {}, fila(4, 4)).ok);
  const al = goblin("gatuno");
  R.iniciarBatalha(al);
  R.receberEfeito(al, r.paraAliados);
  t.igual("aliado: Combate 2 → 3", R.calcular(al).atributos.combate.valor, 3);
  R.fimDaBatalha(al);
  t.igual("fim da batalha: acabou", R.calcular(al).atributos.combate.valor, 2);
  const p = goblin("gatuno");
  R.adicionarItem(p, "pocao", { magico: { cor: 4 } });
  R.usarItem(p, item(p, "pocao").id, "beber", {}, fila());
  t.ok("Poção roxa: +1 dado no próximo teste", R.montarTeste(p, { atributo: "habilidade" }).parada === 4);
  R.testar(p, { atributo: "habilidade" }, fila(2, 2, 2, 2));
  t.igual("consumido na rolagem", R.montarTeste(p, { atributo: "habilidade" }).parada, 3);
  t.ok("poção bebida continua na lista, consumida", item(p, "pocao").consumido);
  const am = goblin("gatuno");
  R.adicionarItem(am, "pocao", { magico: { cor: 1 } });
  R.usarItem(am, item(am, "pocao").id, "beber", {}, fila());
  t.igual("Poção amarela: explode", am.estado.situacao, "explodiu");
  const an = goblin("gatuno");
  R.adicionarItem(an, "anelMagico");
  R.equipar(an, item(an, "anelMagico").id, true, fila(6));
  t.igual("Anel 6: Combate +1 enquanto usa", R.calcular(an).atributos.combate.valor, 3);
  R.equipar(an, item(an, "anelMagico").id, false);
  t.igual("tirou: acabou", R.calcular(an).atributos.combate.valor, 2);
  const br = goblin("gatuno");
  R.adicionarItem(br, "braceleteMagico");
  R.equipar(br, item(br, "braceleteMagico").id, true);
  const cc = R.calcular(br).atributos.habilidade;
  t.ok("Bracelete: camada de equipamento separada da base", cc.valor === 4 && cc.equipamento === 1 && cc.base === 3);
}

t.grupo("Ações demoradas e contínuas");
{
  const o = goblin("incendiario", "mediocre", { equipamentoInicial: 1 });
  const gal = item(o, "galinhaExplosiva");
  R.usarItem(o, gal.id, "soltar", {}, fila());
  let r = R.fimDoTurno(o);
  t.ok("1º turno: ainda andando", !gal.consumido && gal.aceso.turnos === 1);
  r = R.fimDoTurno(o);
  t.ok("2º turno: explodiu, 3 em volta", gal.consumido && r.eventos.some((e) => e.tipo === "explosaoDeArea" && e.aneis[0].ferimentos === 3));
  const v = goblin("gatuno");
  R.receberEfeito(v, { chave: "veneno", nome: "Envenenado", ate: "manual", porMinuto: 1 });
  R.passarMinuto(v); R.passarMinuto(v);
  t.igual("veneno: 1 ferimento por minuto", v.ferimentos, 2);
}

t.grupo("Progressão básica e Níveis Épicos");
{
  const o = goblin("gatuno");
  let r = R.derrotouOponente(o, {}, fila(5));
  t.ok("5: não sobe", !r.subiu && o.nivel === 1);
  r = R.derrotouOponente(o, {}, fila(6));
  t.ok("6: nível 2, Ataque Furtivo", r.subiu && o.nivel === 2 && R.temTecnica(o, "ataqueFurtivo"));
  R.derrotouOponente(o, {}, fila(6));
  R.derrotouOponente(o, {}, fila(6));
  t.igual("nível 4 (regra básica): explode de alegria", o.estado.situacao, "explodiuDeAlegria");
  const e = goblin("gatuno"); e.opcoes.niveisEpicos = true; e.nivel = 3;
  R.derrotouOponente(e, {}, fila(6));
  t.ok("Níveis Épicos: no 4, escolhe outra ocupação", e.estado.situacao === "ativo" && e.estado.pendenteEpico);
  t.ok("não progride antes de escolher", !R.derrotouOponente(e, {}, fila(6)).ok);
  t.ok("não pode repetir a ocupação", !R.escolherOcupacaoEpica(e, "gatuno").ok);
  R.escolherOcupacaoEpica(e, "bruxo");
  t.ok("começa Bruxo no nível 1 (Magias)", e.epicas[0].ocupacao === "bruxo" && R.temTecnica(e, "magias") && R.temTecnica(e, "esconder"));
  R.derrotouOponente(e, {}, fila(6));
  t.igual("progride na ocupação épica", e.epicas[0].nivel, 2);
  const n = goblin("gatuno"); n.opcoes.niveisEpicos = true; n.nivel = 3;
  R.derrotouOponente(n, {}, fila(6));
  R.escolherOcupacaoEpica(n, "", false);
  t.igual("ninguém acreditou: explode de alegria", n.estado.situacao, "explodiuDeAlegria");
}

t.grupo("Operações: uma vez por id, falha não deixa rastro");
{
  const o = goblin("gatuno");
  R.aplicarOperacao(o, "op-1", (x) => R.sofrer(x, { ferimentos: 1 }));
  R.aplicarOperacao(o, "op-1", (x) => R.sofrer(x, { ferimentos: 1 }));
  t.igual("repetida: aplicou uma vez", o.ferimentos, 1);
  const antes = JSON.stringify(o);
  const r = R.aplicarOperacao(o, "op-2", (x) => { x.ferimentos = 99; return { ok: false, motivo: "não" }; });
  t.ok("falhou no meio: a ficha fica como estava", !r.ok && JSON.stringify(o) === antes);
}

t.grupo("Morreu: o parente novo aponta para o anterior");
{
  const o = goblin("gatuno"); o.opcoes.adaptacoes.vale = true; o.nomeDeFamilia = "Sopa";
  R.sofrer(o, { ferimentos: 9 });
  const n = R.novoParente(o, { id: "per-1", nome: "Tik" }, fila(3, 3, 2, 2, 4, 4));
  t.ok("nível 1, linhagem, regras ligadas", n.nivel === 1 && n.linhagem.anterior.id === "per-1" && n.opcoes.adaptacoes.vale && n.nomeDeFamilia === "Sopa");
  t.igual("o antigo continua morto (não é apagado)", o.estado.situacao, "morto");
}

t.grupo("Bomba-relógio e itens que acabam com o goblin");
{
  const o = goblin("gatuno"); o.caracteristicas.push({ id: "b", chave: "bombaRelogio" });
  R.bombaRelogio(o, fila(2));
  t.igual("2: nada", o.estado.situacao, "ativo");
  R.bombaRelogio(o, fila(1));
  t.igual("1: explode", o.estado.situacao, "explodiu");
  const r = goblin("gatuno");
  R.adicionarItem(r, "relogioTicPloc");
  R.usarItem(r, item(r, "relogioTicPloc").id, "derrubar", {}, fila());
  t.igual("Relógio Tic-Ploc: sumiu", r.estado.situacao, "sumiu");
}

t.grupo("Itens: Livro Estranho, Barril, Aljava, restrições");
{
  const o = goblin("bruxo");
  R.adicionarItem(o, "livroEstranho");
  const l = item(o, "livroEstranho");
  R.usarItem(o, l.id, "ler", {}, fila(4, 5, 2, 6, 3));
  t.ok("2 hits: lido; 6 em 1d6: magia sorteada (3ª da lista = Relâmpago)", l.magico.lido && l.magico.magia === "relampago");
  t.ok("vira fonte de magia", R.magiasDisponiveis(o).some((m) => m.magia === "relampago"));
  const c = goblin("cacador", "mediocre", { equipamentoInicial: 1 });
  R.adicionarItem(c, "aljava");
  R.usarItem(c, item(c, "aljava").id, "usar", { armaId: item(c, "arcoEFlecha").id }, fila());
  t.iguais("Aljava: dobra a munição do arco", item(c, "arcoEFlecha").municao, { atual: 20, max: 20 });
  const i = goblin("incendiario", "mediocre", { equipamentoInicial: 2 });
  R.adicionarItem(i, "pistola"); R.adicionarItem(i, "barrilDePolvora");
  item(i, "bacamarte").municao.atual = 0; item(i, "pistola").municao.atual = 1;
  R.usarItem(i, item(i, "barrilDePolvora").id, "municao", { armas: [item(i, "bacamarte").id, item(i, "pistola").id] }, fila());
  t.ok("Barril de Pólvora completa a munição das armas de fogo", item(i, "bacamarte").municao.atual === 2 && item(i, "pistola").municao.atual === 5 && item(i, "barrilDePolvora").consumido);
  const p = R.fichaVazia(); p.ocupacao = "gatuno"; p.descritor = "mediocre"; p.caracteristicas = [{ id: "c", chave: "pesGigantes" }];
  R.adicionarItem(p, "sandaliaVayanna");
  t.ok("Pés gigantes não calça a Sandália", !R.equipar(p, item(p, "sandaliaVayanna").id, true).ok);
  R.adicionarItem(p, "ombreirasAnao");
  t.iguais("Ombreiras em par: durabilidade 5", item(p, "ombreirasAnao").durabilidade, { atual: 5, original: 5 });
  const mt = goblin("gatuno");
  R.adicionarItem(mt, "marteloDoPoder"); R.equipar(mt, item(mt, "espada") ? item(mt, "espada").id : item(mt, "adaga").id, false);
  R.equipar(mt, item(mt, "marteloDoPoder").id, true);
  const at = R.atacar(mt, { armaId: item(mt, "marteloDoPoder").id, alvo: { humano: false } }, fila(1, 2, 3, 2, 2, 2));
  t.igual("Martelo do Poder: +1 automático em não humano, mesmo com 0 hits", at.ferimentos, 1);
}

t.grupo("Chamado de Cthulin");
{
  const o = goblin("lider", "mediocre", { opcoes: { ...R.fichaVazia().opcoes, adaptacoes: { cthulin: true, pokepragas: false, wargoblin: false, goblinHigh: false, vale: false } }, escolhas: { ...R.fichaVazia().escolhas, inicialCthulin: "livroEspecial" } });
  t.ok("nome da ocupação muda", R.nomeDaOcupacao(o) === "Detetive / Padre / Freira");
  t.ok("começa com o Livro Especial", !!item(o, "livroEspecial"));
  const r = R.testar(o, { atributo: "nocao" }, fila(6, 5, 4, 3));
  t.ok("3 hits: evento sobrenatural (3 = tentáculos, +1 Medo)", r.eventos.some((e) => e.tipo === "sobrenatural") && o.adaptacoes.cthulin.medo === 1);
  R.receberMedo(o, 1);
  t.igual("Medo 2 = Noção 2: são", o.estado.situacao, "ativo");
  R.receberMedo(o, 1);
  t.igual("Medo 3 > Noção 2: loucura", o.estado.situacao, "louco");
  const q = goblin("lider", "mediocre", { opcoes: { ...R.fichaVazia().opcoes, adaptacoes: { cthulin: true, pokepragas: false, wargoblin: false, goblinHigh: false, vale: false } }, escolhas: { ...R.fichaVazia().escolhas, inicialCthulin: "livroEspecial" } });
  R.receberMedo(q, 2);
  R.usarItem(q, item(q, "livroEspecial").id, "queimar", {}, fila());
  t.igual("queimar o livro: Medo 0", q.adaptacoes.cthulin.medo, 0);
  const inv = R.montarConjuracao({ ...goblin("bruxo") }, { magia: "fogo" });
  t.ok("Invocação de Cthulhu: −2 dados", (() => { const b = goblin("bruxo"); b.opcoes.adaptacoes.cthulin = true; const x = R.novoItem("livroEspecial", { magico: { magia: "invocacao" } }); b.itens.push(x); return R.montarConjuracao(b, { magia: "invocacao", horror: "cthulhu" }).parada === 1; })());
}

t.grupo("PokéPragas");
{
  const o = goblin("treinador", "mediocre", { opcoes: { ...R.fichaVazia().opcoes, adaptacoes: { cthulin: false, pokepragas: true, wargoblin: false, goblinHigh: false, vale: false } } });
  t.igual("Treinador: 6 PokéPedras", o.adaptacoes.pokepragas.pokepedras, 6);
  t.igual("PokéPraga inicial incomum", o.adaptacoes.pokepragas.pragas[0].raridade, "incomum");
  const g = R.gerarPraga("raro", fila(3, 5, 4));
  t.iguais("raro 3 = Gato; elemento coluna 5–6, linha 4 = Fada", [g.praga.bicho, g.praga.elementos[0]], ["gato", "fada"]);
  const st = R.statsDaPraga(g.praga);
  t.iguais("Gato Fada: Hab 4+1, Noç 3+1, fraqueza Metal", [st.habilidade, st.nocao, st.fraqueza], [5, 4, "metal"]);
  let r = R.procurarPraga(o, fila(6, 1, 1, 1));
  t.ok("procurou: rara (Pinscher)", r.praga && r.praga.raridade === "raro");
  t.ok("procurar leva o dia", !R.procurarPraga(o, fila(6)).ok);
  r = R.capturarPraga(o, "Totó", {}, fila(4, 5, 2));
  t.ok("rara precisa de 3 hits: escapou", !r.capturou && o.adaptacoes.pokepragas.pragas.length === 1);
  r = R.capturarPraga(o, "Totó", {}, fila(4, 5, 6, 1));
  t.ok("3 hits: capturou e gastou uma pedra", r.capturou && o.adaptacoes.pokepragas.pokepedras === 5 && o.adaptacoes.pokepragas.pragas[1].nome === "Totó");
  const id = o.adaptacoes.pokepragas.pragas[1].id;
  r = R.verificarEvolucao(o, id, fila(5));
  t.ok("1 dado sem 6: não evolui", !r.evoluiu);
  o.nivel = 2;
  r = R.verificarEvolucao(o, id, fila(2, 6, 1, 2));
  t.ok("Mestre da Evolução: 2 dados, um 6 → evolui (+Vit, novo elemento)", r.evoluiu && o.adaptacoes.pokepragas.pragas[1].evolucoes === 1 && o.adaptacoes.pokepragas.pragas[1].elementos.length === 2);
  const pr = o.adaptacoes.pokepragas.pragas[1];
  const ataque = R.ataqueDePraga(o, pr.id, { elemento: pr.elementos[0], fraquezaDoAlvo: pr.elementos[0] }, fila(4, 2, 2, 2, 2, 2, 2));
  t.igual("elemental na fraqueza do alvo: +1", ataque.ferimentos, 2);
}

t.grupo("Goblin High e Vale dos Goblins");
{
  const o = goblin("gatuno", "mediocre", { opcoes: { ...R.fichaVazia().opcoes, adaptacoes: { cthulin: false, pokepragas: false, wargoblin: false, goblinHigh: true, vale: false } } });
  R.adicionarEstudante(o, "Bibi", fila(2, 1, 2, 3, 6));
  const e = o.adaptacoes.goblinHigh.estudantes[0];
  t.ok("Reação 2 = Neutro; segredo 6", e.reacao === "neutro" && e.segredo === 6);
  t.ok("agradar sem conversar: não", !R.agradar(o, e.id, {}, fila(4, 4)).ok);
  let r = R.conversar(o, e.id, {}, fila(4, 1, 1));
  t.ok("conversou (1 hit): Conversa 1 revela o Assunto", r.revelou === "assunto" && e.revelado.assunto);
  r = R.agradar(o, e.id, {}, fila(4, 5));
  t.ok("agradar com 2 hits: Neutro → Amigável", r.reacao.para === "amigavel");
  t.ok("duas vezes no dia: não", !R.agradar(o, e.id, {}, fila(4, 5)).ok);
  R.novoDia(o, {}, fila());
  R.conversar(o, e.id, {}, fila(4, 2, 2));
  R.agradar(o, e.id, { gosto: true }, fila());
  t.igual("fez algo que ele gosta: Amigo", e.reacao, "amigo");
  R.perguntarSegredo(o, e.id);
  r = R.tentarRomance(o, e.id, {}, fila());
  t.ok("Amigo com segredo “gosta de você”: romance", r.ok && e.romance);
  R.adicionarEstudante(o, "Ugh", fila(6, 1, 1, 1, 1));
  const u = o.adaptacoes.goblinHigh.estudantes[1];
  r = R.conversar(o, u.id, {}, fila());
  t.ok("Hostil: agride e vai embora", r.hostil);
  R.mudarReacao(o, u.id, -1, "zoou ele");
  t.igual("abaixo de Hostil: Inimigo", u.reacao, "inimigo");
  r = R.novoDia(o, {}, fila(6, 3));
  t.ok("fim do dia: Inimigo rola “Te pego na saída” (6: Briga, 1d6−1 amigos)", r.eventos.some((x) => x.tipo === "tePego") && o.adaptacoes.goblinHigh.briga.amigosDele === 2);
  R.resolverBriga(o, false);
  t.ok("perdeu a briga: todos −1 (menos Amigos)", e.reacao === "amigo" && o.adaptacoes.goblinHigh.humilhado);
  R.agradar(o, u.id, {}, fila(4, 6, 5)); R.novoDia(o, {}, fila(1)); R.agradar(o, u.id, {}, fila(4, 6, 5));
  t.igual("3 hits em dois dias seguidos: deixa de ser Inimigo (fica Hostil)", u.reacao, "hostil");

  const f = goblin("fazendeiro", "mediocre", { modEscolhido: "habilidade", equipamentoInicial: 1, opcoes: { ...R.fichaVazia().opcoes, adaptacoes: { cthulin: false, pokepragas: false, wargoblin: false, goblinHigh: false, vale: true } } });
  const v = f.adaptacoes.vale;
  t.ok("Herança: fazenda com 1 galinha e 1 vaca", v.fazenda && v.galinhas === 1 && v.vacas === 1);
  r = R.coletar(f, "animais", fila(4, 5, 1, 6, 1, 2, 4));
  t.ok("coleta: hits viram ovos e leite", v.recursos.ovo === 2 && v.recursos.leite === 2);
  t.ok("uma coleta por dia", !R.coletar(f, "animais", fila()).ok);
  r = R.plantar(f, "Batata", fila(4, 5, 2, 3));
  t.ok("plantou 2 m², colhe em 1d6 (3) dias", f.adaptacoes.vale.hortas[0].m2 === 2 && f.adaptacoes.vale.hortas[0].colheitaEm === f.tempo.dia + 3);
  t.ok("antes do dia: não colhe", !R.colher(f, v.hortas[0].id, fila()).ok);
  f.tempo.dia += 3; f.nivel = 2;
  r = R.colher(f, v.hortas[0].id, fila(4, 2, 5, 6, 1));
  t.ok("colheu com Dedo Verde: o dobro", v.alimentos.Batata === 6);
  v.minas = 1;
  r = R.coletar(f, "pedra", fila(4, 4, 2));
  t.igual("mina com Picareta: Combate 2 → 2 pedras", v.recursos.pedra, 2);
  const pesc = D.pescar(fila(3, 3, 3, 1, 2), "rio"); D.concluirPescaria(pesc, C.VALE.pesos, C.VALE.peixes);
  R.guardarPeixe(f, pesc);
  t.ok("pescou uma Piranha de 600 g", v.peixes[0].nome === "Piranha" && v.peixes[0].gramas === 600);
  v.recursos.ovo = 1; v.alimentos.Arroz = 1;
  r = R.cozinhar(f, "pratoFeito", { peixeId: v.peixes[0].id }, fila(2, 2, 2));
  t.ok("Prato Feito falhou: ingredientes gastos à toa", !r.cozinhou && v.recursos.ovo === 0 && v.peixes.length === 0);
  t.ok("faltando ingrediente: nem rola", !R.cozinhar(f, "bolo", {}, fila()).ok);
  v.recursos.madeira = 1;
  r = R.construir(f, "varaDePesca", fila(4, 5, 1));
  t.ok("construiu uma Vara de Pescar (2 hits)", r.construiu && v.recursos.madeira === 0);
}

t.grupo("Mesa: sorteios únicos, combate, masmorra, negociação");
{
  const e = M.vazio();
  let r = M.sortear(e, "viajante", "op-a", fila(4, 6, 3));
  t.ok("Viajante 10: bando de 1d6 goblins (rolou 3)", r.sorteio.texto === "Um bando de 1d6 goblins" && r.sorteio.detalhes[0].quantidade === 3);
  const r2 = M.sortear(e, "viajante", "op-a", fila(1, 1));
  t.ok("mesmo id: devolve o MESMO sorteio, sem rolar", r2.repetida && r2.sorteio.n === r.sorteio.n && e.sorteios.length === 1);
  M.sortear(e, "viajante", "op-b", fila(1, 1));
  t.igual("outro id: outro registro", e.sorteios.length, 2);
  r = M.sortear(e, "itemMagico", "op-c", fila(1, 6));
  t.igual("Item mágico: Artefato 6 = Necronomicon", r.sorteio.resultado.item, "necronomicon");
  r = M.sortear(e, "local", "op-d", fila(4, 2, 3, 1, 5));
  t.ok("Local 4 = Taverna, com taverneiro e quantidades", r.sorteio.resultado.local === "taverna" && r.sorteio.detalhes.length === 4 && r.sorteio.detalhes[1].quantidade === 2);
  t.ok("1d6−2 nunca negativo na taverna", r.sorteio.detalhes[3].quantidade === 0 && r.sorteio.detalhes[3].dados[0] === 1);

  M.adicionarInimigos(e, "golemMadeira", 1);
  M.adicionarInimigos(e, "guarda", 2);
  const golem = e.combate.participantes[0];
  t.ok("Golem: Noção ausente (null), não 0", golem.nocao === null && golem.habilidade === 3);
  const g1 = e.combate.participantes[1];
  t.iguais("Guarda: Combate 4 (+3 da arma) e proteção 3 à parte", [g1.combate, g1.bonusCombate, g1.vitalidade, g1.protecao.atual], [4, 3, 3, 3]);
  M.adicionarInimigos(e, "besta", 1);
  const besta = e.combate.participantes[3];
  t.ok("Besta Indescritível: sem números", besta.indescritivel && besta.combate === null && besta.vitalidade === null);
  t.ok("ela não rola ataque", !M.rolarPorParticipante(e, besta.id, {}, fila()).ok);
  M.adicionarPC(e, { id: "per-9", nome: "Plaft", resumo: { atributos: { combate: 3, habilidade: 2, nocao: 2, vitalidade: 2 } } });
  M.iniciarCombate(e, "goblins");
  t.igual("goblins surpreenderam: agem primeiro", M.vezAtual(e).nome, "Plaft");
  r = M.ferir(e, golem.id, 3, { fogo: true });
  t.igual("Golem de Madeira: dobro de fogo (6)", golem.ferimentos, 6);
  r = M.ferir(e, g1.id, 5, { bloquear: true });
  t.ok("Guarda bloqueia com a proteção (3), leva 2", g1.ferimentos === 2 && g1.protecao.atual === 0 && !g1.derrotado);
  r = M.ferir(e, g1.id, 1, {});
  t.ok("3 de 3: vivo; mais um: derrotado", !g1.derrotado && M.ferir(e, g1.id, 1, {}).eventos.some((x) => x.tipo === "derrotado"));
  const at = M.rolarPorParticipante(e, e.combate.participantes[2].id, {}, fila(1, 1, 1, 1, 1, 1, 1));
  t.ok("inimigo com todos os dados em 1: não “explode”", at.ok && !at.rolagem.classificacao.goblinExplode);
  t.igual("Guarda ataca com 4 + 3 dados", at.rolagem.dados.length, 7);
  M.combateSincronizado(e, e.combate.participantes[2].id);
  t.igual("Combate Sincronizado: −1 dado no próximo ataque", M.paradaDeInimigo(e, e.combate.participantes[2].id).parada, 6);
  M.rolarPorParticipante(e, e.combate.participantes[2].id, {}, fila(2, 2, 2, 2, 2, 2));
  t.igual("e só no próximo", M.paradaDeInimigo(e, e.combate.participantes[2].id).parada, 7);
  M.adicionarInimigos(e, "troll", 1);
  const troll = e.combate.participantes[5];
  troll.ferimentos = 5;
  M.acaoDemorada(e, { nome: "Galinha Explosiva", turnos: 2, ferimentos: 3, tipo: "galinha" });
  let pv;
  for (let k = 0; k < 6; k++) { pv = M.proximaVez(e, fila(4, 4, 4, 4, 4, 4)); if (M.vezAtual(e).id === troll.id) break; }
  t.ok("no turno do Troll: regenera 1d6−1 (3)", troll.ferimentos === 2 && pv.eventos.some((x) => x.tipo === "regeneracao"));

  const n = M.negociar(e, { negociador: { nome: "Plaft", nocao: 2 }, maisForte: 3, vitima: { nome: "Camponês", combate: 4, nocao: 3 } }, "ng-1", fila());
  t.igual("vítima com mais Combate: ataca primeiro", n.negociacao.resultado, "ataca");
  const n2 = M.negociar(e, { negociador: { nome: "Plaft", nocao: 2 }, maisForte: 3, vitima: { nome: "Camponês", combate: 3, nocao: 3 } }, "ng-2", fila(4, 5, 4, 1, 2));
  t.igual("2 × 1 hits: a vítima entrega tudo", n2.negociacao.resultado, "vitimaEntrega");
  const n3 = M.negociar(e, { negociador: { nome: "Plaft", nocao: 2 }, maisForte: 3, vitima: { nome: "Camponês", combate: 3, nocao: 3 } }, "ng-3", fila(1, 1, 4, 5, 2));
  t.ok("negociador com todos 1: explode", n3.negociacao.goblinExplode && n3.negociacao.resultado === "goblinsEntregam");

  /* O exemplo do livro (p. 30–31). */
  const ms = M.gerarMasmorra(e, "ms-1", fila(5, 4, 1, 5, 4, 6, 5, 6, 3, 4, 1, 1));
  const segs = ms.masmorra.segmentos;
  t.igual("tipo 5 = Cripta Assombrada", ms.masmorra.tipo, "cripta");
  t.ok("1º segmento: 4+0 = Sala pequena (1 porta)", segs[0].nome === "Sala pequena" && segs[0].portas === 1);
  t.ok("2º: 1+1 = Sala média (2 portas)", segs[1].indice === 2 && segs[1].profundidade === 1);
  t.iguais("os dois caminhos: 5+2 = 7 (sem portas), 4+2 = 6 (corredor), e 6+3 = 9 (Sala grande)", segs.map((x) => x.indice), [4, 2, 7, 6, 9]);
  t.ok("conteúdo: 1d6 Zumbis rolados (4)", /^4 Zumbis/.test(segs[2].conteudo.texto) && segs[3].conteudo.texto === "Nada" && segs[4].conteudo.texto === "Vampiro em um trono");
  t.ok("masmorra nasce oculta para os jogadores", ms.masmorra.oculto && M.vistaDosJogadores(e).masmorras.length === 0);
  t.ok("mesmo id: mesma masmorra", M.gerarMasmorra(e, "ms-1", fila()).repetida);

  const br = M.gerarBandoRival(e, [{ id: "a", nome: "Plaft", resumo: { atributos: { combate: 3, habilidade: 2, nocao: 2, vitalidade: 2 }, melhorArma: 2 } }], "br-1", fila(3, 4));
  t.ok("Bando Rival: mesmos números, característica 7 (roupas invertidas)", br.bando.membros[0].atributos.combate === 3 && br.bando.membros[0].caracteristica.texto === "Cores das roupas invertidas.");
  M.encerrarCombate(e);
  t.ok("fim do combate: efeitos de batalha saem", !e.combate.ativo);
  const nv = M.normalizar(JSON.parse(JSON.stringify(e)));
  t.ok("normalizar preserva null, 0 e indescritível", nv.combate.participantes[0].nocao === null && nv.combate.participantes[3].indescritivel);
}

t.grupo("Catálogo: completo e com página");
{
  t.igual("6 ocupações básicas + Treinador + Fazendeiro", Object.keys(C.OCUPACOES).length, 8);
  t.igual("36 casas de característica", C.CARACTERISTICA_2D6.flat().length, 36);
  t.ok("toda característica da tabela existe", C.CARACTERISTICA_2D6.flat().every((k) => k === "rolarDuasVezes" || C.CARACTERISTICAS[k]));
  t.igual("7 magias do Bruxo", C.MAGIAS_DO_BRUXO.length, 7);
  t.ok("toda magia tem 4 resultados", Object.values(C.MAGIAS).every((m) => m.resultados.length === 4));
  t.igual("21 armas da p. 12", Object.values(C.ARMAS).filter((a) => !a.adaptacao).length, 21);
  t.igual("10 proteções da p. 13", Object.values(C.PROTECOES).filter((a) => !a.adaptacao).length, 10);
  t.igual("24 itens mágicos das tabelas + 4 só na lista", Object.values(C.ITENS_MAGICOS).length, 28);
  t.ok("toda tabela de item mágico aponta para item existente", Object.values(C.MAGICOS_D6).flat().every((k) => C.ITENS_MAGICOS[k]));
  t.ok("todo inimigo dos encontros existe", [C.VIAJANTE_2D6, C.PROTEGER_2D6, C.VIZINHOS_2D6].every((tb) => Object.values(tb).every((x) => !x.grupo || x.grupo.every((g) => C.INIMIGOS[g.inimigo]))));
  t.ok("todo item inicial existe no catálogo", Object.values(C.OCUPACOES).every((o) => o.equipamento.every((e) => e.itens.every((k) => C.itemDoCatalogo(k)))));
  t.ok("toda arma, proteção e item mágico tem página", [C.ARMAS, C.PROTECOES, C.ITENS_MAGICOS, C.EQUIPAMENTOS].every((m) => Object.values(m).every((x) => x.pagina)));
  t.ok("todo inimigo tem página", Object.values(C.INIMIGOS).every((x) => x.pagina));
  t.igual("Varinha sem Condutor na tabela (inconsistência registrada)", !!C.ARMAS.varinha.condutor, false);
  t.ok("inconsistências documentadas", C.INCONSISTENCIAS.length >= 15);
  t.ok("pré-ocupações por raridade: 6 cada", ["comum", "incomum", "raro"].every((r) => C.POKE.bichos[r].length === 6 && C.POKE.bichos[r].every((b) => C.POKE.ficha[b])));
}

console.log(`\n${FORTE}${passaram} ok${FIM}${falharam ? `, ${VERMELHO}${falharam} falharam${FIM}` : ""}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
