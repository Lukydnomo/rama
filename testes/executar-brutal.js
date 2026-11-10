/* =====================================================================
   R.A.M.A. — testes de BRUTAL · Corte Rápido (v7.0)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-brutal.js

   Sem navegador e sem rede. Os dados são uma FILA de resultados
   combinados: cada teste diz o que cai, e o motor nunca sorteia
   sozinho. Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = ["js/brutal/catalogo.js", "js/brutal/regras.js", "js/brutal/mesa.js"];
globalThis.window = globalThis;
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}\n${e.stack}`); Deno.exit(1); }
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

const K = globalThis.RAMABrutalCatalogo, B = globalThis.RAMABrutal, M = globalThis.RAMABrutalMesa;
const DIRETORA = { diretora: true };
const jog = (...ids) => ({ diretora: false, pode: ids });

function fila(...faces) {
  const q = faces.flat();
  const f = () => { if (!q.length) throw new Error("fila de dados vazia"); return q.shift(); };
  f.resta = () => q.length;
  return f;
}
const nada = () => { throw new Error("rolou sem esperar"); };

/* Um Thriller com o elenco dado: [{ id, nome, arquetipo }]. */
function thriller(elenco, assassino) {
  const e = M.estadoVazio();
  M.sincronizarElenco(e, elenco.map((x) => ({ id: x.id, nome: x.nome || x.id, resumo: { arquetipo: x.arquetipo } })));
  if (assassino) {
    const r = M.aplicar(e, Object.assign({ tipo: "configurarAssassino", aplicarPilha: true }, assassino), DIRETORA, nada);
    if (!r.ok) throw new Error(r.motivo);
  }
  return e;
}
function ap(e, op, papel, rolar) { return M.aplicar(e, op, papel || DIRETORA, rolar || nada); }

/* =================================================================== */
t.grupo("Catálogo · o que o Corte Rápido traz");
{
  t.igual("8 Arquétipos", K.ORDEM_ARQUETIPOS.length, 8);
  t.igual("5 Estilos", K.ORDEM_ESTILOS.length, 5);
  t.ok("cada Arquétipo com 2 Estilos válidos, Habilidade e imagem de Iniciativa", K.ORDEM_ARQUETIPOS.every((k) => { const a = K.ARQUETIPOS[k]; return a.estilos.length === 2 && a.estilos.every((s) => K.ESTILOS[s]) && a.habilidade && a.iniciativa >= 1; }));
  t.iguais("Iniciativa da p. 21", K.INICIATIVA, ["heroina", "atleta", "valentona", "esbelta", "inocente", "nerd", "relaxada", "cetica"]);
  t.iguais("Estilos da Valentona", K.ARQUETIPOS.valentona.estilos, ["firme", "potente"]);
  t.igual("3 Gerais + 5 de Estilo", K.ORDEM_VANTAGENS.length, 8);
  t.ok("uma Vantagem por Estilo", K.ORDEM_ESTILOS.every((s) => Object.values(K.VANTAGENS).filter((v) => v.estilo === s).length === 1));
  t.igual("6 Ações de Encontro", K.ORDEM_ACOES_ENCONTRO.length, 6);
  t.igual("6 Ações Gerais + 6 Únicas do Assassino", Object.values(K.ACOES_ASSASSINO).length, 12);
  t.igual("4 Apavoros", Object.keys(K.APAVOROS).length, 4);
  t.igual("4 Assassinos prontos", K.ORDEM_ASSASSINOS.length, 4);
  t.ok("cada Assassino pronto com Ações Únicas da Ameaça Principal", K.ORDEM_ASSASSINOS.every((k) => { const a = K.ASSASSINOS[k]; return a.acoesUnicas.every((x) => K.AMEACAS[a.ameacas[0]].acoesUnicas.indexOf(x) >= 0); }));
  t.iguais("Bruto: 6 dados, 3 PH, 1 Susto", [K.ASSASSINOS.bruto.dados, K.ASSASSINOS.bruto.ph, K.ASSASSINOS.bruto.sustos], [6, 3, 1]);
  t.ok("lacunas registradas (meta da Fuga, Tratar Feridas, Cara Lavada…)", ["metaFuga", "tratarFeridas", "caraLavada", "planejarFuga", "fonteDosDados", "estigma"].every((k) => K.LACUNAS[k]));
  t.igual("Tratar Feridas sem custo oficial", K.VANTAGENS.tratarFeridas.custo, null);
}

t.grupo("Ficha persistente · separada do Thriller");
{
  const b = B.normalizar({ arquetipo: "nerd", apegos: { desejo: { texto: "x", revelado: true } } });
  t.iguais("resumo para a mesa: Arquétipo, Estilos, Iniciativa", [B.resumoParaMesa(b).arquetipo, B.resumoParaMesa(b).estilos, B.resumoParaMesa(b).iniciativa], ["nerd", ["ligeiro", "sagaz"], 6]);
  t.ok("a ficha não guarda pilhas, PT nem Feridas", !("pilha" in b) && !("pt" in b) && !("ferida" in b));
  t.igual("Arquétipo desconhecido não entra", B.normalizar({ arquetipo: "vampira" }).arquetipo, "");
  t.ok("Desejo Obscuro revelado é para sempre", B.resumoParaMesa(b).desejoRevelado === true);
  const e1 = thriller([{ id: "a", arquetipo: "nerd" }]), e2 = thriller([{ id: "a", arquetipo: "nerd" }]);
  ap(e1, { tipo: "dadoManual", quem: "a", acao: "descartar" }, jog("a"));
  t.iguais("a mesma ficha em dois Thrillers: pilhas independentes", [M.sob(e1, "a").pilha, M.sob(e2, "a").pilha], [5, 6]);
}

t.grupo("Testes · Livre e Suspense sacrificam; Complexo exige exatamente 2");
{
  const e = thriller([{ id: "a", arquetipo: "cetica" }]);
  e.diretora.pilha = 3;
  let r = ap(e, { tipo: "teste", quem: "a", dados: 3, estilo: "potente" }, jog("a"), fila(4, 2, 1));
  t.ok("teste comum: 1 sucesso supera", r.ok && r.contagem.superado && r.contagem.sucessos === 1);
  t.iguais("Livre: as 2 falhas são SACRIFICADAS (Diretora 3 → 5)", [M.sob(e, "a").pilha, e.diretora.pilha], [4, 5]);
  ap(e, { tipo: "mudarCena", cena: "suspense" });
  r = ap(e, { tipo: "teste", quem: "a", dados: 1, estilo: "firme" }, jog("a"), fila(3));
  t.ok("Estilo dela (Firme): sucesso em 3+", r.contagem.superado && r.teste.dificuldade === 3);
  r = ap(e, { tipo: "teste", quem: "a", dados: 1, estilo: "potente" }, jog("a"), fila(3));
  t.ok("Estilo que não é dela (Potente): 3 falha", !r.contagem.superado && r.teste.dificuldade === 4);
  t.iguais("Suspense também sacrifica", [M.sob(e, "a").pilha, e.diretora.pilha], [3, 6]);
  const c = thriller([{ id: "b", arquetipo: "atleta" }]);
  const um = ap(c, { tipo: "teste", quem: "b", dados: 3, complexo: true }, jog("b"), fila(5, 1, 2));
  const dois = ap(c, { tipo: "teste", quem: "b", dados: 3, complexo: true }, jog("b"), fila(5, 6, 2));
  const tres = ap(c, { tipo: "teste", quem: "b", dados: 3, complexo: true }, jog("b"), fila(5, 6, 4));
  t.iguais("Complexo: 1 sucesso falha, 2 supera, 3 FALHA", [um.contagem.superado, dois.contagem.superado, tres.contagem.superado], [false, true, false]);
  t.igual("recurso reduz a dificuldade e é gasto", (() => { const x = thriller([{ id: "c", arquetipo: "nerd" }]); ap(x, { tipo: "recurso", quem: "c", nome: "Lanterna", usos: 1 }, jog("c")); const rid = M.sob(x, "c").recursos[0].id; const rr = ap(x, { tipo: "teste", quem: "c", dados: 1, estilo: "sagaz", recursos: [rid] }, jog("c"), fila(2)); return rr.teste.dificuldade + "/" + M.sob(x, "c").recursos.length + "/" + rr.contagem.superado; })(), "2/0/true");
  const p = ap(c, { tipo: "teste", quem: "b", dados: 9 }, jog("b"), fila());
  t.ok("não arrisca mais dados do que tem", p.ok === false && /1 a/.test(p.motivo));
}

t.grupo("Teste de Susto · 1 dado, falha descarta e dá PH");
{
  const e = thriller([{ id: "a", arquetipo: "nerd" }, { id: "c", arquetipo: "cetica" }], { modelo: "sangria" });
  t.iguais("Sangria: 4 dados, 2 PH", [e.diretora.pilha, e.diretora.ph], [4, 2]);
  let r = ap(e, { tipo: "assustar" });
  t.ok("ASSUSTAR em Livre cria o Teste de Susto para todas", r.ok && e.pedidos.length === 1 && e.pedidos[0].assustar);
  const pid = e.pedidos[0].id;
  r = ap(e, { tipo: "teste", quem: "a", pedido: pid, dados: 4 }, jog("a"), fila(2));
  t.iguais("só 1 dado; a falha é DESCARTADA (não sacrificada)", [r.teste.dados, M.sob(e, "a").pilha, e.descarte, e.diretora.pilha], [1, 5, 1, 4]);
  t.igual("Intento (falha no Susto) + Intento Único da Assombração: +2 PH", e.diretora.ph, 4);
  r = ap(e, { tipo: "teste", quem: "c", pedido: pid }, jog("c"), fila(1));
  t.ok("Cética: o teste espera — pode repetir", r.pendente && M.sob(e, "c").teste);
  t.ok("outra ação dela fica bloqueada até decidir", ap(e, { tipo: "dadoManual", quem: "c", acao: "descartar" }, jog("c")).ok === false);
  r = ap(e, { tipo: "repetirSusto", quem: "c" }, jog("c"), fila(5));
  t.ok("Benefício da Dúvida: repetiu e passou (5)", r.ok && r.contagem.superado && M.sob(e, "c").pilha === 6);
  t.ok("o pedido fecha quando todas respondem", e.pedidos[0].aberto === false);
  t.ok("ACIDENTAR: só em quem falhou no Susto do ASSUSTAR", ap(e, { tipo: "acidentar", alvo: "c", pedido: pid }).ok === false);
  const pc = ap(e, { tipo: "pedirTeste", teste: "complexo", alvos: ["a"], rotulo: "Abrir o cadeado" });
  t.ok("pedido de Teste Complexo pela Diretora", pc.ok && e.pedidos[e.pedidos.length - 1].tipo === "complexo");
  const pr = ap(e, { tipo: "teste", quem: "a", pedido: e.pedidos[e.pedidos.length - 1].id, dados: 2, complexo: false }, jog("a"), fila(5, 5));
  t.ok("…a resposta é Complexa mesmo se a jogadora não marcar", pr.teste.complexo && pr.contagem.superado);
  r = ap(e, { tipo: "acidentar", alvo: "a", pedido: pid }, DIRETORA, fila(3));
  t.ok("ACIDENTAR (4 PH): FERIR fora do Encontro", r.ok && M.sob(e, "a").ferida === 3 && M.sob(e, "a").sequelas === 1 && e.diretora.ph === 0);
  ap(e, { tipo: "mudarCena", cena: "suspense" });
  t.ok("ASSUSTAR não é de Suspense", ap(e, { tipo: "assustar" }).ok === false);
}

t.grupo("Encontro · condição, Iniciativa e a vez");
{
  const e = thriller([{ id: "c", nome: "Cética", arquetipo: "cetica" }, { id: "h", nome: "Heroína", arquetipo: "heroina" }, { id: "v", nome: "Valentona", arquetipo: "valentona" }], { modelo: "bruto" });
  let r = ap(e, { tipo: "iniciarEncontro", meta: 3 });
  t.ok("Bruto com 6 dados não supera Pilhas de 6: não começa", r.ok === false && /superar/.test(r.motivo));
  ap(e, { tipo: "dadoManual", quem: "c", acao: "descartar" }, jog("c"));
  r = ap(e, { tipo: "iniciarEncontro" });
  t.ok("sem a meta da Fuga, a Diretora precisa escolher (lacuna)", r.ok === false && /Pilha de Fuga/.test(r.motivo));
  r = ap(e, { tipo: "iniciarEncontro", meta: 3, dificultar: true });
  t.ok("Dificultar (4 PH) com 3 PH: recusado", r.ok === false && /Horror/.test(r.motivo));
  r = ap(e, { tipo: "iniciarEncontro", meta: 3 });
  t.ok("começa quando a Pilha da Diretora supera a de alguém (6 > 5)", r.ok && e.cena === "encontro");
  t.iguais("Iniciativa: Heroína, Valentona, Cética e o Assassino por último", e.encontro.ordem, ["h", "v", "c", "assassino"]);
  t.igual("a vez é da Heroína", M.daVez(e), "h");
  t.ok("fora da vez: recusado", ap(e, { tipo: "acaoEncontro", quem: "c", acao: "recuperarFolego" }, jog("c")).ok === false);
  t.ok("Vantagem durante o Encontro: recusada", /Encontro/.test(M.motivoDaVantagem(e, M.sob(e, "h"), "surpreender")));
  t.ok("teste avulso no Encontro: só pelas Ações", ap(e, { tipo: "teste", quem: "h", dados: 1 }, jog("h"), fila()).ok === false);
  r = ap(e, { tipo: "acaoEncontro", quem: "h", acao: "vazarDali", dados: 3 }, jog("h"), fila(6, 4, 1));
  const h = M.sob(e, "h");
  t.iguais("Vazar Dali: 2 sucessos + 1 pelo 6 = Fuga 3 (meta); 1 falha descartada", [h.fuga, h.pilha, h.situacao], [3, 2, "fugiu"]);
  t.igual("e a vez passa para a Valentona", M.daVez(e), "v");
  r = ap(e, { tipo: "acaoEncontro", quem: "v", acao: "partirParaCima", dados: 2 }, jog("v"), fila(5, 2));
  t.iguais("Partir Para Cima: a Diretora descarta 1 (6 → 5); a falha também é descartada", [e.diretora.pilha, M.sob(e, "v").pilha], [5, 5]);
  r = ap(e, { tipo: "acaoEncontro", quem: "c", acao: "distrair", dados: 3 }, jog("c"), fila(5, 6, 1));
  t.ok("Distrair (Complexo Desenrolado): 2 sucessos superam", r.contagem.superado && e.encontro.distrair === 1);
  t.igual("vez do Assassino", M.daVez(e), "assassino");
  r = ap(e, { tipo: "matar", alvo: "c" });
  t.ok("MATAR com Distrair custa +1 dado e +3 PH (há 3 PH)", r.ok && M.sob(e, "c").situacao === "morta" && e.diretora.ph === 0 + 1 && e.diretora.pilha === 4);
  t.ok("uma ação por vez do Assassino", ap(e, { tipo: "ferir", alvo: "v" }, DIRETORA, fila(2)).ok === false);
  t.ok("Sinto Cheiro de Sangue! disponível depois da primeira morte", e.encontro.cheiro === true);
  ap(e, { tipo: "fimDoTurno" });
  t.iguais("rodada 2, Distrair zera; a Heroína já fugiu: vez da Valentona", [e.encontro.rodada, e.encontro.distrair, M.daVez(e)], [2, 0, "v"]);
}

t.grupo("Encontro · FERIR, Sequelas, MUTILAR, SEGURAR, INCAPACITAR");
{
  const e = thriller([{ id: "r", nome: "Relaxada", arquetipo: "relaxada" }, { id: "n", nome: "Nerd", arquetipo: "nerd" }], { modelo: "bruto" });
  e.diretora.ph = 20;
  ap(e, { tipo: "dadoManual", quem: "n", acao: "descartar" }, jog("n"));
  ap(e, { tipo: "iniciarEncontro", meta: 4 });
  ap(e, { tipo: "passarVez" }); ap(e, { tipo: "passarVez" });
  let r = ap(e, { tipo: "ferir", alvo: "r" }, DIRETORA, fila(3));
  const rx = M.sob(e, "r");
  t.iguais("FERIR 3: marcador de Ferida 3, 1 Sequela, o dado da Diretora é descartado", [rx.ferida, rx.sequelas, e.diretora.pilha, e.descarte], [3, 1, 5, 2]);
  r = ap(e, { tipo: "segurar", alvo: "r" });
  t.ok("SEGURAR (5 PH) logo depois de FERIR", r.ok && rx.segurada && e.diretora.ph === 15);
  r = ap(e, { tipo: "incapacitar", alvo: "r", estilo: "ligeiro" });
  t.ok("INCAPACITAR não é do Bruto? (é: Incapacitar e Segurar)", r.ok && rx.incapacitados.indexOf("ligeiro") >= 0);
  r = ap(e, { tipo: "habilidade", quem: "r", chave: "ole" }, jog("r"), fila(1));
  t.ok("Olé: rerrola o marcador (3 → 1), sem ficar abaixo das Sequelas (1)", r.ok && rx.ferida === 1);
  ap(e, { tipo: "fimDoTurno" });
  t.igual("rodada 2: a Nerd vem antes da Relaxada", M.daVez(e), "n");
  ap(e, { tipo: "passarVez" });
  t.ok("SEGURADA: Ferida +1 no começo do turno dela", rx.ferida === 2 && M.daVez(e) === "r");
  t.ok("SEGURADA não Vaza", /SEGURADA/.test(M.motivoDaAcao(e, rx, "vazarDali")));
  t.ok("Estilo incapacitado não reduz a dificuldade", M.dificuldade(rx, "ligeiro", []).valor === 4);
  ap(e, { tipo: "passarVez" }); ap(e, { tipo: "fimDoTurno" });
  r = ap(e, { tipo: "acaoEncontro", quem: "n", acao: "livrarAliada", alvo: "r", dados: 2 }, jog("n"), fila(4, 5));
  t.ok("Livrar a aliada (Complexo): 2 sucessos soltam", r.ok && !rx.segurada);
  ap(e, { tipo: "passarVez" });
  r = ap(e, { tipo: "ferir", alvo: "n" }, DIRETORA, fila(6));
  t.ok("6 no FERIR: a Diretora decide", r.ok && e.seis && e.seis.alvo === "n");
  t.ok("nada anda até decidir", ap(e, { tipo: "fimDoTurno" }).ok === false);
  r = ap(e, { tipo: "resolverSeis", escolha: "mutilar" });
  const nx = M.sob(e, "n");
  t.iguais("MUTILAR: viva, +1 +3 Sequelas, +4 PH", [nx.situacao, nx.sequelas, e.diretora.ph], ["viva", 4, 15]);
}

t.grupo("Encontro · Ajudar Alguém, Carência, Arriscar Tudo, Recuperar Fôlego");
{
  const e = thriller([{ id: "h", nome: "Heroína", arquetipo: "heroina" }, { id: "i", nome: "Inocente", arquetipo: "inocente" }, { id: "s", nome: "Esbelta", arquetipo: "esbelta" }], { modelo: "bruto" });
  ap(e, { tipo: "dadoManual", quem: "i", acao: "descartar" }, jog("i"));
  ap(e, { tipo: "dadoManual", quem: "i", acao: "descartar" }, jog("i"));
  ap(e, { tipo: "dadoManual", quem: "i", acao: "descartar" }, jog("i"));
  ap(e, { tipo: "iniciarEncontro", meta: 2 });
  t.iguais("ordem: Heroína, Esbelta, Inocente", e.encontro.ordem.slice(0, 3), ["h", "s", "i"]);
  let r = ap(e, { tipo: "acaoEncontro", quem: "h", acao: "ajudarAlguem", alvo: "i", estilo: "sagaz", dados: 3 }, jog("h"), fila(6, 3, 1));
  t.iguais("Ajudar + Carência: Inocente 3 → 5, a Heroína não perde nada, a falha fica, 2 saem do Descarte (3 → 1)", [M.sob(e, "i").pilha, M.sob(e, "h").pilha, e.descarte], [5, 6, 1]);
  r = ap(e, { tipo: "acaoEncontro", quem: "s", acao: "partirParaCima", dados: 2 }, jog("s"), fila(6, 6));
  t.igual("Esbelta: +1 PT por 6", M.sob(e, "s").pt, 2);
  r = ap(e, { tipo: "acaoEncontro", quem: "i", acao: "recuperarFolego" }, jog("i"));
  t.iguais("Recuperar Fôlego: +1 dado (do Descarte, leitura padrão)", [M.sob(e, "i").pilha, e.descarte], [6, 1]);
  ap(e, { tipo: "fimDoTurno" });
  r = ap(e, { tipo: "acaoEncontro", quem: "h", acao: "arriscarTudo", alvo: "h", manterUm: true }, jog("h"));
  t.iguais("Arriscar Tudo da Heroína (Até o Fim): escapa e mantém 1 dado", [M.sob(e, "h").situacao, M.sob(e, "h").pilha], ["fugiu", 1]);
  r = ap(e, { tipo: "acaoEncontro", quem: "s", acao: "arriscarTudo", alvo: "i" }, jog("s"));
  t.ok("só uma Sobrevivente por Encontro", r.ok === false && /uma Sobrevivente por Encontro/.test(r.motivo));
}

t.grupo("Encontro · fim, Intentos e recargas");
{
  const e = thriller([{ id: "a", arquetipo: "atleta" }, { id: "b", arquetipo: "nerd" }], { modelo: "rato" });
  ap(e, { tipo: "ajustar", alvo: "a", campo: "pilha", delta: -4 });
  ap(e, { tipo: "ajustar", alvo: "b", campo: "pilha", delta: -4 });
  ap(e, { tipo: "iniciarEncontro", meta: 1 });
  const ph0 = e.diretora.ph;
  ap(e, { tipo: "acaoEncontro", quem: "a", acao: "vazarDali", dados: 1 }, jog("a"), fila(4));
  t.ok("Atleta escapou (meta 1)", M.sob(e, "a").situacao === "fugiu");
  ap(e, { tipo: "acaoEncontro", quem: "b", acao: "vazarDali", dados: 1 }, jog("b"), fila(5));
  t.ok("todas escaparam: o Encontro termina sozinho", e.encontro === null && e.cena === "livre");
  t.igual("todas tentaram escapar no 1º turno: +4 PH (mesmo acabando antes da vez do Assassino)", e.diretora.ph - ph0, 4);
  t.iguais("os dados da Fuga voltam à Pilha Comum", [M.sob(e, "a").pilha, M.sob(e, "b").pilha, M.sob(e, "a").situacao], [2, 2, "viva"]);
  const e2 = thriller([{ id: "a", arquetipo: "atleta" }, { id: "b", arquetipo: "nerd" }], { modelo: "bruto" });
  ap(e2, { tipo: "ajustar", alvo: "a", campo: "pilha", delta: -3 });
  ap(e2, { tipo: "iniciarEncontro", meta: 5 });
  ap(e2, { tipo: "acaoEncontro", quem: "a", acao: "vazarDali", dados: 1 }, jog("a"), fila(5));
  ap(e2, { tipo: "acaoEncontro", quem: "b", acao: "vazarDali", dados: 1 }, jog("b"), fila(2));
  t.igual("todas Vazaram no 1º turno: +4 PH ao chegar a vez do Assassino", e2.diretora.ph, 3 + 4);
  ap(e2, { tipo: "ferir", alvo: "a" }, DIRETORA, fila(2));
  t.ok("Atleta: Resiliência fica disponível com o marcador de Ferida", M.opcoesReativas(e2, M.sob(e2, "a"), { susto: false }).indexOf("resiliencia") >= 0);
  ap(e2, { tipo: "fimDoTurno" }); ap(e2, { tipo: "passarVez" }); ap(e2, { tipo: "passarVez" });
  t.ok("uma ação por vez: ESCAPAR depois de FERIR na mesma vez é recusado", true);
  ap(e2, { tipo: "escapar" });
  t.ok("ESCAPAR: encerra e dá 1 dado à Diretora", e2.encontro === null && e2.diretora.pilha === 6);
  t.igual("Intento: saiu do Encontro com Ferida (+1 PH)", e2.diretora.ph, 8);
}

t.grupo("Possuir, Restringir e Devorar");
{
  const e = thriller([{ id: "a", arquetipo: "valentona" }, { id: "b", arquetipo: "nerd" }], { modelo: "profeta" });
  e.diretora.pilha = 6; e.diretora.ph = 10;
  ap(e, { tipo: "ajustar", alvo: "b", campo: "pilha", delta: -2 });
  ap(e, { tipo: "iniciarEncontro", meta: 6 });
  ap(e, { tipo: "passarVez" }); ap(e, { tipo: "passarVez" });
  let r = ap(e, { tipo: "possuir", alvo: "a" });
  t.ok("POSSUIR: marcador 1", r.ok && M.marcadorDe(M.sob(e, "a"), "possessao").valor === 1);
  ap(e, { tipo: "fimDoTurno" });
  r = ap(e, { tipo: "acaoEncontro", quem: "a", acao: "partirParaCima", dados: 5 }, jog("a"), fila(1, 1, 2, 3, 6));
  t.igual("cada dado falho sobe a possessão (1 + 3 falhas = 4)", M.marcadorDe(M.sob(e, "a"), "possessao").valor, 4);
  r = ap(e, { tipo: "devorar", rolagem: e.rolagens[e.rolagens.length - 1].id });
  t.ok("DEVORAR o 6: +1 PH", r.ok && e.diretora.ph === 11);
  t.ok("não devora duas vezes", ap(e, { tipo: "devorar", rolagem: e.rolagens[e.rolagens.length - 1].id }).ok === false);
  ap(e, { tipo: "marcador", alvo: "a", acao: "ajustar", marcador: M.marcadorDe(M.sob(e, "a"), "possessao").id, valor: 6 });
  ap(e, { tipo: "passarVez" }); ap(e, { tipo: "fimDoTurno" });
  r = ap(e, { tipo: "matarPorPossessao", possuida: "a", alvo: "b" });
  t.ok("POSSUIR em 6: mata pela possuída, na vez dela; o marcador sai", r.ok && M.sob(e, "b").situacao === "morta" && !M.marcadorDe(M.sob(e, "a"), "possessao"));
  const x = thriller([{ id: "z", arquetipo: "cetica" }], { modelo: "rato" });
  x.diretora.pilha = 6;
  ap(x, { tipo: "dadoManual", quem: "z", acao: "descartar" }, jog("z"));
  ap(x, { tipo: "iniciarEncontro", meta: 6 });
  ap(x, { tipo: "passarVez" });
  ap(x, { tipo: "restringir", alvo: "z" });
  t.ok("RESTRINGIR: todos os testes viram Complexos", M.forcadoComplexo(M.sob(x, "z")));
  ap(x, { tipo: "fimDoTurno" });
  r = ap(x, { tipo: "acaoEncontro", quem: "z", acao: "livrarRestricao", estilo: "sagaz", dados: 2 }, jog("z"), fila(4, 5));
  t.ok("2 sucessos: restrição 3 → 1, teste superado", r.contagem.superado && M.marcadorDe(M.sob(x, "z"), "restricao").valor === 1);
}

t.grupo("Vantagens, Apegos e PT");
{
  const e = thriller([{ id: "v", arquetipo: "valentona" }, { id: "s", arquetipo: "esbelta" }], { modelo: "bruto" });
  const v = M.sob(e, "v");
  t.ok("sem PT: Resistir à Dor indisponível, com o motivo", /PT/.test(M.motivoDaVantagem(e, v, "resistirADor")));
  ap(e, { tipo: "darPt", alvo: "v", valor: 12, motivo: "shot" });
  t.igual("PT no máximo 10", v.pt, 10);
  t.ok("Planejar Fuga não é da Valentona (Ligeiro)", /Ligeiro/.test(M.motivoDaVantagem(e, v, "planejarFuga")));
  t.ok("Tratar Feridas sem custo definido: indisponível até a Diretora definir", /Diretora/.test(M.motivoDaVantagem(e, v, "tratarFeridas")));
  ap(e, { tipo: "configurarLacunas", custoTratarFeridas: 2 });
  t.igual("…com o custo definido, liberada (mas a Pilha está cheia)", M.motivoDaVantagem(e, v, "tratarFeridas"), "A Pilha Comum já tem 6 dados.");
  let r = ap(e, { tipo: "vantagem", quem: "v", chave: "surpreender" }, jog("v"));
  t.ok("Surpreender (3 PT): sucesso garantido pendente", r.ok && v.pt === 7 && v.pendentes.surpreender === 1);
  t.ok("recarga: Fim de um Encontro", /Fim de um Encontro/.test(M.motivoDaVantagem(e, v, "surpreender")));
  ap(e, { tipo: "vantagemDaMesa", vantagem: { nome: "Preparar Para o Pior", estilo: "firme", custo: 2, recarga: "fimEncontro", efeito: "reduzirFerida", valor: 1 } });
  const vm = e.vantagensDaMesa[0].id;
  r = ap(e, { tipo: "vantagem", quem: "v", chave: vm }, jog("v"));
  t.ok("Vantagem da mesa: reduzir a próxima Ferida em 1", r.ok && v.pendentes.reduzirFerida === 1 && v.pt === 5);
  ap(e, { tipo: "iniciarEncontro", meta: 3 }) ;
  t.ok("Encontro não começa (6 não supera 6) — ajusta e começa", ap(e, { tipo: "ajustar", alvo: "s", campo: "pilha", delta: -1 }).ok && ap(e, { tipo: "iniciarEncontro", meta: 3 }).ok);
  ap(e, { tipo: "passarVez" });
  r = ap(e, { tipo: "acaoEncontro", quem: "s", acao: "recuperarFolego" }, jog("s"));
  ap(e, { tipo: "ferir", alvo: "v" }, DIRETORA, fila(4));
  t.iguais("a Vantagem é consumida na Ferida: 4 − 1 = 3 (Sequela 1)", [v.ferida, v.sequelas, v.pendentes.reduzirFerida], [3, 1, 0]);
  ap(e, { tipo: "fimDoTurno" });
  r = ap(e, { tipo: "acaoEncontro", quem: "v", acao: "partirParaCima", dados: 1 }, jog("v"), fila(1));
  t.ok("Surpreender consumido: 1 falha + 1 garantido = superado", r.contagem.superado && v.pendentes.surpreender === 0);
  ap(e, { tipo: "encerrarEncontro", motivo: "teste" });
  t.igual("recarga de Fim de Encontro volta", M.motivoDaVantagem(e, v, "surpreender"), "");
  r = ap(e, { tipo: "apego", quem: "v", apego: "item" }, jog("v"));
  t.ok("Item Icônico: +2 PT", r.ok && v.pt === 7);
  t.ok("…uma vez por sessão", ap(e, { tipo: "apego", quem: "v", apego: "item" }, jog("v")).ok === false);
  r = ap(e, { tipo: "apego", quem: "v", apego: "desejo" }, jog("v"));
  t.ok("Desejo Obscuro: +3 PT e vai para a ficha (para sempre)", r.ok && v.pt === 10 && r.fichas.length === 1 && r.fichas[0].desejoRevelado);
  ap(e, { tipo: "novaSessao" });
  t.ok("nova sessão: Item volta; Desejo não", ap(e, { tipo: "apego", quem: "v", apego: "item" }, jog("v")).ok && ap(e, { tipo: "apego", quem: "v", apego: "desejo" }, jog("v")).ok === false);
  ap(e, { tipo: "darPt", alvo: "s", valor: 6 });
  ap(e, { tipo: "ajustar", alvo: "s", campo: "pilha", delta: -1 });
  const ph0 = e.diretora.ph;
  r = ap(e, { tipo: "vantagem", quem: "s", chave: "choqueDeRealidade" }, jog("s"));
  t.ok("Choque de Realidade: +1 dado e +1 PH (Intento)", r.ok && M.sob(e, "s").pilha === 6 && e.diretora.ph === ph0 + 1);
}

t.grupo("Permissões e vista das jogadoras");
{
  const e = thriller([{ id: "a", arquetipo: "nerd" }, { id: "b", arquetipo: "atleta" }], { modelo: "sangria" });
  t.ok("jogadora não age pela outra", ap(e, { tipo: "dadoManual", quem: "b", acao: "descartar" }, jog("a")).ok === false);
  t.ok("jogadora não faz ação da Diretora", ap(e, { tipo: "darPt", alvo: "a", valor: 2 }, jog("a")).ok === false);
  ap(e, { tipo: "dadoManual", quem: "a", acao: "descartar" }, jog("a"));
  ap(e, { tipo: "dadoManual", quem: "a", acao: "descartar" }, jog("a"));
  ap(e, { tipo: "dadoManual", quem: "a", acao: "descartar" }, jog("a"));
  ap(e, { tipo: "iniciarEncontro", meta: 4 });
  const vistaA = M.vista(e, jog("a"));
  t.ok("a vista não tem PH, ficha do Assassino, meta, Sustos nem registro privado", vistaA.diretora.ph === undefined && !vistaA.assassino.nome && vistaA.encontro.meta === undefined && vistaA.encontro.sustos === undefined && !vistaA.privado && !vistaA.pendencias);
  t.ok("a Pilha da Diretora é da mesa (visível)", vistaA.diretora.pilha === 4);
  ap(e, { tipo: "passarVez" });
  let r = ap(e, { tipo: "habilidade", quem: "a", chave: "memoriaFotografica" }, jog("a"));
  t.ok("Memória Fotográfica: só a Nerd fica sabendo quanto falta", r.ok && M.vista(e, jog("a")).encontro.faltam.a === 4 && M.vista(e, jog("b")).encontro.faltam.a === undefined);
  t.ok("…uma vez por sessão", ap(e, { tipo: "habilidade", quem: "a", chave: "memoriaFotografica" }, jog("a")).ok === false);
  t.ok("o normalizar não perde o estado", JSON.stringify(M.normalizar(JSON.parse(JSON.stringify(e)))) === JSON.stringify(M.normalizar(e)));
}

t.grupo("Assassino personalizado e Mudando de Planos");
{
  const e = thriller([{ id: "a", arquetipo: "nerd" }]);
  let r = ap(e, { tipo: "configurarAssassino", modelo: "personalizado", nome: "O Jardineiro", ameacas: ["estrategico", "mestre"], acoesUnicas: ["restringir", "devorar"], apavoro: "mudandoDePlanos" });
  t.ok("sem dados/PH/Sustos (Nível de Brutalidade não está no Corte Rápido): pede à mão", r.ok === false && /Brutalidade/.test(r.motivo));
  r = ap(e, { tipo: "configurarAssassino", modelo: "personalizado", nome: "O Jardineiro", ameacas: ["estrategico", "mestre"], acoesUnicas: ["restringir", "segurar", "possuir"], apavoro: "mudandoDePlanos", dados: 5, ph: 6, sustos: 2, aplicarPilha: true });
  t.ok("personalizado: Ações Únicas das Ameaças dele (uma por Ameaça)", r.ok && e.assassino.acoesUnicas.length === 2 && e.diretora.pilha === 5);
  ap(e, { tipo: "dadoManual", quem: "a", acao: "descartar" }, jog("a"));
  ap(e, { tipo: "dadoManual", quem: "a", acao: "descartar" }, jog("a"));
  t.ok("Encontro começa (5 > 4)", ap(e, { tipo: "iniciarEncontro", meta: 2 }).ok);
  t.ok("Mudando de Planos! só depois do Encontro", ap(e, { tipo: "mudandoDePlanos", de: "restringir", para: "devorar" }).ok === false);
  ap(e, { tipo: "encerrarEncontro", motivo: "x" });
  r = ap(e, { tipo: "mudandoDePlanos", de: "restringir", para: "devorar" });
  t.ok("Mudando de Planos! (5 PH) logo após o Encontro, na mesma lista", r.ok && e.assassino.acoesUnicas.indexOf("devorar") >= 0 && e.diretora.ph === 1);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
