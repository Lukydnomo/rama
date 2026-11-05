/* =====================================================================
   R.A.M.A. — testes do backend: pedido de acesso pelo portão (v6.6)
   Dados e credenciais FICTÍCIOS. O UrlFetchApp é simulado: nada sai
   para a rede, e o webhook só tem o formato de um. Confere: rota
   pública separada (feedback continua protegido), regras de
   criarUsuario, senha intacta no Discord e fora do log e da planilha,
   menções desligadas, freio, operação repetida, falhas, e que ninguém
   entra antes do cadastro manual.
   Chamado por executar-backend.js.
   ===================================================================== */

const WEBHOOK = "https://discord.com/api/webhooks/123456789012345678/token-de-teste-que-nao-existe_000";

export async function testarAcessoBackend({ t, preparar, chamar, ambiente }) {
  const pedidos = [];
  let responder = () => ({ status: 200, corpo: JSON.stringify({ id: "1" }) });
  globalThis.UrlFetchApp = {
    fetch(url, opcoes) {
      pedidos.push({ url, corpo: JSON.parse(opcoes.payload) });
      const r = responder();
      if (r.lancar) throw new Error(r.lancar);
      return { getResponseCode: () => r.status, getContentText: () => r.corpo || "", getHeaders: () => ({}) };
    },
  };
  const relogio = Date.now;
  let adiante = 0;
  Date.now = () => relogio() + adiante;
  const passar = (s) => { adiante += s * 1000; };
  const logs = [];
  const errOriginal = console.error, logOriginal = console.log;
  console.error = (...a) => logs.push(a.join(" "));
  console.log = (...a) => logs.push(a.join(" "));

  const SENHA = "Pr0v!s0ria #9 `x` @everyone";
  const SENHA_SIMPLES = "Ex3mpl0-provisorio";
  const pedir = (dados, extra) => chamar(globalThis, Object.assign({ acao: "solicitar_acesso", dados }, extra || {}));
  const ok = (extra) => Object.assign({ nome: "Agente Teste", usuario: "agente.teste", senha: SENHA_SIMPLES }, extra || {});
  const campo = (embed, nome) => (embed.fields.filter((f) => f.name === nome)[0] || {}).value;

  try {
    t.grupo("Acesso · rota pública, separada do feedback");
    preparar();
    ambiente.propriedades.set("RAMA_FEEDBACK_WEBHOOK", WEBHOOK);
    globalThis.CACHE_ROTAS = null;
    t.recusa("o feedback continua exigindo sessão", chamar(globalThis, { acao: "enviar_feedback", dados: {} }), "sem_token");
    const r1 = pedir(ok(), { operacaoId: "op-aaaaaaaa-1111-2222-3333-444444444444" });
    t.ok("sem sessão, o pedido é aceito quando o Discord confirma", r1.ok === true && pedidos.length === 1);
    const m = pedidos[0].corpo;
    t.igual("título: Solicitação de acesso — RAMA", m.embeds[0].title, "Solicitação de acesso — RAMA");
    t.igual("menções desligadas", JSON.stringify(m.allowed_mentions), JSON.stringify({ parse: [] }));
    t.ok("nome e usuário na mensagem", campo(m.embeds[0], "Nome de exibição") === "Agente Teste" && campo(m.embeds[0], "Usuário") === "`agente.teste`");
    t.igual("senha intacta, num bloco de código copiável", campo(m.embeds[0], "Senha provisória"), "```\n" + SENHA_SIMPLES + "\n```");
    t.ok("o pedido usa ?wait=true (só confirma com a mensagem criada)", /\?wait=true$/.test(pedidos[0].url));

    t.grupo("Acesso · clique duplo e operação repetida");
    const r2 = pedir(ok(), { operacaoId: "op-aaaaaaaa-1111-2222-3333-444444444444" });
    t.ok("o mesmo operacaoId devolve sucesso sem repostar", r2.ok && r2.repetido && pedidos.length === 1);
    t.recusa("outro envio do mesmo usuário logo em seguida é freado", pedir(ok()), "acesso_limite");

    t.grupo("Acesso · regras de criarUsuario");
    passar(120);
    t.recusa("usuário inválido", pedir(ok({ usuario: "A!" })), "acesso_invalido");
    t.recusa("senha com menos de 8", pedir(ok({ usuario: "outro.um", senha: "curta1" })), "acesso_invalido");
    t.recusa("senha com espaço na ponta (não chegaria intacta)", pedir(ok({ usuario: "outro.um", senha: " " + SENHA_SIMPLES })), "acesso_invalido");
    t.recusa("nome vazio", pedir(ok({ usuario: "outro.um", nome: "   " })), "acesso_invalido");
    globalThis.criarUsuario("ja.existe", "Já Existe", "senha-ficticia-123");
    t.recusa("usuário que já existe", pedir(ok({ usuario: "ja.existe" })), "acesso_invalido");
    t.igual("  nenhum desses saiu para a rede", pedidos.length, 1);
    passar(10);
    const r3 = pedir(ok({ usuario: "  Outro.Dois ", senha: SENHA }));
    const e3 = pedidos[pedidos.length - 1].corpo.embeds[0];
    t.ok("usuário normalizado como criarUsuario faz (minúsculas, sem espaços)", r3.ok && campo(e3, "Usuário") === "`outro.dois`");
    const escapada = campo(e3, "Senha provisória");
    t.igual("senha com acento grave: escapada, e sem as barras é a mesma", escapada.replace(/\\(.)/g, "$1"), SENHA);
    t.ok("  @everyone não vira menção (allowed_mentions vazio)", pedidos[pedidos.length - 1].corpo.allowed_mentions.parse.length === 0);

    t.grupo("Acesso · falhas e o que não fica guardado");
    passar(120);
    responder = () => ({ status: 500, corpo: "{}" });
    const f1 = pedir(ok({ usuario: "falha.um" }));
    t.recusa("Discord com erro: acesso_falhou", f1, "acesso_falhou");
    responder = () => ({ status: 200, corpo: JSON.stringify({ id: "9" }) });
    t.ok("  e dá para tentar de novo na hora (falha não conta no freio)", pedir(ok({ usuario: "falha.um" })).ok);
    passar(120);
    responder = () => ({ status: 404, corpo: "{}" });
    t.recusa("webhook apagado: acesso_indisponivel", pedir(ok({ usuario: "falha.dois" })), "acesso_indisponivel");
    responder = () => ({ lancar: "Address unavailable: " + WEBHOOK });
    passar(10);
    t.recusa("rede caiu: acesso_falhou", pedir(ok({ usuario: "falha.tres" })), "acesso_falhou");
    responder = () => ({ status: 200, corpo: JSON.stringify({ id: "1" }) });
    ambiente.propriedades.delete("RAMA_FEEDBACK_WEBHOOK");
    passar(10);
    t.recusa("sem webhook configurado: indisponível", pedir(ok({ usuario: "falha.quatro" })), "acesso_indisponivel");
    ambiente.propriedades.set("RAMA_FEEDBACK_WEBHOOK", WEBHOOK);
    const todosLogs = logs.join("\n");
    t.ok("nenhuma senha no log", !todosLogs.includes(SENHA) && !todosLogs.includes(SENHA_SIMPLES));
    t.ok("o endereço do webhook não vai ao log", !todosLogs.includes("token-de-teste-que-nao-existe_000"));
    const planilha = JSON.stringify(ambiente.planilha.folhas.map((f) => f.linhas || []));
    t.ok("nenhuma senha na planilha", !planilha.includes(SENHA) && !planilha.includes(SENHA_SIMPLES));

    t.grupo("Acesso · ninguém entra antes do cadastro manual");
    t.recusa("login com os dados do pedido é recusado", chamar(globalThis, { acao: "login", usuario: "agente.teste", senha: SENHA_SIMPLES }), "credenciais");
    t.recusa("  nem com o outro pedido", chamar(globalThis, { acao: "login", usuario: "outro.dois", senha: SENHA }), "credenciais");
    globalThis.criarUsuario("agente.teste", "Agente Teste", SENHA_SIMPLES);
    t.ok("depois de criarUsuario com os mesmos dados, entra", chamar(globalThis, { acao: "login", usuario: "agente.teste", senha: SENHA_SIMPLES }).ok === true);

    t.grupo("Acesso · freio do canal");
    preparar();
    pedidos.length = 0;
    let negados = 0;
    for (let i = 0; i < 25; i++) { passar(6); const r = pedir(ok({ usuario: "lote.u" + i })); if (!r.ok) negados++; }
    t.ok("até 20 por hora no canal; o resto é freado", pedidos.length === 20 && negados === 5);
  } finally {
    Date.now = relogio;
    console.error = errOriginal;
    console.log = logOriginal;
    delete globalThis.UrlFetchApp;
  }
}
