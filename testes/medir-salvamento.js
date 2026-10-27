/* =====================================================================
   R.A.M.A. — medição do salvamento automático (v2.46)
   ---------------------------------------------------------------------
       deno run --allow-read testes/medir-salvamento.js
       deno run --allow-read testes/medir-salvamento.js --anterior caminho/do/salvar.js

   `--anterior` mede também um salvar.js de outra versão (a v2.45, por
   exemplo, guardada com git archive), na espera que ela usava (400 ms):
   é a referência honesta do "antes".

   Roda o js/salvar.js DE VERDADE com um relógio virtual: cada sequência
   de edição é reproduzível (gerador de números com semente fixa), e o
   servidor responde depois de uma latência fixa. Para cada configuração
   de espera, conta:

     envios       gravações que saíram para o servidor
     poupados     vezes em que nada de conteúdo tinha mudado (nenhuma
                  viagem)
     latência     do momento de uma alteração até o envio que a leva
                  (média e máxima) — quanto tempo ela fica só na tela

   NÃO mede tempo real nem rede: o relógio é de mentira e o servidor é
   um dublê. Compara configurações entre si, nas mesmas sequências.
   ===================================================================== */

const escrever = console.log.bind(console);
const RAIZ = new URL("../", import.meta.url);

/* ---------- relógio virtual ---------- */
let agora = 0;
let fila = [];
let seq = 0;
globalThis.setTimeout = (fn, ms) => { const id = ++seq; fila.push({ id, t: agora + Math.max(0, ms || 0), fn }); return id; };
globalThis.clearTimeout = (id) => { fila = fila.filter((e) => e.id !== id); };
const DataReal = Date;
Date.now = () => agora;

globalThis.window = globalThis;
globalThis.document = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, visibilityState: "visible", querySelector: () => null };
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.CustomEvent = class { constructor(n) { this.type = n; } };
globalThis.navigator = { onLine: true };
globalThis.location = { search: "" };

for (const arq of ["js/config.js", "js/util.js", "js/salvar.js"]) (0, eval)(await Deno.readTextFile(new URL(arq, RAIZ)));
globalThis.RAMAUI = { aviso() {}, avisoErro() {}, avisoAtencao() {} };
const SALVADOR_ATUAL = globalThis.RAMASalvador;
const i = Deno.args.indexOf("--anterior");
let SALVADOR_ANTERIOR = null;
if (i >= 0 && Deno.args[i + 1]) {
  (0, eval)(await Deno.readTextFile(Deno.args[i + 1]));
  SALVADOR_ANTERIOR = globalThis.RAMASalvador;
  globalThis.RAMASalvador = SALVADOR_ATUAL;
}

async function microtarefas() { for (let i = 0; i < 20; i++) await null; }

async function rodarAte(fim) {
  for (;;) {
    fila.sort((a, b) => a.t - b.t || a.id - b.id);
    const e = fila[0];
    if (!e || e.t > fim) break;
    fila.shift();
    agora = e.t;
    e.fn();
    await microtarefas();
  }
  agora = fim;
}

/* ---------- gerador com semente ---------- */
function gerador(semente) {
  let s = semente >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------- sequências: [tempo, mudança] ---------- */
function sequencias() {
  const r = gerador(46);
  const lista = {};
  /* Digitar uma anotação: rajadas de 6–14 teclas (90–160 ms cada) com
     pausas de 0,6–1,8 s entre elas. */
  let t = 0; const a = [];
  for (let rajada = 0; rajada < 10; rajada++) {
    const n = 6 + Math.floor(r() * 9);
    for (let k = 0; k < n; k++) { t += 90 + Math.floor(r() * 70); a.push([t, "texto"]); }
    t += 600 + Math.floor(r() * 1200);
  }
  lista["digitar uma anotação, com pausas"] = a;
  /* Texto sem pausa: 100 teclas a cada 120 ms (12 s). */
  lista["texto contínuo, 12 s sem parar"] = Array.from({ length: 100 }, (_, i) => [120 * (i + 1), "texto"]);
  /* Contar dano um a um: 8 cliques a cada 600 ms. */
  lista["8 cliques no recurso, a cada 600 ms"] = Array.from({ length: 8 }, (_, i) => [600 * (i + 1), "pv"]);
  /* Cliques rápidos: 8 a cada 250 ms. */
  lista["8 cliques rápidos, a cada 250 ms"] = Array.from({ length: 8 }, (_, i) => [250 * (i + 1), "pv"]);
  /* Campos de formulário: 6 mudanças espaçadas de 2–3 s. */
  t = 0; const c = [];
  for (let i = 0; i < 6; i++) { t += 2000 + Math.floor(r() * 1000); c.push([t, "campo"]); }
  lista["6 campos, a cada 2–3 s"] = c;
  /* Ida e volta: marca e desmarca (o conteúdo volta ao que era). */
  lista["marcar e desmarcar (volta ao que era)"] = [[300, "liga"], [700, "desliga"]];
  return lista;
}

async function medir(nome, eventos, config, latencia) {
  agora = 0; fila = []; seq = 0;
  globalThis.RAMAMedicao && globalThis.RAMAMedicao.zerar();
  const estado = { ficha: { texto: "", pv: 10, campo: 0, flag: false, mudancas: 0, atualizadoEm: "" } };
  const envios = [];
  const fabrica = config.anterior ? SALVADOR_ANTERIOR : SALVADOR_ATUAL;
  if (config.anterior) globalThis.RAMA_CONFIG.DEBOUNCE_MS = config.espera;
  const salvador = fabrica.criar({
    indicador: { definir() {}, salvoAgora() {}, parar() {} },
    instantaneo: () => estado.ficha,
    enviar: (dados) => {
      envios.push({ t: agora, mudancas: dados.mudancas });
      return new Promise((ok) => setTimeout(() => ok({ ok: true, rev: envios.length + 1 }), latencia));
    },
    aplicar() {}, esquema: {},
    espera: config.espera, esperaMaxima: config.maxima,
    ignorarNaComparacao: ["atualizadoEm"],
  });
  salvador.definirBase(estado.ficha, 1);
  const quando = [];
  eventos.forEach(([t, tipo]) => {
    setTimeout(() => {
      const f = estado.ficha;
      if (tipo === "texto") { f.texto += "x"; f.mudancas++; }
      else if (tipo === "pv") { f.pv--; f.mudancas++; }
      else if (tipo === "campo") { f.campo++; f.mudancas++; }
      else if (tipo === "liga") { f.flag = true; }
      else if (tipo === "desliga") { f.flag = false; }
      f.atualizadoEm = "t" + agora;
      quando.push({ t: agora, n: f.mudancas });
      salvador.alterou();
    }, t);
  });
  const fim = eventos[eventos.length - 1][0] + 30000;
  await rodarAte(fim);
  /* A latência de cada mudança de conteúdo: até o envio que a leva. */
  const lat = [];
  quando.forEach((q) => {
    if (!q.n) return;
    const envio = envios.find((e) => e.t >= q.t && e.mudancas >= q.n);
    if (envio) lat.push(envio.t - q.t);
  });
  const med = globalThis.RAMAMedicao ? globalThis.RAMAMedicao.ver().contagens : {};
  salvador.parar();
  return {
    envios: envios.length,
    poupados: med["salvamento.poupado"] || 0,
    media: lat.length ? Math.round(lat.reduce((s, x) => s + x, 0) / lat.length) : 0,
    maxima: lat.length ? Math.max(...lat) : 0,
    pendenteNoFim: salvador.temPendencia(),
  };
}

const CONFIGS = [
  { rotulo: "v2.45 (arquivo anterior)", espera: 400, maxima: 1e9, anterior: true },
  { rotulo: "400 ms, sem prazo", espera: 400, maxima: 1e9 },
  { rotulo: "800 ms, sem prazo", espera: 800, maxima: 1e9 },
  { rotulo: "1000 ms, sem prazo", espera: 1000, maxima: 1e9 },
  { rotulo: "800 ms, prazo 4 s (v2.46)", espera: 800, maxima: 4000 },
  { rotulo: "1000 ms, prazo 4 s", espera: 1000, maxima: 4000 },
];
const LATENCIA = Number((Deno.args[Deno.args.indexOf("--latencia") + 1]) || 900) || 900;

escrever("Salvamento automático — relógio virtual, servidor com " + LATENCIA + " ms por gravação\n");
if (!SALVADOR_ANTERIOR) CONFIGS.shift();
const seqs = sequencias();
const totais = {};
for (const [nome, eventos] of Object.entries(seqs)) {
  escrever("## " + nome + " (" + eventos.length + " alterações)");
  for (const c of CONFIGS) {
    const r = await medir(nome, eventos, c, LATENCIA);
    totais[c.rotulo] = (totais[c.rotulo] || 0) + r.envios;
    escrever("   " + c.rotulo.padEnd(28) + " envios " + String(r.envios).padStart(3) + " · poupados " + r.poupados +
      " · latência média " + String(r.media).padStart(5) + " ms · máxima " + String(r.maxima).padStart(5) + " ms" +
      (r.pendenteNoFim ? " · FICOU PENDENTE" : ""));
  }
}
escrever("\nTOTAL de envios nas sequências:");
for (const c of CONFIGS) escrever("   " + c.rotulo.padEnd(28) + String(totais[c.rotulo]).padStart(4));
Date.now = DataReal.now;
