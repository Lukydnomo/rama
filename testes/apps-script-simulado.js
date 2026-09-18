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

   ---------------------------------------------------------------------
   O QUE A PLANILHA DE VERDADE FAZ, E ESTA TAMBÉM (v2.15)
   ---------------------------------------------------------------------

   Até a v2.14 esta planilha aceitava qualquer coisa em qualquer célula.
   Era por isso que nenhum teste pegava o defeito que motivou a v2.15: a
   ficha que passa de 50 mil caracteres não cabe numa célula do Google e
   deixa de salvar. Quatro comportamentos do Sheets agora valem aqui:

     limite de célula   texto com mais de 50.000 caracteres é recusado,
                        com a mesma mensagem do Google, e NADA da
                        gravação entra (a chamada é tudo ou nada)
     conversão de tipo  setValues e appendRow tratam o texto como se
                        alguém o tivesse digitado: "=..." vira fórmula
                        (aqui, #ERROR!), "0042" vira o número 42, "TRUE"
                        vira booleano, e o apóstrofo do começo some; meio
                        emoji solto vira U+FFFD, porque não existe em UTF-8
     grade de linhas    a aba nasce com 1.000 linhas; escrever numa
                        faixa além da grade estoura, como no Google, e
                        insertRowsAfter a aumenta
     apagar tudo        não dá para apagar todas as linhas não
                        congeladas de uma aba

   E dois recursos que só existem para os testes: `falharUmaVez`, que
   faz a próxima chamada de um tipo estourar, e `antesDe`, que roda um
   código no meio de uma execução — é assim que uma gravação
   "concorrente" entra entre a varredura e a leitura de outra.
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
    getMaxRows: 0,
    insertRows: 0,
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
             this.deleteRow + this.getLastRow + this.getMaxRows +
             this.insertRows + this.getSheetByName + this.abrirPlanilha;
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

/* O limite do Google para uma célula, e a mensagem que ele dá. */
export const LIMITE_REAL_DA_CELULA = 50000;

function conferirCelulas(linhas) {
  linhas.forEach((l) => l.forEach((v) => {
    if (typeof v === "string" && v.length > LIMITE_REAL_DA_CELULA) {
      throw new Error("Your input contains more than the maximum of 50000 characters in a single cell.");
    }
  }));
}

/* O que a planilha guarda quando recebe um texto por setValues ou
   appendRow: o mesmo que guardaria se alguém o digitasse. É o motivo
   de um bloco de ficha precisar de marcador — um pedaço de JSON que
   começasse com "=" viraria fórmula, e um que fosse só "1234" viraria
   número. */
export function comoOSheetsGuarda(v) {
  if (typeof v !== "string") return v;
  /* O texto viaja em UTF-8, e meio emoji (um par substituto sozinho)
     não existe em UTF-8: chega do outro lado como U+FFFD. */
  v = v.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
  if (v.charAt(0) === "'") return v.slice(1);
  if (v.charAt(0) === "=" && v.length > 1) return "#ERROR!";
  if (/^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(v)) return Number(v);
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === "true";
  return v;
}

class Folha {
  constructor(nome, contador, ambiente) {
    this.nome = nome;
    this.linhas = [];
    this.congeladas = 0;
    this.maxLinhas = 1000;
    this.formatos = {};
    this.c = contador;
    this.amb = ambiente;
  }

  getName() { return this.nome; }
  getLastRow() { this.c.getLastRow++; return this.linhas.length; }
  getLastColumn() {
    return this.linhas.reduce((max, l) => Math.max(max, l.length), 0);
  }
  getMaxRows() { this.c.getMaxRows++; return this.tamanhoDaGrade(); }
  tamanhoDaGrade() { return Math.max(this.maxLinhas, this.linhas.length); }
  setFrozenRows(n) { this.congeladas = n; return this; }
  getFrozenRows() { return this.congeladas; }

  insertRowsAfter(depoisDe, quantas) {
    this.amb.interceptar(this.nome, "insertRowsAfter");
    this.c.insertRows++;
    /* Linhas em branco no meio empurram o conteúdo para baixo; depois
       da última, só aumentam a grade. */
    if (depoisDe < this.linhas.length) {
      const vazias = Array.from({ length: quantas }, () => []);
      this.linhas.splice(depoisDe, 0, ...vazias);
    }
    this.maxLinhas = this.tamanhoDaGrade() + quantas;
    return this;
  }

  appendRow(valores) {
    this.amb.interceptar(this.nome, "appendRow");
    conferirCelulas([valores]);
    this.c.appendRow++;
    this.c.celulasEscritas += valores.length;
    valores.forEach((v) => { this.c.bytesEscritos += String(v === undefined ? "" : v).length; });
    this.linhas.push(valores.map(comoOSheetsGuarda));
    if (this.linhas.length > this.maxLinhas) this.maxLinhas = this.linhas.length;
    return this;
  }

  deleteRow(numero) {
    return this.deleteRows(numero, 1, true);
  }

  deleteRows(inicio, quantas, umaSo) {
    this.amb.interceptar(this.nome, umaSo ? "deleteRow" : "deleteRows");
    if (this.tamanhoDaGrade() - quantas < this.congeladas + 1) {
      throw new Error("Sorry, it is not possible to delete all non-frozen rows.");
    }
    this.c.deleteRow++;
    this.linhas.splice(inicio - 1, quantas);
    this.maxLinhas = this.tamanhoDaGrade() - quantas;
    return this;
  }

  getRange(linha, coluna, quantasLinhas, quantasColunas) {
    const folha = this;
    const c = this.c;
    const nl = quantasLinhas === undefined ? 1 : quantasLinhas;
    const nc = quantasColunas === undefined ? 1 : quantasColunas;

    c.getRange++;

    if (linha < 1 || coluna < 1 || nl < 1 || nc < 1 || linha + nl - 1 > folha.tamanhoDaGrade()) {
      throw new Error("The coordinates of the range are outside the dimensions of the sheet.");
    }

    return {
      getValues() {
        folha.amb.interceptar(folha.nome, "getValues", { linha, coluna, nl, nc });
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
        folha.amb.interceptar(folha.nome, "setValues", { linha, coluna, nl, nc });
        if (valores.length !== nl || valores.some((l) => l.length !== nc)) {
          throw new Error("The number of rows or columns in the data does not match the range.");
        }
        conferirCelulas(valores);
        c.setValues++;
        c.celulasEscritas += nl * nc;
        valores.forEach((l) => l.forEach((v) => { c.bytesEscritos += String(v === undefined ? "" : v).length; }));
        for (let i = 0; i < valores.length; i++) {
          const alvo = folha.linhas[linha - 1 + i] || (folha.linhas[linha - 1 + i] = []);
          for (let j = 0; j < valores[i].length; j++) {
            const col = coluna - 1 + j;
            /* Formato texto puro ("@") guarda o que veio, sem converter. */
            alvo[col] = folha.formatos[col + 1] === "@" ? valores[i][j] : comoOSheetsGuarda(valores[i][j]);
          }
        }
        /* Linhas escritas por faixa no fim, sem nada antes delas, não
           podem deixar buracos no array: o Sheets as teria vazias. */
        for (let k = 0; k < folha.linhas.length; k++) if (!folha.linhas[k]) folha.linhas[k] = [];
        return this;
      },
      setNumberFormat(formato) {
        for (let j = 0; j < nc; j++) folha.formatos[coluna + j] = formato;
        return this;
      },
      setFontWeight() { return this; },
    };
  }
}

class Planilha {
  constructor(nome, contador, ambiente) {
    this.nome = nome;
    this.folhas = [];
    this.c = contador;
    this.amb = ambiente;
  }
  getName() { return this.nome; }
  getSheets() { return this.folhas.slice(); }
  getSheetByName(nome) {
    this.c.getSheetByName++;
    return this.folhas.find((f) => f.nome === nome) || null;
  }
  insertSheet(nome) {
    const f = new Folha(nome, this.c, this.amb);
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

  /* Ganchos dos testes. Cada um casa com uma aba e um método; `vez`
     diz em qual chamada casada ele age (1 = a próxima). Depois de agir,
     sai da lista. */
  const ganchos = [];
  const amb = {
    interceptar(aba, metodo, detalhes) {
      for (let i = 0; i < ganchos.length; i++) {
        const g = ganchos[i];
        if (g.aba && g.aba !== aba) continue;
        if (g.metodo && g.metodo !== metodo) continue;
        if (g.filtro && !g.filtro(detalhes || {})) continue;
        g.vez--;
        if (g.vez > 0) continue;
        ganchos.splice(i, 1);
        g.acao(detalhes || {});
        return;
      }
    },
  };

  const planilha = new Planilha("R.A.M.A. (teste)", contador, amb);
  const propriedades = new Map();
  const cache = new Map();

  /* A planilha simulada escreve na hora, então o flush não tem o que
     mandar — ele só fica contado, para os testes saberem que a gravação
     passou por ele antes de soltar a trava. Um teste pode fazê-lo falhar
     como o Google falharia ao enviar o buffer. */
  const controleDoFlush = { vezes: 0, falhar: 0 };
  global.SpreadsheetApp = {
    openById: () => { contador.abrirPlanilha++; return planilha; },
    getActiveSpreadsheet: () => { contador.abrirPlanilha++; return planilha; },
    flush: () => {
      controleDoFlush.vezes++;
      if (controleDoFlush.falhar > 0) {
        controleDoFlush.falhar--;
        throw new Error("Service Spreadsheets failed while accessing document");
      }
    },
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
  /* `presa` diz se alguém obteve a trava e ainda não a soltou — é o que
     um teste confere para saber que um erro no meio não a deixou presa. */
  const controleDaTrava = { negar: false, obtidas: 0, negadas: 0, presa: false };

  global.LockService = {
    getScriptLock: () => ({
      tryLock: () => {
        contador.travas++;
        if (controleDaTrava.negar) { controleDaTrava.negadas++; return false; }
        controleDaTrava.obtidas++;
        controleDaTrava.presa = true;
        return true;
      },
      releaseLock: () => { controleDaTrava.presa = false; },
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
    flush: controleDoFlush,
    travasPedidas: () => contador.travas,

    /* A próxima chamada casada estoura, como um serviço do Google que
       caiu no meio. { aba, metodo, vez, filtro, mensagem } */
    falharUmaVez(opcoes) {
      const o = opcoes || {};
      ganchos.push({
        aba: o.aba, metodo: o.metodo, vez: o.vez || 1, filtro: o.filtro,
        acao: () => { throw new Error(o.mensagem || "Service Spreadsheets failed while accessing document"); },
      });
    },

    /* Roda `fn` imediatamente antes da chamada casada — a chamada segue
       depois, normalmente. É o jeito de pôr "outra pessoa" no meio de
       uma execução. */
    antesDe(opcoes, fn) {
      const o = opcoes || {};
      ganchos.push({ aba: o.aba, metodo: o.metodo, vez: o.vez || 1, filtro: o.filtro, acao: fn });
    },

    ganchosPendentes: () => ganchos.length,
    removerGanchos: () => { ganchos.length = 0; },

    /* Quantos bytes de resposta o backend devolveu — o outro número que
       o relatório compara, porque uma resposta menor viaja mais rápido
       para quem está do outro lado. */
    tamanhoDaResposta(texto) { return Buffer.byteLength(String(texto), "utf8"); },

    limpar() {
      ganchos.length = 0;
      planilha.folhas = [];
      cache.clear();
      expiraEm.clear();
      registros.length = 0;
      contador.zerar();
      controleDaTrava.negar = false;
      controleDaTrava.obtidas = 0;
      controleDaTrava.negadas = 0;
      controleDaTrava.presa = false;
      controleDoFlush.vezes = 0;
      controleDoFlush.falhar = 0;
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
