/* =====================================================================
   R.A.M.A. — Apps Script simulado
   ---------------------------------------------------------------------
   O suficiente da plataforma do Google para o backend rodar fora dela:
   planilha em memória, propriedades, cache, trava e as funções de
   criptografia.

   Existe por um motivo específico. As regras de permissão do R.A.M.A.
   são a parte do sistema em que um erro não aparece — nada quebra na
   tela quando um jogador consegue ler o que não devia. Testar isso
   dependendo de uma planilha real seria lento, destrutivo e impossível
   de repetir; aqui cada teste começa com um banco limpo.

   A criptografia é a de verdade (node:crypto, síncrona como a do Apps
   Script). O que muda nos testes é só o número de iterações da senha,
   que fica baixo para o conjunto rodar em segundos.
   ===================================================================== */

import { createHash, createHmac, randomUUID } from "node:crypto";

/* =====================================================================
   PLANILHA
   ===================================================================== */

class Folha {
  constructor(nome) {
    this.nome = nome;
    this.linhas = [];
    this.congeladas = 0;
  }

  getName() { return this.nome; }
  getLastRow() { return this.linhas.length; }
  getLastColumn() {
    return this.linhas.reduce((max, l) => Math.max(max, l.length), 0);
  }
  setFrozenRows(n) { this.congeladas = n; return this; }
  getFrozenRows() { return this.congeladas; }

  appendRow(valores) {
    this.linhas.push(valores.slice());
    return this;
  }

  deleteRow(numero) {
    this.linhas.splice(numero - 1, 1);
    return this;
  }

  getRange(linha, coluna, quantasLinhas, quantasColunas) {
    const folha = this;
    const nl = quantasLinhas === undefined ? 1 : quantasLinhas;
    const nc = quantasColunas === undefined ? 1 : quantasColunas;

    return {
      getValues() {
        const saida = [];
        for (let i = 0; i < nl; i++) {
          const origem = folha.linhas[linha - 1 + i] || [];
          const alvo = [];
          for (let j = 0; j < nc; j++) {
            const v = origem[coluna - 1 + j];
            alvo.push(v === undefined ? "" : v);
          }
          saida.push(alvo);
        }
        return saida;
      },
      setValues(valores) {
        for (let i = 0; i < valores.length; i++) {
          const alvo = folha.linhas[linha - 1 + i] || (folha.linhas[linha - 1 + i] = []);
          for (let j = 0; j < valores[i].length; j++) {
            alvo[coluna - 1 + j] = valores[i][j];
          }
        }
        return this;
      },
      setFontWeight() { return this; },
    };
  }
}

class Planilha {
  constructor(nome) {
    this.nome = nome;
    this.folhas = [];
  }
  getName() { return this.nome; }
  getSheets() { return this.folhas.slice(); }
  getSheetByName(nome) { return this.folhas.find((f) => f.nome === nome) || null; }
  insertSheet(nome) {
    const f = new Folha(nome);
    this.folhas.push(f);
    return f;
  }
  deleteSheet(folha) {
    this.folhas = this.folhas.filter((f) => f !== folha);
  }
}

/* =====================================================================
   A PLATAFORMA
   ===================================================================== */

export function instalarAmbiente(global) {
  const planilha = new Planilha("R.A.M.A. (teste)");
  const propriedades = new Map();
  const cache = new Map();

  global.SpreadsheetApp = {
    openById: () => planilha,
    getActiveSpreadsheet: () => planilha,
  };

  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (propriedades.has(k) ? propriedades.get(k) : null),
      setProperty: (k, v) => { propriedades.set(k, String(v)); },
      deleteProperty: (k) => { propriedades.delete(k); },
    }),
  };

  global.CacheService = {
    getScriptCache: () => ({
      get: (k) => (cache.has(k) ? cache.get(k) : null),
      put: (k, v) => { cache.set(k, String(v)); },
      remove: (k) => { cache.delete(k); },
    }),
  };

  /* A trava sempre é obtida: o simulador roda uma execução por vez, e
     testar contenção real exigiria concorrência que não existe aqui.
     O que os testes conferem é que o código PASSA pela trava. */
  let travasPedidas = 0;
  global.LockService = {
    getScriptLock: () => ({
      tryLock: () => { travasPedidas++; return true; },
      releaseLock: () => {},
    }),
  };

  const bytesDe = (v) => (typeof v === "string" ? Buffer.from(v, "utf8") : Buffer.from(v));

  global.Utilities = {
    DigestAlgorithm: { SHA_256: "sha256" },
    Charset: { UTF_8: "utf8" },

    computeDigest(algoritmo, valor) {
      const h = createHash("sha256").update(bytesDe(valor)).digest();
      /* O Apps Script devolve bytes COM SINAL (-128..127). O backend
         conta com isso ao montar o hexadecimal, então o simulador
         precisa mentir do mesmo jeito. */
      return Array.from(h).map((b) => (b > 127 ? b - 256 : b));
    },

    computeHmacSha256Signature(valor, chave) {
      const h = createHmac("sha256", bytesDe(chave)).update(bytesDe(valor)).digest();
      return Array.from(h).map((b) => (b > 127 ? b - 256 : b));
    },

    newBlob(texto) {
      return { getBytes: () => Array.from(Buffer.from(String(texto), "utf8")).map((b) => (b > 127 ? b - 256 : b)) };
    },

    getUuid: () => randomUUID(),
  };

  global.ContentService = {
    MimeType: { JSON: "application/json" },
    createTextOutput(texto) {
      return { _texto: texto, setMimeType() { return this; }, getContent() { return this._texto; } };
    },
  };

  /* O backend registra em console.error/warn quando algo estoura. Nos
     testes isso é ruído, mas o silêncio total esconderia um erro real —
     então fica guardado para quem quiser conferir. */
  const registros = [];
  global.console = Object.assign(Object.create(console), {
    log: () => {},
    info: () => {},
    warn: (...a) => registros.push(["warn", a.join(" ")]),
    error: (...a) => registros.push(["error", a.join(" ")]),
  });

  return {
    planilha,
    propriedades,
    cache,
    registros,
    travasPedidas: () => travasPedidas,

    limpar() {
      planilha.folhas = [];
      cache.clear();
      registros.length = 0;
    },
  };
}

/* Chama o backend como se fosse uma requisição de verdade: JSON entra
   por doPost, JSON sai. Testar as funções por dentro pularia justamente
   o roteamento e a validação de sessão, que é onde a segurança mora. */
export function chamar(global, corpo) {
  const resposta = global.doPost({ postData: { contents: JSON.stringify(corpo) } });
  return JSON.parse(resposta.getContent());
}
