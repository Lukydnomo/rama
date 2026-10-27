/* =====================================================================
   R.A.M.A. — feedback pelo site, entregue num canal do Discord
   ---------------------------------------------------------------------
   Uma ação só, de ESCRITA externa: `enviar_feedback`. Quem está numa
   sessão manda uma sugestão, um bug ou outra opinião; o servidor confere
   tudo de novo, monta a mensagem e a entrega por um webhook do Discord.
   Nada é gravado na planilha: o canal é o registro.

   Este arquivo é opcional, como o Cris.gs: sem ele instalado, o
   Codigo.gs continua funcionando e a ação responde `acao_desconhecida`.

   ---------------------------------------------------------------------
   O WEBHOOK
   ---------------------------------------------------------------------
   O endereço mora numa propriedade do script, e só lá:

     RAMA_FEEDBACK_WEBHOOK   https://discord.com/api/webhooks/{id}/{token}

   Ele nunca vai ao navegador, a uma resposta da API nem ao log: quem tem
   o endereço publica no canal. Sem a propriedade (ou com um valor que
   não é um webhook do Discord), a ação responde `feedback_indisponivel`
   e nada sai para a rede. Não há tela para ver nem trocar o endereço.

   ---------------------------------------------------------------------
   O QUE A AÇÃO CONFERE, NESTA ORDEM
   ---------------------------------------------------------------------
     1. a sessão (no doPost, antes de chegar aqui);
     2. a categoria, os campos obrigatórios e o tamanho de cada texto —
        texto grande demais é RECUSADO, nunca cortado;
     3. o freio da conta e o geral (CacheService, com a trava do script
        só pelo instante de contar, nunca durante a ida ao Discord);
     4. monta o pedido ao Discord com campos fixos — o texto de quem
        envia vira valor de campo, nunca chave nem propriedade do webhook;
     5. envia por UrlFetchApp e só responde sucesso quando o Discord
        confirma a mensagem criada (`?wait=true` devolve a mensagem).

   O QUE ELA NUNCA FAZ
     · não manda token, id de conta, usuário de login, cookie, ficha nem
       campanha ao Discord; o nome do agente só vai quando a pessoa marca;
     · não deixa o texto mencionar ninguém (@everyone, @here, cargos,
       pessoas): `allowed_mentions` vazio e as menções desarmadas no texto;
     · não registra corpo, assunto, nome nem o endereço do webhook no log.

   Os limites de texto têm cópia em js/feedback.js, para o contador da
   tela; os testes conferem que as duas cópias batem.
   ===================================================================== */

var FEEDBACK_PROPRIEDADE = 'RAMA_FEEDBACK_WEBHOOK';

/* Por conta: um envio a cada 30 segundos, até 8 por hora. Para o
   canal: até 60 por hora, somando todas as contas. Envio que falha não
   conta — tentar de novo não pode ficar mais difícil por culpa do
   Discord. */
var FEEDBACK_INTERVALO_SEGUNDOS = 30;
var FEEDBACK_LIMITE_CONTA = 8;
var FEEDBACK_LIMITE_GERAL = 60;
var FEEDBACK_JANELA_SEGUNDOS = 60 * 60;
/* Um envio sem fim conhecido (a execução caiu no meio) deixa de segurar
   a conta depois disto. */
var FEEDBACK_ENVIO_SEGUNDOS = 90;
/* Por quanto tempo o servidor lembra que uma operação já chegou ao
   Discord: a repetição do mesmo envio devolve sucesso sem repostar. */
var FEEDBACK_OPERACAO_SEGUNDOS = 6 * 60 * 60;

var RamaFeedbackCore = (function () {
  'use strict';

  var CATEGORIAS = {
    sugestao: { rotulo: 'Sugestão de melhoria', cor: 0x3B82C4 },
    bug: { rotulo: 'Relato de bug', cor: 0xC0392B },
    outro: { rotulo: 'Outro feedback', cor: 0x7F8C8D },
  };

  /* Caracteres, depois de tirar espaços das pontas. Somados no pior
     caso, cabem com folga nos 6000 de um embed do Discord, e cada um
     cabe no seu lugar (descrição 4096, campo 1024, título 256). */
  var LIMITES = { assunto: 120, descricao: 3000, passos: 1000, esperado: 500, observado: 500 };
  var MINIMOS = { assunto: 3, descricao: 10 };
  var LIMITE_PAGINA = 80;
  var LIMITE_NOME = 80;

  /* Os tetos do Discord para um embed. */
  var DISCORD = { titulo: 256, descricao: 4096, campoNome: 256, campoValor: 1024, rodape: 2048, autor: 256, total: 6000, campos: 25 };

  var WEBHOOK = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,30}\/[A-Za-z0-9_-]{20,200}$/;

  function erro(codigo, extra) { return Object.assign({ ok: false, erro: codigo }, extra || {}); }

  /* Controle, BOM e os invisíveis de direção do texto saem; quebra de
     linha e tabulação ficam. */
  function limparTexto(v) {
    return String(v)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')
      .trim();
  }

  /* Uma linha só, espaços repetidos viram um. */
  function linha(v) { return limparTexto(v).replace(/\s+/g, ' '); }

  /* As menções viram texto: um espaço de largura zero depois da arroba
     quebra @everyone, @here, <@123>, <@!123>, <@&123> e <#123>. O
     `allowed_mentions` vazio já impede o aviso; isto impede até a
     aparência de menção. */
  function desarmar(texto) {
    return String(texto)
      .replace(/@(everyone|here)/gi, '@\u200B$1')
      .replace(/<(@[!&]?|#)(\d+)>/g, '<$1\u200B$2>');
  }

  /* validar(dados) → { ok, dados } com os textos limpos, ou o erro com o
     campo e o motivo. Só as chaves conhecidas são lidas; o resto do
     pedido é ignorado. */
  function validar(dados) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return erro('feedback_invalido', { campo: 'dados' });
    var categoria = dados.categoria;
    if (typeof categoria !== 'string' || !Object.prototype.hasOwnProperty.call(CATEGORIAS, categoria)) {
      return erro('feedback_invalido', { campo: 'categoria', motivo: 'categoria' });
    }

    var saida = { categoria: categoria };
    var campos = categoria === 'bug' ? ['assunto', 'descricao', 'passos', 'esperado', 'observado'] : ['assunto', 'descricao'];
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i], bruto = dados[c];
      if (bruto === undefined || bruto === null) bruto = '';
      if (typeof bruto !== 'string') return erro('feedback_invalido', { campo: c, motivo: 'tipo' });
      var texto = c === 'assunto' ? linha(bruto) : limparTexto(bruto);
      if (MINIMOS[c] && texto.length < MINIMOS[c]) {
        return erro('feedback_invalido', { campo: c, motivo: texto ? 'curto' : 'vazio', minimo: MINIMOS[c] });
      }
      if (texto.length > LIMITES[c]) return erro('feedback_invalido', { campo: c, motivo: 'longo', limite: LIMITES[c] });
      saida[c] = texto;
    }

    var versao = typeof dados.versao === 'string' ? dados.versao.trim() : '';
    saida.versao = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(versao) ? versao : 'não informada';
    var pagina = typeof dados.pagina === 'string' ? linha(dados.pagina).slice(0, LIMITE_PAGINA) : '';
    saida.pagina = pagina || 'não informada';
    /* Só true identifica: "sim", 1 ou qualquer outra coisa é anônimo. */
    saida.identificar = dados.identificar === true;
    return { ok: true, dados: saida };
  }

  function webhookValido(url) { return typeof url === 'string' && WEBHOOK.test(url.trim()); }

  /* O endereço do pedido: sempre com ?wait=true, para o Discord devolver
     a mensagem criada em vez de só aceitar o pedido. */
  function enderecoDeEnvio(url) { return url.trim() + '?wait=true'; }

  function campo(nome, valor, emLinha) {
    return { name: nome, value: desarmar(valor), inline: !!emLinha };
  }

  /* montarMensagem(dados validados, { nome, data }) → o corpo do POST.
     `nome` só existe quando a pessoa pediu para aparecer. */
  function montarMensagem(d, contexto) {
    var cat = CATEGORIAS[d.categoria];
    var nome = d.identificar && contexto && contexto.nome ? linha(contexto.nome).slice(0, LIMITE_NOME) : '';
    var campos = [
      campo('Tipo', cat.rotulo, true),
      campo('Usuário', nome || 'Anônimo', true),
      campo('Versão', d.versao, true),
      campo('Página', d.pagina, false),
    ];
    if (d.categoria === 'bug') {
      if (d.passos) campos.push(campo('Passos para reproduzir', d.passos, false));
      if (d.esperado) campos.push(campo('Comportamento esperado', d.esperado, false));
      if (d.observado) campos.push(campo('Comportamento observado', d.observado, false));
    }
    var embed = {
      author: { name: 'Novo feedback — R.A.M.A.' },
      title: desarmar(d.assunto),
      description: desarmar(d.descricao),
      color: cat.cor,
      fields: campos,
      footer: { text: 'Enviado em ' + ((contexto && contexto.data) || '—') },
    };
    return {
      username: 'R.A.M.A. · Feedback',
      allowed_mentions: { parse: [] },
      embeds: [embed],
    };
  }

  /* Os caracteres que o Discord soma no limite de 6000 de um embed. */
  function tamanhoDoEmbed(e) {
    var n = (e.title || '').length + (e.description || '').length + ((e.footer && e.footer.text) || '').length + ((e.author && e.author.name) || '').length;
    (e.fields || []).forEach(function (f) { n += f.name.length + f.value.length; });
    return n;
  }

  /* Confere cada teto do Discord. Passou de algum, o envio NÃO sai: nada
     é cortado em silêncio. */
  function cabeNoDiscord(m) {
    var e = m.embeds[0];
    if (e.title.length > DISCORD.titulo || e.description.length > DISCORD.descricao) return false;
    if (e.footer.text.length > DISCORD.rodape || e.author.name.length > DISCORD.autor) return false;
    if (e.fields.length > DISCORD.campos) return false;
    for (var i = 0; i < e.fields.length; i++) {
      var f = e.fields[i];
      if (!f.value || f.name.length > DISCORD.campoNome || f.value.length > DISCORD.campoValor) return false;
    }
    return tamanhoDoEmbed(e) <= DISCORD.total;
  }

  /* A resposta do Discord → o que a tela recebe. Só 200 com a mensagem
     criada (ou 204, sem corpo) é entrega confirmada. */
  function lerResposta(status, texto, cabecalhos) {
    if (status === 200) {
      var msg = null;
      try { msg = JSON.parse(texto || 'null'); } catch (e) { msg = null; }
      return msg && typeof msg.id === 'string' ? { ok: true } : erro('feedback_falhou', { motivo: 'resposta' });
    }
    if (status === 204) return { ok: true };
    if (status === 429) {
      var segundos = 0;
      try { segundos = Number(JSON.parse(texto || '{}').retry_after) || 0; } catch (e) { segundos = 0; }
      if (!segundos && cabecalhos) segundos = Number(cabecalhos['Retry-After'] || cabecalhos['retry-after']) || 0;
      return erro('feedback_ocupado', { segundos: Math.max(1, Math.ceil(segundos || 5)) });
    }
    /* Webhook apagado, trocado ou sem permissão: tentar de novo não muda
       nada — é configuração, e quem administra precisa saber. */
    if (status === 401 || status === 403 || status === 404) return erro('feedback_indisponivel');
    return erro('feedback_falhou', { motivo: 'http' });
  }

  return {
    CATEGORIAS: CATEGORIAS, LIMITES: LIMITES, MINIMOS: MINIMOS, DISCORD: DISCORD,
    validar: validar, desarmar: desarmar, webhookValido: webhookValido, enderecoDeEnvio: enderecoDeEnvio,
    montarMensagem: montarMensagem, tamanhoDoEmbed: tamanhoDoEmbed, cabeNoDiscord: cabeNoDiscord, lerResposta: lerResposta,
  };
})();

/* ---------------------------------------------------------------------
   O FREIO
   ---------------------------------------------------------------------
   Contagens no CacheService (descartáveis, como as do CRIS e do resgate
   de código). A trava do script fica só pelo instante de ler e reservar
   — nunca durante a ida ao Discord, que não pode segurar quem está
   salvando ficha. A reserva é o que impede dois pedidos simultâneos da
   mesma conta de passarem os dois. */

function feedbackChaveConta(usuario) { return 'rama.feedback.conta.' + usuario.id; }
var FEEDBACK_CHAVE_GERAL = 'rama.feedback.geral';

function feedbackLerEstado(cache, chave, agora) {
  var e = null;
  try { e = JSON.parse(cache.get(chave) || 'null'); } catch (x) { e = null; }
  if (!e || typeof e.inicio !== 'number' || agora - e.inicio >= FEEDBACK_JANELA_SEGUNDOS) {
    e = { inicio: agora, n: 0, ultimo: (e && typeof e.ultimo === 'number') ? e.ultimo : 0, envio: 0 };
  }
  return e;
}

function feedbackGravarEstado(cache, chave, e, agora) {
  cache.put(chave, JSON.stringify(e), Math.max(60, FEEDBACK_JANELA_SEGUNDOS - (agora - e.inicio) + FEEDBACK_INTERVALO_SEGUNDOS));
}

function feedbackComTrava(fn) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(5000)) return { ok: false, erro: 'ocupado' };
  try { return fn(); } finally { trava.releaseLock(); }
}

/* Reserva um envio: conta antes de sair, para o pedido simultâneo ver.
   Devolve null quando pode seguir, ou o erro. */
function feedbackReservar(usuario) {
  return feedbackComTrava(function () {
    var cache = CacheService.getScriptCache();
    var agora = Math.floor(Date.now() / 1000);
    var conta = feedbackLerEstado(cache, feedbackChaveConta(usuario), agora);
    var geral = feedbackLerEstado(cache, FEEDBACK_CHAVE_GERAL, agora);

    if (conta.envio && agora - conta.envio < FEEDBACK_ENVIO_SEGUNDOS) return { ok: false, erro: 'feedback_em_andamento' };
    if (conta.ultimo && agora - conta.ultimo < FEEDBACK_INTERVALO_SEGUNDOS) {
      return { ok: false, erro: 'feedback_limite', segundos: FEEDBACK_INTERVALO_SEGUNDOS - (agora - conta.ultimo) };
    }
    if (conta.n >= FEEDBACK_LIMITE_CONTA) {
      return { ok: false, erro: 'feedback_limite', segundos: FEEDBACK_JANELA_SEGUNDOS - (agora - conta.inicio) };
    }
    if (geral.n >= FEEDBACK_LIMITE_GERAL) {
      return { ok: false, erro: 'feedback_limite', segundos: FEEDBACK_JANELA_SEGUNDOS - (agora - geral.inicio), geral: true };
    }

    conta.anterior = conta.ultimo;
    conta.n += 1; conta.ultimo = agora; conta.envio = agora;
    geral.n += 1;
    feedbackGravarEstado(cache, feedbackChaveConta(usuario), conta, agora);
    feedbackGravarEstado(cache, FEEDBACK_CHAVE_GERAL, geral, agora);
    return null;
  });
}

/* Fecha a reserva. Entregue: fica contada. Não entregue: é devolvida,
   e tentar de novo não espera o intervalo. */
function feedbackConcluir(usuario, entregue) {
  var r = feedbackComTrava(function () {
    var cache = CacheService.getScriptCache();
    var agora = Math.floor(Date.now() / 1000);
    var conta = feedbackLerEstado(cache, feedbackChaveConta(usuario), agora);
    conta.envio = 0;
    if (!entregue) {
      conta.n = Math.max(0, conta.n - 1);
      conta.ultimo = conta.anterior || 0;
      var geral = feedbackLerEstado(cache, FEEDBACK_CHAVE_GERAL, agora);
      geral.n = Math.max(0, geral.n - 1);
      feedbackGravarEstado(cache, FEEDBACK_CHAVE_GERAL, geral, agora);
    }
    delete conta.anterior;
    feedbackGravarEstado(cache, feedbackChaveConta(usuario), conta, agora);
    return { ok: true };
  });
  /* Sem a trava agora, a reserva expira sozinha (FEEDBACK_ENVIO_SEGUNDOS). */
  return r;
}

/* O id de operação é do navegador: a mesma intenção, repetida depois de
   uma resposta perdida, leva o mesmo id. Só aceito no formato que o
   site gera. */
function feedbackOperacao(corpo) {
  var op = corpo && corpo.operacaoId;
  return typeof op === 'string' && /^op-[A-Za-z0-9-]{8,80}$/.test(op) ? op : '';
}

function feedbackDataDeAgora() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm") + ' (horário de Brasília)';
}

/* Tira endereços de uma mensagem de erro antes de ela ir ao log: a
   exceção do UrlFetchApp pode trazer a URL inteira — com o token do
   webhook. */
function feedbackSemEndereco(msg) {
  return String(msg || '').replace(/https?:\/\/\S+/g, '[endereço]').slice(0, 300);
}

function acaoEnviarFeedback(corpo, usuario) {
  if (!usuario) return { ok: false, erro: 'sessao' };

  var v = RamaFeedbackCore.validar(corpo && corpo.dados);
  if (!v.ok) return v;

  var webhook = propriedade(FEEDBACK_PROPRIEDADE, '');
  if (!RamaFeedbackCore.webhookValido(webhook)) {
    if (webhook) console.error('R.A.M.A. enviar_feedback: ' + FEEDBACK_PROPRIEDADE + ' não é um webhook do Discord.');
    return { ok: false, erro: 'feedback_indisponivel' };
  }

  var cache = CacheService.getScriptCache();
  var op = feedbackOperacao(corpo);
  var chaveOp = op ? 'rama.feedback.op.' + usuario.id + '.' + op : '';
  if (chaveOp && cache.get(chaveOp) === 'entregue') return { ok: true, repetido: true };

  var mensagem = RamaFeedbackCore.montarMensagem(v.dados, {
    nome: usuario.nome || usuario.usuario,
    data: feedbackDataDeAgora(),
  });
  if (!RamaFeedbackCore.cabeNoDiscord(mensagem)) return { ok: false, erro: 'feedback_invalido', campo: 'descricao', motivo: 'formatado' };

  var recusa = feedbackReservar(usuario);
  if (recusa) return recusa;

  var resultado;
  try {
    var resposta = UrlFetchApp.fetch(RamaFeedbackCore.enderecoDeEnvio(webhook), {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(mensagem),
      followRedirects: false,
      muteHttpExceptions: true,
      validateHttpsCertificates: true,
    });
    var cabecalhos = {};
    try { cabecalhos = resposta.getHeaders ? resposta.getHeaders() || {} : {}; } catch (e) { cabecalhos = {}; }
    var status = resposta.getResponseCode();
    resultado = RamaFeedbackCore.lerResposta(status, resposta.getContentText('UTF-8'), cabecalhos);
    if (!resultado.ok) console.error('R.A.M.A. enviar_feedback: Discord respondeu HTTP ' + status);
  } catch (e) {
    var msg = feedbackSemEndereco((e && e.message) || e);
    console.error('R.A.M.A. enviar_feedback: ' + msg);
    /* Sem autorização de UrlFetchApp a implantação nunca alcança o
       Discord: é configuração, não uma falha passageira. */
    resultado = /permiss|autoriz|authoriz|external_request/i.test(msg)
      ? { ok: false, erro: 'feedback_indisponivel' }
      : { ok: false, erro: 'feedback_falhou', motivo: 'rede' };
  }

  feedbackConcluir(usuario, resultado.ok);
  if (resultado.ok && chaveOp) {
    try { cache.put(chaveOp, 'entregue', FEEDBACK_OPERACAO_SEGUNDOS); } catch (e) { /* a repetição seria só um aviso a mais */ }
  }
  return resultado.ok ? { ok: true } : resultado;
}

/* O Codigo.gs pergunta por esta função ao montar as rotas (rotaDe): com
   o arquivo instalado, a ação existe; sem ele, `acao_desconhecida`.
   Não entra no `lote`, que é só para leituras. */
function rotasDoFeedback() {
  return {
    enviar_feedback: { publica: false, fn: acaoEnviarFeedback },
  };
}
