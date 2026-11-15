/* =====================================================================
   R.A.M.A. — Pacotes de Homebrew (v9.6)
   ---------------------------------------------------------------------
   Um PACOTE é uma coleção que a conta monta com criações da própria
   biblioteca de Homebrew, para um sistema (ou Universal): nome,
   descrição, capa 2:3 e as ENTRADAS — cada uma uma CÓPIA dos dados da
   criação no momento em que entrou. Editar, ocultar ou apagar o
   original não muda o pacote; "Atualizar pela criação original" é uma
   ação explícita do dono.

   Importar um pacote cria cópias PRIVADAS na biblioteca de quem importa
   (registros novos de HOMEBREW, ids novos), com a procedência
   (`pacote: { id, entradaId, nome, rev }`). Não registra suplemento
   oficial nem liga regra opcional em ficha nenhuma.

   ---------------------------------------------------------------------
   QUEM ALCANÇA
   ---------------------------------------------------------------------
     dono        tudo: ler, editar, capa, visibilidade, código, excluir
     público     contas autenticadas acham na galeria, abrem pelo id e
                 importam — nunca editam
     privado     só o dono, ou quem apresenta o CÓDIGO gerado aqui. O id
                 sozinho não abre nada: capa, lista, detalhes e
                 importação respondem como se o pacote não existisse

   O código tem 16 símbolos de um alfabeto de 32 (80 bits), sai de
   novoSegredo() e é guardado só como HASH (pepper do servidor). Aparece
   em claro uma vez, na geração. Gerar outro invalida o anterior; revogar
   apaga; tornar privado um pacote público também apaga — só um novo
   compartilhamento deliberado abre o acesso de novo. Cada leitura e
   cada importação conferem o código outra vez.

   ---------------------------------------------------------------------
   ONDE MORA
   ---------------------------------------------------------------------
     PACOTES_HOMEBREW            metadados leves (+ descrição e opIds)
     PACOTES_HOMEBREW_ENTRADAS   uma linha por entrada (dadosJson)
     PACOTES_HOMEBREW_IMAGENS    a imagem copiada de uma criatura
     PACOTES_HOMEBREW_CAPAS      a capa recortada (320 × 480), em até
                                 duas células
     PACOTES_HOMEBREW_IMPORTACOES  quem já copiou qual entrada, e para
                                 qual registro da biblioteca

   `estado` = "montando" enquanto uma gravação troca as entradas: se a
   execução cair no meio, o pacote não aparece como válido para mais
   ninguém (o dono vê "incompleto" e salva de novo). `rev` + opId
   (opsJson / opCriacao) protegem de aba velha e de reenvio.
   ===================================================================== */

var LIMITE_ENTRADAS_PACOTE = 40;
var LIMITE_PACOTES_POR_CONTA = 30;
var LIMITE_IMPORTACAO_POR_VEZ = 40;
var MAX_NOME_PACOTE = 80;
var MAX_DESCRICAO_PACOTE = 1500;
var MAX_OPS_PACOTE = 30;
var MAX_CAPAS_POR_PEDIDO = 24;
var LARGURA_CAPA_PACOTE = 320;
var ALTURA_CAPA_PACOTE = 480;

/* Os tipos do Homebrew que um pacote aceita. Genéricos servem a todo
   sistema; ritual, só aos sistemas cuja ficha tem a aba Rituais (o mesmo
   que js/sistemas.js declara — testes/pacotes-backend.js confere);
   criatura, só ao sistema NATIVO dela (nunca convertida). */
var TIPOS_GENERICOS_PACOTE = ['item', 'arma', 'armadura', 'mochila', 'habilidade'];
var SISTEMAS_COM_RITUAIS = ['ordem', 'universal'];
var SISTEMAS_NATIVOS_DE_CRIATURA = ['oblivio', 'vampiro', 'goblins', 'tormenta20', 'ordem2'];
var ALFABETO_CODIGO_PACOTE = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function rotasDosPacotes() {
  return {
    listar_pacotes:       { publica: false, fn: acaoListarPacotes },
    ler_pacote:           { publica: false, fn: acaoLerPacote },
    abrir_pacote_codigo:  { publica: false, fn: acaoAbrirPacoteCodigo },
    ler_capas_pacotes:    { publica: false, fn: acaoLerCapasPacotes },
    salvar_pacote:        { publica: false, fn: acaoSalvarPacote },
    excluir_pacote:       { publica: false, fn: acaoExcluirPacote },
    codigo_pacote:        { publica: false, fn: acaoCodigoPacote },
    importar_pacote:      { publica: false, fn: acaoImportarPacote },
  };
}

/* ---------------------------------------------------------------------
   AUXILIARES
   --------------------------------------------------------------------- */

function pacotesProntos() {
  try {
    aba(ABAS.PACOTES_HOMEBREW); aba(ABAS.PACOTES_HOMEBREW_ENTRADAS); aba(ABAS.PACOTES_HOMEBREW_IMAGENS);
    aba(ABAS.PACOTES_HOMEBREW_CAPAS); aba(ABAS.PACOTES_HOMEBREW_IMPORTACOES);
    return true;
  } catch (erro) { return false; }
}
function instalacaoDePacotes() { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'PACOTES_HOMEBREW' }; }

function sistemaDoPacoteValido(id) {
  return SISTEMAS_DO_RAMA.some(function (s) { return s.id === id; });
}
function nomeDoSistemaDoPacote(id) {
  var s = SISTEMAS_DO_RAMA.filter(function (x) { return x.id === id; })[0];
  return s ? s.nome : String(id || 'Universal');
}
/* O sistema NATIVO de uma criatura da biblioteca — a mesma regra de
   resumoDeCriatura (Codigo.gs) e de RAMACriaturas.sistemaDe. */
function sistemaNativoDaCriatura(d) {
  if (!d || typeof d !== 'object') return 'universal';
  if (d.sistema === 'ordem' && d.ordem && typeof d.ordem === 'object') return 'ordem';
  if (SISTEMAS_NATIVOS_DE_CRIATURA.indexOf(d.sistema) >= 0) return d.sistema;
  return 'universal';
}
/* '' quando a criação cabe num pacote do sistema; senão, o motivo. */
function motivoDeIncompatibilidade(tipo, dados, sistema) {
  /* v9.7: Homebrew por sistema (com `modelo`): nativo só no sistema dele,
     Universal em qualquer pacote. O formato de antes segue a regra da v9.6. */
  if (dados && dados.modelo && typeof dados.modelo === 'object') {
    var doModelo = sistemaDoPacoteValido(String(dados.modelo.sistema)) ? String(dados.modelo.sistema) : 'universal';
    if (doModelo === 'universal' || doModelo === sistema) return '';
    return 'Criação de ' + nomeDoSistemaDoPacote(doModelo) + ': o pacote é de ' + nomeDoSistemaDoPacote(sistema) + ', e o R.A.M.A. não converte conteúdo entre sistemas.';
  }
  if (TIPOS_GENERICOS_PACOTE.indexOf(tipo) >= 0) return '';
  if (tipo === 'ritual') {
    return SISTEMAS_COM_RITUAIS.indexOf(sistema) >= 0 ? '' :
      'Rituais entram em pacotes de Ordem Paranormal ou Universal: a ficha de ' + nomeDoSistemaDoPacote(sistema) + ' não tem a aba Rituais.';
  }
  if (tipo === 'criatura') {
    var nativo = sistemaNativoDaCriatura(dados);
    return nativo === sistema ? '' :
      'Criatura de ' + nomeDoSistemaDoPacote(nativo) + ': o pacote é de ' + nomeDoSistemaDoPacote(sistema) + ', e o R.A.M.A. não converte fichas entre sistemas.';
  }
  return 'Tipo de criação desconhecido.';
}

function normalizarCodigoDePacote(texto) {
  return String(texto || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}
function codigoDePacoteValido(normal) {
  if (normal.length !== 16) return false;
  for (var i = 0; i < normal.length; i++) if (ALFABETO_CODIGO_PACOTE.indexOf(normal.charAt(i)) < 0) return false;
  return true;
}
function hashDoCodigoDePacote(normal) {
  var pepper = propriedade('RAMA_PEPPER', '');
  if (!pepper) throw new Error('RAMA_PEPPER não definido. Rode gerarPepper() uma vez.');
  return sha256Hex(pepper + '|codigo-pacote|' + normal);
}
/* 16 símbolos de 32 a partir de bytes do gerador seguro (256 % 32 = 0:
   sem viés). Agrupado de 4 em 4 para copiar e ditar. */
function novoCodigoDePacote() {
  var hex = novoSegredo();
  var s = '';
  for (var i = 0; i < 16; i++) s += ALFABETO_CODIGO_PACOTE.charAt(parseInt(hex.substr(i * 2, 2), 16) % 32);
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16);
}

function idSimples(v) { return /^[A-Za-z0-9_-]{4,80}$/.test(String(v || '')); }
function opIdValido(v) { return /^[A-Za-z0-9_-]{8,80}$/.test(String(v || '')); }
function listaDeIds(v, max) {
  if (!Array.isArray(v)) return null;
  var vistos = {}, saida = [];
  for (var i = 0; i < v.length; i++) {
    var id = String(v[i] || '');
    if (!idSimples(id)) return null;
    if (!vistos[id]) { vistos[id] = true; saida.push(id); }
  }
  return saida.length > max ? null : saida;
}

function entradasDoPacote(pacoteId) {
  return lerLeves(ABAS.PACOTES_HOMEBREW_ENTRADAS)
    .filter(function (e) { return String(e.pacoteId) === String(pacoteId); })
    .sort(function (a, b) { return (Number(a.ordem) || 0) - (Number(b.ordem) || 0); });
}

/* Quem pode LER este pacote. null = como se não existisse. */
function pacoteAlcancavel(pacoteId, usuario, codigo) {
  if (!idSimples(pacoteId)) return null;
  var p = linhaLeve(ABAS.PACOTES_HOMEBREW, 'id', pacoteId);
  if (!p) return null;
  if (meu(p, usuario)) return { pacote: p, dono: true, via: 'dono' };
  if (String(p.estado) !== 'pronto') return null;
  if (codigo) {
    var normal = normalizarCodigoDePacote(codigo);
    if (codigoDePacoteValido(normal) && p.codigoHash && iguaisEmTempoConstante(hashDoCodigoDePacote(normal), String(p.codigoHash))) {
      return { pacote: p, dono: false, via: 'codigo' };
    }
  }
  if (visibilidadeDe(p.visibilidade) === VIS_PUBLICO) return { pacote: p, dono: false, via: 'publico' };
  return null;
}

function pacoteParaCliente(p, usuario, extra) {
  var dono = meu(p, usuario);
  var d = {
    id: String(p.id), sistema: String(p.sistema || 'universal'), nome: String(p.nome || ''),
    visibilidade: visibilidadeDe(p.visibilidade), estado: String(p.estado || 'pronto'),
    rev: Number(p.rev) || 0, qtd: Number(p.qtd) || 0, tipos: lerJson(p.tiposJson, {}) || {},
    temCapa: String(p.temCapa) === 'sim', criadoEm: String(p.criadoEm || ''), atualizadoEm: String(p.atualizadoEm || ''),
    meu: dono,
  };
  if (dono) { d.temCodigo = !!p.codigoHash; d.codigoEm = p.codigoHash ? String(p.codigoEm || '') : ''; }
  if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
  return d;
}

/* As entradas que esta conta já copiou e cuja cópia ainda existe. */
function importadasPor(pacoteId, usuario) {
  var minhas = {};
  lerLeves(ABAS.HOMEBREW).forEach(function (h) { if (meu(h, usuario)) minhas[String(h.id)] = true; });
  var saida = {};
  lerLeves(ABAS.PACOTES_HOMEBREW_IMPORTACOES).forEach(function (r) {
    if (String(r.pacoteId) !== String(pacoteId) || String(r.userId) !== String(usuario.id)) return;
    if (minhas[String(r.homebrewId)]) saida[String(r.entradaId)] = { homebrewId: String(r.homebrewId), opId: String(r.opId || ''), linha: r._linha };
  });
  return saida;
}

function conteudoCompleto(alc, usuario) {
  var p = alc.pacote;
  var completo = acharPor(ABAS.PACOTES_HOMEBREW, 'id', p.id);
  var linhas = entradasDoPacote(p.id);
  var conteudo = lerCelulas(ABAS.PACOTES_HOMEBREW_ENTRADAS, linhas, 'dadosJson');
  var imagens = {};
  lerLeves(ABAS.PACOTES_HOMEBREW_IMAGENS).forEach(function (i) { if (String(i.pacoteId) === String(p.id)) imagens[String(i.entradaId)] = true; });
  var origens = {};
  if (alc.dono) lerLeves(ABAS.HOMEBREW).forEach(function (h) { if (meu(h, usuario)) origens[String(h.id)] = h; });
  var importadas = importadasPor(p.id, usuario);
  var entradas = linhas.map(function (e) {
    var dados = lerJson(conteudo[e._linha], {}) || {};
    var saida = {
      id: String(e.id), tipo: String(e.tipo), nome: String(e.nome || dados.nome || ''), ordem: Number(e.ordem) || 0,
      dados: dados, temImagem: !!imagens[String(e.id)], importada: !!importadas[String(e.id)],
    };
    if (alc.dono) {
      var o = e.origemId ? origens[String(e.origemId)] : null;
      saida.origemExiste = !!o;
      saida.origemMudou = !!(o && String(o.atualizadoEm || '') > String(e.origemAtualizadaEm || ''));
      saida.copiadoEm = String(e.copiadoEm || '');
    }
    return saida;
  });
  return pacoteParaCliente(p, usuario, {
    descricao: String((completo && completo.descricao) || ''),
    entradas: entradas, via: alc.via,
  });
}

/* ---------------------------------------------------------------------
   LISTAR, LER, ABRIR COM CÓDIGO, CAPAS
   --------------------------------------------------------------------- */

/* escopo 'meus' (padrão): os pacotes da conta, qualquer estado.
   'publicos': só os públicos e prontos de OUTRAS contas. Privado alheio
   não entra em lista nem contagem. Sem capa e sem conteúdo: leve. */
function acaoListarPacotes(corpo, usuario) {
  if (!pacotesProntos()) return instalacaoDePacotes();
  var escopo = String(corpo.escopo || 'meus') === 'publicos' ? 'publicos' : 'meus';
  var lista = lerLeves(ABAS.PACOTES_HOMEBREW).filter(function (p) {
    var dono = meu(p, usuario);
    if (escopo === 'meus') return dono;
    return !dono && visibilidadeDe(p.visibilidade) === VIS_PUBLICO && String(p.estado) === 'pronto';
  }).map(function (p) { return pacoteParaCliente(p, usuario); })
    .sort(function (a, b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); });
  return { ok: true, dados: lista };
}

function acaoLerPacote(corpo, usuario) {
  if (!pacotesProntos()) return instalacaoDePacotes();
  var alc = pacoteAlcancavel(corpo.pacoteId, usuario, corpo.codigo);
  if (!alc) return { ok: false, erro: 'nao_encontrado' };
  return { ok: true, rev: Number(alc.pacote.rev) || 0, dados: conteudoCompleto(alc, usuario) };
}

/* Colar o código: acha o pacote pelo HASH. Código inválido, revogado ou
   trocado responde igual a "não existe" — nunca revela que há um pacote
   privado ali. */
function acaoAbrirPacoteCodigo(corpo, usuario) {
  if (!pacotesProntos()) return instalacaoDePacotes();
  var normal = normalizarCodigoDePacote(corpo.codigo);
  if (!codigoDePacoteValido(normal)) return { ok: false, erro: 'codigo_invalido' };
  var hash = hashDoCodigoDePacote(normal);
  var p = lerLeves(ABAS.PACOTES_HOMEBREW).filter(function (x) {
    return x.codigoHash && iguaisEmTempoConstante(String(x.codigoHash), hash);
  })[0];
  if (!p || (String(p.estado) !== 'pronto' && !meu(p, usuario))) return { ok: false, erro: 'codigo_invalido' };
  var alc = { pacote: p, dono: meu(p, usuario), via: meu(p, usuario) ? 'dono' : 'codigo' };
  return { ok: true, rev: Number(p.rev) || 0, dados: conteudoCompleto(alc, usuario) };
}

/* As capas dos cartões visíveis, numa viagem. Cada uma passa pela MESMA
   conferência do pacote; a que não passa simplesmente não volta. */
function acaoLerCapasPacotes(corpo, usuario) {
  if (!pacotesProntos()) return instalacaoDePacotes();
  var ids = listaDeIds(corpo.pacoteIds, MAX_CAPAS_POR_PEDIDO);
  if (!ids) return { ok: false, erro: 'dados_invalidos' };
  var alcancaveis = ids.filter(function (id) { return !!pacoteAlcancavel(id, usuario, corpo.codigo); });
  var saida = {};
  if (!alcancaveis.length) return { ok: true, dados: saida };
  var querido = {}; alcancaveis.forEach(function (id) { querido[id] = true; });
  var linhas = lerLeves(ABAS.PACOTES_HOMEBREW_CAPAS).filter(function (c) { return querido[String(c.pacoteId)]; });
  var imagens = imagensDasLinhas(ABAS.PACOTES_HOMEBREW_CAPAS, linhas, 'imagem');
  linhas.forEach(function (c) { if (imagens[c._linha]) saida[String(c.pacoteId)] = imagens[c._linha]; });
  return { ok: true, dados: saida };
}

/* ---------------------------------------------------------------------
   SALVAR (criar ou atualizar)
   ---------------------------------------------------------------------
   dados: { sistema, nome, descricao, visibilidade }
   conteudo: { manter: [entradaId], adicionar: [homebrewId],
               atualizar: [entradaId] }   — ids, NUNCA o JSON: o servidor
               lê as criações da biblioteca do dono e copia daqui
   capa: { acao: 'trocar', imagem } | { acao: 'remover' } | ausente
   --------------------------------------------------------------------- */
function acaoSalvarPacote(corpo, usuario) {
  if (!opIdValido(corpo.opId)) return { ok: false, erro: 'dados_invalidos' };
  var d = corpo.dados && typeof corpo.dados === 'object' ? corpo.dados : null;
  if (!d) return { ok: false, erro: 'dados_invalidos' };
  var sistema = String(d.sistema || '');
  if (!sistemaDoPacoteValido(sistema)) return { ok: false, erro: 'dados_invalidos', detalhe: 'sistema' };
  var nome = String(d.nome || '').trim().slice(0, MAX_NOME_PACOTE);
  if (!nome) return { ok: false, erro: 'dados_invalidos', detalhe: 'nome' };
  var descricao = String(d.descricao || '').slice(0, MAX_DESCRICAO_PACOTE);
  var visibilidade = visibilidadeDe(d.visibilidade);
  var c = corpo.conteudo && typeof corpo.conteudo === 'object' ? corpo.conteudo : null;
  /* Folga na leitura (200): passar do limite responde 'limite', com o
     número, e não 'dados_invalidos'. */
  var manterIds = c ? listaDeIds(c.manter || [], 200) : null;
  var adicionarIds = c ? listaDeIds(c.adicionar || [], 200) : null;
  var atualizarIds = c ? listaDeIds(c.atualizar || [], 200) : null;
  if (c && (!manterIds || !adicionarIds || !atualizarIds)) return { ok: false, erro: 'dados_invalidos', detalhe: 'conteudo' };
  var capa = corpo.capa && typeof corpo.capa === 'object' ? corpo.capa : null;
  if (capa && capa.acao === 'trocar') {
    var img = String(capa.imagem || '');
    if (img.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos', detalhe: 'capa' };
    if (img.length > MAX_IMAGEM) return { ok: false, erro: 'dados_grandes', detalhe: 'capa' };
  }
  if (!pacotesProntos()) return instalacaoDePacotes();

  return comTrava(function () {
    var agora = new Date().toISOString();
    var pacote = null;
    if (corpo.pacoteId) {
      pacote = acharPor(ABAS.PACOTES_HOMEBREW, 'id', String(corpo.pacoteId));
      if (!pacote || !meu(pacote, usuario)) return { ok: false, erro: 'nao_encontrado' };
      var feitas = lerJson(pacote.opsJson, []) || [];
      if (feitas.indexOf(corpo.opId) >= 0) return { ok: true, repetida: true, rev: Number(pacote.rev) || 0, dados: pacoteParaCliente(pacote, usuario) };
      if (Number(corpo.rev) !== (Number(pacote.rev) || 0)) return { ok: false, erro: 'conflito', rev: Number(pacote.rev) || 0 };
    } else {
      var meus = lerLeves(ABAS.PACOTES_HOMEBREW).filter(function (p) { return meu(p, usuario); });
      var mesmo = meus.filter(function (p) { return String(p.opCriacao) === String(corpo.opId); })[0];
      if (mesmo) return { ok: true, repetida: true, rev: Number(mesmo.rev) || 0, dados: pacoteParaCliente(mesmo, usuario) };
      if (meus.length >= LIMITE_PACOTES_POR_CONTA) return { ok: false, erro: 'limite', limite: LIMITE_PACOTES_POR_CONTA };
      if (!c) return { ok: false, erro: 'dados_invalidos', detalhe: 'conteudo' };
    }

    /* ---- o conteúdo final, conferido ANTES de gravar qualquer coisa ---- */
    var existentes = pacote ? entradasDoPacote(pacote.id) : [];
    var porId = {}; existentes.forEach(function (e) { porId[String(e.id)] = e; });
    var plano = null;
    if (c) {
      for (var i = 0; i < manterIds.length; i++) if (!porId[manterIds[i]]) return { ok: false, erro: 'dados_invalidos', detalhe: 'entrada_desconhecida' };
      for (var j = 0; j < atualizarIds.length; j++) if (manterIds.indexOf(atualizarIds[j]) < 0) return { ok: false, erro: 'dados_invalidos', detalhe: 'atualizar_fora' };
      var origensMantidas = {};
      manterIds.forEach(function (id) { if (porId[id].origemId) origensMantidas[String(porId[id].origemId)] = true; });
      var novosIds = adicionarIds.filter(function (id) { return !origensMantidas[id]; });
      if (manterIds.length + novosIds.length > LIMITE_ENTRADAS_PACOTE) return { ok: false, erro: 'limite', detalhe: 'entradas', limite: LIMITE_ENTRADAS_PACOTE };
      if (manterIds.length + novosIds.length < 1) return { ok: false, erro: 'dados_invalidos', detalhe: 'vazio' };

      /* As criações de origem: só da biblioteca de QUEM PEDE. */
      var minhas = {};
      lerLeves(ABAS.HOMEBREW).forEach(function (h) { if (meu(h, usuario)) minhas[String(h.id)] = h; });
      var precisaOrigem = novosIds.concat(atualizarIds.map(function (id) { return String(porId[id].origemId || ''); }));
      for (var k = 0; k < precisaOrigem.length; k++) {
        if (!precisaOrigem[k] || !minhas[precisaOrigem[k]]) return { ok: false, erro: 'nao_encontrado', detalhe: 'criacao' };
      }
      var origensUsadas = precisaOrigem.map(function (id) { return minhas[id]; });
      var jsonOrigem = lerCelulas(ABAS.HOMEBREW, origensUsadas, 'dadosJson');
      function dadosDaOrigem(h) {
        var dd = homebrewParaCliente(h, usuario, jsonOrigem[h._linha]);
        delete dd.meu; delete dd.visibilidade; delete dd.criadoEm; delete dd.atualizadoEm;
        return dd;
      }
      /* As mantidas que não serão atualizadas: o conteúdo que já está no
         pacote decide a compatibilidade (o sistema pode ter mudado). */
      var mantidasSemAtualizar = manterIds.filter(function (id) { return atualizarIds.indexOf(id) < 0; });
      var jsonMantidas = lerCelulas(ABAS.PACOTES_HOMEBREW_ENTRADAS, mantidasSemAtualizar.map(function (id) { return porId[id]; }), 'dadosJson');
      var incompat = [];
      mantidasSemAtualizar.forEach(function (id) {
        var e = porId[id];
        var m = motivoDeIncompatibilidade(String(e.tipo), lerJson(jsonMantidas[e._linha], {}), sistema);
        if (m) incompat.push({ id: id, nome: String(e.nome), motivo: m });
      });
      var copias = {};
      novosIds.concat(atualizarIds).forEach(function (id) {
        var h = minhas[porId[id] ? String(porId[id].origemId) : id];
        var dd = dadosDaOrigem(h);
        var m = motivoDeIncompatibilidade(String(dd.tipo), dd, sistema);
        if (m) incompat.push({ id: id, nome: String(dd.nome), motivo: m });
        var json = JSON.stringify(dd);
        if (json.length > MAX_CELULA) incompat.push({ id: id, nome: String(dd.nome), motivo: 'Grande demais para uma entrada de pacote.' });
        copias[id] = { origem: h, dados: dd, json: json };
      });
      if (incompat.length) return { ok: false, erro: 'incompativel', itens: incompat };
      plano = { manter: manterIds, atualizar: atualizarIds, novos: novosIds, copias: copias };
    }

    /* ---- a linha do pacote: "montando" enquanto as entradas mudam ---- */
    var id = pacote ? String(pacote.id) : novoId();
    if (!pacote) {
      pacote = {
        id: id, ownerId: usuario.id, sistema: sistema, nome: nome, visibilidade: visibilidade, estado: 'montando',
        rev: 0, qtd: 0, tiposJson: '{}', temCapa: '', codigoHash: '', codigoEm: '', opCriacao: String(corpo.opId),
        criadoEm: agora, atualizadoEm: agora, descricao: descricao, opsJson: '[]',
      };
      inserir(ABAS.PACOTES_HOMEBREW, pacote);
      pacote = acharPor(ABAS.PACOTES_HOMEBREW, 'id', id);
    } else if (plano) {
      pacote.estado = 'montando';
      atualizarLinha(ABAS.PACOTES_HOMEBREW, pacote._linha, pacote);
    }

    if (plano) {
      /* Sai o que não ficou (com a imagem copiada). */
      var sair = existentes.filter(function (e) { return plano.manter.indexOf(String(e.id)) < 0; });
      if (sair.length) {
        var idsSair = {}; sair.forEach(function (e) { idsSair[String(e.id)] = true; });
        apagarLinhas(ABAS.PACOTES_HOMEBREW_ENTRADAS, sair.map(function (e) { return e._linha; }));
        var imgsSair = lerLeves(ABAS.PACOTES_HOMEBREW_IMAGENS).filter(function (x) { return idsSair[String(x.entradaId)]; });
        if (imgsSair.length) apagarLinhas(ABAS.PACOTES_HOMEBREW_IMAGENS, imgsSair.map(function (x) { return x._linha; }));
      }
      var ordem = 0;
      plano.manter.forEach(function (eid) {
        ordem++;
        var linha = acharPor(ABAS.PACOTES_HOMEBREW_ENTRADAS, 'id', eid);
        if (!linha) return;
        linha.ordem = ordem;
        if (plano.atualizar.indexOf(eid) >= 0) {
          var cp = plano.copias[eid];
          linha.tipo = String(cp.dados.tipo); linha.nome = String(cp.dados.nome || '').slice(0, 120);
          linha.copiadoEm = agora; linha.origemAtualizadaEm = String(cp.origem.atualizadoEm || '');
          linha.dadosJson = cp.json;
          copiarImagemParaEntrada(cp, eid, id, usuario, agora);
        }
        atualizarLinha(ABAS.PACOTES_HOMEBREW_ENTRADAS, linha._linha, linha);
      });
      plano.novos.forEach(function (hid) {
        ordem++;
        var cp = plano.copias[hid];
        var eid = novoId();
        inserir(ABAS.PACOTES_HOMEBREW_ENTRADAS, {
          id: eid, pacoteId: id, ownerId: usuario.id, tipo: String(cp.dados.tipo), nome: String(cp.dados.nome || '').slice(0, 120),
          ordem: ordem, origemId: hid, copiadoEm: agora, origemAtualizadaEm: String(cp.origem.atualizadoEm || ''), dadosJson: cp.json,
        });
        copiarImagemParaEntrada(cp, eid, id, usuario, agora);
      });
    }

    /* ---- a capa ---- */
    var temCapa = String(pacote.temCapa) === 'sim';
    if (capa && capa.acao === 'trocar') {
      var linhaCapa = linhaLeve(ABAS.PACOTES_HOMEBREW_CAPAS, 'pacoteId', id);
      var reg = linhaCapa ? acharPor(ABAS.PACOTES_HOMEBREW_CAPAS, 'pacoteId', id) : { pacoteId: id };
      reg.ownerId = usuario.id; reg.atualizadoEm = agora; reg.largura = LARGURA_CAPA_PACOTE; reg.altura = ALTURA_CAPA_PACOTE;
      if (!aplicarImagem(ABAS.PACOTES_HOMEBREW_CAPAS, reg, 'imagem', String(capa.imagem))) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      if (linhaCapa) atualizarLinha(ABAS.PACOTES_HOMEBREW_CAPAS, reg._linha, reg); else inserir(ABAS.PACOTES_HOMEBREW_CAPAS, reg);
      temCapa = true;
    } else if (capa && capa.acao === 'remover') {
      var velha = linhaLeve(ABAS.PACOTES_HOMEBREW_CAPAS, 'pacoteId', id);
      if (velha) apagarLinha(ABAS.PACOTES_HOMEBREW_CAPAS, velha._linha);
      temCapa = false;
    }

    /* ---- fecha: pronto, com a revisão nova ---- */
    var finais = entradasDoPacote(id);
    var tipos = {};
    finais.forEach(function (e) { tipos[String(e.tipo)] = (tipos[String(e.tipo)] || 0) + 1; });
    pacote = acharPor(ABAS.PACOTES_HOMEBREW, 'id', id);
    var antes = visibilidadeDe(pacote.visibilidade);
    /* Público → privado: fecha o acesso pelo id E invalida o código
       antigo. Só um novo compartilhamento deliberado reabre. */
    if (antes === VIS_PUBLICO && visibilidade === VIS_PRIVADO) { pacote.codigoHash = ''; pacote.codigoEm = ''; }
    var ops = lerJson(pacote.opsJson, []) || [];
    ops.push(String(corpo.opId));
    if (ops.length > MAX_OPS_PACOTE) ops = ops.slice(ops.length - MAX_OPS_PACOTE);
    pacote.sistema = sistema; pacote.nome = nome; pacote.descricao = descricao; pacote.visibilidade = visibilidade;
    pacote.qtd = finais.length; pacote.tiposJson = JSON.stringify(tipos); pacote.temCapa = temCapa ? 'sim' : '';
    pacote.estado = 'pronto'; pacote.rev = (Number(pacote.rev) || 0) + 1; pacote.atualizadoEm = agora;
    pacote.opsJson = JSON.stringify(ops);
    atualizarLinha(ABAS.PACOTES_HOMEBREW, pacote._linha, pacote);
    return { ok: true, rev: pacote.rev, dados: pacoteParaCliente(pacote, usuario) };
  });
}

/* A imagem de uma criatura vai junto (cópia, não vínculo). */
function copiarImagemParaEntrada(cp, entradaId, pacoteId, usuario, agora) {
  var velha = linhaLeve(ABAS.PACOTES_HOMEBREW_IMAGENS, 'entradaId', entradaId);
  if (velha) apagarLinha(ABAS.PACOTES_HOMEBREW_IMAGENS, velha._linha);
  if (String(cp.dados.tipo) !== 'criatura') return;
  var origem = acharPor(ABAS.CRIATURAS_IMAGENS, 'criaturaId', String(cp.origem.id));
  var imagem = imagemDe(origem, 'imagem');
  if (!imagem) return;
  var reg = { entradaId: entradaId, pacoteId: pacoteId, atualizadoEm: agora };
  if (aplicarImagem(ABAS.PACOTES_HOMEBREW_IMAGENS, reg, 'imagem', imagem)) inserir(ABAS.PACOTES_HOMEBREW_IMAGENS, reg);
}

/* ---------------------------------------------------------------------
   EXCLUIR, CÓDIGO
   --------------------------------------------------------------------- */
function acaoExcluirPacote(corpo, usuario) {
  if (!pacotesProntos()) return instalacaoDePacotes();
  return comTrava(function () {
    var p = idSimples(corpo.pacoteId) ? linhaLeve(ABAS.PACOTES_HOMEBREW, 'id', corpo.pacoteId) : null;
    if (!p || !meu(p, usuario)) return { ok: false, erro: 'nao_encontrado' };
    var id = String(p.id);
    apagarLinha(ABAS.PACOTES_HOMEBREW, p._linha);
    var de = function (def, col) { return lerLeves(def).filter(function (x) { return String(x[col]) === id; }).map(function (x) { return x._linha; }); };
    apagarLinhas(ABAS.PACOTES_HOMEBREW_ENTRADAS, de(ABAS.PACOTES_HOMEBREW_ENTRADAS, 'pacoteId'));
    apagarLinhas(ABAS.PACOTES_HOMEBREW_IMAGENS, de(ABAS.PACOTES_HOMEBREW_IMAGENS, 'pacoteId'));
    apagarLinhas(ABAS.PACOTES_HOMEBREW_CAPAS, de(ABAS.PACOTES_HOMEBREW_CAPAS, 'pacoteId'));
    /* Os recibos de importação saem; as CÓPIAS na biblioteca de quem
       importou são registros dessas contas e ficam. */
    apagarLinhas(ABAS.PACOTES_HOMEBREW_IMPORTACOES, de(ABAS.PACOTES_HOMEBREW_IMPORTACOES, 'pacoteId'));
    return { ok: true };
  });
}

/* tipo 'gerar' (também "gerar novo": invalida o anterior) ou 'revogar'
   (`acao` é o nome da rota). O código em claro só existe nesta resposta. */
function acaoCodigoPacote(corpo, usuario) {
  if (!pacotesProntos()) return instalacaoDePacotes();
  var acao = String(corpo.tipo || '');
  if (acao !== 'gerar' && acao !== 'revogar') return { ok: false, erro: 'dados_invalidos' };
  return comTrava(function () {
    var p = idSimples(corpo.pacoteId) ? acharPor(ABAS.PACOTES_HOMEBREW, 'id', String(corpo.pacoteId)) : null;
    if (!p || !meu(p, usuario)) return { ok: false, erro: 'nao_encontrado' };
    var codigo = '';
    if (acao === 'gerar') {
      codigo = novoCodigoDePacote();
      p.codigoHash = hashDoCodigoDePacote(normalizarCodigoDePacote(codigo));
      p.codigoEm = new Date().toISOString();
    } else {
      p.codigoHash = ''; p.codigoEm = '';
    }
    atualizarLinha(ABAS.PACOTES_HOMEBREW, p._linha, p);
    var r = { ok: true, dados: pacoteParaCliente(p, usuario) };
    if (codigo) r.dados.codigo = codigo;
    return r;
  });
}

/* ---------------------------------------------------------------------
   IMPORTAR
   ---------------------------------------------------------------------
   { pacoteId, codigo?, rev, opId, entradas: [entradaId] }

   A revisão é a da PRÉVIA: se o dono mudou o pacote depois, a resposta é
   'pacote_mudou' (com a revisão nova) e nada é copiado — a tela pede para
   revisar o conteúdo novo. Cada entrada é independente: a que falha
   volta em `falhas` e as outras entram. Repetir o mesmo pedido (resposta
   perdida) não duplica: o recibo da entrada já aponta para a cópia. Uma
   cópia que a pessoa apagou deixa de contar, e a entrada pode vir de novo.
   --------------------------------------------------------------------- */
function acaoImportarPacote(corpo, usuario) {
  if (!opIdValido(corpo.opId)) return { ok: false, erro: 'dados_invalidos' };
  var pedidas = listaDeIds(corpo.entradas, LIMITE_IMPORTACAO_POR_VEZ);
  if (!pedidas || !pedidas.length) return { ok: false, erro: 'dados_invalidos' };
  if (!pacotesProntos()) return instalacaoDePacotes();

  return comTrava(function () {
    var alc = pacoteAlcancavel(corpo.pacoteId, usuario, corpo.codigo);
    if (!alc) return { ok: false, erro: 'nao_encontrado' };
    var p = alc.pacote;
    if (String(p.estado) !== 'pronto') return { ok: false, erro: 'nao_encontrado' };
    if (Number(corpo.rev) !== (Number(p.rev) || 0)) return { ok: false, erro: 'pacote_mudou', rev: Number(p.rev) || 0 };

    var linhas = entradasDoPacote(p.id);
    var porId = {}; linhas.forEach(function (e) { porId[String(e.id)] = e; });
    var ja = importadasPor(p.id, usuario);
    var recibosVelhos = lerLeves(ABAS.PACOTES_HOMEBREW_IMPORTACOES).filter(function (r) {
      return String(r.pacoteId) === String(p.id) && String(r.userId) === String(usuario.id) && !ja[String(r.entradaId)];
    });
    var conteudo = lerCelulas(ABAS.PACOTES_HOMEBREW_ENTRADAS, pedidas.filter(function (id) { return porId[id] && !ja[id]; }).map(function (id) { return porId[id]; }), 'dadosJson');
    var completo = acharPor(ABAS.PACOTES_HOMEBREW, 'id', p.id);
    var saida = { copiados: [], existentes: [], falhas: [] };
    var agora = new Date().toISOString();

    pedidas.forEach(function (eid) {
      var e = porId[eid];
      if (!e) { saida.falhas.push({ entradaId: eid, nome: '', motivo: 'Não está mais no pacote.' }); return; }
      if (ja[eid]) {
        (ja[eid].opId === String(corpo.opId) ? saida.copiados : saida.existentes).push({ entradaId: eid, homebrewId: ja[eid].homebrewId, nome: String(e.nome) });
        return;
      }
      try {
        var dados = lerJson(conteudo[e._linha], null);
        if (!dados || typeof dados !== 'object') throw new Error('conteúdo ilegível');
        var tipo = TIPOS_HOMEBREW.indexOf(dados.tipo) >= 0 ? dados.tipo : String(e.tipo);
        delete dados.id;
        dados.tipo = tipo;
        dados.visibilidade = VIS_PRIVADO;
        dados.pacote = { id: String(p.id), entradaId: eid, nome: String(completo ? completo.nome : p.nome).slice(0, MAX_NOME_PACOTE), rev: Number(p.rev) || 0, importadoEm: agora };
        var json = JSON.stringify(dados);
        if (json.length > MAX_CELULA) { saida.falhas.push({ entradaId: eid, nome: String(e.nome), motivo: 'Grande demais para a biblioteca.' }); return; }
        var hid = novoId();
        inserir(ABAS.HOMEBREW, {
          id: hid, ownerId: usuario.id, tipo: tipo, nome: String(dados.nome || e.nome || 'Criação').trim().slice(0, 120) || 'Criação',
          visibilidade: VIS_PRIVADO, criadoEm: agora, atualizadoEm: agora, rev: 1, dadosJson: json,
        });
        if (tipo === 'criatura') {
          var imgEntrada = acharPor(ABAS.PACOTES_HOMEBREW_IMAGENS, 'entradaId', eid);
          var imagem = imagemDe(imgEntrada, 'imagem');
          if (imagem) {
            var reg = { criaturaId: hid, ownerId: usuario.id, atualizadoEm: agora };
            if (aplicarImagem(ABAS.CRIATURAS_IMAGENS, reg, 'imagem', imagem)) inserir(ABAS.CRIATURAS_IMAGENS, reg);
          }
        }
        inserir(ABAS.PACOTES_HOMEBREW_IMPORTACOES, {
          id: novoId(), pacoteId: String(p.id), entradaId: eid, userId: String(usuario.id), homebrewId: hid, opId: String(corpo.opId), criadoEm: agora,
        });
        saida.copiados.push({ entradaId: eid, homebrewId: hid, nome: String(dados.nome || e.nome) });
      } catch (erro) {
        saida.falhas.push({ entradaId: eid, nome: String(e.nome), motivo: 'Não foi possível copiar agora. Tente de novo.' });
      }
    });

    /* Recibos de cópias que a pessoa apagou: saem (a entrada pode vir de
       novo, e o recibo novo já foi gravado acima). */
    var reimportadas = {}; saida.copiados.forEach(function (x) { reimportadas[x.entradaId] = true; });
    var limpar = recibosVelhos.filter(function (r) { return reimportadas[String(r.entradaId)]; });
    if (limpar.length) apagarLinhas(ABAS.PACOTES_HOMEBREW_IMPORTACOES, limpar.map(function (r) { return r._linha; }));
    return { ok: true, rev: Number(p.rev) || 0, dados: saida };
  });
}
