/* =====================================================================
   R.A.M.A. — medição de custo
   ---------------------------------------------------------------------
       deno run --allow-read testes/medir.js
       deno run --allow-read --allow-write testes/medir.js --json depois.json
       deno run --allow-read testes/medir.js --comparar antes.json
       deno run --allow-read testes/medir.js --backend caminho/da/versao/antiga

   Monta uma mesa de tamanho realista — 20 contas, fichas com foto,
   campanhas de tamanhos diferentes, histórico de rolagens — e conta o
   que cada operação custa ao Google Sheets.

   ---------------------------------------------------------------------
   O QUE ESTE ARQUIVO PODE E O QUE NÃO PODE DIZER
   ---------------------------------------------------------------------

   PODE dizer: quantas chamadas ao serviço do Sheets uma operação faz,
   quantas células ela atravessa, quantas fichas ela remonta e quantos
   bytes a resposta tem. Esses números são propriedades do código, não
   do ambiente, e comparar duas versões por eles é legítimo.

   NÃO PODE dizer: quanto tempo a operação leva no Google, quantas
   pessoas o sistema aguenta, nem que porcentagem de melhoria alguém vai
   sentir. A planilha aqui é um array em memória. Latência de rede,
   fila do LockService e cota de execução simultânea NÃO existem neste
   arquivo, e nenhum número daqui deve ser apresentado como se
   existissem.

   Para medir TEMPO de verdade existem duas coisas, as duas contra uma
   implantação real: o procedimento em docs/PERFORMANCE.md e o
   diagnóstico do próprio backend (ligarDiagnostico(), que registra uma
   linha "R.A.M.A. perf" por requisição).

   ---------------------------------------------------------------------
   CENÁRIOS
   ---------------------------------------------------------------------
   Cache vazio e aquecido, ficha pequena e grande, mesa de dois e de
   oito personagens, histórico com 1.500 rolagens. O mesmo conjunto de
   dados para as duas versões comparadas: `--backend` carrega os .gs de
   outra pasta e mede a mesma mesa.
   ===================================================================== */

import { instalarAmbiente, chamarMedindo } from "./apps-script-simulado.js";

const escrever = console.log.bind(console);

function argumento(nome, padrao) {
  const i = Deno.args.indexOf(nome);
  return i >= 0 && Deno.args[i + 1] ? Deno.args[i + 1] : padrao;
}

const PASTA = argumento("--backend", "backend");
const ARQUIVOS = ["Dados.gs", "Codigo.gs", "Campanhas.gs"];

const ambiente = instalarAmbiente(globalThis);

for (const arquivo of ARQUIVOS) {
  let codigo;
  try {
    codigo = await Deno.readTextFile(new URL("../" + PASTA + "/" + arquivo, import.meta.url));
  } catch (e) {
    escrever(`  (sem ${PASTA}/${arquivo})`);
    continue;
  }
  (0, eval)(codigo);
}

ambiente.propriedades.set("RAMA_ITERACOES", "50");

/* =====================================================================
   A MESA
   ---------------------------------------------------------------------
   Vinte contas, porque é o número que o pedido cita. As fichas levam
   foto e conteúdo de verdade: medir com fichas vazias esconderia
   exatamente o custo que se quer enxergar.
   ===================================================================== */

const CONTAS = 20;
const FICHAS_POR_CONTA = 3;
const ROLAGENS = 1500;

/* Uma foto de 256×256 em JPEG dá algo entre 8 e 20 KB depois do base64.
   15 KB é o meio do caminho. */
const FOTO = "data:image/jpeg;base64," + "R".repeat(15000);
const AVATAR = "data:image/jpeg;base64," + "A".repeat(6000);

function fichaDeTeste(nome, extra) {
  const ficha = {
    nome,
    classe: "Combatente",
    origem: "Militar",
    schemaVersion: 2,
    atributos: ["FOR", "AGI", "INT", "PRE", "VIG"].map((sigla, i) => ({
      id: "a" + i, nome: sigla, sigla, valor: 1 + (i % 3), dado: "d20",
    })),
    status: [
      { id: "s1", nome: "Vida", atual: 20, maximo: 30 },
      { id: "s2", nome: "Esforço", atual: 5, maximo: 8 },
      { id: "s3", nome: "Sanidade", atual: 12, maximo: 12 },
    ],
    /* Perícias, inventário e anotações são o volume real de uma ficha
       em uso. Sem eles a medição só provaria que uma ficha vazia é
       barata. */
    pericias: Array.from({ length: 30 }, (_, i) => ({
      id: "p" + i, nome: "Perícia " + i, bonus: i % 5, atributoId: "a" + (i % 5), dadosExtras: [],
    })),
    inventario: {
      limite: 20,
      itens: Array.from({ length: 25 }, (_, i) => ({
        id: "i" + i, tipo: "item", nome: "Item " + i, categoria: "Geral",
        peso: 1, descricao: "Descrição razoavelmente comprida do item número " + i + ".",
      })),
    },
    anotacoes: {
      pastas: [{ id: "f1", nome: "Diário", notas: [
        { id: "n1", titulo: "Sessão 1", conteudo: "x".repeat(1200) },
      ] }],
      soltas: [],
    },
    habilidades: [],
    rituais: { nomeSecao: "Rituais", rotulos: {}, lista: [] },
  };

  /* A ficha grande: anotações de verdade, das que passaram a caber
     depois da v2.15 e que agora moram em vários blocos. */
  if (extra) {
    ficha.anotacoes.pastas[0].notas = Array.from({ length: extra }, (_, i) => ({
      id: "n" + i, titulo: "Sessão " + i, conteudo: "Registro de campo. ".repeat(1000),
    }));
  }

  return ficha;
}

function montarMesa() {
  ambiente.limpar();
  setupRama();
  gerarPepper();

  const contas = [];

  for (let i = 0; i < CONTAS; i++) {
    const login = "agente" + String(i).padStart(2, "0");
    criarUsuario(login, "Agente " + i, "senha-de-teste");
    const r = chamarMedindo(globalThis, { acao: "login", usuario: login, senha: "senha-de-teste" }).dados;
    contas.push({ login, token: r.token, id: r.agente.id, personagens: [] });
  }

  const como = (c) => (corpo) => chamarMedindo(globalThis, Object.assign({ token: c.token }, corpo)).dados;

  /* Avatar em metade das contas: a lista de participantes e o editor de
     membros carregam avatar, e sem nenhum o custo some da medição. */
  contas.forEach((c, i) => { if (i % 2 === 0) como(c)({ acao: "salvar_perfil", dados: { avatar: AVATAR } }); });

  /* Três campanhas: a primeira grande, com quase todo mundo; a segunda
     pequena, de duas pessoas. */
  const mestre = contas[0];
  const campanhas = [];
  for (let i = 0; i < 3; i++) {
    const r = como(mestre)({ acao: "criar_campanha", dados: { nome: "Mesa " + i } });
    campanhas.push(r.dados.id);
  }

  como(mestre)({
    acao: "salvar_participantes",
    campanhaId: campanhas[0],
    membros: contas.slice(1, 8).map((c) => ({ userId: c.id, papel: "jogador" })),
  });
  como(mestre)({
    acao: "salvar_participantes",
    campanhaId: campanhas[1],
    membros: contas.slice(8, 10).map((c) => ({ userId: c.id, papel: "jogador" })),
  });

  contas.forEach((c) => {
    for (let k = 0; k < FICHAS_POR_CONTA; k++) {
      const r = como(c)({ acao: "criar_personagem", dados: fichaDeTeste(c.login + " #" + k) });
      c.personagens.push(r.dados.id);
      como(c)({ acao: "salvar_foto", personagemId: r.dados.id, imagem: FOTO });
    }
  });

  /* A primeira ficha de cada jogador entra na Mesa 0; a Mesa 1 fica com
     duas fichas. */
  contas.slice(0, 8).forEach((c) => {
    como(c)({ acao: "vincular_personagem", campanhaId: campanhas[0], personagemId: c.personagens[0] });
  });
  contas.slice(8, 10).forEach((c) => {
    como(c)({ acao: "vincular_personagem", campanhaId: campanhas[1], personagemId: c.personagens[0] });
  });

  /* Uma ficha grande de verdade: ~300 KB, vários blocos. */
  const dono = contas[3];
  const grande = como(dono)({ acao: "criar_personagem", dados: fichaDeTeste("Ficha grande", 15) });
  const fichaGrande = grande.dados.id;
  como(dono)({ acao: "salvar_foto", personagemId: fichaGrande, imagem: FOTO });

  /* Histórico de verdade: uma campanha que já jogou algumas sessões. */
  for (let i = 0; i < ROLAGENS; i++) {
    const autor = contas[i % 8];
    como(autor)({
      acao: "registrar_rolagem",
      campanhaId: campanhas[0],
      rolagemId: "rolagem-" + String(i).padStart(6, "0"),
      personagemId: autor.personagens[0],
      tipo: "pericia",
      nome: "Percepção",
      dados: { formula: "1d20+3", total: 14, dados: [11], modificador: 3 },
    });
  }

  /* Homebrew: cada conta com alguns registros. */
  contas.forEach((c) => {
    for (let k = 0; k < 4; k++) {
      como(c)({ acao: "salvar_homebrew", dados: { tipo: "item", nome: "Coisa " + k, peso: 1, descricao: "y".repeat(300) } });
    }
  });

  return { contas, campanhas, mestre, como, fichaGrande };
}

/* =====================================================================
   O MEDIDOR
   ===================================================================== */

const resultados = [];

function medir(rotulo, conta, corpo, opcoes) {
  const o = opcoes || {};
  /* Cache vazio: o Google descarta entradas quando quer, e a primeira
     pessoa a abrir a tela depois disso paga o caminho inteiro. */
  if (o.cacheVazio) ambiente.cache.clear();

  ambiente.contador.zerar();
  const r = chamarMedindo(globalThis, Object.assign({ token: conta.token }, corpo));
  const c = ambiente.contador.instantaneo();

  resultados.push({
    rotulo,
    chamadas: c.chamadasSheets,
    celulas: c.celulasLidas + c.celulasEscritas,
    planilhaBytes: c.bytesLidos + c.bytesEscritos,
    bytes: r.bytes,
    ok: r.dados && r.dados.ok !== false,
  });

  return r.dados;
}

escrever("\nMontando a mesa: " + CONTAS + " contas, " +
  (CONTAS * FICHAS_POR_CONTA + 1) + " fichas com foto, 3 campanhas, " +
  ROLAGENS + " rolagens…");

const mesa = montarMesa();
const mestre = mesa.mestre;
const jogador = mesa.contas[3];
const forasteiro = mesa.contas[19];

escrever("Medindo…\n");

/* --------- as telas que a pessoa abre --------- */

medir("sessao (toda página abre com uma)", jogador, { acao: "sessao" });
medir("resumo (tela inicial)", jogador, { acao: "resumo" });
medir("listar_personagens (meus personagens)", jogador, { acao: "listar_personagens" });
medir("ler_personagem (ficha pequena)", jogador, { acao: "ler_personagem", personagemId: jogador.personagens[0] });
medir("ler_personagem (ficha de 300 KB)", jogador, { acao: "ler_personagem", personagemId: mesa.fichaGrande });
medir("ler_foto (abrir ficha)", jogador, { acao: "ler_foto", personagemId: jogador.personagens[0] });
medir("listar_campanhas", jogador, { acao: "listar_campanhas" });
medir("listar_homebrew (biblioteca)", jogador, { acao: "listar_homebrew", escopo: "meus" });

/* --------- a mesa --------- */

medir("ler_campanha (mestre)", mestre, { acao: "ler_campanha", campanhaId: mesa.campanhas[0] });
medir("listar_personagens_campanha — 8 fichas", mestre,
  { acao: "listar_personagens_campanha", campanhaId: mesa.campanhas[0] });
medir("listar_personagens_campanha — 8 fichas, cache vazio", mestre,
  { acao: "listar_personagens_campanha", campanhaId: mesa.campanhas[0] }, { cacheVazio: true });
medir("listar_personagens_campanha — 2 fichas", mestre,
  { acao: "listar_personagens_campanha", campanhaId: mesa.campanhas[1] });
medir("sincronizar_campanha (nada mudou)", mestre,
  { acao: "sincronizar_campanha", campanhaId: mesa.campanhas[0] });
medir("sincronizar_campanha (cache vazio)", mestre,
  { acao: "sincronizar_campanha", campanhaId: mesa.campanhas[0] }, { cacheVazio: true });
medir("listar_rolagens — 1ª página de 1500", mestre,
  { acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25 });
/* A décima página do jeito que CADA versão pagina: a v2.15 por posição
   ("pule 225"), a v2.16 por cursor. É a mesma ação de quem usa — rolar
   o histórico até a décima página —, medida como ela realmente
   acontece. */
function decimaPagina() {
  const primeira = chamarMedindo(globalThis, {
    token: mestre.token, acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25,
  }).dados;

  if (!primeira.dados || !primeira.dados.proximo) {
    return { acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25, pulo: 225 };
  }

  let cursor = primeira.dados.proximo;
  for (let i = 0; i < 8; i++) {
    const r = chamarMedindo(globalThis, {
      token: mestre.token, acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25, cursor,
    }).dados;
    if (!r.dados || !r.dados.proximo) break;
    cursor = r.dados.proximo;
  }
  return { acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25, cursor };
}

medir("listar_rolagens — página 10", mestre, decimaPagina());
medir("listar_usuarios (editor de participantes)", mestre, { acao: "listar_usuarios" });
medir("listar_documentos", mestre, { acao: "listar_documentos", campanhaId: mesa.campanhas[0] });
medir("listar_combates", mestre, { acao: "listar_combates", campanhaId: mesa.campanhas[0] });

/* --------- gravações --------- */

/* Duas gravações antes de medir: a terceira é a que mostra o custo de
   quem está JOGANDO — a ficha que já tem faixa de blocos para
   reaproveitar. A primeira de todas é sempre mais cara. */
function aquecerGravacao(conta, personagemId, quantas) {
  for (let i = 0; i < quantas; i++) {
    const lida = chamarMedindo(globalThis, { token: conta.token, acao: "ler_personagem", personagemId }).dados;
    chamarMedindo(globalThis, {
      token: conta.token, acao: "salvar_personagem", personagemId,
      rev: lida.rev, dados: lida.dados,
    });
  }
}

aquecerGravacao(jogador, jogador.personagens[0], 2);

const fichaViva = chamarMedindo(globalThis, {
  token: jogador.token, acao: "ler_personagem", personagemId: jogador.personagens[0],
}).dados;

medir("salvar_personagem (ficha pequena)", jogador, {
  acao: "salvar_personagem", personagemId: jogador.personagens[0],
  rev: fichaViva.rev, dados: fichaViva.dados,
});

aquecerGravacao(jogador, mesa.fichaGrande, 2);

const grandeViva = chamarMedindo(globalThis, {
  token: jogador.token, acao: "ler_personagem", personagemId: mesa.fichaGrande,
}).dados;

medir("salvar_personagem (ficha de 300 KB)", jogador, {
  acao: "salvar_personagem", personagemId: mesa.fichaGrande,
  rev: grandeViva.rev, dados: grandeViva.dados,
});

medir("ajustar_personagem (botão − do mestre)", mestre, {
  acao: "ajustar_personagem", personagemId: mesa.contas[3].personagens[0],
  alvo: "status", itemId: "s1", campo: "atual", valor: 18,
});

medir("registrar_rolagem (com 1500 no histórico)", jogador, {
  acao: "registrar_rolagem", campanhaId: mesa.campanhas[0],
  rolagemId: "rolagem-medida-000001", personagemId: jogador.personagens[0],
  tipo: "ataque", nome: "Faca", dados: { formula: "1d20", total: 9, dados: [9] },
});

medir("salvar_foto", jogador, {
  acao: "salvar_foto", personagemId: jogador.personagens[0], imagem: FOTO,
});

/* --------- as imagens sob demanda, se esta versão tiver --------- */

const temFotos = typeof rotaDe === "function" && !!rotaDe("ler_fotos");

if (temFotos) {
  const daMesa = chamarMedindo(globalThis, {
    token: mestre.token, acao: "listar_personagens_campanha", campanhaId: mesa.campanhas[0],
  }).dados.dados.map((p) => p.id);

  medir("ler_fotos (8 cartões da mesa)", mestre, { acao: "ler_fotos", personagemIds: daMesa });
  medir("ler_avatares (8 participantes)", mestre, {
    acao: "ler_avatares", userIds: mesa.contas.slice(0, 8).map((c) => c.id),
  });
}

/* --------- o lote --------- */

const temLote = typeof rotaDe === "function" && !!rotaDe("lote");

if (temLote) {
  medir("LOTE: abrir ficha (sessao+ficha+foto+campanhas)", jogador, {
    acao: "lote",
    pedidos: [
      { acao: "sessao" },
      { acao: "ler_personagem", personagemId: jogador.personagens[0] },
      { acao: "ler_foto", personagemId: jogador.personagens[0] },
      { acao: "listar_campanhas" },
    ],
  });

  medir("LOTE: abrir campanha (sessao+campanha+mesa)", mestre, {
    acao: "lote",
    pedidos: [
      { acao: "sessao" },
      { acao: "ler_campanha", campanhaId: mesa.campanhas[0] },
      { acao: "listar_personagens_campanha", campanhaId: mesa.campanhas[0] },
    ],
  });
}

/* --------- forasteiro: o custo de dizer não --------- */

medir("recusa a ficha alheia", forasteiro, {
  acao: "ler_personagem", personagemId: jogador.personagens[0],
});

/* =====================================================================
   RELATÓRIO
   ===================================================================== */

function alinhar(texto, largura) {
  const t = String(texto);
  return t.length >= largura ? t : t + " ".repeat(largura - t.length);
}
function direita(texto, largura) {
  const t = String(texto);
  return t.length >= largura ? t : " ".repeat(largura - t.length) + t;
}
function kb(bytes) {
  if (bytes < 1024) return bytes + " B";
  return (bytes / 1024).toFixed(1) + " KB";
}

escrever(alinhar("operação", 46) + direita("chamadas", 9) + direita("da planilha", 13) + direita("resposta", 11));
escrever("-".repeat(79));

resultados.forEach((r) => {
  escrever(
    alinhar(r.rotulo, 46) +
    direita(r.chamadas, 9) +
    direita(kb(r.planilhaBytes), 13) +
    direita(kb(r.bytes), 11) +
    (r.ok ? "" : "   (recusada)")
  );
});

const total = resultados.reduce((s, r) => s + r.chamadas, 0);
const daPlanilha = resultados.reduce((s, r) => s + r.planilhaBytes, 0);

escrever("-".repeat(79));
escrever(alinhar("TOTAL", 46) + direita(total, 9) + direita(kb(daPlanilha), 13));

escrever("");
escrever("chamadas   = viagens ao serviço do Sheets");
escrever("da planilha = dados que atravessaram entre o Sheets e o script");
escrever("resposta   = o que o navegador baixou");
escrever("Isto NAO mede tempo nem capacidade. Ver docs/PERFORMANCE.md.");
escrever("");

/* =====================================================================
   COMPARAÇÃO
   ---------------------------------------------------------------------
   `--comparar arquivo.json` põe lado a lado a medição de agora e a de
   antes, casadas pelo rótulo. Rótulo que só existe de um lado aparece
   como novo ou como ausente — mudar o nome de um cenário não pode
   parecer melhoria.
   ===================================================================== */

if (Deno.args.includes("--comparar")) {
  const caminho = argumento("--comparar", "");
  const antes = JSON.parse(await Deno.readTextFile(caminho));
  const porRotulo = {};
  antes.forEach((r) => { porRotulo[r.rotulo] = r; });

  escrever("ANTES → DEPOIS  (" + caminho + ")");
  escrever(alinhar("operação", 46) + direita("chamadas", 14) + direita("da planilha", 20) + direita("resposta", 20));
  escrever("-".repeat(100));

  resultados.forEach((r) => {
    const a = porRotulo[r.rotulo];
    if (!a) {
      escrever(alinhar(r.rotulo, 46) + direita("(novo) " + r.chamadas, 14) +
        direita(kb(r.planilhaBytes), 20) + direita(kb(r.bytes), 20));
      return;
    }
    escrever(
      alinhar(r.rotulo, 46) +
      direita(a.chamadas + " → " + r.chamadas, 14) +
      direita(kb(a.planilhaBytes) + " → " + kb(r.planilhaBytes), 20) +
      direita(kb(a.bytes) + " → " + kb(r.bytes), 20)
    );
  });

  const ausentes = antes.filter((a) => !resultados.some((r) => r.rotulo === a.rotulo));
  ausentes.forEach((a) => escrever(alinhar(a.rotulo, 46) + direita("(não medido agora)", 54)));
  escrever("");
}

/* Saída legível por máquina, para comparar duas versões sem olho no
   olho. Guardada em arquivo só quando pedida. */
if (Deno.args.includes("--json")) {
  const destino = argumento("--json", "medicao.json");
  await Deno.writeTextFile(destino, JSON.stringify(resultados, null, 2));
  escrever("Gravado em " + destino + "\n");
}
