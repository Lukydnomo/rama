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

   ---------------------------------------------------------------------
   O QUE O CONTADOR MEDE, E O QUE ELE NÃO MEDE
   ---------------------------------------------------------------------

   Cada chamada aos objetos do Sheets é contada, junto com quantas
   células atravessaram. Isso serve para comparar duas versões do MESMO
   código: menos chamadas e menos células é sempre melhor.

   O que estes números NÃO são: tempo. Aqui a planilha é um array em
   memória e responde em microssegundos; no Google cada getValues é uma
   viagem de rede. A relação entre as duas coisas é monótona, não
   proporcional — por isso o relatório fala em chamadas e células, e
   nunca converte isso em segundos ou porcentagem de ganho.
   ===================================================================== */

import { createHash, createHmac, randomUUID } from "node:crypto";

/* =====================================================================
   CONTADOR
   ===================================================================== */

export function novoContador() {
  return {
    getRange: 0,
    getValues: 0,
    setValues: 0,
    celulasLidas: 0,
    celulasEscritas: 0,
    /* O número que realmente pesa. Uma célula com o fichaJson inteiro
       conta como UMA célula e como 45.000 bytes — e é o segundo número
       que atravessa a rede entre o Apps Script e o Sheets. */
    bytesLidos: 0,
    bytesEscritos: 0,
    appendRow: 0,
    deleteRow: 0,
    getLastRow: 0,
    getSheetByName: 0,
    abrirPlanilha: 0,
    cacheGet: 0,
    cachePut: 0,
    propriedadesGet: 0,
    travas: 0,

    /* Soma do que custa uma viagem ao serviço do Sheets. É o número que
       importa comparar: no Apps Script cada uma delas é uma chamada de
       rede com latência própria. */
    get chamadasSheets() {
      return this.getValues + this.setValues + this.appendRow +
             this.deleteRow + this.getLastRow + this.getSheetByName +
             this.abrirPlanilha;
    },

    zerar() {
      Object.keys(this).forEach((k) => {
        if (typeof this[k] === "number" &&
            Object.getOwnPropertyDescriptor(this, k).writable) this[k] = 0;
      });
    },

    instantaneo() {
      const saida = {};
      Object.keys(this).forEach((k) => {
        if (typeof this[k] === "number") saida[k] = this[k];
      });
      saida.chamadasSheets = this.chamadasSheets;
      return saida;
    },
  };
}

/* =====================================================================
   PLANILHA
   ===================================================================== */

class Folha {
  constructor(nome, contador) {
    this.nome = nome;
    this.linhas = [];
    this.congeladas = 0;
    this.c = contador;
  }

  getName() { return this.nome; }
  getLastRow() { this.c.getLastRow++; return this.linhas.length; }
  getLastColumn() {
    return this.linhas.reduce((max, l) => Math.max(max, l.length), 0);
  }
  setFrozenRows(n) { this.congeladas = n; return this; }
  getFrozenRows() { return this.congeladas; }

  appendRow(valores) {
    this.c.appendRow++;
    this.c.celulasEscritas += valores.length;
    valores.forEach((v) => { this.c.bytesEscritos += String(v === undefined ? "" : v).length; });
    this.linhas.push(valores.slice());
    return this;
  }

  deleteRow(numero) {
    this.c.deleteRow++;
    this.linhas.splice(numero - 1, 1);
    return this;
  }

  getRange(linha, coluna, quantasLinhas, quantasColunas) {
    const folha = this;
    const c = this.c;
    const nl = quantasLinhas === undefined ? 1 : quantasLinhas;
    const nc = quantasColunas === undefined ? 1 : quantasColunas;

    c.getRange++;

    return {
      getValues() {
        c.getValues++;
        c.celulasLidas += nl * nc;
        const saida = [];
        for (let i = 0; i < nl; i++) {
          const origem = folha.linhas[linha - 1 + i] || [];
          const alvo = [];
          for (let j = 0; j < nc; j++) {
            const v = origem[coluna - 1 + j];
            c.bytesLidos += v === undefined ? 0 : String(v).length;
            alvo.push(v === undefined ? "" : v);
          }
          saida.push(alvo);
        }
        return saida;
      },
      getValue() {
        return this.getValues()[0][0];
      },
      setValues(valores) {
        c.setValues++;
        c.celulasEscritas += nl * nc;
        valores.forEach((l) => l.forEach((v) => { c.bytesEscritos += String(v === undefined ? "" : v).length; }));
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
  constructor(nome, contador) {
    this.nome = nome;
    this.folhas = [];
    this.c = contador;
  }
  getName() { return this.nome; }
  getSheets() { return this.folhas.slice(); }
  getSheetByName(nome) {
    this.c.getSheetByName++;
    return this.folhas.find((f) => f.nome === nome) || null;
  }
  insertSheet(nome) {
    const f = new Folha(nome, this.c);
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
  const contador = novoContador();
  const planilha = new Planilha("R.A.M.A. (teste)", contador);
  const propriedades = new Map();
  const cache = new Map();

  global.SpreadsheetApp = {
    openById: () => { contador.abrirPlanilha++; return planilha; },
    getActiveSpreadsheet: () => { contador.abrirPlanilha++; return planilha; },
  };

  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => {
        contador.propriedadesGet++;
        return propriedades.has(k) ? propriedades.get(k) : null;
      },
      getProperties: () => {
        contador.propriedadesGet++;
        const saida = {};
        propriedades.forEach((v, k) => { saida[k] = v; });
        return saida;
      },
      setProperty: (k, v) => { propriedades.set(k, String(v)); },
      deleteProperty: (k) => { propriedades.delete(k); },
    }),
  };

  /* O CacheService de verdade guarda no máximo 100 KB por chave e
     descarta quando quer. O simulado respeita o limite de tamanho —
     ultrapassar tem de falhar aqui também, senão o teste passa e a
     produção perde o valor em silêncio. */
  const LIMITE_CACHE = 100 * 1024;
  const expiraEm = new Map();

  function vivo(k) {
    if (!cache.has(k)) return false;
    const prazo = expiraEm.get(k) || 0;
    if (prazo && Date.now() > prazo) { cache.delete(k); expiraEm.delete(k); return false; }
    return true;
  }

  const objetoDeCache = {
    get: (k) => { contador.cacheGet++; return vivo(k) ? cache.get(k) : null; },
    getAll: (chaves) => {
      contador.cacheGet++;
      const saida = {};
      (chaves || []).forEach((k) => { if (vivo(k)) saida[k] = cache.get(k); });
      return saida;
    },
    put: (k, v, segundos) => {
      contador.cachePut++;
      const texto = String(v);
      if (texto.length > LIMITE_CACHE) throw new Error("Argument too large: value");
      cache.set(k, texto);
      expiraEm.set(k, segundos ? Date.now() + segundos * 1000 : 0);
    },
    putAll: (mapa, segundos) => {
      contador.cachePut++;
      Object.keys(mapa || {}).forEach((k) => {
        const texto = String(mapa[k]);
        if (texto.length > LIMITE_CACHE) throw new Error("Argument too large: value");
        cache.set(k, texto);
        expiraEm.set(k, segundos ? Date.now() + segundos * 1000 : 0);
      });
    },
    remove: (k) => { cache.delete(k); expiraEm.delete(k); },
    removeAll: (chaves) => { (chaves || []).forEach((k) => { cache.delete(k); expiraEm.delete(k); }); },
  };

  global.CacheService = {
    getScriptCache: () => objetoDeCache,
    getUserCache: () => objetoDeCache,
  };

  /* A trava sempre é obtida, a menos que o teste peça o contrário: o
     simulador roda uma execução por vez, e testar contenção real
     exigiria concorrência que não existe aqui. O que os testes conferem
     é que o código PASSA pela trava, e como ele reage quando ela nega. */
  const controleDaTrava = { negar: false, obtidas: 0, negadas: 0 };

  global.LockService = {
    getScriptLock: () => ({
      tryLock: () => {
        contador.travas++;
        if (controleDaTrava.negar) { controleDaTrava.negadas++; return false; }
        controleDaTrava.obtidas++;
        return true;
      },
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
    contador,
    trava: controleDaTrava,
    travasPedidas: () => contador.travas,

    /* Quantos bytes de resposta o backend devolveu — o outro número que
       o relatório compara, porque uma resposta menor viaja mais rápido
       para quem está do outro lado. */
    tamanhoDaResposta(texto) { return Buffer.byteLength(String(texto), "utf8"); },

    limpar() {
      planilha.folhas = [];
      cache.clear();
      expiraEm.clear();
      registros.length = 0;
      contador.zerar();
      controleDaTrava.negar = false;
      controleDaTrava.obtidas = 0;
      controleDaTrava.negadas = 0;
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

/* Igual à anterior, mas devolve também o tamanho do que trafegou. */
export function chamarMedindo(global, corpo) {
  const resposta = global.doPost({ postData: { contents: JSON.stringify(corpo) } });
  const texto = resposta.getContent();
  return { dados: JSON.parse(texto), bytes: Buffer.byteLength(texto, "utf8") };
}
