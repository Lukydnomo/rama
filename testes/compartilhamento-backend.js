/* =====================================================================
   R.A.M.A. — testes do backend: compartilhamento de fichas (v2.44).
   Dados sintéticos. Chamado por executar-backend.js.

   O foco é o mesmo do resto da suíte: quem NÃO deve alcançar não
   alcança, mesmo mandando o pedido direto, sem a interface.
   ===================================================================== */

export function testarCompartilhamentoBackend({ t, preparar, novaConta, comoFn }) {
  preparar();
  const ana = novaConta("comp_ana"), beto = novaConta("comp_beto"), carla = novaConta("comp_carla");
  const duda = novaConta("comp_duda"), eva = novaConta("comp_eva"), outraAna = novaConta("comp_ana2");
  const A = comoFn(ana), B = comoFn(beto), C = comoFn(carla), D = comoFn(duda), E = comoFn(eva);

  const FOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const ficha = (nome, extra) => Object.assign({ nome, atributos: [], status: [{ id: "st-1", nome: "Vida", atual: 5, maximo: 10 }] }, extra || {});
  const pAna = A({ acao: "criar_personagem", dados: ficha("Original da Ana", { tipoFicha: "universal", anotacoes: { soltas: [{ id: "n1", titulo: "Nota", conteudo: "segredo do conteúdo" }], pastas: [] } }) }).dados.id;
  const pOrdem = A({ acao: "criar_personagem", dados: ficha("Ordem da Ana", { tipoFicha: "ordem", ordem: { classe: "combatente" } }) }).dados.id;
  A({ acao: "salvar_foto", personagemId: pAna, imagem: FOTO });
  const pastaAna = A({ acao: "criar_pasta", nome: "Da Ana" }).dados.id;
  A({ acao: "mover_personagem", personagemId: pAna, pastaId: pastaAna });

  const listar = (como, id) => como({ acao: "listar_compartilhamentos", personagemId: id || pAna });
  const salvar = (como, versao, acessos, id) => como({ acao: "salvar_compartilhamentos", personagemId: id || pAna, versao, acessos });
  const comigo = (como) => como({ acao: "listar_compartilhados_comigo" });

  t.grupo("Compartilhamento · só o dono gerencia");
  let l = listar(A);
  t.ok("o dono lê a lista vazia, com versão", l.ok && Array.isArray(l.dados.acessos) && l.dados.acessos.length === 0 && !!l.dados.versao);
  t.recusa("quem não alcança a ficha não lê a lista (nem sabe que existe)", listar(B), "nao_encontrado");
  t.recusa("e não salva a lista", salvar(B, l.dados.versao, [{ userId: beto.id, papel: "editor" }]), "nao_encontrado");

  t.grupo("Compartilhamento · validação");
  const v0 = l.dados.versao;
  t.recusa("o dono não entra na lista", salvar(A, v0, [{ userId: ana.id, papel: "leitor" }]), "dados_invalidos");
  t.recusa("a mesma conta duas vezes", salvar(A, v0, [{ userId: beto.id, papel: "leitor" }, { userId: beto.id, papel: "editor" }]), "dados_invalidos");
  t.recusa("conta que não existe", salvar(A, v0, [{ userId: "conta-que-nao-existe-1", papel: "leitor" }]), "dados_invalidos");
  t.recusa("papel desconhecido (mestre, dono…)", salvar(A, v0, [{ userId: beto.id, papel: "mestre" }]), "dados_invalidos");
  t.recusa("sem a versão lida", salvar(A, "", [{ userId: beto.id, papel: "leitor" }]), "dados_invalidos");
  t.recusa("lista que não é lista", A({ acao: "salvar_compartilhamentos", personagemId: pAna, versao: v0, acessos: "beto" }), "dados_invalidos");
  t.igual("nada foi gravado pelas recusas", listar(A).dados.acessos.length, 0);

  t.grupo("Compartilhamento · conceder vários, com papéis diferentes");
  const s1 = salvar(A, v0, [{ userId: beto.id, papel: "editor" }, { userId: carla.id, papel: "leitor" }]);
  t.ok("o dono salva Editor e Leitor numa vez", s1.ok && s1.dados.acessos.length === 2);
  t.iguais("  pelo ID, com nome e usuário para a tela", s1.dados.acessos.map((a) => [a.usuario, a.papel]).sort(), [["comp_beto", "editor"], ["comp_carla", "leitor"]]);
  t.ok("  a versão mudou", s1.dados.versao !== v0);
  t.recusa("uma janela com a versão velha não sobrescreve (conflito com a lista atual)", salvar(A, v0, [{ userId: duda.id, papel: "leitor" }]), "conflito");
  const conflito = salvar(A, v0, []);
  t.ok("  e o conflito traz a lista atual", conflito.erro === "conflito" && conflito.dados && conflito.dados.acessos.length === 2);
  t.ok("nomes repetidos não confundem: Ana e Ana 2 são contas diferentes pelo id", ana.id !== outraAna.id);
  const antesDoNome = A({ acao: "ler_personagem", personagemId: pAna });
  t.igual("compartilhar não mexe na revisão da ficha", antesDoNome.rev, 1 + 0);

  t.grupo("Compartilhamento · o que cada papel alcança");
  const lb = B({ acao: "ler_personagem", personagemId: pAna });
  t.ok("o Editor lê a original", lb.ok && lb.dados.nome === "Original da Ana");
  t.iguais("  com as capacidades de editor", lb.capacidades, { ler: true, editar: true, copiar: true, gerenciar: false, dono: false });
  t.ok("  e sabe de quem é", lb.acesso && lb.acesso.papel === "editor" && lb.acesso.compartilhada === true && lb.acesso.dono.usuario === "comp_ana");
  const lc = C({ acao: "ler_personagem", personagemId: pAna });
  t.iguais("o Leitor lê, sem editar", lc.capacidades, { ler: true, editar: false, copiar: true, gerenciar: false, dono: false });
  t.recusa("quem não recebeu continua sem ver", D({ acao: "ler_personagem", personagemId: pAna }), "nao_encontrado");
  const la = A({ acao: "ler_personagem", personagemId: pAna });
  t.ok("o dono vê quantos receberam", la.capacidades.gerenciar === true && la.acesso.compartilhamentos === 2);
  t.ok("o Leitor não fica sabendo quantos receberam", lc.acesso.compartilhamentos === undefined);
  t.ok("a foto chega a quem recebeu (avulsa e em lote)", C({ acao: "ler_foto", personagemId: pAna }).dados.imagem === FOTO &&
    !!(C({ acao: "ler_fotos", personagemIds: [pAna] }).dados || {})[pAna]);
  t.ok("  e não a quem não recebeu", !(D({ acao: "ler_fotos", personagemIds: [pAna] }).dados || {})[pAna]);

  t.grupo("Compartilhamento · Leitor não grava por nenhum caminho");
  const fichaLida = lc.dados;
  t.recusa("salvar a ficha", C({ acao: "salvar_personagem", personagemId: pAna, rev: lc.rev, dados: Object.assign({}, fichaLida, { nome: "Tomada" }) }), "sem_permissao");
  t.recusa("trocar a foto", C({ acao: "salvar_foto", personagemId: pAna, imagem: "" }), "sem_permissao");
  t.recusa("ajustar um status pela mesa", C({ acao: "ajustar_personagem", personagemId: pAna, alvo: "status", itemId: "st-1", campo: "atual", valor: 1, rev: lc.rev }), "nao_encontrado");
  t.recusa("excluir", C({ acao: "excluir_personagem", personagemId: pAna }), "sem_permissao");
  t.recusa("duplicar como se fosse dono", C({ acao: "duplicar_personagem", personagemId: pAna, operacaoId: "op-comp-dup-1" }), "sem_permissao");
  t.recusa("mover para uma pasta", C({ acao: "mover_personagem", personagemId: pAna, pastaId: null }), "nao_encontrado");
  t.recusa("compartilhar de novo", salvar(C, s1.dados.versao, [{ userId: duda.id, papel: "editor" }]), "sem_permissao");
  t.igual("a ficha continua como estava", A({ acao: "ler_personagem", personagemId: pAna }).dados.nome, "Original da Ana");

  t.grupo("Compartilhamento · Editor altera a mesma ficha");
  const gravou = B({ acao: "salvar_personagem", personagemId: pAna, rev: lb.rev, dados: Object.assign({}, lb.dados, { nome: "Editada pelo Beto", campanhaId: null }), operacaoId: "op-comp-beto-1" });
  t.ok("o Editor salva, e a revisão sobe", gravou.ok && gravou.rev === lb.rev + 1);
  const vistoPelaAna = A({ acao: "ler_personagem", personagemId: pAna });
  t.ok("o dono recebe a alteração (mesmo id, revisão nova)", vistoPelaAna.dados.nome === "Editada pelo Beto" && vistoPelaAna.rev === gravou.rev);
  t.ok("  o dono continua o mesmo", A({ acao: "listar_personagens" }).dados.some((p) => p.id === pAna));
  t.recusa("dois editando: a gravação com a revisão velha volta como conflito, com o estado atual",
    A({ acao: "salvar_personagem", personagemId: pAna, rev: lb.rev, dados: Object.assign({}, lb.dados, { nome: "Da Ana" }) }), "conflito");
  t.ok("  e a repetição do MESMO pedido do Editor é reconhecida", B({ acao: "salvar_personagem", personagemId: pAna, rev: lb.rev, dados: Object.assign({}, lb.dados, { nome: "Editada pelo Beto" }), operacaoId: "op-comp-beto-1" }).repetida === true);
  t.recusa("o Editor não compartilha", salvar(B, s1.dados.versao, [{ userId: beto.id, papel: "editor" }, { userId: duda.id, papel: "editor" }]), "sem_permissao");
  t.recusa("  nem lê a lista de acessos", listar(B), "sem_permissao");
  t.recusa("  nem exclui", B({ acao: "excluir_personagem", personagemId: pAna }), "sem_permissao");
  t.recusa("  nem move nas pastas do dono", B({ acao: "mover_personagem", personagemId: pAna, pastaId: null }), "nao_encontrado");
  const editorTrocaCampanha = B({ acao: "ler_personagem", personagemId: pAna });
  t.igual("  nem leva a ficha para uma campanha", editorTrocaCampanha.dados.campanhaId, null);
  t.ok("o Editor troca a foto (é conteúdo da ficha) e a foto continua do dono", B({ acao: "salvar_foto", personagemId: pAna, imagem: FOTO }).ok);

  t.grupo("Compartilhamento · lista “Compartilhados comigo”");
  const doBeto = comigo(B);
  t.ok("quem recebeu vê a ficha uma vez, com papel e dono", doBeto.ok && doBeto.dados.length === 1 && doBeto.dados[0].id === pAna &&
    doBeto.dados[0].papel === "editor" && doBeto.dados[0].dono.usuario === "comp_ana");
  t.ok("  com sistema e versão da foto, sem pasta do dono, campanha ou ficha", doBeto.dados[0].sistema === "universal" && !!doBeto.dados[0].fotoVersao &&
    doBeto.dados[0].pastaId === undefined && doBeto.dados[0].campanha === undefined && doBeto.dados[0].anotacoes === undefined);
  t.igual("o Leitor também, como leitor", comigo(C).dados[0].papel, "leitor");
  t.igual("o dono não vê a própria ficha ali", comigo(A).dados.length, 0);
  t.igual("quem não recebeu, lista vazia", comigo(D).dados.length, 0);
  t.ok("a ficha recebida não entra em “meus personagens”", !B({ acao: "listar_personagens" }).dados.some((p) => p.id === pAna));

  t.grupo("Compartilhamento · trocar papel e remover");
  let atual = listar(A).dados;
  const s2 = salvar(A, atual.versao, [{ userId: beto.id, papel: "leitor" }, { userId: carla.id, papel: "editor" }]);
  t.ok("Editor vira Leitor e Leitor vira Editor", s2.ok && s2.dados.acessos.find((a) => a.usuario === "comp_beto").papel === "leitor");
  const acessoBeto = B({ acao: "acesso_personagem", personagemId: pAna });
  t.ok("a pergunta leve mostra o rebaixamento e a revisão", acessoBeto.ok && acessoBeto.dados.capacidades.editar === false && acessoBeto.rev === gravou.rev);
  t.recusa("e a gravação seguinte do rebaixado é recusada", B({ acao: "salvar_personagem", personagemId: pAna, rev: gravou.rev, dados: Object.assign({}, vistoPelaAna.dados, { nome: "Insistindo" }) }), "sem_permissao");
  t.ok("o promovido passa a gravar", C({ acao: "salvar_personagem", personagemId: pAna, rev: gravou.rev, dados: Object.assign({}, vistoPelaAna.dados, { nome: "Editada pela Carla" }) }).ok);
  atual = listar(A).dados;
  const s3 = salvar(A, atual.versao, [{ userId: carla.id, papel: "editor" }]);
  t.ok("remover o Beto", s3.ok && s3.dados.acessos.length === 1);
  t.recusa("o removido não lê mais", B({ acao: "ler_personagem", personagemId: pAna }), "nao_encontrado");
  t.recusa("  nem a pergunta leve", B({ acao: "acesso_personagem", personagemId: pAna }), "nao_encontrado");
  t.igual("  e a ficha sai da lista dele", comigo(B).dados.length, 0);
  t.ok("remover não tocou na ficha", A({ acao: "ler_personagem", personagemId: pAna }).dados.nome === "Editada pela Carla");

  t.grupo("Compartilhamento · cópia para a própria biblioteca");
  atual = listar(A).dados;
  salvar(A, atual.versao, [{ userId: carla.id, papel: "editor" }, { userId: duda.id, papel: "leitor" }]);
  const original = A({ acao: "ler_personagem", personagemId: pAna });
  const op = "op-comp-copia-duda-1";
  const cp = D({ acao: "copiar_personagem", personagemId: pAna, operacaoId: op });
  t.ok("o Leitor copia", cp.ok && !!cp.dados.id && cp.dados.id !== pAna);
  const copia = D({ acao: "ler_personagem", personagemId: cp.dados.id });
  t.ok("a cópia é da conta que pediu, com revisão própria", copia.ok && copia.capacidades.dono === true && copia.rev === 1);
  t.ok("  com o conteúdo da original", copia.dados.anotacoes.soltas[0].conteudo === "segredo do conteúdo" && copia.dados.nome === "Editada pela Carla (cópia)");
  t.ok("  e o retrato", D({ acao: "ler_foto", personagemId: cp.dados.id }).dados.imagem === FOTO);
  t.igual("  sem campanha", copia.dados.campanhaId, null);
  t.igual("  sem acessos herdados", listar(D, cp.dados.id).dados.acessos.length, 0);
  const meusDaDuda = D({ acao: "listar_personagens" }).dados;
  t.ok("  entre as fichas próprias, sem pasta", meusDaDuda.some((p) => p.id === cp.dados.id && p.pastaId === null && !p.campanhaId));
  const rep = D({ acao: "copiar_personagem", personagemId: pAna, operacaoId: op });
  t.ok("a retentativa com o mesmo id não cria outra cópia", rep.ok && rep.dados.id === cp.dados.id && rep.repetida === true &&
    D({ acao: "listar_personagens" }).dados.length === meusDaDuda.length);
  D({ acao: "salvar_personagem", personagemId: cp.dados.id, rev: copia.rev, dados: Object.assign({}, copia.dados, { nome: "Só da Duda" }) });
  t.igual("mudar a cópia não muda a original", A({ acao: "ler_personagem", personagemId: pAna }).dados.nome, original.dados.nome);
  t.recusa("quem não alcança não copia", B({ acao: "copiar_personagem", personagemId: pAna, operacaoId: "op-comp-copia-beto" }), "nao_encontrado");
  t.ok("copiar não aceita uma ficha enviada pelo navegador no lugar da original",
    (() => { const r = D({ acao: "copiar_personagem", personagemId: pAna, operacaoId: "op-comp-copia-duda-2", dados: { nome: "Falsa" } }); return r.ok && D({ acao: "ler_personagem", personagemId: r.dados.id }).dados.nome === "Editada pela Carla (cópia)"; })());
  const pastaDuda = D({ acao: "criar_pasta", nome: "Recebidas" }).dados.id;
  const naPasta = D({ acao: "copiar_personagem", personagemId: pAna, operacaoId: "op-comp-copia-duda-3", pastaId: pastaDuda });
  t.igual("a cópia vai para uma pasta da conta de destino, se pedida", D({ acao: "listar_personagens" }).dados.find((p) => p.id === naPasta.dados.id).pastaId, pastaDuda);
  const pastaAlheia = D({ acao: "copiar_personagem", personagemId: pAna, operacaoId: "op-comp-copia-duda-4", pastaId: pastaAna });
  t.igual("  e a pasta de outra conta é ignorada (fica sem pasta)", D({ acao: "listar_personagens" }).dados.find((p) => p.id === pastaAlheia.dados.id).pastaId, null);

  t.grupo("Compartilhamento · campanha e mestre");
  const mesa = E({ acao: "criar_campanha", dados: { nome: "Mesa da Eva", visibilidade: "privado" } }).dados.id;
  E({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }, { userId: carla.id, papel: "jogador" }] });
  t.ok("a dona vincula a ficha à mesa", A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pAna }).ok);
  t.ok("a mestra lê e edita pela campanha", E({ acao: "ler_personagem", personagemId: pAna }).capacidades.editar === true);
  atual = listar(A).dados;
  t.ok("a mestra aparece como “via mestre” na lista de quem compartilha", atual.mestres.indexOf(eva.id) >= 0);
  const comEva = salvar(A, atual.versao, [{ userId: carla.id, papel: "editor" }, { userId: duda.id, papel: "leitor" }, { userId: eva.id, papel: "leitor" }]);
  t.ok("  e, compartilhada como Leitora, o acesso efetivo continua de mestre (editar)", comEva.ok && comEva.dados.acessos.find((a) => a.usuario === "comp_eva").viaMestre === true &&
    E({ acao: "ler_personagem", personagemId: pAna }).capacidades.editar === true);
  const semEva = salvar(A, comEva.dados.versao, [{ userId: carla.id, papel: "editor" }, { userId: duda.id, papel: "leitor" }]);
  t.ok("tirar o compartilhamento da mestra não tira o acesso de mestre", semEva.ok && E({ acao: "ler_personagem", personagemId: pAna }).ok);
  t.recusa("a Carla (Editora e jogadora da mesa) não registra rolagem em nome da ficha da Ana", C({ acao: "registrar_rolagem", campanhaId: mesa, rolagemId: "rol-comp-carla-1", personagemId: pAna, dados: { total: 3 } }), "nao_encontrado");
  t.recusa("  nem ajusta pela mesa", C({ acao: "ajustar_personagem", personagemId: pAna, campanhaId: mesa, alvo: "status", itemId: "st-1", campo: "atual", valor: 2, rev: 1 }), "nao_encontrado");
  const pcDuda = D({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.ok("a Duda (Leitora, fora da mesa) não alcança a campanha", D({ acao: "ler_campanha", campanhaId: mesa }).ok === false &&
    (pcDuda.ok === false || (pcDuda.dados || []).length === 0));
  t.recusa("  nem as notas do mestre", D({ acao: "listar_notas_mestre", campanhaId: mesa }), "nao_encontrado");
  t.ok("  nem as rolagens", !D({ acao: "listar_rolagens", campanhaId: mesa }).ok);
  t.ok("  e não virou participante", !D({ acao: "listar_campanhas" }).dados.some((c) => c.id === mesa));
  const copiaDaMesa = D({ acao: "copiar_personagem", personagemId: pAna, operacaoId: "op-comp-copia-mesa" });
  t.igual("a cópia de uma ficha de mesa não leva a campanha", D({ acao: "ler_personagem", personagemId: copiaDaMesa.dados.id }).dados.campanhaId, null);
  t.ok("o editor salvando não muda a campanha da ficha", (() => {
    const lida = C({ acao: "ler_personagem", personagemId: pAna });
    C({ acao: "salvar_personagem", personagemId: pAna, rev: lida.rev, dados: Object.assign({}, lida.dados, { campanhaId: null }) });
    return A({ acao: "ler_personagem", personagemId: pAna }).dados.campanhaId === mesa;
  })());

  t.grupo("Compartilhamento · tema de dados não se transfere");
  globalThis.cadastrarCodigo("COMPART1", ["sigilo-violeta"], "teste de compartilhamento");
  t.ok("a dona resgata um tema de dados", A({ acao: "resgatar_codigo", codigo: "COMPART1", operacaoId: "op-comp-resgate-1" }).ok);
  const ordemLida = A({ acao: "ler_personagem", personagemId: pOrdem });
  A({ acao: "salvar_personagem", personagemId: pOrdem, rev: ordemLida.rev, dados: Object.assign({}, ordemLida.dados, { aparencia: { v: 1, modo: "conta", dados: { id: "sigilo-violeta" } } }) });
  t.igual("a ficha dela usa o tema", A({ acao: "ler_personagem", personagemId: pOrdem }).dados.aparencia.dados.id, "sigilo-violeta");
  const vOrdem = listar(A, pOrdem).dados.versao;
  salvar(A, vOrdem, [{ userId: beto.id, papel: "editor" }], pOrdem);
  const doEditor = B({ acao: "ler_personagem", personagemId: pOrdem });
  B({ acao: "salvar_personagem", personagemId: pOrdem, rev: doEditor.rev, dados: Object.assign({}, doEditor.dados, { nome: "Ordem editada" }) });
  t.igual("o Editor salva e o tema da dona continua (é a coleção da dona que vale)", A({ acao: "ler_personagem", personagemId: pOrdem }).dados.aparencia.dados.id, "sigilo-violeta");
  t.igual("  e o Editor não ganhou o tema", (B({ acao: "listar_desbloqueios" }).dados || {}).temas ? B({ acao: "listar_desbloqueios" }).dados.temas.length : 0, 0);
  const copiaTema = B({ acao: "copiar_personagem", personagemId: pOrdem, operacaoId: "op-comp-copia-tema" });
  const lidaTema = B({ acao: "ler_personagem", personagemId: copiaTema.dados.id });
  t.ok("a cópia do Editor volta ao dado padrão, com o motivo", copiaTema.ok && !(lidaTema.dados.aparencia && lidaTema.dados.aparencia.dados) && (copiaTema.avisos || []).length === 1);

  t.grupo("Compartilhamento · excluir a original");
  t.igual("antes: a Duda vê a ficha recebida", comigo(D).dados.length, 1);
  t.ok("a dona exclui", A({ acao: "excluir_personagem", personagemId: pAna }).ok);
  t.igual("a ficha some da lista de quem recebeu", comigo(D).dados.length, 0);
  t.igual("  e de todos", comigo(C).dados.length, 0);
  t.ok("as cópias continuam", D({ acao: "ler_personagem", personagemId: cp.dados.id }).ok && D({ acao: "ler_foto", personagemId: cp.dados.id }).dados.imagem === FOTO);
  t.recusa("a original não abre mais para quem recebeu", C({ acao: "ler_personagem", personagemId: pAna }), "nao_encontrado");

  t.grupo("Compartilhamento · fichas sem registros, lote");
  const pSolo = A({ acao: "criar_personagem", dados: ficha("Sem compartilhar") }).dados.id;
  const solo = A({ acao: "ler_personagem", personagemId: pSolo });
  t.ok("ficha sem compartilhamento: o dono com tudo, sem aviso de compartilhada", solo.capacidades.editar && solo.acesso.compartilhada === false && solo.acesso.compartilhamentos === 0);
  const lote = D({ acao: "lote", pedidos: [{ acao: "listar_compartilhados_comigo" }, { acao: "acesso_personagem", personagemId: pSolo }] });
  t.ok("as leituras novas entram no lote, e cada uma confere o próprio acesso", lote.ok && lote.dados.respostas[0].ok && lote.dados.respostas[1].erro === "nao_encontrado");
  t.recusa("salvar compartilhamentos não entra no lote", D({ acao: "lote", pedidos: [{ acao: "salvar_compartilhamentos", personagemId: pSolo, versao: "x", acessos: [] }] }).dados.respostas[0], "acao_desconhecida");
}
