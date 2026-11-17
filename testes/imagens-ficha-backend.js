/* v9.13 — imagens da ficha (PERSONAGENS_IMAGENS): biblioteca de retratos
   e imagens das anotações. As imagens seguem a ficha: lê quem lê a
   ficha, grava quem a edita; uma ref sozinha não abre nada. */
export function testarImagensDaFichaBackend({ t, preparar, novaConta, comoFn }) {
  preparar();
  const ana = novaConta("img_ana"), beto = novaConta("img_beto"), carla = novaConta("img_carla"), duda = novaConta("img_duda");
  const A = comoFn(ana), B = comoFn(beto), C = comoFn(carla), D = comoFn(duda);
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const PNG2 = PNG.replace("AAAAAEl", "AAAAAGl");
  const nota = "nota-0001-abcdef";
  const p = A({ acao: "criar_personagem", dados: { nome: "Com imagens", tipoFicha: "universal", anotacoes: { pastas: [], soltas: [{ id: nota, titulo: "Pistas", conteudo: "texto" }] } } }).dados.id;
  const outra = A({ acao: "criar_personagem", dados: { nome: "Outra ficha", tipoFicha: "universal" } }).dados.id;
  /* beto lê (Leitor), carla edita (Editor), duda não tem acesso. */
  const v = A({ acao: "listar_compartilhamentos", personagemId: p }).dados.versao;
  t.ok("(compartilhada com Leitor e Editor)", A({ acao: "salvar_compartilhamentos", personagemId: p, versao: v,
    acessos: [{ userId: beto.id, papel: "leitor" }, { userId: carla.id, papel: "editor" }] }).ok);

  t.grupo("Imagens da ficha · retratos e anotações");
  const salvar = (como, dados, id) => como(Object.assign({ acao: "salvar_imagem_personagem", personagemId: id || p }, dados));
  t.ok("o dono guarda um retrato", salvar(A, { ref: "ret-aaaa-0001", tipo: "retrato", nome: "Civil", imagem: PNG }).ok);
  t.ok("e outro", salvar(A, { ref: "ret-aaaa-0002", tipo: "retrato", nome: "Ferido", imagem: PNG2 }).ok);
  t.ok("duas imagens na nota", salvar(A, { ref: "ano-aaaa-0001", tipo: "anotacao", alvo: nota, nome: "a.png", imagem: PNG }).ok &&
    salvar(A, { ref: "ano-aaaa-0002", tipo: "anotacao", alvo: nota, nome: "b.png", imagem: PNG2 }).ok);
  let l = A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "retrato" });
  t.ok("a lista de retratos vem sem imagem, com nome e limites", l.ok && l.dados.imagens.length === 2 && !l.dados.imagens[0].imagem &&
    l.dados.imagens[0].nome === "Civil" && l.dados.limites.retrato === 30);
  t.igual("as duas da nota estão listadas", A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "anotacao" }).dados.imagens.length, 2);
  let r = A({ acao: "ler_imagens_personagem", personagemId: p, refs: ["ret-aaaa-0002", "ano-aaaa-0001"] });
  t.ok("ler por ref devolve as imagens pedidas", r.ok && r.dados.imagens["ret-aaaa-0002"] === PNG2 && r.dados.imagens["ano-aaaa-0001"] === PNG);
  t.ok("renomear não troca a imagem", salvar(A, { ref: "ret-aaaa-0001", tipo: "retrato", nome: "Civil (casaco)" }).ok &&
    A({ acao: "ler_imagens_personagem", personagemId: p, refs: ["ret-aaaa-0001"] }).dados.imagens["ret-aaaa-0001"] === PNG &&
    A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "retrato" }).dados.imagens[0].nome === "Civil (casaco)");
  t.ok("repetir o envio da mesma ref não duplica", salvar(A, { ref: "ret-aaaa-0002", tipo: "retrato", nome: "Ferido", imagem: PNG2 }).ok &&
    A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "retrato" }).dados.imagens.length === 2);
  t.recusa("a mesma ref não muda de tipo", salvar(A, { ref: "ret-aaaa-0002", tipo: "anotacao", alvo: nota, imagem: PNG }), "dados_invalidos");
  t.recusa("imagem de anotação precisa da nota", salvar(A, { ref: "ano-aaaa-0009", tipo: "anotacao", imagem: PNG }), "dados_invalidos");
  t.recusa("ref fora do formato", salvar(A, { ref: "../x", tipo: "retrato", imagem: PNG }), "dados_invalidos");
  t.recusa("tipo desconhecido", salvar(A, { ref: "ret-aaaa-0003", tipo: "capa", imagem: PNG }), "dados_invalidos");
  t.recusa("não é imagem", salvar(A, { ref: "ret-aaaa-0003", tipo: "retrato", imagem: "javascript:alert(1)" }), "dados_invalidos");
  t.recusa("nova sem imagem", salvar(A, { ref: "ret-aaaa-0003", tipo: "retrato", nome: "vazia" }), "dados_invalidos");

  t.grupo("Imagens da ficha · permissões");
  t.ok("o Leitor lista e lê", B({ acao: "listar_imagens_personagem", personagemId: p }).ok &&
    B({ acao: "ler_imagens_personagem", personagemId: p, refs: ["ano-aaaa-0001"] }).dados.imagens["ano-aaaa-0001"] === PNG);
  t.recusa("o Leitor não grava", salvar(B, { ref: "ret-bbbb-0001", tipo: "retrato", imagem: PNG }), "sem_permissao");
  t.recusa("nem exclui", B({ acao: "excluir_imagem_personagem", personagemId: p, refs: ["ano-aaaa-0001"] }), "sem_permissao");
  t.ok("o Editor grava", salvar(C, { ref: "ret-cccc-0001", tipo: "retrato", nome: "Do editor", imagem: PNG }).ok);
  t.recusa("sem acesso à ficha, nada: nem a lista", D({ acao: "listar_imagens_personagem", personagemId: p }), "nao_encontrado");
  t.recusa("nem a imagem pela ref (link direto)", D({ acao: "ler_imagens_personagem", personagemId: p, refs: ["ano-aaaa-0001"] }), "nao_encontrado");
  t.recusa("nem grava", salvar(D, { ref: "ret-dddd-0001", tipo: "retrato", imagem: PNG }), "nao_encontrado");
  r = A({ acao: "ler_imagens_personagem", personagemId: outra, refs: ["ano-aaaa-0001"] });
  t.ok("a ref de uma ficha não abre pela outra", r.ok && !r.dados.imagens["ano-aaaa-0001"]);
  r = D({ acao: "ler_imagens_personagem", personagemId: outra, refs: ["ano-aaaa-0001"] });
  t.recusa("nem por uma ficha que a conta não alcança", r, "nao_encontrado");

  t.grupo("Imagens da ficha · excluir, limites, cópia e exclusão");
  t.ok("excluir uma imagem da nota deixa a outra", A({ acao: "excluir_imagem_personagem", personagemId: p, refs: ["ano-aaaa-0001"] }).ok &&
    A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "anotacao" }).dados.imagens.map((i) => i.ref).join() === "ano-aaaa-0002");
  t.ok("excluir de novo não é erro", A({ acao: "excluir_imagem_personagem", personagemId: p, refs: ["ano-aaaa-0001"] }).ok);
  for (let i = 3; i <= 12; i++) salvar(A, { ref: "ano-lim-" + String(i).padStart(4, "0"), tipo: "anotacao", alvo: nota, imagem: PNG });
  t.igual("(11 na nota)", A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "anotacao" }).dados.imagens.length, 11);
  salvar(A, { ref: "ano-lim-0013", tipo: "anotacao", alvo: nota, imagem: PNG });
  r = salvar(A, { ref: "ano-lim-0014", tipo: "anotacao", alvo: nota, imagem: PNG });
  t.recusa("a 13ª imagem da mesma nota é recusada com o limite", r, "limite");
  t.igual("  e nada do que existia muda", A({ acao: "listar_imagens_personagem", personagemId: p, tipo: "anotacao" }).dados.imagens.length, 12);
  t.recusa("imagem grande demais", salvar(A, { ref: "ret-gr-0001", tipo: "retrato", imagem: "data:image/png;base64," + "A".repeat(95000) }), "dados_grandes");

  const copia = A({ acao: "duplicar_personagem", personagemId: p });
  t.ok("(duplicada)", copia.ok);
  const idCopia = copia.dados.id;
  r = A({ acao: "ler_imagens_personagem", personagemId: idCopia, refs: ["ret-aaaa-0001", "ano-aaaa-0002"] });
  t.ok("a cópia leva as imagens com as mesmas refs", r.ok && r.dados.imagens["ret-aaaa-0001"] === PNG && r.dados.imagens["ano-aaaa-0002"] === PNG2);
  t.ok("excluir na cópia não mexe na original", A({ acao: "excluir_imagem_personagem", personagemId: idCopia, refs: ["ret-aaaa-0001"] }).ok &&
    !!A({ acao: "ler_imagens_personagem", personagemId: p, refs: ["ret-aaaa-0001"] }).dados.imagens["ret-aaaa-0001"]);
  t.ok("excluir o personagem leva as imagens dele", A({ acao: "excluir_personagem", personagemId: idCopia }).ok &&
    A({ acao: "listar_imagens_personagem", personagemId: p }).dados.imagens.length === 15);
}
