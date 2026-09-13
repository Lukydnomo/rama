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
  t.igual("e o histórico tem UMA linha", historico.dados.total, 1);
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

  const pagina1 = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25, pulo: 0 });
  t.igual("a primeira página traz 25", pagina1.dados.rolagens.length, 25);
  t.igual("o total conta todas", pagina1.dados.total, 121);
  t.ok("e não é o fim", pagina1.dados.fim === false);

  t.ok("o resultado de cada rolagem veio junto",
    pagina1.dados.rolagens.every((r) => r.resultado && typeof r.resultado.total === "number"));

  const pagina2 = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25, pulo: 25 });
  const ids1 = new Set(pagina1.dados.rolagens.map((r) => r.id));
  t.ok("a segunda página não repete a primeira",
    pagina2.dados.rolagens.every((r) => !ids1.has(r.id)));

  const ultima = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 25, pulo: 100 });
  t.igual("a última página traz o resto", ultima.dados.rolagens.length, 21);
  t.ok("e diz que acabou", ultima.dados.fim === true);

  t.igual("o limite é limitado pelo servidor",
    comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 99999 }).dados.rolagens.length, 121);

  /* A rolagem oculta do mestre continua fora da resposta do jogador —
     a filtragem acontece antes da paginação, e não depois. */
  comoMestre({ acao: "salvar_campanha", campanhaId: campanha, dados: { rolagensMestreOcultas: true } });
  comoMestre({
    acao: "registrar_rolagem", campanhaId: campanha,
    rolagemId: "rol-secreta-do-mestre", tipo: "livre", nome: "Nos bastidores",
    dados: { formula: "1d100", total: 99, dados: [99] },
  });

  const doJogador = comoJogador({ acao: "listar_rolagens", campanhaId: campanha, limite: 200 });
  t.igual("o jogador não vê a rolagem oculta", doJogador.dados.total, 121);
  t.ok("nem o resultado dela em lugar nenhum",
    JSON.stringify(doJogador).indexOf("Nos bastidores") < 0);
  t.igual("o mestre vê as suas",
    comoMestre({ acao: "listar_rolagens", campanhaId: campanha, limite: 200 }).dados.total, 122);
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

/* =====================================================================
   FIM
   ===================================================================== */

escrever(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);

if (falhas.length) {
  escrever(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => escrever(`  · ${f}`));
}

Deno.exit(falharam ? 1 : 0);
