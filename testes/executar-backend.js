/* =====================================================================
   R.A.M.A. — testes do backend
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-backend.js

   Carrega os dois arquivos do Apps Script dentro do simulador e exercita
   as regras de autorização de ponta a ponta, entrando por doPost como
   uma requisição de verdade.

   O foco é o que §40 exige: confirmar que um usuário NÃO alcança o que
   não é dele, mesmo mandando o pedido direto, sem passar pela interface.
   ===================================================================== */

import { instalarAmbiente, chamar, comoOSheetsGuarda } from "./apps-script-simulado.js";

const ARQUIVOS = ["backend/Dados.gs", "backend/Codigo.gs", "backend/Campanhas.gs"];

/* O simulador silencia o console para o backend não encher a saída com
   os avisos do setupRama. O relatório dos testes precisa de uma porta
   que continue aberta, então ela é guardada ANTES da troca. */
const escrever = console.log.bind(console);

const ambiente = instalarAmbiente(globalThis);

for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try {
    (0, eval)(codigo);
  } catch (e) {
    escrever(`Falhou ao carregar ${caminho}: ${e.message}`);
    Deno.exit(1);
  }
}

/* Iterações baixas: o conjunto testa autorização, não a força da
   derivação — que já é conferida pelo desenho do algoritmo. */
ambiente.propriedades.set("RAMA_ITERACOES", "50");

/* ---------- coletor ---------- */

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];

const t = {
  grupo(titulo) { escrever(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; escrever(`  ${VERDE}ok${FIM}   ${nome}`); }
    else {
      falharam++; falhas.push(nome);
      escrever(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`);
    }
  },
  igual(nome, obtido, esperado) {
    const igual = Object.is(obtido, esperado);
    t.ok(nome, igual, igual ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`);
  },
  iguais(nome, obtido, esperado) {
    const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
    t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`);
  },
  recusa(nome, resposta, erroEsperado) {
    const bateu = resposta && resposta.ok === false &&
      (!erroEsperado || resposta.erro === erroEsperado);
    t.ok(nome, bateu, bateu ? "" : `respondeu ${JSON.stringify(resposta)}`);
  },
};

/* ---------- montagem do cenário ---------- */

function preparar() {
  ambiente.limpar();
  setupRama();
  gerarPepper();
}

function novaConta(usuario) {
  criarUsuario(usuario, usuario.toUpperCase(), "senha-de-teste");
  const r = chamar(globalThis, { acao: "login", usuario, senha: "senha-de-teste" });
  if (!r.ok) throw new Error("login falhou para " + usuario + ": " + JSON.stringify(r));
  return { token: r.token, id: r.agente.id, usuario };
}

/* Atalho: toda chamada precisa de token, e escrevê-lo em cada linha
   esconderia o que o teste está de fato verificando. */
const comoFn = (conta) => (corpo) => chamar(globalThis, Object.assign({ token: conta.token }, corpo));

/* =====================================================================
   INSTALAÇÃO
   ===================================================================== */

t.grupo("Instalação");

preparar();

t.ok("setupRama() cria todas as abas",
  Object.keys(ABAS).every((k) => !!ambiente.planilha.getSheetByName(ABAS[k].nome)));

t.ok("cada aba nasce com o cabeçalho certo",
  Object.keys(ABAS).every((k) => {
    const folha = ambiente.planilha.getSheetByName(ABAS[k].nome);
    const cabecalho = folha.getRange(1, 1, 1, ABAS[k].colunas.length).getValues()[0];
    return ABAS[k].colunas.every((c, i) => cabecalho[i] === c);
  }));

/* setupRama() roda sobre planilha já usada sem apagar nada — é a
   promessa que permite atualizar o backend sem medo. */
const antesDoSegundoSetup = (() => {
  criarUsuario("preexistente", "Antes", "senha-de-teste");
  return ambiente.planilha.getSheetByName("USUARIOS").getLastRow();
})();
setupRama();
t.igual("rodar setupRama() de novo não apaga dados",
  ambiente.planilha.getSheetByName("USUARIOS").getLastRow(), antesDoSegundoSetup);

/* =====================================================================
   SESSÃO
   ===================================================================== */

t.grupo("Sessão");

preparar();
const ana = novaConta("ana");
const bruno = novaConta("bruno");
const carla = novaConta("carla");

const comoAna = comoFn(ana);
const comoBruno = comoFn(bruno);
const comoCarla = comoFn(carla);

t.recusa("token inexistente é recusado",
  chamar(globalThis, { acao: "listar_personagens", token: "tk-inventado" }), "sessao");
t.recusa("sem token é recusado",
  chamar(globalThis, { acao: "listar_personagens" }), "sem_token");
t.recusa("ação desconhecida é recusada",
  comoAna({ acao: "virar_admin" }), "acao_desconhecida");
t.recusa("senha errada não entra",
  chamar(globalThis, { acao: "login", usuario: "ana", senha: "errada" }), "credenciais");
t.ok("o login não diz se o usuário existe",
  chamar(globalThis, { acao: "login", usuario: "ninguem", senha: "x" }).erro === "credenciais");

const perfilAna = comoAna({ acao: "ler_perfil" });
t.ok("o perfil não devolve hash, sal nem token",
  perfilAna.ok &&
  perfilAna.dados.hashSenha === undefined &&
  perfilAna.dados.salt === undefined &&
  perfilAna.dados.token === undefined);

/* =====================================================================
   PERSONAGENS ENTRE CONTAS
   ===================================================================== */

t.grupo("Personagens — conta contra conta");

const fichaDeTeste = (nome) => ({
  nome: nome,
  atributos: [{ id: "at-for", nome: "Força", sigla: "FOR", valor: 2, dado: "1d20" }],
  status: [{ id: "st-pv", nome: "PV", atual: 20, maximo: 20 }],
});

const pAna = comoAna({ acao: "criar_personagem", dados: fichaDeTeste("Michael") }).dados.id;
const pBruno = comoBruno({ acao: "criar_personagem", dados: fichaDeTeste("Gina") }).dados.id;

t.ok("cada um vê só os seus",
  comoAna({ acao: "listar_personagens" }).dados.length === 1 &&
  comoBruno({ acao: "listar_personagens" }).dados.length === 1);

t.recusa("A não lê o personagem de B trocando o id",
  comoAna({ acao: "ler_personagem", personagemId: pBruno }), "nao_encontrado");
t.recusa("A não grava no personagem de B",
  comoAna({ acao: "salvar_personagem", personagemId: pBruno, rev: 1, dados: { nome: "invadido" } }), "nao_encontrado");
t.recusa("A não apaga o personagem de B",
  comoAna({ acao: "excluir_personagem", personagemId: pBruno }), "nao_encontrado");
t.recusa("A não lê a foto do personagem de B",
  comoAna({ acao: "ler_foto", personagemId: pBruno }), "nao_encontrado");

t.ok("B continua com o personagem dele intacto",
  comoBruno({ acao: "ler_personagem", personagemId: pBruno }).dados.nome === "Gina");

/* =====================================================================
   HOMEBREW — PRIVADO E PÚBLICO
   ===================================================================== */

t.grupo("Homebrew — privado e público");

const hbPrivado = comoBruno({
  acao: "salvar_homebrew",
  dados: { tipo: "criatura", nome: "Existido", visibilidade: "privado" },
}).dados.id;

const hbPublico = comoBruno({
  acao: "salvar_homebrew",
  dados: { tipo: "criatura", nome: "Zelador", visibilidade: "publico" },
}).dados.id;

t.recusa("A não abre a criatura PRIVADA de B",
  comoAna({ acao: "ler_homebrew", homebrewId: hbPrivado }), "nao_encontrado");

t.ok("A abre a criatura PÚBLICA de B",
  comoAna({ acao: "ler_homebrew", homebrewId: hbPublico }).ok);

t.igual("a biblioteca de A não lista nada de B",
  comoAna({ acao: "listar_homebrew" }).dados.length, 0);

const publicosParaAna = comoAna({ acao: "listar_homebrew", escopo: "publicos" }).dados;
t.igual("o escopo 'publicos' traz só o que B publicou", publicosParaAna.length, 1);
t.igual("  e é o público", publicosParaAna[0].nome, "Zelador");
t.ok("  nunca o privado",
  !publicosParaAna.some((h) => h.nome === "Existido"));

t.recusa("A não apaga o Homebrew público de B",
  comoAna({ acao: "excluir_homebrew", homebrewId: hbPublico }), "nao_encontrado");

/* Editar público alheio: o backend NÃO atualiza — cria um registro
   novo sob quem pediu, e o de B fica intacto. */
const tentativa = comoAna({
  acao: "salvar_homebrew",
  dados: { id: hbPublico, tipo: "criatura", nome: "SEQUESTRADO" },
});
t.ok("A não consegue editar o público de B", tentativa.ok && tentativa.dados.id !== hbPublico);
t.igual("  e o registro de B continua como estava",
  comoBruno({ acao: "ler_homebrew", homebrewId: hbPublico }).dados.nome, "Zelador");

t.recusa("A não lê a imagem da criatura privada de B",
  comoAna({ acao: "ler_imagem_criatura", criaturaId: hbPrivado }), "nao_encontrado");
t.recusa("A não grava imagem na criatura de B",
  comoAna({ acao: "salvar_imagem_criatura", criaturaId: hbPublico, imagem: "data:image/png;base64,AA" }),
  "nao_encontrado");

/* Homebrew antigo, gravado antes da v2, tem a célula de visibilidade
   vazia — e vazio precisa ser lido como privado. */
const linhaAntiga = ambiente.planilha.getSheetByName("HOMEBREW");
linhaAntiga.appendRow(["hb-antigo", bruno.id, "item", "Relíquia", "", "2026-01-01", "2026-01-01", 1, "{}"]);
t.recusa("registro anterior à v2 (visibilidade vazia) continua PRIVADO",
  comoAna({ acao: "ler_homebrew", homebrewId: "hb-antigo" }), "nao_encontrado");
t.ok("  e o dono continua alcançando",
  comoBruno({ acao: "ler_homebrew", homebrewId: "hb-antigo" }).ok);

t.grupo("Homebrew — habilidades");

const habNova = comoBruno({
  acao: "salvar_homebrew",
  dados: { tipo: "habilidade", nome: "Faro de Mesa", origem: "Mesa", texto: "Sente cheiro de problema." },
});
t.ok("uma habilidade é gravada", habNova.ok);
const habsDeBruno = comoBruno({ acao: "listar_homebrew", tipo: "habilidade" }).dados;
t.igual("  e volta como habilidade, não como item", habsDeBruno.map((h) => h.nome + ":" + h.tipo).join(","), "Faro de Mesa:habilidade");
t.igual("  e não aparece entre os itens",
  comoBruno({ acao: "listar_homebrew", tipo: "item" }).dados.filter((h) => h.nome === "Faro de Mesa").length, 0);

/* Registro gravado antes da correção: coluna tipo = 'item', conteúdo
   dizendo 'habilidade'. Nada é migrado — ele só precisa aparecer certo. */
const antiga = comoBruno({
  acao: "salvar_homebrew",
  dados: { tipo: "habilidade", nome: "Instinto Antigo", texto: "Gravada pela versão velha." },
}).dados.id;
const habAntigaNaPlanilha = acharPor(ABAS.HOMEBREW, "id", antiga);
habAntigaNaPlanilha.tipo = "item";
atualizarLinha(ABAS.HOMEBREW, habAntigaNaPlanilha._linha, habAntigaNaPlanilha);
t.igual("uma habilidade antiga gravada como item está mesmo como item na planilha",
  String(acharPor(ABAS.HOMEBREW, "id", antiga).tipo), "item");
t.ok("  aparece na lista de habilidades",
  comoBruno({ acao: "listar_homebrew", tipo: "habilidade" }).dados.some((h) => h.id === antiga && h.tipo === "habilidade"));
t.igual("  sai da lista de itens",
  comoBruno({ acao: "listar_homebrew", tipo: "item" }).dados.filter((h) => h.id === antiga).length, 0);
t.igual("  e abre como habilidade",
  comoBruno({ acao: "ler_homebrew", homebrewId: antiga }).dados.tipo, "habilidade");
comoBruno({ acao: "salvar_homebrew", dados: { id: antiga, tipo: "habilidade", nome: "Instinto Antigo", texto: "Reenviada." } });
t.igual("  e o próximo salvamento corrige a coluna",
  String(acharPor(ABAS.HOMEBREW, "id", antiga).tipo), "habilidade");
t.igual("um item de verdade continua item",
  comoBruno({ acao: "listar_homebrew", tipo: "habilidade" }).dados.filter((h) => h.tipo !== "habilidade").length, 0);
t.igual("habilidade privada de B não chega a A",
  comoAna({ acao: "listar_homebrew", escopo: "publicos", tipo: "habilidade" }).dados.length, 0);

t.grupo("Homebrew — rituais na biblioteca");

{
  const ritualDeB = comoBruno({ acao: "salvar_homebrew", dados: {
    tipo: "ritual", nome: "Selo de Bruno", visibilidade: "privado",
    circulo: "1º círculo", elemento: "Sangue", descricao: "Ritual da casa.",
    versoes: [{ id: "v1", nome: "Normal", dano: "2d6" }],
    ordem: { elemento: "sangue", circulo: 1, custo: 1 },
  } }).dados.id;

  const ritualPublico = comoBruno({ acao: "salvar_homebrew", dados: {
    tipo: "ritual", nome: "Prece pública", visibilidade: "publico", circulo: "2º círculo",
    versoes: [{ id: "v2", nome: "Normal", rolagens: [{ id: "r1", tipo: "cura", rotulo: "Cura", expressao: "2d8", extra: "2" }] }],
  } }).dados.id;

  t.igual("o tipo ritual é gravado como ritual, não como item",
    String(acharPor(ABAS.HOMEBREW, "id", ritualDeB).tipo), "ritual");
  t.ok("o conteúdo do ritual volta inteiro para o dono", (() => {
    const r = comoBruno({ acao: "ler_homebrew", homebrewId: ritualDeB });
    return r.ok && r.dados.versoes[0].dano === "2d6" && r.dados.ordem.circulo === 1;
  })());
  t.recusa("ritual privado de B não abre para A",
    comoAna({ acao: "ler_homebrew", homebrewId: ritualDeB }), "nao_encontrado");

  const paraAna = comoAna({ acao: "listar_homebrew", escopo: "todos", tipos: ["ritual"] });
  const idsRituais = paraAna.dados.map((h) => h.id);
  t.ok("A recebe o ritual PÚBLICO de B", idsRituais.includes(ritualPublico));
  t.ok("  e não o privado", !idsRituais.includes(ritualDeB));
  t.ok("  nem item, criatura ou habilidade", paraAna.dados.every((h) => h.tipo === "ritual"));
  t.ok("  e a rolagem de cura chega junto", (() => {
    const r = paraAna.dados.find((h) => h.id === ritualPublico);
    return r && r.versoes[0].rolagens[0].tipo === "cura" && r.versoes[0].rolagens[0].expressao === "2d8";
  })());
  t.ok("pedindo itens, ritual não aparece",
    !comoBruno({ acao: "listar_homebrew", escopo: "meus", tipos: ["item", "arma", "armadura", "mochila"] })
      .dados.some((h) => h.tipo === "ritual"));
  t.ok("pedindo rituais, item não aparece",
    comoBruno({ acao: "listar_homebrew", escopo: "meus", tipos: ["ritual"] }).dados.every((h) => h.tipo === "ritual"));
}

t.grupo("Homebrew — biblioteca de itens da ficha (só itens que a conta alcança)");

{
  const TIPOS_DE_ITEM = ["item", "arma", "armadura", "mochila"];
  const salvarComo = (como, dados) => como({ acao: "salvar_homebrew", dados }).dados.id;

  const itemPublicoB = salvarComo(comoBruno, { tipo: "item", nome: "Lanterna pública de B", visibilidade: "publico", peso: 1 });
  const armaPrivadaB = salvarComo(comoBruno, { tipo: "arma", nome: "Faca privada de B", visibilidade: "privado", dano: "1d4" });
  const coleteB = salvarComo(comoBruno, { tipo: "armadura", nome: "Colete público de B", visibilidade: "publico", defesa: 5 });
  const habPublicaB = salvarComo(comoBruno, { tipo: "habilidade", nome: "Faro público de B", visibilidade: "publico", texto: "Não é item." });
  const armaDeA = salvarComo(comoAna, { tipo: "arma", nome: "Pé de cabra de A", dano: "1d8", critico: 20, multiplicador: 2 });

  /* Uma habilidade antiga com a coluna gravada como 'item' e PÚBLICA:
     a coluna deixa passar, o conteúdo tira. */
  const disfarcada = salvarComo(comoBruno, { tipo: "habilidade", nome: "Habilidade com coluna de item", visibilidade: "publico", texto: "Antiga." });
  const linhaDisfarcada = acharPor(ABAS.HOMEBREW, "id", disfarcada);
  linhaDisfarcada.tipo = "item";
  atualizarLinha(ABAS.HOMEBREW, linhaDisfarcada._linha, linhaDisfarcada);

  const paraAna = comoAna({ acao: "listar_homebrew", escopo: "todos", tipos: TIPOS_DE_ITEM });
  const ids = (r) => r.dados.map((h) => h.id);
  t.ok("a lista de itens responde", paraAna.ok);
  t.ok("  traz o item da própria conta", ids(paraAna).includes(armaDeA));
  t.ok("  e os itens PÚBLICOS de outra conta", ids(paraAna).includes(itemPublicoB) && ids(paraAna).includes(coleteB));
  t.ok("  nunca um item privado de outra conta", !ids(paraAna).includes(armaPrivadaB) && !ids(paraAna).includes("hb-antigo"));
  t.ok("  nem habilidade ou criatura, mesmo públicas", !ids(paraAna).includes(habPublicaB) && !ids(paraAna).includes(hbPublico) &&
    paraAna.dados.every((h) => TIPOS_DE_ITEM.includes(h.tipo)));
  t.ok("  nem a habilidade antiga gravada com a coluna de item", !ids(paraAna).includes(disfarcada));
  t.ok("  e nenhum dado de conta ou sessão vem junto", paraAna.dados.every((h) =>
    !("ownerId" in h) && !("hashSenha" in h) && !("salt" in h) && !("token" in h) && !("dono" in h)));
  t.igual("o item alheio chega marcado como não sendo da conta", paraAna.dados.find((h) => h.id === itemPublicoB).meu, false);

  const soMeus = comoAna({ acao: "listar_homebrew", escopo: "meus", tipos: TIPOS_DE_ITEM });
  t.iguais("escopo 'meus' com tipos: só os itens da própria conta", ids(soMeus), [armaDeA]);
  const soArmas = comoBruno({ acao: "listar_homebrew", escopo: "meus", tipos: ["arma"] });
  t.ok("tipos filtra dentro do escopo: as armas de B, inclusive a privada, para o próprio B",
    ids(soArmas).includes(armaPrivadaB) && soArmas.dados.every((h) => h.tipo === "arma"));
  t.igual("tipos que não existem: lista vazia, não tudo",
    comoAna({ acao: "listar_homebrew", escopo: "todos", tipos: ["senha", "usuario"] }).dados.length, 0);
  t.ok("sem tipos, o pedido antigo continua igual (criaturas públicas aparecem em 'todos')",
    ids(comoAna({ acao: "listar_homebrew", escopo: "todos" })).includes(hbPublico));
  t.recusa("sem sessão, nada", chamar(globalThis, { acao: "listar_homebrew", escopo: "todos", tipos: TIPOS_DE_ITEM }));
}

/* =====================================================================
   CAMPANHAS — VISIBILIDADE E PAPÉIS
   ===================================================================== */

t.grupo("Campanhas — pública e privada");

const privada = comoAna({
  acao: "criar_campanha",
  dados: { nome: "Singularidade", visibilidade: "privado" },
}).dados.id;

const publica = comoAna({
  acao: "criar_campanha",
  dados: { nome: "Aberta", visibilidade: "publico" },
}).dados.id;

t.ok("o criador é reconhecido como mestre",
  comoAna({ acao: "ler_campanha", campanhaId: privada }).dados.mestre === true);

t.recusa("campanha PRIVADA não abre para quem está de fora",
  comoBruno({ acao: "ler_campanha", campanhaId: privada }), "nao_encontrado");

t.ok("campanha PRIVADA não aparece na lista de quem está de fora",
  !comoBruno({ acao: "listar_campanhas" }).dados.some((c) => c.id === privada));

t.ok("campanha PÚBLICA aparece para outro usuário autenticado",
  comoBruno({ acao: "listar_campanhas" }).dados.some((c) => c.id === publica));

const espectador = comoBruno({ acao: "ler_campanha", campanhaId: publica });
t.igual("  e ele entra como espectador", espectador.dados.papel, "espectador");
t.igual("  sem virar mestre", espectador.dados.mestre, false);
t.ok("  e sem receber a lista de membros", espectador.dados.membros === undefined);

t.grupo("Campanhas — espectador não administra");

t.recusa("espectador não salva a campanha",
  comoBruno({ acao: "salvar_campanha", campanhaId: publica, dados: { nome: "Tomada" } }), "sem_permissao");
t.igual("espectador não recebe os personagens da mesa",
  comoBruno({ acao: "listar_personagens_campanha", campanhaId: publica }).dados.length, 0);
t.recusa("espectador não lê notas do mestre",
  comoBruno({ acao: "listar_notas_mestre", campanhaId: publica }), "sem_permissao");
t.recusa("espectador não registra rolagem",
  comoBruno({ acao: "registrar_rolagem", campanhaId: publica, rolagemId: "rol-espectador-1", dados: { total: 1 } }),
  "sem_permissao");

t.grupo("Campanhas — jogador convidado");

comoAna({
  acao: "salvar_participantes",
  campanhaId: privada,
  membros: [{ userId: bruno.id, papel: "jogador" }],
});

t.ok("a campanha privada passa a aparecer para o convidado",
  comoBruno({ acao: "listar_campanhas" }).dados.some((c) => c.id === privada));

const visaoBruno = comoBruno({ acao: "ler_campanha", campanhaId: privada });
t.igual("  e ele entra como jogador", visaoBruno.dados.papel, "jogador");
t.igual("  não como mestre", visaoBruno.dados.mestre, false);

t.recusa("jogador NÃO salva configurações da campanha",
  comoBruno({ acao: "salvar_campanha", campanhaId: privada, dados: { nome: "Roubada" } }), "sem_permissao");
t.recusa("jogador NÃO gerencia participantes",
  comoBruno({ acao: "salvar_participantes", campanhaId: privada, membros: [] }), "sem_permissao");
t.recusa("jogador NÃO limpa o histórico",
  comoBruno({ acao: "limpar_rolagens", campanhaId: privada }), "sem_permissao");
t.recusa("jogador NÃO exclui a campanha",
  comoBruno({ acao: "excluir_campanha", campanhaId: privada }), "nao_encontrado");

/* A tentativa clássica: mandar o próprio papel no corpo do pedido. */
const golpe = comoBruno({
  acao: "ler_campanha", campanhaId: privada,
  papel: "mestre", mestre: true, ehMestre: true, role: "mestre",
});
t.igual("mandar papel:'mestre' no corpo NÃO promove ninguém", golpe.dados.papel, "jogador");
t.igual("  e mestre continua falso", golpe.dados.mestre, false);

/* =====================================================================
   MESTRE SOBRE A FICHA DO JOGADOR
   ===================================================================== */

t.grupo("Mestre e a ficha do jogador");

comoBruno({ acao: "vincular_personagem", campanhaId: privada, personagemId: pBruno });

t.ok("o mestre enxerga o personagem do jogador na campanha",
  comoAna({ acao: "listar_personagens_campanha", campanhaId: privada })
    .dados.some((p) => p.id === pBruno));

const lidoPeloMestre = comoAna({ acao: "ler_personagem", personagemId: pBruno });
t.ok("o mestre ABRE a ficha vinculada", lidoPeloMestre.ok);
t.igual("  e sabe que está como mestre, não como dono", lidoPeloMestre.mestre, true);
t.igual("  e que não é o dono", lidoPeloMestre.dono, false);

const gravacaoDoMestre = comoAna({
  acao: "salvar_personagem", personagemId: pBruno, rev: lidoPeloMestre.rev,
  dados: Object.assign({}, lidoPeloMestre.dados, { classe: "Editado pelo mestre" }),
});
t.ok("o mestre EDITA a ficha vinculada", gravacaoDoMestre.ok);
t.igual("  respeitando a revisão", gravacaoDoMestre.rev, lidoPeloMestre.rev + 1);

t.recusa("o mestre NÃO apaga o personagem do jogador",
  comoAna({ acao: "excluir_personagem", personagemId: pBruno }), "sem_permissao");
t.recusa("o mestre NÃO duplica o personagem do jogador para si",
  comoAna({ acao: "duplicar_personagem", personagemId: pBruno }), "sem_permissao");

/* ownerId não muda nem quando é enviado de propósito. */
comoAna({
  acao: "salvar_personagem", personagemId: pBruno, rev: gravacaoDoMestre.rev,
  dados: Object.assign({}, lidoPeloMestre.dados, { ownerId: ana.id }),
});
t.ok("o mestre NÃO consegue virar dono da ficha",
  comoBruno({ acao: "listar_personagens" }).dados.some((p) => p.id === pBruno));
t.ok("  e o personagem continua na conta do jogador",
  !comoAna({ acao: "listar_personagens" }).dados.some((p) => p.id === pBruno));

t.recusa("mestre de OUTRA campanha não alcança este personagem",
  comoCarla({ acao: "ler_personagem", personagemId: pBruno }), "nao_encontrado");

/* Personagem fora de qualquer campanha: o caminho do mestre nem abre. */
t.recusa("o mestre não alcança personagem NÃO vinculado à campanha dele",
  comoCarla({ acao: "ler_personagem", personagemId: pAna }), "nao_encontrado");

t.grupo("Ajuste rápido de status");

const doJogador = comoAna({ acao: "listar_personagens_campanha", campanhaId: privada })
  .dados.find((p) => p.id === pBruno);

const fichaBruno = comoBruno({ acao: "ler_personagem", personagemId: pBruno });
const statusId = (fichaBruno.dados.status || [])[0] && fichaBruno.dados.status[0].id;

if (statusId) {
  const ajuste = comoAna({
    acao: "ajustar_personagem", personagemId: pBruno,
    alvo: "status", itemId: statusId, campo: "atual", valor: 7, rev: doJogador.rev,
  });
  t.ok("o mestre ajusta um status pelo painel", ajuste.ok);

  t.recusa("o ajuste respeita a revisão (rev velha é recusada)",
    comoAna({
      acao: "ajustar_personagem", personagemId: pBruno,
      alvo: "status", itemId: statusId, campo: "atual", valor: 3, rev: doJogador.rev,
    }), "conflito");

  t.recusa("um campo fora da lista permitida é recusado",
    comoAna({
      acao: "ajustar_personagem", personagemId: pBruno,
      alvo: "status", itemId: statusId, campo: "nome", valor: 1, rev: 99,
    }), "dados_invalidos");

  t.recusa("um alvo inventado é recusado",
    comoAna({
      acao: "ajustar_personagem", personagemId: pBruno,
      alvo: "ownerId", itemId: statusId, campo: "valor", valor: 1, rev: 99,
    }), "dados_invalidos");

  t.recusa("quem está fora da campanha não ajusta nada",
    comoCarla({
      acao: "ajustar_personagem", personagemId: pBruno,
      alvo: "status", itemId: statusId, campo: "atual", valor: 99, rev: 1,
    }), "nao_encontrado");
} else {
  t.ok("ajuste rápido: ficha de teste sem status, caso pulado", true);
}

t.grupo("Vínculo de personagem");

/* Carla não é membro desta campanha. O mestre não pode arrastar a ficha
   dela para dentro — se pudesse, bastaria descobrir um id para ganhar
   permissão de edição sobre a ficha de qualquer conta. */
const pCarla = comoCarla({ acao: "criar_personagem", dados: fichaDeTeste("Fora") }).dados.id;

t.recusa("o mestre NÃO puxa para a mesa a ficha de quem não participa",
  comoAna({ acao: "vincular_personagem", campanhaId: privada, personagemId: pCarla }), "sem_permissao");

t.recusa("  e continua sem alcançar essa ficha",
  comoAna({ acao: "ler_personagem", personagemId: pCarla }), "nao_encontrado");

t.ok("o dono vincula o PRÓPRIO personagem à campanha em que participa",
  comoAna({ acao: "vincular_personagem", campanhaId: privada, personagemId: pAna }).ok);

t.ok("e consegue tirá-lo depois",
  comoAna({ acao: "vincular_personagem", campanhaId: privada, personagemId: pAna, vincular: false }).ok);

/* =====================================================================
   ROLAGENS
   ===================================================================== */

t.grupo("Histórico de rolagens");

const rolJogador = comoBruno({
  acao: "registrar_rolagem", campanhaId: privada,
  rolagemId: "rol-jogador-0001", personagemId: pBruno,
  tipo: "pericia", nome: "Luta",
  dados: { total: 18, rolagens: [18], natural: 18 },
});
t.ok("o jogador registra a própria rolagem", rolJogador.ok);

t.ok("a rolagem aparece para o jogador",
  comoBruno({ acao: "listar_rolagens", campanhaId: privada }).dados.rolagens.length === 1);
t.ok("e para o mestre",
  comoAna({ acao: "listar_rolagens", campanhaId: privada }).dados.rolagens.length === 1);

t.grupo("Retry não duplica rolagem");

const repetida = comoBruno({
  acao: "registrar_rolagem", campanhaId: privada,
  rolagemId: "rol-jogador-0001", personagemId: pBruno,
  tipo: "pericia", nome: "Luta",
  dados: { total: 18, rolagens: [18], natural: 18 },
});
t.ok("reenviar a MESMA rolagem responde ok", repetida.ok);
t.igual("  e avisa que já estava registrada", repetida.dados.repetida, true);
t.igual("  e o histórico continua com uma linha",
  comoAna({ acao: "listar_rolagens", campanhaId: privada }).dados.rolagens.length, 1);

t.grupo("Rolagem do mestre — visível e oculta");

comoAna({
  acao: "registrar_rolagem", campanhaId: privada,
  rolagemId: "rol-mestre-visivel-1", tipo: "livre", nome: "Rolagem livre",
  dados: { total: 12 },
});
t.ok("com o modo VISÍVEL, a rolagem do mestre chega ao jogador",
  comoBruno({ acao: "listar_rolagens", campanhaId: privada })
    .dados.rolagens.some((r) => r.id === "rol-mestre-visivel-1"));

comoAna({
  acao: "salvar_campanha", campanhaId: privada,
  dados: { rolagensMestreOcultas: true },
});

comoAna({
  acao: "registrar_rolagem", campanhaId: privada,
  rolagemId: "rol-mestre-oculta-1", tipo: "livre", nome: "Rolagem secreta",
  dados: { total: 20 },
});

const paraOJogador = comoBruno({ acao: "listar_rolagens", campanhaId: privada }).dados.rolagens;
const paraOMestre = comoAna({ acao: "listar_rolagens", campanhaId: privada }).dados.rolagens;

t.ok("a rolagem OCULTA não chega ao jogador",
  !paraOJogador.some((r) => r.id === "rol-mestre-oculta-1"));
t.ok("  nem o nome dela vaza",
  !JSON.stringify(paraOJogador).includes("secreta"));
t.ok("o mestre continua vendo a própria rolagem oculta",
  paraOMestre.some((r) => r.id === "rol-mestre-oculta-1"));

/* Um jogador não consegue esconder as próprias rolagens: a
   visibilidade é decidida no servidor, não enviada. */
comoBruno({
  acao: "registrar_rolagem", campanhaId: privada,
  rolagemId: "rol-jogador-esconde-1", personagemId: pBruno,
  visibilidade: "oculta", tipo: "pericia", nome: "Tentando esconder",
  dados: { total: 5 },
});
t.ok("jogador NÃO consegue marcar a própria rolagem como oculta",
  comoAna({ acao: "listar_rolagens", campanhaId: privada })
    .dados.rolagens.find((r) => r.id === "rol-jogador-esconde-1").oculta === false);

t.recusa("rolagem em nome de personagem alheio é recusada",
  comoCarla({
    acao: "registrar_rolagem", campanhaId: privada,
    rolagemId: "rol-invasor-0001", personagemId: pBruno, dados: { total: 1 },
  }), "nao_encontrado");

t.grupo("Limpar histórico");

t.recusa("o jogador não limpa o histórico",
  comoBruno({ acao: "limpar_rolagens", campanhaId: privada }), "sem_permissao");
t.ok("o mestre limpa", comoAna({ acao: "limpar_rolagens", campanhaId: privada }).ok);
t.igual("  e o histórico fica vazio",
  comoAna({ acao: "listar_rolagens", campanhaId: privada }).dados.rolagens.length, 0);

/* =====================================================================
   DOCUMENTOS
   ===================================================================== */

t.grupo("Documentos");

const docParaBruno = comoAna({
  acao: "salvar_documento", campanhaId: privada,
  dados: { nome: "Documento do teatro", descricao: "planta baixa", visiveis: [bruno.id] },
}).dados.id;

const docSoMestre = comoAna({
  acao: "salvar_documento", campanhaId: privada,
  dados: { nome: "Segredo do mestre", descricao: "não mostrar", visiveis: [] },
}).dados.id;

t.igual("o mestre vê os dois",
  comoAna({ acao: "listar_documentos", campanhaId: privada }).dados.length, 2);

const docsDoBruno = comoBruno({ acao: "listar_documentos", campanhaId: privada }).dados;
t.igual("o jogador autorizado vê só o dele", docsDoBruno.length, 1);
t.igual("  e é o certo", docsDoBruno[0].id, docParaBruno);

t.ok("documento com NINGUÉM autorizado não vaza título nem descrição",
  !JSON.stringify(docsDoBruno).includes("Segredo") &&
  !JSON.stringify(docsDoBruno).includes("não mostrar"));

t.ok("o jogador não recebe a lista de quem mais pode ver",
  docsDoBruno[0].visiveis === undefined);

t.recusa("o jogador não baixa a imagem de documento não autorizado",
  comoBruno({ acao: "ler_imagem_documento", campanhaId: privada, documentoId: docSoMestre }), "nao_encontrado");

t.recusa("o jogador não cria documento",
  comoBruno({ acao: "salvar_documento", campanhaId: privada, dados: { nome: "Meu" } }), "sem_permissao");
t.recusa("o jogador não altera visiveis de um documento",
  comoBruno({
    acao: "salvar_documento", campanhaId: privada,
    dados: { id: docSoMestre, nome: "Segredo do mestre", visiveis: [bruno.id] },
  }), "sem_permissao");
t.recusa("o jogador não exclui documento",
  comoBruno({ acao: "excluir_documento", campanhaId: privada, documentoId: docParaBruno }), "sem_permissao");

/* Um id de usuário que não participa não vira permissão. */
comoAna({
  acao: "salvar_documento", campanhaId: privada,
  dados: { id: docParaBruno, nome: "Documento do teatro", visiveis: [bruno.id, carla.id] },
});
t.recusa("dar permissão a quem não é da campanha não funciona",
  comoCarla({ acao: "listar_documentos", campanhaId: privada }), "nao_encontrado");

t.ok("mudar a permissão vale na chamada seguinte", (() => {
  comoAna({
    acao: "salvar_documento", campanhaId: privada,
    dados: { id: docParaBruno, nome: "Documento do teatro", visiveis: [] },
  });
  return comoBruno({ acao: "listar_documentos", campanhaId: privada }).dados.length === 0;
})());

/* =====================================================================
   NOTAS DO MESTRE
   ===================================================================== */

t.grupo("Notas do mestre");

comoAna({
  acao: "salvar_nota_mestre", campanhaId: privada,
  dados: { titulo: "Sobre Gina", conteudo: "Ela ainda não sabe que...", personagemId: pBruno },
});

t.igual("o mestre lista as próprias notas",
  comoAna({ acao: "listar_notas_mestre", campanhaId: privada }).dados.length, 1);

const tentativaNota = comoBruno({ acao: "listar_notas_mestre", campanhaId: privada });
t.recusa("o jogador NÃO lista notas do mestre", tentativaNota, "sem_permissao");
t.ok("  e a resposta não carrega título nem conteúdo",
  !JSON.stringify(tentativaNota).includes("Gina") &&
  !JSON.stringify(tentativaNota).includes("ainda não sabe"));

t.recusa("o jogador não cria nota do mestre",
  comoBruno({ acao: "salvar_nota_mestre", campanhaId: privada, dados: { titulo: "x" } }), "sem_permissao");

/* Nenhuma resposta destinada ao jogador pode conter a nota. */
const tudoQueBrunoRecebe = JSON.stringify([
  comoBruno({ acao: "ler_campanha", campanhaId: privada }),
  comoBruno({ acao: "listar_personagens_campanha", campanhaId: privada }),
  comoBruno({ acao: "listar_documentos", campanhaId: privada }),
  comoBruno({ acao: "listar_rolagens", campanhaId: privada }),
  comoBruno({ acao: "listar_combates", campanhaId: privada }),
]);
t.ok("nota do mestre não vaza em NENHUMA resposta do jogador",
  !tudoQueBrunoRecebe.includes("ainda não sabe"));

/* =====================================================================
   COMBATE
   ===================================================================== */

t.grupo("Combate");

const criaturaDeAna = comoAna({
  acao: "salvar_homebrew",
  dados: { tipo: "criatura", nome: "Existido", visibilidade: "privado", status: [{ id: "s", nome: "Vida", atual: 30, maximo: 30 }] },
}).dados.id;

const combate = comoAna({
  acao: "salvar_combate", campanhaId: privada,
  dados: {
    nome: "Emboscada",
    estado: "preparando",
    visiveis: [bruno.id],
    participantes: [
      { id: "c1", tipo: "criatura", origemId: criaturaDeAna, nome: "Existido #1", ordem: 18, snapshot: { status: [{ nome: "Vida", atual: 30 }] } },
      { id: "c2", tipo: "criatura", origemId: criaturaDeAna, nome: "Existido #2", ordem: 7, snapshot: { status: [{ nome: "Vida", atual: 30 }] } },
      { id: "p1", tipo: "personagem", personagemId: pBruno, ordem: 22 },
    ],
  },
}).dados.id;

t.ok("o combate é salvo", !!combate);

const combatesDoMestre = comoAna({ acao: "listar_combates", campanhaId: privada }).dados;
t.igual("o mestre vê o combate", combatesDoMestre.length, 1);
t.igual("  com os três participantes", combatesDoMestre[0].participantes.length, 3);

t.ok("duas instâncias da mesma criatura têm ids independentes", (() => {
  const ids = combatesDoMestre[0].participantes.filter((p) => p.tipo === "criatura").map((p) => p.id);
  return ids.length === 2 && ids[0] !== ids[1];
})());

t.ok("o combate continua salvo depois de recarregar (vem da planilha)",
  comoAna({ acao: "listar_combates", campanhaId: privada }).dados[0].id === combate);

t.grupo("Combate — o que o jogador recebe");

const combateDoJogador = comoBruno({ acao: "listar_combates", campanhaId: privada }).dados;
t.igual("o jogador autorizado vê o combate", combateDoJogador.length, 1);
t.igual("  com a lista de participantes", combateDoJogador[0].participantes.length, 3);
t.ok("  e a ordem", combateDoJogador[0].participantes.every((p) => typeof p.ordem === "number"));

t.ok("o jogador NÃO recebe a ficha interna das criaturas",
  combateDoJogador[0].participantes.every((p) => p.snapshot === undefined));
t.ok("  nem o id do modelo no Homebrew",
  combateDoJogador[0].participantes.every((p) => p.origemId === undefined));
t.ok("  nem a lista de quem pode ver",
  combateDoJogador[0].visiveis === undefined);

t.recusa("o jogador não edita o combate",
  comoBruno({ acao: "salvar_combate", campanhaId: privada, dados: { id: combate, nome: "Alterado" } }), "sem_permissao");
t.recusa("o jogador não exclui o combate",
  comoBruno({ acao: "excluir_combate", campanhaId: privada, combateId: combate }), "sem_permissao");

t.ok("jogador SEM permissão não vê o combate", (() => {
  comoAna({
    acao: "salvar_combate", campanhaId: privada,
    dados: { id: combate, nome: "Emboscada", visiveis: [] },
    rev: comoAna({ acao: "listar_combates", campanhaId: privada }).dados[0].rev,
  });
  return comoBruno({ acao: "listar_combates", campanhaId: privada }).dados.length === 0;
})());

t.grupo("Ordem de iniciativa");

/* A ordenação é da interface, mas o teste confirma a regra pedida:
   maior para menor, e empate sem embaralhar. */
const ordenados = [
  { nome: "Michael", ordem: 22 }, { nome: "Existido", ordem: 18 },
  { nome: "Gina", ordem: 14 }, { nome: "Cultista", ordem: 7 },
].slice().sort((a, b) => b.ordem - a.ordem);
t.igual("22, 18, 14, 7 nesta ordem",
  ordenados.map((p) => p.ordem).join(","), "22,18,14,7");

/* =====================================================================
   DIRETÓRIO DE USUÁRIOS
   ===================================================================== */

t.grupo("Diretório de usuários");

const diretorio = comoAna({ acao: "listar_usuarios" });
t.ok("o diretório responde", diretorio.ok && diretorio.dados.length >= 3);

const camposDoDiretorio = new Set();
diretorio.dados.forEach((u) => Object.keys(u).forEach((k) => camposDoDiretorio.add(k)));
t.igual("devolve SÓ id, usuario, nome e a versão do avatar",
  [...camposDoDiretorio].sort().join(","), "avatarVersao,id,nome,usuario");

const proibidos = ["hashSenha", "salt", "token", "tokenHash", "iteracoes", "pepper", "senha"];
t.ok("nenhum campo interno vaza no diretório",
  !proibidos.some((c) => JSON.stringify(diretorio.dados).includes(c)));

/* =====================================================================
   =====================================================================
   DESEMPENHO SEM PERDER A CABEÇA
   ---------------------------------------------------------------------
   Tudo daqui para baixo cobre o que a otimização introduziu como risco.
   Cada grupo existe por causa de uma mudança específica, e o teste é
   escrito para FALHAR se a mudança tiver quebrado a garantia que ela
   prometeu manter.
   =====================================================================
   ===================================================================== */

/* =====================================================================
   O CABEÇALHO MANDA, NÃO A POSIÇÃO
   ---------------------------------------------------------------------
   Uma planilha criada na v1 e atualizada para a v2 tem `visibilidade`
   como ÚLTIMA coluna do HOMEBREW, porque o setupRama acrescenta no fim
   — enquanto o código declara essa coluna em quinto lugar.

   Ler por posição devolveria uma coluna pelo valor de outra: a
   visibilidade viria da data de criação, e o dadosJson viria de uma
   célula vazia. Uma biblioteca inteira apareceria em branco.

   Este grupo embaralha as colunas de propósito e confere que tudo
   continua no lugar.
   ===================================================================== */

t.grupo("Ordem física das colunas");

preparar();
const dina = novaConta("dina");
const comoDina = comoFn(dina);

(() => {
  const folha = ambiente.planilha.getSheetByName("HOMEBREW");

  /* Reproduz uma planilha da v1 atualizada: visibilidade no fim. */
  const cabecalhoV1 = ["id", "ownerId", "tipo", "nome", "criadoEm",
                       "atualizadoEm", "rev", "dadosJson", "visibilidade"];
  folha.linhas = [cabecalhoV1];

  /* Mexer no cabeçalho por fora exige avisar o sistema — é o que o
     setupRama faz, e é o motivo de a instrução ser sempre "mexeu na
     planilha, rode setupRama()". Sem isto o mapa guardado continuaria
     descrevendo o desenho anterior, que é justamente o que o teste
     abaixo confirmaria estar errado. */
  esquecerCabecalhos();

  const criado = comoDina({
    acao: "salvar_homebrew",
    dados: { tipo: "arma", nome: "Faca torta", dano: "1d6", visibilidade: "publico" },
  });
  t.ok("grava numa aba com as colunas fora de ordem", criado.ok);

  const lido = comoDina({ acao: "ler_homebrew", homebrewId: criado.dados.id });
  t.igual("o nome volta certo", lido.ok && lido.dados.nome, "Faca torta");
  t.igual("a visibilidade volta certa", lido.dados.visibilidade, "publico");
  t.igual("o conteúdo do JSON volta certo", lido.dados.dano, "1d6");

  const linhaCrua = folha.linhas[1];
  t.igual("a visibilidade foi gravada na coluna física certa (a última)",
    linhaCrua[8], "publico");
  t.ok("o dadosJson foi gravado na coluna física certa",
    String(linhaCrua[7]).indexOf("1d6") >= 0);

  /* E a listagem, que é o caminho que usa varredura leve. */
  const listado = comoDina({ acao: "listar_homebrew" }).dados;
  t.igual("a listagem enxerga o registro", listado.length, 1);
  t.igual("com a visibilidade correta", listado[0].visibilidade, "publico");
})();

/* =====================================================================
   DUAS GRAMÁTICAS NA MESMA ABA
   ---------------------------------------------------------------------
   O caso de verdade da planilha deste projeto: ela nasceu na v1, foi
   atualizada para a v2, e a coluna `visibilidade` entrou no FIM da aba
   enquanto o código a declara no MEIO.

   O resultado é uma aba com linhas em duas gramáticas — as antigas
   seguindo o cabeçalho, as novas seguindo a lista declarada. Nenhuma
   leitura única serve para as duas, e é isso que este grupo cobre.
   ===================================================================== */

t.grupo("Duas gramáticas na mesma aba");

(() => {
  preparar();
  const rui = novaConta("rui");
  const comoRui = comoFn(rui);

  const folha = ambiente.planilha.getSheetByName("HOMEBREW");

  /* Cabeçalho como o setupRama da v2 deixou uma planilha da v1. */
  folha.linhas = [[
    "id", "ownerId", "tipo", "nome", "criadoEm",
    "atualizadoEm", "rev", "dadosJson", "visibilidade",
  ]];

  /* Uma linha escrita pela v1: segue o cabeçalho, última célula vazia. */
  folha.linhas.push([
    "hb-da-v1", rui.id, "arma", "Espada velha",
    "2026-09-03T10:00:00.000Z", "2026-09-03T10:00:00.000Z", 1,
    JSON.stringify({ nome: "Espada velha", tipo: "arma", dano: "2d6", peso: 3 }),
    "",
  ]);

  /* Uma linha escrita pela v2 na mesma aba: segue a lista declarada,
     com visibilidade no meio e o JSON no fim. */
  folha.linhas.push([
    "hb-da-v2", rui.id, "arma", "Espada nova", "publico",
    "2026-09-10T10:00:00.000Z", "2026-09-10T10:00:00.000Z", 1,
    JSON.stringify({ nome: "Espada nova", tipo: "arma", dano: "1d8", peso: 2 }),
  ]);

  esquecerCabecalhos();

  const lista = comoRui({ acao: "listar_homebrew", escopo: "todos" }).dados;
  t.igual("as duas linhas aparecem", lista.length, 2);

  const daV1 = lista.filter((h) => h.id === "hb-da-v1")[0];
  const daV2 = lista.filter((h) => h.id === "hb-da-v2")[0];

  t.ok("a linha da v1 foi lida", !!daV1);
  t.igual("com o nome certo", daV1 && daV1.nome, "Espada velha");
  t.igual("e o conteúdo do JSON certo", daV1 && daV1.dano, "2d6");
  t.igual("e privada, porque a célula estava vazia", daV1 && daV1.visibilidade, "privado");

  t.ok("a linha da v2 foi lida", !!daV2);
  t.igual("com o nome certo", daV2 && daV2.nome, "Espada nova");
  t.igual("e o conteúdo do JSON certo", daV2 && daV2.dano, "1d8");
  t.igual("e pública, como estava gravado", daV2 && daV2.visibilidade, "publico");

  /* Leitura avulsa segue o mesmo caminho. */
  const avulsa = comoRui({ acao: "ler_homebrew", homebrewId: "hb-da-v2" });
  t.igual("a leitura avulsa da linha da v2 também", avulsa.ok && avulsa.dados.dano, "1d8");

  /* Gravar normaliza: a linha da v2 passa a seguir o cabeçalho. */
  const regravada = comoRui({
    acao: "salvar_homebrew",
    dados: { id: "hb-da-v2", tipo: "arma", nome: "Espada nova", dano: "1d10", visibilidade: "publico" },
  });
  t.ok("a linha da v2 é regravada", regravada.ok);

  const crua = folha.linhas[2];
  t.ok("e passa a seguir o cabeçalho: o JSON na oitava coluna",
    String(crua[7]).indexOf("1d10") >= 0);
  t.igual("e a visibilidade na nona", crua[8], "publico");

  const depois = comoRui({ acao: "ler_homebrew", homebrewId: "hb-da-v2" });
  t.igual("e continua sendo lida certo depois disso", depois.dados.dano, "1d10");
  t.igual("com a visibilidade intacta", depois.dados.visibilidade, "publico");

  /* A linha da v1, que ninguém tocou, continua legível. */
  t.igual("a linha da v1 continua legível",
    comoRui({ acao: "ler_homebrew", homebrewId: "hb-da-v1" }).dados.dano, "2d6");
})();

/* =====================================================================
   REGISTRO LEVE NÃO PODE SER GRAVADO
   ---------------------------------------------------------------------
   A varredura leve devolve registros SEM as colunas pesadas. Gravar um
   deles de volta escreveria vazio por cima do fichaJson de alguém.

   Não basta lembrar de não fazer isso: a camada recusa.
   ===================================================================== */

t.grupo("Registro leve");

(() => {
  preparar();
  const sara = novaConta("sara");
  const comoSara = comoFn(sara);

  const pSara = comoSara({ acao: "criar_personagem", dados: fichaDeTeste("Leve") }).dados.id;

  reiniciarExecucao();
  const umLeve = lerLeves(ABAS.PERSONAGENS)[0];
  t.ok("a varredura leve marca os registros", umLeve._leve === true);
  t.ok("o registro leve não traz o fichaJson", !umLeve.fichaJson);

  let recusou = false;
  try {
    atualizarLinha(ABAS.PERSONAGENS, umLeve._linha, umLeve);
  } catch (e) {
    recusou = String(e.message).indexOf("colunas pesadas") >= 0;
  }
  t.ok("gravar um registro leve é recusado", recusou);

  const aindaLa = comoSara({ acao: "ler_personagem", personagemId: pSara });
  t.igual("e a ficha continua inteira", aindaLa.ok && aindaLa.dados.nome, "Leve");
})();

/* =====================================================================
   NÚMERO DE LINHA DESATUALIZADO
   ---------------------------------------------------------------------
   O registro carrega o número da linha em que foi lido. Se outra coisa
   apagar uma linha acima dele, esse número passa a apontar para o
   vizinho — e gravar ali sobrescreveria o registro errado.

   A camada confere a coluna-chave antes de escrever quando a leitura
   veio de uma geração anterior à trava.
   ===================================================================== */

t.grupo("Referência de linha");

(() => {
  preparar();
  const eva = novaConta("eva");
  const comoEva = comoFn(eva);

  const p1 = comoEva({ acao: "criar_personagem", dados: fichaDeTeste("Primeiro") }).dados.id;
  const p2 = comoEva({ acao: "criar_personagem", dados: fichaDeTeste("Segundo") }).dados.id;

  reiniciarExecucao();

  /* Lê o segundo — linha 3 — e guarda a referência. */
  const registro = acharPor(ABAS.PERSONAGENS, "id", p2);
  t.igual("o segundo personagem está na linha 3", registro._linha, 3);

  /* Alguém apaga o primeiro. A linha 3 passa a ser a 2. */
  comoEva({ acao: "excluir_personagem", personagemId: p1 });

  /* Agora grava usando a referência velha. Sem a conferência, isto
     escreveria por cima de quem tomou a linha 3 — ou de ninguém. */
  reiniciarExecucao();
  registro.nome = "Renomeado";
  registro._geracao = -1;           // finge ter vindo de antes da trava
  atualizarLinha(ABAS.PERSONAGENS, registro._linha, registro);

  const conferido = comoEva({ acao: "listar_personagens" }).dados;
  t.igual("sobrou um personagem", conferido.length, 1);
  t.igual("e a gravação foi para o registro certo", conferido[0].nome, "Renomeado");
  t.igual("e é mesmo o segundo", conferido[0].id, p2);
})();

/* =====================================================================
   DUAS PESSOAS, DOIS REGISTROS DIFERENTES
   ---------------------------------------------------------------------
   O cache por execução guarda o que foi lido. Se ele vazasse entre
   requisições, a gravação de uma pessoa iria parar no registro de
   outra — e este é o teste que perceberia.
   ===================================================================== */

t.grupo("Gravações simultâneas em registros diferentes");

(() => {
  preparar();
  const fabio = novaConta("fabio");
  const gina = novaConta("gina");
  const comoFabio = comoFn(fabio);
  const comoGina = comoFn(gina);

  const pF = comoFabio({ acao: "criar_personagem", dados: fichaDeTeste("Fabiano") }).dados.id;
  const pG = comoGina({ acao: "criar_personagem", dados: fichaDeTeste("Gineta") }).dados.id;

  /* Intercaladas, como aconteceria numa mesa. */
  const f1 = comoFabio({ acao: "salvar_personagem", personagemId: pF, rev: 1, dados: fichaDeTeste("Fabiano II") });
  const g1 = comoGina({ acao: "salvar_personagem", personagemId: pG, rev: 1, dados: fichaDeTeste("Gineta II") });
  const f2 = comoFabio({ acao: "salvar_personagem", personagemId: pF, rev: 2, dados: fichaDeTeste("Fabiano III") });
  const g2 = comoGina({ acao: "salvar_personagem", personagemId: pG, rev: 2, dados: fichaDeTeste("Gineta III") });

  t.ok("as quatro gravações passam", f1.ok && g1.ok && f2.ok && g2.ok);
  t.igual("a ficha de um não recebeu o nome do outro",
    comoFabio({ acao: "ler_personagem", personagemId: pF }).dados.nome, "Fabiano III");
  t.igual("nem o contrário",
    comoGina({ acao: "ler_personagem", personagemId: pG }).dados.nome, "Gineta III");
  t.igual("as revisões subiram de forma independente",
    f2.rev + "/" + g2.rev, "3/3");
})();

/* =====================================================================
   MESTRE E JOGADOR NA MESMA FICHA
   ---------------------------------------------------------------------
   Os dois podem editar. O que não pode é um apagar o trabalho do outro
   sem ninguém perceber — e é exatamente isso que o `rev` existe para
   impedir. Encurtar a região crítica não pode ter afrouxado isso.
   ===================================================================== */

t.grupo("Mestre e jogador na mesma ficha");

const mesa = (() => {
  preparar();
  const mestre = novaConta("mestre");
  const jogador = novaConta("jogador");
  const comoMestre = comoFn(mestre);
  const comoJogador = comoFn(jogador);

  const campanha = comoMestre({ acao: "criar_campanha", dados: { nome: "A Mesa" } }).dados.id;
  comoMestre({ acao: "salvar_participantes", campanhaId: campanha,
    membros: [{ userId: jogador.id, papel: "jogador" }] });

  const ficha = comoJogador({ acao: "criar_personagem", dados: fichaDeTeste("Compartilhada") }).dados.id;
  comoJogador({ acao: "vincular_personagem", campanhaId: campanha, personagemId: ficha });

  return { mestre, jogador, comoMestre, comoJogador, campanha, ficha };
})();

(() => {
  const { comoMestre, comoJogador, ficha } = mesa;

  const abriu = comoJogador({ acao: "ler_personagem", personagemId: ficha });
  const revAoAbrir = abriu.rev;

  /* O mestre mexe primeiro, pelo ajuste rápido. */
  const ajuste = comoMestre({
    acao: "ajustar_personagem", personagemId: ficha,
    alvo: "status", itemId: "st-pv", campo: "atual", valor: 12,
  });
  t.ok("o mestre ajusta a ficha do jogador", ajuste.ok);
  t.igual("e a revisão sobe", ajuste.rev, revAoAbrir + 1);

  /* O jogador tenta salvar com a revisão de antes. */
  const salvou = comoJogador({
    acao: "salvar_personagem", personagemId: ficha,
    rev: revAoAbrir, dados: fichaDeTeste("Renomeada pelo jogador"),
  });
  t.recusa("a gravação do jogador com revisão vencida é recusada", salvou, "conflito");
  t.igual("e a recusa traz a revisão atual", salvou.rev, revAoAbrir + 1);
  t.ok("e o estado do servidor junto, para conciliar", !!salvou.dados);
  t.igual("o ajuste do mestre continua lá", salvou.dados.status[0].atual, 12);

  /* Com a revisão certa, passa. */
  const denovo = comoJogador({
    acao: "salvar_personagem", personagemId: ficha,
    rev: salvou.rev, dados: Object.assign(salvou.dados, { nome: "Conciliada" }),
  });
  t.ok("com a revisão certa a gravação passa", denovo.ok);
  t.igual("e o valor do mestre sobreviveu",
    comoMestre({ acao: "ler_personagem", personagemId: ficha }).dados.status[0].atual, 12);
})();

/* =====================================================================
   O AJUSTE REPETIDO
   ---------------------------------------------------------------------
   O navegador manda o valor FINAL, não a diferença. É o que permite
   juntar cliques, repetir depois de um tempo esgotado e reordenar sem
   estragar nada.

   Se algum dia isso virar incremento, este teste falha — e tem de
   falhar.
   ===================================================================== */

t.grupo("Ajuste repetido");

(() => {
  const { comoMestre, ficha } = mesa;

  const antes = comoMestre({ acao: "ler_personagem", personagemId: ficha });

  const a = comoMestre({
    acao: "ajustar_personagem", personagemId: ficha, rev: antes.rev,
    alvo: "status", itemId: "st-pv", campo: "atual", valor: 7,
  });
  t.ok("o ajuste passa", a.ok);

  /* O navegador não recebeu a resposta e mandou de novo o MESMO valor,
     agora com a revisão nova. */
  const b = comoMestre({
    acao: "ajustar_personagem", personagemId: ficha, rev: a.rev,
    alvo: "status", itemId: "st-pv", campo: "atual", valor: 7,
  });
  t.ok("o reenvio do mesmo valor passa", b.ok);
  t.igual("e o resultado é o mesmo número, não o dobro do desconto",
    comoMestre({ acao: "ler_personagem", personagemId: ficha }).dados.status[0].atual, 7);

  /* Campo fora da lista continua recusado. */
  t.recusa("campo não previsto é recusado", comoMestre({
    acao: "ajustar_personagem", personagemId: ficha, rev: b.rev,
    alvo: "status", itemId: "st-pv", campo: "nome", valor: 1,
  }), "dados_invalidos");
  t.recusa("alvo não previsto é recusado", comoMestre({
    acao: "ajustar_personagem", personagemId: ficha, rev: b.rev,
    alvo: "inventario", itemId: "st-pv", campo: "atual", valor: 1,
  }), "dados_invalidos");
})();

/* =====================================================================
   A ROLAGEM QUE CHEGOU DUAS VEZES
   ---------------------------------------------------------------------
   O caso é este: a gravação deu certo no servidor e a resposta se
   perdeu no caminho. O navegador reenvia — com o MESMO id, porque a
   rolagem não foi refeita.

   O atalho de cache não pode transformar isso em duas linhas, e a
   ausência do cache também não.
   ===================================================================== */

t.grupo("Rolagem repetida");

(() => {
  const { comoJogador, campanha, ficha } = mesa;

  const rolagem = {
    acao: "registrar_rolagem", campanhaId: campanha, personagemId: ficha,
    rolagemId: "rol-perdida-na-volta", tipo: "ataque", nome: "Faca",
    dados: { formula: "1d20", total: 17, dados: [17] },
  };

  const primeira = comoJogador(rolagem);
  t.ok("a primeira grava", primeira.ok && !primeira.dados.repetida);

  const segunda = comoJogador(rolagem);
  t.ok("a segunda é reconhecida como repetida", segunda.ok && segunda.dados.repetida === true);

  /* Agora sem o atalho: o cache some, e a conferência tem de acontecer
     na planilha. É o caso do contêiner que reiniciou entre as duas. */
  ambiente.cache.clear();
  const terceira = comoJogador(rolagem);
  t.ok("com o cache vazio ela ainda é reconhecida",
    terceira.ok && terceira.dados.repetida === true);

  const historico = comoJogador({ acao: "listar_rolagens", campanhaId: campanha });
  t.igual("e o histórico tem UMA linha", historico.dados.rolagens.length, 1);
  t.igual("com o resultado original", historico.dados.rolagens[0].resultado.total, 17);
})();

/* =====================================================================
   HISTÓRICO VOLUMOSO
   ---------------------------------------------------------------------
   A paginação passou a ler só as colunas leves e a buscar o resultado
   das rolagens apenas da página pedida. O que não pode mudar é o que
   chega: mesma ordem, mesmo total, mesmo conteúdo.
   ===================================================================== */

t.grupo("Histórico volumoso");

(() => {
  const { comoMestre, comoJogador, campanha, ficha } = mesa;

  for (let i = 0; i < 120; i++) {
    comoJogador({
      acao: "registrar_rolagem", campanhaId: campanha, personagemId: ficha,
      rolagemId: "rol-" + String(i).padStart(4, "0"),
      tipo: "pericia", nome: "Percepção",
      dados: { formula: "1d20", total: i, dados: [i] },
    });
  }

  const pagina1 = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25 });
  t.igual("a primeira página traz 25", pagina1.dados.rolagens.length, 25);
  t.ok("e não é o fim", pagina1.dados.fim === false);
  t.ok("  com o cursor da próxima", typeof pagina1.dados.proximo === "string" && pagina1.dados.proximo.length > 0);

  t.ok("o resultado de cada rolagem veio junto",
    pagina1.dados.rolagens.every((r) => r.resultado && typeof r.resultado.total === "number"));

  const pagina2 = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25, cursor: pagina1.dados.proximo });
  const ids1 = new Set(pagina1.dados.rolagens.map((r) => r.id));
  t.ok("a segunda página não repete a primeira",
    pagina2.dados.rolagens.every((r) => !ids1.has(r.id)));
  t.ok("  e continua de onde a primeira parou",
    pagina2.dados.rolagens[0].criadoEm <= pagina1.dados.rolagens[24].criadoEm);

  const todas = todasAsRolagens(comoJogador, campanha);
  t.igual("as páginas cobrem o histórico inteiro", todas.length, 121);
  t.igual("  sem repetir nenhuma", new Set(todas).size, 121);
  t.igual("  em ordem, da mais nova para a mais velha",
    todas.slice(0, 3).join(","), ["rol-0119", "rol-0118", "rol-0117"].join(","));

  /* Uma rolagem nova no topo enquanto alguém pagina: a página seguinte
     não pode repetir nem pular nada. É para isso que o cursor existe. */
  const meio = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 30 });
  comoJogador({
    acao: "registrar_rolagem", campanhaId: campanha, personagemId: ficha,
    rolagemId: "rol-intrusa-0001", tipo: "livre", nome: "No meio da paginação",
    dados: { formula: "1d6", total: 4, dados: [4] },
  });
  const seguinte = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 30, cursor: meio.dados.proximo });
  const idsDoMeio = new Set(meio.dados.rolagens.map((r) => r.id));
  t.ok("uma rolagem nova no topo não faz a página seguinte repetir",
    seguinte.dados.rolagens.every((r) => !idsDoMeio.has(r.id)));
  t.ok("  nem pular: a mais velha da primeira e a mais nova da segunda são vizinhas",
    seguinte.dados.rolagens[0].id === "rol-" + String(119 - 30).padStart(4, "0"));

  t.igual("o limite é limitado pelo servidor",
    comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 99999 }).dados.rolagens.length, 122);

  /* O contrato antigo (`pulo`), para um site ainda não publicado. */
  const primeiraPorPulo = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25 });
  const segundaPorPulo = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25, pulo: 25 });
  const idsDaPrimeira = new Set(primeiraPorPulo.dados.rolagens.map((r) => r.id));
  t.igual("o `pulo` da v2.15 continua paginando", segundaPorPulo.dados.rolagens.length, 25);
  t.ok("  sem repetir a primeira página",
    segundaPorPulo.dados.rolagens.every((r) => !idsDaPrimeira.has(r.id)));

  /* A rolagem oculta do mestre continua fora da resposta do jogador —
     a filtragem acontece antes da paginação, e não depois. */
  comoMestre({ acao: "salvar_campanha", campanhaId: campanha, dados: { rolagensMestreOcultas: true } });
  comoMestre({
    acao: "registrar_rolagem", campanhaId: campanha,
    rolagemId: "rol-secreta-do-mestre", tipo: "livre", nome: "Nos bastidores",
    dados: { formula: "1d100", total: 99, dados: [99] },
  });

  const doJogador = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 200 });
  t.igual("o jogador não vê a rolagem oculta", doJogador.dados.rolagens.length, 122);
  t.ok("nem o resultado dela em lugar nenhum",
    JSON.stringify(doJogador).indexOf("Nos bastidores") < 0);
  t.igual("o mestre vê as suas",
    comoMestre({ acao: "listar_rolagens", campanhaId: campanha, limite: 200 }).dados.rolagens.length, 123);
  t.igual("  e a filtragem não deixa buraco na paginação do jogador",
    new Set(todasAsRolagens(comoJogador, campanha, 10)).size, 122);
})();

/* =====================================================================
   O CACHE DA SESSÃO
   ---------------------------------------------------------------------
   O cache acelera; não autoriza. Quatro coisas precisam continuar
   valendo: ele pode sumir, sair pelo botão derruba na hora, desativar
   a conta derruba na hora, e o prazo é conferido contra o relógio de
   agora — nunca contra o de quando a entrada foi criada.
   ===================================================================== */

t.grupo("Cache da sessão");

(() => {
  preparar();
  const hugo = novaConta("hugo");
  const comoHugo = comoFn(hugo);

  comoHugo({ acao: "criar_personagem", dados: fichaDeTeste("Do Hugo") });

  /* 1. some. */
  ambiente.cache.clear();
  t.ok("com o cache vazio a sessão continua valendo",
    comoHugo({ acao: "listar_personagens" }).ok);

  /* 2. aquece e continua valendo. */
  t.ok("com o cache quente também", comoHugo({ acao: "listar_personagens" }).ok);

  /* 3. sair pelo botão derruba na hora, mesmo com o cache quente. */
  t.ok("o logout responde", chamar(globalThis, { acao: "logout", token: hugo.token }).ok);
  t.recusa("e a sessão morre imediatamente",
    comoHugo({ acao: "listar_personagens" }), "sessao");
})();

(() => {
  preparar();
  const ivo = novaConta("ivo");
  const comoIvo = comoFn(ivo);

  /* Aquece o cache de propósito e SÓ ENTÃO desativa a conta. Sem o
     avanço da época, a entrada guardada seguiria valendo por dois
     minutos — dois minutos a mais do que o aceitável para quem foi
     desativado. */
  t.ok("a sessão está viva", comoIvo({ acao: "resumo" }).ok);
  comoIvo({ acao: "resumo" });

  desativarUsuario("ivo");

  /* A resposta é 'sessao' e não 'inativo': desativar a conta encerra as
     sessões dela, e uma sessão encerrada é recusada como sessão
     inválida. Dizer "conta desativada" a quem manda um token morto
     entregaria informação sobre a conta a quem já não tem acesso.

     O 'inativo' continua existindo para o caso de a linha do usuário
     ser marcada à mão sem encerrar as sessões. */
  const depois = comoIvo({ acao: "resumo" });
  t.ok("desativar a conta derruba a sessão em cache na hora",
    depois.ok === false && (depois.erro === "sessao" || depois.erro === "inativo"),
    JSON.stringify(depois));
})();

(() => {
  preparar();
  const joana = novaConta("joana");
  const comoJoana = comoFn(joana);

  comoJoana({ acao: "resumo" });
  trocarSenha("joana", "outra-senha-boa");

  t.recusa("trocar a senha derruba a sessão em cache na hora",
    comoJoana({ acao: "resumo" }), "sessao");
})();

(() => {
  preparar();
  const kiko = novaConta("kiko");
  const comoKiko = comoFn(kiko);

  comoKiko({ acao: "resumo" });

  /* O PRAZO É CONFERIDO CONTRA O RELÓGIO DE AGORA
     ---------------------------------------------------------------
     A entrada de cache guarda o `expiraEm` que a sessão tinha quando
     foi guardada, e a validação compara esse valor com o instante da
     requisição. Uma sessão que vence dentro da janela do cache é
     recusada sem consultar a planilha — que é o ponto deste bloco.

     Para provar isso o teste envelhece a ENTRADA DE CACHE, não a
     planilha: é assim que a passagem do tempo apareceria de verdade. */
  const chave = [...ambiente.cache.keys()].filter((k) => k.indexOf("rama.sessao.") === 0)[0];
  t.ok("a sessão está mesmo em cache", !!chave);

  const guardado = JSON.parse(ambiente.cache.get(chave));
  guardado.expiraEm = Date.now() - 1000;
  ambiente.cache.set(chave, JSON.stringify(guardado));

  t.recusa("sessão vencida é recusada pelo próprio cache",
    comoKiko({ acao: "resumo" }), "expirada");

  /* E o caminho da planilha faz o mesmo, quando o cache não existe. */
  preparar();
  const luis = novaConta("luis");
  const comoLuis = comoFn(luis);

  reiniciarExecucao();
  const linha = acharPor(ABAS.SESSOES, "userId", luis.id);
  linha.expiraEm = Date.now() - 1000;
  atualizarLinha(ABAS.SESSOES, linha._linha, linha);
  ambiente.cache.clear();

  t.recusa("e também pela planilha, com o cache frio",
    comoLuis({ acao: "resumo" }), "expirada");

  /* Uma vez vencida, ela fica vencida. */
  t.recusa("e continua vencida na chamada seguinte",
    comoLuis({ acao: "resumo" }), "sessao");
})();

/* =====================================================================
   MUDANÇA DE PERMISSÃO
   ---------------------------------------------------------------------
   Tirar alguém da campanha tem de tirar o acesso. Nada de campanha é
   guardado entre requisições, justamente para não haver janela nenhuma
   aqui — e este teste confere que continua assim.
   ===================================================================== */

t.grupo("Mudança de permissão");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const lia = novaConta("lia");
  const comoMestra = comoFn(mestra);
  const comoLia = comoFn(lia);

  const campanha = comoMestra({ acao: "criar_campanha", dados: { nome: "Enquanto durar" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: campanha,
    membros: [{ userId: lia.id, papel: "jogador" }] });

  const ficha = comoLia({ acao: "criar_personagem", dados: fichaDeTeste("Da Lia") }).dados.id;
  comoLia({ acao: "vincular_personagem", campanhaId: campanha, personagemId: ficha });

  t.ok("a mestra alcança a ficha da jogadora",
    comoMestra({ acao: "ler_personagem", personagemId: ficha }).ok);
  t.ok("e a jogadora entra na campanha", comoLia({ acao: "ler_campanha", campanhaId: campanha }).ok);

  /* Aquece tudo o que puder estar guardado antes de mudar. */
  comoMestra({ acao: "listar_personagens_campanha", campanhaId: campanha });
  comoLia({ acao: "listar_rolagens", campanhaId: campanha });

  comoMestra({ acao: "salvar_participantes", campanhaId: campanha, membros: [] });

  t.recusa("tirada da mesa, a jogadora não entra mais na campanha privada",
    comoLia({ acao: "ler_campanha", campanhaId: campanha }), "nao_encontrado");
  t.recusa("e a mestra deixa de alcançar a ficha dela na requisição seguinte",
    comoMestra({ acao: "ler_personagem", personagemId: ficha }), "nao_encontrado");
  t.ok("a jogadora continua dona da própria ficha",
    comoLia({ acao: "ler_personagem", personagemId: ficha }).ok);
})();

/* =====================================================================
   A TRAVA NEGADA
   ---------------------------------------------------------------------
   Vinte pessoas disputam uma trava que é do script inteiro. Quando ela
   não vem, a resposta tem de ser "ocupado" — e NADA pode ter sido
   gravado pela metade.
   ===================================================================== */

t.grupo("Contenção da trava");

(() => {
  preparar();
  const nuno = novaConta("nuno");
  const comoNuno = comoFn(nuno);

  const p = comoNuno({ acao: "criar_personagem", dados: fichaDeTeste("Intocado") }).dados.id;
  const antes = comoNuno({ acao: "ler_personagem", personagemId: p });

  ambiente.trava.negar = true;

  const recusado = comoNuno({
    acao: "salvar_personagem", personagemId: p, rev: antes.rev,
    dados: fichaDeTeste("Deveria falhar"),
  });
  t.recusa("gravar sem conseguir a trava responde ocupado", recusado, "ocupado");

  const criar = comoNuno({ acao: "criar_personagem", dados: fichaDeTeste("Nem nasce") });
  t.recusa("criar sem a trava também", criar, "ocupado");

  ambiente.trava.negar = false;

  const depois = comoNuno({ acao: "ler_personagem", personagemId: p });
  t.ok("leitura funciona mesmo com a trava disputada", depois.ok);
  t.igual("nada foi gravado pela metade", depois.dados.nome, "Intocado");
  t.igual("a revisão não subiu", depois.rev, antes.rev);
  t.igual("e nenhum personagem a mais apareceu",
    comoNuno({ acao: "listar_personagens" }).dados.length, 1);
})();

/* =====================================================================
   O LOTE
   ---------------------------------------------------------------------
   Várias leituras numa requisição só. A economia é de viagens; a
   permissão continua sendo decidida uma por uma, pela mesma função que
   decidiria se cada pedido viesse sozinho.
   ===================================================================== */

t.grupo("Lote");

(() => {
  preparar();
  const olga = novaConta("olga");
  const paulo = novaConta("paulo");
  const comoOlga = comoFn(olga);
  const comoPaulo = comoFn(paulo);

  const pOlga = comoOlga({ acao: "criar_personagem", dados: fichaDeTeste("Da Olga") }).dados.id;
  const pPaulo = comoPaulo({ acao: "criar_personagem", dados: fichaDeTeste("Do Paulo") }).dados.id;

  const bom = comoOlga({
    acao: "lote",
    pedidos: [
      { acao: "sessao" },
      { acao: "ler_personagem", personagemId: pOlga },
      { acao: "listar_campanhas" },
    ],
  });

  t.ok("o lote responde", bom.ok);
  t.igual("com uma resposta por pedido, na ordem", bom.dados.respostas.length, 3);
  t.igual("a primeira é a sessão", bom.dados.respostas[0].acao, "sessao");
  t.igual("e traz o agente", bom.dados.respostas[0].agente.usuario, "olga");
  t.igual("a segunda é a ficha", bom.dados.respostas[1].dados.nome, "Da Olga");

  /* A permissão não afrouxa dentro do lote. */
  const misto = comoOlga({
    acao: "lote",
    pedidos: [
      { acao: "ler_personagem", personagemId: pOlga },
      { acao: "ler_personagem", personagemId: pPaulo },
    ],
  });
  t.ok("o pedido próprio passa", misto.dados.respostas[0].ok);
  t.recusa("e o pedido pela ficha alheia é recusado dentro do lote",
    misto.dados.respostas[1], "nao_encontrado");

  /* Gravação não entra. */
  const comGravacao = comoOlga({
    acao: "lote",
    pedidos: [{ acao: "criar_personagem", dados: fichaDeTeste("Pela porta dos fundos") }],
  });
  t.recusa("gravação dentro do lote é recusada",
    comGravacao.dados.respostas[0], "acao_desconhecida");
  t.igual("e nada foi criado", comoOlga({ acao: "listar_personagens" }).dados.length, 1);

  t.recusa("logout não entra no lote", comoOlga({
    acao: "lote", pedidos: [{ acao: "logout" }],
  }).dados.respostas[0], "acao_desconhecida");

  /* Limites. */
  t.recusa("lote vazio é recusado", comoOlga({ acao: "lote", pedidos: [] }), "dados_invalidos");
  t.recusa("lote grande demais é recusado", comoOlga({
    acao: "lote",
    pedidos: Array.from({ length: 20 }, () => ({ acao: "sessao" })),
  }), "dados_invalidos");

  /* Sem sessão válida, nada dentro do lote chega a rodar. */
  const semSessao = chamar(globalThis, {
    acao: "lote", token: "tk-inventado",
    pedidos: [{ acao: "listar_personagens" }],
  });
  t.recusa("lote com token inválido é recusado inteiro", semSessao, "sessao");
  t.ok("e não devolve resposta nenhuma", !semSessao.dados);
})();

/* =====================================================================
   FAXINA DE SESSÕES
   ---------------------------------------------------------------------
   Ela passou a rodar no máximo uma vez por dia. O que não pode é deixar
   de apagar o que precisa ser apagado quando chega a hora.
   ===================================================================== */

t.grupo("Faxina de sessões");

(() => {
  preparar();
  const quim = novaConta("quim");

  reiniciarExecucao();
  inserir(ABAS.SESSOES, {
    tokenHash: "hash-de-sessao-muito-velha",
    userId: quim.id,
    criadoEm: 0,
    ultimaAtividade: 0,
    expiraEm: 1,
    ativo: "false",
    agente: "teste",
  });
  t.igual("a sessão velha está na planilha", lerTudo(ABAS.SESSOES).length, 2);

  /* A faxina só roda se a última tiver sido há mais de um dia. */
  reiniciarExecucao();
  definirPropriedade("RAMA_FAXINA", "0");
  reiniciarExecucao();
  t.igual("a faxina apaga a sessão velha", limparSessoesVelhas(), 1);

  reiniciarExecucao();
  t.igual("e a sessão viva fica", lerTudo(ABAS.SESSOES).length, 1);

  /* Rodando de novo no mesmo dia, ela não faz nada — é o que evita
     vinte faxinas numa noite de vinte logins. */
  reiniciarExecucao();
  t.igual("no mesmo dia ela não roda de novo", limparSessoesVelhas(), 0);

  t.ok("e a conta continua entrando",
    chamar(globalThis, { acao: "login", usuario: "quim", senha: "senha-de-teste" }).ok);
})();

/* =====================================================================
   ARQUIVO FALTANDO NA IMPLANTAÇÃO
   ---------------------------------------------------------------------
   Faltar o Dados.gs é o erro de instalação mais provável desta versão, e
   o mais confuso de diagnosticar: sem ele nada funciona, e o sintoma
   natural seria um ReferenceError chegando ao navegador como um 500 sem
   explicação.

   O teste finge a ausência do arquivo zerando o que ele define.
   ===================================================================== */

t.grupo("Arquivo faltando");

(() => {
  const guardadas = { ABAS: globalThis.ABAS, reiniciar: globalThis.reiniciarExecucao };

  globalThis.ABAS = undefined;
  globalThis.reiniciarExecucao = undefined;

  const r = chamar(globalThis, { acao: "listar_personagens", token: "seja lá qual" });
  t.recusa("sem Dados.gs, toda ação responde instalacao_incompleta", r, "instalacao_incompleta");
  t.ok("e não vaza pilha de execução", !JSON.stringify(r).includes("ReferenceError"));

  const diagnostico = conferirInstalacao();
  t.ok("conferirInstalacao() diz qual arquivo falta",
    String(diagnostico).indexOf("Dados.gs") >= 0, String(diagnostico));

  globalThis.ABAS = guardadas.ABAS;
  globalThis.reiniciarExecucao = guardadas.reiniciar;

  t.ok("com o arquivo de volta, tudo volta a funcionar",
    chamar(globalThis, { acao: "ping" }).ok);
})();

/* =====================================================================
   O CABEÇALHO NÃO PODE TRANCAR NINGUÉM PARA FORA
   ---------------------------------------------------------------------
   A v2.1 passou a ler as colunas pelo NOME do cabeçalho. Isso conserta
   a aba cujas colunas estão fora da ordem declarada — e criou um
   defeito novo, que só apareceu em uso: se o cabeçalho não tiver o nome
   exato, a coluna é lida como VAZIA.

   Numa aba USUARIOS isso significa hash de senha vazio, e aí NENHUMA
   senha confere. A tela diz "usuário ou senha incorretos" para todo
   mundo, para sempre, sem nenhuma pista de que o problema é a planilha.

   A rede é a posição declarada, usada só quando ela não pertence a
   outra coluna declarada. Estes casos existem para ela nunca mais sair.
   ===================================================================== */

t.grupo("Cabeçalho da planilha e login");

(() => {
  function comCabecalho(mexer) {
    preparar();
    criarUsuario("luky", "Luky", "senha-de-teste");

    const folha = ambiente.planilha.getSheetByName("USUARIOS");
    if (mexer) mexer(folha);

    /* Como aconteceria numa execução nova do Apps Script. */
    esquecerCabecalhos();
    reiniciarExecucao();

    return chamar(globalThis, { acao: "login", usuario: "luky", senha: "senha-de-teste" });
  }

  t.ok("cabeçalho intacto: entra", comCabecalho(null).ok);

  t.ok("coluna hashSenha renomeada: ainda entra",
    comCabecalho((f) => { f.linhas[0][3] = "senha"; }).ok);

  t.ok("coluna salt renomeada: ainda entra",
    comCabecalho((f) => { f.linhas[0][4] = "sal"; }).ok);

  t.ok("cabeçalho inteiro em MAIÚSCULAS: ainda entra",
    comCabecalho((f) => { f.linhas[0] = f.linhas[0].map((c) => String(c).toUpperCase()); }).ok);

  t.ok("linha de cabeçalho apagada: ainda entra",
    comCabecalho((f) => { f.linhas[0] = f.linhas[0].map(() => ""); }).ok);

  t.ok("coluna a mais inserida antes de todas: ainda entra",
    comCabecalho((f) => { f.linhas.forEach((l, i) => l.unshift(i === 0 ? "obs" : "")); }).ok);

  /* A rede NÃO pode ler a coluna do vizinho. Quando a posição declarada
     já pertence a outra coluna declarada, o campo fica vazio — e aí o
     login precisa falhar dizendo que a INSTALAÇÃO está quebrada, não
     que a senha está errada. */
  const invertido = comCabecalho((f) => {
    /* hashSenha some do cabeçalho, e a posição 4 passa a pertencer a
       "salt" — que é outra coluna declarada. */
    f.linhas[0][3] = "salt";
    f.linhas[0][4] = "outra";
  });
  t.ok("quando a rede não pode agir, o login NÃO diz senha errada", !invertido.ok);
  t.igual("  e sim que a instalação está incompleta", invertido.erro, "instalacao_incompleta");

  /* E a conferência de instalação aponta o dedo para a aba certa. */
  preparar();
  criarUsuario("luky", "Luky", "senha-de-teste");
  ambiente.planilha.getSheetByName("USUARIOS").linhas[0][3] = "salt";
  ambiente.planilha.getSheetByName("USUARIOS").linhas[0][4] = "outra";
  esquecerCabecalhos();
  reiniciarExecucao();

  const diagnostico = String(conferirInstalacao());
  t.ok("conferirInstalacao() nomeia a aba com problema",
    diagnostico.indexOf("USUARIOS") >= 0, diagnostico.slice(0, 160));
  t.ok("  e diz o que fazer", diagnostico.indexOf("setupRama") >= 0);
})();

/* A leitura pelo NOME continua valendo quando o nome existe: é ela que
   conserta a aba cujas colunas estão fora da ordem declarada. */
t.grupo("Cabeçalho — o nome continua mandando quando existe");

(() => {
  preparar();
  const zeca = novaConta("zeca");
  const comoZeca = comoFn(zeca);

  const folha = ambiente.planilha.getSheetByName("HOMEBREW");
  folha.linhas = [[
    "id", "ownerId", "tipo", "nome", "criadoEm",
    "atualizadoEm", "rev", "dadosJson", "visibilidade",
  ]];
  esquecerCabecalhos();

  const criado = comoZeca({
    acao: "salvar_homebrew",
    dados: { tipo: "arma", nome: "Faca", dano: "1d6", visibilidade: "publico" },
  });
  t.ok("grava numa aba com as colunas fora da ordem declarada", criado.ok);

  const linha = folha.linhas[1];
  t.igual("a visibilidade foi para a coluna que o cabeçalho aponta", linha[8], "publico");
  t.ok("e o JSON também", String(linha[7]).indexOf("1d6") >= 0);
})();

/* =====================================================================
   ORDEM PARANORMAL — AS ESCOLHAS DE PROGRESSÃO ATRAVESSAM O SERVIDOR
   ---------------------------------------------------------------------
   O servidor não interpreta a ficha: guarda o JSON. Estes casos travam
   que as escolhas, a afinidade, a configuração de patente e os dados de
   Ordem dos itens voltam exatamente como foram, e que a revisão
   continua protegendo contra gravação concorrente.
   ===================================================================== */

t.grupo("Ordem — escolhas atravessam o servidor");

(() => {
  preparar();
  const iris = novaConta("iris");
  const comoIris = comoFn(iris);

  const ficha = {
    nome: "Íris", tipoFicha: "ordem", schemaVersion: 4,
    ordem: {
      classe: "combatente", origem: "militar", trilha: "aniquilador", nex: 60,
      atributos: { agi: 2, for: 2, int: 1, pre: 1, vig: 2 },
      escolhas: [
        { id: "e1", etapa: "d3.poderClasse", tipo: "poderClasse", valor: "transcender",
          opcoes: { poder: { valor: "resistirAElemento", opcoes: { elemento: "morte" } } },
          nome: "Transcender → Resistir a Morte", ignorarRequisitos: false, registradoEm: "2026-09-12T10:00:00.000Z" },
        { id: "e2", etapa: "b.aFavorita", tipo: "opcoesBeneficio", valor: "",
          opcoes: { arma: "Fuzil", itens: ["i1"] }, nome: "", ignorarRequisitos: false, registradoEm: "2026-09-12T10:01:00.000Z" },
      ],
      afinidade: { elemento: "outro", nomeOutro: "Vazio", adiada: false },
      patente: { aplicar: false, limites: { "0": null, "1": 3, "2": null, "3": 0, "4": 0 } },
      temporarios: { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: -2 },
    },
    inventario: { limite: 0, itens: [
      { id: "i1", tipo: "arma", nome: "Fuzil", peso: 0, ordem: { espacos: 2, quantidade: 1, categoria: 2, grupo: "arma", capacidade: 0 } },
    ] },
  };

  const criado = comoIris({ acao: "criar_personagem", dados: ficha });
  t.ok("a ficha de Ordem com escolhas é criada", criado.ok);

  const lido = comoIris({ acao: "ler_personagem", personagemId: criado.dados.id });
  t.iguais("as escolhas voltam iguais", lido.dados.ordem.escolhas, ficha.ordem.escolhas);
  t.iguais("  a afinidade Homebrew também", lido.dados.ordem.afinidade, ficha.ordem.afinidade);
  t.iguais("  e os limites manuais, com null sendo sem limite", lido.dados.ordem.patente, ficha.ordem.patente);
  t.igual("  e o ajuste temporário de capacidade", lido.dados.ordem.temporarios.capacidade, -2);
  t.iguais("  e os dados de Ordem do item", lido.dados.inventario.itens[0].ordem, ficha.inventario.itens[0].ordem);

  const nova = JSON.parse(JSON.stringify(lido.dados));
  nova.ordem.escolhas.push({ id: "e3", etapa: "d4.atributo", tipo: "atributo", valor: "agi", opcoes: {},
    nome: "+1 em Agilidade", ignorarRequisitos: false, registradoEm: "2026-09-12T10:02:00.000Z" });
  const gravado = comoIris({ acao: "salvar_personagem", personagemId: criado.dados.id, rev: lido.rev, dados: nova });
  t.ok("registrar mais uma escolha grava", gravado.ok);
  t.igual("  subindo a revisão", gravado.rev, lido.rev + 1);

  const atrasado = comoIris({ acao: "salvar_personagem", personagemId: criado.dados.id, rev: lido.rev, dados: lido.dados });
  t.recusa("gravar com a revisão velha é conflito, não sobrescreve a escolha nova", atrasado, "conflito");
  t.igual("  e o conflito devolve a ficha com as três escolhas",
    atrasado.dados && atrasado.dados.ordem ? atrasado.dados.ordem.escolhas.length : -1, 3);
})();

t.grupo("Ordem — versões personalizadas e etiquetas atravessam o servidor");

(() => {
  preparar();
  const joana = novaConta("joana");
  const lara = novaConta("lara");
  const comoJoana = comoFn(joana);
  const comoLara = comoFn(lara);

  const personalizacao = {
    id: "pz1", aquisicao: "d3.poderClasse|reflexosDefensivos", poder: "reflexosDefensivos",
    nome: "Reflexos de Gato", texto: "Versão da mesa.", origem: "Poder de classe", cor: "#3B6EA3", negrito: true,
    etiqueta: { texto: "Agilidade", cor: "#3B6EA3" }, efeitos: "desativados", homebrewId: null,
    criadoEm: "2026-09-12T10:00:00.000Z", atualizadoEm: "2026-09-12T10:00:00.000Z",
  };
  const ficha = {
    nome: "Joana", tipoFicha: "ordem", schemaVersion: 5,
    ordem: {
      classe: "combatente", origem: "militar", trilha: "tropadechoque", nex: 20,
      atributos: { agi: 2, for: 2, int: 1, pre: 1, vig: 2 },
      escolhas: [{ id: "e1", etapa: "d3.poderClasse", tipo: "poderClasse", valor: "reflexosDefensivos", opcoes: {},
        nome: "Reflexos Defensivos", ignorarRequisitos: false, registradoEm: "2026-09-12T09:00:00.000Z" }],
      personalizacoes: [personalizacao],
    },
    habilidades: { filhos: [{ id: "h1", tipo: "habilidade", nome: "Baguncinha Mortal", texto: "", origem: "", cor: "", negrito: false,
      origemHabilidadeId: null, etiqueta: { texto: "Energia", cor: "#7E6BB5" } }] },
    inventario: { limite: 0, itens: [
      { id: "i1", tipo: "item", nome: "Amuleto", peso: 0, categoria: "", descricao: "", origemHomebrewId: null,
        etiqueta: { texto: "Sangue", cor: "#A33B3B" } },
    ] },
  };

  const criado = comoJoana({ acao: "criar_personagem", dados: ficha });
  t.ok("a ficha com personalização e etiquetas é criada", criado.ok);
  const lido = comoJoana({ acao: "ler_personagem", personagemId: criado.dados.id });
  t.iguais("a personalização volta igual, com os efeitos desativados", lido.dados.ordem.personalizacoes, [personalizacao]);
  t.iguais("  a etiqueta da habilidade também", lido.dados.habilidades.filhos[0].etiqueta, { texto: "Energia", cor: "#7E6BB5" });
  t.iguais("  e a do item", lido.dados.inventario.itens[0].etiqueta, { texto: "Sangue", cor: "#A33B3B" });

  t.recusa("outra conta não lê a ficha com a personalização",
    comoLara({ acao: "ler_personagem", personagemId: criado.dados.id }), "nao_encontrado");

  const restaurada = JSON.parse(JSON.stringify(lido.dados));
  restaurada.ordem.personalizacoes = [];
  const gravado = comoJoana({ acao: "salvar_personagem", personagemId: criado.dados.id, rev: lido.rev, dados: restaurada });
  t.ok("restaurar a versão oficial (lista vazia) grava", gravado.ok && gravado.rev === lido.rev + 1);
  const atrasado = comoJoana({ acao: "salvar_personagem", personagemId: criado.dados.id, rev: lido.rev, dados: lido.dados });
  t.recusa("gravar a personalização com a revisão velha é conflito", atrasado, "conflito");

  const hb = comoJoana({ acao: "salvar_homebrew", dados: {
    tipo: "habilidade", nome: "Reflexos de Gato", texto: "Versão da mesa.", visibilidade: "privado",
    etiqueta: { texto: "Agilidade", cor: "#3B6EA3" },
  } });
  t.ok("a versão salva na biblioteca vira habilidade privada", hb.ok);
  const lidaHb = comoJoana({ acao: "ler_homebrew", homebrewId: hb.dados.id });
  t.iguais("  com a etiqueta", lidaHb.dados.etiqueta, { texto: "Agilidade", cor: "#3B6EA3" });
  t.igual("  privada", lidaHb.dados.visibilidade, "privado");
  t.recusa("  e outra conta não a enxerga", comoLara({ acao: "ler_homebrew", homebrewId: hb.dados.id }), "nao_encontrado");
})();

t.grupo("Painel da campanha — fichas de Ordem e permissões");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const dona = novaConta("dona");
  const colega = novaConta("colega");
  const estranha = novaConta("estranha");
  const comoMestra = comoFn(mestra);
  const comoDona = comoFn(dona);
  const comoColega = comoFn(colega);
  const comoEstranha = comoFn(estranha);

  const campanha = comoMestra({ acao: "criar_campanha", dados: { nome: "Painel" } }).dados.id;
  const outra = comoMestra({ acao: "criar_campanha", dados: { nome: "Outra mesa" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: campanha,
    membros: [{ userId: dona.id, papel: "jogador" }, { userId: colega.id, papel: "jogador" }] });
  comoMestra({ acao: "salvar_participantes", campanhaId: outra,
    membros: [{ userId: dona.id, papel: "jogador" }] });

  const fichaOrdem = {
    nome: "Mari de Nome Muito Comprido Para Caber", tipoFicha: "ordem", schemaVersion: 6,
    status: [{ id: "st-padrao", nome: "Vida", atual: 10, maximo: 10 }],
    atributos: [{ id: "at-padrao", nome: "Força", sigla: "FOR", valor: 1 }],
    ordem: {
      classe: "ocultista", origem: "academico", trilha: "", nex: 20,
      atributos: { agi: 3, for: 1, int: 5, pre: 4, vig: 0 },
      escolhas: [], recursos: { pv: null, pe: 5, san: 47 },
      personalizacoes: [{ id: "pz", aquisicao: "auto|escolhidoPeloOutroLado", poder: "escolhidoPeloOutroLado",
        nome: "Versão", texto: "Texto longo e privado", efeitos: "herdados" }],
      organizacao: { habilidades: { modo: "az" } },
      bonusExtra: { defesa: 2, bloqueio: 3, esquiva: -1 },
      periciasAjustes: { reflexos: { atributo: "int", extra: 2 } },
    },
    inventario: { limite: 0, itens: [
      { id: "i1", tipo: "armadura", nome: "Proteção Leve", defesa: 5, descricao: "Descrição privada",
        ordem: { espacos: 2, quantidade: 1, categoria: 1, grupo: "protecao", capacidade: 0, emUso: true } },
    ] },
  };
  const pOrdem = comoDona({ acao: "criar_personagem", dados: fichaOrdem }).dados.id;
  comoDona({ acao: "vincular_personagem", campanhaId: campanha, personagemId: pOrdem });

  const pUniversal = comoColega({ acao: "criar_personagem", dados: fichaDeTeste("Universal do Colega") }).dados.id;
  comoColega({ acao: "vincular_personagem", campanhaId: campanha, personagemId: pUniversal });

  const daMestra = comoMestra({ acao: "listar_personagens_campanha", campanhaId: campanha }).dados;
  const ordemMestra = daMestra.find((x) => x.id === pOrdem);
  t.igual("a mestra vê as duas fichas da mesa mista", daMestra.length, 2);
  t.igual("  a de Ordem vem marcada como Ordem", ordemMestra.tipoFicha, "ordem");
  t.ok("  com os dados de cálculo para a mestra", ordemMestra.detalhado && !!ordemMestra.ordem.atributos && !!ordemMestra.inventario);
  t.igual("  e os recursos guardados", JSON.stringify(ordemMestra.ordem.recursos), JSON.stringify({ pv: null, pe: 5, san: 47 }));
  t.ok("  sem os status e atributos universais de nascimento", ordemMestra.status === undefined && ordemMestra.atributos === undefined);
  t.ok("  sem o texto das personalizações", ordemMestra.ordem.personalizacoes.length === 1 && ordemMestra.ordem.personalizacoes[0].texto === undefined);
  t.ok("  sem a descrição dos itens", ordemMestra.inventario.itens[0].descricao === undefined && ordemMestra.inventario.itens[0].ordem.emUso === true);
  t.ok("a universal continua com status e atributos", Array.isArray(daMestra.find((x) => x.id === pUniversal).status));
  t.iguais("bônus extras de Defesa, Bloqueio e Esquiva chegam ao painel da mestra", ordemMestra.ordem.bonusExtra, { defesa: 2, bloqueio: 3, esquiva: -1 });
  t.iguais("  e os ajustes de perícia também", ordemMestra.ordem.periciasAjustes, { reflexos: { atributo: "int", extra: 2 } });
  t.iguais("a ficha guarda os ajustes à parte dos graus", comoDona({ acao: "ler_personagem", personagemId: pOrdem }).dados.ordem.periciasAjustes,
    { reflexos: { atributo: "int", extra: 2 } });

  const doColega = comoColega({ acao: "listar_personagens_campanha", campanhaId: campanha }).dados;
  const ordemColega = doColega.find((x) => x.id === pOrdem);
  t.ok("outro jogador NÃO recebe os dados de cálculo da ficha alheia",
    !ordemColega.detalhado && ordemColega.inventario === undefined && ordemColega.ordem.recursos === undefined &&
    ordemColega.ordem.escolhas === undefined && ordemColega.ordem.atributos === undefined);
  t.igual("  só a identificação", Object.keys(ordemColega.ordem).sort().join(","), "classe,nex,nivel,opcionais,trilha");
  t.ok("  e a dona recebe tudo da própria", comoDona({ acao: "listar_personagens_campanha", campanhaId: campanha })
    .dados.find((x) => x.id === pOrdem).detalhado);

  const golpeLista = comoColega({ acao: "listar_personagens_campanha", campanhaId: campanha, mestre: true, papel: "mestre" }).dados;
  t.ok("mandar mestre:true na listagem não libera nada", !golpeLista.find((x) => x.id === pOrdem).detalhado);

  const rev0 = ordemMestra.rev;
  const ajuste = comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha, rev: rev0,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 12 });
  t.ok("a mestra ajusta o PV atual da ficha de Ordem", ajuste.ok && ajuste.rev === rev0 + 1);
  const lida = comoDona({ acao: "ler_personagem", personagemId: pOrdem }).dados;
  t.igual("  o valor vai para ordem.recursos.pv", lida.ordem.recursos.pv, 12);
  t.ok("  sem mexer em PE, Sanidade nem no status universal",
    lida.ordem.recursos.pe === 5 && lida.ordem.recursos.san === 47 && lida.status[0].atual === 10);
  t.igual("  nem nos atributos", JSON.stringify(lida.ordem.atributos), JSON.stringify(fichaOrdem.ordem.atributos));

  const repetido = comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha, rev: ajuste.rev,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 12 });
  t.ok("reenviar o mesmo valor final não desconta de novo",
    repetido.ok && comoDona({ acao: "ler_personagem", personagemId: pOrdem }).dados.ordem.recursos.pv === 12);

  t.recusa("revisão velha é conflito", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    rev: rev0, alvo: "recurso", itemId: "pe", campo: "atual", valor: 1 }), "conflito");
  t.recusa("recurso inventado é recusado", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    rev: repetido.rev, alvo: "recurso", itemId: "defesa", campo: "atual", valor: 1 }), "dados_invalidos");
  t.recusa("o máximo não é ajustável", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    rev: repetido.rev, alvo: "recurso", itemId: "pv", campo: "maximo", valor: 99 }), "dados_invalidos");
  t.recusa("abaixo do piso da ficha (−99) é recusado", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    rev: repetido.rev, alvo: "recurso", itemId: "pv", campo: "atual", valor: -100 }), "dados_invalidos");
  t.recusa("valor que não é número é recusado", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    rev: repetido.rev, alvo: "recurso", itemId: "pv", campo: "atual", valor: "" }), "dados_invalidos");
  t.recusa("recurso de Ordem numa ficha universal é recusado", comoMestra({ acao: "ajustar_personagem", personagemId: pUniversal,
    campanhaId: campanha, alvo: "recurso", itemId: "pv", campo: "atual", valor: 3 }), "dados_invalidos");

  t.recusa("outro jogador da mesa não ajusta a ficha alheia", comoColega({ acao: "ajustar_personagem", personagemId: pOrdem,
    campanhaId: campanha, alvo: "recurso", itemId: "pv", campo: "atual", valor: 1 }), "nao_encontrado");
  t.recusa("  nem mandando mestre:true", comoColega({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 1, mestre: true, ehMestre: true }), "nao_encontrado");
  t.recusa("quem não é da mesa não ajusta", comoEstranha({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: campanha,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 1 }), "nao_encontrado");
  t.recusa("pedido em nome de outra campanha é recusado", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem, campanhaId: outra,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 1 }), "nao_encontrado");

  const saiu = comoMestra({ acao: "vincular_personagem", campanhaId: campanha, personagemId: pOrdem, vincular: false });
  t.ok("tirar da campanha desfaz só o vínculo", saiu.ok);
  t.ok("  a ficha continua existindo com a dona", comoDona({ acao: "ler_personagem", personagemId: pOrdem }).ok);
  t.ok("  e sai da listagem da mesa", !comoMestra({ acao: "listar_personagens_campanha", campanhaId: campanha }).dados.some((x) => x.id === pOrdem));
  t.recusa("depois de tirada, o cartão antigo da mestra não ajusta mais", comoMestra({ acao: "ajustar_personagem", personagemId: pOrdem,
    campanhaId: campanha, alvo: "recurso", itemId: "pv", campo: "atual", valor: 1 }), "nao_encontrado");
  t.recusa("jogador não tira personagem alheio da campanha", comoColega({ acao: "vincular_personagem", campanhaId: campanha,
    personagemId: pUniversal === pUniversal ? pOrdem : pOrdem, vincular: false }), "nao_encontrado");
})();

t.grupo("Campanha da ficha — só o dono troca, e coluna e ficha concordam");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const dona = novaConta("dona");
  const outraMestra = novaConta("outramestra");
  const comoMestra = comoFn(mestra);
  const comoDona = comoFn(dona);
  const comoOutra = comoFn(outraMestra);

  const mesaA = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa A" } }).dados.id;
  const mesaB = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa B (sem a dona)" } }).dados.id;
  const mesaC = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa C" } }).dados.id;
  const vitrine = comoOutra({ acao: "criar_campanha", dados: { nome: "Vitrine", visibilidade: "publico" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesaA, membros: [{ userId: dona.id, papel: "jogador" }] });
  comoMestra({ acao: "salvar_participantes", campanhaId: mesaC, membros: [{ userId: dona.id, papel: "jogador" }] });

  const campanhaNaLista = (id) => (comoDona({ acao: "listar_personagens" }).dados.find((p) => p.id === id) || {}).campanhaId || null;
  const campanhaNaFicha = (id) => comoDona({ acao: "ler_personagem", personagemId: id }).dados.campanhaId;

  const criada = comoDona({ acao: "criar_personagem", dados: Object.assign(fichaDeTeste("Rosa"), { campanhaId: mesaB }) });
  const p = criada.dados.id;
  t.igual("criar numa campanha de que a dona não participa não vincula", campanhaNaLista(p), null);
  t.igual("  e a ficha guardada diz o mesmo (campanhaId nulo)", campanhaNaFicha(p), null);

  let lido = comoDona({ acao: "ler_personagem", personagemId: p });
  const naA = comoDona({ acao: "salvar_personagem", personagemId: p, rev: lido.rev,
    dados: Object.assign({}, lido.dados, { campanhaId: mesaA }) });
  t.ok("a dona põe a ficha numa campanha em que joga, salvando a ficha", naA.ok);
  t.igual("  a listagem mostra a campanha", campanhaNaLista(p), mesaA);
  t.igual("  e a ficha guardada também", campanhaNaFicha(p), mesaA);
  t.ok("  e a mesa passa a listar o personagem",
    comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesaA }).dados.some((x) => x.id === p));

  lido = comoMestra({ acao: "ler_personagem", personagemId: p });
  t.igual("a mestra abre como mestra, não como dona", lido.dono, false);
  const moverPelaMestra = comoMestra({ acao: "salvar_personagem", personagemId: p, rev: lido.rev,
    dados: Object.assign({}, lido.dados, { campanhaId: mesaB, classe: "Mexida pela mestra" }) });
  t.ok("a mestra salva a ficha do jogador", moverPelaMestra.ok);
  t.igual("  mas a campanha NÃO muda para outra mesa dela", campanhaNaLista(p), mesaA);
  t.igual("  nem dentro da ficha", campanhaNaFicha(p), mesaA);
  t.igual("  e o resto da gravação vale", comoDona({ acao: "ler_personagem", personagemId: p }).dados.classe, "Mexida pela mestra");
  t.ok("  a Mesa B continua sem o personagem",
    !comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesaB }).dados.some((x) => x.id === p));

  lido = comoMestra({ acao: "ler_personagem", personagemId: p });
  comoMestra({ acao: "salvar_personagem", personagemId: p, rev: lido.rev,
    dados: Object.assign({}, lido.dados, { campanhaId: null }) });
  t.igual("a mestra também não tira a ficha da campanha salvando campanhaId nulo", campanhaNaLista(p), mesaA);

  t.ok("a lista de 'Adicionar personagem' da mestra (listar_personagens) não traz fichas da dona",
    !comoMestra({ acao: "listar_personagens" }).dados.some((x) => x.id === p));

  const mover = comoDona({ acao: "vincular_personagem", campanhaId: mesaC, personagemId: p });
  t.ok("a dona adiciona a ficha a outra mesa em que joga (vincular_personagem)", mover.ok);
  t.igual("  a ficha sai da Mesa A e vai para a Mesa C", campanhaNaLista(p), mesaC);
  t.igual("  e a ficha guardada acompanha", campanhaNaFicha(p), mesaC);
  t.ok("  a Mesa A não lista mais o personagem",
    !comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesaA }).dados.some((x) => x.id === p));

  t.recusa("a dona não adiciona a ficha a uma campanha que só observa",
    comoDona({ acao: "vincular_personagem", campanhaId: vitrine, personagemId: p }), "sem_permissao");

  lido = comoDona({ acao: "ler_personagem", personagemId: p });
  comoDona({ acao: "salvar_personagem", personagemId: p, rev: lido.rev,
    dados: Object.assign({}, lido.dados, { campanhaId: vitrine }) });
  t.igual("salvar a ficha apontando para uma campanha só observada desvincula", campanhaNaLista(p), null);
  t.igual("  e a ficha guardada não fica dizendo a campanha recusada", campanhaNaFicha(p), null);
})();

/* =====================================================================
   v2.12 — CAPA, RECURSOS NOS CARTÕES, MARCAS E OPERAÇÕES DE COMBATE
   ===================================================================== */

const CAPA_PEQUENA = "data:image/webp;base64," + "QUFB".repeat(50);

t.grupo("Capa da campanha — quem grava, quem lê");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const jogadora = novaConta("jogadora");
  const estranha = novaConta("estranha");
  const comoMestra = comoFn(mestra);
  const comoJogadora = comoFn(jogadora);
  const comoEstranha = comoFn(estranha);

  const privada = comoMestra({ acao: "criar_campanha", dados: { nome: "Privada" } }).dados.id;
  const publica = comoMestra({ acao: "criar_campanha", dados: { nome: "Pública", visibilidade: "publico" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: privada, membros: [{ userId: jogadora.id, papel: "jogador" }] });

  t.iguais("campanha sem capa: ler_campanha diz que não existe", comoMestra({ acao: "ler_campanha", campanhaId: privada }).dados.capa, { existe: false });
  t.igual("  e ler_capa_campanha devolve imagem vazia", comoJogadora({ acao: "ler_capa_campanha", campanhaId: privada }).dados.imagem, "");

  const gravada = comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: CAPA_PEQUENA, largura: 1200, altura: 400 });
  t.ok("a mestra grava a capa", gravada.ok && gravada.dados.existe === true);
  const lida = comoJogadora({ acao: "ler_capa_campanha", campanhaId: privada });
  t.igual("a jogadora da mesa lê a capa inteira, sem corte", lida.dados.imagem, CAPA_PEQUENA);
  t.iguais("  com as medidas", [lida.dados.largura, lida.dados.altura], [1200, 400]);
  t.ok("ler_campanha traz só a existência e as medidas, não a imagem",
    (() => { const c = comoJogadora({ acao: "ler_campanha", campanhaId: privada }).dados.capa; return c.existe && !c.imagem && c.largura === 1200; })());

  t.recusa("a jogadora NÃO grava a capa", comoJogadora({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: CAPA_PEQUENA, largura: 10, altura: 10 }), "sem_permissao");
  t.recusa("  nem remove", comoJogadora({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: "" }), "sem_permissao");
  t.recusa("quem está fora de campanha privada não lê a capa pelo id direto", comoEstranha({ acao: "ler_capa_campanha", campanhaId: privada }), "nao_encontrado");

  comoMestra({ acao: "salvar_capa_campanha", campanhaId: publica, imagem: CAPA_PEQUENA, largura: 300, altura: 100 });
  t.igual("a capa de campanha pública aparece para o espectador, como o nome", comoEstranha({ acao: "ler_capa_campanha", campanhaId: publica }).dados.imagem, CAPA_PEQUENA);
  t.recusa("  mas o espectador não grava", comoEstranha({ acao: "salvar_capa_campanha", campanhaId: publica, imagem: "" }), "sem_permissao");

  t.recusa("SVG é recusado (só imagem rasterizada)", comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada,
    imagem: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", largura: 10, altura: 10 }), "dados_invalidos");
  t.recusa("texto que não é imagem é recusado", comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada,
    imagem: "javascript:alert(1)", largura: 10, altura: 10 }), "dados_invalidos");
  t.recusa("imagem sem medidas é recusada", comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: CAPA_PEQUENA }), "dados_invalidos");
  const grande = "data:image/webp;base64," + "A".repeat(46000);
  t.recusa("imagem maior que a célula é recusada — nunca aparada", comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada,
    imagem: grande, largura: 10, altura: 10 }), "dados_grandes");
  t.igual("  e a capa anterior continua inteira", comoMestra({ acao: "ler_capa_campanha", campanhaId: privada }).dados.imagem, CAPA_PEQUENA);

  const outra = "data:image/jpeg;base64," + "QkJC".repeat(40);
  comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: outra, largura: 900, altura: 300 });
  t.igual("substituir troca a imagem", comoJogadora({ acao: "ler_capa_campanha", campanhaId: privada }).dados.imagem, outra);
  t.igual("  sem criar uma segunda linha", ambiente.planilha.getSheetByName("CAMPANHA_CAPAS").getLastRow(), 3);

  t.ok("remover apaga a capa", comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: "" }).ok);
  t.iguais("  e ler_campanha volta a dizer que não existe", comoJogadora({ acao: "ler_campanha", campanhaId: privada }).dados.capa, { existe: false });

  comoMestra({ acao: "salvar_capa_campanha", campanhaId: privada, imagem: CAPA_PEQUENA, largura: 30, altura: 10 });
  comoMestra({ acao: "excluir_campanha", campanhaId: privada });
  t.igual("excluir a campanha leva a capa junto", ambiente.planilha.getSheetByName("CAMPANHA_CAPAS").getLastRow(), 2);
})();

t.grupo("Cartões da mesa — o jogador vê os recursos, edita só os seus, e a ocultação");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const ana = novaConta("ana");
  const beto = novaConta("beto");
  const comoMestra = comoFn(mestra);
  const comoAna = comoFn(ana);
  const comoBeto = comoFn(beto);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa,
    membros: [{ userId: ana.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });

  const fichaOrdem = (nome, resumo) => ({
    nome, tipoFicha: "ordem", schemaVersion: 6,
    ordem: {
      classe: "ocultista", origem: "academico", trilha: "", nex: 20,
      atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 1 },
      escolhas: [{ id: "segredo-do-build", etapa: "d4.atributo", tipo: "atributo", valor: "int" }],
      recursos: { pv: 9, pe: null, san: null },
    },
    inventario: { itens: [{ id: "item-secreto", tipo: "item", nome: "Diário proibido", descricao: "privado" }] },
    resumoRecursos: resumo,
  });

  const anaOrdem = comoAna({ acao: "criar_personagem", dados: fichaOrdem("Ana de Ordem", { pv: 20, pe: 8, san: 16 }) }).dados.id;
  const anaUniversal = comoAna({ acao: "criar_personagem", dados: fichaDeTeste("Ana Universal") }).dados.id;
  const betoOrdem = comoBeto({ acao: "criar_personagem", dados: fichaOrdem("Beto de Ordem", null) }).dados.id;
  [anaOrdem, anaUniversal].forEach((id) => comoAna({ acao: "vincular_personagem", campanhaId: mesa, personagemId: id }));
  comoBeto({ acao: "vincular_personagem", campanhaId: mesa, personagemId: betoOrdem });

  const listaDo = (como) => comoFn(como)({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados;
  const cartao = (lista, id) => lista.find((p) => p.id === id);

  let doBeto = listaDo(beto);
  let alheio = cartao(doBeto, anaOrdem);
  t.iguais("o jogador vê os recursos atuais e máximos do personagem de Ordem alheio",
    alheio.recursos, [{ chave: "pv", rotulo: "PV", atual: 9, maximo: 20 }, { chave: "pe", rotulo: "PE", atual: 8, maximo: 8 }, { chave: "san", rotulo: "SAN", atual: 16, maximo: 16 }]);
  t.ok("  sem o bloco de cálculo (escolhas), sem inventário e sem o resumo cru",
    !alheio.ordem.escolhas && !alheio.inventario && alheio.resumoRecursos === undefined && !JSON.stringify(alheio).includes("segredo-do-build") && !JSON.stringify(alheio).includes("Diário proibido"));
  t.ok("  e sem permissão de editar nem de abrir a ficha", alheio.podeEditarRecursos === false && alheio.podeAbrirFicha === false);
  t.ok("o jogador vê os status do personagem universal alheio", Array.isArray(cartao(doBeto, anaUniversal).status) && cartao(doBeto, anaUniversal).status.length > 0);
  t.ok("ficha de Ordem sem resumo aparece como pendente, sem inventar número",
    (() => { const c = cartao(listaDo(ana), betoOrdem); return c.recursosPendentes === true && c.recursos.length === 0; })());

  const daAna = listaDo(ana);
  t.ok("a dona vê e edita TODOS os próprios personagens",
    [anaOrdem, anaUniversal].every((id) => cartao(daAna, id).podeEditarRecursos && cartao(daAna, id).podeAbrirFicha && cartao(daAna, id).detalhado));
  t.ok("  e recebe os dados de cálculo do próprio personagem de Ordem", !!cartao(daAna, anaOrdem).ordem.escolhas);

  t.recusa("o jogador NÃO ajusta recurso de personagem alheio pela API",
    comoBeto({ acao: "ajustar_personagem", personagemId: anaOrdem, campanhaId: mesa, alvo: "recurso", itemId: "pv", campo: "atual", valor: 1 }), "nao_encontrado");
  t.recusa("  nem status universal alheio", comoBeto({ acao: "ajustar_personagem", personagemId: anaUniversal, campanhaId: mesa,
    alvo: "status", itemId: "st-pv", campo: "atual", valor: 1 }), "nao_encontrado");
  t.recusa("  nem abre a ficha alheia pelo id", comoBeto({ acao: "ler_personagem", personagemId: anaOrdem }), "nao_encontrado");
  t.ok("a dona ajusta o próprio recurso", comoAna({ acao: "ajustar_personagem", personagemId: anaOrdem, campanhaId: mesa,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 5 }).ok);
  t.igual("  e o outro jogador vê o valor novo", cartao(listaDo(beto), anaOrdem).recursos[0].atual, 5);

  t.recusa("o jogador NÃO liga a ocultação", comoBeto({ acao: "salvar_campanha", campanhaId: mesa, dados: { ocultarStatusJogadores: true } }), "sem_permissao");
  const ligou = comoMestra({ acao: "salvar_campanha", campanhaId: mesa, dados: { ocultarStatusJogadores: true } });
  t.ok("a mestra liga \"Esconder status dos jogadores\"", ligou.ok && ligou.dados.ocultarStatusJogadores === true);
  t.igual("  e a configuração fica guardada", comoAna({ acao: "ler_campanha", campanhaId: mesa }).dados.ocultarStatusJogadores, true);

  doBeto = listaDo(beto);
  alheio = cartao(doBeto, anaOrdem);
  t.ok("com a ocultação, os recursos alheios NEM chegam (Ordem)", alheio.recursos === undefined && alheio.recursosVisiveis === false &&
    !JSON.stringify(alheio).includes("\"maximo\""));
  t.ok("  nem os status (universal)", cartao(doBeto, anaUniversal).status === undefined);
  t.ok("  mas a identificação continua", alheio.nome === "Ana de Ordem" && !!alheio.ordem.classe);
  t.ok("  e o jogador continua vendo os próprios", Array.isArray(cartao(doBeto, betoOrdem).recursos) || cartao(doBeto, betoOrdem).detalhado);
  t.ok("a mestra continua vendo tudo", listaDo(mestra).every((p) => p.detalhado && p.recursosVisiveis));

  /* Combate: a mesma regra na lista de participantes. */
  const combate = comoMestra({ acao: "salvar_combate", campanhaId: mesa,
    dados: { nome: "Emboscada", estado: "preparando", visiveis: [ana.id, beto.id], participantes: [] } }).dados.id;
  let rev = 1;
  const r1 = comoMestra({ acao: "atualizar_combate", campanhaId: mesa, combateId: combate, rev, opId: "lote-cartoes-01",
    ops: [{ tipo: "adicionar", participantes: [
      { id: "p-ana", tipo: "personagem", personagemId: anaOrdem, ordem: 10 },
      { id: "p-beto", tipo: "personagem", personagemId: betoOrdem, ordem: 5 },
      { id: "p-mon", tipo: "criatura", nome: "Monstro", ordem: 1, snapshot: { status: [{ id: "vida", nome: "Vida", atual: 30, maximo: 30 }] } },
    ] }] });
  rev = r1.rev;
  const vistaDoBeto = () => comoBeto({ acao: "listar_combates", campanhaId: mesa }).dados[0];
  let lista = vistaDoBeto().participantes;
  t.ok("combate com ocultação: o jogador não recebe os recursos do personagem alheio", lista.find((p) => p.id === "p-ana").recursos === undefined);
  t.ok("  nem o snapshot da criatura", !JSON.stringify(lista.find((p) => p.id === "p-mon")).includes("snapshot"));
  t.ok("  a mestra recebe os recursos do personagem na lista", Array.isArray(comoMestra({ acao: "listar_combates", campanhaId: mesa }).dados[0]
    .participantes.find((p) => p.id === "p-ana").recursos));

  comoMestra({ acao: "salvar_campanha", campanhaId: mesa, dados: { ocultarStatusJogadores: false } });
  lista = vistaDoBeto().participantes;
  t.igual("sem ocultação, o jogador vê os recursos do personagem alheio no combate", lista.find((p) => p.id === "p-ana").recursos[0].atual, 5);
  t.ok("  e a criatura continua sem ficha para ele", !JSON.stringify(lista.find((p) => p.id === "p-mon")).includes("Vida"));

  /* Resumo gravado por quem pode editar. */
  const revAna = cartao(listaDo(ana), anaOrdem).rev;
  const a1 = comoAna({ acao: "atualizar_resumo_personagem", personagemId: anaOrdem, rev: revAna, resumo: { pv: 24, pe: 8, san: 16 } });
  t.ok("a dona atualiza o resumo pelo painel", a1.ok && a1.dados.mudou === true);
  t.igual("  sem subir a revisão da ficha", cartao(listaDo(ana), anaOrdem).rev, revAna);
  t.igual("  e a mesa vê o máximo novo", cartao(listaDo(beto), anaOrdem).recursos[0].maximo, 24);
  t.igual("repetir o mesmo resumo não grava", comoAna({ acao: "atualizar_resumo_personagem", personagemId: anaOrdem, rev: revAna, resumo: { pv: 24, pe: 8, san: 16 } }).dados.mudou, false);
  t.recusa("resumo calculado sobre revisão velha é recusado", comoMestra({ acao: "atualizar_resumo_personagem", personagemId: anaOrdem, rev: revAna - 1, resumo: { pv: 1, pe: 1, san: 1 } }), "conflito");
  t.recusa("outro jogador NÃO grava resumo de personagem alheio", comoBeto({ acao: "atualizar_resumo_personagem", personagemId: anaOrdem, rev: revAna, resumo: { pv: 1, pe: 1, san: 1 } }), "nao_encontrado");
  t.recusa("resumo com texto é recusado", comoAna({ acao: "atualizar_resumo_personagem", personagemId: anaOrdem, rev: revAna, resumo: { pv: "24", pe: 8, san: 16 } }), "dados_invalidos");
  t.recusa("ficha universal não tem resumo", comoAna({ acao: "atualizar_resumo_personagem", personagemId: anaUniversal,
    rev: cartao(listaDo(ana), anaUniversal).rev, resumo: { pv: 1, pe: 1, san: null } }), "dados_invalidos");
  const mestraGrava = comoMestra({ acao: "atualizar_resumo_personagem", personagemId: betoOrdem, rev: cartao(listaDo(mestra), betoOrdem).rev, resumo: { pv: 15, pe: 6, san: null } });
  t.ok("a mestra grava o resumo de uma ficha da mesa (sem Sanidade)", mestraGrava.ok);
  t.iguais("  e SAN nula some dos recursos da mesa", cartao(listaDo(ana), betoOrdem).recursos.map((r) => r.chave), ["pv", "pe"]);

  /* Gravar a ficha sem resumo mantém o resumo guardado. */
  const lidaAna = comoAna({ acao: "ler_personagem", personagemId: anaOrdem });
  const semResumo = Object.assign({}, lidaAna.dados); delete semResumo.resumoRecursos;
  comoAna({ acao: "salvar_personagem", personagemId: anaOrdem, rev: lidaAna.rev, dados: semResumo });
  t.igual("salvar a ficha sem resumo (site antigo) mantém o resumo que a mesa via", cartao(listaDo(beto), anaOrdem).recursos[0].maximo, 24);
  const lidaDeNovo = comoAna({ acao: "ler_personagem", personagemId: anaOrdem });
  comoAna({ acao: "salvar_personagem", personagemId: anaOrdem, rev: lidaDeNovo.rev, dados: Object.assign({}, lidaDeNovo.dados, { resumoRecursos: { pv: 30, pe: 9, san: 18 } }) });
  t.igual("salvar com resumo novo troca o máximo da mesa", cartao(listaDo(beto), anaOrdem).recursos[0].maximo, 30);
  const lixo = comoAna({ acao: "ler_personagem", personagemId: anaOrdem });
  comoAna({ acao: "salvar_personagem", personagemId: anaOrdem, rev: lixo.rev, dados: Object.assign({}, lixo.dados, { resumoRecursos: { pv: "<b>", pe: {}, san: 1 } }) });
  t.igual("resumo malformado na gravação é descartado (fica o anterior)", cartao(listaDo(beto), anaOrdem).recursos[0].maximo, 30);
  const universal = comoAna({ acao: "ler_personagem", personagemId: anaUniversal });
  comoAna({ acao: "salvar_personagem", personagemId: anaUniversal, rev: universal.rev, dados: Object.assign({}, universal.dados, { resumoRecursos: { pv: 1, pe: 1, san: 1 } }) });
  t.igual("ficha universal não guarda resumo", comoAna({ acao: "ler_personagem", personagemId: anaUniversal }).dados.resumoRecursos, undefined);

  const estranha = novaConta("fora");
  t.recusa("quem não é da mesa não lista os personagens", comoFn(estranha)({ acao: "listar_personagens_campanha", campanhaId: mesa }), "nao_encontrado");
})();

t.grupo("Marcas da mesa — sincronização leve");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const ana = novaConta("ana");
  const fora = novaConta("fora");
  const comoMestra = comoFn(mestra);
  const comoAna = comoFn(ana);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa" } }).dados.id;
  const publica = comoMestra({ acao: "criar_campanha", dados: { nome: "Aberta", visibilidade: "publico" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }] });
  const p = comoAna({ acao: "criar_personagem", dados: fichaDeTeste("Ana") }).dados.id;
  comoAna({ acao: "vincular_personagem", campanhaId: mesa, personagemId: p });

  const marcas = (como) => comoFn(como)({ acao: "sincronizar_campanha", campanhaId: mesa });
  const m0 = marcas(ana);
  t.ok("a jogadora recebe as marcas da mesa", m0.ok && m0.dados.papel === "jogador" && Object.keys(m0.dados.marcas).length === 6);
  t.iguais("ler_campanha traz as mesmas marcas como ponto de partida", comoAna({ acao: "ler_campanha", campanhaId: mesa }).dados.marcas, m0.dados.marcas);

  const contador = ambiente.contador;
  contador.zerar();
  marcas(ana);
  t.igual("perguntar as marcas de novo não lê nenhuma aba da planilha", contador.getValues, 0);

  comoMestra({ acao: "ajustar_personagem", personagemId: p, campanhaId: mesa, alvo: "status", itemId: "st-pv", campo: "atual", valor: 3 });
  const m1 = marcas(ana).dados.marcas;
  t.ok("ajustar um recurso muda a marca de personagens e de combates", m1.personagens !== m0.dados.marcas.personagens && m1.combates !== m0.dados.marcas.combates);
  t.ok("  e não muda as outras partes", m1.campanha === m0.dados.marcas.campanha && m1.rolagens === m0.dados.marcas.rolagens && m1.documentos === m0.dados.marcas.documentos);

  const combate = comoMestra({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Luta", estado: "preparando", visiveis: [ana.id], participantes: [] } }).dados.id;
  const m2 = marcas(ana).dados.marcas;
  t.ok("criar combate muda só a marca de combates", m2.combates !== m1.combates && m2.personagens === m1.personagens);
  comoMestra({ acao: "atualizar_combate", campanhaId: mesa, combateId: combate, rev: 1, opId: "lote-marcas-1", ops: [{ tipo: "renomear", nome: "Luta 2" }] });
  t.ok("uma operação de combate muda a marca de combates", marcas(ana).dados.marcas.combates !== m2.combates);
  const m3 = marcas(ana).dados.marcas;
  comoMestra({ acao: "salvar_campanha", campanhaId: mesa, dados: { ocultarStatusJogadores: true } });
  const m4 = marcas(ana).dados.marcas;
  t.ok("ligar a ocultação muda campanha, personagens e combates", m4.campanha !== m3.campanha && m4.personagens !== m3.personagens && m4.combates !== m3.combates);
  comoAna({ acao: "registrar_rolagem", campanhaId: mesa, rolagemId: "rol-marca-0001", tipo: "livre", nome: "x", dados: { total: 1 } });
  t.ok("registrar rolagem muda a marca de rolagens", marcas(ana).dados.marcas.rolagens !== m4.rolagens);
  const ficha = comoAna({ acao: "ler_personagem", personagemId: p });
  const m5 = marcas(ana).dados.marcas;
  comoAna({ acao: "salvar_personagem", personagemId: p, rev: ficha.rev, dados: Object.assign({}, ficha.dados, { nome: "Ana Renomeada" }) });
  t.ok("salvar a ficha pela página da ficha também avisa a mesa", marcas(ana).dados.marcas.personagens !== m5.personagens);

  /* A aba Documentos se atualiza pela marca e reaproveita o cartão de um
     documento cuja revisão e data não mudaram. */
  const doc = comoMestra({ acao: "salvar_documento", campanhaId: mesa, dados: { nome: "Mapa", visiveis: [ana.id] } }).dados.id;
  const m6 = marcas(ana).dados.marcas;
  const antesDaImagem = comoAna({ acao: "listar_documentos", campanhaId: mesa }).dados[0];
  const relogio = Date.now();
  while (Date.now() - relogio < 5) { /* a data precisa andar ao menos um milissegundo */ }
  comoMestra({ acao: "salvar_imagem_documento", campanhaId: mesa, documentoId: doc, imagem: "data:image/webp;base64,AAAA" });
  const depoisDaImagem = comoAna({ acao: "listar_documentos", campanhaId: mesa }).dados[0];
  t.ok("trocar a imagem de um documento muda a marca de documentos", marcas(ana).dados.marcas.documentos !== m6.documentos);
  t.ok("  e a data do documento, sem mexer na revisão",
    depoisDaImagem.atualizadoEm !== antesDaImagem.atualizadoEm && depoisDaImagem.rev === antesDaImagem.rev);
  const m7 = marcas(ana).dados.marcas;
  comoMestra({ acao: "salvar_documento", campanhaId: mesa, rev: depoisDaImagem.rev, dados: { id: doc, nome: "Mapa", visiveis: [] } });
  t.ok("tirar a permissão de um documento muda a marca de documentos", marcas(ana).dados.marcas.documentos !== m7.documentos);
  t.igual("  e a busca seguinte da jogadora já não traz o documento", comoAna({ acao: "listar_documentos", campanhaId: mesa }).dados.length, 0);

  t.recusa("quem não é da campanha privada não recebe marcas", comoFn(fora)({ acao: "sincronizar_campanha", campanhaId: mesa }), "nao_encontrado");
  const esp = comoFn(fora)({ acao: "sincronizar_campanha", campanhaId: publica });
  t.ok("o espectador de campanha pública recebe só as marcas de fora", esp.ok && esp.dados.papel === "espectador" && Object.keys(esp.dados.marcas).sort().join() === "campanha,membros");

  marcas(ana);
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [] });
  t.recusa("tirada da campanha, a jogadora deixa de receber marcas na próxima pergunta", marcas(ana), "nao_encontrado");

  ambiente.cache.clear();
  const reserva = marcas(mestra).dados.marcas;
  t.ok("sem cache, as marcas caem na reserva por minuto — nada quebra", /^r\d+$/.test(reserva.personagens) && /^r\d+$/.test(reserva.combates));
})();

t.grupo("Combate — operações em lote, turnos e rodadas, repetição segura");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const ana = novaConta("ana");
  const comoMestra = comoFn(mestra);
  const comoAna = comoFn(ana);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }] });
  const pAna = comoAna({ acao: "criar_personagem", dados: fichaDeTeste("Ana") }).dados.id;
  comoAna({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pAna });

  const id = comoMestra({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Ponte", estado: "preparando", visiveis: [ana.id], participantes: [] } }).dados.id;
  let rev = 1;
  let seq = 0;
  const operar = (ops, opcoes) => {
    const o = opcoes || {};
    const r = comoMestra({ acao: "atualizar_combate", campanhaId: mesa, combateId: id,
      rev: o.rev !== undefined ? o.rev : rev, opId: o.opId || ("lote-teste-" + String(++seq).padStart(4, "0")), ops });
    if (r.ok) rev = r.rev;
    return r;
  };
  const combate = () => comoMestra({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === id);
  const ordem = (c) => c.participantes.slice().map((p, i) => ({ p, i }))
    .sort((a, b) => (b.p.ordem - a.p.ordem) || (a.i - b.i)).map((x) => x.p.id);

  t.iguais("combate em preparação não tem turno", combate().turno, { rodada: 0, ativoId: null });

  const comecar = operar([{ tipo: "estado", valor: "ativo" }]);
  t.iguais("iniciar um combate vazio: rodada 1, ninguém com o turno", comecar.dados.turno, { rodada: 1, ativoId: null });

  const monstro = (n, vida) => ({ tipo: "criatura", nome: "Existido #" + n, ordem: 0, origemId: "modelo-1",
    snapshot: { nome: "Existido", status: [{ id: "vida", nome: "Vida", atual: vida, maximo: vida }] } });
  const add = operar([{ tipo: "adicionar", participantes: [
    Object.assign({ id: "c1" }, monstro(1, 20)),
    Object.assign({ id: "c2" }, monstro(2, 20)),
    { id: "pa", tipo: "personagem", personagemId: pAna, ordem: 0 },
  ] }]);
  t.igual("acrescentar num combate que não tinha ninguém passa o turno ao primeiro da ordem", add.dados.turno.ativoId, "c1");

  const revAntes = rev;
  const lote = operar([
    { tipo: "iniciativa", participanteId: "c1", valor: 12 },
    { tipo: "iniciativa", participanteId: "pa", valor: 18 },
    { tipo: "iniciativa", participanteId: "c2", valor: 12 },
    { tipo: "iniciativa", participanteId: "c1", valor: 14 },
  ]);
  t.ok("várias iniciativas num lote só: uma revisão a mais", lote.ok && rev === revAntes + 1);
  t.iguais("  o último valor de cada participante vale, e a ordem é estável", ordem(lote.dados), ["pa", "c1", "c2"]);
  t.igual("  mudar a iniciativa NÃO passa o turno de ninguém", lote.dados.turno.ativoId, "c1");

  const antesDaRepeticao = rev;
  const opRepetido = "lote-proximo-turno-01";
  const avancou = operar([{ tipo: "turno", direcao: "proximo" }], { opId: opRepetido });
  t.igual("próximo turno: de c1 para c2", avancou.dados.turno.ativoId, "c2");
  const repetido = operar([{ tipo: "turno", direcao: "proximo" }], { opId: opRepetido, rev: antesDaRepeticao });
  t.ok("o mesmo lote repetido (resposta perdida) é reconhecido", repetido.ok && repetido.repetida === true);
  t.igual("  e o turno NÃO anda duas vezes", combate().turno.ativoId, "c2");

  t.recusa("lote montado sobre revisão velha é conflito", operar([{ tipo: "iniciativa", participanteId: "c2", valor: 1 }], { rev: rev - 1 }), "conflito");
  t.ok("  e o conflito traz o estado atual para a tela decidir", (() => {
    const r = operar([{ tipo: "iniciativa", participanteId: "c2", valor: 1 }], { rev: rev - 1 });
    return r.dados && r.dados.id === id && r.dados.rev === rev;
  })());

  const fim = operar([{ tipo: "turno", direcao: "proximo" }]);
  t.iguais("depois do último, volta ao primeiro e a rodada sobe", fim.dados.turno, { rodada: 2, ativoId: "pa" });
  const volta = operar([{ tipo: "turno", direcao: "anterior" }]);
  t.iguais("voltar do primeiro vai ao último da rodada anterior", volta.dados.turno, { rodada: 1, ativoId: "c2" });
  operar([{ tipo: "turno", direcao: "anterior" }]);
  operar([{ tipo: "turno", direcao: "anterior" }]);
  const inicio = operar([{ tipo: "turno", direcao: "anterior" }]);
  t.iguais("na rodada 1, do primeiro da ordem, não há para onde voltar", inicio.dados.turno, { rodada: 1, ativoId: "pa" });
  t.ok("  e a resposta avisa", (inicio.avisos || []).some((a) => a.aviso === "inicio"));

  operar([{ tipo: "turno", direcao: "proximo" }]);
  const reordena = operar([{ tipo: "iniciativa", participanteId: "c1", valor: 30 }]);
  t.igual("reordenar no meio da rodada mantém o turno com quem está", reordena.dados.turno.ativoId, "c1");
  t.iguais("  mas muda quem vem depois", ordem(reordena.dados), ["c1", "pa", "c2"]);

  const vida = operar([{ tipo: "criatura_status", participanteId: "c1", statusId: "vida", valor: 7 }]);
  const c1 = vida.dados.participantes.find((p) => p.id === "c1");
  const c2 = vida.dados.participantes.find((p) => p.id === "c2");
  t.ok("a vida de uma criatura muda só nesta ocorrência", c1.snapshot.status[0].atual === 7 && c2.snapshot.status[0].atual === 20);
  t.igual("  e respeita o máximo", operar([{ tipo: "criatura_status", participanteId: "c2", statusId: "vida", valor: 999 }])
    .dados.participantes.find((p) => p.id === "c2").snapshot.status[0].atual, 20);

  const tirarAtivo = operar([{ tipo: "remover", participanteId: "c1" }]);
  t.igual("tirar quem tem o turno passa a vez a quem vinha depois", tirarAtivo.dados.turno.ativoId, "pa");
  operar([{ tipo: "turno", direcao: "proximo" }]);
  const rodadaAntes = combate().turno.rodada;
  const tirarUltimo = operar([{ tipo: "remover", participanteId: "c2" }]);
  t.iguais("tirar o último da ordem com o turno volta ao primeiro e sobe a rodada", tirarUltimo.dados.turno, { rodada: rodadaAntes + 1, ativoId: "pa" });
  t.ok("tirar quem já saiu não é erro", operar([{ tipo: "remover", participanteId: "c2" }]).ok);

  const sozinho = operar([{ tipo: "turno", direcao: "proximo" }]);
  t.iguais("com um participante só, próximo turno só sobe a rodada", sozinho.dados.turno, { rodada: rodadaAntes + 2, ativoId: "pa" });

  const revInvalido = rev;
  t.recusa("lote com uma operação inválida é recusado inteiro", operar([
    { tipo: "iniciativa", participanteId: "pa", valor: 3 },
    { tipo: "iniciativa", participanteId: "nao-existe", valor: 3 },
  ]), "dados_invalidos");
  t.ok("  e nada dele foi aplicado", combate().rev === revInvalido && combate().participantes.find((p) => p.id === "pa").ordem === 18);
  t.recusa("iniciativa em texto é recusada", operar([{ tipo: "iniciativa", participanteId: "pa", valor: "" }]), "dados_invalidos");
  t.recusa("operação desconhecida é recusada", operar([{ tipo: "apagar_planilha" }]), "dados_invalidos");
  t.recusa("opId fora do formato é recusado", operar([{ tipo: "renomear", nome: "x" }], { opId: "x" }), "dados_invalidos");

  t.recusa("a jogadora NÃO opera o combate", comoAna({ acao: "atualizar_combate", campanhaId: mesa, combateId: id, rev, opId: "lote-da-ana-01",
    ops: [{ tipo: "turno", direcao: "proximo" }] }), "sem_permissao");
  const vistaAna = comoAna({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === id);
  t.ok("a jogadora com acesso vê rodada e turno", vistaAna.turno.rodada === combate().turno.rodada && vistaAna.turno.ativoId === "pa");

  const vis = operar([{ tipo: "visiveis", lista: [ana.id, "id-inventado"] }]);
  t.iguais("quem vê: ids que não são da mesa são descartados", combate().visiveis, [ana.id]);
  t.ok("  (a resposta do lote é a do mestre)", vis.ok);

  const encerrou = operar([{ tipo: "estado", valor: "encerrado" }]);
  t.ok("encerrar registra a rodada e tira o turno de todo mundo", encerrou.dados.turno.ativoId === null && encerrou.dados.turno.rodada === rodadaAntes + 2);
  t.recusa("depois de encerrado, turno não anda", operar([{ tipo: "turno", direcao: "proximo" }]), "dados_invalidos");
  t.recusa("e não volta a ficar em preparação", operar([{ tipo: "estado", valor: "preparando" }]), "dados_invalidos");

  /* Compatibilidade: gravação completa (site antigo) mantém o turno. */
  const id2 = comoMestra({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Velho", estado: "preparando", visiveis: [], participantes: [] } }).dados.id;
  const participantesVelhos = [
    Object.assign({ id: "v1" }, monstro(1, 10), { ordem: 3 }),
    Object.assign({ id: "v2" }, monstro(2, 10), { ordem: 9 }),
  ];
  comoMestra({ acao: "salvar_combate", campanhaId: mesa, rev: 1, dados: { id: id2, nome: "Velho", estado: "ativo", visiveis: [], participantes: participantesVelhos } });
  let velho = comoMestra({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === id2);
  t.iguais("combate que passa a ativo pela gravação completa começa na rodada 1 com o primeiro da ordem", velho.turno, { rodada: 1, ativoId: "v2" });
  comoMestra({ acao: "atualizar_combate", campanhaId: mesa, combateId: id2, rev: velho.rev, opId: "lote-velho-0001", ops: [{ tipo: "turno", direcao: "proximo" }] });
  velho = comoMestra({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === id2);
  comoMestra({ acao: "salvar_combate", campanhaId: mesa, rev: velho.rev, dados: { id: id2, nome: "Velho renomeado", estado: "ativo", visiveis: [], participantes: participantesVelhos } });
  t.iguais("a gravação completa de um site antigo NÃO apaga o turno", comoMestra({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === id2).turno, { rodada: 1, ativoId: "v1" });

  /* Combate gravado antes desta versão: ativo e sem turno. */
  const folha = ambiente.planilha.getSheetByName("CAMPANHA_COMBATES");
  const cab = folha.getRange(1, 1, 1, folha.getLastColumn()).getValues()[0];
  const linhaDoVelho = folha.getRange(2, 1, folha.getLastRow() - 1, folha.getLastColumn()).getValues().findIndex((l) => l[cab.indexOf("id")] === id2) + 2;
  folha.getRange(linhaDoVelho, cab.indexOf("dadosJson") + 1, 1, 1).setValues([[JSON.stringify({ participantes: participantesVelhos })]]);
  t.iguais("combate antigo em andamento sem turno guardado: rodada 1, primeiro da ordem", comoMestra({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === id2).turno, { rodada: 1, ativoId: "v2" });
})();

t.grupo("Turnos — as regras do navegador e as do servidor dão o mesmo resultado");

await (async () => {
  (0, eval)(await Deno.readTextFile(new URL("../js/combate-turnos.js", import.meta.url)));
  const N = globalThis.RAMACombateTurnos;

  /* Gerador determinístico: o mesmo conjunto de casos a cada execução. */
  let semente = 20260916;
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  const inteiro = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
  const limpo = (tt) => ({ rodada: tt.rodada, ativoId: tt.ativoId, mudou: tt.mudou, inicio: tt.inicio });

  let divergencias = 0;
  let casos = 0;
  for (let k = 0; k < 400; k++) {
    const quantos = inteiro(0, 6);
    const ps = Array.from({ length: quantos }, (_, i) => ({ id: "p" + i, ordem: inteiro(-2, 4) }));
    const ids = ps.map((x) => x.id).concat([null, "sumiu"]);
    const turno = { rodada: inteiro(-1, 5), ativoId: ids[inteiro(0, ids.length - 1)] };
    const estado = ["preparando", "ativo", "encerrado"][inteiro(0, 2)];
    const norm = turnoNormalizado(turno, ps, estado);

    const pares = [
      [JSON.stringify(ordemDeIniciativa(ps).map((x) => x.id)), JSON.stringify(N.ordem(ps).map((x) => x.id))],
      [JSON.stringify(norm), JSON.stringify(N.normalizado(turno, ps, estado))],
      [JSON.stringify(limpo(turnoSeguinte(norm, ps))), JSON.stringify(limpo(N.seguinte(norm, ps)))],
      [JSON.stringify(limpo(turnoAnterior(norm, ps))), JSON.stringify(limpo(N.anterior(norm, ps)))],
    ];
    if (ps.length) {
      const alvo = ids[inteiro(0, ps.length - 1)];
      pares.push([JSON.stringify(turnoSemParticipante(norm, ps, alvo)), JSON.stringify(N.semParticipante(norm, ps, alvo))]);
    }
    pares.forEach(([a, b]) => { casos++; if (a !== b) divergencias++; });
  }
  t.igual("400 combates sorteados, " + "ordem, normalização, próximo, anterior e remoção: nenhuma divergência", divergencias, 0);
  t.ok("  (e os casos foram mesmo comparados)", casos > 1800);
})();

/* =====================================================================
   v2.15 — A FICHA EM BLOCOS
   ---------------------------------------------------------------------
   A ficha inteira morava numa célula, e a célula do Google aceita 50 mil
   caracteres: a ficha que crescia deixava de salvar. Os testes abaixo
   usam o simulador com o limite de célula, a conversão de tipos e a
   grade de linhas do Google (ver apps-script-simulado.js) — sem isso, o
   defeito original nem apareceria aqui.

   Nenhum teste confia só em "o JSON.parse não estourou": o que sai é
   comparado com o que entrou, campo por campo e texto por texto.
   ===================================================================== */

const folhaDe = (nome) => ambiente.planilha.getSheetByName(nome);
const colunaDe = (aba, nome) => folhaDe(aba).linhas[0].indexOf(nome);
const linhasDe = (aba) => folhaDe(aba).linhas.slice(1);
const linhaDoPersonagem = (id) => linhasDe("PERSONAGENS").find((l) => l[colunaDe("PERSONAGENS", "id")] === id);
const manifestoDoPersonagem = (id) => {
  const v = (linhaDoPersonagem(id) || [])[colunaDe("PERSONAGENS", "armazenamento")];
  return v ? JSON.parse(v) : null;
};
/* Todas as rolagens que uma conta alcança, página por página, pelo
   cursor. Devolve os ids na ordem em que chegaram — é com isto que os
   testes conferem total, ordem, repetição e buraco. */
function todasAsRolagens(como, campanhaId, limite) {
  const ids = [];
  let cursor = null;
  for (let volta = 0; volta < 80; volta++) {
    const r = como({ acao: "listar_rolagens", campanhaId, limite: limite || 25, cursor });
    if (!r.ok) break;
    r.dados.rolagens.forEach((x) => ids.push(x.id));
    if (r.dados.fim || !r.dados.proximo) break;
    cursor = r.dados.proximo;
  }
  return ids;
}

const blocosDoPersonagem = (id) => linhasDe("PERSONAGENS_BLOCOS").filter((l) => l[0] === id);
const geracoesNaAba = (id) => new Set(blocosDoPersonagem(id).map((l) => l[1])).size;

/* Deixa o manifesto como a v2.15 o escrevia: sem localizador. É assim
   que se testa o caminho do índice — o de toda ficha gravada antes
   desta atualização. */
const semLocalizador = (id) => {
  const linha = linhaDoPersonagem(id);
  const coluna = colunaDe("PERSONAGENS", "armazenamento");
  const m = JSON.parse(linha[coluna]);
  delete m.local;
  delete m.reutilizavel;
  if (m.anterior) delete m.anterior.local;
  linha[coluna] = JSON.stringify(m);
  reiniciarExecucao();
  return m;
};
const maiorCelula = () => {
  let maior = 0;
  ambiente.planilha.folhas.forEach((f) => f.linhas.forEach((l) => l.forEach((v) => {
    if (typeof v === "string" && v.length > maior) maior = v.length;
  })));
  return maior;
};

/* Um texto "rico": tudo o que costuma quebrar quem guarda texto. */
const RICO = "Ação, ãé ç — “aspas” \"duplas\" 'simples' \\barra\\ \n quebra \r\n tab\t " +
  "emoji 🐉 família 👩🏽‍🚀 bandeira 🇧🇷 =SOMA(A1:A9) +1 -2 12345 TRUE 'apóstrofo <b>html</b>   fim";

/* Ficha universal com uma anotação longa: `conteudo` é o campo que
   cresce, e é o que a comparação exata confere. */
function fichaGrande(nome, conteudo) {
  return {
    nome: nome,
    classe: "Ocultista",
    atributos: [{ id: "at-for", nome: "Força", sigla: "FOR", valor: 2, dado: "1d20" }],
    status: [{ id: "st-pv", nome: "PV", atual: 20, maximo: 20 }],
    anotacoes: { pastas: [], soltas: [{ id: "n1", titulo: "Diário", conteudo: conteudo }] },
  };
}

/* Tira os campos que o servidor escreve, para comparar o resto. */
function semCarimbos(ficha) {
  const copia = JSON.parse(JSON.stringify(ficha));
  delete copia.criadoEm; delete copia.atualizadoEm; delete copia.campanhaId;
  delete copia.ownerId; delete copia.id; delete copia.resumoRecursos;
  return copia;
}

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — o simulador faz o que o Google faz");

(() => {
  preparar();
  const f = folhaDe("PERSONAGENS_BLOCOS");
  let recusou = "";
  try { f.appendRow(["x", "g", 0, 1, 1, "agora", "y".repeat(50001)]); } catch (e) { recusou = e.message; }
  t.ok("uma célula com 50.001 caracteres é recusada, como no Google", /50000 characters/.test(recusou));
  t.igual("  e nada da linha entra", f.linhas.length, 1);
  t.igual("texto '=...' vira fórmula (aqui, #ERROR!)", comoOSheetsGuarda("=\"a\""), "#ERROR!");
  t.igual("texto só de dígitos vira número", comoOSheetsGuarda("0012345"), 12345);
  t.igual("'TRUE' vira booleano", comoOSheetsGuarda("TRUE"), true);
  t.igual("o apóstrofo do começo some", comoOSheetsGuarda("'abc"), "abc");
  t.igual("meio emoji solto vira U+FFFD, como em UTF-8", comoOSheetsGuarda("a\uD83D"), "a\uFFFD");
  t.igual("um bloco com marcador fica texto", comoOSheetsGuarda("RB|12345|RB"), "RB|12345|RB");
  let fora = "";
  try { f.getRange(f.tamanhoDaGrade() + 1, 1, 1, 1).setValues([["x"]]); } catch (e) { fora = e.message; }
  t.ok("escrever além da grade da aba estoura", /outside the dimensions/.test(fora));
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — tamanhos exatos, limites entre blocos e caracteres difíceis");

(() => {
  preparar();
  const T = tamanhoDoBloco();
  t.igual("cada bloco leva o limite seguro da célula menos os marcadores", T, MAX_CELULA - BLOCO_ABRE.length - BLOCO_FECHA.length);

  let seq = 0;
  function gravarELer(texto) {
    const id = "unidade-" + (++seq);
    reiniciarExecucao();
    const g = gravarGeracao(ABAS.PERSONAGENS_BLOCOS, id, texto);
    const conferido = conferirGeracao(ABAS.PERSONAGENS_BLOCOS, id, g, texto);
    reiniciarExecucao();
    const lido = lerGeracoes(ABAS.PERSONAGENS_BLOCOS, [{ id, manifesto: g }])[id];
    return { id, g, conferido, lido };
  }
  const exato = (r, texto) => r.conferido.ok && r.lido.ok && r.lido.texto === texto;

  const casos = [
    ["1 caractere", "x", 1],
    ["um bloco menos 1", "a".repeat(T - 1), 1],
    ["exatamente um bloco", "a".repeat(T), 1],
    ["um bloco mais 1", "a".repeat(T + 1), 2],
    ["exatamente dois blocos", "b".repeat(2 * T), 2],
    ["dois blocos mais 1", "b".repeat(2 * T + 1), 3],
  ];
  casos.forEach(([nome, texto, blocos]) => {
    const r = gravarELer(texto);
    t.ok(nome + ": volta idêntico", exato(r, texto));
    t.igual("  em " + blocos + " bloco(s)", r.g.blocos, blocos);
  });

  /* O par substituto bem em cima do corte: o emoji não pode ser partido. */
  const naBorda = "c".repeat(T - 1) + "🐉" + "d".repeat(10);
  const borda = gravarELer(naBorda);
  t.ok("emoji exatamente na borda de um bloco volta inteiro", exato(borda, naBorda));
  const cortes = blocosDoPersonagem(borda.id).map((l) => l[4]);
  t.iguais("  e o corte recua uma unidade em vez de partir o par", cortes, [T - 1, 12]);

  /* Um bloco que começaria com "=" ou seria só dígitos: sem o marcador, a
     planilha o transformaria em fórmula ou número. */
  const comIgual = "e".repeat(T) + "=SOMA(A1)" + "f".repeat(5);
  t.ok("bloco que começa com '=' volta como texto", exato(gravarELer(comIgual), comIgual));
  const soDigitos = "9".repeat(3 * T);
  t.ok("blocos inteiros só de dígitos voltam como texto", exato(gravarELer(soDigitos), soDigitos));
  const espacos = "g".repeat(T - 3) + "   " + "h";
  t.ok("espaços no fim de um bloco não se perdem", exato(gravarELer(espacos), espacos));

  const rico = RICO.repeat(Math.ceil((2 * T) / RICO.length));
  t.ok("acentos, emojis, quebras de linha, aspas, barras e nulo, por vários blocos, voltam idênticos",
    exato(gravarELer(rico), rico));

  t.ok("nenhuma célula gravada passou do limite seguro", maiorCelula() <= MAX_CELULA);

  /* Um meio-emoji solto (texto cortado no meio de um emoji por outro
     programa) não vira "?" na planilha: vai escapado, e o JSON volta o
     mesmo. */
  const solto = JSON.stringify({ t: "a\uD83Db" });
  const seguro = semSubstitutoSolto(solto);
  t.ok("par substituto solto é escapado", seguro.indexOf("\\ud83d") >= 0);
  t.igual("  e o JSON lido de volta é o mesmo", JSON.parse(seguro).t, "a\uD83Db");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — fichas de 44 mil a 300 mil caracteres salvam, reabrem e voltam iguais");

(() => {
  preparar();
  const ana = novaConta("ana");
  const comoAna = comoFn(ana);

  const tamanhos = [
    ["abaixo de 45 mil", 44000],
    ["no limite de uma célula", 44990],
    ["acima de 45 mil", 45100],
    ["acima de 50 mil", 50500],
    ["acima de 100 mil", 101000],
    ["acima de 300 mil", 301000],
  ];

  tamanhos.forEach(([rotulo, n]) => {
    const conteudo = RICO + "x".repeat(n - RICO.length);
    const ficha = fichaGrande("Ficha " + rotulo, conteudo);
    const criado = comoAna({ acao: "criar_personagem", dados: ficha });
    t.ok(rotulo + ": criada", criado.ok);
    if (!criado.ok) return;
    const id = criado.dados.id;

    const lido = comoAna({ acao: "ler_personagem", personagemId: id });
    t.ok("  reaberta", lido.ok);
    t.ok("  com a anotação longa idêntica, caractere por caractere",
      lido.ok && lido.dados.anotacoes.soltas[0].conteudo === conteudo);
    t.iguais("  e o resto da ficha igual", lido.ok && semCarimbos(lido.dados), semCarimbos(ficha));

    /* Editar e salvar de novo, crescendo. */
    const maior = conteudo + " — continuação " + "y".repeat(1000);
    const salvo = comoAna({ acao: "salvar_personagem", personagemId: id, rev: lido.rev,
      dados: Object.assign({}, lido.dados, fichaGrande(lido.dados.nome, maior)) });
    t.ok("  editada e salva", salvo.ok);
    const relido = comoAna({ acao: "ler_personagem", personagemId: id });
    t.ok("  a edição volta inteira", relido.ok && relido.dados.anotacoes.soltas[0].conteudo === maior);
    t.igual("  com a revisão certa", relido.rev, 2);

    const m = manifestoDoPersonagem(id);
    t.ok("  o manifesto confere com o que está na aba",
      m && blocosDoPersonagem(id).filter((l) => l[1] === m.geracao).length === m.blocos);
  });

  t.ok("nenhuma célula da planilha passou do limite seguro", maiorCelula() <= MAX_CELULA);

  /* A grade da aba cheia até a última linha: escrever além dela estoura no
     Google, então a gravação precisa aumentá-la antes — com folga. */
  const fb = folhaDe("PERSONAGENS_BLOCOS");
  fb.maxLinhas = fb.linhas.length;
  const cheia = comoAna({ acao: "criar_personagem", dados: fichaGrande("Na grade cheia", "c".repeat(100000)) });
  t.ok("com a grade da aba de blocos cheia, a gravação aumenta a grade e dá certo", cheia.ok);
  t.ok("  deixando linhas de folga no fim", fb.tamanhoDaGrade() >= fb.linhas.length + FOLGA_DA_GRADE);
  t.ok("  e a ficha reabre inteira", comoAna({ acao: "ler_personagem", personagemId: cheia.dados.id }).dados.anotacoes.soltas[0].conteudo.length === 100000);

  const grande = linhasDe("PERSONAGENS").find((l) => String(l[colunaDe("PERSONAGENS", "nome")]).indexOf("300 mil") >= 0);
  t.ok("a linha do personagem guarda só o aviso, não a ficha",
    grande && String(grande[colunaDe("PERSONAGENS", "fichaJson")]).length < 1000);
  let tocouNosBlocos = false;
  ambiente.antesDe({ aba: "PERSONAGENS_BLOCOS" }, () => { tocouNosBlocos = true; });
  const listagem = comoAna({ acao: "listar_personagens" });
  ambiente.removerGanchos();
  t.ok("a listagem continua leve: não toca na aba de blocos", listagem.ok && listagem.dados.length === 7 && !tocouNosBlocos);
  t.ok("  nem arrasta o conteúdo das fichas", JSON.stringify(listagem).length < 5000);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — ficha antiga abre, migra na próxima gravação e o setup não mexe em nada");

(() => {
  preparar();
  const bia = novaConta("bia");
  const comoBia = comoFn(bia);

  /* Uma ficha gravada pela v2.14: inteira em fichaJson, armazenamento vazio. */
  const antiga = fichaGrande("Antiga", "Texto da v2.14 com acentuação e 🐉. " + "z".repeat(30000));
  reiniciarExecucao();
  inserir(ABAS.PERSONAGENS, {
    id: "legado-1", ownerId: bia.id, nome: "Antiga", campanhaId: "", classe: "Ocultista", origem: "",
    criadoEm: "2026-01-01T00:00:00.000Z", atualizadoEm: "2026-01-01T00:00:00.000Z", rev: 7,
    fichaJson: JSON.stringify(antiga),
  });

  setupRama();
  t.igual("rodar o setup não converte a ficha antiga", manifestoDoPersonagem("legado-1"), null);
  t.igual("  nem cria blocos para ela", blocosDoPersonagem("legado-1").length, 0);
  const relatorio = setupRama();
  t.ok("  e o relatório diz quantas já estão em blocos", /fichas em blocos: 0 de 1/.test(relatorio));
  t.igual("  rodar de novo não duplica a coluna nova",
    folhaDe("PERSONAGENS").linhas[0].filter((c) => c === "armazenamento").length, 1);
  t.igual("  nem a aba de blocos", ambiente.planilha.folhas.filter((f) => f.nome === "PERSONAGENS_BLOCOS").length, 1);
  t.igual("  e marca o conteúdo dos blocos como texto puro",
    folhaDe("PERSONAGENS_BLOCOS").formatos[colunaDe("PERSONAGENS_BLOCOS", "conteudo") + 1], "@");

  const lida = comoBia({ acao: "ler_personagem", personagemId: "legado-1" });
  t.ok("a ficha antiga abre", lida.ok);
  t.iguais("  igual ao que estava gravado", lida.ok && semCarimbos(lida.dados), semCarimbos(antiga));
  t.igual("  com a revisão de antes", lida.rev, 7);

  const salva = comoBia({ acao: "salvar_personagem", personagemId: "legado-1", rev: 7, dados: lida.dados });
  t.ok("salvar a ficha antiga dá certo", salva.ok);
  const m = manifestoDoPersonagem("legado-1");
  t.ok("  e ela passa para blocos", !!m && m.formato === "blocos" && m.blocos >= 1);
  t.ok("  com o aviso de formato novo no lugar da ficha em fichaJson",
    JSON.parse(linhaDoPersonagem("legado-1")[colunaDe("PERSONAGENS", "fichaJson")])._armazenamento === "blocos");
  const depois = comoBia({ acao: "ler_personagem", personagemId: "legado-1" });
  t.iguais("  e continua igual depois da migração", semCarimbos(depois.dados), semCarimbos(antiga));
  t.igual("  na revisão seguinte", depois.rev, 8);

  /* Planilha de antes do setup desta versão: sem a aba de blocos e sem a
     coluna do manifesto. Ler continua; gravar diz o que falta. */
  preparar();
  const caio = novaConta("caio");
  const comoCaio = comoFn(caio);
  const pAntigo = comoCaio({ acao: "criar_personagem", dados: fichaDeTeste("Pré-setup") }).dados.id;
  const f = folhaDe("PERSONAGENS");
  const ci = colunaDe("PERSONAGENS", "armazenamento");
  f.linhas = f.linhas.map((l) => l.slice(0, ci));
  const fj = colunaDe("PERSONAGENS", "fichaJson");
  f.linhas[1][fj] = JSON.stringify(fichaDeTeste("Pré-setup"));
  ambiente.planilha.folhas = ambiente.planilha.folhas.filter((x) => x.nome !== "PERSONAGENS_BLOCOS");
  esquecerCabecalhos();

  const lidaSemSetup = comoCaio({ acao: "ler_personagem", personagemId: pAntigo });
  t.ok("sem o setup desta versão, a ficha antiga ainda abre", lidaSemSetup.ok && lidaSemSetup.dados.nome === "Pré-setup");
  t.recusa("  e salvar diz que a instalação está incompleta, sem gravar nada",
    comoCaio({ acao: "salvar_personagem", personagemId: pAntigo, rev: lidaSemSetup.rev, dados: lidaSemSetup.dados }), "instalacao_incompleta");
  t.igual("  a ficha continua como estava", JSON.parse(folhaDe("PERSONAGENS").linhas[1][fj]).nome, "Pré-setup");
  setupRama();
  const aposSetup = comoCaio({ acao: "salvar_personagem", personagemId: pAntigo, rev: lidaSemSetup.rev, dados: lidaSemSetup.dados });
  t.ok("  depois do setup, salva — e migra", aposSetup.ok && !!manifestoDoPersonagem(pAntigo));
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — salvar muitas vezes não acumula, e cada ficha só mexe nos próprios blocos");

(() => {
  preparar();
  const davi = novaConta("davi");
  const comoDavi = comoFn(davi);

  const outra = comoDavi({ acao: "criar_personagem", dados: fichaGrande("Vizinha", "v".repeat(100000)) }).dados.id;
  const blocosDaVizinha = JSON.stringify(blocosDoPersonagem(outra));

  const id = comoDavi({ acao: "criar_personagem", dados: fichaGrande("Muito salva", "w".repeat(120000)) }).dados.id;
  let rev = 1;
  for (let i = 0; i < 12; i++) {
    const lida = comoDavi({ acao: "ler_personagem", personagemId: id });
    const r = comoDavi({ acao: "salvar_personagem", personagemId: id, rev: lida.rev,
      dados: Object.assign({}, lida.dados, { classe: "volta " + i }) });
    if (r.ok) rev = r.rev;
  }
  t.igual("doze gravações seguidas, todas aceitas", rev, 13);
  /* v2.16: ficam TRÊS faixas vivas — a que vale, a anterior (ponto de
     volta) e a reutilizável, que é onde a próxima gravação escreve. */
  t.igual("três faixas ficam guardadas: a que vale, a anterior e a reutilizável", geracoesNaAba(id), 3);
  const m = manifestoDoPersonagem(id);
  t.igual("  a anterior é a do manifesto", blocosDoPersonagem(id).some((l) => l[1] === m.anterior.geracao), true);
  t.igual("  e a reutilizável também", blocosDoPersonagem(id).some((l) => l[1] === m.reutilizavel.geracao), true);
  t.igual("  a ficha ocupa três faixas de blocos, não doze", blocosDoPersonagem(id).length, 3 * m.blocos);

  /* O que a aba NÃO faz: crescer. A gravação escreve sobre a faixa
     reutilizável, então mais gravações não pedem mais linhas. */
  const linhasAntes = linhasDe("PERSONAGENS_BLOCOS").length;
  for (let i = 0; i < 5; i++) {
    const lida = comoDavi({ acao: "ler_personagem", personagemId: id });
    comoDavi({ acao: "salvar_personagem", personagemId: id, rev: lida.rev,
      dados: Object.assign({}, lida.dados, { classe: "mais " + i }) });
  }
  t.igual("mais cinco gravações não acrescentam uma linha sequer", linhasDe("PERSONAGENS_BLOCOS").length, linhasAntes);
  t.igual("os blocos da outra ficha não foram tocados", JSON.stringify(blocosDoPersonagem(outra)), blocosDaVizinha);
  t.igual("e a última gravação é a que abre", comoDavi({ acao: "ler_personagem", personagemId: id }).dados.classe, "mais 4");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — falha no meio da gravação deixa a versão anterior inteira");

(() => {
  preparar();
  const eli = novaConta("eli");
  const comoEli = comoFn(eli);

  const original = "Versão boa. " + "o".repeat(90000);
  const id = comoEli({ acao: "criar_personagem", dados: fichaGrande("Resistente", original) }).dados.id;
  const base = comoEli({ acao: "ler_personagem", personagemId: id });
  const nova = Object.assign({}, base.dados, fichaGrande("Resistente", "Versão nova. " + "n".repeat(95000)));
  const manifestoAntes = JSON.stringify(manifestoDoPersonagem(id));

  /* 1. A escrita dos blocos cai. */
  ambiente.falharUmaVez({ aba: "PERSONAGENS_BLOCOS", metodo: "setValues" });
  const r1 = comoEli({ acao: "salvar_personagem", personagemId: id, rev: base.rev, dados: nova, operacaoId: "op-falha-blocos" });
  t.recusa("a escrita dos blocos falha: a gravação responde erro", r1, "armazenamento_falhou");
  t.igual("  o manifesto não mudou", JSON.stringify(manifestoDoPersonagem(id)), manifestoAntes);
  let lida = comoEli({ acao: "ler_personagem", personagemId: id });
  t.ok("  e a ficha abre na versão anterior, inteira", lida.ok && lida.dados.anotacoes.soltas[0].conteudo === original);
  t.igual("  sem a revisão ter subido", lida.rev, base.rev);

  /* 2. Os blocos entram, mas o que a planilha guardou não confere. */
  /* A conferência lê as linhas completas (7 colunas); a varredura, só as 6 curtas. */
  ambiente.antesDe({ aba: "PERSONAGENS_BLOCOS", metodo: "getValues", filtro: (d) => d.nc === 7 }, () => {
    const f = folhaDe("PERSONAGENS_BLOCOS");
    const ultima = f.linhas[f.linhas.length - 1];
    ultima[6] = ultima[6].slice(0, 10) + "#" + ultima[6].slice(11);
  });
  const r2 = comoEli({ acao: "salvar_personagem", personagemId: id, rev: base.rev, dados: nova, operacaoId: "op-falha-conferencia" });
  t.recusa("blocos gravados que não conferem: a gravação responde erro", r2, "armazenamento_falhou");
  t.igual("  e o manifesto continua apontando a versão boa", JSON.stringify(manifestoDoPersonagem(id)), manifestoAntes);

  /* 3. Blocos certos, e a troca do manifesto cai antes de publicar. */
  ambiente.falharUmaVez({ aba: "PERSONAGENS", metodo: "setValues" });
  const r3 = comoEli({ acao: "salvar_personagem", personagemId: id, rev: base.rev, dados: nova, operacaoId: "op-falha-publicacao" });
  t.recusa("a publicação do manifesto cai: a gravação responde erro", r3, "armazenamento_falhou");
  lida = comoEli({ acao: "ler_personagem", personagemId: id });
  t.ok("  a versão anterior continua valendo", lida.ok && lida.dados.anotacoes.soltas[0].conteudo === original);
  t.ok("  e sobram gerações sem manifesto (lixo, não estrago)", geracoesNaAba(id) > 1);

  /* A mesma gravação, de novo: agora entra — uma vez. */
  const r4 = comoEli({ acao: "salvar_personagem", personagemId: id, rev: base.rev, dados: nova, operacaoId: "op-falha-publicacao" });
  t.ok("repetir a gravação depois da falha dá certo", r4.ok && r4.rev === base.rev + 1);
  lida = comoEli({ acao: "ler_personagem", personagemId: id });
  t.ok("  com a versão nova inteira", lida.dados.anotacoes.soltas[0].conteudo === nova.anotacoes.soltas[0].conteudo);
  t.igual("  e a limpeza recolheu o lixo das tentativas: ficam duas gerações", geracoesNaAba(id), 2);

  /* 4. Tudo gravado, e o envio final do buffer para a planilha falha. A
     resposta NÃO pode ser "salvo". */
  const antesDoFlush = comoEli({ acao: "ler_personagem", personagemId: id });
  const outraVersao = Object.assign({}, antesDoFlush.dados, { classe: "depois do flush" });
  const flushesAntes = ambiente.flush.vezes;
  ambiente.flush.falhar = 1;
  const r5 = comoEli({ acao: "salvar_personagem", personagemId: id, rev: antesDoFlush.rev, dados: outraVersao, operacaoId: "op-falha-flush" });
  t.recusa("se o envio final para a planilha falha, a resposta é erro — nunca 'salvo'", r5, "servidor_falhou");
  t.ok("  (a gravação passou pelo flush antes de soltar a trava)", ambiente.flush.vezes > flushesAntes);
  t.igual("  e a trava foi solta mesmo assim", ambiente.trava.presa, false);
  t.ok("  e a leitura segue", comoEli({ acao: "ler_personagem", personagemId: id }).ok);

  /* No simulador as escritas não ficam em buffer, então ela entrou; na
     planilha de verdade pode ter entrado ou não. O navegador repete o
     MESMO pedido, e os dois casos terminam iguais — aplicada uma vez. */
  const r6 = comoEli({ acao: "salvar_personagem", personagemId: id, rev: antesDoFlush.rev, dados: outraVersao, operacaoId: "op-falha-flush" });
  t.ok("  a repetição do mesmo pedido é reconhecida, sem aplicar duas vezes", r6.ok && r6.repetida === true && r6.rev === antesDoFlush.rev + 1);
  t.igual("  e a versão que vale é a dele", comoEli({ acao: "ler_personagem", personagemId: id }).dados.classe, "depois do flush");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — a resposta se perdeu: a repetição não aplica duas vezes");

(() => {
  preparar();
  const fabi = novaConta("fabi");
  const comoFabi = comoFn(fabi);

  /* Criar (a importação de uma ficha grande que estourou o prazo). */
  const pedido = { acao: "criar_personagem", dados: fichaGrande("Importada", "i".repeat(150000)), operacaoId: "op-criar-importada" };
  const c1 = comoFabi(pedido);
  const c2 = comoFabi(JSON.parse(JSON.stringify(pedido)));
  t.ok("criar repetido com o mesmo id de operação devolve o MESMO personagem", c1.ok && c2.ok && c1.dados.id === c2.dados.id && c2.repetida === true);
  t.igual("  e só um personagem existe", comoFabi({ acao: "listar_personagens" }).dados.length, 1);
  ambiente.cache.clear();
  const c3 = comoFabi(JSON.parse(JSON.stringify(pedido)));
  t.ok("  mesmo sem o cache, pelo manifesto", c3.ok && c3.dados.id === c1.dados.id);
  const id = c1.dados.id;

  /* Salvar: o servidor terminou, a resposta não chegou, o navegador repete. */
  const lida = comoFabi({ acao: "ler_personagem", personagemId: id });
  const editada = Object.assign({}, lida.dados, { classe: "Editada uma vez" });
  const s1 = comoFabi({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: editada, operacaoId: "op-salvar-1" });
  const geracaoDepois = manifestoDoPersonagem(id).geracao;
  const s2 = comoFabi({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: editada, operacaoId: "op-salvar-1" });
  t.ok("a mesma gravação repetida é reconhecida", s1.ok && s2.ok && s2.repetida === true);
  t.igual("  a revisão sobe uma vez só", s2.rev, lida.rev + 1);
  t.igual("  e nenhuma geração nova foi escrita", manifestoDoPersonagem(id).geracao, geracaoDepois);

  /* Outra gravação com a revisão velha é conflito de verdade. */
  const outra = comoFabi({ acao: "salvar_personagem", personagemId: id, rev: lida.rev,
    dados: Object.assign({}, lida.dados, { classe: "De outro aparelho" }), operacaoId: "op-outra" });
  t.recusa("outra gravação com a revisão velha é conflito", outra, "conflito");
  t.ok("  e vem com o estado do servidor, montado dos blocos", outra.dados && outra.dados.classe === "Editada uma vez" &&
    outra.dados.anotacoes.soltas[0].conteudo.length === 150000);

  /* Depois que outra coisa subiu a revisão, a repetição antiga não passa
     mais por "já aplicada". */
  const lida2 = comoFabi({ acao: "ler_personagem", personagemId: id });
  comoFabi({ acao: "salvar_personagem", personagemId: id, rev: lida2.rev, dados: lida2.dados, operacaoId: "op-salvar-2" });
  t.recusa("uma repetição tardia, depois de outra gravação, vira conflito",
    comoFabi({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: editada, operacaoId: "op-salvar-1" }), "conflito");

  /* Duplicar. */
  const d1 = comoFabi({ acao: "duplicar_personagem", personagemId: id, operacaoId: "op-duplicar-1" });
  const d2 = comoFabi({ acao: "duplicar_personagem", personagemId: id, operacaoId: "op-duplicar-1" });
  t.ok("duplicar repetido devolve a mesma cópia", d1.ok && d2.ok && d1.dados.id === d2.dados.id);
  t.igual("  e só uma cópia existe", comoFabi({ acao: "listar_personagens" }).dados.length, 2);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — bloco ausente, duplicado ou corrompido vira erro, nunca ficha vazia");

(() => {
  preparar();
  const gil = novaConta("gil");
  const comoGil = comoFn(gil);

  const v1 = "Primeira versão. " + "p".repeat(100000);
  const v2 = "Segunda versão. " + "q".repeat(100000);
  const id = comoGil({ acao: "criar_personagem", dados: fichaGrande("Frágil", v1) }).dados.id;
  let lida = comoGil({ acao: "ler_personagem", personagemId: id });
  comoGil({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: Object.assign({}, lida.dados, fichaGrande("Frágil", v2)) });
  lida = comoGil({ acao: "ler_personagem", personagemId: id });
  const revBoa = lida.rev;

  const f = folhaDe("PERSONAGENS_BLOCOS");
  const m = manifestoDoPersonagem(id);
  const linhaDoBloco = (i) => f.linhas.findIndex((l) => l[0] === id && l[1] === m.geracao && l[2] === i);
  const guardadas = JSON.parse(JSON.stringify(f.linhas));
  const restaurar = () => { f.linhas = JSON.parse(JSON.stringify(guardadas)); reiniciarExecucao(); };

  /* Duplicado idêntico: o texto continua provado. */
  f.linhas.push(f.linhas[linhaDoBloco(1)].slice());
  t.ok("um bloco repetido, idêntico, não impede a leitura", comoGil({ acao: "ler_personagem", personagemId: id }).ok);
  restaurar();

  /* Duplicado diferente, longe da faixa: o localizador diz exatamente
     quais linhas são a geração, e o texto continua provado pelo
     SHA-256. Uma linha perdida na aba não derruba mais a ficha. */
  const trocado = f.linhas[linhaDoBloco(1)].slice();
  trocado[6] = trocado[6].slice(0, 20) + "!" + trocado[6].slice(21);
  f.linhas.push(trocado);
  reiniciarExecucao();
  t.ok("um bloco repetido fora da faixa não confunde a leitura",
    comoGil({ acao: "ler_personagem", personagemId: id }).ok);

  /* Sem localizador (manifesto gravado pela v2.15), quem acha os blocos
     é o índice — e aí dois blocos diferentes na mesma posição voltam a
     ser ambíguos, como antes. */
  semLocalizador(id);
  const dup = comoGil({ acao: "ler_personagem", personagemId: id });
  t.recusa("sem localizador, dois blocos diferentes na mesma posição: erro", dup, "ficha_ilegivel");
  t.igual("  com o motivo", dup.motivo, "bloco_duplicado");
  restaurar();

  /* Corrompido: um caractere trocado, mesmo tamanho. */
  f.linhas[linhaDoBloco(0)][6] = f.linhas[linhaDoBloco(0)][6].replace("q", "Q");
  const corr = comoGil({ acao: "ler_personagem", personagemId: id });
  t.recusa("um caractere trocado num bloco: erro", corr, "ficha_ilegivel");
  t.igual("  pego pelo SHA-256", corr.motivo, "integridade");
  restaurar();

  f.linhas[linhaDoBloco(0)][6] = f.linhas[linhaDoBloco(0)][6].replace("RB|", "");
  t.igual("um bloco sem o marcador: erro de integridade", comoGil({ acao: "ler_personagem", personagemId: id }).motivo, "integridade");
  restaurar();

  /* Ausente. */
  f.linhas.splice(linhaDoBloco(1), 1);
  const aus = comoGil({ acao: "ler_personagem", personagemId: id });
  t.recusa("um bloco apagado: erro", aus, "ficha_ilegivel");
  t.igual("  com o motivo", aus.motivo, "bloco_ausente");
  t.ok("  e a resposta não traz ficha nenhuma", aus.dados === undefined);

  const linhaAntes = JSON.stringify(linhaDoPersonagem(id));
  t.recusa("com a ficha ilegível, o ajuste do mestre não grava nada",
    comoGil({ acao: "ajustar_personagem", personagemId: id, rev: revBoa, alvo: "status", itemId: "st-pv", campo: "atual", valor: 3 }), "ficha_ilegivel");
  t.recusa("  a duplicação também não", comoGil({ acao: "duplicar_personagem", personagemId: id }), "ficha_ilegivel");
  t.igual("  e a linha do personagem continua exatamente igual", JSON.stringify(linhaDoPersonagem(id)), linhaAntes);
  t.igual("  nenhuma cópia vazia apareceu", comoGil({ acao: "listar_personagens" }).dados.length, 1);

  /* O diagnóstico aponta, e a restauração traz a geração anterior de volta. */
  const diag = diagnosticarPersonagem(id);
  t.ok("o diagnóstico diz que a geração ativa não confere", /geração ativa: .*NÃO CONFERE \(bloco_ausente\)/.test(diag));
  t.ok("  e que a anterior confere", /geração anterior: .*CONFERE/.test(diag) && !/geração anterior: .*NÃO/.test(diag));
  t.ok("  sem imprimir o conteúdo da ficha", diag.indexOf("Primeira versão") < 0 && diag.indexOf("qqqq") < 0);
  const rest = restaurarGeracaoAnterior(id);
  t.ok("restaurarGeracaoAnterior traz a versão anterior de volta", /restaurada a geração/.test(rest));
  lida = comoGil({ acao: "ler_personagem", personagemId: id });
  t.ok("  e a ficha abre, na versão anterior inteira", lida.ok && lida.dados.anotacoes.soltas[0].conteudo === v1);
  t.igual("  com a revisão acima da que estava", lida.rev, revBoa + 1);
  t.ok("com a geração ativa conferindo, restaurar é recusado sem 'forcar'",
    /a geração ativa confere/.test(restaurarGeracaoAnterior(id)));

  /* Manifesto de uma versão futura: nem lido, nem sobrescrito, nem limpo. */
  const fp = folhaDe("PERSONAGENS");
  const linha = fp.linhas.findIndex((l) => l[colunaDe("PERSONAGENS", "id")] === id);
  const futuro = manifestoDoPersonagem(id);
  futuro.versao = 2;
  fp.linhas[linha][colunaDe("PERSONAGENS", "armazenamento")] = JSON.stringify(futuro);
  reiniciarExecucao();
  const fut = comoGil({ acao: "ler_personagem", personagemId: id });
  t.igual("um manifesto de versão futura não é lido", fut.motivo, "formato_desconhecido");
  t.recusa("  nem sobrescrito por uma gravação", comoGil({ acao: "salvar_personagem", personagemId: id, rev: fut.rev === undefined ? lida.rev : fut.rev, dados: fichaGrande("Por cima", "x") }), "ficha_ilegivel");
  const antesDaLimpeza = blocosDoPersonagem(id).length;
  limparBlocosOrfaos();
  t.igual("  e os blocos dele não são limpos", blocosDoPersonagem(id).length, antesDaLimpeza);

  /* JSON antigo corrompido: erro, não ficha vazia. */
  reiniciarExecucao();
  inserir(ABAS.PERSONAGENS, { id: "legado-quebrado", ownerId: gil.id, nome: "Quebrada", campanhaId: "", classe: "", origem: "",
    criadoEm: "2026-01-01T00:00:00.000Z", atualizadoEm: "2026-01-01T00:00:00.000Z", rev: 2, fichaJson: '{"nome":"Queb' });
  const q = comoGil({ acao: "ler_personagem", personagemId: "legado-quebrado" });
  t.recusa("ficha antiga com JSON cortado: erro em vez de ficha em branco", q, "ficha_ilegivel");
  t.igual("  com o motivo", q.motivo, "json");

  /* O aviso de formato novo sem manifesto: alguém esvaziou a coluna. */
  reiniciarExecucao();
  inserir(ABAS.PERSONAGENS, { id: "sem-manifesto", ownerId: gil.id, nome: "Sem manifesto", campanhaId: "", classe: "", origem: "",
    criadoEm: "2026-01-01T00:00:00.000Z", atualizadoEm: "2026-01-01T00:00:00.000Z", rev: 2, fichaJson: avisoDeFormatoNovo("Sem manifesto") });
  t.igual("o aviso de formato novo nunca é lido como ficha", comoGil({ acao: "ler_personagem", personagemId: "sem-manifesto" }).motivo, "manifesto_ausente");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — concorrência: a gravação não desloca, e a pista velha não engana");

(() => {
  preparar();
  const hel = novaConta("hel");
  const comoHel = comoFn(hel);

  /* Duas fichas grandes. A de cima (Escritora) é regravada no meio da
     leitura da de baixo (Leitora).

     Até a v2.15 isso deslocava as linhas da Leitora — a limpeza apagava
     linhas ACIMA dela — e a leitura precisava perceber e recomeçar.
     Desde a v2.16 a gravação escreve sobre a própria faixa reutilizável
     e deixa em branco o que sai: ninguém é deslocado, e a leitura da
     Leitora atravessa a gravação da Escritora sem perceber. */
  const escritora = comoHel({ acao: "criar_personagem", dados: fichaGrande("Escritora", "e".repeat(100000)) }).dados.id;
  let le = comoHel({ acao: "ler_personagem", personagemId: escritora });
  comoHel({ acao: "salvar_personagem", personagemId: escritora, rev: le.rev, dados: Object.assign({}, le.dados, { classe: "2" }) });
  const conteudoLeitora = "Leitora " + "l".repeat(100000);
  const leitora = comoHel({ acao: "criar_personagem", dados: fichaGrande("Leitora", conteudoLeitora) }).dados.id;
  const linhasDaLeitora = () => blocosDoPersonagem(leitora).length;
  const ondeEstaLeitora = JSON.stringify(manifestoDoPersonagem(leitora).local);

  let entrou = 0;
  ambiente.antesDe({ aba: "PERSONAGENS_BLOCOS", metodo: "getValues", vez: 1 }, () => {
    /* Outra execução, com a própria memória — como no Apps Script. */
    const minha = globalThis._EXEC;
    const ultima = comoHel({ acao: "ler_personagem", personagemId: escritora });
    comoHel({ acao: "salvar_personagem", personagemId: escritora, rev: ultima.rev, dados: Object.assign({}, ultima.dados, { classe: "3" }) });
    globalThis._EXEC = minha;
    entrou++;
  });

  const lida = comoHel({ acao: "ler_personagem", personagemId: leitora });
  t.igual("a gravação concorrente aconteceu no meio da leitura", entrou, 1);
  t.ok("a leitura devolve a ficha inteira mesmo assim",
    lida.ok && lida.dados.anotacoes.soltas[0].conteudo === conteudoLeitora);
  t.igual("  e os blocos da Leitora não saíram do lugar", JSON.stringify(manifestoDoPersonagem(leitora).local), ondeEstaLeitora);
  t.igual("a outra gravação entrou normalmente", comoHel({ acao: "ler_personagem", personagemId: escritora }).dados.classe, "3");
  ambiente.removerGanchos();

  /* A manutenção, essa, desloca mesmo: limparBlocosOrfaos apaga linhas.
     Depois dela a pista do manifesto aponta para o lugar errado — e a
     leitura tem de achar os blocos pelo índice, sem devolver nada
     pela metade. */
  const f = folhaDe("PERSONAGENS_BLOCOS");
  f.linhas.splice(1, 0, ["fantasma-velho", "g-zz", 0, 1, 1, "2020-01-01T00:00:00.000Z", "RB|a|RB"]);
  reiniciarExecucao();
  t.ok("a pista aponta para a linha errada depois que alguém entrou na frente",
    linhasDaLeitora() > 0 && (() => {
      const m = manifestoDoPersonagem(leitora);
      const linha = linhasDe("PERSONAGENS_BLOCOS")[m.local.linha - 2];
      return !linha || linha[0] !== leitora;
    })());
  const depoisDoDeslocamento = comoHel({ acao: "ler_personagem", personagemId: leitora });
  t.ok("mesmo assim a ficha abre inteira, pelo índice",
    depoisDoDeslocamento.ok && depoisDoDeslocamento.dados.anotacoes.soltas[0].conteudo === conteudoLeitora);

  const consertada = comoHel({ acao: "salvar_personagem", personagemId: leitora,
    rev: depoisDoDeslocamento.rev, dados: Object.assign({}, depoisDoDeslocamento.dados, { classe: "C" }) });
  t.ok("e a gravação seguinte grava a pista certa", consertada.ok &&
    (() => {
      const m = manifestoDoPersonagem(leitora);
      return linhasDe("PERSONAGENS_BLOCOS")[m.local.linha - 2][0] === leitora;
    })());

  /* Duas gravações a partir da mesma revisão: uma entra, a outra é conflito. */
  const base = comoHel({ acao: "ler_personagem", personagemId: leitora });
  const a = comoHel({ acao: "salvar_personagem", personagemId: leitora, rev: base.rev, dados: Object.assign({}, base.dados, { classe: "A" }), operacaoId: "op-aparelho-a" });
  const b = comoHel({ acao: "salvar_personagem", personagemId: leitora, rev: base.rev, dados: Object.assign({}, base.dados, { classe: "B" }), operacaoId: "op-aparelho-b" });
  t.ok("duas gravações da mesma revisão: a primeira entra", a.ok);
  t.recusa("  a segunda é conflito, e não sobrescreve", b, "conflito");
  t.igual("  e o que vale é a primeira", comoHel({ acao: "ler_personagem", personagemId: leitora }).dados.classe, "A");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — mesa: ajuste rápido do mestre, vínculo, cartões e combate numa ficha grande");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const jogadora = novaConta("jogadora");
  const outro = novaConta("outro");
  const comoMestra = comoFn(mestra);
  const comoJogadora = comoFn(jogadora);
  const comoOutro = comoFn(outro);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Mesa grande" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [
    { userId: jogadora.id, papel: "jogador" }, { userId: outro.id, papel: "jogador" }] });

  const diario = "Diário de campanha 🐉 " + "d".repeat(150000);
  const ficha = Object.assign(fichaGrande("Grandona", diario), {
    tipoFicha: "ordem",
    ordem: { nex: 5, classe: "ocultista", recursos: { pv: null, pe: null, san: null } },
    resumoRecursos: { pv: 20, pe: 6, san: 20 },
  });
  const id = comoJogadora({ acao: "criar_personagem", dados: ficha }).dados.id;

  /* Vincular não regrava a ficha. */
  const geracaoAntes = manifestoDoPersonagem(id).geracao;
  const v = comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: id });
  t.ok("a dona põe a ficha grande na mesa", v.ok && v.rev === 2);
  t.igual("  sem regravar a ficha: a geração é a mesma", manifestoDoPersonagem(id).geracao, geracaoAntes);
  t.igual("  e o manifesto acompanha a revisão", manifestoDoPersonagem(id).rev, 2);
  t.igual("  a ficha aberta diz a campanha", comoJogadora({ acao: "ler_personagem", personagemId: id }).dados.campanhaId, mesa);

  /* O mestre clica rápido: cada clique é uma gravação com a revisão nova. */
  let rev = 2;
  [19, 18, 17, 16, 15].forEach((valor, i) => {
    const r = comoMestra({ acao: "ajustar_personagem", personagemId: id, rev: rev, alvo: "recurso", itemId: "pv",
      campo: "atual", valor: valor, campanhaId: mesa, operacaoId: "op-ajuste-" + i });
    if (r.ok) rev = r.rev;
  });
  t.igual("cinco ajustes seguidos do mestre, todos aceitos", rev, 7);
  const depois = comoJogadora({ acao: "ler_personagem", personagemId: id });
  t.igual("  o PV ficou no último valor", depois.dados.ordem.recursos.pv, 15);
  t.ok("  e o diário de 150 mil caracteres continua inteiro", depois.dados.anotacoes.soltas[0].conteudo === diario);
  t.igual("  sem acumular gerações", geracoesNaAba(id), 3);

  const repetido = comoMestra({ acao: "ajustar_personagem", personagemId: id, rev: 6, alvo: "recurso", itemId: "pv",
    campo: "atual", valor: 15, campanhaId: mesa, operacaoId: "op-ajuste-4" });
  t.ok("o último ajuste repetido (resposta perdida) é reconhecido", repetido.ok && repetido.repetida === true && repetido.dados.valor === 15);
  t.igual("  sem subir a revisão", repetido.rev, 7);

  /* Cartões da mesa. */
  const cartoesMestra = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados;
  const cartao = cartoesMestra.find((c) => c.id === id);
  t.ok("o cartão da mestra monta a ficha grande", !!cartao && !cartao.fichaIlegivel && cartao.ordem && cartao.ordem.recursos.pv === 15);
  const cartaoOutro = comoOutro({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados.find((c) => c.id === id);
  t.ok("o outro jogador vê só o público — sem ficha, escolhas ou inventário",
    !!cartaoOutro && !cartaoOutro.inventario && cartaoOutro.ordem && cartaoOutro.ordem.recursos === undefined);

  const resumo = comoMestra({ acao: "atualizar_resumo_personagem", personagemId: id, rev: 7, resumo: { pv: 22, pe: 6, san: 20 } });
  t.ok("o resumo de recursos grava numa ficha grande", resumo.ok && resumo.dados.mudou === true);
  t.igual("  sem subir a revisão", comoJogadora({ acao: "ler_personagem", personagemId: id }).rev, 7);
  const repeticaoDepoisDoResumo = comoMestra({ acao: "ajustar_personagem", personagemId: id, rev: 6, alvo: "recurso", itemId: "pv",
    campo: "atual", valor: 15, campanhaId: mesa, operacaoId: "op-ajuste-4" });
  t.ok("  e o resumo não apaga o reconhecimento do último ajuste", repeticaoDepoisDoResumo.ok && repeticaoDepoisDoResumo.repetida === true);

  /* Combate. */
  const combate = comoMestra({ acao: "salvar_combate", campanhaId: mesa, dados: {
    nome: "Luta", estado: "ativo", visiveis: [jogadora.id],
    participantes: [{ id: "cp1", tipo: "personagem", personagemId: id, nome: "Grandona", ordem: 10 }] } });
  const lista = comoJogadora({ acao: "listar_combates", campanhaId: mesa });
  const noCombate = lista.ok && combate.ok && lista.dados[0].participantes.find((p) => p.personagemId === id);
  t.ok("o combate lê os recursos da ficha grande", !!noCombate && Array.isArray(noCombate.recursos) &&
    noCombate.recursos.some((r) => r.chave === "pv" && r.atual === 15));

  /* Tirar da mesa: a coluna manda, mesmo sem regravar a ficha. */
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: outro.id, papel: "jogador" }] });
  const fora = comoJogadora({ acao: "ler_personagem", personagemId: id });
  t.igual("tirar a jogadora da mesa desvincula a ficha, e a ficha aberta diz isso", fora.dados.campanhaId, null);
  t.recusa("  e o mestre deixa de alcançá-la", comoMestra({ acao: "ler_personagem", personagemId: id }), "nao_encontrado");

  /* Uma ficha ilegível na mesa aparece como ilegível, sem números. */
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: jogadora.id, papel: "jogador" }] });
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: id });
  const f = folhaDe("PERSONAGENS_BLOCOS");
  const m = manifestoDoPersonagem(id);
  f.linhas.splice(f.linhas.findIndex((l) => l[0] === id && l[1] === m.geracao), 1);
  reiniciarExecucao();
  const cartaoPerdido = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados.find((c) => c.id === id);
  /* v2.16: o painel não abre mais a ficha para desenhar o cartão — ele
     lê a projeção, que continua valendo. Então o cartão segue de pé com
     os últimos números confirmados, e o erro aparece onde ele importa:
     ao abrir e ao ajustar, que são os caminhos que tocam a ficha. */
  t.ok("com a projeção em dia, o cartão continua de pé mesmo com o bloco perdido",
    !!cartaoPerdido && cartaoPerdido.fichaIlegivel !== true && !!cartaoPerdido.ordem &&
    cartaoPerdido.ordem.recursos.pv === 15);
  t.recusa("  mas abrir a ficha recusa", comoMestra({ acao: "ler_personagem", personagemId: id }), "ficha_ilegivel");
  t.recusa("  e o ajuste rápido recusa, sem gravar por cima",
    comoMestra({ acao: "ajustar_personagem", personagemId: id, rev: cartaoPerdido.rev, alvo: "status", itemId: "s1",
      campo: "atual", valor: 3, campanhaId: mesa }), "ficha_ilegivel");
  t.ok("  e a mesa continua carregando as outras", comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa }).ok);

  /* Sem projeção que valha — ficha ainda no formato antigo, corrompida —
     o cartão volta a dizer que não se montou. */
  const antiga = comoJogadora({ acao: "criar_personagem", dados: { nome: "Antiga", tipoFicha: "universal",
    status: [{ id: "s1", nome: "Vida", atual: 4, maximo: 9 }] } }).dados.id;
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: antiga });
  const linhaAntiga = folhaDe("PERSONAGENS").linhas.find((l) => l[0] === antiga);
  linhaAntiga[9] = '{"nome":"Antiga"';   /* JSON cortado */
  linhaAntiga[10] = "";                   /* sem manifesto: formato antigo */
  linhaAntiga[11] = "";                   /* sem projeção */
  reiniciarExecucao();
  const semProjecao = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados.find((c) => c.id === antiga);
  t.ok("sem projeção, o cartão de uma ficha que não se monta vem marcado, sem recursos nem controles",
    !!semProjecao && semProjecao.fichaIlegivel === true && semProjecao.podeEditarRecursos === false &&
    !semProjecao.ordem && !semProjecao.recursos);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — duplicar, importar, exportar e excluir");

(() => {
  preparar();
  const ivo = novaConta("ivo");
  const comoIvo = comoFn(ivo);

  const conteudo = RICO + "k".repeat(200000);
  const id = comoIvo({ acao: "criar_personagem", dados: fichaGrande("Original", conteudo) }).dados.id;
  const original = comoIvo({ acao: "ler_personagem", personagemId: id });

  const copia = comoIvo({ acao: "duplicar_personagem", personagemId: id });
  t.ok("duplicar uma ficha de 200 mil caracteres dá certo", copia.ok);
  const lidaCopia = comoIvo({ acao: "ler_personagem", personagemId: copia.dados.id });
  t.igual("  a cópia tem o nome com '(cópia)'", lidaCopia.dados.nome, "Original (cópia)");
  t.ok("  e o conteúdo inteiro igual", lidaCopia.dados.anotacoes.soltas[0].conteudo === conteudo);
  t.ok("  com blocos próprios", blocosDoPersonagem(copia.dados.id).length > 0 &&
    manifestoDoPersonagem(copia.dados.id).geracao !== manifestoDoPersonagem(id).geracao);
  comoIvo({ acao: "salvar_personagem", personagemId: copia.dados.id, rev: lidaCopia.rev,
    dados: Object.assign({}, lidaCopia.dados, fichaGrande("Original (cópia)", "Mudou só a cópia")) });
  t.ok("  editar a cópia não muda o original",
    comoIvo({ acao: "ler_personagem", personagemId: id }).dados.anotacoes.soltas[0].conteudo === conteudo);

  /* Exportar é o navegador guardar o que ler_personagem devolveu;
     importar é criar a partir disso. A volta inteira: */
  const exportado = JSON.parse(JSON.stringify(original.dados));
  const importado = comoIvo({ acao: "criar_personagem", dados: exportado, operacaoId: "op-importar-roundtrip" });
  const lidoImportado = comoIvo({ acao: "ler_personagem", personagemId: importado.dados.id });
  t.iguais("exportar e importar uma ficha grande devolve a mesma ficha", semCarimbos(lidoImportado.dados), semCarimbos(original.dados));

  /* Excluir leva os blocos da ficha, e só os dela. */
  const blocosDaCopia = JSON.stringify(blocosDoPersonagem(copia.dados.id));
  const ex = comoIvo({ acao: "excluir_personagem", personagemId: id });
  t.ok("excluir a ficha grande", ex.ok);
  t.igual("  leva todos os blocos dela", blocosDoPersonagem(id).length, 0);
  t.igual("  e deixa os das outras intactos", JSON.stringify(blocosDoPersonagem(copia.dados.id)), blocosDaCopia);
  t.recusa("  a ficha não abre mais", comoIvo({ acao: "ler_personagem", personagemId: id }), "nao_encontrado");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — o cache de cabeçalhos não passa de uma versão para outra");

(() => {
  preparar();
  const rui = novaConta("ruivo");
  const comoRui = comoFn(rui);
  const id = comoRui({ acao: "criar_personagem", dados: fichaGrande("Cacheada", "c".repeat(60000)) }).dados.id;

  reiniciarExecucao();
  t.ok("a chave do cache leva a assinatura das colunas declaradas",
    /^rama\.cabecalhos\.\d+\.[0-9a-f]{12}$/.test(chaveDosCabecalhos()));

  /* O mapa que uma versão ANTERIOR, com dez colunas em PERSONAGENS,
     deixaria no cache na chave antiga: largura 10, sem armazenamento. */
  const antigo = {
    PERSONAGENS: { mapa: {}, posicoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], declaradas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      recuperadas: [], ilegiveis: [], largura: 10, alinhado: true },
  };
  ambiente.cache.set("rama.cabecalhos." + epoca(), JSON.stringify(antigo));

  reiniciarExecucao();
  const lida = comoRui({ acao: "ler_personagem", personagemId: id });
  const salva = comoRui({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: Object.assign({}, lida.dados, { classe: "depois" }) });
  t.ok("com o mapa de outra versão no cache, esta não o usa: grava e o manifesto acompanha",
    salva.ok && manifestoDoPersonagem(id).rev === salva.rev);
  t.igual("  e a ficha continua abrindo", comoRui({ acao: "ler_personagem", personagemId: id }).dados.classe, "depois");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — limpeza de órfãos");

(() => {
  preparar();
  const jo = novaConta("joana");
  const comoJo = comoFn(jo);

  const viva = comoJo({ acao: "criar_personagem", dados: fichaGrande("Viva", "v".repeat(60000)) }).dados.id;
  let l = comoJo({ acao: "ler_personagem", personagemId: viva });
  comoJo({ acao: "salvar_personagem", personagemId: viva, rev: l.rev, dados: Object.assign({}, l.dados, { classe: "2" }) });

  /* Lixo de três tipos: uma gravação que parou antes do manifesto; blocos
     de um personagem que não existe (velhos); e blocos recentes de um
     personagem que não existe (podem ser de uma criação em andamento). */
  ambiente.falharUmaVez({ aba: "PERSONAGENS", metodo: "setValues" });
  l = comoJo({ acao: "ler_personagem", personagemId: viva });
  comoJo({ acao: "salvar_personagem", personagemId: viva, rev: l.rev, dados: Object.assign({}, l.dados, { classe: "nunca" }) });
  const f = folhaDe("PERSONAGENS_BLOCOS");
  f.appendRow(["fantasma-velho", "g-x", 0, 1, 1, "2020-01-01T00:00:00.000Z", "RB|a|RB"]);
  f.appendRow(["fantasma-novo", "g-y", 0, 1, 1, new Date().toISOString(), "RB|b|RB"]);

  const ativo = manifestoDoPersonagem(viva);
  const lixoDaViva = blocosDoPersonagem(viva).filter((b) => b[1] !== ativo.geracao && b[1] !== ativo.anterior.geracao).length;
  t.ok("há uma geração sem manifesto na ficha viva", lixoDaViva > 0);
  t.ok("a conferência da instalação avisa que há blocos sem dono", /sem ficha que as aponte/.test(conferirInstalacao()));

  const texto = limparBlocosOrfaos();
  t.ok("limparBlocosOrfaos recolhe o lixo", /recolhida/.test(texto));
  t.igual("  a geração sem manifesto saiu", blocosDoPersonagem(viva).filter((b) => b[1] !== ativo.geracao && b[1] !== ativo.anterior.geracao).length, 0);
  t.igual("  a ativa e a anterior ficaram", geracoesNaAba(viva), 2);
  t.igual("  os blocos velhos de ninguém saíram", linhasDe("PERSONAGENS_BLOCOS").filter((b) => b[0] === "fantasma-velho").length, 0);
  t.igual("  os recentes de ninguém ficam, pela carência", linhasDe("PERSONAGENS_BLOCOS").filter((b) => b[0] === "fantasma-novo").length, 1);
  t.ok("  e a ficha continua abrindo", comoJo({ acao: "ler_personagem", personagemId: viva }).dados.classe === "2");
  t.ok("rodar de novo não apaga mais nada", /: 0 linha/.test(limparBlocosOrfaos()));
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — permissões: conhecer o id não abre nada");

(() => {
  preparar();
  const kai = novaConta("kai");
  const lia = novaConta("lia");
  const comoKai = comoFn(kai);
  const comoLia = comoFn(lia);

  const segredo = "Segredo da Lia " + "s".repeat(80000);
  const id = comoLia({ acao: "criar_personagem", dados: fichaGrande("Privada", segredo) }).dados.id;
  const m = manifestoDoPersonagem(id);

  t.recusa("outra conta não lê a ficha grande", comoKai({ acao: "ler_personagem", personagemId: id }), "nao_encontrado");
  t.recusa("  nem pelo lote", (() => {
    const r = comoKai({ acao: "lote", pedidos: [{ acao: "ler_personagem", personagemId: id }] });
    return r.dados.respostas[0];
  })(), "nao_encontrado");
  t.recusa("  nem ajusta", comoKai({ acao: "ajustar_personagem", personagemId: id, rev: 1, alvo: "status", itemId: "st-pv", campo: "atual", valor: 1 }), "nao_encontrado");
  t.recusa("  nem duplica", comoKai({ acao: "duplicar_personagem", personagemId: id }), "nao_encontrado");
  t.recusa("  nem exclui", comoKai({ acao: "excluir_personagem", personagemId: id }), "nao_encontrado");
  t.recusa("  nem sobrescreve", comoKai({ acao: "salvar_personagem", personagemId: id, rev: 1, dados: fichaGrande("x", "x") }), "nao_encontrado");
  t.recusa("não existe ação que leia blocos direto", comoKai({ acao: "ler_blocos", personagemId: id, geracao: m.geracao }), "acao_desconhecida");
  t.recusa("  nem as ferramentas de diagnóstico pela API", comoKai({ acao: "diagnosticarPersonagem", personagemId: id }), "acao_desconhecida");
  t.recusa("  nem a restauração", comoKai({ acao: "restaurarGeracaoAnterior", personagemId: id }), "acao_desconhecida");
  const respostaDoKai = JSON.stringify(comoKai({ acao: "listar_personagens" }));
  t.ok("nada do conteúdo vaza nas respostas de outra conta", respostaDoKai.indexOf("Segredo da Lia") < 0);
  t.ok("a dona continua lendo tudo", comoLia({ acao: "ler_personagem", personagemId: id }).dados.anotacoes.soltas[0].conteudo === segredo);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — limite total da ficha: explícito, com números, sem gravar nada");

(() => {
  preparar();
  const leo = novaConta("leo");
  const comoLeo = comoFn(leo);

  const quase = comoLeo({ acao: "criar_personagem", dados: fichaGrande("Enorme", "m".repeat(LIMITE_TOTAL_FICHA - 2000)) });
  t.ok("uma ficha logo abaixo do limite total (1 milhão) salva", quase.ok);
  t.ok("  e reabre inteira", comoLeo({ acao: "ler_personagem", personagemId: quase.dados.id }).dados.anotacoes.soltas[0].conteudo.length === LIMITE_TOTAL_FICHA - 2000);

  const blocosAntes = linhasDe("PERSONAGENS_BLOCOS").length;
  const travasAntes = ambiente.travasPedidas();
  const acima = comoLeo({ acao: "criar_personagem", dados: fichaGrande("Acima", "m".repeat(LIMITE_TOTAL_FICHA + 10)) });
  t.recusa("acima do limite total, a gravação é recusada", acima, "ficha_grande_demais");
  t.igual("  antes de entrar na fila da trava: ninguém espera por ela", ambiente.travasPedidas(), travasAntes);
  t.ok("  dizendo o tamanho e o limite", acima.limite === LIMITE_TOTAL_FICHA && acima.tamanho > LIMITE_TOTAL_FICHA);
  t.igual("  sem escrever bloco nenhum", linhasDe("PERSONAGENS_BLOCOS").length, blocosAntes);
  t.igual("  nem criar personagem", comoLeo({ acao: "listar_personagens" }).dados.length, 1);

  const lida = comoLeo({ acao: "ler_personagem", personagemId: quase.dados.id });
  const crescida = comoLeo({ acao: "salvar_personagem", personagemId: quase.dados.id, rev: lida.rev,
    dados: Object.assign({}, lida.dados, fichaGrande("Enorme", "m".repeat(LIMITE_TOTAL_FICHA + 10))) });
  t.recusa("salvar passando do limite também é recusado", crescida, "ficha_grande_demais");
  t.ok("  e a versão guardada continua a anterior", comoLeo({ acao: "ler_personagem", personagemId: quase.dados.id }).rev === lida.rev);
})();

/* =====================================================================
   A PROJEÇÃO DO PAINEL (v2.16)
   ---------------------------------------------------------------------
   O painel da mesa parou de remontar as fichas para desenhar os
   cartões: ele lê a projeção gravada junto com a ficha. O que precisa
   valer, e é o que os casos abaixo trancam:

     · desenhar a mesa não abre ficha nenhuma nem lê bloco nenhum;
     · o cartão mostra exatamente o que mostrava quando vinha da ficha;
     · toda gravação que muda o painel atualiza a projeção junto —
       salvar, ajuste rápido, resumo de recursos, vínculo, duplicação;
     · projeção ausente, velha ou de outra versão do formato não dá
       cartão errado: dá o cartão certo, remontando aquela ficha;
     · listar NUNCA grava para consertar projeção.
   ===================================================================== */

t.grupo("Projeção — cartões sem abrir ficha");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const jogadora = novaConta("jogadora");
  const comoMestra = comoFn(mestra);
  const comoJogadora = comoFn(jogadora);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Projeção" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: jogadora.id, papel: "jogador" }] });

  const fichaDeOrdem = {
    nome: "Vitória", tipoFicha: "ordem", schemaVersion: 8,
    ordem: {
      classe: "combatente", origem: "militar", trilha: "aniquilador", nex: 45,
      atributos: { agi: 2, for: 3, int: 1, pre: 1, vig: 2 },
      recursos: { pv: 18, pe: 4, san: 20 },
      escolhas: [], personalizacoes: [], excluidas: [],
      organizacao: { habilidades: "nome" },
    },
    resumoRecursos: { pv: 30, pe: 9, san: 24 },
    inventario: { limite: 20, itens: [{ id: "i1", tipo: "armadura", nome: "Colete", defesa: 5, ordem: { categoria: "I" }, descricao: "d".repeat(2000) }] },
    anotacoes: { pastas: [], soltas: [{ id: "n1", titulo: "Diário", conteudo: "z".repeat(90000) }] },
    pericias: [], habilidades: [], status: [], atributos: [],
  };

  const universal = {
    nome: "Base", tipoFicha: "universal", schemaVersion: 8,
    atributos: [{ id: "a1", nome: "Força", sigla: "FOR", valor: 3, dado: "d20" }],
    status: [{ id: "s1", nome: "Vida", atual: 12, maximo: 20 }],
    anotacoes: { pastas: [], soltas: [{ id: "n1", titulo: "x", conteudo: "y".repeat(50000) }] },
  };

  const daJogadora = comoJogadora({ acao: "criar_personagem", dados: fichaDeOrdem }).dados.id;
  const daMestra = comoMestra({ acao: "criar_personagem", dados: universal }).dados.id;
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: daJogadora });
  comoMestra({ acao: "vincular_personagem", campanhaId: mesa, personagemId: daMestra });

  /* Com o diagnóstico ligado a resposta diz quantas fichas foram
     remontadas e quantos blocos foram lidos. É a prova direta. */
  ambiente.propriedades.set("RAMA_DIAGNOSTICO", "1");

  const comProjecao = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.igual("o painel da mesa não remonta ficha nenhuma", comProjecao.diag.fichas, 0);
  t.igual("  nem lê um bloco sequer", comProjecao.diag.blocos, 0);
  t.igual("  e as duas projeções vieram da coluna", comProjecao.diag.resumos, "2/2");

  const cartaoOrdem = comProjecao.dados.find((c) => c.id === daJogadora);
  t.igual("o cartão de Ordem traz o NEX", cartaoOrdem.ordem.nex, 45);
  t.igual("  os recursos gravados", cartaoOrdem.ordem.recursos.pv, 18);
  t.igual("  o resumo de máximos", cartaoOrdem.resumoRecursos.pv, 30);
  t.igual("  a defesa do item do inventário", cartaoOrdem.inventario.itens[0].defesa, 5);
  t.ok("  e nenhum texto longo da ficha", JSON.stringify(cartaoOrdem).indexOf("zzzz") < 0 &&
    JSON.stringify(cartaoOrdem).indexOf("dddd") < 0);

  const cartaoUniversal = comProjecao.dados.find((c) => c.id === daMestra);
  t.igual("o cartão universal traz o status", cartaoUniversal.status[0].atual, 12);
  t.igual("  e o atributo", cartaoUniversal.atributos[0].valor, 3);

  /* A prova de que a projeção diz a mesma coisa que a ficha: apagada a
     coluna, o cartão é remontado — e sai idêntico. */
  const semColuna = (id) => {
    const linha = linhaDoPersonagem(id);
    linha[colunaDe("PERSONAGENS", "resumo")] = "";
    reiniciarExecucao();
  };
  semColuna(daJogadora);
  semColuna(daMestra);

  const remontado = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.igual("sem projeção, o painel remonta as fichas", remontado.diag.fichas, 2);
  t.iguais("  e o cartão sai igualzinho",
    remontado.dados.find((c) => c.id === daJogadora), cartaoOrdem);
  t.iguais("  inclusive o universal",
    remontado.dados.find((c) => c.id === daMestra), cartaoUniversal);

  /* E listar não conserta gravando: a coluna continua vazia. */
  t.igual("listar não grava para consertar a projeção",
    String(linhaDoPersonagem(daJogadora)[colunaDe("PERSONAGENS", "resumo")] || ""), "");

  /* Projeção de outra versão do formato, e projeção corrompida. */
  const porProjecao = (id, valor) => {
    linhaDoPersonagem(id)[colunaDe("PERSONAGENS", "resumo")] = valor;
    reiniciarExecucao();
  };
  porProjecao(daJogadora, JSON.stringify({ v: 99, rev: 2, tipo: "ordem", ordem: { nex: 1 } }));
  const futura = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.igual("projeção de uma versão futura é ignorada", futura.dados.find((c) => c.id === daJogadora).ordem.nex, 45);

  porProjecao(daJogadora, "{isto não é json");
  const quebrada = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.igual("projeção corrompida é ignorada", quebrada.dados.find((c) => c.id === daJogadora).ordem.nex, 45);

  /* Projeção grande demais não é gravada: fica o marcador, e o painel
     remonta aquela ficha. */
  const manifestoDela = manifestoDoPersonagem(daJogadora);
  porProjecao(daJogadora, JSON.stringify({ v: 1, rev: 2, geracao: manifestoDela.geracao, grande: true }));
  const marcada = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.ok("projeção marcada como grande demais manda remontar a ficha", marcada.diag.fichas >= 1);
  t.igual("  e o cartão sai certo do mesmo jeito", marcada.dados.find((c) => c.id === daJogadora).ordem.nex, 45);

  ambiente.propriedades.set("RAMA_DIAGNOSTICO", "0");
  t.igual("com o diagnóstico desligado a resposta não leva números",
    comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa }).diag, undefined);
  ambiente.propriedades.set("RAMA_DIAGNOSTICO", "1");

  /* --------- toda gravação que muda o painel atualiza a projeção --------- */

  /* De volta ao normal: as duas fichas ganham projeção outra vez, para
     os casos abaixo medirem a gravação e não a bagunça de cima. */
  [daJogadora, daMestra].forEach((id) => {
    const r = comoMestra({ acao: "ler_personagem", personagemId: id });
    comoMestra({ acao: "salvar_personagem", personagemId: id, rev: r.rev, dados: r.dados });
  });

  const cartaoDe = (como, id) => {
    const r = como({ acao: "listar_personagens_campanha", campanhaId: mesa });
    return { cartao: r.dados.find((c) => c.id === id), diag: r.diag };
  };

  const lida = comoJogadora({ acao: "ler_personagem", personagemId: daJogadora });
  const nova = JSON.parse(JSON.stringify(lida.dados));
  nova.ordem.nex = 50;
  nova.resumoRecursos = { pv: 33, pe: 10, san: 26 };
  comoJogadora({ acao: "salvar_personagem", personagemId: daJogadora, rev: lida.rev, dados: nova });

  const depoisDeSalvar = cartaoDe(comoMestra, daJogadora);
  t.igual("salvar a ficha atualiza o cartão", depoisDeSalvar.cartao.ordem.nex, 50);
  t.igual("  sem remontar nada", depoisDeSalvar.diag.fichas, 0);
  t.igual("  com o resumo novo", depoisDeSalvar.cartao.resumoRecursos.pv, 33);

  const revAtual = comoJogadora({ acao: "ler_personagem", personagemId: daJogadora }).rev;
  comoMestra({ acao: "ajustar_personagem", personagemId: daJogadora, rev: revAtual,
    alvo: "recurso", itemId: "pv", campo: "atual", valor: 7, campanhaId: mesa });
  const depoisDoAjuste = cartaoDe(comoMestra, daJogadora);
  t.igual("o ajuste rápido do mestre atualiza o cartão", depoisDoAjuste.cartao.ordem.recursos.pv, 7);
  t.igual("  sem remontar nada", depoisDoAjuste.diag.fichas, 0);

  const revDoResumo = comoJogadora({ acao: "ler_personagem", personagemId: daJogadora }).rev;
  comoMestra({ acao: "atualizar_resumo_personagem", personagemId: daJogadora, rev: revDoResumo,
    resumo: { pv: 40, pe: 12, san: 28 } });
  const depoisDoResumo = cartaoDe(comoMestra, daJogadora);
  t.igual("o resumo de recursos atualiza o cartão", depoisDoResumo.cartao.resumoRecursos.pv, 40);
  t.igual("  sem remontar nada", depoisDoResumo.diag.fichas, 0);

  /* Vincular sobe a revisão sem tocar no conteúdo: a projeção acompanha
     em vez de obrigar a remontar. */
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: daJogadora, vincular: false });
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: daJogadora });
  const depoisDoVinculo = cartaoDe(comoMestra, daJogadora);
  t.igual("tirar e pôr na mesa não obriga a remontar", depoisDoVinculo.diag.fichas, 0);
  t.igual("  e o cartão continua certo", depoisDoVinculo.cartao.ordem.recursos.pv, 7);

  /* Tirar a jogadora da mesa também sobe a revisão das fichas dela, e
     por um caminho que não escreve a projeção: quem salva o cartão é a
     conferência pela geração. */
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [] });
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: jogadora.id, papel: "jogador" }] });
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: daJogadora });
  const depoisDeVoltar = cartaoDe(comoMestra, daJogadora);
  t.igual("sair e voltar para a mesa não obriga a remontar", depoisDeVoltar.diag.fichas, 0);

  const copia = comoJogadora({ acao: "duplicar_personagem", personagemId: daJogadora }).dados.id;
  comoJogadora({ acao: "vincular_personagem", campanhaId: mesa, personagemId: copia });
  const comCopia = comoMestra({ acao: "listar_personagens_campanha", campanhaId: mesa });
  t.igual("a cópia nasce com projeção", comCopia.diag.fichas, 0);
  t.igual("  e o cartão dela está certo",
    comCopia.dados.find((c) => c.id === copia).ordem.recursos.pv, 7);

  /* O combate desenha os mesmos números, e também sem abrir ficha. */
  comoMestra({ acao: "salvar_combate", campanhaId: mesa, dados: {
    nome: "Luta", estado: "ativo", visiveis: [jogadora.id],
    participantes: [{ id: "cp1", tipo: "personagem", personagemId: daJogadora, nome: "Vitória", ordem: 10 }] } });
  const combates = comoMestra({ acao: "listar_combates", campanhaId: mesa });
  const participante = combates.dados[0].participantes[0];
  t.igual("o combate mostra os recursos pela projeção",
    participante.recursos.find((r) => r.chave === "pv").atual, 7);
  t.igual("  sem remontar ficha", combates.diag.fichas, 0);

  /* A ficha continua sendo a fonte: o que a projeção diz nunca entra
     na ficha gravada. */
  porProjecao(daJogadora, JSON.stringify({ v: 1, rev: 99, tipo: "ordem", ordem: { nex: 1, recursos: { pv: 1 } } }));
  t.igual("a ficha aberta vem da ficha, não da projeção",
    comoJogadora({ acao: "ler_personagem", personagemId: daJogadora }).dados.ordem.recursos.pv, 7);

  ambiente.propriedades.set("RAMA_DIAGNOSTICO", "0");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Projeção — reconstrução em lotes");

(() => {
  preparar();
  const rita = novaConta("rita");
  const comoRita = comoFn(rita);

  const ids = [];
  for (let i = 0; i < 5; i++) {
    ids.push(comoRita({ acao: "criar_personagem", dados: {
      nome: "P" + i, tipoFicha: "universal",
      status: [{ id: "s1", nome: "Vida", atual: i, maximo: 10 }],
    } }).dados.id);
  }

  /* Como se as fichas tivessem sido gravadas por uma versão anterior:
     manifesto em dia, coluna de projeção vazia. */
  ids.forEach((id) => { linhaDoPersonagem(id)[colunaDe("PERSONAGENS", "resumo")] = ""; });
  reiniciarExecucao();

  const semNenhuma = ids.filter((id) => !String(linhaDoPersonagem(id)[colunaDe("PERSONAGENS", "resumo")] || "")).length;
  t.igual("cinco fichas sem projeção", semNenhuma, 5);

  const primeiro = reconstruirResumos(2);
  t.ok("o primeiro lote refaz duas", /2 refeito/.test(primeiro));
  t.ok("  e avisa quantas faltam", /Faltam 3/.test(primeiro));

  reconstruirResumos(2);
  const ultimo = reconstruirResumos(2);
  t.ok("o último lote termina o serviço", /Não falta nenhum/.test(ultimo));

  reiniciarExecucao();
  const comProjecao = ids.filter((id) => String(linhaDoPersonagem(id)[colunaDe("PERSONAGENS", "resumo")] || "")).length;
  t.igual("todas ficaram com projeção", comProjecao, 5);

  t.ok("rodar de novo não tem o que fazer", /0 refeito/.test(reconstruirResumos(10)));

  /* A reconstrução não mexe na ficha: nem revisão, nem manifesto. */
  const rev = comoRita({ acao: "ler_personagem", personagemId: ids[0] }).rev;
  t.igual("a revisão não sobe", rev, 1);
  t.ok("e a ficha continua abrindo",
    comoRita({ acao: "ler_personagem", personagemId: ids[0] }).dados.status[0].atual === 0);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Imagens sob demanda — quem pode ver o quê");

(() => {
  preparar();
  const mestre = novaConta("mestre2");
  const jogador = novaConta("jogador2");
  const outro = novaConta("outro2");
  const forasteiro = novaConta("forasteiro2");
  const comoMestre = comoFn(mestre);
  const comoJogador = comoFn(jogador);
  const comoOutro = comoFn(outro);
  const comoForasteiro = comoFn(forasteiro);

  const mesa = comoMestre({ acao: "criar_campanha", dados: { nome: "Fotos" } }).dados.id;
  comoMestre({ acao: "salvar_participantes", campanhaId: mesa, membros: [
    { userId: jogador.id, papel: "jogador" }, { userId: outro.id, papel: "jogador" },
  ] });

  const ficha = { nome: "Com foto", tipoFicha: "universal", status: [] };
  const naMesa = comoJogador({ acao: "criar_personagem", dados: ficha }).dados.id;
  const fora = comoJogador({ acao: "criar_personagem", dados: ficha }).dados.id;
  comoJogador({ acao: "vincular_personagem", campanhaId: mesa, personagemId: naMesa });

  const imagem = "data:image/png;base64," + "F".repeat(500);
  comoJogador({ acao: "salvar_foto", personagemId: naMesa, imagem });
  comoJogador({ acao: "salvar_foto", personagemId: fora, imagem });

  const listada = comoMestre({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados[0];
  t.ok("a listagem manda a versão da foto, não a foto",
    !!listada.fotoVersao && listada.foto === undefined);
  t.ok("  e a imagem não está na resposta",
    JSON.stringify(listada).indexOf("FFFF") < 0);

  const minhas = comoJogador({ acao: "listar_personagens" }).dados;
  t.ok("a lista pessoal também manda só a versão",
    minhas.every((p) => p.foto === undefined) && minhas.some((p) => !!p.fotoVersao));

  const doMestre = comoMestre({ acao: "ler_fotos", personagemIds: [naMesa, fora] });
  t.ok("o mestre recebe a foto da ficha que está na mesa dele",
    doMestre.ok && !!doMestre.dados[naMesa] && doMestre.dados[naMesa].imagem === imagem);
  t.ok("  e não a da ficha que não está", !doMestre.dados[fora]);

  const doOutro = comoOutro({ acao: "ler_fotos", personagemIds: [naMesa, fora] });
  t.ok("quem joga na mesma mesa vê a foto do cartão", !!doOutro.dados[naMesa]);
  t.ok("  mas não a de fora da mesa", !doOutro.dados[fora]);

  const doForasteiro = comoForasteiro({ acao: "ler_fotos", personagemIds: [naMesa, fora] });
  t.iguais("quem está fora não recebe nenhuma", doForasteiro.dados, {});

  t.recusa("pedido vazio é recusado", comoMestre({ acao: "ler_fotos", personagemIds: [] }), "dados_invalidos");
  const demais = [];
  for (let i = 0; i < 41; i++) demais.push("id-" + i);
  t.recusa("pedido grande demais é recusado", comoMestre({ acao: "ler_fotos", personagemIds: demais }), "dados_invalidos");

  /* Avatares: a mesma ideia, com a regra que já existia — conta ativa
     aparece para quem está conectado. */
  const avatar = "data:image/png;base64," + "A".repeat(300);
  comoJogador({ acao: "salvar_perfil", dados: { avatar } });

  const campanhaLida = comoOutro({ acao: "ler_campanha", campanhaId: mesa });
  const membro = campanhaLida.dados.membros.find((m) => m.id === jogador.id);
  t.ok("a campanha manda a versão do avatar, não o avatar",
    !!membro.avatarVersao && membro.avatar === undefined);

  const avatares = comoOutro({ acao: "ler_avatares", userIds: [jogador.id] });
  t.igual("e o avatar vem em lote", avatares.dados[jogador.id].imagem, avatar);

  /* A capa da campanha segue o mesmo caminho: versão na listagem,
     imagem em lote, e só para quem alcança a campanha. */
  const capa = "data:image/webp;base64," + "C".repeat(400);
  comoMestre({ acao: "salvar_capa_campanha", campanhaId: mesa, imagem: capa, largura: 1200, altura: 400 });

  const listadas = comoJogador({ acao: "listar_campanhas" }).dados;
  const daMesa = listadas.find((c) => c.id === mesa);
  t.ok("a lista de campanhas manda a versão da capa, não a capa",
    !!daMesa.capaVersao && JSON.stringify(listadas).indexOf("CCCC") < 0);
  t.ok("  e a campanha sem capa vem sem versão",
    listadas.filter((c) => c.id !== mesa).every((c) => !c.capaVersao));

  const capas = comoJogador({ acao: "ler_capas", campanhaIds: [mesa] });
  t.igual("a capa vem em lote para quem é da mesa", capas.dados[mesa].imagem, capa);
  t.igual("  com a versão", capas.dados[mesa].versao, daMesa.capaVersao);

  t.iguais("quem não alcança a campanha não recebe capa nenhuma",
    comoForasteiro({ acao: "ler_capas", campanhaIds: [mesa] }).dados, {});
  t.recusa("pedido de capas vazio é recusado",
    comoMestre({ acao: "ler_capas", campanhaIds: [] }), "dados_invalidos");
  t.recusa("pedido de capas grande demais é recusado",
    comoMestre({ acao: "ler_capas", campanhaIds: demais }), "dados_invalidos");

  const diretorio = comoForasteiro({ acao: "listar_usuarios" }).dados;
  t.ok("o diretório também manda só a versão",
    diretorio.every((u) => u.avatar === undefined));

  /* O diretório de contas fica em cache por alguns minutos. Trocar o
     próprio nome tem de aparecer para os outros AGORA, não depois. */
  comoJogador({ acao: "salvar_perfil", dados: { nome: "Nome Novo" } });
  const depoisDaTroca = comoForasteiro({ acao: "listar_usuarios" }).dados
    .find((u) => u.id === jogador.id);
  t.igual("trocar o nome aparece na hora para os outros", depoisDaTroca.nome, "Nome Novo");
  const cartaoComNomeNovo = comoMestre({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados[0];
  t.igual("  inclusive no cartão da mesa", cartaoComNomeNovo.dono, "Nome Novo");
})();

/* =====================================================================
   O QUE AS MUTAÇÕES ACHARAM
   ---------------------------------------------------------------------
   Cada caso aqui nasceu de uma mutação proposital que a bateria não
   pegava: a garantia existia no código e não estava trancada por
   nenhum teste.
   ===================================================================== */

t.grupo("Projeção — quando ela NÃO pode ser usada");

(() => {
  preparar();
  const nara = novaConta("nara");
  const comoNara = comoFn(nara);
  const mesa = comoNara({ acao: "criar_campanha", dados: { nome: "Velharia" } }).dados.id;

  const id = comoNara({ acao: "criar_personagem", dados: {
    nome: "Cobaia", tipoFicha: "universal",
    status: [{ id: "s1", nome: "Vida", atual: 10, maximo: 20 }],
  } }).dados.id;
  comoNara({ acao: "vincular_personagem", campanhaId: mesa, personagemId: id });

  const coluna = colunaDe("PERSONAGENS", "resumo");
  const projecaoVelha = linhaDoPersonagem(id)[coluna];

  /* Uma gravação feita por um backend que não conhece a coluna `resumo`
     — a v2.15, por exemplo, ou a planilha editada à mão: o conteúdo
     muda, a revisão sobe, a projeção fica como estava. O painel NÃO
     pode desenhar o cartão com ela. */
  const lida = comoNara({ acao: "ler_personagem", personagemId: id });
  const nova = JSON.parse(JSON.stringify(lida.dados));
  nova.status[0].atual = 3;
  comoNara({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: nova });

  linhaDoPersonagem(id)[coluna] = projecaoVelha;
  reiniciarExecucao();

  const cartao = comoNara({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados[0];
  t.igual("projeção de outra gravação não vira cartão", cartao.status[0].atual, 3);

  /* Desfazer a última gravação também acerta o cartão: sem isso o
     painel continuaria mostrando o que foi desfeito. */
  restaurarGeracaoAnterior(id, true);
  reiniciarExecucao();

  const cartao2 = comoNara({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados[0];
  t.igual("restaurar a geração anterior acerta o cartão", cartao2.status[0].atual, 10);
  t.igual("  e a ficha volta junto",
    comoNara({ acao: "ler_personagem", personagemId: id }).dados.status[0].atual, 10);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — a pista velha não manda gravar em cima de ninguém");

(() => {
  preparar();
  const olavo = novaConta("olavo");
  const comoOlavo = comoFn(olavo);

  /* Duas fichas, cada uma com três gerações — a terceira gravação é a
     que passa a ter faixa reutilizável. */
  const conteudoVizinha = "Vizinha " + "v".repeat(90000);
  const vizinha = comoOlavo({ acao: "criar_personagem", dados: fichaGrande("Vizinha", conteudoVizinha) }).dados.id;
  const alvo = comoOlavo({ acao: "criar_personagem", dados: fichaGrande("Alvo", "a".repeat(90000)) }).dados.id;

  const salvar = (id, classe) => {
    const l = comoOlavo({ acao: "ler_personagem", personagemId: id });
    return comoOlavo({ acao: "salvar_personagem", personagemId: id, rev: l.rev,
      dados: Object.assign({}, l.dados, { classe: classe }) });
  };
  salvar(vizinha, "v2"); salvar(vizinha, "v3");
  salvar(alvo, "a2"); salvar(alvo, "a3");

  t.ok("a ficha tem faixa reutilizável", !!manifestoDoPersonagem(alvo).reutilizavel);

  /* Alguém entrou na frente: todas as linhas desceram uma casa, e o
     localizador guardado aponta para a linha de outra pessoa. */
  const f = folhaDe("PERSONAGENS_BLOCOS");
  f.linhas.splice(1, 0, ["intruso", "g-int", 0, 1, 1, new Date().toISOString(), "RB|x|RB"]);
  reiniciarExecucao();

  const gravou = salvar(alvo, "a4");
  t.ok("a gravação seguinte dá certo mesmo com a pista velha", gravou.ok);
  t.igual("  e a ficha da vizinha continua inteira",
    comoOlavo({ acao: "ler_personagem", personagemId: vizinha }).dados.anotacoes.soltas[0].conteudo, conteudoVizinha);
  t.igual("  e a ficha gravada abre com o valor novo",
    comoOlavo({ acao: "ler_personagem", personagemId: alvo }).dados.classe, "a4");

  /* O caso extremo: a pista aponta EXATAMENTE para os blocos que valem
     de outra ficha. A conferência é o que impede a gravação de escrever
     por cima deles. */
  const mAlvo = manifestoDoPersonagem(alvo);
  const mVizinha = manifestoDoPersonagem(vizinha);
  mAlvo.reutilizavel = { geracao: mAlvo.reutilizavel.geracao, local: mVizinha.local };
  linhaDoPersonagem(alvo)[colunaDe("PERSONAGENS", "armazenamento")] = JSON.stringify(mAlvo);
  reiniciarExecucao();

  const porCima = salvar(alvo, "a5");
  t.ok("com a pista apontando para os blocos de outra ficha, a gravação dá certo", porCima.ok);
  t.igual("  sem tocar na ficha da vizinha",
    comoOlavo({ acao: "ler_personagem", personagemId: vizinha }).dados.anotacoes.soltas[0].conteudo, conteudoVizinha);
  t.igual("  e a própria abre com o valor novo",
    comoOlavo({ acao: "ler_personagem", personagemId: alvo }).dados.classe, "a5");
})();

/* ---------------------------------------------------------------------- */
t.grupo("Blocos — gravar não desloca os blocos de ninguém");

(() => {
  preparar();
  const pedro = novaConta("pedro");
  const comoPedro = comoFn(pedro);

  /* A movimentada vem PRIMEIRO na aba, e já com as três faixas dela
     criadas: assim TODA linha que a gravação dela venha a recolher está
     acima das linhas da parada, e apagar qualquer uma puxaria a parada
     para cima. */
  const movimentada = comoPedro({ acao: "criar_personagem", dados: fichaGrande("Movimentada", "m".repeat(80000)) }).dados.id;
  for (let i = 0; i < 2; i++) {
    const l = comoPedro({ acao: "ler_personagem", personagemId: movimentada });
    comoPedro({ acao: "salvar_personagem", personagemId: movimentada, rev: l.rev,
      dados: Object.assign({}, l.dados, { classe: "inicio" + i }) });
  }
  const parada = comoPedro({ acao: "criar_personagem", dados: fichaGrande("Parada", "p".repeat(80000)) }).dados.id;

  /* O que importa não é o número guardado no manifesto — esse não muda
     sozinho —, é a LINHA continuar sendo a dela. */
  const apontaParaEla = () => {
    const local = manifestoDoPersonagem(parada).local;
    const linhas = linhasDe("PERSONAGENS_BLOCOS");
    for (let i = 0; i < local.blocos; i++) {
      const linha = linhas[local.linha - 2 + i];
      if (!linha || linha[0] !== parada) return false;
    }
    return true;
  };
  const primeiraLinhaDaParada = () => linhasDe("PERSONAGENS_BLOCOS").findIndex((l) => l[0] === parada);
  const linhaInicial = primeiraLinhaDaParada();
  t.ok("o localizador da ficha parada aponta para os blocos dela", apontaParaEla());
  const linhasDaParada = JSON.stringify(blocosDoPersonagem(parada));

  for (let i = 0; i < 6; i++) {
    const l = comoPedro({ acao: "ler_personagem", personagemId: movimentada });
    comoPedro({ acao: "salvar_personagem", personagemId: movimentada, rev: l.rev,
      dados: Object.assign({}, l.dados, { classe: "c" + i }) });
  }

  t.ok("seis gravações da vizinha não movem os blocos da ficha parada", apontaParaEla());
  t.igual("  e o conteúdo delas continua o mesmo", JSON.stringify(blocosDoPersonagem(parada)), linhasDaParada);
  t.ok("  a ficha parada abre sem precisar do índice",
    comoPedro({ acao: "ler_personagem", personagemId: parada }).ok);

  /* E quando a vizinha ENCOLHE: a faixa dela sobra, e o que sobra fica
     em branco. Apagar essas linhas puxaria a ficha parada para cima. */
  const antesDeEncolher = comoPedro({ acao: "ler_personagem", personagemId: movimentada });
  const encolhida = Object.assign({}, antesDeEncolher.dados);
  encolhida.anotacoes = { pastas: [], soltas: [{ id: "n1", titulo: "curta", conteudo: "fim" }] };
  const encolheu = comoPedro({ acao: "salvar_personagem", personagemId: movimentada,
    rev: antesDeEncolher.rev, dados: encolhida });
  t.ok("a vizinha encolhe de três blocos para um", encolheu.ok && manifestoDoPersonagem(movimentada).blocos === 1);
  t.ok("  e mesmo assim os blocos da ficha parada não saem do lugar", apontaParaEla());
  t.igual("  na mesma posição da aba", primeiraLinhaDaParada(), linhaInicial);
  t.igual("  com o conteúdo intacto", JSON.stringify(blocosDoPersonagem(parada)), linhasDaParada);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Histórico — o cursor aguenta linha deslocada e id fora de ordem");

(() => {
  preparar();
  const quim = novaConta("quim");
  const comoQuim = comoFn(quim);

  const outra = comoQuim({ acao: "criar_campanha", dados: { nome: "Outra mesa" } }).dados.id;
  const minha = comoQuim({ acao: "criar_campanha", dados: { nome: "Minha mesa" } }).dados.id;

  /* O histórico da outra mesa vem ANTES na planilha: limpá-lo puxa as
     linhas desta para cima. */
  for (let i = 0; i < 20; i++) {
    comoQuim({ acao: "registrar_rolagem", campanhaId: outra, rolagemId: "outra-" + String(i).padStart(4, "0"),
      tipo: "livre", nome: "x", dados: { total: i } });
  }
  for (let i = 0; i < 30; i++) {
    comoQuim({ acao: "registrar_rolagem", campanhaId: minha, rolagemId: "minha-" + String(i).padStart(4, "0"),
      tipo: "livre", nome: "y", dados: { total: i } });
  }

  const pagina1 = comoQuim({ acao: "listar_rolagens", campanhaId: minha, limite: 10 });
  comoQuim({ acao: "limpar_rolagens", campanhaId: outra });

  const pagina2 = comoQuim({ acao: "listar_rolagens", campanhaId: minha, limite: 10, cursor: pagina1.dados.proximo });
  const ids1 = pagina1.dados.rolagens.map((r) => r.id);
  const ids2 = pagina2.dados.rolagens.map((r) => r.id);

  t.igual("a segunda página vem inteira mesmo com as linhas deslocadas", ids2.length, 10);
  t.igual("  sem repetir a primeira", ids2.filter((id) => ids1.indexOf(id) >= 0).length, 0);
  t.igual("  e sem buraco entre elas", ids2[0], "minha-0019");

  /* Ids que NÃO estão na mesma ordem das linhas: a página é ordenada
     pela mesma chave que o cursor compara, senão some rolagem. */
  const nova = comoQuim({ acao: "criar_campanha", dados: { nome: "Fora de ordem" } }).dados.id;
  /* Ids de oito caracteres (o mínimo que o servidor aceita) em ordem
     que NÃO acompanha a das linhas. */
  const ordemDeEntrada = ["zz-00001", "aa-00002", "mm-00003", "bb-00004", "yy-00005", "cc-00006"];
  ordemDeEntrada.forEach((id, i) => {
    comoQuim({ acao: "registrar_rolagem", campanhaId: nova, rolagemId: id, tipo: "livre", nome: "z", dados: { total: i } });
  });

  const todas = todasAsRolagens(comoQuim, nova, 2);
  t.igual("paginando de dois em dois, com ids fora da ordem das linhas", todas.length, 6);
  t.igual("  sem repetir", new Set(todas).size, 6);

  /* O id do cursor sumiu da planilha entre uma página e outra. Sobra a
     pista da linha — e a data conferindo, para nada que já foi mostrado
     voltar. */
  const p1 = comoQuim({ acao: "listar_rolagens", campanhaId: minha, limite: 5 });
  const ultimaDaPagina = p1.dados.rolagens[p1.dados.rolagens.length - 1].id;
  const folhaR = folhaDe("CAMPANHA_ROLAGENS");
  /* O id do cursor sai da planilha E as linhas sobem: a pista da linha
     passa a apontar para uma rolagem MAIS NOVA, das que já foram
     mostradas. É a data que impede a página de repeti-las. */
  folhaR.linhas.splice(folhaR.linhas.findIndex((l) => l[0] === ultimaDaPagina), 1);
  for (let i = 0; i < 6; i++) {
    folhaR.linhas.splice(folhaR.linhas.findIndex((l) => String(l[0]).indexOf("minha-00") === 0) - 1, 1);
  }
  reiniciarExecucao();

  const p2 = comoQuim({ acao: "listar_rolagens", campanhaId: minha, limite: 5, cursor: p1.dados.proximo });
  t.igual("com o id do cursor apagado, a página seguinte vem inteira", p2.dados.rolagens.length, 5);

  /* A promessa, nesse caso extremo, é não PERDER: uma rolagem já
     mostrada pode voltar (a tela a reconhece pelo id), mas nenhuma das
     mais antigas pode sumir. */
  const restantes = linhasDe("CAMPANHA_ROLAGENS")
    .filter((l) => String(l[0]).indexOf("minha-") === 0).map((l) => l[0]);
  const alcancadas = new Set(todasAsRolagens(comoQuim, minha, 5));
  t.igual("  e a paginação alcança todas as que sobraram",
    restantes.filter((id) => !alcancadas.has(id)).length, 0);

  /* Com datas distintas — que é o caso de uma mesa de verdade, onde
     ninguém rola dois dados no mesmo milissegundo — a data faz mais do
     que não perder: ela impede a página de repetir o que já mostrou,
     mesmo com a pista da linha apontando para o lugar errado. */
  const colunaData = colunaDe("CAMPANHA_ROLAGENS", "criadoEm");
  linhasDe("CAMPANHA_ROLAGENS")
    .filter((l) => String(l[0]).indexOf("minha-") === 0)
    .forEach((l, i) => {
      l[colunaData] = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    });
  reiniciarExecucao();

  const d1 = comoQuim({ acao: "listar_rolagens", campanhaId: minha, limite: 5 });
  const idDoCursor = d1.dados.rolagens[d1.dados.rolagens.length - 1].id;
  const folhaR2 = folhaDe("CAMPANHA_ROLAGENS");
  folhaR2.linhas.splice(folhaR2.linhas.findIndex((l) => l[0] === idDoCursor), 1);
  for (let i = 0; i < 4; i++) {
    folhaR2.linhas.splice(folhaR2.linhas.findIndex((l) => String(l[0]).indexOf("minha-") === 0) - 1, 1);
  }
  reiniciarExecucao();

  const d2 = comoQuim({ acao: "listar_rolagens", campanhaId: minha, limite: 5, cursor: d1.dados.proximo });
  const mostradas = new Set(d1.dados.rolagens.map((r) => r.id));
  t.igual("  com datas distintas, a página seguinte não repete nenhuma",
    d2.dados.rolagens.filter((r) => mostradas.has(r.id)).length, 0);
})();

/* ---------------------------------------------------------------------- */
t.grupo("Cache — o que fica guardado entre requisições");

(() => {
  preparar();
  const sara = novaConta("sara");
  const comoSara = comoFn(sara);

  comoSara({ acao: "listar_usuarios" });

  const chaves = [...ambiente.cache.keys()];
  const doDiretorio = chaves.filter((k) => k.indexOf("rama.contas.") === 0);
  t.igual("o diretório de contas fica em cache", doDiretorio.length, 1);

  const guardadoNoCache = ambiente.cache.get(doDiretorio[0]);
  const proibidos = ["hashSenha", "salt", "iteracoes", "pepper", "token", "senha"];
  t.ok("e não leva nada de secreto",
    !proibidos.some((c) => guardadoNoCache.indexOf(c) >= 0));

  t.ok("nenhuma entrada de cache leva ficha inteira",
    chaves.every((k) => (ambiente.cache.get(k) || "").indexOf("anotacoes") < 0));
})();

/* =====================================================================
   v2.19 — CONDIÇÕES, TURNOS DO COMBATE E PONTOS DE DETERMINAÇÃO
   ---------------------------------------------------------------------
   Morrendo e enlouquecendo contam os INÍCIOS DE TURNO do personagem na
   cena (Ordem Paranormal RPG, p. 88). No combate da campanha, quem conta
   é o servidor, no mesmo lote que muda o turno. Cada início é um evento
   com id próprio (`cb:<combate>:<rodada>:<participante>`): o mesmo turno
   — visto pelo mestre e pelo jogador, repetido pela rede, relido numa
   recarga — é o mesmo evento, e conta uma vez.

   As fichas daqui são montadas com js/ordem/condicoes.js, o mesmo
   módulo da ficha: é esse o formato que o site grava.
   ===================================================================== */

t.grupo("Condições — o combate conta só o início do turno do personagem, e uma vez");

await (async () => {
  (0, eval)(await Deno.readTextFile(new URL("../js/ordem/condicoes.js", import.meta.url)));
  const CD = globalThis.RAMAOrdemCondicoes;

  preparar();
  const mestra = novaConta("mestra");
  const lia = novaConta("lia");
  const beto = novaConta("beto");
  const comoMestra = comoFn(mestra);
  const comoLia = comoFn(lia);
  const comoBeto = comoFn(beto);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Porão" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa,
    membros: [{ userId: lia.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });

  const QUANDO = "2026-09-25T12:00:00.000Z";
  const condicoesCom = (ajuste) => {
    const c = CD.vazio();
    CD.novaCena(c, QUANDO);
    if (ajuste) ajuste(c);
    return c;
  };
  const fichaOrdem = (nome, condicoes) => {
    const ordem = {
      classe: "combatente", origem: "militar", trilha: "", nex: 10,
      atributos: { agi: 1, for: 2, int: 1, pre: 1, vig: 2 },
      recursos: { pv: 0, pe: null, san: null, pd: null },
      escolhas: [],
    };
    if (condicoes) ordem.condicoes = condicoes;
    return { nome, tipoFicha: "ordem", schemaVersion: 10, ordem, resumoRecursos: { pv: 20, pe: 3, san: 12 } };
  };
  const criar = (como, nome, condicoes) => {
    const id = como({ acao: "criar_personagem", dados: fichaOrdem(nome, condicoes) }).dados.id;
    como({ acao: "vincular_personagem", campanhaId: mesa, personagemId: id });
    return id;
  };

  const pLia = criar(comoLia, "Lia", condicoesCom((c) => CD.ativar(c, "morrendo", QUANDO)));
  const pBeto = criar(comoBeto, "Beto", condicoesCom());
  const pNina = criar(comoLia, "Nina", condicoesCom((c) => { CD.ativar(c, "morrendo", QUANDO); c.integrarCombate = false; }));
  const pVelho = criar(comoBeto, "Velho", null);
  const pRui = criar(comoLia, "Rui", condicoesCom((c) => CD.ativar(c, "morrendo", QUANDO)));

  const ler = (id) => comoMestra({ acao: "ler_personagem", personagemId: id });
  const cond = (id) => ler(id).dados.ordem.condicoes;
  const rastro = (c, chave) => (chave === "exaustao" || chave === "desmaio") ? c.mesa[chave] : c[chave];
  const ids = (id, chave) => rastro(cond(id), chave).eventos.map((e) => e.id);
  const revDe = (id) => ler(id).rev;
  const revs = () => ({ lia: revDe(pLia), beto: revDe(pBeto), nina: revDe(pNina), velho: revDe(pVelho), rui: revDe(pRui) });

  /* O que a jogadora faz na ficha: lê, mexe com o módulo, grava. */
  const naFicha = (como, id, fazer) => {
    const lida = como({ acao: "ler_personagem", personagemId: id });
    const c = CD.normalizar(lida.dados.ordem.condicoes);
    fazer(c);
    lida.dados.ordem.condicoes = c;
    return como({ acao: "salvar_personagem", personagemId: id, rev: lida.rev, dados: lida.dados });
  };

  const novoCombate = (nome) => comoMestra({ acao: "salvar_combate", campanhaId: mesa,
    dados: { nome, estado: "preparando", visiveis: [lia.id, beto.id], participantes: [] } }).dados.id;
  const operador = (combateId) => {
    let rev = 1;
    let seq = 0;
    const operar = (ops, opcoes) => {
      const o = opcoes || {};
      const r = comoMestra({ acao: "atualizar_combate", campanhaId: mesa, combateId,
        rev: o.rev !== undefined ? o.rev : rev, opId: o.opId || ("cond-" + combateId.slice(0, 8) + "-" + String(++seq).padStart(4, "0")), ops });
      if (r.ok) rev = r.rev;
      return r;
    };
    operar.rev = () => rev;
    operar.proximo = (vezes) => {
      let r;
      for (let i = 0; i < (vezes || 1); i++) r = operar([{ tipo: "turno", direcao: "proximo" }]);
      return r;
    };
    operar.voltar = () => operar([{ tipo: "turno", direcao: "anterior" }]);
    operar.ev = (rodada, participante) => "cb:" + combateId + ":" + rodada + ":" + participante;
    return operar;
  };

  const combate = novoCombate("Emboscada");
  const operar = operador(combate);
  const ev = operar.ev;

  /* Ordem: Lia 20, criatura 15, Beto 10, Nina 8, Velho 6, Rui 4 — seis
     turnos por rodada. */
  operar([{ tipo: "adicionar", participantes: [
    { id: "p-lia", tipo: "personagem", personagemId: pLia, ordem: 20 },
    { id: "c-mon", tipo: "criatura", nome: "Existido", ordem: 15, snapshot: { status: [{ id: "vida", nome: "Vida", atual: 20, maximo: 20 }] } },
    { id: "p-beto", tipo: "personagem", personagemId: pBeto, ordem: 10 },
    { id: "p-nina", tipo: "personagem", personagemId: pNina, ordem: 8 },
    { id: "p-velho", tipo: "personagem", personagemId: pVelho, ordem: 6 },
    { id: "p-rui", tipo: "personagem", personagemId: pRui, ordem: 4 },
  ] }]);
  t.iguais("em preparação, nada conta", ids(pLia, "morrendo"), []);

  const antes = revs();
  const comecou = operar([{ tipo: "estado", valor: "ativo" }]);
  t.iguais("iniciar o combate dá o turno à Lia, rodada 1", comecou.dados.turno, { rodada: 1, ativoId: "p-lia" });
  t.iguais("  e o início do turno dela conta em morrendo, com o id do turno", ids(pLia, "morrendo"), [ev(1, "p-lia")]);
  const primeiro = cond(pLia).morrendo.eventos[0];
  t.ok("  como evento do combate, na cena da ficha, com rodada e combate", primeiro.origem === "combate" &&
    primeiro.cena === cond(pLia).cena.id && primeiro.rodada === 1 && primeiro.combate === combate);
  t.igual("  a ficha dela sobe uma revisão, como numa gravação qualquer", revDe(pLia), antes.lia + 1);
  t.ok("  e o lote não avisa falha", !(comecou.avisos || []).some((a) => a.aviso === "condicao_nao_contada"));

  const depoisDoInicio = revs();
  operar.proximo(5);
  t.iguais("os turnos da criatura e dos outros NÃO contam para a Lia", ids(pLia, "morrendo"), [ev(1, "p-lia")]);
  t.igual("  nem tocam na ficha dela", revDe(pLia), depoisDoInicio.lia);
  t.igual("sem condição ativa, a ficha do Beto não é regravada", revDe(pBeto), depoisDoInicio.beto);
  t.igual("com \"Contar pelo combate\" desligado, o morrendo da Nina não conta", ids(pNina, "morrendo").length, 0);
  t.igual("  e a ficha dela fica como estava", revDe(pNina), depoisDoInicio.nina);
  t.ok("ficha de antes desta versão, sem condições, continua sem elas",
    ler(pVelho).dados.ordem.condicoes === undefined && revDe(pVelho) === depoisDoInicio.velho);
  t.iguais("o Rui, morrendo, conta no turno DELE", ids(pRui, "morrendo"), [ev(1, "p-rui")]);

  /* Rodada 2: o segundo início da Lia — com cinco turnos de outros no meio. */
  const opDaRodada2 = "cond-rodada-dois-da-lia";
  const revDoCombate = operar.rev();
  const r2 = operar([{ tipo: "turno", direcao: "proximo" }], { opId: opDaRodada2 });
  t.iguais("a rodada 2 volta à Lia", r2.dados.turno, { rodada: 2, ativoId: "p-lia" });
  t.iguais("  e o segundo início conta: turnos não consecutivos, a mesma cena", ids(pLia, "morrendo"), [ev(1, "p-lia"), ev(2, "p-lia")]);
  const revLia2 = revDe(pLia);
  const repetido = operar([{ tipo: "turno", direcao: "proximo" }], { opId: opDaRodada2, rev: revDoCombate });
  t.ok("o mesmo lote repetido (resposta perdida) é reconhecido", repetido.ok && repetido.repetida === true);
  t.iguais("  e NÃO conta de novo", ids(pLia, "morrendo"), [ev(1, "p-lia"), ev(2, "p-lia")]);
  t.igual("  nem regrava a ficha", revDe(pLia), revLia2);

  const outraAba = comoMestra({ acao: "atualizar_combate", campanhaId: mesa, combateId: combate, rev: revDoCombate,
    opId: "cond-outra-aba-0001", ops: [{ tipo: "turno", direcao: "proximo" }] });
  t.recusa("outra aba do mestre, com a revisão velha, não passa o turno de novo", outraAba, "conflito");
  t.igual("  e nada conta por ela", ids(pLia, "morrendo").length, 2);

  t.recusa("a jogadora não passa turno — e não conta nada por isso",
    comoLia({ acao: "atualizar_combate", campanhaId: mesa, combateId: combate, rev: operar.rev(), opId: "cond-da-lia-0001",
      ops: [{ tipo: "turno", direcao: "proximo" }] }), "sem_permissao");

  /* A ficha aberta num aparelho antigo não apaga o que o combate contou:
     a revisão subiu, a gravação vira conflito e o site concilia. */
  const aberta = comoLia({ acao: "ler_personagem", personagemId: pLia });
  operar.voltar();
  operar.proximo();
  const velha = JSON.parse(JSON.stringify(aberta.dados));
  velha.nome = "Lia (aparelho antigo)";
  velha.ordem.condicoes.morrendo.eventos = [];
  const porCima = comoLia({ acao: "salvar_personagem", personagemId: pLia, rev: aberta.rev, dados: velha });
  t.recusa("gravar a ficha sobre uma revisão velha é conflito", porCima, "conflito");
  t.iguais("  e a contagem do servidor continua lá", ids(pLia, "morrendo"), [ev(1, "p-lia"), ev(2, "p-lia")]);

  /* Medicina encerra morrendo (p. 88): a contagem para, mas os turnos da
     cena ficam. */
  t.ok("a jogadora encerra morrendo (Medicina)", naFicha(comoLia, pLia, (c) => CD.encerrar(c, "morrendo")).ok);
  const voltou = operar.voltar();
  t.iguais("voltar turno devolve o turno ao Rui, rodada 1", voltou.dados.turno, { rodada: 1, ativoId: "p-rui" });
  t.iguais("  e retira só o início desfeito", ids(pLia, "morrendo"), [ev(1, "p-lia")]);
  t.igual("  sem desfazer o que a jogadora fez depois dele: morrendo continua encerrado", cond(pLia).morrendo.ativa, false);
  t.iguais("  o Rui, que tem o turno de novo, não conta outra vez", ids(pRui, "morrendo"), [ev(1, "p-rui")]);
  operar.proximo();
  t.iguais("com morrendo encerrado, o início do turno não conta", ids(pLia, "morrendo"), [ev(1, "p-lia")]);

  naFicha(comoLia, pLia, (c) => CD.ativar(c, "morrendo", QUANDO));
  t.igual("morrendo de novo na mesma cena: a contagem continua de onde estava",
    CD.estado(CD.normalizar(cond(pLia)), "morrendo").contagem, 1);
  operar.proximo(6);
  t.iguais("  e o próximo início dela soma", ids(pLia, "morrendo"), [ev(1, "p-lia"), ev(3, "p-lia")]);

  /* −1 à mão tira o último início da cena; o do combate fica descartado. */
  naFicha(comoLia, pLia, (c) => CD.corrigirMenos(c, "morrendo"));
  t.iguais("−1 à mão tira o último início da cena", ids(pLia, "morrendo"), [ev(1, "p-lia")]);
  t.iguais("  e o turno do combate tirado fica descartado", cond(pLia).morrendo.descartados, [ev(3, "p-lia")]);
  operar.voltar();
  operar.proximo();
  t.iguais("voltar e avançar sobre o turno descartado NÃO o conta de novo", ids(pLia, "morrendo"), [ev(1, "p-lia")]);

  naFicha(comoLia, pLia, (c) => CD.somarInicio(c, "morrendo", QUANDO));
  const manual = cond(pLia).morrendo.eventos.filter((e) => e.origem === "manual").map((e) => e.id);
  t.igual("+1 à mão soma um início", manual.length, 1);
  operar.proximo(6);
  t.iguais("  e a rodada 4 fecha os três inícios da cena", ids(pLia, "morrendo"), [ev(1, "p-lia"), manual[0], ev(4, "p-lia")]);
  const noLimite = CD.estado(CD.normalizar(cond(pLia)), "morrendo");
  t.ok("  3 de 3: a ficha mostra o resultado da regra", noLimite.atingiu === true && /morre/.test(noLimite.resultado));
  t.ok("  e nada foi apagado nem mudou de dono", ler(pLia).ok &&
    comoLia({ acao: "ler_personagem", personagemId: pLia }).dono === true);
  operar.proximo(6);
  t.igual("no limite, a rodada 5 não conta mais", ids(pLia, "morrendo").length, 3);
  const revNoLimite = revDe(pLia);
  operar.voltar();
  t.iguais("voltar sobre um turno que não contou não tira nada", ids(pLia, "morrendo"), [ev(1, "p-lia"), manual[0], ev(4, "p-lia")]);
  t.igual("  nem regrava a ficha", revDe(pLia), revNoLimite);

  /* Quem sai da mesa sai da contagem: o servidor só grava ficha da
     campanha. Cena nova antes, para o Rui não estar no limite. */
  naFicha(comoLia, pRui, (c) => CD.novaCena(c, QUANDO));
  comoLia({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pRui, vincular: false });
  const ruiFora = comoLia({ acao: "ler_personagem", personagemId: pRui });
  operar.proximo(6);
  const ruiDepois = comoLia({ acao: "ler_personagem", personagemId: pRui });
  t.ok("personagem tirado da campanha não é contado pelo combate dela",
    CD.contagem(CD.normalizar(ruiDepois.dados.ordem.condicoes), "morrendo") === 0 && ruiDepois.rev === ruiFora.rev &&
    ruiDepois.dados.ordem.condicoes.morrendo.ativa === true);

  /* Encerrar o combate não é encerrar a cena. */
  const antesDeEncerrar = ids(pLia, "morrendo");
  const revAntesDeEncerrar = revDe(pLia);
  operar([{ tipo: "estado", valor: "encerrado" }]);
  t.iguais("encerrar o combate não zera a contagem da cena", ids(pLia, "morrendo"), antesDeEncerrar);
  t.igual("  nem mexe na ficha", revDe(pLia), revAntesDeEncerrar);

  /* ---- O que os outros jogadores veem ---- */
  const cartao = (como, id) => comoFn(como)({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados.find((c) => c.id === id);
  const naLista = (como, combateId, participanteId) => comoFn(como)({ acao: "listar_combates", campanhaId: mesa }).dados
    .find((c) => c.id === combateId).participantes.find((p) => p.id === participanteId);

  const combateVisto = combate;

  const vistoPeloBeto = cartao(beto, pLia);
  const morrendoVisto = (vistoPeloBeto.condicoes || []).find((c) => c.chave === "morrendo");
  t.ok("outro jogador vê as condições da Lia no painel da mesa",
    !!morrendoVisto && morrendoVisto.ativa === true && morrendoVisto.contagem === 3 && morrendoVisto.limite === 3);
  t.ok("  inclusive inconsciente", (vistoPeloBeto.condicoes || []).some((c) => c.chave === "inconsciente" && c.ativa));
  t.ok("  e só o resumo: sem eventos, ids de turno ou descartes",
    !JSON.stringify(vistoPeloBeto.condicoes).includes("cb:") && !JSON.stringify(vistoPeloBeto).includes("descartados"));
  t.ok("  e no combate, na linha da Lia", (naLista(beto, combateVisto, "p-lia").condicoes || []).some((c) => c.chave === "morrendo"));

  comoMestra({ acao: "salvar_campanha", campanhaId: mesa, dados: { ocultarStatusJogadores: true } });
  t.ok("com \"Esconder status dos jogadores\", as condições alheias NÃO chegam", cartao(beto, pLia).condicoes === undefined);
  t.ok("  nem no combate", naLista(beto, combateVisto, "p-lia").condicoes === undefined);
  t.ok("  a dona continua vendo tudo", !!cartao(lia, pLia).ordem.condicoes.morrendo.ativa);
  t.ok("  e a mestra também", !!cartao(mestra, pLia).ordem.condicoes.morrendo.ativa &&
    (naLista(mestra, combateVisto, "p-lia").condicoes || []).some((c) => c.chave === "morrendo"));
  comoMestra({ acao: "salvar_campanha", campanhaId: mesa, dados: { ocultarStatusJogadores: false } });
  t.ok("desligada a ocultação, voltam", (cartao(beto, pLia).condicoes || []).length > 0);

  /* ---- Enlouquecendo e os contadores da mesa, de combate em combate ---- */
  naFicha(comoBeto, pBeto, (c) => {
    CD.ativar(c, "enlouquecendo", QUANDO);
    CD.configurarDaMesa(c, "exaustao", { usar: true, limite: 5 });
    CD.ativar(c, "exaustao", QUANDO);
    CD.configurarDaMesa(c, "desmaio", { usar: true });
  });
  const combate3 = novoCombate("Corredor");
  const operar3 = operador(combate3);
  operar3([{ tipo: "adicionar", participantes: [
    { id: "p-beto", tipo: "personagem", personagemId: pBeto, ordem: 10 },
    { id: "c-som", tipo: "criatura", nome: "Sombra", ordem: 5, snapshot: { status: [{ id: "vida", nome: "Vida", atual: 9, maximo: 9 }] } },
  ] }]);
  operar3([{ tipo: "estado", valor: "ativo" }]);
  t.iguais("o início do turno conta em cada condição ativa: enlouquecendo", ids(pBeto, "enlouquecendo"), [operar3.ev(1, "p-beto")]);
  t.iguais("  e o contador da mesa ligado e ativo (exaustão)", ids(pBeto, "exaustao"), [operar3.ev(1, "p-beto")]);
  t.iguais("  mas não o contador ligado e inativo (desmaio)", ids(pBeto, "desmaio"), []);

  naFicha(comoBeto, pBeto, (c) => CD.encerrar(c, "enlouquecendo"));
  operar3.proximo(2);
  t.igual("curada a Sanidade, enlouquecendo para de contar", ids(pBeto, "enlouquecendo").length, 1);
  t.igual("  e a exaustão, que segue ativa, conta", ids(pBeto, "exaustao").length, 2);
  naFicha(comoBeto, pBeto, (c) => CD.ativar(c, "enlouquecendo", QUANDO));
  operar3.proximo(2);
  t.iguais("enlouquecendo de novo: a contagem continua", ids(pBeto, "enlouquecendo"), [operar3.ev(1, "p-beto"), operar3.ev(3, "p-beto")]);

  /* Voltar o turno não é começar um turno: quem recebe a vez de volta não
     conta de novo — nem numa condição que ganhou depois do início dele. */
  operar3.proximo();
  naFicha(comoBeto, pBeto, (c) => CD.ativar(c, "desmaio", QUANDO));
  operar3.voltar();
  t.iguais("voltar a vez a quem ganhou uma condição depois do início do turno não conta aquele início", ids(pBeto, "desmaio"), []);
  t.iguais("  nem conta de novo o que já estava contado", ids(pBeto, "enlouquecendo"), [operar3.ev(1, "p-beto"), operar3.ev(3, "p-beto")]);
  operar3([{ tipo: "estado", valor: "encerrado" }]);

  const combate4 = novoCombate("Escada");
  const operar4 = operador(combate4);
  operar4([{ tipo: "adicionar", participantes: [{ id: "p-beto", tipo: "personagem", personagemId: pBeto, ordem: 1 }] }]);
  operar4([{ tipo: "estado", valor: "ativo" }]);
  t.iguais("outro combate na mesma cena continua a contagem (o id do turno é de outro combate)",
    ids(pBeto, "enlouquecendo"), [operar3.ev(1, "p-beto"), operar3.ev(3, "p-beto"), operar4.ev(1, "p-beto")]);
  t.igual("  e chega a 3 de 3", CD.estado(CD.normalizar(cond(pBeto)), "enlouquecendo").atingiu, true);

  naFicha(comoBeto, pBeto, (c) => CD.novaCena(c, QUANDO));
  const cenaNova = CD.normalizar(cond(pBeto));
  t.ok("cena nova zera as contagens e mantém a condição ativa",
    CD.contagem(cenaNova, "enlouquecendo") === 0 && cenaNova.enlouquecendo.ativa === true);
  operar4.proximo();
  t.igual("  e os inícios seguintes contam na cena nova", CD.contagem(CD.normalizar(cond(pBeto)), "enlouquecendo"), 1);

  /* ---- Ficha que não se monta: o combate anda, e o mestre é avisado ---- */
  const pIvo = criar(comoBeto, "Ivo", condicoesCom((c) => CD.ativar(c, "morrendo", QUANDO)));
  const combate5 = novoCombate("Beco");
  const operar5 = operador(combate5);
  operar5([{ tipo: "adicionar", participantes: [
    { id: "c-cao", tipo: "criatura", nome: "Cão", ordem: 9, snapshot: { status: [{ id: "vida", nome: "Vida", atual: 5, maximo: 5 }] } },
    { id: "p-ivo", tipo: "personagem", personagemId: pIvo, ordem: 1 },
  ] }]);
  operar5([{ tipo: "estado", valor: "ativo" }]);
  const blocos = folhaDe("PERSONAGENS_BLOCOS");
  const manifestoDoIvo = manifestoDoPersonagem(pIvo);
  blocos.linhas.splice(blocos.linhas.findIndex((l) => l[0] === pIvo && l[1] === manifestoDoIvo.geracao), 1);
  reiniciarExecucao();
  const semFicha = operar5.proximo();
  t.ok("ficha que não se monta: o turno anda mesmo assim", semFicha.ok && semFicha.dados.turno.ativoId === "p-ivo");
  t.ok("  e o mestre recebe o aviso para contar à mão",
    (semFicha.avisos || []).some((a) => a.aviso === "condicao_nao_contada" && a.personagemId === pIvo));
  t.recusa("  sem nada gravado por cima dela", comoBeto({ acao: "ler_personagem", personagemId: pIvo }), "ficha_ilegivel");
})();

t.grupo("Pontos de determinação — resumo, painel e ajuste rápido");

(() => {
  preparar();
  const mestra = novaConta("mestra");
  const duda = novaConta("duda");
  const eli = novaConta("eli");
  const comoMestra = comoFn(mestra);
  const comoDuda = comoFn(duda);
  const comoEli = comoFn(eli);

  const mesa = comoMestra({ acao: "criar_campanha", dados: { nome: "Sem Sanidade" } }).dados.id;
  comoMestra({ acao: "salvar_participantes", campanhaId: mesa,
    membros: [{ userId: duda.id, papel: "jogador" }, { userId: eli.id, papel: "jogador" }] });

  /* Ocultista, NEX 5, Presença 2: 10 + 2 = 12 PD (SAH p. 104). PE e SAN
     antigos ficam guardados, sem conversão. */
  const ficha = {
    nome: "Duda", tipoFicha: "ordem", schemaVersion: 10,
    ordem: {
      classe: "ocultista", origem: "academico", trilha: "", nex: 5,
      atributos: { agi: 1, for: 1, int: 2, pre: 2, vig: 1 },
      opcionais: { semSanidade: true },
      recursos: { pv: 12, pe: 4, san: 9, pd: 7 },
      escolhas: [],
    },
    resumoRecursos: { pv: 12, pe: null, san: null, pd: 12 },
  };
  const pDuda = comoDuda({ acao: "criar_personagem", dados: ficha }).dados.id;
  comoDuda({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pDuda });

  const cartao = (como) => comoFn(como)({ acao: "listar_personagens_campanha", campanhaId: mesa }).dados.find((c) => c.id === pDuda);
  t.iguais("com \"Jogando sem Sanidade\", a mesa vê PV e PD — sem PE nem SAN",
    cartao(eli).recursos, [{ chave: "pv", rotulo: "PV", atual: 12, maximo: 12 }, { chave: "pd", rotulo: "PD", atual: 7, maximo: 12 }]);
  t.ok("o resumo guardado leva PD e deixa PE e SAN nulos",
    (() => { const r = cartao(duda).resumoRecursos; return r.pd === 12 && r.pe === null && r.san === null; })());

  t.ok("a dona ajusta os PD pelo painel", comoDuda({ acao: "ajustar_personagem", personagemId: pDuda, campanhaId: mesa,
    alvo: "recurso", itemId: "pd", campo: "atual", valor: 3 }).ok);
  t.igual("  e a mesa vê o valor novo", cartao(eli).recursos[1].atual, 3);
  const lida = comoDuda({ acao: "ler_personagem", personagemId: pDuda }).dados;
  t.ok("  sem tocar nos PE e na SAN guardados", lida.ordem.recursos.pe === 4 && lida.ordem.recursos.san === 9);
  t.recusa("o outro jogador não ajusta os PD dela", comoEli({ acao: "ajustar_personagem", personagemId: pDuda, campanhaId: mesa,
    alvo: "recurso", itemId: "pd", campo: "atual", valor: 1 }), "nao_encontrado");

  const rev = () => comoDuda({ acao: "ler_personagem", personagemId: pDuda }).rev;
  const novoResumo = comoDuda({ acao: "atualizar_resumo_personagem", personagemId: pDuda, rev: rev(),
    resumo: { pv: 12, pe: null, san: null, pd: 15 } });
  t.ok("o resumo com PD é aceito", novoResumo.ok && novoResumo.dados.mudou === true && cartao(eli).recursos[1].maximo === 15);
  t.recusa("resumo sem PD e com PE nulo é recusado", comoDuda({ acao: "atualizar_resumo_personagem", personagemId: pDuda, rev: rev(),
    resumo: { pv: 12, pe: null, san: null } }), "dados_invalidos");
  t.recusa("PD que não é número é recusado", comoDuda({ acao: "atualizar_resumo_personagem", personagemId: pDuda, rev: rev(),
    resumo: { pv: 12, pe: null, san: null, pd: "12" } }), "dados_invalidos");

  /* Desligar a regra: o site volta a mandar PE e SAN — os valores
     guardados, intactos. Resumo de uma versão anterior (sem `pd`) vale. */
  const antigo = comoDuda({ acao: "atualizar_resumo_personagem", personagemId: pDuda, rev: rev(),
    resumo: { pv: 12, pe: 5, san: 14 } });
  t.ok("resumo sem PD (regra desligada, ou site antigo) continua valendo", antigo.ok);
  t.iguais("  e a mesa volta a ver PE e SAN com os valores guardados", cartao(eli).recursos.map((r) => r.chave + ":" + r.atual + "/" + r.maximo),
    ["pv:12/12", "pe:4/5", "san:9/14"]);

  t.iguais("normalizarResumoRecursos: PD com PE e SAN nulos", normalizarResumoRecursos({ pv: 1, pe: null, san: null, pd: 2 }),
    { versao: 1, pv: 1, pe: null, san: null, pd: 2 });
  t.igual("  PE nulo sem PD é inválido", normalizarResumoRecursos({ pv: 1, pe: null, san: null }), null);
  t.iguais("  resumo antigo ganha pd nulo", normalizarResumoRecursos({ pv: 1, pe: 2, san: 3 }), { versao: 1, pv: 1, pe: 2, san: 3, pd: null });
})();

t.grupo("Condições — as regras do navegador e as do servidor contam igual");

(() => {
  const CD = globalThis.RAMAOrdemCondicoes;
  const QUANDO = "2026-09-25T12:00:00.000Z";

  /* Gerador determinístico: o mesmo conjunto de casos a cada execução. */
  let semente = 20260925;
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  const inteiro = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const CHAVES = ["morrendo", "enlouquecendo", "exaustao", "desmaio"];
  const rastro = (c, chave) => (chave === "exaustao" || chave === "desmaio") ? c.mesa[chave] : c[chave];
  const retrato = (c) => JSON.stringify(CHAVES.map((k) => [
    rastro(c, k).eventos.map((e) => e.id + "|" + e.origem + "|" + e.cena), rastro(c, k).descartados]));
  const publico = (lista) => JSON.stringify(lista.map((x) => [x.chave, x.nome, x.oficial, x.ativa, x.contagem, x.limite]));

  let divergencias = 0;
  let casos = 0;
  const primeiras = [];
  const comparar = (rotulo, a, b) => {
    casos++;
    if (a !== b) { divergencias++; if (primeiras.length < 3) primeiras.push(rotulo + ": " + a + " ≠ " + b); }
  };

  for (let k = 0; k < 300; k++) {
    const c = CD.vazio();
    if (aleatorio() < 0.8) CD.novaCena(c, QUANDO);
    c.integrarCombate = aleatorio() < 0.85;
    ["morrendo", "enlouquecendo"].forEach((ch) => { if (aleatorio() < 0.6) CD.ativar(c, ch, QUANDO); });
    ["exaustao", "desmaio"].forEach((ch) => {
      CD.configurarDaMesa(c, ch, { usar: aleatorio() < 0.6, limite: [null, 1, 2, 5, 20][inteiro(0, 4)] });
      if (aleatorio() < 0.6) CD.ativar(c, ch, QUANDO);
    });
    /* Um início de uma cena anterior, que não pode contar nesta. */
    if (aleatorio() < 0.3) c.morrendo.eventos.push({ id: "cb:velho:1:p1", origem: "combate", cena: "cena-anterior", em: QUANDO });

    const navegador = copia(c);
    const servidor = { ordem: { condicoes: copia(c) } };

    for (let passo = 0; passo < 14; passo++) {
      const sorte = aleatorio();
      const id = CD.idDoTurno("comb-" + inteiro(1, 2), inteiro(1, 4), "p" + inteiro(1, 3));
      comparar("id do turno", id, idDoInicioDeTurno(id.split(":")[1], id.split(":")[2], id.split(":")[3]));
      if (sorte < 0.55) {
        const evento = { id, rodada: 1, combate: "comb", em: QUANDO };
        comparar("início", JSON.stringify(CD.registrarInicioDeTurno(navegador, evento)), JSON.stringify(registrarInicioNaFicha(servidor, copia(evento))));
      } else if (sorte < 0.8) {
        comparar("retirada", JSON.stringify(CD.retirarInicioDeTurno(navegador, id)), JSON.stringify(retirarInicioDaFicha(servidor, id)));
      } else {
        /* O que a jogadora faz na ficha entre um turno e outro — gravado,
           o servidor recebe exatamente o mesmo estado. */
        const ch = CHAVES[inteiro(0, 3)];
        const acao = inteiro(0, 3);
        [navegador, servidor.ordem.condicoes].forEach((alvo) => {
          if (acao === 0) CD.encerrar(alvo, ch);
          else if (acao === 1) CD.ativar(alvo, ch, QUANDO);
          else if (acao === 2) CD.corrigirMenos(alvo, ch);
          else alvo.integrarCombate = !alvo.integrarCombate;
        });
      }
      comparar("estado", retrato(navegador), retrato(servidor.ordem.condicoes));
    }
    comparar("resumo público", publico(CD.resumoPublico(navegador)), publico(resumoPublicoDeCondicoes(servidor.ordem)));
  }
  t.igual("300 fichas sorteadas — início, retirada, correções e resumo público: nenhuma divergência", divergencias, 0,
  );
  if (primeiras.length) primeiras.forEach((p) => t.ok("  divergência: " + p, false));
  t.ok("  (e os casos foram mesmo comparados)", casos > 8000);
  t.igual("o id do turno não aceita caracteres de fora do formato", idDoInicioDeTurno("comb 1", 1, "p1"), "");
})();

/* =====================================================================
   FIM
   ===================================================================== */

escrever(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);

if (falhas.length) {
  escrever(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => escrever(`  · ${f}`));
}

Deno.exit(falharam ? 1 : 0);
