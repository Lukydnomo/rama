/* =====================================================================
   R.A.M.A. — testes da coordenação entre abas (v2.46)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-coordenacao.js

   Várias "abas" no mesmo processo: cada uma com a própria cópia de
   js/coordenacao.js e js/sincronia.js, a própria conta e um
   BroadcastChannel de mentira que entrega as mensagens às outras (de
   forma assíncrona, como o de verdade). O servidor é um dublê que conta
   as perguntas.
   ===================================================================== */

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
};

const FONTE_COORD = await Deno.readTextFile(new URL("../js/coordenacao.js", import.meta.url));
const FONTE_SINC = await Deno.readTextFile(new URL("../js/sincronia.js", import.meta.url));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* O barramento: uma lista de canais abertos, por nome. */
const barramento = new Set();
class CanalDeMentira {
  constructor(nome) { this.nome = nome; this.onmessage = null; this.fechado = false; barramento.add(this); }
  postMessage(m) {
    const copia = JSON.parse(JSON.stringify(m));
    for (const outro of barramento) {
      if (outro === this || outro.fechado || outro.nome !== this.nome) continue;
      setTimeout(() => { if (!outro.fechado && outro.onmessage) outro.onmessage({ data: copia }); }, 1);
    }
  }
  close() { this.fechado = true; barramento.delete(this); }
}

function novaAba(conta, opcoes) {
  const o = opcoes || {};
  const ouvintesDeStorage = [];
  const aba = {
    conta,
    BroadcastChannel: o.semCanal ? undefined : CanalDeMentira,
    RAMA_CONFIG: { COORDENACAO_ESPERA_MS: o.espera || 400 },
    RAMAAuth: { agente: () => (aba.conta ? { id: aba.conta } : null) },
    RAMAApi: { ehErroDeSessao: () => false },
    addEventListener: (tipo, fn) => { if (tipo === "storage") ouvintesDeStorage.push(fn); },
    trocarSessao(novaConta) { aba.conta = novaConta; ouvintesDeStorage.forEach((fn) => fn({ key: "rama.sessao.token" })); },
  };
  new Function("window", FONTE_COORD)(aba);
  new Function("window", FONTE_SINC)(aba);
  return aba;
}

function servidor(latencia) {
  const s = { perguntas: 0, marcas: { personagens: "1", rolagens: "1" }, falhar: 0, pendurar: false };
  s.consultar = () => {
    s.perguntas++;
    if (s.pendurar) return new Promise(() => {});
    if (s.falhar > 0) { s.falhar--; return new Promise((r) => setTimeout(() => r({ ok: false, erro: "sem_conexao" }), latencia)); }
    const marcas = Object.assign({}, s.marcas);
    return new Promise((r) => setTimeout(() => r({ ok: true, dados: { marcas, papel: "jogador" } }), latencia));
  };
  return s;
}

/* ---------------------------------------------------------------------- */
t.grupo("Coordenação · uma pergunta para várias abas");
{
  const s = servidor(30);
  const A = novaAba("conta-1"), B = novaAba("conta-1");
  const qA = A.RAMACoordenacao.compartilhada("sinc:mesa", s.consultar);
  const qB = B.RAMACoordenacao.compartilhada("sinc:mesa", s.consultar);
  const rA = await qA(1000);
  await esperar(10);
  const rB = await qB(1000);
  t.igual("a segunda aba usa a resposta recente da primeira", s.perguntas, 1);
  t.ok("  a mesma resposta (uma cópia)", JSON.stringify(rA) === JSON.stringify(rB) && rA !== rB);
  await esperar(60);
  const rB2 = await qB(10);
  t.igual("resposta mais velha que a validade pedida: pergunta de novo", s.perguntas, 2);
  t.ok("  e responde", rB2.ok);
}

t.grupo("Coordenação · espera a resposta que está a caminho");
{
  const s = servidor(150);
  const A = novaAba("conta-1"), B = novaAba("conta-1");
  const qA = A.RAMACoordenacao.compartilhada("sinc:mesa2", s.consultar);
  const qB = B.RAMACoordenacao.compartilhada("sinc:mesa2", s.consultar);
  const pA = qA(1000);
  await esperar(20);
  const rB = await qB(1000);
  await pA;
  t.ok("a outra aba anunciou a pergunta: esta espera e recebe a mesma resposta, sem perguntar", s.perguntas === 1 && rB.ok);
}

t.grupo("Coordenação · recuperação");
{
  const s = servidor(30);
  const A = novaAba("conta-1", { espera: 200 }), B = novaAba("conta-1", { espera: 200 });
  s.pendurar = true;
  A.RAMACoordenacao.compartilhada("sinc:m3", s.consultar)(1000);
  await esperar(20);
  s.pendurar = false;
  const inicio = Date.now();
  const rB = await B.RAMACoordenacao.compartilhada("sinc:m3", s.consultar)(1000);
  const levou = Date.now() - inicio;
  t.ok("a aba que perguntava travou (fechou, suspendeu): a outra pergunta sozinha depois da espera", rB.ok && s.perguntas === 2 && levou >= 150);

  const s2 = servidor(60);
  const C = novaAba("conta-1", { espera: 3000 }), D = novaAba("conta-1", { espera: 3000 });
  s2.falhar = 1;
  const pC = C.RAMACoordenacao.compartilhada("sinc:m4", s2.consultar)(1000);
  await esperar(10);
  const i2 = Date.now();
  const rD = await D.RAMACoordenacao.compartilhada("sinc:m4", s2.consultar)(1000);
  await pC;
  t.ok("a pergunta da outra falhou: ela avisa, e esta não espera os 3 s (" + (Date.now() - i2) + " ms)", rD.ok && Date.now() - i2 < 1000 && s2.perguntas === 2);
  const rC = await C.RAMACoordenacao.compartilhada("sinc:m4", s2.consultar)(1000);
  t.ok("falha não é dividida: a aba que falhou aproveita a resposta boa que a outra trouxe", rC.ok && s2.perguntas === 2);
}

t.grupo("Coordenação · conta e sessão");
{
  const s = servidor(20);
  const A = novaAba("conta-1"), B = novaAba("conta-2");
  await A.RAMACoordenacao.compartilhada("sinc:m5", s.consultar)(1000);
  await esperar(10);
  await B.RAMACoordenacao.compartilhada("sinc:m5", s.consultar)(1000);
  t.igual("resposta de OUTRA conta nunca é usada", s.perguntas, 2);

  const s2 = servidor(20);
  const C = novaAba("conta-1"), D = novaAba("conta-1");
  await C.RAMACoordenacao.compartilhada("sinc:m6", s2.consultar)(5000);
  await esperar(10);
  D.trocarSessao("conta-1");
  await D.RAMACoordenacao.compartilhada("sinc:m6", s2.consultar)(5000);
  t.igual("trocar de sessão apaga o que estava guardado (pergunta de novo)", s2.perguntas, 2);

  const s3 = servidor(80);
  const E = novaAba("conta-1"), G = novaAba("conta-1");
  const pE = E.RAMACoordenacao.compartilhada("sinc:m7", s3.consultar)(5000);
  await esperar(10);
  E.trocarSessao("conta-9");
  await pE;
  await esperar(20);
  await G.RAMACoordenacao.compartilhada("sinc:m7", s3.consultar)(5000);
  t.igual("resposta que voava quando a conta trocou não é espalhada", s3.perguntas, 2);

  const s4 = servidor(10);
  const H = novaAba("conta-1", { semCanal: true }), I = novaAba("conta-1", { semCanal: true });
  await H.RAMACoordenacao.compartilhada("sinc:m8", s4.consultar)(5000);
  await I.RAMACoordenacao.compartilhada("sinc:m8", s4.consultar)(5000);
  t.ok("sem BroadcastChannel, cada aba pergunta sozinha (como antes)", s4.perguntas === 2 && !H.RAMACoordenacao.disponivel());

  /* Uma resposta mais velha que chega depois não substitui a nova. */
  const J = novaAba("conta-1"), K = novaAba("conta-1");
  const canalK = [...barramento].find((c) => c.nome === "rama.coordenacao.v1");
  const enviarComo = (em, valor) => new CanalDeMentira("rama.coordenacao.v1").postMessage({ v: 1, tipo: "resultado", chave: "sinc:m9", conta: "conta-1", aba: "outra", em, resposta: { ok: true, valor } });
  K.RAMACoordenacao.ouvir("sinc:m9", () => {});
  enviarComo(Date.now(), "nova");
  await esperar(10);
  enviarComo(Date.now() - 5000, "velha");
  await esperar(10);
  const s5 = servidor(5);
  const r9 = await K.RAMACoordenacao.compartilhada("sinc:m9", s5.consultar)(3000);
  t.ok("resposta atrasada (de uma pergunta mais velha) não passa por cima da mais nova", r9.valor === "nova" && s5.perguntas === 0);
  void J; void canalK;
}

t.grupo("Coordenação · a sincronização da campanha com três abas");
{
  const s = servidor(20);
  const abas = [novaAba("conta-1"), novaAba("conta-1"), novaAba("conta-1")];
  const mudancas = abas.map(() => []);
  const visivel = [true, true, true];
  const sinc = abas.map((aba, i) => aba.RAMASincronia.criar({
    consultar: s.consultar,
    chave: "sinc:mesa-x",
    marcas: Object.assign({}, s.marcas),
    papel: "jogador",
    intervalo: () => 150,
    visivel: () => visivel[i],
    aoMudar: (partes) => { mudancas[i].push(partes.join(",")); return Promise.resolve(); },
  }));
  sinc.forEach((x) => x.iniciar());
  await esperar(1500);
  const comTres = s.perguntas;
  t.ok("três abas, intervalo de 150 ms por 1,5 s: perto de UMA pergunta por intervalo, não três (" + comTres + ")", comTres <= 14 && comTres >= 5);
  s.marcas.rolagens = "2";
  await esperar(500);
  t.ok("a mudança chega às três abas", mudancas.every((m) => m.indexOf("rolagens") >= 0), JSON.stringify(mudancas));

  /* A aba que pergunta some: as outras continuam. */
  sinc[0].parar();
  const antes = s.perguntas;
  s.marcas.personagens = "2";
  await esperar(700);
  t.ok("uma aba parou: as outras continuam perguntando e recebendo", s.perguntas > antes &&
    mudancas[1].some((m) => m.indexOf("personagens") >= 0) && mudancas[2].some((m) => m.indexOf("personagens") >= 0));

  /* Escondida: não pergunta; ao voltar, usa a resposta fresca de outra. */
  const contar = (i) => mudancas[i].filter((m) => m.indexOf("personagens") >= 0).length;
  visivel[2] = false;
  sinc[2].aoMudarVisibilidade();
  /* Uma pergunta que já estava a caminho termina e se aplica, como
     sempre: espera-se ela acabar antes de contar. */
  await esperar(500);
  const antesDeEsconder = contar(2);
  s.marcas.personagens = "3";
  await esperar(400);
  t.ok("aba escondida não aplica nada enquanto escondida (a visível aplica)", contar(2) === antesDeEsconder && contar(1) > antesDeEsconder - 0);
  const p0 = s.perguntas;
  visivel[2] = true;
  sinc[2].aoMudarVisibilidade();
  await esperar(330);
  t.ok("ao voltar, a aba se atualiza (com a resposta de outra, ou perguntando)", contar(2) === antesDeEsconder + 1 && s.perguntas - p0 <= 3);
  sinc.forEach((x) => x.parar());

  const sem = servidor(20);
  const solas = [novaAba("conta-1", { semCanal: true }), novaAba("conta-1", { semCanal: true }), novaAba("conta-1", { semCanal: true })];
  const s2 = solas.map((aba) => aba.RAMASincronia.criar({
    consultar: sem.consultar, chave: "sinc:mesa-y", marcas: Object.assign({}, sem.marcas), papel: "jogador",
    intervalo: () => 150, visivel: () => true, aoMudar: () => Promise.resolve(),
  }));
  s2.forEach((x) => x.iniciar());
  await esperar(1500);
  s2.forEach((x) => x.parar());
  t.ok("referência sem coordenação: cada aba pergunta no seu ritmo (" + sem.perguntas + " perguntas, contra " + comTres + ")", comTres <= sem.perguntas * 0.7);
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
