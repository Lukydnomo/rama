/* =====================================================================
   R.A.M.A. — testes do backend: feedback entregue no Discord
   Dados sintéticos. O UrlFetchApp é simulado: nenhum teste sai para a
   rede, e o webhook abaixo só tem o FORMATO de um — não existe.
   Chamado por executar-backend.js.
   ===================================================================== */

const WEBHOOK = "https://discord.com/api/webhooks/123456789012345678/token-de-teste-que-nao-existe_000";
const SEGREDO = "token-de-teste-que-nao-existe_000";

export async function testarFeedbackBackend({ t, preparar, novaConta, comoFn, chamar, ambiente }) {
  /* O Discord simulado: guarda cada pedido e responde o que o teste
     mandar. `durante` roda no meio da entrega (pedido simultâneo). */
  const pedidos = [];
  let responder = () => ({ status: 200, corpo: JSON.stringify({ id: "1" }) });
  let durante = null;
  globalThis.UrlFetchApp = {
    fetch(url, opcoes) {
      pedidos.push({ url, opcoes, corpo: JSON.parse(opcoes.payload) });
      if (durante) { const f = durante; durante = null; f(); }
      const r = responder(url, opcoes);
      if (r.lancar) throw new Error(r.lancar);
      return { getResponseCode: () => r.status, getContentText: () => r.corpo || "", getHeaders: () => r.cabecalhos || {} };
    },
  };

  /* O relógio do servidor, adiantável: o freio conta em segundos. */
  const relogio = Date.now;
  let adiante = 0;
  Date.now = () => relogio() + adiante;
  const passar = (segundos) => { adiante += segundos * 1000; };
  /* Zera o freio: para o grupo que confere a FORMA da mensagem enviar
     quantas precisar sem esbarrar no limite (que tem grupo próprio). */
  const soltar = () => { for (const k of [...ambiente.cache.keys()]) if (k.startsWith("rama.feedback.")) ambiente.cache.delete(k); };

  /* O log do servidor, para conferir que nada sensível chega lá. */
  const logs = [];
  const errOriginal = console.error;
  console.error = (...a) => logs.push(a.join(" "));

  const ok = (extra) => Object.assign({ categoria: "sugestao", assunto: "Inventário mais organizado", descricao: "Seria bom agrupar os itens por categoria.", versao: "2.50.0", pagina: "Ficha — Inventário" }, extra || {});
  const enviar = (C, dados, extra) => C(Object.assign({ acao: "enviar_feedback", dados }, extra || {}));
  const ultimo = () => pedidos[pedidos.length - 1];
  const reiniciar = () => {
    preparar();
    pedidos.length = 0;
    responder = () => ({ status: 200, corpo: JSON.stringify({ id: "1" }) });
    ambiente.propriedades.set("RAMA_FEEDBACK_WEBHOOK", WEBHOOK);
  };

  try {
    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · instalação, sessão e webhook");
    reiniciar();
    const ana = novaConta("fb_ana");
    const A = comoFn(ana);

    const guardada = globalThis.rotasDoFeedback;
    globalThis.rotasDoFeedback = undefined;
    globalThis.CACHE_ROTAS = null;
    t.recusa("sem o Feedback.gs instalado: acao_desconhecida", enviar(A, ok()), "acao_desconhecida");
    globalThis.rotasDoFeedback = guardada;
    globalThis.CACHE_ROTAS = null;
    t.igual("  e nada sai para a rede", pedidos.length, 0);

    t.recusa("sem sessão não envia", chamar(globalThis, { acao: "enviar_feedback", dados: ok() }), "sem_token");
    t.recusa("token inventado não envia", chamar(globalThis, { acao: "enviar_feedback", token: "tk-inventado", dados: ok() }), "sessao");
    t.igual("  nada saiu para a rede", pedidos.length, 0);

    ambiente.propriedades.delete("RAMA_FEEDBACK_WEBHOOK");
    t.recusa("sem RAMA_FEEDBACK_WEBHOOK: feedback_indisponivel", enviar(A, ok()), "feedback_indisponivel");
    ambiente.propriedades.set("RAMA_FEEDBACK_WEBHOOK", "https://exemplo.com/gancho/" + SEGREDO);
    const torto = enviar(A, ok());
    t.recusa("valor que não é webhook do Discord: indisponível", torto, "feedback_indisponivel");
    t.igual("  nenhum dos dois saiu para a rede", pedidos.length, 0);
    t.ok("  e o valor não foi parar no log", !logs.join("\n").includes(SEGREDO));
    ambiente.propriedades.set("RAMA_FEEDBACK_WEBHOOK", WEBHOOK);

    const r = enviar(A, ok());
    t.ok("configurado: entrega e responde ok", r.ok === true);
    t.iguais("  a resposta é só { ok: true }", Object.keys(r).filter((k) => k !== "diag"), ["ok"]);
    t.ok("  o pedido vai ao webhook com ?wait=true", ultimo().url === WEBHOOK + "?wait=true");
    t.ok("  POST em JSON, sem seguir redirecionamento", ultimo().opcoes.method === "post" && ultimo().opcoes.contentType === "application/json" && ultimo().opcoes.followRedirects === false && ultimo().opcoes.muteHttpExceptions === true);

    const lote = A({ acao: "lote", pedidos: [{ acao: "enviar_feedback", dados: ok() }] });
    t.ok("enviar_feedback não entra no lote", lote.ok && lote.dados.respostas[0].erro === "acao_desconhecida");

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · validação no servidor");
    reiniciar();
    const B = comoFn(novaConta("fb_bia"));
    const recusa = (nome, dados, campo, motivo) => {
      const antes = pedidos.length;
      const resp = enviar(B, dados);
      t.ok(nome, resp.ok === false && resp.erro === "feedback_invalido" && (!campo || resp.campo === campo) && (!motivo || resp.motivo === motivo), JSON.stringify(resp));
      if (pedidos.length !== antes) t.ok("  (não devia ter saído para a rede)", false);
    };
    recusa("sem dados", undefined, "dados");
    recusa("dados em lista", [ok()], "dados");
    recusa("categoria ausente", ok({ categoria: undefined }), "categoria");
    recusa("categoria fora da lista", ok({ categoria: "elogio" }), "categoria");
    recusa("categoria que não é texto", ok({ categoria: ["bug"] }), "categoria");
    recusa("assunto vazio", ok({ assunto: "" }), "assunto", "vazio");
    recusa("assunto só de espaços e quebras", ok({ assunto: "   \n\t  " }), "assunto", "vazio");
    recusa("assunto curto", ok({ assunto: " ab " }), "assunto", "curto");
    recusa("assunto acima de 120", ok({ assunto: "a".repeat(121) }), "assunto", "longo");
    recusa("assunto que não é texto", ok({ assunto: 42 }), "assunto", "tipo");
    recusa("descrição vazia", ok({ descricao: "" }), "descricao", "vazio");
    recusa("descrição só de espaços", ok({ descricao: " \n \n " }), "descricao", "vazio");
    recusa("descrição com menos de 10", ok({ descricao: "curta" }), "descricao", "curto");
    recusa("descrição acima de 3000", ok({ descricao: "d".repeat(3001) }), "descricao", "longo");
    recusa("descrição que não é texto", ok({ descricao: { texto: "objeto" } }), "descricao", "tipo");
    recusa("bug: passos acima de 1000", ok({ categoria: "bug", passos: "p".repeat(1001) }), "passos", "longo");
    recusa("bug: esperado acima de 500", ok({ categoria: "bug", esperado: "e".repeat(501) }), "esperado", "longo");
    recusa("bug: observado acima de 500", ok({ categoria: "bug", observado: "o".repeat(501) }), "observado", "longo");
    t.igual("nenhuma recusa saiu para a rede", pedidos.length, 0);

    t.ok("no limite exato passa (120 e 3000)", enviar(B, ok({ assunto: "a".repeat(120), descricao: "d".repeat(3000) })).ok);
    t.ok("  espaços das pontas não contam", ultimo().corpo.embeds[0].title.length === 120);

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · a mensagem ao Discord");
    reiniciar();
    const carla = novaConta("fb_carla");
    const C = comoFn(carla);

    enviar(C, ok());
    let m = ultimo().corpo;
    t.iguais("só três chaves no corpo do webhook", Object.keys(m).sort(), ["allowed_mentions", "embeds", "username"]);
    t.iguais("allowed_mentions sem nenhuma menção", m.allowed_mentions, { parse: [] });
    t.igual("nome fixo do remetente", m.username, "R.A.M.A. · Feedback");
    t.igual("um embed só", m.embeds.length, 1);
    let e = m.embeds[0];
    t.iguais("chaves fixas do embed", Object.keys(e).sort(), ["author", "color", "description", "fields", "footer", "title"]);
    t.igual("cabeçalho", e.author.name, "Novo feedback — R.A.M.A.");
    t.igual("título = assunto", e.title, "Inventário mais organizado");
    t.igual("descrição = descrição", e.description, "Seria bom agrupar os itens por categoria.");
    t.iguais("campos: tipo, usuário, versão, página", e.fields.map((f) => f.name), ["Tipo", "Usuário", "Versão", "Página"]);
    t.igual("  tipo", e.fields[0].value, "Sugestão de melhoria");
    t.igual("  versão", e.fields[2].value, "2.50.0");
    t.igual("  página", e.fields[3].value, "Ficha — Inventário");
    t.ok("rodapé com data e hora de Brasília", /^Enviado em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2} \(horário de Brasília\)$/.test(e.footer.text), e.footer.text);

    /* Anônimo: nada que identifique a conta. */
    t.igual("sem marcar: Anônimo", e.fields[1].value, "Anônimo");
    let bruto = JSON.stringify(m);
    t.ok("  sem id da conta, token, login nem nome", !bruto.includes(carla.id) && !bruto.includes(carla.token) && !/fb_carla/i.test(bruto));
    soltar();
    enviar(C, ok({ identificar: "sim" }));
    t.igual("identificar: \"sim\" não identifica (só true)", ultimo().corpo.embeds[0].fields[1].value, "Anônimo");
    soltar();
    enviar(C, ok({ identificar: true }));
    bruto = JSON.stringify(ultimo().corpo);
    t.igual("identificar: true mostra o nome do agente", ultimo().corpo.embeds[0].fields[1].value, "FB_CARLA");
    t.ok("  mas nunca o id nem o token", !bruto.includes(carla.id) && !bruto.includes(carla.token));

    /* Bug: os extras só quando preenchidos; fora do bug, nunca. */
    soltar();
    enviar(C, ok({ categoria: "bug", passos: "1. Abrir a ficha\n2. Trocar de aba", esperado: "", observado: "A aba some." }));
    e = ultimo().corpo.embeds[0];
    t.igual("bug: tipo", e.fields[0].value, "Relato de bug");
    t.iguais("bug: só os extras preenchidos", e.fields.map((f) => f.name).slice(4), ["Passos para reproduzir", "Comportamento observado"]);
    t.igual("  com a quebra de linha preservada", e.fields[4].value, "1. Abrir a ficha\n2. Trocar de aba");
    soltar();
    enviar(C, ok({ categoria: "outro", passos: "isto não deveria ir" }));
    t.ok("fora do bug, os extras não vão", !JSON.stringify(ultimo().corpo).includes("isto não deveria ir"));
    const cores = {};
    for (const cat of ["sugestao", "bug", "outro"]) { soltar(); enviar(C, ok({ categoria: cat })); cores[cat] = ultimo().corpo.embeds[0].color; }
    t.ok("uma cor por categoria", new Set(Object.values(cores)).size === 3 && Object.values(cores).every((c) => Number.isInteger(c)));

    /* Versão e página: o que não tem formato vira "não informada". */
    soltar();
    enviar(C, ok({ versao: "2.50.0<script>", pagina: "x".repeat(300) }));
    e = ultimo().corpo.embeds[0];
    t.igual("versão fora do formato: não informada", e.fields[2].value, "não informada");
    t.igual("página longa é cortada em 80 (é rótulo da interface)", e.fields[3].value.length, 80);

    /* Campos inesperados no pedido não controlam o webhook. */
    soltar();
    enviar(C, ok({ username: "Admin", avatar_url: "https://x", embeds: [{ title: "falso" }], allowed_mentions: { parse: ["everyone"] }, content: "@everyone", tts: true }),
      { webhook: "https://discord.com/api/webhooks/1/outro", username: "Admin" });
    m = ultimo().corpo;
    t.ok("chaves do pedido não viram propriedades do webhook", m.username === "R.A.M.A. · Feedback" && !("content" in m) && !("tts" in m) && !("avatar_url" in m) && m.allowed_mentions.parse.length === 0 && m.embeds.length === 1);
    t.igual("  e o endereço continua o da propriedade", ultimo().url, WEBHOOK + "?wait=true");

    /* Menções desarmadas, em todo texto livre. */
    soltar();
    enviar(C, ok({ categoria: "bug", assunto: "@everyone olhem", descricao: "Oi @here, <@123456789> e <@&987654321> e <@!42> no <#555>.", passos: "@everyone de novo", identificar: true }));
    bruto = JSON.stringify(ultimo().corpo);
    t.ok("  nenhuma menção crua sobra", !/@everyone|@here|<@\d|<@&\d|<@!\d|<#\d/.test(ultimo().corpo.embeds[0].title + ultimo().corpo.embeds[0].description + ultimo().corpo.embeds[0].fields.map((f) => f.value).join("")));
    t.ok("  o texto continua legível (só um espaço invisível a mais)", ultimo().corpo.embeds[0].title === "@\u200Beveryone olhem");

    /* Controle e direção invisível saem; o resto do texto fica. */
    soltar();
    enviar(C, ok({ descricao: "Texto\u0000 com \u202Econtrole\u0007 invisível." }));
    t.igual("caracteres de controle e de direção saem", ultimo().corpo.embeds[0].description, "Texto com controle invisível.");

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · limites do Discord");
    const Core = globalThis.RamaFeedbackCore;
    const maximo = Core.montarMensagem(Core.validar({
      categoria: "bug", assunto: "A".repeat(120), descricao: "D".repeat(3000), passos: "P".repeat(1000), esperado: "E".repeat(500), observado: "O".repeat(500),
      versao: "999.999.999", pagina: "G".repeat(80), identificar: true,
    }).dados, { nome: "N".repeat(200), data: "31/12/2026 às 23:59 (horário de Brasília)" });
    const em = maximo.embeds[0];
    t.ok("tudo no máximo cabe no embed (≤ 6000)", Core.tamanhoDoEmbed(em) <= 6000, String(Core.tamanhoDoEmbed(em)));
    t.ok("  descrição ≤ 4096, título ≤ 256", em.description.length <= 4096 && em.title.length <= 256);
    t.ok("  cada campo ≤ 1024 e nenhum vazio", em.fields.every((f) => f.value.length > 0 && f.value.length <= 1024 && f.name.length <= 256));
    t.ok("  o nome é cortado em 80", em.fields[1].value.length === 80);
    t.ok("  cabeNoDiscord confirma", Core.cabeNoDiscord(maximo));

    /* Desarmar menções aumenta o texto: se passar de um teto, NÃO envia. */
    reiniciar();
    const D = comoFn(novaConta("fb_davi"));
    const antes = pedidos.length;
    const inchado = enviar(D, ok({ categoria: "bug", passos: "@here".repeat(200) }));
    t.ok("texto que passaria do teto depois de formatado é recusado", inchado.ok === false && inchado.erro === "feedback_invalido" && inchado.motivo === "formatado", JSON.stringify(inchado));
    t.igual("  sem nada cortado nem enviado", pedidos.length, antes);
    t.ok("  e o envio recusado não conta no freio", enviar(D, ok()).ok);

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · respostas do Discord");
    reiniciar();
    const eva = novaConta("fb_eva");
    const E = comoFn(eva);
    const caso = (nome, resposta, esperado, conferir) => {
      responder = () => resposta;
      passar(31);
      const resp = enviar(E, ok());
      const bateu = esperado === "ok" ? resp.ok === true : resp.ok === false && resp.erro === esperado;
      t.ok(nome, bateu && (!conferir || conferir(resp)), JSON.stringify(resp));
      const texto = JSON.stringify(resp);
      if (texto.includes("discord.com") || texto.includes(SEGREDO)) t.ok("  (a resposta vazou o endereço)", false);
    };
    caso("200 com a mensagem criada: ok", { status: 200, corpo: '{"id":"1234"}' }, "ok");
    caso("204 sem corpo: ok", { status: 204, corpo: "" }, "ok");
    caso("200 sem id: não confirma", { status: 200, corpo: '{"x":1}' }, "feedback_falhou");
    caso("200 com corpo que não é JSON: não confirma", { status: 200, corpo: "<html>" }, "feedback_falhou");
    caso("429: limite do Discord, com espera", { status: 429, corpo: '{"retry_after": 2.4}' }, "feedback_ocupado", (r) => r.segundos === 3);
    caso("429 sem corpo, com Retry-After", { status: 429, corpo: "", cabecalhos: { "Retry-After": "7" } }, "feedback_ocupado", (r) => r.segundos === 7);
    caso("500: falhou, pode tentar de novo", { status: 500, corpo: "{}" }, "feedback_falhou");
    caso("400: falhou", { status: 400, corpo: '{"message":"Invalid Form Body"}' }, "feedback_falhou");
    caso("404 (webhook apagado): indisponível", { status: 404, corpo: '{"message":"Unknown Webhook"}' }, "feedback_indisponivel");
    caso("401: indisponível", { status: 401, corpo: "{}" }, "feedback_indisponivel");
    logs.length = 0;
    caso("falha de rede: falhou", { lancar: "Address unavailable: " + WEBHOOK }, "feedback_falhou");
    t.ok("  o log da falha não traz o endereço nem o token", logs.length > 0 && !logs.join("\n").includes(SEGREDO) && !logs.join("\n").includes("webhooks/"), logs.join(" | "));
    caso("sem autorização de UrlFetchApp: indisponível", { lancar: "You do not have permission to call UrlFetchApp.fetch. Required permissions: https://www.googleapis.com/auth/script.external_request" }, "feedback_indisponivel");
    t.ok("nenhuma linha de log traz o texto enviado", !logs.join("\n").includes("Seria bom agrupar"));

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · freio contra spam (no servidor)");
    reiniciar();
    const fabio = novaConta("fb_fabio"), gil = novaConta("fb_gil");
    const F = comoFn(fabio), G = comoFn(gil);
    t.ok("primeiro envio passa", enviar(F, ok()).ok);
    const cedo = enviar(F, ok());
    t.ok("segundo logo em seguida espera o intervalo", cedo.erro === "feedback_limite" && cedo.segundos > 0 && cedo.segundos <= 30, JSON.stringify(cedo));
    t.ok("  outra conta não é afetada", enviar(G, ok()).ok);
    passar(31);
    t.ok("passado o intervalo, passa", enviar(F, ok()).ok);

    /* Falha não conta: tentar de novo não espera. */
    passar(31);
    responder = () => ({ status: 500, corpo: "{}" });
    t.recusa("Discord falha", enviar(F, ok()), "feedback_falhou");
    responder = () => ({ status: 200, corpo: '{"id":"9"}' });
    t.ok("  tentar de novo na hora passa (a falha foi devolvida)", enviar(F, ok()).ok);

    /* 8 por hora por conta. */
    reiniciar();
    const H = comoFn(novaConta("fb_hana"));
    let passaram = 0;
    for (let i = 0; i < 8; i++) { passar(31); if (enviar(H, ok()).ok) passaram++; }
    t.igual("8 envios espaçados numa hora passam", passaram, 8);
    passar(31);
    const nono = enviar(H, ok());
    t.ok("o 9º na mesma hora espera, em minutos", nono.erro === "feedback_limite" && nono.segundos > 60, JSON.stringify(nono));
    passar(60 * 60);
    t.ok("  na hora seguinte volta a passar", enviar(H, ok()).ok);

    /* Limite do canal, somando contas. */
    reiniciar();
    const geralAntes = globalThis.FEEDBACK_LIMITE_GERAL;
    globalThis.FEEDBACK_LIMITE_GERAL = 3;
    const contas = ["fb_g1", "fb_g2", "fb_g3", "fb_g4"].map((u) => comoFn(novaConta(u)));
    const res = contas.map((X) => enviar(X, ok()));
    t.ok("o limite do canal vale para todas as contas juntas", res.slice(0, 3).every((x) => x.ok) && res[3].erro === "feedback_limite" && res[3].geral === true, JSON.stringify(res[3]));
    globalThis.FEEDBACK_LIMITE_GERAL = geralAntes;

    /* Pedido simultâneo da mesma conta (chamando a API direto). */
    reiniciar();
    const ivo = novaConta("fb_ivo");
    const I = comoFn(ivo);
    let simultaneo = null;
    durante = () => { simultaneo = enviar(I, ok({ assunto: "Segundo pedido ao mesmo tempo" })); };
    t.ok("o primeiro pedido entrega", enviar(I, ok()).ok);
    t.ok("  o simultâneo da mesma conta é recusado: em andamento", simultaneo && simultaneo.erro === "feedback_em_andamento", JSON.stringify(simultaneo));
    t.igual("  e só uma mensagem chegou ao Discord", pedidos.length, 1);

    /* Trava ocupada: não arrisca contar errado — não envia. */
    passar(31);
    ambiente.trava.negar = true;
    const travado = enviar(I, ok());
    ambiente.trava.negar = false;
    t.ok("sem a trava para contar: ocupado, sem enviar", travado.erro === "ocupado" && pedidos.length === 1, JSON.stringify(travado));
    t.ok("  a trava não fica presa", ambiente.trava.presa === false);

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · repetição do mesmo envio (id de operação)");
    reiniciar();
    const J = comoFn(novaConta("fb_juca"));
    t.ok("envio com id de operação", enviar(J, ok(), { operacaoId: "op-11111111-2222-3333-4444-555555555555" }).ok);
    const repetido = enviar(J, ok(), { operacaoId: "op-11111111-2222-3333-4444-555555555555" });
    t.ok("o mesmo id de novo: sucesso, sem repostar e sem esbarrar no intervalo", repetido.ok && pedidos.length === 1);
    t.ok("outro id logo em seguida esbarra no intervalo", enviar(J, ok(), { operacaoId: "op-99999999-2222-3333-4444-555555555555" }).erro === "feedback_limite");
    passar(31);
    t.ok("id fora do formato é ignorado (envio normal)", enviar(J, ok(), { operacaoId: "<script>" }).ok && pedidos.length === 2);
    const K = comoFn(novaConta("fb_kim"));
    t.ok("o id é por conta: outra conta com o mesmo id envia", enviar(K, ok(), { operacaoId: "op-11111111-2222-3333-4444-555555555555" }).ok && pedidos.length === 3);

    /* ---------------------------------------------------------------- */
    t.grupo("Feedback · a planilha fica como estava");
    reiniciar();
    const L = comoFn(novaConta("fb_lia"));
    const retrato = () => ambiente.planilha.folhas.map((f) => f.nome + ":" + f.getLastRow()).join("|");
    const antesPlanilha = retrato();
    enviar(L, ok());
    passar(31);
    responder = () => ({ status: 500, corpo: "{}" });
    enviar(L, ok());
    t.igual("enviar (e falhar) não cria aba nem linha", retrato(), antesPlanilha);
  } finally {
    Date.now = relogio;
    console.error = errOriginal;
    delete globalThis.UrlFetchApp;
  }
}
