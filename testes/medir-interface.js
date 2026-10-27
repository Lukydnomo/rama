/* =====================================================================
   R.A.M.A. — medição da interface da ficha (v2.46)
   ---------------------------------------------------------------------
   Roda DENTRO da página da ficha, no navegador, contra o servidor local
   (testes/servidor-local.js) ou uma implantação de teste:

       const m = await import("/testes/medir-interface.js");
       await m.medirFicha({ repeticoes: 3 });

   Cada cenário clica nos controles de verdade e conta:

     completos    redesenhos da ficha inteira (U.trocar em #ficha)
     nos          elementos inseridos no DOM da ficha (MutationObserver)
     calculos     chamadas da tela ao motor de Ordem (funções de
                  RAMAOrdemRegras), e quantas foram R.calcular
     ms           tempo síncrono das ações (o handler inteiro: regras +
                  montagem do DOM), soma das repetições
     pedidos      ações enviadas ao servidor no cenário (incluindo o
                  salvamento automático, esperado até o fim do debounce)

   Serve para a versão anterior e para a atual — não depende de nenhuma
   instrumentação do código. Tempos são do navegador desta máquina e
   variam: comparar só execuções feitas na mesma máquina, em sequência.
   ===================================================================== */

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function instalarContadores() {
  const R = window.RAMAOrdemRegras;
  const U = window.RAMAUtil;
  const c = { completos: 0, nos: 0, calculos: 0, calcular: 0, pedidos: [] };
  const originais = [];

  if (R) {
    Object.keys(R).forEach((k) => {
      if (typeof R[k] !== "function") return;
      const fn = R[k];
      originais.push([R, k, fn]);
      R[k] = function () {
        c.calculos++;
        if (k === "calcular") c.calcular++;
        return fn.apply(this, arguments);
      };
    });
  }
  const trocar = U.trocar;
  originais.push([U, "trocar", trocar]);
  U.trocar = function (alvo) {
    if (alvo && alvo.id === "ficha") c.completos++;
    return trocar.apply(this, arguments);
  };
  const fetchOriginal = window.fetch;
  originais.push([window, "fetch", fetchOriginal]);
  window.fetch = function (url, op) {
    try {
      const corpo = JSON.parse((op && op.body) || "{}");
      if (corpo.acao) c.pedidos.push(corpo.acao === "lote" ? "lote:" + (corpo.pedidos || []).map((p) => p.acao).join("+") : corpo.acao);
    } catch (e) { /* corpo que não é JSON */ }
    return fetchOriginal.apply(this, arguments);
  };
  const obs = new MutationObserver((lista) => {
    lista.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType === 1) c.nos += 1 + n.getElementsByTagName("*").length;
    }));
  });
  obs.observe(document.querySelector("#ficha"), { childList: true, subtree: true });

  return {
    c,
    zerar() { c.completos = 0; c.nos = 0; c.calculos = 0; c.calcular = 0; c.pedidos = []; },
    retirar() { obs.disconnect(); originais.reverse().forEach(([o, k, fn]) => { o[k] = fn; }); },
  };
}

function botao(texto, raiz) {
  return [...(raiz || document).querySelectorAll("button")].find((b) =>
    b.textContent.trim() === texto || b.getAttribute("aria-label") === texto) || null;
}

function aba(nome) {
  const b = [...document.querySelectorAll(".ficha .r-abas .r-aba")].find((a) => a.textContent.trim() === nome);
  if (b) b.click();
  return !!b;
}

/* Executa `acao` e devolve o tempo síncrono (ms). Microtarefas e o
   setTimeout(0) de algum redesenho adiado entram na espera seguinte. */
function cronometrar(acao) {
  const a = performance.now();
  acao();
  return performance.now() - a;
}

export async function medirFicha(opcoes) {
  const o = opcoes || {};
  const vezes = o.repeticoes || 3;
  const esperaSalvar = o.esperaSalvar === undefined ? 2600 : o.esperaSalvar;
  const ordem = !!document.querySelector(".ordem-recurso");
  const cont = instalarContadores();
  const resultados = [];

  async function cenario(nome, passos) {
    aba("Geral");
    await esperar(50);
    cont.zerar();
    if (window.RAMAMedicao) window.RAMAMedicao.zerar();
    let ms = 0;
    for (let i = 0; i < vezes; i++) {
      for (const passo of passos) {
        const alvo = passo.alvo();
        if (!alvo) { resultados.push({ nome, erro: "controle não encontrado: " + passo.rotulo }); return; }
        ms += cronometrar(() => (passo.antes && passo.antes(alvo), alvo.click()));
        await esperar(passo.espera || 30);
      }
    }
    await esperar(esperaSalvar);
    resultados.push({
      nome, repeticoes: vezes,
      completos: cont.c.completos, nos: cont.c.nos, calculos: cont.c.calculos, calcular: cont.c.calcular,
      ms: Math.round(ms * 10) / 10, pedidos: cont.c.pedidos.slice(),
      medicao: window.RAMAMedicao ? window.RAMAMedicao.ver() : null,
    });
  }

  if (ordem) {
    await cenario("recurso: ajuste manual (+ e −)", [
      { rotulo: "+PV", alvo: () => botao("Aumentar Pontos de vida atual (ajuste manual)") },
      { rotulo: "−PV", alvo: () => botao("Diminuir Pontos de vida atual (ajuste manual)") },
    ]);
    await cenario("recurso: Dano e Cura em PV", [
      { rotulo: "Dano", alvo: () => botao("Dano", document.querySelector(".ordem-recurso")) },
      { rotulo: "Cura", alvo: () => botao("Cura", document.querySelector(".ordem-recurso")) },
    ]);
    await cenario("condição: Nova cena (com a confirmação)", [
      { rotulo: "Nova cena", alvo: () => botao("Nova cena", document.querySelector("[data-painel-condicoes]")), espera: 150 },
      { rotulo: "confirmar", alvo: () => botao("Nova cena", document.querySelector(".r-modal")), espera: 80 },
    ]);
    await cenario("recurso: Dano com a aba Perícias aberta (a seção depende)", [
      { rotulo: "Perícias", alvo: () => [...document.querySelectorAll(".ficha .r-abas .r-aba")].find((a) => a.textContent.trim() === "Perícias") },
      { rotulo: "Dano", alvo: () => botao("Dano", document.querySelector(".ordem-recurso")) },
      { rotulo: "Cura", alvo: () => botao("Cura", document.querySelector(".ordem-recurso")) },
    ]);
    await cenario("recurso: Dano com Anotações aberta (a seção não depende)", [
      { rotulo: "Anotações", alvo: () => [...document.querySelectorAll(".ficha .r-abas .r-aba")].find((a) => a.textContent.trim() === "Anotações") },
      { rotulo: "Dano", alvo: () => botao("Dano", document.querySelector(".ordem-recurso")) },
      { rotulo: "Cura", alvo: () => botao("Cura", document.querySelector(".ordem-recurso")) },
    ]);
  } else {
    await cenario("status: + e −", [
      { rotulo: "+", alvo: () => [...document.querySelectorAll(".ficha button")].find((b) => b.textContent.trim() === "+") },
      { rotulo: "−", alvo: () => [...document.querySelectorAll(".ficha button")].find((b) => b.textContent.trim() === "−") },
    ]);
  }

  await cenario("trocar de aba (Perícias, Inventário, Geral)", [
    { rotulo: "Perícias", alvo: () => [...document.querySelectorAll(".ficha .r-abas .r-aba")].find((a) => a.textContent.trim() === "Perícias") },
    { rotulo: "Inventário", alvo: () => [...document.querySelectorAll(".ficha .r-abas .r-aba")].find((a) => a.textContent.trim() === "Inventário") },
    { rotulo: "Geral", alvo: () => [...document.querySelectorAll(".ficha .r-abas .r-aba")].find((a) => a.textContent.trim() === "Geral") },
  ]);

  cont.retirar();
  return { ficha: ordem ? "ordem" : "universal", resultados };
}

/* Digitação contínua num campo de texto no modo edição: quantas
   gravações saem, e quanto tempo depois da última tecla a última sai.
   `teclas` caracteres, um a cada `intervalo` ms. */
export async function medirDigitacao(opcoes) {
  const o = opcoes || {};
  const teclas = o.teclas || 40;
  const intervalo = o.intervalo || 120;
  const seletor = o.seletor || "textarea";
  const editar = botao("Edição");
  if (editar && editar.getAttribute("aria-pressed") !== "true") editar.click();
  await esperar(100);
  if (o.aba) { aba(o.aba); await esperar(100); }
  const campo = document.querySelector("#ficha " + seletor);
  if (!campo) return { erro: "campo não encontrado: " + seletor };
  const pedidos = [];
  const quando = [];
  const fetchOriginal = window.fetch;
  window.fetch = function (url, op) {
    try {
      const corpo = JSON.parse((op && op.body) || "{}");
      if (corpo.acao === "salvar_personagem") { pedidos.push(corpo.acao); quando.push(performance.now()); }
    } catch (e) { /* ignorado */ }
    return fetchOriginal.apply(this, arguments);
  };
  campo.focus();
  const inicio = performance.now();
  for (let i = 0; i < teclas; i++) {
    campo.value += String.fromCharCode(97 + (i % 26));
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    await esperar(intervalo);
  }
  const fim = performance.now();
  campo.dispatchEvent(new Event("change", { bubbles: true }));
  await esperar(o.esperaFinal || 3000);
  window.fetch = fetchOriginal;
  return {
    teclas, intervalo, gravacoes: pedidos.length,
    primeiraAposMs: quando.length ? Math.round(quando[0] - inicio) : null,
    ultimaAposUltimaTeclaMs: quando.length ? Math.round(quando[quando.length - 1] - fim) : null,
    duracaoMs: Math.round(fim - inicio),
  };
}
