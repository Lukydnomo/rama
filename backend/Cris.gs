/* =====================================================================
   R.A.M.A. — leitura de ficha pública do CRIS (v2.34)
   ---------------------------------------------------------------------
   Uma ação só, de LEITURA: `ler_ficha_cris`. Ela recebe o link público
   de uma ficha do CRIS (https://crisordemparanormal.com/agente/{ID}),
   valida o link de novo, faz UM GET num endereço montado a partir de um
   prefixo fixo e do ID validado, decodifica o documento, exige que ele
   seja público (`private` explicitamente false) e devolve só os campos
   que a conversão usa. A conversão em si mora no navegador
   (js/importar-cris.js), com os catálogos do R.A.M.A.

   Este arquivo é opcional: sem ele instalado, o Codigo.gs continua
   funcionando e a ação responde `acao_desconhecida` — a tela explica que
   o servidor ainda não foi atualizado.

   ---------------------------------------------------------------------
   O QUE ESTA AÇÃO NUNCA FAZ
   ---------------------------------------------------------------------
     · não lê sem sessão do R.A.M.A. (a sessão é conferida no doPost);
     · não manda token do R.A.M.A., cookie, login ou chave ao CRIS;
     · não segue redirecionamento nem busca a URL recebida;
     · não lista personagens, usuários, campanhas nem outra coleção;
     · não grava personagem — criar é a ação de sempre, `criar_personagem`;
     · não guarda o documento lido (nada de cache compartilhado) e não
       registra corpo, descrição, UID, token ou URL de imagem em log;
     · não corta listas para a ficha caber: passou do limite, é erro.

   ADAPTADOR. Projeto, coleção e decodificador ficam em `RamaCrisCore`,
   versionado como `cris-firestore-v1`. É a integração com o
   armazenamento público usado pelo CRIS — não uma API oficial de
   exportação. Se o CRIS mudar, muda este bloco, e a importação por
   arquivo do R.A.M.A. continua funcionando sem ele.
   ===================================================================== */

var CRIS_LIMITE_CONSULTAS = 20;          // por conta…
var CRIS_JANELA_SEGUNDOS = 5 * 60;       // …a cada 5 minutos
var CRIS_PRAZO_SEGUNDOS = 20;

var RamaCrisCore = (function () {
  'use strict';
  var ADAPTADOR = 'cris-firestore-v1';
  var BASE = 'https://firestore.googleapis.com/v1/projects/cris-ordem-paranormal/databases/(default)/documents/characters/';
  var DOC_BASE = 'projects/cris-ordem-paranormal/databases/(default)/documents/characters/';
  var MAX_BYTES = 2 * 1024 * 1024;
  var OWN = Object.prototype.hasOwnProperty;
  var BANNED = ['__proto__', 'constructor', 'prototype'];
  function erro(codigo, mensagem) { var e = new Error(mensagem); e.codigo = codigo; return e; }
  function objeto(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function own(x, k) { return OWN.call(x, k); }

  /* Só HTTPS, só o host do CRIS, só /agente/{ID}. O ID mantém as
     maiúsculas; parâmetros e fragmento são descartados antes da leitura. */
  function parseLink(link) {
    if (typeof link !== 'string' || link.length > 2048) throw erro('cris_url_invalida', 'Use o link público da ficha no CRIS.');
    var m = /^https:\/\/crisordemparanormal\.com\/agente\/([A-Za-z0-9_-]{1,128})\/?(?:[?#][^\s]*)?$/i.exec(link.trim());
    if (!m) throw erro('cris_url_invalida', 'Use https://crisordemparanormal.com/agente/ID.');
    return { documentId: m[1], url: 'https://crisordemparanormal.com/agente/' + m[1], endpoint: BASE + m[1] };
  }

  function decodificarDocumento(doc, link) {
    var ref = parseLink(link), contagem = 0;
    if (!objeto(doc) || doc.name !== DOC_BASE + ref.documentId || !objeto(doc.fields)) throw erro('cris_formato_incompativel', 'O CRIS retornou um formato inesperado.');
    function mapa(fields, profundidade) {
      if (!objeto(fields)) throw erro('cris_formato_incompativel', 'Mapa Firestore inválido.');
      var saida = Object.create(null), chaves = Object.keys(fields);
      if (chaves.length > 500) throw erro('cris_limite_excedido', 'Há campos demais na ficha.');
      chaves.forEach(function (k) {
        if (BANNED.indexOf(k) >= 0) throw erro('cris_formato_incompativel', 'Campo inseguro.');
        saida[k] = valor(fields[k], profundidade + 1);
      });
      return saida;
    }
    function valor(v, profundidade) {
      if (++contagem > 30000 || profundidade > 32) throw erro('cris_limite_excedido', 'A ficha ultrapassa os limites de leitura.');
      if (!objeto(v) || Object.keys(v).length !== 1) throw erro('cris_formato_incompativel', 'Valor Firestore inválido.');
      var k = Object.keys(v)[0], x = v[k];
      if (k === 'nullValue' && x === null) return null;
      if (k === 'booleanValue' && typeof x === 'boolean') return x;
      if ((k === 'stringValue' || k === 'timestampValue' || k === 'referenceValue' || k === 'bytesValue') && typeof x === 'string') return x;
      if (k === 'integerValue' && (typeof x === 'string' || typeof x === 'number') && /^-?\d+$/.test(String(x))) {
        var n = Number(x); if (Number.isSafeInteger(n)) return n;
      }
      if (k === 'doubleValue' && typeof x === 'number' && isFinite(x)) return x;
      if (k === 'geoPointValue' && objeto(x) && isFinite(x.latitude) && isFinite(x.longitude)) return { latitude: x.latitude, longitude: x.longitude };
      if (k === 'mapValue' && objeto(x)) return mapa(x.fields === undefined ? {} : x.fields, profundidade);
      if (k === 'arrayValue' && objeto(x)) {
        var lista = x.values === undefined ? [] : x.values;
        if (!Array.isArray(lista)) throw erro('cris_formato_incompativel', 'Lista Firestore inválida.');
        if (lista.length > 1000) throw erro('cris_limite_excedido', 'Há registros demais na ficha.');
        return lista.map(function (a) { return valor(a, profundidade + 1); });
      }
      throw erro('cris_formato_incompativel', 'Tipo Firestore inválido ou não suportado.');
    }
    var dados = mapa(doc.fields, 0);
    if (dados.private !== false) throw erro('cris_nao_publica', 'A ficha precisa estar explicitamente pública no CRIS.');
    return dados;
  }

  /* A lista do que atravessa. Proprietário, permissões, campanha,
     resultados de dados e caminhos internos ficam de fora. */
  var TOP = 'name player className statsClass backgroundName nex nexString isNexLevelOn isPdOn isSobrevivendoAoHorror currentPv maxPv currentPe maxPe currentSan maxSan currentPd maxPd peTurn movement block evade bonusDefense protectionDefense currentProtection currentLoad maxLoad prestigePoints patent creditsLimit ritualsDc proficiencies resistances sheetPictureURL'.split(' ');
  var SKILL = 'name attribute trainingDegree bonus otherBonus onlyTrained loadPenalty'.split(' ');
  var POWER = 'id name description element hasAutomation isAutomationOn automationId'.split(' ');
  var MOD = 'id name description modType itemType element hasAutomation isAutomationOn automationId'.split(' ');
  var ITEM = 'id name description itemType damage criticalRange criticalMult damageType range handling proficiencie type slots category equipped defense element quantity amount hasAutomation isAutomationOn automationId'.split(' ');
  var ATTACK = 'id itemId name description damage extraDamage criticalRange criticalMult damageType range skillUsed damageAttribute attackBonus'.split(' ');
  var RITUAL = 'id name description circle element execution range target area duration save resistance cost hasAutomation isAutomationOn automationId'.split(' ');
  function escalares(x, campos) {
    if (!objeto(x)) throw erro('cris_formato_incompativel', 'Registro inválido.');
    var y = Object.create(null);
    campos.forEach(function (k) {
      if (!own(x, k)) return;
      var v = x[k];
      if (v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || typeof v === 'string') {
        if (typeof v === 'string' && v.length > 100000) throw erro('cris_limite_excedido', 'Um texto ultrapassa o limite de leitura.');
        y[k] = v;
      } else throw erro('cris_formato_incompativel', 'Campo com tipo incompatível: ' + k + '.');
    });
    return y;
  }
  function lista(x, campos, maximo) {
    if (x === undefined) return [];
    if (!Array.isArray(x)) throw erro('cris_formato_incompativel', 'Lista incompatível.');
    if (x.length > maximo) throw erro('cris_limite_excedido', 'Lista grande demais.');
    return x.map(function (a) { return escalares(a, campos); });
  }
  /* A foto só atravessa da origem observada: Firebase Storage, bucket do
     CRIS, rota de objetos. Qualquer outra some, com aviso. */
  function fotoValida(url) {
    return typeof url === 'string' && url.length <= 2048 &&
      /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/cris-ordem-paranormal\.appspot\.com\/o\/[A-Za-z0-9%._-]+(\?[A-Za-z0-9=&%._-]*)?$/.test(url);
  }
  function whitelist(dados) {
    if (!objeto(dados) || dados.private !== false) throw erro('cris_nao_publica', 'A ficha precisa estar explicitamente pública.');
    var d = escalares(dados, TOP); d.private = false;
    d.attributes = escalares(dados.attributes, ['str', 'dex', 'int', 'pre', 'con']);
    d.description = escalares(dados.description || {}, ['personal', 'goal', 'anotation', 'physical', 'history']);
    d.skills = lista(dados.skills, SKILL, 100);
    d.powers = lista(dados.powers, POWER, 300);
    d.inventory = lista(dados.inventory, ITEM, 300);
    d.inventory.forEach(function (item, i) { item.mods = lista(dados.inventory[i].mods, MOD, 50); });
    d.attacks = lista(dados.attacks, ATTACK, 300);
    d.attacks.forEach(function (ataque, i) { ataque.aditionalDamage = lista(dados.attacks[i].aditionalDamage, ['id', 'value', 'damageType'], 30); });
    d.rituals = lista(dados.rituals, RITUAL, 300);
    ['itemsLimit', 'currentItemsLimit'].forEach(function (k) { if (dados[k] !== undefined) d[k] = escalares(dados[k], ['I', 'II', 'III', 'IV']); });
    if (dados.resistencias !== undefined) {
      if (!objeto(dados.resistencias)) throw erro('cris_formato_incompativel', 'Resistências incompatíveis.');
      d.resistencias = escalares(dados.resistencias, Object.keys(dados.resistencias).slice(0, 100));
    }
    ['imunidades', 'vulnerabilidades'].forEach(function (k) {
      if (dados[k] !== undefined) {
        if (!Array.isArray(dados[k]) || dados[k].length > 100 || !dados[k].every(function (v) { return typeof v === 'string'; })) throw erro('cris_formato_incompativel', 'Resistências incompatíveis.');
        d[k] = dados[k].slice();
      }
    });
    if (d.sheetPictureURL !== undefined && !fotoValida(d.sheetPictureURL)) delete d.sheetPictureURL;
    return d;
  }
  function numero(v, campo) {
    if (['string', 'number'].indexOf(typeof v) < 0 || String(v).trim() === '' || !isFinite(Number(v))) throw erro('cris_formato_incompativel', 'Número inválido em ' + campo + '.');
    return Number(v);
  }
  function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function resumo(d) {
    var a = d.attributes, atributos = { for: numero(a.str, 'str'), agi: numero(a.dex, 'dex'), int: numero(a.int, 'int'), pre: numero(a.pre, 'pre'), vig: numero(a.con, 'con') };
    var modo = d.isNexLevelOn === true ? 'nivel' : 'nex', valorNex;
    if (modo === 'nex') {
      if (!/^\d{1,2}%$/.test(String(d.nex))) throw erro('cris_formato_incompativel', 'NEX incompatível.');
      valorNex = Number(String(d.nex).slice(0, -1));
    } else valorNex = numero(d.nex, 'nex/nivel');
    var recursos = {};
    ['Pv', 'Pe', 'San', 'Pd'].forEach(function (k) {
      if (d['max' + k] !== undefined && d['current' + k] !== undefined) recursos[k.toLowerCase()] = { atual: numero(d['current' + k], k), maximo: numero(d['max' + k], k) };
    });
    var treino = { '0': 'destreinado', '5': 'treinado', '10': 'veterano', '15': 'expert' };
    var pericias = d.skills.map(function (p) { return { nome: p.name, chaveSugerida: slug(p.name), atributo: String(p.attribute).toLowerCase(), grau: treino[String(p.trainingDegree)] || null, treino: p.trainingDegree, bonusTotal: p.bonus, outros: p.otherBonus }; });
    return { nome: d.name, classe: d.className, origem: d.backgroundName, progressao: { modo: modo, valor: valorNex }, atributos: atributos, recursos: recursos, pericias: pericias,
      defesa: 10 + atributos.agi + numero(d.protectionDefense === undefined ? 0 : d.protectionDefense, 'protectionDefense') + numero(d.bonusDefense === undefined ? 0 : d.bonusDefense, 'bonusDefense'),
      bloqueio: d.block, esquiva: d.evade, itens: d.inventory.length, poderes: d.powers.length, rituais: d.rituals.length };
  }
  function pacote(doc, link, lidoEm) {
    var ref = parseLink(link), bruto = decodificarDocumento(doc, link), d = whitelist(bruto);
    var avisos = [];
    if (bruto.sheetPictureURL !== undefined && d.sheetPictureURL === undefined) avisos.push({ codigo: 'foto_origem_desconhecida', gravidade: 'informacao', campo: 'sheetPictureURL', mensagem: 'A foto vem de um endereço fora do armazenamento do CRIS e não será trazida.' });
    if (d.nexString !== undefined && String(d.nexString) !== String(d.nex)) avisos.push({ codigo: 'nex_string_diverge', gravidade: 'informacao', campo: 'nex', mensagem: 'nexString difere do NEX atual; vale o NEX atual.' });
    if (d.powers.length) avisos.push({ codigo: 'historico_indisponivel', gravidade: 'revisao', campo: 'powers', mensagem: 'A ordem de aquisição dos poderes não está disponível. O estado atual é preservado.' });
    var ids = Object.create(null); d.inventory.forEach(function (i) { if (i.id) ids[i.id] = true; });
    d.attacks.forEach(function (a, i) { if (a.itemId && !ids[a.itemId]) avisos.push({ codigo: 'ataque_sem_item', gravidade: 'revisao', campo: 'attacks.' + i, mensagem: 'O ataque faz referência a um item ausente.' }); });
    return { adaptador: ADAPTADOR, fonte: { url: ref.url, documentId: ref.documentId, lidoEm: lidoEm || new Date().toISOString(), updateTime: typeof doc.updateTime === 'string' ? doc.updateTime : null }, ficha: d, resumo: resumo(d), avisos: avisos };
  }
  function codigoHttp(status) {
    if (status === 404) return 'cris_nao_encontrada';
    if (status === 401 || status === 403) return 'cris_acesso_negado';
    if (status === 429) return 'cris_limite_temporario';
    if (status >= 500 || (status >= 300 && status < 400)) return 'cris_indisponivel';
    return 'cris_resposta_invalida';
  }
  return { ADAPTADOR: ADAPTADOR, MAX_BYTES: MAX_BYTES, parseLink: parseLink, decodificarDocumento: decodificarDocumento, whitelist: whitelist, pacote: pacote, resumo: resumo, codigoHttp: codigoHttp, fotoValida: fotoValida, erro: erro };
})();

/* Freio por conta, no CacheService: 20 consultas a cada 5 minutos. A
   contagem é descartável e nunca segura lock durante o GET externo.
   A identidade é a da sessão validada, nunca a do pedido. */
function crisDentroDoLimite(usuario) {
  var cache = CacheService.getScriptCache();
  var chave = 'rama.cris.' + usuario.id;
  var agora = Math.floor(Date.now() / 1000);
  var estado = null;
  try { estado = JSON.parse(cache.get(chave) || 'null'); } catch (e) { estado = null; }
  if (!estado || typeof estado.inicio !== 'number' || agora - estado.inicio >= CRIS_JANELA_SEGUNDOS) estado = { inicio: agora, n: 0 };
  if (estado.n >= CRIS_LIMITE_CONSULTAS) return false;
  estado.n += 1;
  cache.put(chave, JSON.stringify(estado), Math.max(1, CRIS_JANELA_SEGUNDOS - (agora - estado.inicio)));
  return true;
}

function acaoLerFichaCris(corpo, usuario) {
  if (!usuario) return { ok: false, erro: 'sessao_invalida' };
  var ref;
  try { ref = RamaCrisCore.parseLink(corpo && corpo.url); }
  catch (e) { return { ok: false, erro: 'cris_url_invalida' }; }

  if (!crisDentroDoLimite(usuario)) return { ok: false, erro: 'cris_limite_temporario' };

  var resposta;
  try {
    resposta = UrlFetchApp.fetch(ref.endpoint, {
      method: 'get',
      headers: { Accept: 'application/json' },
      followRedirects: false,
      muteHttpExceptions: true,
      validateHttpsCertificates: true,
      timeoutSeconds: CRIS_PRAZO_SEGUNDOS,
    });
  } catch (e) {
    return { ok: false, erro: 'cris_indisponivel' };
  }
  var status = resposta.getResponseCode();
  if (status !== 200) return { ok: false, erro: RamaCrisCore.codigoHttp(status) };
  var bytes = resposta.getContent();
  if (!bytes || bytes.length > RamaCrisCore.MAX_BYTES) return { ok: false, erro: 'cris_limite_excedido' };
  var doc;
  try { doc = JSON.parse(resposta.getContentText('UTF-8')); }
  catch (e) { return { ok: false, erro: 'cris_resposta_invalida' }; }
  try {
    return { ok: true, dados: RamaCrisCore.pacote(doc, ref.url) };
  } catch (e) {
    return { ok: false, erro: (e && e.codigo) || 'cris_formato_incompativel' };
  }
}

/* O Codigo.gs pergunta por esta função ao montar as rotas (rotaDe): com
   o arquivo instalado, a ação existe; sem ele, `acao_desconhecida`.
   Não entra no `lote`, que é só para leituras internas rápidas. */
function rotasDoCris() {
  return {
    ler_ficha_cris: { publica: false, fn: acaoLerFichaCris },
  };
}
