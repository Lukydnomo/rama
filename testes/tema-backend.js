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

  /* v2.35: a exibição das pastas da página Personagens. */
  t.grupo("Preferência · exibição das pastas (v2.35)");
  preparar();
  const cris = novaConta("pref_cris"), davi = novaConta("pref_davi");
  const C = comoFn(cris), D = comoFn(davi);
  t.igual("conta sem preferência: a sessão traz 'abas'", C({ acao: "sessao" }).agente.preferencias.exibicaoPastas, "abas");
  t.igual("  e o login também", chamar(globalThis, { acao: "login", usuario: "pref_cris", senha: "senha-de-teste" }).agente.preferencias.exibicaoPastas, "abas");
  C({ acao: "salvar_perfil", dados: { preferencias: { tema: "escuro" } } });
  const gravou = C({ acao: "salvar_perfil", dados: { preferencias: { exibicaoPastas: "icones" } } });
  t.ok("salvar 'icones' responde com o que ficou gravado", gravou.ok && gravou.preferencias.exibicaoPastas === "icones");
  t.igual("  o tema salvo antes continua", gravou.preferencias.tema, "escuro");
  const sessaoC = C({ acao: "sessao" }).agente.preferencias;
  t.ok("a sessão seguinte traz as duas", sessaoC.exibicaoPastas === "icones" && sessaoC.tema === "escuro");
  C({ acao: "salvar_perfil", dados: { preferencias: { tema: "claro" } } });
  t.igual("trocar o tema não mexe na exibição", C({ acao: "sessao" }).agente.preferencias.exibicaoPastas, "icones");
  t.recusa("valor fora da lista é recusado", C({ acao: "salvar_perfil", dados: { preferencias: { exibicaoPastas: "mosaico" } } }), "dados_invalidos");
  t.igual("  e nada mudou", C({ acao: "sessao" }).agente.preferencias.exibicaoPastas, "icones");
  t.igual("a outra conta segue no padrão", D({ acao: "sessao" }).agente.preferencias.exibicaoPastas, "abas");
  C({ acao: "salvar_perfil", dados: { preferencias: { exibicaoPastas: null } } });
  const depoisNull = C({ acao: "sessao" }).agente.preferencias;
  t.ok("null volta ao padrão, sem tocar no tema", depoisNull.exibicaoPastas === "abas" && depoisNull.tema === "claro");

  testarTemasPersonalizaveis({ t, preparar, novaConta, comoFn });
}

/* v2.36: temas personalizáveis — a lista da conta e o tema de cada ficha. */
function testarTemasPersonalizaveis({ t, preparar, novaConta, comoFn }) {
  const ROXO = { id: "t-roxo000001", nome: "Roxo", base: "escuro", valores: {
    fundo: { tipo: "linear", angulo: 180, pontos: [{ cor: "#08080a", pos: 0 }, { cor: "#3a1030", pos: 100 }] },
    superficie: { tipo: "cor", cor: "#1a0a18", alfa: 0.9 },
  } };
  const AZUL = { id: "t-azul000001", nome: "Azul", base: "claro", valores: { superficie: { tipo: "cor", cor: "#ddeeff" } } };

  t.grupo("Temas personalizáveis · a lista da conta (v2.36)");
  preparar();
  const eva = novaConta("tema_eva"), fabio = novaConta("tema_fabio");
  const E = comoFn(eva), F = comoFn(fabio);

  /* As listas do servidor e do navegador são as mesmas, com o mesmo tipo. */
  (0, eval)(Deno.readTextFileSync(new URL("../js/tema-modelo.js", import.meta.url)));
  const MT = globalThis.RAMATemaModelo;
  const tipoNoNavegador = (tok) => tok.num ? "n" : tok.gradiente ? "g" : tok.alfa ? "a" : "c";
  const divergem = MT.TOKENS.filter((tok) => TEMA_TOKENS[tok.chave] !== tipoNoNavegador(tok)).map((tok) => tok.chave)
    .concat(Object.keys(TEMA_TOKENS).filter((k) => !MT.token(k)));
  t.ok("as propriedades aceitas pelo servidor são as do editor, com o mesmo tipo", divergem.length === 0, divergem.join(", "));
  t.igual("  o mesmo máximo de pontos de gradiente", TEMA_MAX_PONTOS, MT.MAX_PONTOS);
  t.igual("  e de temas por conta", TEMA_MAX_TEMAS, MT.MAX_TEMAS);

  const salvo = E({ acao: "salvar_perfil", dados: { preferencias: { tema: "personalizado", temaAtivo: ROXO.id, temas: [ROXO, AZUL] } } });
  t.ok("salvar tema, tema ativo e lista responde com o que ficou gravado", salvo.ok && salvo.preferencias.tema === "personalizado" && salvo.preferencias.temas.length === 2);
  const sessao = E({ acao: "sessao" }).agente.preferencias;
  t.ok("a sessão traz o tema ativo inteiro, para a página pintar", sessao.tema === "personalizado" && sessao.temaAtivo === ROXO.id && sessao.temaPersonalizado.valores.fundo.tipo === "linear");
  t.igual("  mas não a lista inteira", sessao.temas, undefined);
  t.igual("  o ler_perfil traz a lista", E({ acao: "ler_perfil" }).dados.preferencias.temas.length, 2);
  t.igual("  a exibição das pastas segue no padrão", sessao.exibicaoPastas, "abas");
  t.igual("a outra conta não vê nada disso", F({ acao: "sessao" }).agente.preferencias.temaPersonalizado, null);

  E({ acao: "salvar_perfil", dados: { preferencias: { exibicaoPastas: "icones" } } });
  t.igual("salvar outra preferência não apaga os temas", E({ acao: "ler_perfil" }).dados.preferencias.temas.length, 2);
  E({ acao: "salvar_perfil", dados: { preferencias: { tema: "claro" } } });
  const soTema = E({ acao: "ler_perfil" }).dados.preferencias;
  t.ok("um cliente antigo que só manda 'claro' não apaga os temas nem o ativo", soTema.temas.length === 2 && soTema.temaAtivo === ROXO.id && soTema.exibicaoPastas === "icones");
  t.igual("  e a sessão não pinta o personalizado (a conta está no claro)", E({ acao: "sessao" }).agente.preferencias.tema, "claro");

  const sujo = E({ acao: "salvar_perfil", dados: { preferencias: { temas: [Object.assign({}, AZUL, { nome: "<img src=x>Azul", valores: {
    fundo: { tipo: "cor", cor: "url(javascript:alert(1))" },
    texto: { tipo: "linear", angulo: 0, pontos: [{ cor: "#000", pos: 0 }, { cor: "#fff", pos: 100 }] },
    link: { tipo: "cor", cor: "#123", alfa: 0.3 },
    estilo: { tipo: "cor", cor: "#000" },
  } })] } } });
  const azulGravado = sujo.preferencias.temas[0];
  t.ok("cor com url(), gradiente em texto e propriedade inventada ficam de fora", sujo.ok && Object.keys(azulGravado.valores).join() === "link");
  t.ok("  o texto não guarda transparência", azulGravado.valores.link.alfa === 1 && azulGravado.valores.link.cor === "#112233");
  t.ok("  o nome perde < e >", !/[<>]/.test(azulGravado.nome));
  t.recusa("id fora do formato é recusado", E({ acao: "salvar_perfil", dados: { preferencias: { temas: [Object.assign({}, AZUL, { id: "../x" })] } } }), "dados_invalidos");
  t.recusa("id repetido é recusado", E({ acao: "salvar_perfil", dados: { preferencias: { temas: [AZUL, AZUL] } } }), "dados_invalidos");
  t.recusa("base desconhecida é recusada", E({ acao: "salvar_perfil", dados: { preferencias: { temas: [Object.assign({}, AZUL, { base: "neon" })] } } }), "dados_invalidos");
  const treze = Array.from({ length: 13 }, (_, i) => Object.assign({}, AZUL, { id: "t-" + i }));
  t.recusa("mais de 12 temas é recusado", E({ acao: "salvar_perfil", dados: { preferencias: { temas: treze } } }), "dados_invalidos");
  t.recusa("lista que não é lista é recusada", E({ acao: "salvar_perfil", dados: { preferencias: { temas: "x" } } }), "dados_invalidos");
  t.recusa("tema ativo fora do formato é recusado", E({ acao: "salvar_perfil", dados: { preferencias: { temaAtivo: "<x>" } } }), "dados_invalidos");
  const pontos = Array.from({ length: 8 }, (_, i) => ({ cor: "#abcdef", alfa: 0.55, pos: i * 12.5 }));
  const gordo = (i) => ({ id: "t-gordo" + i, nome: "Tema bem comprido de teste " + i, base: "claro", valores: Object.fromEntries(MT.TOKENS.map((tok) =>
    [tok.chave, tok.num ? { tipo: "num", valor: 0.5 } : tok.gradiente ? { tipo: "radial", forma: "circulo", x: 33, y: 66, pontos } : { tipo: "cor", cor: "#abcdef", alfa: 0.5 }])) });
  const grande = E({ acao: "salvar_perfil", dados: { preferencias: { temas: Array.from({ length: 12 }, (_, i) => gordo(i)) } } });
  t.recusa("passar do tamanho da célula recusa o pedido inteiro", grande, "dados_grandes");
  t.igual("  e nada mudou", E({ acao: "ler_perfil" }).dados.preferencias.temas[0].id, AZUL.id);

  E({ acao: "salvar_perfil", dados: { preferencias: { tema: "personalizado", temaAtivo: ROXO.id, temas: [ROXO, AZUL] } } });
  const excluiu = E({ acao: "salvar_perfil", dados: { preferencias: { temas: [AZUL] } } });
  t.ok("excluir o tema ativo sem escolher outro: a conta volta ao aparelho", excluiu.ok && excluiu.preferencias.tema === "sistema");
  t.igual("  a sessão nunca fica num personalizado que não existe", E({ acao: "sessao" }).agente.preferencias.temaPersonalizado, null);
  const troca = E({ acao: "salvar_perfil", dados: { preferencias: { tema: "personalizado", temaAtivo: AZUL.id, temas: [AZUL] } } });
  t.ok("excluir escolhendo o substituto grava o substituto", troca.ok && troca.preferencias.temaAtivo === AZUL.id && E({ acao: "sessao" }).agente.preferencias.temaPersonalizado.id === AZUL.id);
  const linhaE = acharPor(ABAS.PERFIS, "userId", eva.id);
  linhaE.preferenciasJson = JSON.stringify({ tema: "personalizado", temaAtivo: "t-x", temas: [{ id: "t-x", base: "roxo" }] });
  atualizarLinha(ABAS.PERFIS, linhaE._linha, linhaE);
  const velho = E({ acao: "sessao" }).agente.preferencias;
  t.ok("dado gravado inválido não derruba a sessão: sem tema personalizado", velho.temaPersonalizado === null);

  t.grupo("Temas personalizáveis · o tema de cada ficha (v2.36)");
  const fichaBase = (extra) => Object.assign({ nome: "Ficha Tema", tipoFicha: "universal", schemaVersion: 16, atributos: [], status: [] }, extra || {});
  const criada = E({ acao: "criar_personagem", dados: fichaBase({ aparencia: { v: 1, modo: "personalizado", tema: Object.assign({}, ROXO, { valores: Object.assign({}, ROXO.valores, { botao: { tipo: "cor", cor: "expression(alert(1))" } }) }) } }) });
  t.ok("criar com tema próprio grava o tema", criada.ok);
  let lida = E({ acao: "ler_personagem", personagemId: criada.dados.id });
  t.ok("  saneado: o valor inválido fica de fora, o resto fica", lida.dados.aparencia.modo === "personalizado" && !lida.dados.aparencia.tema.valores.botao && lida.dados.aparencia.tema.valores.fundo.tipo === "linear");
  t.igual("  a cópia na ficha não guarda id de tema da conta", lida.dados.aparencia.tema.id, undefined);
  const lixo = E({ acao: "criar_personagem", dados: fichaBase({ aparencia: "<style>body{}</style>" }) });
  t.igual("aparência que não é bloco vira 'usar o tema da conta'", E({ acao: "ler_personagem", personagemId: lixo.dados.id }).dados.aparencia.modo, "conta");

  const antigo = Object.assign({}, lida.dados, { schemaVersion: 15 });
  delete antigo.aparencia;
  let g = E({ acao: "salvar_personagem", personagemId: criada.dados.id, rev: lida.rev, dados: antigo });
  lida = E({ acao: "ler_personagem", personagemId: criada.dados.id });
  t.ok("uma aba antiga (schema 15, sem o campo) não apaga o tema da ficha", g.ok && lida.dados.aparencia.modo === "personalizado");
  g = E({ acao: "salvar_personagem", personagemId: criada.dados.id, rev: lida.rev, dados: Object.assign({}, lida.dados, { aparencia: { v: 1, modo: "conta" } }) });
  lida = E({ acao: "ler_personagem", personagemId: criada.dados.id });
  t.ok("a versão nova volta ao tema da conta mandando { modo: 'conta' }", g.ok && lida.dados.aparencia.modo === "conta" && !lida.dados.aparencia.tema);
  E({ acao: "salvar_personagem", personagemId: criada.dados.id, rev: lida.rev, dados: Object.assign({}, lida.dados, { aparencia: { v: 1, modo: "escuro" } }) });
  const dup = E({ acao: "duplicar_personagem", personagemId: criada.dados.id });
  t.igual("duplicar leva o tema junto", E({ acao: "ler_personagem", personagemId: dup.dados.id }).dados.aparencia.modo, "escuro");
}

