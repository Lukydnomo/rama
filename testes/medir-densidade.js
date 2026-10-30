/* =====================================================================
   R.A.M.A. — conferência da densidade no navegador (v5.2)
   ---------------------------------------------------------------------
   Rodar no console de uma ficha ou campanha aberta (servidor local):
       const m = await import("/testes/medir-densidade.js");
       await m.medir();
   Percorre as abas da página, nas duas densidades e nos dois estilos,
   e devolve: a altura de cada aba (Confortável × Compacta), elementos
   que passam da largura da página (fora das faixas de abas, que rolam
   de lado de propósito) e recolhíveis com margem dentro de uma grade.
   Só lê: não grava nada, não pede nada ao servidor.
   ===================================================================== */

const raiz = document.documentElement;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function problemas(escopo) {
  const out = new Set();
  const largura = raiz.clientWidth + 1;
  escopo.querySelectorAll("*").forEach((e) => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    if (r.width && r.right > largura && cs.position !== "fixed" && !e.closest(".r-abas, [class*='rolavel']")) out.add("transborda: " + String(e.className).split(" ")[0]);
    const p = e.parentElement;
    if (p && /recolhivel/.test(e.className) && getComputedStyle(p).display.includes("grid") && parseFloat(cs.marginTop) > 0) out.add("margem na grade: " + String(p.className).split(" ")[0]);
  });
  return [...out];
}

async function percorrer() {
  const saida = {};
  const abas = () => [...document.querySelectorAll("[role=tab]")];
  const n = abas().length || 1;
  for (let i = 0; i < n; i++) {
    const t = abas()[i];
    if (t) { t.click(); await espera(350); }
    const nome = t ? t.textContent.trim() : "página";
    saida[nome] = { altura: raiz.scrollHeight, problemas: problemas(document.querySelector("main") || document.body) };
  }
  return saida;
}

export async function medir() {
  const antes = { densidade: raiz.getAttribute("data-densidade"), interface: raiz.getAttribute("data-interface") };
  const resultado = {};
  try {
    for (const estilo of ["legacy", "modern20"]) {
      raiz.setAttribute("data-interface", estilo);
      for (const dens of ["confortavel", "compacta"]) {
        raiz.setAttribute("data-densidade", dens);
        resultado[estilo + "/" + dens] = await percorrer();
      }
    }
  } finally {
    raiz.setAttribute("data-densidade", antes.densidade || "confortavel");
    if (antes.interface) raiz.setAttribute("data-interface", antes.interface);
  }
  const resumo = {};
  Object.keys(resultado["legacy/confortavel"]).forEach((aba) => {
    resumo[aba] = ["legacy", "modern20"].map((e) => {
      const a = resultado[e + "/confortavel"][aba], b = resultado[e + "/compacta"][aba];
      return e + ": " + a.altura + " → " + b.altura + " (" + Math.round((1 - b.altura / a.altura) * 100) + "%)";
    }).join(" · ");
  });
  const ruins = [];
  Object.keys(resultado).forEach((k) => Object.keys(resultado[k]).forEach((aba) => {
    resultado[k][aba].problemas.forEach((p) => ruins.push(k + " · " + aba + " · " + p));
  }));
  return { largura: raiz.clientWidth, resumo, problemas: [...new Set(ruins)] };
}
