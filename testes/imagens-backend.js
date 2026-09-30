export function testarGifBackend({ t, preparar, novaConta, comoFn }) {
  t.grupo("GIFs · armazenamento original e permissões");
  preparar();
  const dona = novaConta("gif_dona"), outra = novaConta("gif_outra");
  const D = comoFn(dona), X = comoFn(outra);
  const gif = "data:image/gif;base64,R0lGODlhIAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICgAAACwAAAAAIAAQAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgAh+QQIFAAAACwAAAAAIAAQAIEAAP8AAAAAAAAAAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgA7";
  const ficha = D({ acao: "criar_personagem", dados: { nome: "Animado", aliados: [{ id: "a", criatura: { nome: "Aliado" }, imagem: gif }] } }).dados.id;
  t.ok("GIF de personagem é aceito", D({ acao: "salvar_foto", personagemId: ficha, imagem: gif }).ok);
  t.igual("foto reabre sem alterar bytes", D({ acao: "ler_foto", personagemId: ficha }).dados.imagem, gif);
  t.igual("GIF de aliado sobrevive aos blocos", D({ acao: "ler_personagem", personagemId: ficha }).dados.aliados[0].imagem, gif);
  t.ok("GIF de avatar é aceito", D({ acao: "salvar_perfil", dados: { avatar: gif } }).ok);
  t.igual("avatar mantém bytes", D({ acao: "ler_avatares", userIds: [dona.id] }).dados[dona.id].imagem, gif);
  const criatura = D({ acao: "salvar_homebrew", dados: { tipo: "criatura", nome: "Animada", visibilidade: "privado" } }).dados.id;
  t.ok("GIF de criatura é aceito", D({ acao: "salvar_imagem_criatura", criaturaId: criatura, imagem: gif }).ok);
  t.igual("criatura mantém bytes", D({ acao: "ler_imagem_criatura", criaturaId: criatura }).dados.imagem, gif);
  t.recusa("imagem animada privada continua protegida", X({ acao: "ler_imagem_criatura", criaturaId: criatura }));
  const mesa = D({ acao: "criar_campanha", dados: { nome: "Animação" } }).dados.id;
  t.ok("capa GIF é aceita", D({ acao: "salvar_capa_campanha", campanhaId: mesa, imagem: gif, largura: 32, altura: 16 }).ok);
  t.igual("capa reabre sem alterar bytes", D({ acao: "ler_capa_campanha", campanhaId: mesa }).dados.imagem, gif);
  t.recusa("terceiro não troca capa GIF", X({ acao: "salvar_capa_campanha", campanhaId: mesa, imagem: gif, largura: 32, altura: 16 }));
  t.recusa("GIF acima do limite de célula é recusado", D({ acao: "salvar_capa_campanha", campanhaId: mesa,
    imagem: "data:image/gif;base64," + "A".repeat(50000), largura: 32, altura: 16 }), "dados_grandes");
  t.igual("falha não destrói a capa anterior", D({ acao: "ler_capa_campanha", campanhaId: mesa }).dados.imagem, gif);
  const doc = D({ acao: "salvar_documento", campanhaId: mesa, dados: { nome: "Documento animado", visiveis: [] } }).dados.id;
  t.ok("documento aceita GIF", D({ acao: "salvar_imagem_documento", campanhaId: mesa, documentoId: doc, imagem: gif }).ok);
  t.igual("documento mantém bytes", D({ acao: "ler_imagem_documento", campanhaId: mesa, documentoId: doc }).dados.imagem, gif);
}
