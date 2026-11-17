/* v9.14 — imagem opcional de qualquer criação do Homebrew: gravar com
   miniatura, ler em lote (só o que a conta alcança), remover, a imagem
   antiga sem miniatura servindo a lista, e o pacote levando a imagem de
   qualquer tipo, lida pela entrada (nunca pela original). */
export function testarImagensDoHomebrewBackend({ t, preparar, novaConta, comoFn }) {
  preparar();
  const ana = novaConta("hbi_ana"), beto = novaConta("hbi_beto");
  const A = comoFn(ana), B = comoFn(beto);
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const PNG2 = PNG.replace("AAAAAEl", "AAAAAGl");
  const MINI = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
  let n = 0;
  const op = (p) => "op-hbi-" + p + "-" + String(++n).padStart(4, "0");
  const hb = (como, dados) => como({ acao: "salvar_homebrew", dados }).dados.id;

  const magia = hb(A, { tipo: "habilidade", sistema: "tormenta20", nome: "Lança de Gelo", modelo: { versao: 1, sistema: "tormenta20", grupo: "habilidade", subtipo: "magia", def: { circulo: 1 } } });
  const espada = hb(A, { tipo: "arma", nome: "Espada sintética", dano: "1d8" });
  const antigo = hb(A, { tipo: "criatura", sistema: "ordem", nome: "Retrato antigo", ordem: { vd: 20, elementos: ["sangue"] } });
  const privada = hb(A, { tipo: "item", nome: "Item privado" });
  const publica = hb(A, { tipo: "item", nome: "Item público", visibilidade: "publico" });

  t.grupo("Homebrew · imagem de qualquer criação");
  t.ok("uma magia de T20 guarda o símbolo com a miniatura", A({ acao: "salvar_imagem_criatura", criaturaId: magia, imagem: PNG, miniatura: MINI }).ok);
  t.igual("  e a consulta lê a imagem inteira", A({ acao: "ler_imagem_criatura", criaturaId: magia }).dados.imagem, PNG);
  t.ok("uma arma guarda a ilustração", A({ acao: "salvar_imagem_criatura", criaturaId: espada, imagem: PNG2, miniatura: MINI }).ok);
  t.ok("(um retrato de antes, sem miniatura)", A({ acao: "salvar_imagem_criatura", criaturaId: antigo, imagem: PNG }).ok);
  A({ acao: "salvar_imagem_criatura", criaturaId: privada, imagem: PNG, miniatura: MINI });
  A({ acao: "salvar_imagem_criatura", criaturaId: publica, imagem: PNG, miniatura: MINI });
  let l = A({ acao: "ler_miniaturas_homebrew", ids: [magia, espada, antigo, "nao-existe-1"] });
  t.ok("o lote devolve as miniaturas (e só de quem tem imagem)", l.ok && l.dados[magia].miniatura === MINI && l.dados[espada].miniatura === MINI && !l.dados["nao-existe-1"]);
  t.igual("o retrato antigo, sem miniatura, aparece com a imagem inteira (sem novo envio)", l.dados[antigo].miniatura, PNG);
  l = B({ acao: "ler_miniaturas_homebrew", ids: [privada, publica] });
  t.ok("outra conta: a pública sim, a privada não", l.ok && !!l.dados[publica] && !l.dados[privada]);
  t.recusa("e não lê a imagem inteira da privada", B({ acao: "ler_imagem_criatura", criaturaId: privada }), "nao_encontrado");
  t.recusa("nem grava na criação de outra conta", B({ acao: "salvar_imagem_criatura", criaturaId: publica, imagem: PNG2 }), "nao_encontrado");
  t.igual("  (a pública continua com a imagem dela)", A({ acao: "ler_imagem_criatura", criaturaId: publica }).dados.imagem, PNG);
  t.recusa("miniatura que não é imagem", A({ acao: "salvar_imagem_criatura", criaturaId: espada, imagem: PNG, miniatura: "javascript:x" }), "dados_invalidos");
  t.recusa("lote vazio ou grande demais", A({ acao: "ler_miniaturas_homebrew", ids: [] }), "dados_invalidos");
  t.igual("uma imagem recusada não troca a anterior", A({ acao: "ler_imagem_criatura", criaturaId: espada }).dados.imagem, PNG2);
  t.ok("remover (imagem vazia) apaga a linha", A({ acao: "salvar_imagem_criatura", criaturaId: privada, imagem: "" }).ok &&
    !A({ acao: "ler_imagem_criatura", criaturaId: privada }).dados.imagem && !A({ acao: "ler_miniaturas_homebrew", ids: [privada] }).dados[privada]);

  t.grupo("Homebrew · imagem nos pacotes (qualquer tipo)");
  const pacote = A({ acao: "salvar_pacote", opId: op("s"), dados: { nome: "Arsenal ilustrado", sistema: "tormenta20", descricao: "Sintético.", visibilidade: "publico" },
    conteudo: { adicionar: [magia, espada] } });
  t.ok("(pacote com a magia e a arma)", pacote.ok, JSON.stringify(pacote));
  const lido = B({ acao: "ler_pacote", pacoteId: pacote.dados.id });
  const eMagia = lido.dados.entradas.filter((e) => e.nome === "Lança de Gelo")[0];
  const eEspada = lido.dados.entradas.filter((e) => e.nome === "Espada sintética")[0];
  t.ok("as duas entradas têm imagem", eMagia.temImagem && eEspada.temImagem);
  let ip = B({ acao: "ler_imagens_pacote", pacoteId: pacote.dados.id, entradas: [eMagia.id, eEspada.id] });
  t.ok("as miniaturas vêm pela entrada", ip.ok && ip.dados[eMagia.id] === MINI && ip.dados[eEspada.id] === MINI);
  ip = B({ acao: "ler_imagens_pacote", pacoteId: pacote.dados.id, entradas: [eEspada.id], completa: true });
  t.igual("  e a inteira, na consulta", ip.dados[eEspada.id], PNG2);
  A({ acao: "salvar_imagem_criatura", criaturaId: espada, imagem: PNG, miniatura: MINI });
  t.igual("trocar a imagem da original não muda a do pacote (a daquela versão)", B({ acao: "ler_imagens_pacote", pacoteId: pacote.dados.id, entradas: [eEspada.id], completa: true }).dados[eEspada.id], PNG2);
  t.ok("a id da entrada não abre a criação original", !B({ acao: "ler_miniaturas_homebrew", ids: [eEspada.id] }).dados[eEspada.id]);
  const imp = B({ acao: "importar_pacote", pacoteId: pacote.dados.id, rev: lido.dados.rev, opId: op("imp"), entradas: [eMagia.id, eEspada.id] });
  t.ok("(importado)", imp.ok && imp.dados.copiados.length === 2);
  const novaEspada = imp.dados.copiados.filter((c) => c.nome === "Espada sintética")[0].homebrewId;
  t.igual("a cópia importada leva a imagem da entrada", B({ acao: "ler_imagem_criatura", criaturaId: novaEspada }).dados.imagem, PNG2);
  t.igual("  e a miniatura", B({ acao: "ler_miniaturas_homebrew", ids: [novaEspada] }).dados[novaEspada].miniatura, MINI);
  const privPac = A({ acao: "salvar_pacote", opId: op("s"), dados: { nome: "Privado", sistema: "tormenta20", descricao: "x", visibilidade: "privado" }, conteudo: { adicionar: [magia] } });
  const ePriv = A({ acao: "ler_pacote", pacoteId: privPac.dados.id }).dados.entradas[0];
  t.recusa("pacote privado: sem o código, nem a miniatura", B({ acao: "ler_imagens_pacote", pacoteId: privPac.dados.id, entradas: [ePriv.id] }), "nao_encontrado");
  t.ok("excluir a criação leva a imagem dela", A({ acao: "excluir_homebrew", homebrewId: magia }).ok && !A({ acao: "ler_miniaturas_homebrew", ids: [magia] }).dados[magia]);
}
