/* =====================================================================
   R.A.M.A. — os sistemas de RPG (v4.0)
   =====================================================================
   O R.A.M.A. é a plataforma; cada sistema de RPG é um módulo dela. Este
   arquivo é o NÚCLEO que conhece os módulos: o registro central, as
   regras de compatibilidade dos registros antigos e as portas por onde
   o resto do backend pede um comportamento de sistema.

   O QUE É DO NÚCLEO (Codigo.gs, Campanhas.gs, Dados.gs, este arquivo):
   sessão, contas, permissões, compartilhamento, armazenamento em blocos,
   pastas, Homebrew, temas, e a estrutura da campanha — participantes,
   personagens vinculados, rolagens, documentos, notas, capa, marcas e o
   rastreador de combate (ordem, turno, rodada).

   O QUE É DE CADA SISTEMA (um arquivo por sistema):
     Ordem.gs      Ordem Paranormal: resumo de PV/PE/SAN/PD, ajuste de
                   recurso, condições e efeitos contados por turno,
                   Hexatombe, Hacking, perigos complexos e Sincronia.
     Oblivio.gs    Oblívio: a mesa da Testemunha e as operações entre
                   Personas.
     Universal.gs  o modelo flexível do R.A.M.A.: atributos e status
                   livres no painel da mesa.

   Nenhum sistema é o padrão dos outros. Cada arquivo de sistema define
   uma função `sistema<Nome>()` que devolve os ganchos dele (ver
   MODULOS_DE_SISTEMA); o núcleo pergunta "qual é o sistema desta ficha
   / desta campanha" aqui e chama o gancho do sistema certo. Um arquivo
   de sistema ausente não derruba nada: as fichas dele continuam abrindo
   e sendo gravadas pelo núcleo, e as ferramentas dele respondem
   'acao_desconhecida' até o arquivo ser instalado.

   Um sistema novo entra assim: uma linha em SISTEMAS_DO_RAMA (e a mesma
   em js/sistemas.js — testes/sistemas-backend.js confere), um arquivo
   com `sistema<Nome>()` e uma linha em MODULOS_DE_SISTEMA.
   ===================================================================== */

/* O registro. É o que o núcleo sabe de cada sistema MESMO sem o arquivo
   dele instalado: o nome, o arquivo, as ferramentas de campanha que ele
   traz sempre e as mecânicas opcionais que o mestre liga e desliga.

     ferramentas   chaves das ferramentas da mesa que o sistema usa:
                   'combate' (o rastreador de combate do núcleo), e as
                   próprias, como 'oblivio' (a mesa da Testemunha).
     mecanicas     mecânicas opcionais de suplemento, cada uma com o
                   próprio "ligada" guardado na aba dela. */
var SISTEMAS_DO_RAMA = [
  { id: 'ordem', nome: 'Ordem Paranormal', arquivo: 'Ordem.gs',
    ferramentas: ['combate', 'condicoes', 'sincronia'], mecanicas: ['hexatombe', 'hacking', 'perigos'] },
  { id: 'oblivio', nome: 'Oblívio', arquivo: 'Oblivio.gs',
    ferramentas: ['oblivio'], mecanicas: [] },
  { id: 'universal', nome: 'Universal', arquivo: 'Universal.gs',
    ferramentas: ['combate'], mecanicas: [] },
];

/* Os ganchos de cada sistema, pedidos ao arquivo dele só quando usados:
   o Apps Script avalia os arquivos numa ordem que não controlamos, e
   uma tabela montada no carregamento poderia apontar para funções que
   ainda não existem. */
var MODULOS_DE_SISTEMA = {
  ordem: function () { return typeof sistemaOrdem === 'function' ? sistemaOrdem() : null; },
  oblivio: function () { return typeof sistemaOblivio === 'function' ? sistemaOblivio() : null; },
  universal: function () { return typeof sistemaUniversal === 'function' ? sistemaUniversal() : null; },
};

/* ---------------------------------------------------------------------
   AS REGRAS DE COMPATIBILIDADE — os únicos lugares que decidem o
   sistema de um registro que não o diz. São exceções históricas,
   escritas aqui de propósito, e NUNCA o padrão de um registro novo:
   ficha nova nasce com `tipoFicha`, campanha nova com `sistema`.
   --------------------------------------------------------------------- */

/* Ficha sem tipoFicha: gravada antes do campo existir (v2.x), quando o
   modelo flexível era o único. É o mesmo que o site faz (js/ficha.js). */
var SISTEMA_DAS_FICHAS_ANTIGAS = 'universal';

/* Campanha sem `sistema`: criada antes da v4.0. Todas as ferramentas de
   mesa que existiam eram de Ordem Paranormal, menos a mesa de Oblívio
   (v3.0), que se ligava numa chave da própria aba. Com essa chave
   ligada, a campanha joga Oblívio; sem ela, Ordem. Ler não grava nada:
   o sistema só fica escrito quando o mestre salva as configurações. */
function sistemaDeCampanhaAntiga(campanhaId) {
  return mesaDeOblivioLigadaNaV3(campanhaId) ? 'oblivio' : 'ordem';
}

/* A chave da v3.0 (CAMPANHA_OBLIVIO.ativo), lida sem o Oblivio.gs. */
function mesaDeOblivioLigadaNaV3(campanhaId) {
  if (!ABAS.CAMPANHA_OBLIVIO) return false;
  try {
    var leve = lerLeves(ABAS.CAMPANHA_OBLIVIO).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

/* --------------------------------------------------------------------- */

function idDeSistema(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim().toLowerCase().slice(0, 40);
}

function sistemaDoRegistro(id) {
  var alvo = idDeSistema(id);
  for (var i = 0; i < SISTEMAS_DO_RAMA.length; i++) {
    if (SISTEMAS_DO_RAMA[i].id === alvo) return SISTEMAS_DO_RAMA[i];
  }
  return null;
}

function sistemaConhecido(id) {
  return !!sistemaDoRegistro(id);
}

/* Os ganchos do sistema, ou null (sistema desconhecido, ou arquivo dele
   não instalado). Calculado uma vez por execução. */
function moduloDoSistema(id) {
  var alvo = idDeSistema(id);
  if (!Object.prototype.hasOwnProperty.call(MODULOS_DE_SISTEMA, alvo)) return null;
  var e = exec();
  if (!e.modulosDeSistema) e.modulosDeSistema = {};
  if (!Object.prototype.hasOwnProperty.call(e.modulosDeSistema, alvo)) {
    e.modulosDeSistema[alvo] = MODULOS_DE_SISTEMA[alvo]() || null;
  }
  return e.modulosDeSistema[alvo];
}

/* O sistema de uma ficha, como ela diz — para o índice da página
   Personagens. Ficha antiga fica vazia (quem lê aplica a regra de
   compatibilidade); um id que nenhuma versão conhece fica como veio,
   aparado: não some da lista nem é trocado por outro. */
function sistemaDaFicha(ficha) {
  return idDeSistema(ficha && ficha.tipoFicha);
}

/* O sistema que vale para a ficha: o que ela diz, ou o das fichas
   antigas. Desconhecido continua desconhecido — nunca vira Universal. */
function sistemaEfetivoDaFicha(ficha) {
  return sistemaDaFicha(ficha) || SISTEMA_DAS_FICHAS_ANTIGAS;
}

/* O módulo de uma ficha, só se ela tem o bloco do sistema dela. */
function moduloDaFicha(ficha) {
  var m = moduloDoSistema(sistemaEfetivoDaFicha(ficha));
  return m && (!m.fichaDoSistema || m.fichaDoSistema(ficha)) ? m : null;
}

/* O sistema de uma campanha: { id, herdado }. `herdado` diz que ele veio
   da regra de compatibilidade (a campanha ainda não o diz). Um id que
   esta versão não conhece fica como está — nunca cai na regra antiga. */
function sistemaDaCampanha(registro, dados) {
  var d = dados || lerJson(registro && registro.dadosJson, {});
  var dito = idDeSistema(d && d.sistema);
  if (dito) return { id: dito, herdado: false, conhecido: sistemaConhecido(dito) };
  return { id: sistemaDeCampanhaAntiga(registro.id), herdado: true, conhecido: true };
}

function sistemaTemFerramenta(sistemaId, chave) {
  var s = sistemaDoRegistro(sistemaId);
  return !!s && (s.ferramentas.indexOf(chave) >= 0 || s.mecanicas.indexOf(chave) >= 0);
}

/* De que sistema é uma ferramenta ou mecânica de campanha. */
function sistemaDaFerramenta(chave) {
  for (var i = 0; i < SISTEMAS_DO_RAMA.length; i++) {
    var s = SISTEMAS_DO_RAMA[i];
    if (s.ferramentas.indexOf(chave) >= 0 || s.mecanicas.indexOf(chave) >= 0) return s.id;
  }
  return '';
}

/* A porta das ferramentas de sistema numa campanha: a ferramenta só
   responde se é do sistema que a campanha usa agora. A de outro sistema
   fica SUSPENSA — nada é apagado, e voltar ao sistema dela a devolve
   como estava. Devolve null (pode seguir) ou o erro. */
function exigirFerramenta(ctx, chave) {
  var atual = sistemaDaCampanha(ctx.campanha).id;
  if (sistemaTemFerramenta(atual, chave)) return null;
  return { ok: false, erro: 'outro_sistema', sistema: atual, ferramenta: chave };
}

/* As mecânicas de uma campanha, para ler_campanha: as do sistema atual
   (ligada ou não) e as GUARDADAS — de outro sistema, com estado
   gravado, suspensas até a campanha voltar a ele. */
function mecanicasDaCampanha(campanhaId, sistemaId) {
  var saida = { ligadas: {}, guardadas: [] };
  SISTEMAS_DO_RAMA.forEach(function (s) {
    var m = moduloDoSistema(s.id);
    var estados = (m && m.estadoDasMecanicas) || {};
    s.mecanicas.concat(s.ferramentas).forEach(function (chave) {
      var temEstado = estados[chave];
      if (s.id === sistemaId) {
        if (s.mecanicas.indexOf(chave) >= 0) saida.ligadas[chave] = typeof temEstado === 'function' ? !!temEstado(campanhaId) : false;
        else saida.ligadas[chave] = true;
        return;
      }
      if (typeof temEstado === 'function' && temEstado(campanhaId)) saida.guardadas.push(chave);
    });
  });
  return saida;
}

/* As ações que os arquivos de sistema trazem. O Codigo.gs junta estas às
   do núcleo em rotaDe(). */
function rotasDosSistemas() {
  var saida = {};
  SISTEMAS_DO_RAMA.forEach(function (s) {
    var m = moduloDoSistema(s.id);
    if (!m || typeof m.rotas !== 'function') return;
    var rotas = m.rotas();
    Object.keys(rotas).forEach(function (chave) { saida[chave] = rotas[chave]; });
  });
  return saida;
}

/* Os campos de ajuste rápido que os sistemas acrescentam aos do núcleo
   (status e atributo): { alvo: [campos] }. */
function ajustesDosSistemas() {
  var saida = {};
  SISTEMAS_DO_RAMA.forEach(function (s) {
    var m = moduloDoSistema(s.id);
    var ajustes = (m && m.ajustes) || {};
    Object.keys(ajustes).forEach(function (alvo) { saida[alvo] = { sistema: s.id, def: ajustes[alvo] }; });
  });
  return saida;
}
