/* =====================================================================
   R.A.M.A. — testes do movimento do Modern20 (v9.17)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-movimento.js

   js/movimento.js num DOM mínimo: elementos com `animate()` de mentira
   (a Web Animations API que o navegador daria), relógio manual e uma
   consulta de movimento reduzido que muda no meio. O que está sob teste
   são os riscos reais da coreografia, não a aparência:

     · Legacy e movimento reduzido: NENHUMA animação, estado final na hora;
     · interromper: o movimento novo cancela o anterior no mesmo canal;
     · toda promessa resolve UMA vez — no fim, no cancelamento ou no
       prazo, mesmo que o evento de fim nunca venha;
     · parar tudo (troca de estilo, preferência mudando) limpa o registro;
     · a altura não deixa valor fixo para trás;
     · as folhas e as telas usam os tokens e não mexem em dado.
   A aparência é conferida no navegador (testes/janelas.html e as telas).
   ===================================================================== */

/* ---------- relógio manual ---------- */
let agora = 0;
const timers = [];
globalThis.setTimeout = (fn, ms) => { const t = { fn, quando: agora + (ms || 0), vivo: true }; timers.push(t); return t; };
globalThis.clearTimeout = (t) => { if (t) t.vivo = false; };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
function avancar(ms) {
  agora += ms;
  let rodou = true;
  while (rodou) {
    rodou = false;
    timers.sort((a, b) => a.quando - b.quando);
    for (const t of timers) if (t.vivo && t.quando <= agora) { t.vivo = false; t.fn(); rodou = true; break; }
  }
}
async function esperar() { for (let i = 0; i < 5; i++) await Promise.resolve(); }

/* ---------- animações de mentira ---------- */
const criadas = [];
class Animacao {
  constructor(el, quadros, opcoes) { this.el = el; this.quadros = quadros; this.opcoes = opcoes; this.estado = "rodando"; this.onfinish = null; this.oncancel = null; criadas.push(this); }
  cancel() { if (this.estado !== "rodando") return; this.estado = "cancelada"; if (this.oncancel) this.oncancel(); }
  terminar() { if (this.estado !== "rodando") return; this.estado = "terminada"; if (this.onfinish) this.onfinish(); }
}

let id = 0;
function elemento(altura) {
  const el = {
    id: ++id, style: {}, dataset: {}, filhos: [], atributos: {}, isConnected: true,
    altura: altura || 0,
    classList: { lista: new Set(), add(c) { this.lista.add(c); }, remove(c) { this.lista.delete(c); }, contains(c) { return this.lista.has(c); } },
    animate(quadros, opcoes) { return new Animacao(el, quadros, opcoes); },
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: el.style.height ? parseFloat(el.style.height) : el.altura, bottom: el.altura, right: 100 }; },
    getAttribute(n) { return n in el.atributos ? el.atributos[n] : null; },
    setAttribute(n, v) { el.atributos[n] = String(v); },
    hasAttribute(n) { return n in el.atributos; },
    querySelectorAll() { return []; },
    get children() { return el.filhos; },
    closest() { return null; },
  };
  return el;
}

/* ---------- documento e preferências ---------- */
const raiz = elemento();
raiz.atributos["data-interface"] = "modern20";
const tokens = { "--m20-mov-toque": "100ms", "--m20-mov-estado": "150ms", "--m20-mov-navegar": "200ms", "--m20-mov-janela": "240ms", "--m20-mov-especial": "340ms", "--m20-desloc-curto": "4px", "--m20-destaque-valor": "rgb(1,2,3)" };
const ouvintesReduzido = [];
const consultaReduzida = { matches: false, addEventListener(_, fn) { ouvintesReduzido.push(fn); } };
globalThis.window = globalThis;
globalThis.document = {
  documentElement: raiz,
  body: elemento(),
  addEventListener() {},
  querySelectorAll() { return []; },
  createElement() { return elemento(); },
  getElementById() { return null; },
  elementFromPoint() { return null; },
};
globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => tokens[n] || "", paddingTop: "0", paddingBottom: "0", borderTopWidth: "0", borderBottomWidth: "0" });
globalThis.matchMedia = (q) => (/reduced-motion/.test(q) ? consultaReduzida : { matches: true, addEventListener() {} });

(0, eval)(await Deno.readTextFile(new URL("../js/movimento.js", import.meta.url)));
const M = globalThis.RAMAMovimento;

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
  igual(nome, a, b) { t.ok(nome, Object.is(a, b), Object.is(a, b) ? "" : `obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`); },
};

console.log(`${FORTE}R.A.M.A. — movimento do Modern20${FIM}`);

t.grupo("Tokens: as durações vêm da folha, não do JS");
t.igual("navegar = 200 ms (lido de --m20-mov-navegar)", M.ms("navegar"), 200);
tokens["--m20-mov-navegar"] = "0.18s";
t.igual("  em segundos também", M.ms("navegar"), 180);
tokens["--m20-mov-navegar"] = "200ms";
t.igual("sem o token, o padrão da família", (delete tokens["--m20-mov-especial"], M.ms("especial")), 340);
tokens["--m20-mov-especial"] = "340ms";

t.grupo("Legacy: nada anima, o estado final vale na hora");
{
  raiz.atributos["data-interface"] = "legacy";
  const el = elemento(10);
  let fim = null;
  const antes = criadas.length;
  const p = M.animar(el, "x", [{ opacity: 0 }, { opacity: 1 }], { aoFim: (c) => { fim = c; } });
  t.ok("nenhuma animação criada", criadas.length === antes && M.ativo() === false);
  t.ok("  e o fim roda na hora (sem animação)", fim === false);
  t.ok("  a promessa resolve sem esperar relógio nenhum", (await p) === false);
  M.entrar(el); M.altura(el, true); M.destacar(el); M.flip([el], () => {}); M.apresentar({ children: [el] });
  t.ok("entrar, altura, destaque, FLIP e apresentação também não animam", criadas.length === antes);
  t.ok("lembrar não guarda nada no Legacy", M.lembrar(el) === null);
  raiz.atributos["data-interface"] = "modern20";
}

t.grupo("Interromper: o novo cancela o anterior, sem enfileirar");
{
  const el = elemento(10);
  const fins = [];
  const p1 = M.animar(el, "entrada", [{ opacity: 0 }, { opacity: 1 }], { aoFim: (c) => fins.push("1:" + c) });
  const a1 = criadas[criadas.length - 1];
  const p2 = M.animar(el, "entrada", [{ opacity: 0.4 }, { opacity: 1 }], { aoFim: (c) => fins.push("2:" + c) });
  const a2 = criadas[criadas.length - 1];
  t.ok("a primeira foi cancelada", a1.estado === "cancelada");
  t.ok("  e resolveu como interrompida (false)", (await p1) === false && fins[0] === "1:false");
  t.ok("só uma rodando no canal", M._rodando() === 1);
  const outro = M.animar(el, "altura", [{ height: "0px" }, { height: "10px" }]);
  t.ok("canal diferente não cancela", a2.estado === "rodando" && M._rodando() === 2);
  a2.terminar();
  t.ok("o fim natural resolve true", (await p2) === true && fins[1] === "2:true");
  criadas[criadas.length - 1].terminar(); await outro;
  t.ok("nada fica no registro", M._rodando() === 0);
}

t.grupo("Uma vez só: fim, cancelamento e prazo nunca repetem o callback");
{
  const el = elemento(10);
  let n = 0;
  const p = M.animar(el, "x", [{ opacity: 0 }, { opacity: 1 }], { duracao: 200, aoFim: () => { n++; } });
  const a = criadas[criadas.length - 1];
  a.terminar(); a.cancel(); avancar(1000);
  await p;
  t.igual("terminar, cancelar e o prazo: um callback", n, 1);
  let m = 0;
  const p2 = M.animar(el, "y", [{ opacity: 0 }, { opacity: 1 }], { duracao: 200, aoFim: () => { m++; } });
  avancar(400);
  t.ok("o evento de fim nunca veio: o prazo resolve", (await p2) === true && m === 1);
  t.ok("  e limpa o registro", M._rodando() === 0);
}

t.grupo("Parar tudo: troca de estilo e movimento reduzido no meio");
{
  const a = elemento(10), b = elemento(10);
  let fins = 0;
  M.animar(a, "x", [{ opacity: 0 }, { opacity: 1 }], { aoFim: () => fins++ });
  M.animar(b, "x", [{ opacity: 0 }, { opacity: 1 }], { aoFim: () => fins++ });
  t.igual("duas rodando", M._rodando(), 2);
  consultaReduzida.matches = true;
  ouvintesReduzido.forEach((fn) => fn({ matches: true }));
  await esperar();
  t.ok("a preferência mudou: tudo para, cada fim uma vez", M._rodando() === 0 && fins === 2);
  const antes = criadas.length;
  M.entrar(a);
  t.ok("  e daí em diante nada anima", criadas.length === antes && M.ativo() === false);
  consultaReduzida.matches = false;
  M.animar(a, "x", [{ opacity: 0 }, { opacity: 1 }]);
  M.pararTudo();
  t.ok("pararTudo (a troca de estilo chama) limpa o registro", M._rodando() === 0);
}

t.grupo("Altura: interrompível e sem altura fixa no fim");
{
  const el = elemento(40);
  el.style.overflow = "visible";
  let completo = null;
  const p = M.altura(el, false, { ate: 10, aoFim: (c) => { completo = c; } });
  const a = criadas[criadas.length - 1];
  t.ok("fechar anima da altura atual até a fechada", a.quadros[0].height === "40px" && a.quadros[1].height === "10px");
  t.igual("  com overflow escondido durante o movimento", el.style.overflow, "hidden");
  a.terminar(); await p;
  t.ok("no fim, o overflow volta e nenhuma altura fica escrita", el.style.overflow === "visible" && !el.style.height && completo === true);
  el.altura = 60;
  el.style.height = "20px";
  M.altura(el, true);
  const b = criadas[criadas.length - 1];
  M.altura(el, false, { ate: 10 });
  t.ok("reabrir no meio cancela e parte de onde está", b.estado === "cancelada");
}

t.grupo("Destaque e continuidade: o número nunca recomeça do zero");
{
  const el = elemento(10);
  M.destacar(el);
  const a = criadas[criadas.length - 1];
  t.ok("o destaque é só um fundo que some (a cor vem do token)", a.quadros[0].backgroundColor === "rgb(1,2,3)" && a.quadros[1].backgroundColor === "transparent");
  t.ok("nenhum quadro mexe em texto ou valor", criadas.every((x) => x.quadros.every((q) => !("textContent" in q) && !("content" in q))));
}

t.grupo("Primeira apresentação: curta, limitada e uma vez");
{
  const filhos = Array.from({ length: 30 }, () => elemento(10));
  const lista = { children: filhos };
  const antes = criadas.length;
  M.apresentar(lista);
  const novas = criadas.slice(antes);
  t.ok("só os primeiros oito animam", novas.length === 8);
  t.ok("  em escada curta (no máximo 160 ms de atraso)", Math.max(...novas.map((x) => x.opcoes.delay)) <= 160);
  M.apresentar(lista);
  t.ok("redesenhar a mesma lista não repete", criadas.length === antes + 8);
}

t.grupo("As folhas e as telas");
{
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url));
  const tokensCss = await ler("css/modern20/tokens.css");
  t.ok("os cinco degraus de duração e as três curvas moram nos tokens", ["toque", "estado", "navegar", "janela", "especial"].every((n) => new RegExp("--m20-mov-" + n + ":").test(tokensCss)) &&
    ["sair", "mover", "fechar"].every((n) => new RegExp("--m20-curva-" + n + ":").test(tokensCss)));
  t.ok("movimento reduzido zera os degraus dentro do Modern20 (a regra do Legacy perderia)", /prefers-reduced-motion: reduce\)\s*\{\s*--m20-mov-toque: 0ms;[\s\S]*--m20-mov-especial: 0ms;/.test(tokensCss));
  const comp = await ler("css/modern20/componentes.css");
  t.ok("a pressão usa `scale` (compõe com o transform de capas e arraste)", /:active[^{]*\{ scale: var\(--m20-pressao\); \}/.test(comp) && !/:active[^{]*\{[^}]*transform:/.test(comp.slice(comp.indexOf("MOVIMENTO E MICROINTERAÇÕES"))));
  t.ok("todo keyframe novo tem o prefixo m20-", [...comp.matchAll(/@keyframes ([a-z0-9-]+)/g)].every((m) => /^m20-/.test(m[1])));
  const ui = await ler("js/ui.js");
  t.ok("a janela sai por prazo, nunca esperando animationend", /fundo\.classList\.add\("r-fundo--saindo"\);\s*setTimeout\(/.test(ui) && !/animationend/.test(ui));
  t.ok("  e aoFechar continua protegido contra repetição", /if \(fechada\) return;\s*fechada = true;/.test(ui));
  t.ok("o aviso também: uma vez, por prazo", /if \(fechado\) return;\s*fechado = true;/.test(ui));
  t.ok("o resultado do botão só depois da resposta, e só com ok explícito", /resultado = await fn\(\);[\s\S]*typeof resultado\.ok === "boolean"/.test(ui));
  const mov = await ler("js/movimento.js");
  t.ok("nenhum observador de mutações e nenhuma chamada de API no módulo", !/MutationObserver/.test(mov) && !/RAMAApi|fetch\(|salvar|alterou\(/.test(mov));
  const util = await ler("js/util.js");
  t.ok("U.trocar continua síncrono (limpa e anexa)", /function trocar\(node, filhos\) \{\s*limpar\(node\);\s*return anexar\(node, filhos\);\s*\}/.test(util));
  const PAGINAS = ["index.html", "personagens/index.html", "campanhas/index.html", "campanha/index.html", "ficha/index.html", "homebrew/index.html", "perfil/index.html", "catalogo/index.html"];
  const sem = [];
  for (const p of PAGINAS) {
    const html = await ler(p);
    const iM = html.indexOf("js/movimento.js"), iU = html.indexOf("js/ui.js");
    if (!(iM > 0 && iM < iU)) sem.push(p);
  }
  t.ok("toda página carrega o movimento antes de ui.js", sem.length === 0, sem.join(", "));
  const iface = await ler("js/interface.js");
  t.ok("trocar de estilo para os movimentos em andamento", /RAMAMovimento\.pararTudo\(\)/.test(iface));
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
