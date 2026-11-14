/* =====================================================================
   R.A.M.A. — testes do backend: Ramificação (planos de evolução, v9.5)
   ---------------------------------------------------------------------
   Só o DONO da ficha lê e grava os planos — conferido no servidor,
   mesmo com o pedido feito direto, sem a interface. Mestre da campanha,
   Editor e Leitor do compartilhamento recebem sem_permissao; quem nem
   alcança a ficha, nao_encontrado. Salvar plano não muda a revisão da
   ficha; rev velha dá conflito (com a lista atual); o mesmo opId
   responde `repetida` sem gravar de novo; limite de planos; excluir a
   ficha leva os planos. Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export function testarRamificacaoBackend({ t, preparar, novaConta, comoFn }) {
  preparar();
  const dona = novaConta("ram_dona"), mestre = novaConta("ram_mestre"), edi = novaConta("ram_edi"), lei = novaConta("ram_lei"), fora = novaConta("ram_fora");
  const D = comoFn(dona), M = comoFn(mestre), Ed = comoFn(edi), L = comoFn(lei), F = comoFn(fora);

  const pid = D({ acao: "criar_personagem", dados: { nome: "Ocultista sintética", tipoFicha: "ordem", ordem: { classe: "ocultista", nex: 35 }, atributos: [], status: [] } }).dados.id;
  const camp = M({ acao: "criar_campanha", dados: { sistema: "ordem", nome: "Mesa sintética" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: dona.id, papel: "jogador" }] });
  D({ acao: "vincular_personagem", campanhaId: camp, personagemId: pid });
  const comp = D({ acao: "listar_compartilhamentos", personagemId: pid });
  D({ acao: "salvar_compartilhamentos", personagemId: pid, versao: comp.dados.versao, acessos: [{ userId: edi.id, papel: "editor" }, { userId: lei.id, papel: "leitor" }] });

  const plano = (id, nome) => ({ id, nome, formato: 1, alvo: { nex: 50 }, base: { progresso: { tipo: "nex", nex: 35 }, assinatura: "abc123" }, regras: { tipo: "nex" },
    decisoes: { "d10.atributo": { tipo: "atributo", candidato: { valor: "int", opcoes: { pericia: "medicina" } }, rituais: [] } }, criadoEm: "", atualizadoEm: "" });
  const ler = (como) => como({ acao: "ler_planos_evolucao", personagemId: pid });
  const salvar = (como, rev, planos, opId) => como({ acao: "salvar_planos_evolucao", personagemId: pid, rev, opId, dados: { formato: 1, planos } });

  t.grupo("Ramificação · só o dono");
  const l0 = ler(D);
  t.ok("o dono lê a lista vazia, com rev 0 e o limite", l0.ok && l0.rev === 0 && l0.dados.planos.length === 0 && l0.dados.limite === 8);
  const revFicha = D({ acao: "ler_personagem", personagemId: pid }).rev;
  const s1 = salvar(D, 0, [plano("plano-mais-rituais", "Mais rituais"), plano("plano-mais-resistente", "Mais resistente")], "op-ram-0001");
  t.ok("o dono salva dois planos", s1.ok && s1.rev === 1 && s1.dados.planos.length === 2 && s1.dados.planos[0].decisoes["d10.atributo"].candidato.valor === "int");
  t.igual("salvar plano não muda a revisão da ficha", D({ acao: "ler_personagem", personagemId: pid }).rev, revFicha);
  t.ok("o Mestre lê a ficha (acesso de Mestre existe)", M({ acao: "ler_personagem", personagemId: pid }).ok);
  t.recusa("  mas não lê os planos", ler(M), "sem_permissao");
  t.recusa("  nem grava", salvar(M, 1, [plano("plano-do-mestre", "Do Mestre")], "op-ram-m001"), "sem_permissao");
  t.recusa("o Editor não lê", ler(Ed), "sem_permissao");
  t.recusa("  nem grava", salvar(Ed, 1, [], "op-ram-e001"), "sem_permissao");
  t.recusa("o Leitor não lê", ler(L), "sem_permissao");
  t.recusa("  nem grava", salvar(L, 1, [], "op-ram-l001"), "sem_permissao");
  t.recusa("quem não alcança a ficha nem sabe que existe", ler(F), "nao_encontrado");
  t.igual("nenhuma recusa gravou nada", ler(D).dados.planos.map((p) => p.nome).join(), "Mais rituais,Mais resistente");

  t.grupo("Ramificação · rev, reenvio e forma");
  const rep = salvar(D, 0, [plano("plano-mais-rituais", "Mais rituais"), plano("plano-mais-resistente", "Mais resistente")], "op-ram-0001");
  t.ok("o mesmo opId (resposta perdida) responde repetida, sem gravar de novo", rep.ok && rep.repetida === true && rep.rev === 1);
  const velho = salvar(D, 0, [plano("plano-outra-aba", "Outra aba")], "op-ram-0002");
  t.ok("uma aba com rev velha recebe conflito, com a lista atual", velho.ok === false && velho.erro === "conflito" && velho.dados.planos.length === 2);
  const s2 = salvar(D, 1, [plano("plano-mais-rituais", "Mais rituais (renomeado)")], "op-ram-0003");
  t.ok("renomear e excluir um plano é uma gravação com rev", s2.ok && s2.rev === 2 && s2.dados.planos.length === 1 && s2.dados.planos[0].nome === "Mais rituais (renomeado)");
  t.recusa("acima do limite de planos", salvar(D, 2, Array.from({ length: 9 }, (_, i) => plano("plano-" + i + "-x", "P" + i)), "op-ram-0004"), "limite");
  t.recusa("id de plano repetido", salvar(D, 2, [plano("plano-a-1", "A"), plano("plano-a-1", "B")], "op-ram-0005"), "dados_invalidos");
  t.recusa("sem opId", salvar(D, 2, [], ""), "dados_invalidos");
  t.recusa("planos que não são lista", D({ acao: "salvar_planos_evolucao", personagemId: pid, rev: 2, opId: "op-ram-0006", dados: { planos: "x" } }), "dados_invalidos");
  const grande = plano("plano-grande", "Grande");
  grande.decisoes["d8.ritualClasse"] = { tipo: "rituais", candidato: { valor: "", opcoes: {} }, rituais: [{ id: "r1", descricao: "x".repeat(50000) }] };
  t.recusa("maior que uma célula", salvar(D, 2, [grande], "op-ram-0007"), "dados_grandes");
  const estranho = plano("plano-campos", "Campos");
  estranho.extra = "<script>"; estranho.decisoes["../fora"] = { tipo: "x" };
  const s3 = salvar(D, 2, [estranho], "op-ram-0008");
  t.ok("campos desconhecidos e chaves de vaga inválidas são descartados", s3.ok && s3.dados.planos[0].extra === undefined && !s3.dados.planos[0].decisoes["../fora"]);
  t.igual("recarregar (ler de novo) devolve o que foi gravado", ler(D).dados.planos[0].nome, "Campos");

  t.grupo("Ramificação · excluir a ficha");
  D({ acao: "excluir_personagem", personagemId: pid });
  t.recusa("a ficha excluída não tem planos", ler(D), "nao_encontrado");
  const pid2 = D({ acao: "criar_personagem", dados: { nome: "Outra", tipoFicha: "ordem", ordem: { classe: "combatente" }, atributos: [], status: [] } }).dados.id;
  t.igual("outra ficha começa sem planos", D({ acao: "ler_planos_evolucao", personagemId: pid2 }).dados.planos.length, 0);
}
