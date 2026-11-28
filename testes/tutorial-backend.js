/* =====================================================================
   R.A.M.A. — conclusão do tutorial inicial no servidor
   (concluir_tutorial, sessão e convivência com salvar_perfil)
   ---------------------------------------------------------------------
   Exercitado pelo mesmo simulador e doPost dos demais testes do backend
   (testes/executar-backend.js).
   ===================================================================== */

export function testarTutorialBackend({ t, preparar, novaConta, comoFn, chamar }) {
  t.grupo("Tutorial inicial · conclusão por conta");
  preparar();
  const ana = novaConta("tut_ana"), bia = novaConta("tut_bia");
  const A = comoFn(ana), B = comoFn(bia);

  const s0 = A({ acao: "sessao" });
  t.ok("a sessão traz o campo do tutorial (o servidor sabe gravar)", s0.ok && s0.agente.tutorial && typeof s0.agente.tutorial === "object");
  t.iguais("conta nova: tutorial pendente", s0.agente.tutorial.inicial, "");

  /* Conta antiga: perfil sem a chave (ou sem linha de perfil). */
  const perfil = acharPor(ABAS.PERFIS, "userId", bia.id);
  if (perfil) { perfil.preferenciasJson = JSON.stringify({ tema: "escuro" }); atualizarLinha(ABAS.PERFIS, perfil._linha, perfil); }
  t.iguais("conta antiga sem o campo: pendente", B({ acao: "sessao" }).agente.tutorial.inicial, "");

  const c1 = A({ acao: "concluir_tutorial" });
  t.ok("concluir grava", c1.ok && /^\d{4}-\d{2}-\d{2}T/.test(c1.tutorial.inicial));
  t.iguais("a sessão seguinte (outro aparelho) vê a conclusão", A({ acao: "sessao" }).agente.tutorial.inicial, c1.tutorial.inicial);
  const login = chamar(globalThis, { acao: "login", usuario: "tut_ana", senha: "senha-de-teste" });
  t.iguais("o login também traz a conclusão", login.agente.tutorial.inicial, c1.tutorial.inicial);

  const c2 = A({ acao: "concluir_tutorial" });
  t.ok("repetir é idempotente: mesma data, sem regravar", c2.ok && c2.repetida && c2.tutorial.inicial === c1.tutorial.inicial);

  t.recusa("salvar_perfil não aceita a chave reservada", A({ acao: "salvar_perfil", dados: { preferencias: { tutorial: null } } }), "dados_invalidos");
  t.recusa("nem forjar uma data", A({ acao: "salvar_perfil", dados: { preferencias: { tutorial: { inicial: "2020-01-01T00:00:00Z" } } } }), "dados_invalidos");

  /* Uma aba antiga salva o tema depois da conclusão. */
  const p = A({ acao: "salvar_perfil", dados: { preferencias: { tema: "claro", estiloInterface: "modern20" } } });
  t.ok("salvar preferências depois da conclusão funciona", p.ok);
  const depois = A({ acao: "sessao" }).agente;
  t.iguais("e não desfaz a conclusão", depois.tutorial.inicial, c1.tutorial.inicial);
  t.iguais("as outras preferências ficam como gravadas", [depois.preferencias.tema, depois.preferencias.estiloInterface], ["claro", "modern20"]);

  /* Duas abas concluem em sequência; a segunda depois de uma
     preferência. */
  const b1 = B({ acao: "concluir_tutorial" });
  B({ acao: "salvar_perfil", dados: { preferencias: { exibicaoPastas: "icones" } } });
  const b2 = B({ acao: "concluir_tutorial" });
  const sb = B({ acao: "sessao" }).agente;
  t.ok("duas abas: uma conclusão durável, a mesma data", b1.ok && b2.ok && b2.tutorial.inicial === b1.tutorial.inicial && sb.tutorial.inicial === b1.tutorial.inicial);
  t.iguais("preferências anteriores preservadas (tema da conta antiga e a nova)", [sb.preferencias.tema, sb.preferencias.exibicaoPastas], ["escuro", "icones"]);
  const ler = B({ acao: "ler_perfil" });
  t.ok("ler_perfil mostra a chave guardada (só leitura)", ler.ok && ler.dados.preferencias.tutorial && ler.dados.preferencias.tutorial.inicial === b1.tutorial.inicial);

  t.iguais("concluir é da conta da sessão: a outra não muda", A({ acao: "sessao" }).agente.tutorial.inicial, c1.tutorial.inicial);
  t.recusa("sem sessão, recusado", chamar(globalThis, { acao: "concluir_tutorial" }));
}
