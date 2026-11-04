/* =====================================================================
   R.A.M.A. — a ficha de Ordem no navegador (v6.4)
   ---------------------------------------------------------------------
       deno run --allow-read --allow-net --allow-env testes/servidor-local.js
       deno run --allow-run --allow-net --allow-read --allow-write --allow-env testes/ficha-ordem-interface.js [--porta 8124]

   Com o servidor local de pé (dados SINTÉTICOS, em memória), abre o
   Chrome instalado sem interface (RAMA_CHROME indica outro executável)
   pelo DevTools Protocol e confere a composição da ficha de Ordem: o
   bloco de cima sem controles, a tira em grupos, a Geral (pentagrama,
   recursos com ajuste e "aplicar com as regras" separados, defesa,
   ataques, perícias), o ajuste manual sem redesenho, a condição crítica
   no topo, os atalhos do resumo, os ajustes da mesa na aba Regras, o
   modo edição, a patente desligada, Mundano e Sobrevivente, e o celular
   sem rolagem horizontal. Rode com o servidor recém-iniciado: o teste
   muda a ficha sintética (PV, condições, patente).

   Não é a implantação: não fala com o Google nem com conta real.
   ===================================================================== */

const i = Deno.args.indexOf("--porta");
const PORTA = i >= 0 ? Number(Deno.args[i + 1]) : 8124;
const BASE = "http://localhost:" + PORTA;
const CHROME = Deno.env.get("RAMA_CHROME") || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const ids = await (await fetch(BASE + "/__ids")).json();
const versao = /versao: "([0-9.]+)"/.exec(await Deno.readTextFile(new URL("../js/versao.js", import.meta.url)))[1];

/* ---------- o Chrome, pelo protocolo ---------- */

const perfil = await Deno.makeTempDir({ prefix: "rama-chrome-" });
const porta = 9300 + Math.floor(Math.random() * 500);
const processo = new Deno.Command(CHROME, {
  args: ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--remote-debugging-port=" + porta,
    "--user-data-dir=" + perfil, "about:blank"],
  stdout: "null", stderr: "null",
}).spawn();
let alvo = null;
for (let n = 0; n < 60 && !alvo; n++) {
  await esperar(200);
  try { alvo = (await (await fetch("http://127.0.0.1:" + porta + "/json")).json()).find((x) => x.type === "page"); } catch { /* subindo */ }
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => ws.onopen = r);
let seq = 0;
const pendentes = {};
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pendentes[m.id]) { pendentes[m.id](m); delete pendentes[m.id]; } };
const cmd = (method, params) => new Promise((r) => { const n = ++seq; pendentes[n] = r; ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
async function avaliar(js) {
  const r = await cmd("Runtime.evaluate", { expression: "(async () => {" + js + "})()", awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result.result.value;
}
async function tela(largura, altura, movel) {
  await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: !!movel });
  await cmd("Emulation.setTouchEmulationEnabled", { enabled: !!movel, maxTouchPoints: movel ? 5 : 1 });
}
async function abrir(fichaId) {
  const ls = encodeURIComponent(JSON.stringify({ "rama.versao.vista": versao }));
  await cmd("Page.navigate", { url: BASE + "/__entrar?conta=dona&ls=" + ls + "&para=" + encodeURIComponent("/ficha/?id=" + fichaId) });
  for (let n = 0; n < 60; n++) {
    await esperar(200);
    try { if (await avaliar("return !!document.querySelector('.ordem-cabeca') && !!document.querySelector('.ordem-geral');")) return true; } catch { /* carregando */ }
  }
  return false;
}
/* Cada verificação da página devolve [nome, ok, detalhe]. */
async function conferir(js) {
  const lista = await avaliar(js);
  for (const [nome, ok, detalhe] of lista) t.ok(nome, ok, detalhe);
}

await cmd("Page.enable");
await tela(1366, 900);

const AJUDA = `
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const saida = [];
  const ok = (nome, cond, det) => saida.push([nome, !!cond, det === undefined ? "" : String(det)]);
  const aba = async (chave) => { $("#aba-" + chave).click(); await espera(250); };
  const abaAtiva = () => $(".r-aba[aria-selected='true']").id.replace("aba-", "");
  const fechar = async () => {
    const b = $(".r-modal .r-botao--principal") || $$(".r-modal button").find((x) => /fechar/i.test(x.getAttribute("aria-label") || x.textContent));
    if (b) b.click(); else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await espera(300);
  };
`;

try {
  t.grupo("o bloco de cima e a tira");
  t.ok("a ficha de Ordem abriu", await abrir(ids.ordem));
  await conferir(AJUDA + `
    const bloco = $("[data-regiao='bloco']");
    ok("o bloco tem a identificação e o resumo", $(".ordem-cabeca__identidade", bloco) && $(".ordem-resumo", bloco));
    ok("nenhum painel completo no bloco (atributos, recursos, condições, defesa)", !$(".ordem-atributo, .ordem-recurso, [data-painel-condicoes], .ordem-defesa", bloco));
    ok("o resumo não tem campo nem controle que altere a ficha", !$("input, select, textarea, .r-passo", bloco));
    ok("o resumo traz PV e PD (Jogando sem Sanidade) e a Defesa", $("[data-resumo-recurso='pv']") && $("[data-resumo-recurso='pd']") && $("[data-resumo-defesa]"));
    const abas = $$(".r-aba").map((a) => a.id.replace("aba-", ""));
    ok("as abas pela frequência de uso", abas.join(",") === "geral,pericias,habilidades,rituais,inventario,anotacoes,aliados,progressao,regras", abas.join(","));
    ok("dois respiros na tira: personagem e preparação", $$(".r-aba--novo-grupo").map((a) => a.id).join(",") === "aba-habilidades,aba-progressao");
    ok("todas continuam tab", $$(".r-abas [role='tab']").length === abas.length);
    return saida;`);

  t.grupo("a Geral");
  await conferir(AJUDA + `
    ok("nenhum botão dentro de outro botão na ficha", !$(".ficha button button, .ficha [role='button'] button"));
    const nos = $$(".ordem-pentagrama .ordem-atributo").map((n) => [...n.classList].find((c) => c.startsWith("ordem-atributo--")).slice(16));
    ok("os cinco atributos na ordem do catálogo", nos.join(",") === "agi,for,int,pre,vig", nos.join(","));
    ok("cada atributo é um grupo com um botão de rolar", $$(".ordem-atributo").every((n) => n.getAttribute("role") === "group" && $(".ordem-atributo__rolar", n)));
    ok("o desenho é decoração", $(".ordem-pentagrama__desenho").getAttribute("aria-hidden") === "true" && $(".ordem-pentagrama__centro").getAttribute("aria-hidden") === "true");
    const r = (k) => [...$$(".ordem-atributo--" + k)][0].getBoundingClientRect();
    ok("AGI em cima, FOR e INT nos lados, PRE e VIG embaixo", r("agi").top < r("for").top && r("for").left < r("agi").left && r("int").left > r("agi").left && r("pre").top > r("for").top && r("vig").left > r("pre").left);
    const pv = $(".ordem-recurso[data-recurso='pv']");
    ok("recurso: o campo de ajuste manual tem rótulo e foco estável", $("[data-foco='recurso-pv']", pv) && /ajuste manual/.test($("[data-foco='recurso-pv']", pv).getAttribute("aria-label")));
    ok("recurso: 'aplicar com as regras' é outro grupo, com rótulo", /Aplicar com as regras/.test($(".recurso-acoes", pv).getAttribute("aria-label")) && $("[data-foco='acao-pv-dano']", pv));
    ok("recurso: o máximo abre a composição", $(".calculado--inline", pv));
    ok("Defesa em destaque; Bloqueio e Esquiva em linhas", $("[data-foco='calculado-defesa']").classList.contains("calculado--destaque") && $$(".ordem-derivados .calculado--linha").length === 4);
    const armas = $$(".ordem-ataque").length;
    ok("os ataques são as armas do inventário", armas > 0, armas);
    ok("perícias: as 28, com nome (usos), total (conta) e dado", $$(".ordem-rapida").length === 28 && $("[data-foco='rapida-usos-luta']") && $("[data-foco='rapida-total-luta']") && $("[data-foco='rapida-rolar-luta']"));
    ok("os ajustes da mesa saíram da Geral", !$(".ordem-painel-ajustes"));
    ok("Personagem embaixo: a Identidade", $(".ordem-personagem .r-painel"));
    return saida;`);

  t.grupo("ajuste manual, ações e atalhos");
  await conferir(AJUDA + `
    const campo = $("[data-foco='recurso-pv']");
    const mais = campo.parentElement.querySelector("button[aria-label^='Aumentar']");
    const antes = Number(campo.value);
    mais.focus(); mais.click(); await espera(120);
    ok("o + do ajuste não redesenha (o mesmo campo, o foco no botão)", campo.isConnected && document.activeElement === mais && Number(campo.value) === antes + 1);
    ok("o resumo do bloco acompanha no lugar", $("[data-resumo-recurso='pv'] .ordem-resumo__atual").textContent === String(antes + 1));
    campo.focus(); campo.value = "30"; campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await espera(120);
    $("[data-foco='acao-valor-pv']").value = "5";
    $("[data-foco='acao-pv-dano']").click(); await espera(300);
    ok("Dano parte do valor de agora (30 − 5), mesmo depois de um ajuste sem redesenho", $("[data-foco='recurso-pv']").value === "25", $("[data-foco='recurso-pv']").value);
    ok("o foco volta ao botão da ação", document.activeElement && document.activeElement.dataset.foco === "acao-pv-dano");
    $("[data-foco='acao-valor-pv']").value = "99";
    $("[data-foco='acao-pv-dano']").click(); await espera(300);
    const painel = $("[data-painel-condicoes]");
    ok("PV em 0 pelo Dano: Morrendo ativo e o painel sobe para o topo da Geral", painel.dataset.critico === "sim" && $(".ordem-geral").firstElementChild === painel);
    ok("o resumo avisa a condição crítica", $$(".ordem-resumo__alerta").some((b) => /Morrendo/.test(b.textContent)));
    await aba("rituais");
    $$(".ordem-resumo__alerta").find((b) => /Morrendo/.test(b.textContent)).click(); await espera(300);
    ok("o alerta leva à Geral e põe o foco em Morrendo", abaAtiva() === "geral" && document.activeElement && document.activeElement.dataset.foco === "morrendo-mais");
    $("[data-foco='morrendo-encerrar']").click(); await espera(300);
    $("[data-foco='inconsciente-encerrar']") && $("[data-foco='inconsciente-encerrar']").click(); await espera(300);
    ok("encerrada a crítica, o painel volta à coluna", $("[data-painel-condicoes]").dataset.critico === "nao" && !!$(".ordem-sessao__jogo [data-painel-condicoes]"));
    ok("sem nada ativo, Morrendo e Enlouquecendo viram uma linha (ou ficam só os encerrados)", $(".condicoes__rastreadores") || $$(".condicao--encerrada").length > 0);
    ok("Nova cena à vista; interlúdio e imunidades recolhidos", $("[data-foco='condicoes-nova-cena']") && $(".condicoes__mais [data-foco='condicoes-novo-interludio']") && $(".condicoes__mais [data-foco='efeitos-imunidades']"));
    await aba("inventario");
    $("[data-resumo-recurso='pd']").click(); await espera(300);
    ok("PD no resumo leva ao campo de PD", abaAtiva() === "geral" && document.activeElement && document.activeElement.dataset.foco === "recurso-pd");
    return saida;`);

  t.grupo("rolagens e janelas pelos mesmos manipuladores");
  await conferir(AJUDA + `
    const n = () => $$(".rolagem").length;
    let a = n(); $("[data-foco='atributo-for']").click(); await espera(250);
    ok("o atributo rola", n() === a + 1);
    a = n(); $("[data-foco='rapida-rolar-luta']").click(); await espera(250);
    ok("a perícia rola da Geral", n() === a + 1);
    a = n(); $(".ordem-ataque .r-botao--principal").click(); await espera(400);
    ok("o Ataque rola da Geral", n() >= a + 1);
    $("[data-foco='rapida-usos-acrobacia']").click(); await espera(300);
    ok("o nome abre os usos da perícia", $(".r-modal") && /Acrobacia/.test($(".r-modal").textContent));
    await fechar();
    $("[data-foco='calculado-defesa']").click(); await espera(300);
    ok("a Defesa abre a composição com o bônus extra", !!$(".r-modal .composicao-extra"));
    await fechar();
    await aba("regras");
    ok("os ajustes da mesa estão na aba Regras", !!$(".ordem-painel-ajustes"));
    await aba("pericias");
    ok("a aba Perícias continua com a tabela completa", $$(".ordem-pericia").length === 29);
    await aba("geral");
    return saida;`);

  t.grupo("patente desligada e modo edição");
  await conferir(AJUDA + `
    await aba("regras");
    const chave = $("[data-foco='regra:patente']");
    const ligada = chave.classList.contains("r-interruptor--ligado");
    if (ligada) { chave.click(); await espera(300); $$(".r-modal .r-botao").find((b) => b.textContent.trim() === "Desligar").click(); await espera(500); }
    ok("com a patente desligada, ela não aparece no bloco", !$$(".ordem-cabeca__par dt").some((d) => d.textContent === "Patente"));
    await aba("geral");
    $$(".modo__opcao").find((b) => b.textContent === "Edição").click(); await espera(600);
    ok("na edição, os atributos viram cartões com o controle de valor", $(".ordem-pentagrama--edicao") && $$(".ordem-pentagrama--edicao .r-passo").length === 5);
    ok("na edição, foto e nome na Identidade", $(".ordem-identidade__edicao .ficha-foto") && $(".ordem-identidade__edicao input"));
    ok("na edição, o resumo continua sem controles", !$("[data-regiao='bloco'] input, [data-regiao='bloco'] .r-passo"));
    $$(".modo__opcao").find((b) => b.textContent === "Normal").click(); await espera(500);
    return saida;`);

  t.grupo("Mundano e Sobrevivente (só o livro básico)");
  const criados = await avaliar(`
    const F = RAMAFicha, R = RAMAOrdemRegras;
    const novos = [];
    for (const [nome, classe] of [["Mundano de teste", "mundano"], ["Sobrevivente de teste", "sobrevivente"]]) {
      const f = F.criarFicha({ nome, tipoFicha: "ordem", suplementos: [] });
      f.ordem = R.fichaVazia(); f.ordem.classe = classe; if (classe === "sobrevivente") f.ordem.estagio = 2;
      const r = await RAMAApi.criarPersonagem(f);
      novos.push(r.ok ? r.dados.id : "");
    }
    return novos;`);
  for (const [n, id] of criados.entries()) {
    const rotulo = n === 0 ? "Mundano" : "Sobrevivente";
    t.ok(rotulo + ": a ficha abriu na composição nova", !!id && await abrir(id));
    await conferir(AJUDA + `
      ok("${rotulo}: PV, PE e SAN no resumo e no painel", $("[data-resumo-recurso='pe']") && $("[data-resumo-recurso='san']") && $$(".ordem-recurso").length === 3);
      ok("${rotulo}: sem arma, os Ataques dizem isso e levam ao Inventário", $(".ordem-ataques__vazio .r-link"));
      ok("${rotulo}: a identificação mostra a classe", $$(".ordem-cabeca__par dd")[0].textContent.length > 0);
      ${n === 1 ? `ok("Sobrevivente: o estágio no bloco", $$(".ordem-cabeca__par dt").some((d) => d.textContent === "Estágio"));` : ""}
      return saida;`);
  }

  t.grupo("celular");
  await tela(390, 844, true);
  t.ok("a ficha abriu a 390 px", await abrir(ids.ordem));
  await conferir(AJUDA + `
    ok("sem rolagem horizontal da página", document.documentElement.scrollWidth <= 390, document.documentElement.scrollWidth);
    const rp = $(".ordem-rapida__rolar");
    ok("o dado da perícia tem área de toque (≥ 40 px)", rp.getBoundingClientRect().width >= 40, rp.getBoundingClientRect().width);
    const no = $(".ordem-atributo__rolar").getBoundingClientRect();
    ok("o círculo do atributo é um alvo grande (≥ 72 px)", no.width >= 72, Math.round(no.width));
    ok("o bloco de cima ocupa pouco (< 30% da altura)", $("[data-regiao='bloco'] .ordem-cabeca").getBoundingClientRect().height < 844 * 0.3, Math.round($(".ordem-cabeca").getBoundingClientRect().height));
    return saida;`);
} catch (e) {
  t.ok("o roteiro chegou ao fim", false, e.message);
} finally {
  ws.close();
  processo.kill();
  await esperar(400);
  try { await Deno.remove(perfil, { recursive: true }); } catch { /* o Chrome ainda segura */ }
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
Deno.exit(falharam ? 1 : 0);
