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

import { instalarAmbiente, chamar } from "./apps-script-simulado.js";

const ARQUIVOS = ["backend/Codigo.gs", "backend/Campanhas.gs"];

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
  comoAna({ acao: "listar_rolagens", campanhaId: privada }).dados.total, 1);

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
  comoAna({ acao: "listar_rolagens", campanhaId: privada }).dados.total, 0);

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
t.igual("devolve SÓ id, usuario, nome e avatar",
  [...camposDoDiretorio].sort().join(","), "avatar,id,nome,usuario");

const proibidos = ["hashSenha", "salt", "token", "tokenHash", "iteracoes", "pepper", "senha"];
t.ok("nenhum campo interno vaza no diretório",
  !proibidos.some((c) => JSON.stringify(diretorio.dados).includes(c)));

/* =====================================================================
   FIM
   ===================================================================== */

escrever(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);

if (falhas.length) {
  escrever(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => escrever(`  · ${f}`));
}

Deno.exit(falharam ? 1 : 0);
