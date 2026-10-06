/* =====================================================================
   R.A.M.A. — testes do backend: temas de dados e códigos (v2.40)
   ---------------------------------------------------------------------
   De ponta a ponta, pelo doPost, com dados sintéticos: a cópia do
   catálogo dentro do Codigo.gs, o cadastro de códigos pelo "editor",
   resgate válido, inválido, repetido e desativado, a mesma operação
   chegando de novo, dois códigos com o mesmo tema, o freio, a coleção
   entre aparelhos, a escolha na ficha (dono, mestre, importação para
   outra conta, cliente antigo) e a aparência das rolagens (validação,
   desbloqueio do dono, campos estranhos, leitura pelos outros).
   Chamado por executar-backend.js.
   ===================================================================== */

import { chamar } from "./apps-script-simulado.js";

export async function testarDadosBackend({ t, preparar, novaConta, comoFn }) {
  t.grupo("Temas de dados · o catálogo do servidor é o mesmo do site");
  const js = (await Deno.readTextFile(new URL("../js/temas-dados.js", import.meta.url))).replace(/\r\n/g, "\n");
  const gs = (await Deno.readTextFile(new URL("../backend/Codigo.gs", import.meta.url))).replace(/\r\n/g, "\n");
  const ini = gs.indexOf("/* >>> js/temas-dados.js */\n") + "/* >>> js/temas-dados.js */\n".length;
  const fim = gs.indexOf("/* <<< js/temas-dados.js */");
  t.ok("a cópia em Codigo.gs é idêntica (byte a byte)", ini > 40 && fim > ini && gs.slice(ini, fim) === js);
  t.ok("nenhum código de resgate no catálogo público", !/codigo"?\s*:\s*"[A-Z0-9]{4,}/i.test(js) && js.indexOf("cadastrarCodigo(") < 0);

  preparar();
  const ana = novaConta("dd_ana"), beto = novaConta("dd_beto"), mestra = novaConta("dd_mestra");
  const A = comoFn(ana), B = comoFn(beto), M = comoFn(mestra);
  let n = 0;
  const op = () => "op-dados-" + (++n) + "-aaaaaaaa";

  t.grupo("Temas de dados · cadastro pelo editor do Apps Script");
  t.ok("cadastrarCodigo aceita um tema do catálogo", /cadastrado/.test(globalThis.cadastrarCodigo("Neon-2026", ["sigilo-violeta"], "teste")));
  t.ok("  e recusa um tema que não existe", (() => { try { globalThis.cadastrarCodigo("OUTRO123", ["nao-existe"]); return false; } catch (e) { return /fora do catálogo/.test(e.message); } })());
  globalThis.cadastrarCodigo("MODELO01", ["modelo-tecnico"]);
  globalThis.cadastrarCodigo("DOBRADO1", ["sigilo-violeta", "modelo-tecnico"]);
  globalThis.cadastrarCodigo("VELHO001", ["modelo-tecnico"]);
  const planilha = JSON.stringify(globalThis.lerTudo(globalThis.ABAS.CODIGOS_RESGATE));
  t.ok("a planilha guarda o hash e um rótulo, nunca o código", planilha.indexOf("NEON2026") < 0 && planilha.indexOf("Neon-2026") < 0 && /NE…26 \(8\)/.test(planilha));

  t.grupo("Temas de dados · resgate");
  t.igual("código errado", A({ acao: "resgatar_codigo", codigo: "NADA9999", operacaoId: op() }).erro, "codigo_invalido");
  t.igual("código fora do formato", A({ acao: "resgatar_codigo", codigo: "!!", operacaoId: op() }).erro, "codigo_invalido");
  t.igual("pedido sem operação", A({ acao: "resgatar_codigo", codigo: "NEON2026" }).erro, "dados_invalidos");
  const opNeon = op();
  const r1 = A({ acao: "resgatar_codigo", codigo: "  neon 2026 ", operacaoId: opNeon });
  t.ok("espaços, hífens e minúsculas não importam: resgatado", r1.ok && r1.dados.recompensas[0].id === "sigilo-violeta" && r1.dados.recompensas[0].novo === true);
  const repetida = A({ acao: "resgatar_codigo", codigo: "NEON-2026", operacaoId: opNeon });
  t.ok("a MESMA operação de novo (resposta perdida) devolve a concessão, sem conceder outra vez", repetida.ok && repetida.repetida && repetida.dados.recompensas[0].id === "sigilo-violeta");
  const outraVez = A({ acao: "resgatar_codigo", codigo: "NEON2026", operacaoId: op() });
  t.ok("o mesmo código numa operação nova: já resgatado, dizendo o que já tem", outraVez.erro === "ja_resgatado" && outraVez.dados.recompensas[0].nome === "Sigilo Violeta");
  const dobrado = A({ acao: "resgatar_codigo", codigo: "DOBRADO1", operacaoId: op() });
  t.ok("dois códigos com o mesmo tema não duplicam a coleção", dobrado.ok &&
    dobrado.dados.recompensas.filter((x) => x.novo).map((x) => x.id).join() === "modelo-tecnico" &&
    globalThis.lerTudo(globalThis.ABAS.DESBLOQUEIOS).filter((d) => d.userId === ana.id).length === 2);
  t.ok("o mesmo código vale para outra conta", B({ acao: "resgatar_codigo", codigo: "neon2026", operacaoId: op() }).ok);

  globalThis.desativarCodigo("velho-001");
  t.igual("código desativado não aceita resgate novo", B({ acao: "resgatar_codigo", codigo: "VELHO001", operacaoId: op() }).erro, "codigo_desativado");
  globalThis.desativarCodigo("NEON2026");
  t.ok("desativar não tira o que já foi concedido", A({ acao: "listar_desbloqueios" }).dados.temasDados.some((d) => d.id === "sigilo-violeta"));
  globalThis.reativarCodigo("NEON2026");

  t.grupo("Temas de dados · coleção, permissão e freio");
  const lidaDeOutroAparelho = comoFn(Object.assign({}, ana, { token: novaSessao(ana) }));
  t.igual("a coleção vem do servidor em qualquer aparelho", lidaDeOutroAparelho({ acao: "listar_desbloqueios" }).dados.temasDados.map((d) => d.id).sort().join(), "modelo-tecnico,sigilo-violeta");
  const forjado = M({ acao: "salvar_perfil", dados: { preferencias: { desbloqueios: ["sigilo-violeta"], temasDados: ["sigilo-violeta"] } } });
  t.ok("salvar preferências não concede nada (campos estranhos recusados ou ignorados)", M({ acao: "listar_desbloqueios" }).dados.temasDados.length === 0 && (forjado.ok || forjado.erro === "dados_invalidos"));
  for (let i = 0; i < 10; i++) M({ acao: "resgatar_codigo", codigo: "ERRADO" + i + "XX", operacaoId: op() });
  t.igual("dez códigos errados: o freio segura até a janela passar", M({ acao: "resgatar_codigo", codigo: "NEON2026", operacaoId: op() }).erro, "muitas_tentativas");
  t.ok("o freio é por conta: a outra segue normal", A({ acao: "resgatar_codigo", codigo: "NADA0000", operacaoId: op() }).erro === "codigo_invalido");

  t.grupo("Temas de dados · a escolha na ficha");
  const mesa = M({ acao: "criar_campanha", dados: { nome: "Dados" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });
  const ficha = (nome, dados) => ({ nome, tipoFicha: "universal", schemaVersion: 18, atributos: [], status: [], campanhaId: mesa,
    aparencia: Object.assign({ v: 1, modo: "conta" }, dados ? { dados } : {}) });
  const criada = A({ acao: "criar_personagem", dados: ficha("Lia", { id: "sigilo-violeta" }) });
  const lia = criada.dados.id;
  const ler = (como, id) => como({ acao: "ler_personagem", personagemId: id }).dados;
  t.ok("a dona com o tema: a escolha fica", !criada.avisos && ler(A, lia).aparencia.dados.id === "sigilo-violeta");
  A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: lia });
  const semTema = M({ acao: "criar_personagem", dados: ficha("Importada", { id: "sigilo-violeta" }) });
  t.ok("importar para uma conta sem o tema: dado padrão, com aviso", semTema.avisos && semTema.avisos[0] === "tema_dados_indisponivel" && !ler(M, semTema.dados.id).aparencia.dados);
  const doMestre = ler(M, lia);
  const salvoPeloMestre = M({ acao: "salvar_personagem", personagemId: lia, rev: 2, dados: Object.assign({}, doMestre, { nome: "Lia (editada)", schemaVersion: 18 }) });
  t.ok("o mestre (sem o tema) edita outro campo: a escolha da dona fica", salvoPeloMestre.ok && ler(A, lia).aparencia.dados.id === "sigilo-violeta");
  const atual = ler(A, lia);
  const antigo = Object.assign({}, atual, { schemaVersion: 17, aparencia: { v: 1, modo: "escuro" } });
  const salvoAntigo = A({ acao: "salvar_personagem", personagemId: lia, rev: Number(salvoPeloMestre.rev), dados: antigo });
  t.ok("uma aba antiga (schema 17) sem o campo não apaga a escolha, e as cores dela valem", salvoAntigo.ok &&
    ler(A, lia).aparencia.dados.id === "sigilo-violeta" && ler(A, lia).aparencia.modo === "escuro");
  const trocaCores = A({ acao: "salvar_personagem", personagemId: lia, rev: Number(salvoAntigo.rev), dados: Object.assign({}, ler(A, lia), { aparencia: { v: 1, modo: "claro", dados: { id: "sigilo-violeta" } } }) });
  t.ok("trocar só as cores mantém o tema dos dados", trocaCores.ok && ler(A, lia).aparencia.modo === "claro" && ler(A, lia).aparencia.dados.id === "sigilo-violeta");
  const proibido = B({ acao: "criar_personagem", dados: ficha("Do Beto", { id: "modelo-tecnico" }) });
  t.ok("equipar um tema que a conta não tem é recusado no servidor", (proibido.avisos || [])[0] === "tema_dados_indisponivel");
  const dup = A({ acao: "duplicar_personagem", personagemId: lia, operacaoId: op() });
  t.ok("duplicar na mesma conta leva a escolha junto", dup.ok && ler(A, dup.dados.id).aparencia.dados.id === "sigilo-violeta");

  t.grupo("Temas de dados · a aparência das rolagens");
  const corPadrao = { superficie: "#18181b", texto: "#ffffff", texto2: "#dedede" };
  const rolar = (como, id, aparencia, personagemId) => como({ acao: "registrar_rolagem", campanhaId: mesa, rolagemId: id, personagemId: personagemId || "",
    tipo: "pericia", nome: "Teste", dados: { expressao: "1d20", rolagens: [12], natural: 12, total: 12, parcelas: [], aparencia } });
  t.ok("rolagem com o tema do personagem: registrada", rolar(A, "rol-dados-aaaaaaaa1", { v: 1, tema: { id: "sigilo-violeta", versao: 1 }, padrao: corPadrao }, lia).ok);
  rolar(B, "rol-dados-aaaaaaaa2", { v: 1, tema: { id: "modelo-tecnico", versao: 1 }, padrao: corPadrao });
  rolar(B, "rol-dados-aaaaaaaa3", { v: 1, tema: { id: "sigilo-violeta", versao: 99 }, padrao: { superficie: "url(http://x)", texto: "#fff", fundo: "#000" }, css: "x", url: "http://mal" });
  rolar(B, "rol-dados-aaaaaaaa4", "não é objeto");
  rolar(M, "rol-dados-aaaaaaaa5", { v: 1, tema: { id: "sigilo-violeta", versao: 1 } }, lia);
  const lista = B({ acao: "listar_rolagens", campanhaId: mesa, limite: 10 }).dados.rolagens;
  const de = (id) => lista.find((l) => l.id === id).resultado.aparencia;
  t.ok("os outros recebem o tema de quem rolou (id e versão, sem caminho)", JSON.stringify(de("rol-dados-aaaaaaaa1")) === JSON.stringify({ v: 1, tema: { id: "sigilo-violeta", versao: 1 }, padrao: corPadrao }));
  t.ok("tema que a conta dona não tem sai; as cores do padrão ficam", !de("rol-dados-aaaaaaaa2").tema && de("rol-dados-aaaaaaaa2").padrao.texto === "#ffffff");
  t.igual("versão desconhecida, URL, CSS e chaves estranhas não passam", JSON.stringify(de("rol-dados-aaaaaaaa3")), JSON.stringify({ v: 1, padrao: { texto: "#ffffff" } }));
  t.ok("aparência inválida não recusa a rolagem, só sai", lista.some((l) => l.id === "rol-dados-aaaaaaaa4") && de("rol-dados-aaaaaaaa4") === undefined);
  t.ok("o mestre rolando na ficha da jogadora: vale o desbloqueio da DONA do personagem", de("rol-dados-aaaaaaaa5").tema.id === "sigilo-violeta");
  t.ok("ver o dado de outra pessoa não concede nada", B({ acao: "listar_desbloqueios" }).dados.temasDados.every((d) => d.id === "sigilo-violeta") &&
    M({ acao: "listar_desbloqueios" }).dados.temasDados.length === 0);
  const repete = rolar(A, "rol-dados-aaaaaaaa1", { v: 1, tema: { id: "modelo-tecnico", versao: 1 } }, lia);
  t.ok("a repetição do envio não cria linha nem troca a aparência gravada", repete.ok && repete.dados.repetida &&
    B({ acao: "listar_rolagens", campanhaId: mesa, limite: 10 }).dados.rolagens.find((l) => l.id === "rol-dados-aaaaaaaa1").resultado.aparencia.tema.id === "sigilo-violeta");
  t.ok("ler_campanha traz a hora do servidor (para não notificar o que é antigo)", typeof A({ acao: "ler_campanha", campanhaId: mesa }).dados.agora === "string");
}

/* Uma segunda sessão da mesma conta: "outro aparelho". */
function novaSessao(conta) {
  return chamar(globalThis, { acao: "login", usuario: conta.usuario, senha: "senha-de-teste" }).token;
}
