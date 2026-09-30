/* Exercitado pelo mesmo simulador e doPost dos demais testes do backend. */
export function testarAliadosBackend({ t, preparar, novaConta, comoFn }) {
  t.grupo("Aliados, blocos e nome atual · v2.24");
  preparar();
  const dona = novaConta("aliados_dona"), mestre = novaConta("aliados_mestre"), fora = novaConta("aliados_fora");
  const D = comoFn(dona), M = comoFn(mestre), X = comoFn(fora);
  const mesa = M({ acao: "criar_campanha", dados: { nome: "Mesa dos aliados" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: dona.id, papel: "jogador" }] });
  const modelo = { tipo: "criatura", nome: "Corvo", visibilidade: "publico", descricao: "Companheiro",
    status: [{ id: "vida", nome: "Vida", atual: 8, maximo: 12 }],
    atributos: [{ id: "agi", nome: "Agilidade", sigla: "AGI", valor: 2, dado: "2d20" }],
    pericias: [{ id: "voo", nome: "Voo", atributoId: "agi", bonus: 5 }],
    ataques: [{ id: "bico", nome: "Bico", periciaId: "voo", dano: "1d6", danoExtra: "2", critico: 19, multiplicador: 2 }],
    habilidades: [{ id: "vigilia", nome: "Vigília", texto: "Observa" }] };
  const origem = M({ acao: "salvar_homebrew", dados: modelo }).dados.id;
  const privado = M({ acao: "salvar_homebrew", dados: { ...modelo, nome: "Segredo", visibilidade: "privado" } }).dados.id;
  const imagem = "data:image/png;base64," + "A".repeat(44000);
  t.ok("imagem do modelo usa o pipeline separado existente", M({ acao: "salvar_imagem_criatura", criaturaId: origem, imagem }).ok);
  t.recusa("servidor recusa criatura privada alheia", D({ acao: "ler_homebrew", homebrewId: privado }));
  t.recusa("servidor recusa imagem privada alheia", D({ acao: "ler_imagem_criatura", criaturaId: privado }));
  const fonte = D({ acao: "ler_homebrew", homebrewId: origem });
  t.ok("criatura pública pode servir de modelo", fonte.ok);
  const copia = () => JSON.parse(JSON.stringify(modelo));
  const aliados = [1, 2, 3].map(i => ({ id: "aliado-" + i, origemId: origem, criatura: copia(), imagem }));
  for (const tipoFicha of ["universal", "ordem"]) {
    const p = D({ acao: "criar_personagem", dados: { nome: "Nome anterior", schemaVersion: 14, tipoFicha,
      modulos: { atributos: false, pericias: false, aliados: true }, pericias: [], aliados,
      ordem: tipoFicha === "ordem" ? { classe: "combatente", origem: "atleta", nex: 5 } : undefined } }).dados.id;
    D({ acao: "vincular_personagem", campanhaId: mesa, personagemId: p });
    let lida = D({ acao: "ler_personagem", personagemId: p });
    t.iguais(tipoFicha + ": imagens e campos maiores que uma célula voltam inteiros", lida.dados.aliados, aliados);
    t.iguais(tipoFicha + ": perícias vazias e configuração persistem", [lida.dados.pericias, lida.dados.modulos], [[], { atributos: false, pericias: false, aliados: true }]);
    t.recusa(tipoFicha + ": terceiro não pode ler a ficha e aliados", X({ acao: "ler_personagem", personagemId: p }));
    t.recusa(tipoFicha + ": terceiro não pode salvar aliados", X({ acao: "salvar_personagem", personagemId: p, rev: lida.rev, dados: lida.dados }));
    t.ok(tipoFicha + ": mestre autorizado lê aliados", M({ acao: "ler_personagem", personagemId: p }).ok);
    const combate = M({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Combate", estado: "preparando", visiveis: [dona.id],
      participantes: [{ id: "participante-" + p, tipo: "personagem", personagemId: p, ordem: 10 }] } }).dados.id;
    const pedido = { acao: "registrar_rolagem", campanhaId: mesa, personagemId: p, rolagemId: "aliado-roll-" + tipoFicha,
      tipo: "criatura", nome: "Corvo · Bico · Ataque", dados: { natural: 19, total: 24, rolagens: [10, 19], critico: true } };
    t.ok(tipoFicha + ": rolagem usa permissão da ficha", D(pedido).ok);
    t.ok(tipoFicha + ": repetir registro é idempotente", D(pedido).dados.repetida);
    t.recusa(tipoFicha + ": terceiro não registra pelo aliado alheio", X({ ...pedido, rolagemId: "intruso-" + tipoFicha }));
    lida.dados.nome = "Nome atual";
    lida.dados.aliados[0].criatura.status[0].atual = 3;
    const salvo = D({ acao: "salvar_personagem", personagemId: p, rev: lida.rev, dados: lida.dados });
    t.ok(tipoFicha + ": edição salva com revisão", salvo.ok);
    t.recusa(tipoFicha + ": revisão velha não apaga mudanças", D({ acao: "salvar_personagem", personagemId: p, rev: lida.rev, dados: lida.dados }));
    lida = D({ acao: "ler_personagem", personagemId: p });
    t.ok(tipoFicha + ": mesmo personagem mantém nome e cópias independentes", lida.dados.nome === "Nome atual" &&
      lida.dados.aliados[0].criatura.status[0].atual === 3 && lida.dados.aliados[1].criatura.status[0].atual === 8);
    if (tipoFicha === "ordem") t.iguais("renomear preserva progressão e origem", lida.dados.ordem, { classe: "combatente", origem: "atleta", nex: 5 });
    t.ok(tipoFicha + ": listagem usa nome atual", D({ acao: "listar_personagens" }).dados.some(x => x.id === p && x.nome === "Nome atual"));
    t.ok(tipoFicha + ": cartão da campanha usa nome atual", M({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados.some(x => x.id === p && x.nome === "Nome atual"));
    const cb = M({ acao: "listar_combates", campanhaId: mesa }).dados.find(x => x.id === combate);
    t.ok(tipoFicha + ": combate consulta nome atual sem inserir aliados", cb.participantes.length === 1 && cb.participantes[0].nome === "Nome atual");
    const historico = D({ acao: "listar_rolagens", campanhaId: mesa }).dados.rolagens.filter(x => x.id === pedido.rolagemId);
    t.ok(tipoFicha + ": histórico mantém uma rolagem e o nome original da ação", historico.length === 1 && historico[0].nome === pedido.nome);
    lida.dados.aliados.splice(0, 1);
    t.ok(tipoFicha + ": remoção persiste", D({ acao: "salvar_personagem", personagemId: p, rev: lida.rev, dados: lida.dados }).ok);
    t.igual(tipoFicha + ": duas cópias permanecem após remover uma", D({ acao: "ler_personagem", personagemId: p }).dados.aliados.length, 2);
  }
  t.igual("editar aliados não modifica Homebrew", M({ acao: "ler_homebrew", homebrewId: origem }).dados.status[0].atual, 8);
  t.ok("modelo pode ser excluído sem excluir aliados", M({ acao: "excluir_homebrew", homebrewId: origem }).ok);
  D({ acao: "listar_personagens" }).dados.forEach(p => {
    const f = D({ acao: "ler_personagem", personagemId: p.id }).dados;
    t.ok(p.nome + ": cópias e imagens sobrevivem à exclusão do modelo", f.aliados.length === 2 && f.aliados.every(a => a.imagem === imagem && a.criatura.nome === "Corvo"));
  });
}
