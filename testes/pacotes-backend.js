/* =====================================================================
   R.A.M.A. — testes do backend: Pacotes de Homebrew (v9.6)
   ---------------------------------------------------------------------
   As rotas chamadas DIRETO, sem a interface: o dono monta "Dossiê do
   hospital" (duas criaturas, um ritual e um item, com capa), privado; um
   amigo não acha pelo id, abre pelo código, importa parte, repete o envio
   e importa o resto; o dono troca e revoga o código; público → privado;
   compatibilidade por sistema (criatura nativa, ritual, Universal, um
   sistema sem editor nativo de criatura); originais editados ou apagados
   não mudam o pacote nem as cópias; prévia velha não importa outra lista.
   Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export function testarPacotesBackend({ t, preparar, novaConta, comoFn }) {
  const G = globalThis;
  preparar();
  const dona = novaConta("pc_dona"), amigo = novaConta("pc_amigo"), outra = novaConta("pc_outra");
  const A = comoFn(dona), B = comoFn(amigo), C = comoFn(outra);
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  let n = 0;
  const op = (p) => "op-pc-" + p + "-" + String(++n).padStart(4, "0");
  const hb = (como, dados) => como({ acao: "salvar_homebrew", dados }).dados.id;

  const zumbi = hb(A, { tipo: "criatura", sistema: "ordem", nome: "Zumbi de Sangue", ordem: { vd: 40, elementos: ["sangue"] }, status: [{ id: "vida", nome: "PV", atual: 50, maximo: 50 }] });
  const enfermeira = hb(A, { tipo: "criatura", sistema: "ordem", nome: "Enfermeira Pálida", ordem: { vd: 60, elementos: ["morte"] } });
  A({ acao: "salvar_imagem_criatura", criaturaId: zumbi, imagem: PNG });
  const ritual = hb(A, { tipo: "ritual", nome: "Selo do Necrotério", circulo: "1º círculo", elemento: "Morte", descricao: "Sintético." });
  const bisturi = hb(A, { tipo: "arma", nome: "Bisturi enferrujado", dano: "1d4", critico: 19, multiplicador: 2, peso: 0.5 });
  const vampiraHb = hb(A, { tipo: "criatura", sistema: "vampiro", nome: "Vampira Sintética", vampiro: { modelo: "compacto" } });
  const universalHb = hb(A, { tipo: "criatura", nome: "Rato Gigante" });
  const habilidade = hb(A, { tipo: "habilidade", nome: "Olhar clínico", texto: "Sintético." });
  const doAmigo = hb(B, { tipo: "item", nome: "Item do amigo" });

  const salvar = (como, corpo) => como(Object.assign({ acao: "salvar_pacote", opId: op("s") }, corpo));
  const dados = (nome, sistema, extra) => Object.assign({ nome, sistema, descricao: "Pacote sintético.", visibilidade: "privado" }, extra || {});

  t.grupo("Pacotes · montar e compatibilidade");
  t.recusa("sem conteúdo não cria", salvar(A, { dados: dados("Vazio", "ordem"), conteudo: { manter: [], adicionar: [] } }), "dados_invalidos");
  t.recusa("sistema desconhecido", salvar(A, { dados: dados("X", "nao-existe"), conteudo: { adicionar: [bisturi] } }), "dados_invalidos");
  t.recusa("criação de outra conta não entra (o servidor confere a posse)", salvar(A, { dados: dados("X", "ordem"), conteudo: { adicionar: [doAmigo] } }), "nao_encontrado");
  t.recusa("JSON no lugar dos ids não é aceito", salvar(A, { dados: dados("X", "ordem"), conteudo: { adicionar: [{ tipo: "item", nome: "Forjado" }] } }), "dados_invalidos");
  const incompat = salvar(A, { dados: dados("X", "ordem"), conteudo: { adicionar: [vampiraHb, bisturi] } });
  t.ok("criatura de Vampiro num pacote de Ordem: recusada com o motivo, sem converter", incompat.erro === "incompativel" && incompat.itens.length === 1 && /Vampiro/.test(incompat.itens[0].motivo) && /não converte/.test(incompat.itens[0].motivo));
  const ritVamp = salvar(A, { dados: dados("X", "vampiro"), conteudo: { adicionar: [ritual] } });
  t.ok("ritual num pacote de Vampiro: recusado (a ficha não tem a aba Rituais)", ritVamp.erro === "incompativel" && /Rituais/.test(ritVamp.itens[0].motivo));
  const brutal = salvar(A, { dados: dados("Arsenal BRUTAL", "brutal"), conteudo: { adicionar: [bisturi, habilidade] } });
  t.ok("sistema sem editor nativo de criatura: tipos genéricos entram", brutal.ok && brutal.dados.qtd === 2 && brutal.dados.sistema === "brutal");
  t.ok("  e a criatura de Ordem é recusada nele", salvar(A, { dados: dados("Y", "brutal"), conteudo: { adicionar: [zumbi] } }).erro === "incompativel");
  const univ = salvar(A, { dados: dados("Bestiário universal", "universal"), conteudo: { adicionar: [universalHb, ritual, bisturi] } });
  t.ok("pacote Universal: criatura universal, ritual e arma", univ.ok && univ.dados.qtd === 3);
  t.ok("  e a criatura de Ordem não vira universal", salvar(A, { dados: dados("Z", "universal"), conteudo: { adicionar: [zumbi] } }).erro === "incompativel");
  const ritSis = G.RAMASistemas.lista().filter((s) => s.ficha && (s.ficha.abas || []).some((a) => a.chave === "rituais")).map((s) => s.id).sort();
  t.iguais("os sistemas com rituais do servidor são os do registro do site", G.SISTEMAS_COM_RITUAIS.slice().sort(), ritSis);

  const opCriar = op("criar");
  const criado = salvar(A, { opId: opCriar, dados: dados("Dossiê do hospital", "ordem"), conteudo: { adicionar: [zumbi, enfermeira, ritual, bisturi] }, capa: { acao: "trocar", imagem: PNG } });
  t.ok("Dossiê do hospital: 4 entradas, privado, com capa, rev 1", criado.ok && criado.dados.qtd === 4 && criado.dados.visibilidade === "privado" && criado.dados.temCapa && criado.rev === 1, JSON.stringify(criado));
  const pid = criado.dados.id;
  const repetido = salvar(A, { opId: opCriar, dados: dados("Dossiê do hospital", "ordem"), conteudo: { adicionar: [zumbi] } });
  t.ok("reenviar a criação (resposta perdida) não cria outro pacote", repetido.ok && repetido.repetida && repetido.dados.id === pid && A({ acao: "listar_pacotes" }).dados.length === 3);
  const lidoA = A({ acao: "ler_pacote", pacoteId: pid });
  t.ok("o dono lê o conteúdo, agrupável por tipo, com a origem", lidoA.ok && lidoA.dados.entradas.map((e) => e.tipo).join() === "criatura,criatura,ritual,arma" && lidoA.dados.entradas.every((e) => e.origemExiste));
  t.ok("  a imagem da criatura foi copiada para a entrada", lidoA.dados.entradas[0].temImagem === true && lidoA.dados.entradas[1].temImagem === false);

  t.grupo("Pacotes · privado não se acha pelo id");
  t.ok("não aparece na galeria pública de outra conta", !B({ acao: "listar_pacotes", escopo: "publicos" }).dados.some((p) => p.id === pid));
  t.recusa("ler pelo id", B({ acao: "ler_pacote", pacoteId: pid }), "nao_encontrado");
  t.iguais("a capa não vem", B({ acao: "ler_capas_pacotes", pacoteIds: [pid] }).dados, {});
  t.recusa("importar pelo id", B({ acao: "importar_pacote", pacoteId: pid, rev: 1, opId: op("i"), entradas: [lidoA.dados.entradas[0].id] }), "nao_encontrado");
  t.recusa("um código qualquer não abre", B({ acao: "abrir_pacote_codigo", codigo: "ABCD-EFGH-JKLM-NPQR" }), "codigo_invalido");
  t.recusa("lixo no lugar do código", B({ acao: "abrir_pacote_codigo", codigo: "x" }), "codigo_invalido");

  t.grupo("Pacotes · código");
  t.recusa("tipo de ação desconhecido", A({ acao: "codigo_pacote", pacoteId: pid, tipo: "abrir" }), "dados_invalidos");
  const c1 = A({ acao: "codigo_pacote", pacoteId: pid, tipo: "gerar" });
  t.ok("o dono gera um código de 16 símbolos, agrupado", c1.ok && /^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(c1.dados.codigo), JSON.stringify(c1));
  const codigo1 = c1.dados.codigo;
  t.recusa("outra conta não gera nem revoga", B({ acao: "codigo_pacote", pacoteId: pid, tipo: "gerar" }), "nao_encontrado");
  const linhaPacote = G.acharPor(G.ABAS.PACOTES_HOMEBREW, "id", pid);
  t.ok("o código não é gravado em claro (só o hash)", linhaPacote.codigoHash && !JSON.stringify(linhaPacote).includes(codigo1.replace(/-/g, "")) && !JSON.stringify(linhaPacote).includes(codigo1));
  t.ok("a lista do dono diz que há código, sem revelá-lo", A({ acao: "listar_pacotes" }).dados.find((p) => p.id === pid).temCodigo === true && !JSON.stringify(A({ acao: "listar_pacotes" })).includes(codigo1));
  const aberto = B({ acao: "abrir_pacote_codigo", codigo: codigo1.toLowerCase().replace(/-/g, " ") });
  t.ok("o amigo abre com o código (maiúsculas, espaços e traços não importam)", aberto.ok && aberto.dados.id === pid && aberto.dados.qtd === 4 && aberto.dados.via === "codigo");
  t.ok("  vê capa, sistema, descrição e as entradas, sem dados do dono", aberto.dados.temCapa && aberto.dados.sistema === "ordem" && aberto.dados.descricao && aberto.dados.temCodigo === undefined && aberto.dados.entradas[0].origemExiste === undefined);
  t.ok("  a capa vem com o código", !!B({ acao: "ler_capas_pacotes", pacoteIds: [pid], codigo: codigo1 }).dados[pid]);
  t.ok("  ler pelo id com o código", B({ acao: "ler_pacote", pacoteId: pid, codigo: codigo1 }).ok);
  t.recusa("o código lê e importa, mas não edita", salvar(B, { pacoteId: pid, rev: 1, codigo: codigo1, dados: dados("Tomado", "ordem") }), "nao_encontrado");
  t.recusa("  nem exclui", B({ acao: "excluir_pacote", pacoteId: pid, codigo: codigo1 }), "nao_encontrado");

  t.grupo("Pacotes · importar parte, repetir, o resto");
  const ent = aberto.dados.entradas;
  const zumbiE = ent.find((e) => e.nome === "Zumbi de Sangue"), ritE = ent.find((e) => e.tipo === "ritual");
  const antesB = B({ acao: "listar_homebrew" }).dados.length;
  const opImp = op("imp");
  const imp1 = B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: aberto.rev, opId: opImp, entradas: [zumbiE.id, ritE.id] });
  t.ok("importa só uma criatura e o ritual", imp1.ok && imp1.dados.copiados.length === 2 && !imp1.dados.falhas.length, JSON.stringify(imp1));
  const libB = B({ acao: "listar_homebrew" }).dados;
  const copiaZumbi = libB.find((h) => h.nome === "Zumbi de Sangue");
  t.ok("as cópias estão na biblioteca do amigo, privadas, com id novo e procedência", libB.length === antesB + 2 && copiaZumbi.visibilidade === "privado" && copiaZumbi.id !== zumbi && copiaZumbi.pacote.id === pid && copiaZumbi.pacote.entradaId === zumbiE.id);
  t.ok("  campos nativos preservados (bloco de Ordem)", copiaZumbi.sistema === "ordem" && copiaZumbi.ordem.vd === 40);
  t.ok("  a imagem da criatura veio junto", !!B({ acao: "ler_imagem_criatura", criaturaId: copiaZumbi.id }).dados.imagem);
  const rep = B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: aberto.rev, opId: opImp, entradas: [zumbiE.id, ritE.id] });
  t.ok("repetir o MESMO envio não duplica (responde as mesmas cópias)", rep.ok && rep.dados.copiados.length === 2 && B({ acao: "listar_homebrew" }).dados.length === antesB + 2);
  const rep2 = B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: aberto.rev, opId: op("imp"), entradas: [zumbiE.id] });
  t.ok("um pedido novo da mesma entrada: já existia", rep2.ok && rep2.dados.existentes.length === 1 && !rep2.dados.copiados.length);
  t.ok("a prévia mostra o que já foi importado", B({ acao: "ler_pacote", pacoteId: pid, codigo: codigo1 }).dados.entradas.filter((e) => e.importada).length === 2);

  /* Originais mudam: pacote e cópias não. */
  const z = A({ acao: "ler_homebrew", homebrewId: zumbi }).dados;
  A({ acao: "salvar_homebrew", dados: Object.assign({}, z, { nome: "Zumbi de Sangue (editado)", ordem: { vd: 999, elementos: ["sangue"] } }) });
  A({ acao: "excluir_homebrew", homebrewId: ritual });
  const depois = A({ acao: "ler_pacote", pacoteId: pid }).dados;
  t.ok("editar e apagar os originais não muda o pacote", depois.entradas.find((e) => e.id === zumbiE.id).dados.ordem.vd === 40 && depois.entradas.some((e) => e.id === ritE.id));
  t.ok("  nem as cópias de quem importou", B({ acao: "ler_homebrew", homebrewId: copiaZumbi.id }).dados.ordem.vd === 40);
  t.ok("  o dono vê que o original mudou ou sumiu", depois.entradas.find((e) => e.id === zumbiE.id).origemMudou === true && depois.entradas.find((e) => e.id === ritE.id).origemExiste === false);

  /* O dono mexe no pacote: a prévia velha não importa outra lista. */
  const manter = depois.entradas.map((e) => e.id);
  const ed = salvar(A, { pacoteId: pid, rev: 1, dados: dados("Dossiê do hospital", "ordem", { descricao: "Agora com mais coisa." }), conteudo: { manter, adicionar: [habilidade], atualizar: [] } });
  t.ok("o dono edita (descrição + uma habilidade), rev 2", ed.ok && ed.rev === 2 && ed.dados.qtd === 5, JSON.stringify(ed));
  t.recusa("aba velha do dono (rev 1) recebe conflito", salvar(A, { pacoteId: pid, rev: 1, dados: dados("Velho", "ordem") }), "conflito");
  const velha = B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: aberto.rev, opId: op("imp"), entradas: [ent.find((e) => e.tipo === "arma").id] });
  t.ok("importar com a prévia velha: pacote_mudou, nada copiado", velha.ok === false && velha.erro === "pacote_mudou" && velha.rev === 2 && B({ acao: "listar_homebrew" }).dados.length === antesB + 2);
  const novo = B({ acao: "ler_pacote", pacoteId: pid, codigo: codigo1 });
  const resto = novo.dados.entradas.filter((e) => !e.importada).map((e) => e.id);
  const imp2 = B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: novo.rev, opId: op("imp"), entradas: resto });
  t.ok("importa o restante pela revisão nova", imp2.ok && imp2.dados.copiados.length === 3 && B({ acao: "listar_homebrew" }).dados.length === antesB + 5);
  B({ acao: "excluir_homebrew", homebrewId: copiaZumbi.id });
  const reimp = B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: novo.rev, opId: op("imp"), entradas: [zumbiE.id] });
  t.ok("apagou a cópia: pode importar de novo", reimp.ok && reimp.dados.copiados.length === 1 && B({ acao: "ler_pacote", pacoteId: pid, codigo: codigo1 }).dados.entradas.find((e) => e.id === zumbiE.id).importada);

  /* Atualizar pela criação original (explícito). */
  const at = salvar(A, { pacoteId: pid, rev: 2, dados: dados("Dossiê do hospital", "ordem", { descricao: "Agora com mais coisa." }), conteudo: { manter, adicionar: [habilidade], atualizar: [zumbiE.id] } });
  t.ok("Atualizar pela criação original: a entrada passa a ter o original de agora", at.ok && A({ acao: "ler_pacote", pacoteId: pid }).dados.entradas.find((e) => e.id === zumbiE.id).dados.ordem.vd === 999);
  t.ok("  a habilidade já incluída não entra duas vezes", A({ acao: "ler_pacote", pacoteId: pid }).dados.qtd === 5);
  t.recusa("atualizar uma entrada cuja origem foi apagada", salvar(A, { pacoteId: pid, rev: 3, dados: dados("D", "ordem"), conteudo: { manter, adicionar: [], atualizar: [ritE.id] } }), "nao_encontrado");

  t.grupo("Pacotes · trocar e revogar o código");
  const c2 = A({ acao: "codigo_pacote", pacoteId: pid, tipo: "gerar" }).dados.codigo;
  t.recusa("gerar outro código invalida o anterior", B({ acao: "abrir_pacote_codigo", codigo: codigo1 }), "codigo_invalido");
  t.recusa("  o anterior também não lê pelo id", B({ acao: "ler_pacote", pacoteId: pid, codigo: codigo1 }), "nao_encontrado");
  t.recusa("  nem importa", B({ acao: "importar_pacote", pacoteId: pid, codigo: codigo1, rev: 3, opId: op("imp"), entradas: [zumbiE.id] }), "nao_encontrado");
  t.ok("o código novo abre", B({ acao: "abrir_pacote_codigo", codigo: c2 }).ok);
  A({ acao: "codigo_pacote", pacoteId: pid, tipo: "revogar" });
  t.recusa("revogado: não abre mais", B({ acao: "abrir_pacote_codigo", codigo: c2 }), "codigo_invalido");
  t.iguais("  nem a capa", B({ acao: "ler_capas_pacotes", pacoteIds: [pid], codigo: c2 }).dados, {});
  t.ok("as criações já copiadas continuam na biblioteca do amigo", B({ acao: "listar_homebrew" }).dados.filter((h) => h.pacote && h.pacote.id === pid).length === 5);

  t.grupo("Pacotes · público e de volta a privado");
  const pub = salvar(A, { pacoteId: pid, rev: 3, dados: dados("Dossiê do hospital", "ordem", { visibilidade: "publico" }) });
  t.ok("tornar público (sem mexer no conteúdo)", pub.ok && pub.dados.visibilidade === "publico" && pub.dados.qtd === 5);
  t.ok("aparece na galeria de outra conta", C({ acao: "listar_pacotes", escopo: "publicos" }).dados.some((p) => p.id === pid));
  const lidoC = C({ acao: "ler_pacote", pacoteId: pid });
  t.ok("a outra conta abre pelo link (id) e vê a capa", lidoC.ok && !!C({ acao: "ler_capas_pacotes", pacoteIds: [pid] }).dados[pid]);
  const c3 = A({ acao: "codigo_pacote", pacoteId: pid, tipo: "gerar" }).dados.codigo;
  t.ok("a outra conta importa um público", C({ acao: "importar_pacote", pacoteId: pid, rev: lidoC.rev, opId: op("imp"), entradas: [lidoC.dados.entradas[0].id] }).dados.copiados.length === 1);
  const priv = salvar(A, { pacoteId: pid, rev: 4, dados: dados("Dossiê do hospital", "ordem", { visibilidade: "privado" }) });
  t.ok("de volta a privado", priv.ok && priv.dados.visibilidade === "privado" && priv.dados.temCodigo === false);
  t.recusa("  fecha o acesso pelo id", C({ acao: "ler_pacote", pacoteId: pid }), "nao_encontrado");
  t.recusa("  e o código de antes não serve mais", C({ acao: "abrir_pacote_codigo", codigo: c3 }), "codigo_invalido");
  t.ok("  sai da galeria", !C({ acao: "listar_pacotes", escopo: "publicos" }).dados.some((p) => p.id === pid));

  t.grupo("Pacotes · lançamento incompleto, limites e exclusão");
  const c4 = A({ acao: "codigo_pacote", pacoteId: pid, tipo: "gerar" }).dados.codigo;
  const linha = G.acharPor(G.ABAS.PACOTES_HOMEBREW, "id", pid);
  linha.estado = "montando"; G.atualizarLinha(G.ABAS.PACOTES_HOMEBREW, linha._linha, linha);
  t.recusa("um pacote 'montando' não abre para quem tem o código", B({ acao: "abrir_pacote_codigo", codigo: c4 }), "codigo_invalido");
  t.ok("  o dono vê o estado e pode salvar de novo", A({ acao: "listar_pacotes" }).dados.find((p) => p.id === pid).estado === "montando");
  const conserto = salvar(A, { pacoteId: pid, rev: 5, dados: dados("Dossiê do hospital", "ordem"), conteudo: { manter: A({ acao: "ler_pacote", pacoteId: pid }).dados.entradas.map((e) => e.id), adicionar: [], atualizar: [] } });
  t.ok("  salvar de novo o deixa pronto", conserto.ok && conserto.dados.estado === "pronto" && B({ acao: "abrir_pacote_codigo", codigo: c4 }).ok);
  t.recusa("capa que não é imagem", salvar(A, { pacoteId: pid, rev: 6, dados: dados("D", "ordem"), capa: { acao: "trocar", imagem: "javascript:alert(1)" } }), "dados_invalidos");
  t.recusa("capa grande demais", salvar(A, { pacoteId: pid, rev: 6, dados: dados("D", "ordem"), capa: { acao: "trocar", imagem: "data:image/png;base64," + "A".repeat(100000) } }), "dados_grandes");
  const semCapa = salvar(A, { pacoteId: pid, rev: 6, dados: dados("Dossiê do hospital", "ordem"), capa: { acao: "remover" } });
  t.ok("remover a capa", semCapa.ok && semCapa.dados.temCapa === false && !A({ acao: "ler_capas_pacotes", pacoteIds: [pid] }).dados[pid]);
  const muitos = Array.from({ length: 41 }, (_, i) => hb(A, { tipo: "item", nome: "Item " + i }));
  t.recusa("mais de 40 entradas", salvar(A, { dados: dados("Grande", "universal"), conteudo: { adicionar: muitos } }), "limite");
  t.recusa("importar mais de 40 de uma vez", B({ acao: "importar_pacote", pacoteId: pid, codigo: c4, rev: 7, opId: op("imp"), entradas: muitos }), "dados_invalidos");
  t.recusa("outra conta não exclui", B({ acao: "excluir_pacote", pacoteId: pid }), "nao_encontrado");
  t.ok("o dono exclui", A({ acao: "excluir_pacote", pacoteId: pid }).ok);
  t.recusa("  e o código para de abrir", B({ acao: "abrir_pacote_codigo", codigo: c4 }), "codigo_invalido");
  t.ok("  as cópias importadas continuam", B({ acao: "listar_homebrew" }).dados.filter((h) => h.pacote && h.pacote.id === pid).length === 5);
  t.ok("  as entradas, a capa e os recibos saíram", !G.lerLeves(G.ABAS.PACOTES_HOMEBREW_ENTRADAS).some((e) => e.pacoteId === pid) && !G.lerLeves(G.ABAS.PACOTES_HOMEBREW_IMPORTACOES).some((e) => e.pacoteId === pid));
  t.recusa("o Homebrew individual continua como era: original privado da dona fechado ao amigo", B({ acao: "ler_homebrew", homebrewId: enfermeira }), "nao_encontrado");

  t.grupo("Homebrew por sistema (v9.7) · o servidor confere o modelo");
  const modelo = (sistema, grupo, subtipo) => ({ versao: 1, sistema, grupo, subtipo, def: {} });
  t.recusa("sistema que não existe", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "X", modelo: modelo("inexistente", "item", "arma") } }), "dados_invalidos");
  t.recusa("grupo desconhecido", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "X", modelo: modelo("tormenta20", "classe", "x") } }), "dados_invalidos");
  t.recusa("sistema do registro diferente do modelo", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "X", sistema: "ordem", modelo: modelo("tormenta20", "item", "arma") } }), "dados_invalidos");
  t.recusa("def que não é objeto", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "X", modelo: Object.assign(modelo("tormenta20", "item", "arma"), { def: "1d10" }) } }), "dados_invalidos");
  const espadaT20 = A({ acao: "salvar_homebrew", dados: { tipo: "arma", nome: "Espada T20", modelo: Object.assign(modelo("tormenta20", "item", "arma"), { def: { dano: "1d10" } }) } });
  const lidaT20 = A({ acao: "ler_homebrew", homebrewId: espadaT20.dados.id }).dados;
  t.ok("um item de T20 não entra com o tipo \"arma\" do RAMAFicha: a coluna vira \"item\"", espadaT20.ok && lidaT20.tipo === "item" && lidaT20.sistema === "tormenta20" && lidaT20.modelo.def.dano === "1d10");
  const armaOrdem = A({ acao: "salvar_homebrew", dados: { tipo: "arma", nome: "Arma de Ordem", modelo: modelo("ordem", "item", "arma") } });
  t.ok("um item de Ordem mantém o tipo do RAMAFicha (arma)", armaOrdem.ok && A({ acao: "ler_homebrew", homebrewId: armaOrdem.dados.id }).dados.tipo === "arma");
  const pT20 = salvar(A, { dados: dados("Arsenal de Arton", "tormenta20"), conteudo: { adicionar: [espadaT20.dados.id] } });
  t.ok("pacote de T20 aceita o item nativo de T20", pT20.ok && pT20.dados.qtd === 1);
  const pOrdem = salvar(A, { dados: dados("Errado", "ordem"), conteudo: { adicionar: [espadaT20.dados.id] } });
  t.ok("pacote de Ordem recusa o item de T20, com o motivo (sem converter)", pOrdem.erro === "incompativel" && /Tormenta20/.test(pOrdem.itens[0].motivo));
  const kitU = A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Kit Universal", modelo: modelo("universal", "item", "consumivel"), universal: { acoes: [{ chave: "usar", nome: "Usar" }] } } });
  t.ok("Universal entra em qualquer pacote (até no de BRUTAL)", salvar(A, { dados: dados("Universal no BRUTAL", "brutal"), conteudo: { adicionar: [kitU.dados.id] } }).ok);

  t.grupo("Tipos estruturais (v9.8) · Classe e Elemento de Ordem");
  const vidro = A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Vidro", modelo: Object.assign(modelo("ordem", "estrutural", "elemento"), { def: { chave: "hbe-vidro-abc12345", cor: "#9ad1d4" } }) } });
  t.ok("Elemento de Ordem: gravado com a coluna tipo \"elemento\"", vidro.ok && A({ acao: "ler_homebrew", homebrewId: vidro.dados.id }).dados.tipo === "elemento");
  const classeHb = A({ acao: "salvar_homebrew", dados: { tipo: "habilidade", nome: "Vigilante", modelo: Object.assign(modelo("ordem", "estrutural", "classe"), { def: { pvInicial: { base: 18, atributo: "vig" } } }) } });
  t.ok("Classe de Ordem: coluna tipo \"classe\"", classeHb.ok && A({ acao: "ler_homebrew", homebrewId: classeHb.dados.id }).dados.tipo === "classe");
  /* v9.9: Origem e Trilha de Ordem. */
  const origemHb = A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Vidraceiro", modelo: Object.assign(modelo("ordem", "estrutural", "origem"), { def: { pericias: ["profissao", "percepcao"], poder: "Olho Treinado" } }) } });
  const trilhaHb = A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Lapidador", modelo: Object.assign(modelo("ordem", "estrutural", "trilha"), { def: { classe: "combatente", poderes: [] } }) } });
  t.ok("Origem e Trilha de Ordem: colunas tipo \"origem\" e \"trilha\"", origemHb.ok && trilhaHb.ok && A({ acao: "ler_homebrew", homebrewId: origemHb.dados.id }).dados.tipo === "origem" && A({ acao: "ler_homebrew", homebrewId: trilhaHb.dados.id }).dados.tipo === "trilha");
  t.recusa("Origem estrutural em T20 ainda é recusada", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Origem", modelo: modelo("tormenta20", "estrutural", "origem") } }), "dados_invalidos");
  t.recusa("tipo estrutural que o sistema ainda não usa (Raça em T20) é recusado", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Raça", modelo: modelo("tormenta20", "estrutural", "raca") } }), "dados_invalidos");
  t.recusa("subtipo estrutural desconhecido em Ordem", A({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "X", modelo: modelo("ordem", "estrutural", "raca") } }), "dados_invalidos");
  t.ok("listar com tipos [classe, elemento] devolve os dois", A({ acao: "listar_homebrew", tipos: ["classe", "elemento"] }).dados.length === 2);
  const pOrdemEst = salvar(A, { dados: dados("Livro do Vidro", "ordem"), conteudo: { adicionar: [vidro.dados.id, classeHb.dados.id] } });
  t.ok("pacote de Ordem aceita Classe e Elemento", pOrdemEst.ok && pOrdemEst.dados.tipos.classe === 1 && pOrdemEst.dados.tipos.elemento === 1);
  t.ok("pacote de T20 recusa a Classe de Ordem", salvar(A, { dados: dados("Errado", "tormenta20"), conteudo: { adicionar: [classeHb.dados.id] } }).erro === "incompativel");
}
