/* =====================================================================
   R.A.M.A. — testes do backend: preferência de tema (v2.25)
   Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export function testarTemaBackend({ t, preparar, novaConta, comoFn, chamar }) {
  t.grupo("Tema · preferência da conta");
  preparar();
  const ana = novaConta("tema_ana"), beto = novaConta("tema_beto");
  const A = comoFn(ana), B = comoFn(beto);

  const login = chamar(globalThis, { acao: "login", usuario: "tema_ana", senha: "senha-de-teste" });
  t.igual("conta sem preferência: o login traz 'sistema'", login.agente.preferencias.tema, "sistema");
  t.igual("  e a sessão também", A({ acao: "sessao" }).agente.preferencias.tema, "sistema");

  const salvo = A({ acao: "salvar_perfil", dados: { preferencias: { tema: "escuro" } } });
  t.ok("salvar 'escuro' responde com o que ficou gravado", salvo.ok && salvo.preferencias.tema === "escuro");
  t.igual("  a sessão seguinte traz o tema (outro aparelho)", A({ acao: "sessao" }).agente.preferencias.tema, "escuro");
  t.igual("  o ler_perfil também", A({ acao: "ler_perfil" }).dados.preferencias.tema, "escuro");
  t.igual("a outra conta não é afetada", B({ acao: "sessao" }).agente.preferencias.tema, "sistema");

  A({ acao: "salvar_perfil", dados: { preferencias: { tema: "sistema" } } });
  t.igual("'sistema' é salvo como 'sistema', não como o tema efetivo",
    A({ acao: "ler_perfil" }).dados.preferencias.tema, "sistema");

  /* Outras preferências que já estejam na linha ficam. */
  const linha = acharPor(ABAS.PERFIS, "userId", ana.id);
  linha.preferenciasJson = JSON.stringify({ tema: "claro", outraCoisa: { a: 1 } });
  atualizarLinha(ABAS.PERFIS, linha._linha, linha);
  const avatarAntes = acharPor(ABAS.PERFIS, "userId", ana.id).avatar;
  A({ acao: "salvar_perfil", dados: { preferencias: { tema: "escuro" } } });
  const depois = JSON.parse(acharPor(ABAS.PERFIS, "userId", ana.id).preferenciasJson);
  t.iguais("salvar o tema não apaga as outras preferências", depois, { tema: "escuro", outraCoisa: { a: 1 } });
  A({ acao: "salvar_perfil", dados: { nome: "Ana Renomeada" } });
  t.iguais("  salvar só o nome não mexe nas preferências",
    JSON.parse(acharPor(ABAS.PERFIS, "userId", ana.id).preferenciasJson), { tema: "escuro", outraCoisa: { a: 1 } });
  t.igual("  nem no avatar", acharPor(ABAS.PERFIS, "userId", ana.id).avatar, avatarAntes);

  t.recusa("tema fora da lista é recusado", A({ acao: "salvar_perfil", dados: { preferencias: { tema: "roxo" } } }), "dados_invalidos");
  t.recusa("chave desconhecida é recusada", A({ acao: "salvar_perfil", dados: { preferencias: { admin: true } } }), "dados_invalidos");
  t.recusa("preferências que não são objeto são recusadas", A({ acao: "salvar_perfil", dados: { preferencias: "escuro" } }), "dados_invalidos");
  t.recusa("objeto vazio é recusado", A({ acao: "salvar_perfil", dados: { preferencias: {} } }), "dados_invalidos");
  t.igual("  e nada mudou", JSON.parse(acharPor(ABAS.PERFIS, "userId", ana.id).preferenciasJson).tema, "escuro");

  /* A conta é a da sessão: o corpo não escolhe de quem é o perfil. */
  B({ acao: "salvar_perfil", userId: ana.id, dados: { userId: ana.id, preferencias: { tema: "claro" } } });
  t.igual("um pedido com o id de outra conta grava na própria", B({ acao: "sessao" }).agente.preferencias.tema, "claro");
  t.igual("  e a outra conta fica como estava", A({ acao: "sessao" }).agente.preferencias.tema, "escuro");
  t.recusa("sem sessão não salva", chamar(globalThis, { acao: "salvar_perfil", dados: { preferencias: { tema: "claro" } } }), "sem_token");

  A({ acao: "salvar_perfil", dados: { preferencias: { tema: null } } });
  t.igual("null apaga a chave e a sessão volta a 'sistema'", A({ acao: "sessao" }).agente.preferencias.tema, "sistema");
  t.iguais("  sem tocar no resto", JSON.parse(acharPor(ABAS.PERFIS, "userId", ana.id).preferenciasJson), { outraCoisa: { a: 1 } });

  /* JSON estragado na célula não derruba a sessão. */
  const l2 = acharPor(ABAS.PERFIS, "userId", ana.id);
  l2.preferenciasJson = "{quebrado";
  atualizarLinha(ABAS.PERFIS, l2._linha, l2);
  t.igual("preferência ilegível vale 'sistema'", A({ acao: "sessao" }).agente.preferencias.tema, "sistema");

  const s = A({ acao: "sessao" }).agente;
  t.ok("a sessão não devolve hash, sal nem token", s.hashSenha === undefined && s.salt === undefined && s.token === undefined);
}
