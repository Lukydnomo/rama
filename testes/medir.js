/* =====================================================================
   R.A.M.A. — medição de custo
   ---------------------------------------------------------------------
       deno run --allow-read testes/medir.js

   Monta uma mesa de tamanho realista — 20 contas, fichas com foto, três
   campanhas, histórico de rolagens — e conta o que cada operação custa
   ao Google Sheets.

   ---------------------------------------------------------------------
   O QUE ESTE ARQUIVO PODE E O QUE NÃO PODE DIZER
   ---------------------------------------------------------------------

   PODE dizer: quantas chamadas ao serviço do Sheets uma operação faz,
   quantas células ela atravessa e quantos bytes a resposta tem. Esses
   três números são propriedades do código, não do ambiente, e comparar
   duas versões por eles é legítimo.

   NÃO PODE dizer: quanto tempo a operação leva no Google, quantas
   pessoas o sistema aguenta, nem que porcentagem de melhoria alguém vai
   sentir. A planilha aqui é um array em memória. Latência de rede,
   fila do LockService e cota de execução simultânea NÃO existem neste
   arquivo, e nenhum número daqui deve ser apresentado como se
   existissem.

   Para medir tempo de verdade existe o procedimento em
   docs/PERFORMANCE.md, que roda contra uma implantação real.
   ===================================================================== */

import { instalarAmbiente, chamarMedindo } from "./apps-script-simulado.js";

const ARQUIVOS = ["backend/Dados.gs", "backend/Codigo.gs", "backend/Campanhas.gs"];

const escrever = console.log.bind(console);
const ambiente = instalarAmbiente(globalThis);

for (const caminho of ARQUIVOS) {
  let codigo;
  try {
    codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  } catch (e) {
    /* Dados.gs só existe a partir desta atualização. Medir a versão
       anterior continua possível: o arquivo simplesmente não está lá. */
    escrever(`  (sem ${caminho})`);
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

function fichaDeTeste(nome) {
  return {
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

  /* Três campanhas: a primeira grande, com quase todo mundo. */
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
    membros: contas.slice(8, 14).map((c) => ({ userId: c.id, papel: "jogador" })),
  });

  contas.forEach((c, indice) => {
    for (let k = 0; k < FICHAS_POR_CONTA; k++) {
      const r = como(c)({ acao: "criar_personagem", dados: fichaDeTeste(c.login + " #" + k) });
      c.personagens.push(r.dados.id);
      como(c)({ acao: "salvar_foto", personagemId: r.dados.id, imagem: FOTO });
    }
  });

  /* A primeira ficha de cada jogador entra na Mesa 0. */
  contas.slice(0, 8).forEach((c) => {
    como(c)({ acao: "vincular_personagem", campanhaId: campanhas[0], personagemId: c.personagens[0] });
  });

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

  return { contas, campanhas, mestre, como };
}

/* =====================================================================
   O MEDIDOR
   ===================================================================== */

const resultados = [];

function medir(rotulo, conta, corpo) {
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
  (CONTAS * FICHAS_POR_CONTA) + " fichas com foto, 3 campanhas, " +
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
medir("ler_personagem (abrir ficha)", jogador, { acao: "ler_personagem", personagemId: jogador.personagens[0] });
medir("ler_foto (abrir ficha)", jogador, { acao: "ler_foto", personagemId: jogador.personagens[0] });
medir("listar_campanhas", jogador, { acao: "listar_campanhas" });
medir("listar_homebrew (biblioteca)", jogador, { acao: "listar_homebrew", escopo: "meus" });

/* --------- a mesa --------- */

medir("ler_campanha (mestre)", mestre, { acao: "ler_campanha", campanhaId: mesa.campanhas[0] });
medir("listar_personagens_campanha (painel do mestre)", mestre,
  { acao: "listar_personagens_campanha", campanhaId: mesa.campanhas[0] });
medir("listar_rolagens — 1ª página de 1500", mestre,
  { acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25, pulo: 0 });
medir("listar_rolagens — página 10", mestre,
  { acao: "listar_rolagens", campanhaId: mesa.campanhas[0], limite: 25, pulo: 225 });
medir("listar_usuarios (editor de participantes)", mestre, { acao: "listar_usuarios" });
medir("listar_documentos", mestre, { acao: "listar_documentos", campanhaId: mesa.campanhas[0] });
medir("listar_combates", mestre, { acao: "listar_combates", campanhaId: mesa.campanhas[0] });

/* --------- gravações --------- */

const fichaViva = chamarMedindo(globalThis, {
  token: jogador.token, acao: "ler_personagem", personagemId: jogador.personagens[0],
}).dados;

medir("salvar_personagem (uma tecla na ficha)", jogador, {
  acao: "salvar_personagem", personagemId: jogador.personagens[0],
  rev: fichaViva.rev, dados: fichaViva.dados,
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

/* --------- o lote, se esta versão tiver --------- */

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

/* Saída legível por máquina, para comparar duas versões sem olho no
   olho. Guardada em arquivo só quando pedida. */
if (Deno.args.includes("--json")) {
  const destino = Deno.args[Deno.args.indexOf("--json") + 1] || "medicao.json";
  await Deno.writeTextFile(destino, JSON.stringify(resultados, null, 2));
  escrever("Gravado em " + destino + "\n");
}
