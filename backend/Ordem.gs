/* =====================================================================
   R.A.M.A. — Ordem Paranormal no servidor (v4.0)
   =====================================================================
   O módulo de Ordem Paranormal. Tudo o que o servidor faz porque uma
   ficha ou uma campanha é de Ordem mora aqui — e só aqui:

     · o resumo de PV, PE, Sanidade e PD que a ficha calcula e a mesa lê
       (resumoRecursos), a projeção e o cartão do painel da mesa;
     · o ajuste rápido de recurso (PV/PE/SAN/PD) pelo painel;
     · condições e efeitos contados por início e fim de turno, aplicados
       às fichas no mesmo lote que muda o turno do combate;
     · as mecânicas de suplemento da campanha: Hexatombe (AS2), Hacking
       (AS4), perigos complexos (AS5), a Sincronia Conectiva (AS5) e as
       viagens nas estradas com Carcaças Vermelhas (AS11).

   Até a v3.0 isto estava espalhado por Codigo.gs e Campanhas.gs, como se
   Ordem fosse o jeito padrão de a plataforma funcionar. Agora o núcleo
   pergunta ao registro (Sistemas.gs) e chama os ganchos de sistemaOrdem()
   só para fichas e campanhas de Ordem. As funções vieram como estavam:
   mesmas regras, mesmos erros, mesmos testes.

   As ferramentas de campanha daqui só respondem numa campanha de Ordem
   (exigirFerramenta): numa campanha que trocou de sistema elas ficam
   suspensas — nada é apagado, e voltar a Ordem as devolve como estavam.
   ===================================================================== */

/* Os ganchos que o núcleo chama (ver Sistemas.gs). */
function sistemaOrdem() {
  return {
    id: 'ordem',
    rotas: rotasDeOrdem,
    fichaDoSistema: ehFichaDeOrdem,
    projecao: function (ficha) {
      return {
        ordem: ordemParaPainel(ficha.ordem),
        itens: itensParaPainel(ficha.inventario),
        resumoRecursos: normalizarResumoRecursos(ficha.resumoRecursos),
      };
    },
    projecaoDoSistema: projecaoDeOrdem,
    painel: painelDeOrdem,
    recursosNoCombate: recursosDeOrdemNoCombate,
    turnosNasFichas: aplicarTurnosAsFichas,
    resumo: { campo: 'resumoRecursos', normalizar: normalizarResumoRecursos },
    ajustes: { recurso: { campos: ['atual'], valido: recursoDeOrdemValido, alvo: recursoDeOrdemNaFicha } },
    estadoDasMecanicas: { hexatombe: hexatombeAtivo, hacking: hackingAtivo, perigos: perigosAtivo, viagens: viagensAtivo },
  };
}

function rotasDeOrdem() {
  return {
    atualizar_resumo_personagem: { publica: false, fn: acaoAtualizarResumoPersonagem },
    efeito_personagem:           { publica: false, fn: acaoEfeitoPersonagem },
    ler_hexatombe:               { publica: false, fn: acaoLerHexatombe },
    salvar_hexatombe:            { publica: false, fn: acaoSalvarHexatombe },
    lancar_hexatombe:            { publica: false, fn: acaoLancarHexatombe },
    ler_hacking:                 { publica: false, fn: acaoLerHacking },
    salvar_hacking:              { publica: false, fn: acaoSalvarHacking },
    ler_perigos:                 { publica: false, fn: acaoLerPerigos },
    salvar_perigos:              { publica: false, fn: acaoSalvarPerigos },
    ler_viagens:                 { publica: false, fn: acaoLerViagens },
    viagem_operar:               { publica: false, fn: acaoViagemOperar },
    sincronia_operar:            { publica: false, fn: acaoSincroniaOperar },
    ler_planos_evolucao:         { publica: false, fn: acaoLerPlanosEvolucao },
    salvar_planos_evolucao:      { publica: false, fn: acaoSalvarPlanosEvolucao },
  };
}

function ehFichaDeOrdem(ficha) {
  return !!ficha && String(ficha.tipoFicha || '') === 'ordem' && !!ficha.ordem && typeof ficha.ordem === 'object';
}

/* A projeção também responde por "é de Ordem", porque ela carrega o
   tipo decidido na hora da gravação. */
function projecaoDeOrdem(p) {
  return !!p && String(p.tipo || '') === 'ordem' && !!p.ordem && typeof p.ordem === 'object';
}


/* =====================================================================
   O RESUMO DE RECURSOS, VALIDADO
   ---------------------------------------------------------------------
   `resumoRecursos` é o máximo de PV, PE e Sanidade de uma ficha de Ordem,
   calculado pelo navegador de quem pode editar a ficha — ver o bloco
   "Resumo de recursos" abaixo. Aqui ele só é validado: números
   inteiros num intervalo sensato, Sanidade podendo ser nula ("Jogando sem
   Sanidade"). Qualquer outra forma é descartada.
   ===================================================================== */

var LIMITE_RESUMO_RECURSO = 99999;

function normalizarResumoRecursos(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;

  function numero(v, aceitaNulo) {
    if (v === null || v === undefined) return aceitaNulo ? null : undefined;
    if (typeof v !== 'number' || !isFinite(v)) return undefined;
    var n = Math.round(v);
    if (n < -999 || n > LIMITE_RESUMO_RECURSO) return undefined;
    return n;
  }

  /* `pd` (v2.19): pontos de determinação, com "Jogando sem Sanidade"
     (SAH p.104). Com ele, PE e SAN vêm nulos — os dois viraram PD. Sem
     ele, `pd` é nulo, e um resumo de uma versão anterior do site (que
     não manda `pd`) continua valendo. */
  var pv = numero(bruto.pv, false);
  var pd = numero(bruto.pd, true);
  var pe = numero(bruto.pe, pd !== null && pd !== undefined);
  var san = numero(bruto.san, true);
  if (pv === undefined || pe === undefined || san === undefined || pd === undefined) return null;

  return { versao: 1, pv: pv, pe: pe, san: san, pd: pd };
}

/* O resumo que vai gravado com a ficha. Ficha que não é de Ordem não tem
   resumo. Gravação que não trouxe resumo — de uma versão do site que não
   o calculava — mantém o que já estava, em vez de apagar o que a mesa
   estava vendo. */
function resumoParaGravar(ficha, fichaAnterior) {
  var ehOrdem = String(ficha.tipoFicha || '') === 'ordem' && !!ficha.ordem && typeof ficha.ordem === 'object';
  if (!ehOrdem) return null;
  return normalizarResumoRecursos(ficha.resumoRecursos) ||
    (fichaAnterior ? normalizarResumoRecursos(fichaAnterior.resumoRecursos) : null);
}

/* =====================================================================
   RESUMO DE RECURSOS
   ---------------------------------------------------------------------
   O outro jogador vê a vida atual e máxima do personagem de Ordem da
   mesa, mas não pode receber a ficha: o máximo sai de classe, trilha,
   escolhas, poderes — o build inteiro. E o Apps Script não tem o motor
   de regras; ele mora no navegador (js/ordem/regras.js).

   Então o MÁXIMO é calculado por quem já pode ver a ficha inteira — o
   dono ou o mestre — e guardado dentro da própria ficha, em
   `resumoRecursos`: { pv, pe, san } (san nula com "Jogando sem
   Sanidade"). Ele chega de dois jeitos:

     · junto de toda gravação da ficha (a ficha calcula antes de enviar);
     · por atualizar_resumo_personagem, quando o painel da mesa de quem
       pode ver a ficha percebe que o guardado não bate com o cálculo —
       uma ficha salva por uma versão antiga do site, por exemplo.

   O ATUAL não entra no resumo: ele é lido de `ordem.recursos` na hora,
   que é onde o ajuste rápido grava. Assim um −1 de vida aparece para a
   mesa sem ninguém precisar recalcular nada.

   Confiança: quem grava o resumo é quem já pode editar a ficha inteira.
   O dono conseguiria mostrar à mesa um máximo inventado — e conseguiria
   do mesmo jeito editando a própria ficha. O servidor valida a forma.
   ===================================================================== */

/* Os números do resumo de uma ficha de Ordem, validados, ou null. */
function recursosResumidos(ficha) {
  var resumo = normalizarResumoRecursos(ficha.resumoRecursos);
  if (!resumo) return null;

  var guardados = (ficha.ordem && ficha.ordem.recursos && typeof ficha.ordem.recursos === 'object')
    ? ficha.ordem.recursos : {};
  var rotulos = { pv: 'PV', pe: 'PE', san: 'SAN', pd: 'PD' };

  return ['pv', 'pe', 'san', 'pd']
    .filter(function (k) { return resumo[k] !== null; })
    .map(function (k) {
      return { chave: k, rotulo: rotulos[k], atual: recursoAtualGuardado(guardados[k], resumo[k]), maximo: resumo[k] };
    });
}

/* A mesma regra de js/ordem/regras.js (recursoAtual): nunca tocado vale
   o máximo; tocado vale o que foi gravado, aparado no máximo. */
function recursoAtualGuardado(guardado, maximo) {
  if (guardado === null || guardado === undefined || guardado === '') return maximo;
  var n = Number(guardado);
  if (!isFinite(n)) return maximo;
  return Math.min(Math.round(n), maximo);
}

function acaoAtualizarResumoPersonagem(corpo, usuario) {
  var resumo = normalizarResumoRecursos(corpo.resumo);
  if (!resumo) return { ok: false, erro: 'dados_invalidos' };

  /* A revisão é obrigatória: um painel aberto antes de a ficha subir de
     nível calculou o máximo VELHO, e não pode gravá-lo por cima do novo. */
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;

    var registro = acesso.personagem;
    var revAtual = Number(registro.rev) || 0;
    if (revPedida !== revAtual) return { ok: false, erro: 'conflito', rev: revAtual };

    /* Ficha que não se monta não recebe resumo: gravar por cima dela
       seria salvar o que ninguém conseguiu ler. */
    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);
    if (!ehFichaDeOrdem(ficha)) return { ok: false, erro: 'dados_invalidos' };

    var guardado = normalizarResumoRecursos(ficha.resumoRecursos);
    if (guardado && guardado.pv === resumo.pv && guardado.pe === resumo.pe && guardado.san === resumo.san &&
        guardado.pd === resumo.pd) {
      return { ok: true, rev: revAtual, dados: { mudou: false } };
    }

    ficha.resumoRecursos = resumo;

    /* A revisão NÃO sobe: o resumo é derivado da ficha, não uma decisão
       de ninguém. Subir a revisão faria toda ficha aberta em outro
       aparelho entrar em conflito por causa de uma conta. Quem gravar a
       ficha depois manda o próprio resumo junto. Por isso a gravação não
       leva id de operação: o manifesto continua reconhecendo a última
       gravação que subiu a revisão. */
    var publicado = publicarFicha(registro, ficha, {});
    if (!publicado.ok) return publicado;

    marcarMesa(registro.campanhaId, ['personagens', 'combates']);
    return { ok: true, rev: revAtual, dados: { mudou: true } };
  });
}

/* O bloco `ordem` com o necessário para calcular PV, PE, Sanidade,
   Defesa, limite de PE e deslocamento — sem os textos das versões
   personalizadas (só o que muda efeito: aquisição e `efeitos`). */
function ordemParaPainel(ordem) {
  var copia = {};
  Object.keys(ordem).forEach(function (k) {
    if (k === 'organizacao') return;
    copia[k] = ordem[k];
  });
  copia.personalizacoes = (Array.isArray(ordem.personalizacoes) ? ordem.personalizacoes : [])
    .filter(function (x) { return x && typeof x === 'object'; })
    .map(function (x) {
      return { id: x.id, aquisicao: x.aquisicao, poder: x.poder, nome: x.nome, efeitos: x.efeitos };
    });
  return copia;
}

/* O que outro jogador da mesa vê de uma ficha de Ordem que não é dele:
   identificação, e nada de recursos, escolhas ou inventário. */
function ordemPublicaParaPainel(ordem) {
  var opcionais = ordem.opcionais && typeof ordem.opcionais === 'object' ? ordem.opcionais : {};
  return {
    classe: ordem.classe || '',
    trilha: ordem.trilha || '',
    nex: ordem.nex === undefined ? null : ordem.nex,
    nivel: ordem.nivel === undefined ? null : ordem.nivel,
    /* O estágio do Sobrevivente (v2.21): é a progressão dele, e o cartão
       mostra "Sobrevivente · Estágio 3". Não revela escolha nenhuma. */
    estagio: ordem.estagio === undefined ? null : ordem.estagio,
    opcionais: { nexExperiencia: opcionais.nexExperiencia === true },
  };
}

/* Itens com o que conta para Defesa e carga (tipo, Defesa, bloco de
   Ordem). Descrição e etiqueta ficam na ficha. */
function itensParaPainel(inventario) {
  var itens = inventario && Array.isArray(inventario.itens) ? inventario.itens : [];
  return itens
    .filter(function (i) { return i && typeof i === 'object'; })
    .map(function (i) {
      return { id: i.id, tipo: i.tipo, nome: i.nome, defesa: i.defesa, ordem: i.ordem };
    });
}

/* O cartão de uma ficha de Ordem no painel da mesa (listar_personagens_
   campanha). Uma ficha de Ordem NÃO usa `status` e `atributos`
   universais — ela os tem só como padrão de nascimento. Os números dela
   são calculados pelas regras no navegador (js/ordem/regras.js), o mesmo
   cálculo da ficha: o painel recebe os dados de entrada desse cálculo,
   não um resultado paralelo. É exatamente isso que a projeção guarda. */
function painelDeOrdem(proj, o) {
  var saida = {};
  if (o.detalhado) {
    saida.ordem = proj.ordem;
    saida.inventario = { itens: proj.itens || [] };
    /* O resumo guardado, para quem calcula conferir se ele ainda bate
       com a ficha — ver atualizar_resumo_personagem. */
    saida.resumoRecursos = normalizarResumoRecursos(proj.resumoRecursos);
    return saida;
  }
  /* v9.21.1: com "Esconder status dos jogadores", a classe, a trilha e
     o NEX (ou nível/estágio) também ficam com o mestre — nem chegam ao
     navegador de quem não detalha. */
  saida.ordem = o.recursosVisiveis
    ? ordemPublicaParaPainel(proj.ordem)
    : { classe: '', trilha: '', nex: null, nivel: null, estagio: null, opcionais: { nexExperiencia: false } };
  if (o.recursosVisiveis) {
    var resumidos = recursosResumidos(proj);
    saida.recursos = resumidos || [];
    if (!resumidos) saida.recursosPendentes = true;
    /* Morrendo e enlouquecendo seguem a MESMA regra dos recursos:
       escondidos com "Esconder status dos jogadores". */
    saida.condicoes = resumoPublicoDeCondicoes(proj.ordem);
  }
  return saida;
}

/* Os recursos de um personagem de Ordem na lista do combate. */
function recursosDeOrdemNoCombate(proj) {
  var lista = recursosResumidos(proj);
  var condicoes = resumoPublicoDeCondicoes(proj.ordem);
  if (!lista) return { pendente: true, lista: [], condicoes: condicoes };
  return { pendente: false, lista: lista, condicoes: condicoes };
}

/* =====================================================================
   AJUSTE RÁPIDO DE RECURSO
   ---------------------------------------------------------------------
   O alvo 'recurso' do ajuste_personagem do núcleo (Campanhas.gs): o que
   sobrou de PV, PE e Sanidade — ou de PD, com "Jogando sem Sanidade". O
   máximo é calculado pelas regras e nunca é gravado.
   ===================================================================== */

var RECURSOS_DE_ORDEM = ['pv', 'pe', 'san', 'pd'];

/* O mesmo piso da ficha de Ordem (js/ordem/telas/ficha-ordem.js). */
var PISO_DE_RECURSO = -99;

function recursoDeOrdemValido(itemId, valor) {
  return RECURSOS_DE_ORDEM.indexOf(String(itemId || '')) >= 0 && valor >= PISO_DE_RECURSO;
}

/* Só existe em ficha de Ordem — o núcleo só chega aqui com uma. Criar o
   bloco de recursos que ainda não existia é a única escrita, e só na
   cópia em memória. */
function recursoDeOrdemNaFicha(ficha, itemId) {
  if (!ficha.ordem.recursos || typeof ficha.ordem.recursos !== 'object') {
    ficha.ordem.recursos = { pv: null, pe: null, san: null, pd: null };
  }
  return { item: ficha.ordem.recursos, campo: String(itemId) };
}

/* =====================================================================
   CONDIÇÕES E TURNOS (v2.19)
   ---------------------------------------------------------------------
   Morrendo e enlouquecendo contam os INÍCIOS DE TURNO do personagem na
   cena (Ordem Paranormal RPG, p. 88). Com o combate da campanha, quem
   conta é o servidor, aqui, no mesmo lote que muda o turno — e só ele:

     · um evento por início de turno, com id `cb:<combate>:<rodada>:<participante>`.
       O mesmo turno é o mesmo evento: mestre e jogador, duas abas, uma
       recarga ou uma resposta repetida não contam duas vezes;
     · conta só o início do turno DO PERSONAGEM — não o turno de outro
       participante, nem a rodada;
     · "voltar turno" retira o evento do turno desfeito, e só ele;
       correções feitas à mão depois ficam onde estão;
     · encerrar o combate não zera nada: cena e combate são coisas
       diferentes, e a cena nova é decisão de quem joga.

   Espelho de js/ordem/condicoes.js (registrarInicioDeTurno e
   retirarInicioDeTurno): os testes rodam os mesmos casos nas duas.
   ===================================================================== */

var CONDICOES_CONTADAS = ['morrendo', 'enlouquecendo'];
var LIMITE_DAS_CONDICOES = { morrendo: 3, enlouquecendo: 3 };
var NOMES_DAS_CONDICOES = { morrendo: 'Morrendo', enlouquecendo: 'Enlouquecendo' };
var MAX_EVENTOS_DE_CONDICAO = 60;
var MAX_EVENTOS_DE_EFEITO = 120;
var ID_DE_EVENTO = /^[A-Za-z0-9_.:|#-]{1,160}$/;

/* Os nomes das condições do livro (js/ordem/efeitos.js, CONDICOES): só o
   que o servidor precisa para o resumo público e para conferir o modelo
   de uma aplicação. Os efeitos de cada uma são do navegador. */
var CONDICOES_DO_LIVRO = {
  abalado: 'Abalado', agarrado: 'Agarrado', alquebrado: 'Alquebrado', apavorado: 'Apavorado',
  asfixiado: 'Asfixiado', atordoado: 'Atordoado', caido: 'Caído', cego: 'Cego', confuso: 'Confuso',
  debilitado: 'Debilitado', desprevenido: 'Desprevenido', doente: 'Doente', emChamas: 'Em chamas',
  enjoado: 'Enjoado', enredado: 'Enredado', envenenado: 'Envenenado', esmorecido: 'Esmorecido',
  exausto: 'Exausto', fascinado: 'Fascinado', fatigado: 'Fatigado', fraco: 'Fraco', frustrado: 'Frustrado',
  imovel: 'Imóvel', inconsciente: 'Inconsciente', indefeso: 'Indefeso', lento: 'Lento', machucado: 'Machucado',
  morrendo: 'Morrendo', enlouquecendo: 'Enlouquecendo', perturbado: 'Perturbado', ofuscado: 'Ofuscado',
  paralisado: 'Paralisado', pasmo: 'Pasmo', petrificado: 'Petrificado', sangrando: 'Sangrando', surdo: 'Surdo',
  surpreendido: 'Surpreendido', vulneravel: 'Vulnerável',
};

function rastreadorDeCondicao(cond, chave) {
  if (!cond || typeof cond !== 'object') return null;
  if (CONDICOES_CONTADAS.indexOf(chave) < 0) return null;
  var r = cond[chave];
  if (!r || typeof r !== 'object') return null;
  if (!Array.isArray(r.eventos)) r.eventos = [];
  if (!Array.isArray(r.descartados)) r.descartados = [];
  return r;
}

function cenaDaCondicao(cond) {
  return cond && cond.cena && typeof cond.cena === 'object' && typeof cond.cena.id === 'string' ? cond.cena.id : '';
}

function contagemDaCondicao(cond, r) {
  var cena = cenaDaCondicao(cond);
  return r.eventos.filter(function (e) { return e && String(e.cena || '') === cena; }).length;
}

function idDoInicioDeTurno(combateId, rodada, participanteId) {
  var id = 'cb:' + String(combateId).slice(0, 60) + ':' + Math.round(Number(rodada)) + ':' + String(participanteId).slice(0, 60);
  return ID_DE_EVENTO.test(id) ? id : '';
}

function idDoFimDeTurno(combateId, rodada, participanteId) {
  var id = 'cf:' + String(combateId).slice(0, 60) + ':' + Math.round(Number(rodada)) + ':' + String(participanteId).slice(0, 60);
  return ID_DE_EVENTO.test(id) ? id : '';
}

/* Devolve as chaves que contaram. */
function registrarInicioNaFicha(ficha, evento) {
  var cond = ficha && ficha.ordem ? ficha.ordem.condicoes : null;
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return [];
  if (!evento || !ID_DE_EVENTO.test(String(evento.id || ''))) return [];
  var cena = cenaDaCondicao(cond);
  var contou = [];
  CONDICOES_CONTADAS.forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r || r.ativa !== true) return;
    if (r.eventos.some(function (e) { return e && e.id === evento.id; })) return;
    if (r.descartados.indexOf(evento.id) >= 0) return;
    if (contagemDaCondicao(cond, r) >= LIMITE_DAS_CONDICOES[chave]) return;
    r.eventos.push({ id: evento.id, origem: 'combate', cena: cena, em: evento.em, rodada: evento.rodada, combate: evento.combate });
    if (r.eventos.length > MAX_EVENTOS_DE_CONDICAO) r.eventos = r.eventos.slice(r.eventos.length - MAX_EVENTOS_DE_CONDICAO);
    contou.push(chave);
  });
  return contou;
}

function retirarInicioDaFicha(ficha, id) {
  var cond = ficha && ficha.ordem ? ficha.ordem.condicoes : null;
  if (!cond || typeof cond !== 'object' || !ID_DE_EVENTO.test(String(id || ''))) return [];
  var tirou = [];
  CONDICOES_CONTADAS.forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r) return;
    var antes = r.eventos.length;
    r.eventos = r.eventos.filter(function (e) { return !(e && e.id === id && e.origem === 'combate'); });
    if (r.eventos.length !== antes) tirou.push(chave);
  });
  return tirou;
}

/* ---------------------------------------------------------------------
   A duração dos efeitos aplicados (v2.20) — espelho de
   js/ordem/efeitos.js (contaNoTurno, registrarTurno, retirarTurno).
   evento = { id, tipo: 'inicio' | 'fim', participanteId, desde }; `meu`
   é o participante desta ficha no combate. Um efeito por turnos conta o
   turno de quem ele conta (o afetado, ou o participante escolhido), no
   momento escolhido; o fim de um turno que começou ANTES da aplicação
   não conta — aplicar durante um turno não gasta aquele turno.
   --------------------------------------------------------------------- */

function listaDeEfeitos(cond) {
  return cond && typeof cond === 'object' && Array.isArray(cond.efeitos) ? cond.efeitos : [];
}

function efeitoValendo(inst) {
  if (!inst || typeof inst !== 'object' || inst.encerrado) return false;
  var d = inst.duracao && typeof inst.duracao === 'object' ? inst.duracao : {};
  if (d.tipo === 'turnos') {
    var n = Array.isArray(inst.eventos) ? inst.eventos.length : 0;
    return n < (Math.round(Number(d.turnos)) || 1);
  }
  return true;
}

function efeitoContaNoTurno(inst, ev, meu) {
  if (!efeitoValendo(inst)) return false;
  var d = inst.duracao;
  if (!d || d.tipo !== 'turnos') return false;
  if ((ev.tipo === 'fim') !== (d.momento === 'fim')) return false;
  var dono = d.contador === 'participante' ? (d.participante && d.participante.id) : meu;
  if (!dono || String(dono) !== String(ev.participanteId)) return false;
  var eventos = Array.isArray(inst.eventos) ? inst.eventos : [];
  var descartados = Array.isArray(inst.descartados) ? inst.descartados : [];
  if (eventos.some(function (e) { return e && e.id === ev.id; })) return false;
  if (descartados.indexOf(ev.id) >= 0) return false;
  if (ev.tipo === 'fim' && ev.desde && inst.aplicadoEm && String(inst.aplicadoEm) > String(ev.desde)) return false;
  return true;
}

function registrarTurnoNosEfeitos(cond, ev, meu) {
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return [];
  if (!ev || !ID_DE_EVENTO.test(String(ev.id || ''))) return [];
  var contou = [];
  listaDeEfeitos(cond).forEach(function (inst) {
    if (!efeitoContaNoTurno(inst, ev, meu)) return;
    if (!Array.isArray(inst.eventos)) inst.eventos = [];
    inst.eventos.push({ id: ev.id, origem: 'combate', em: ev.em || new Date().toISOString() });
    if (inst.eventos.length > MAX_EVENTOS_DE_EFEITO) inst.eventos = inst.eventos.slice(inst.eventos.length - MAX_EVENTOS_DE_EFEITO);
    contou.push(inst.id);
  });
  return contou;
}

function retirarTurnoDosEfeitos(cond, id) {
  if (!ID_DE_EVENTO.test(String(id || ''))) return [];
  var tirou = [];
  listaDeEfeitos(cond).forEach(function (inst) {
    if (!inst || !Array.isArray(inst.eventos)) return;
    var antes = inst.eventos.length;
    inst.eventos = inst.eventos.filter(function (e) { return !(e && e.id === id && e.origem === 'combate'); });
    if (inst.eventos.length !== antes) tirou.push(inst.id);
  });
  return tirou;
}

/* Há o que fazer nesta ficha com estes eventos? Pergunta feita à
   projeção do painel, sem abrir a ficha: só quem tem uma condição ativa,
   um efeito que conta aquele turno ou o evento a retirar é lido e
   regravado. */
function condicoesPedemLeitura(cond, eventos, meu) {
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return false;
  var copia = JSON.parse(JSON.stringify(cond));
  return eventos.some(function (ev) {
    if (ev.retirada) {
      var noRastreador = CONDICOES_CONTADAS.some(function (chave) {
        var r = rastreadorDeCondicao(copia, chave);
        return !!r && r.eventos.some(function (e) { return e && e.id === ev.id; });
      });
      return noRastreador || listaDeEfeitos(copia).some(function (inst) {
        return inst && Array.isArray(inst.eventos) && inst.eventos.some(function (e) { return e && e.id === ev.id; });
      });
    }
    if (ev.tipo === 'inicio' && meu && String(ev.participanteId) === String(meu)) {
      var ativa = CONDICOES_CONTADAS.some(function (chave) {
        var r = rastreadorDeCondicao(copia, chave);
        return !!r && r.ativa === true;
      });
      if (ativa) return true;
    }
    return listaDeEfeitos(copia).some(function (inst) { return efeitoContaNoTurno(inst, ev, meu); });
  });
}

/* O que outro jogador pode ver das condições — só com o status visível:
   as ativas e as que já contaram nesta cena; das aplicadas, os nomes das
   condições do livro, e os outros efeitos só contados (o texto que o
   mestre escreveu é do dono da ficha). Espelho de
   RAMAOrdemCondicoes.resumoPublico. */
function resumoPublicoDeCondicoes(ordem) {
  var cond = ordem && ordem.condicoes && typeof ordem.condicoes === 'object' ? JSON.parse(JSON.stringify(ordem.condicoes)) : null;
  if (!cond) return [];
  var saida = [];
  CONDICOES_CONTADAS.forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r) return;
    var n = contagemDaCondicao(cond, r);
    if (r.ativa !== true && !n) return;
    saida.push({
      chave: chave, nome: NOMES_DAS_CONDICOES[chave], oficial: true,
      ativa: r.ativa === true, contagem: n, limite: LIMITE_DAS_CONDICOES[chave],
    });
  });
  ['inconsciente', 'perturbado'].forEach(function (chave) {
    if (cond[chave] && cond[chave].ativa === true) {
      saida.push({ chave: chave, nome: chave === 'inconsciente' ? 'Inconsciente' : 'Perturbado', oficial: true, ativa: true, contagem: 0, limite: null });
    }
  });
  var outros = 0;
  listaDeEfeitos(cond).forEach(function (inst) {
    if (!efeitoValendo(inst) || !inst.nome) return;
    var m = /^cond:(.+)$/.exec(String(inst.modelo || ''));
    if (inst.tipo === 'condicao' && m && CONDICOES_DO_LIVRO[m[1]]) {
      var nome = CONDICOES_DO_LIVRO[m[1]];
      if (!saida.some(function (x) { return x.nome === nome; })) {
        saida.push({ chave: 'efeito', nome: nome, oficial: true, ativa: true, contagem: 0, limite: null });
      }
    } else {
      outros++;
    }
  });
  if (outros) saida.push({ chave: 'outros', nome: outros === 1 ? '1 efeito' : outros + ' efeitos', oficial: false, ativa: true, contagem: 0, limite: null });
  return saida;
}

/* ---------------------------------------------------------------------
   Uma aplicação que chega pela rede (efeito_personagem), limpa. É a
   mesma forma de js/ordem/efeitos.js (normalizarInstancia): textos com
   tamanho máximo, modificadores de uma lista fechada, números com
   limite. Nada é interpretado — texto é texto.
   --------------------------------------------------------------------- */

var ALVOS_DE_EFEITO = ['testes', 'pericias', 'ataques', 'ataques:corpo', 'ataques:distancia', 'defesa', 'defesa:corpo',
  'defesa:distancia', 'dano', 'dano:corpo', 'dano:distancia', 'deslocamento', 'custoPe', 'resistenciaDano',
  'atributo:agi', 'atributo:for', 'atributo:int', 'atributo:pre', 'atributo:vig'];
var ORIGENS_DE_EFEITO = ['ritual', 'criatura', 'habilidade', 'item', 'aliado', 'condicao', 'manual'];

function textoLimpo(v, limite) {
  return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, limite);
}

function carimboValido(v) {
  if (typeof v !== 'string' || !v) return '';
  var d = new Date(v);
  return isNaN(d.getTime()) ? '' : v.slice(0, 40);
}

function modificadorRecebido(m) {
  if (!m || typeof m !== 'object') return null;
  var alvo = String(m.alvo || '');
  if (ALVOS_DE_EFEITO.indexOf(alvo) < 0 && !/^pericia:[a-z]{2,30}$/.test(alvo)) return null;
  var tipo = String(m.tipo || '');
  if (alvo === 'deslocamento') {
    if (tipo !== 'deslocamento') return null;
    var op = ['soma', 'metade', 'zero', 'fixo'].indexOf(m.operacao) >= 0 ? m.operacao : 'soma';
    var v = Math.round(Number(m.valor) * 10) / 10;
    if (!isFinite(v)) v = 0;
    return { alvo: alvo, tipo: tipo, operacao: op, valor: (op === 'metade' || op === 'zero') ? 0 : Math.max(-99, Math.min(99, v)) };
  }
  if (tipo !== 'bonus' && tipo !== 'dados') return null;
  if (tipo === 'dados' && /^(defesa|dano|custoPe|resistenciaDano)/.test(alvo)) return null;
  var n = Math.round(Number(m.valor));
  if (!isFinite(n) || !n) return null;
  n = Math.max(-99, Math.min(99, n));
  if (tipo === 'dados') n = Math.max(-10, Math.min(10, n));
  return { alvo: alvo, tipo: tipo, valor: n };
}

function efeitoRecebido(b, usuario, papel) {
  if (!b || typeof b !== 'object') return null;
  var id = String(b.id || '');
  if (!/^[A-Za-z0-9_.:|#-]{1,160}$/.test(id)) return null;
  var nome = textoLimpo(b.nome, 80).trim();
  if (!nome) return null;
  var modelo = String(b.modelo || '');
  if (modelo && !/^(cond|ritual):[A-Za-z0-9_.-]{1,70}$/.test(modelo)) modelo = '';
  var cm = /^cond:(.+)$/.exec(modelo);
  if (cm && !CONDICOES_DO_LIVRO[cm[1]]) modelo = '';
  /* As condições com contador próprio vão pela operação `rastreador`:
     nunca viram uma segunda contagem em paralelo. */
  if (cm && ['morrendo', 'enlouquecendo', 'inconsciente', 'perturbado'].indexOf(cm[1]) >= 0) return null;
  var d = b.duracao && typeof b.duracao === 'object' ? b.duracao : {};
  var tipoDur = ['cena', 'turnos', 'ateRemover', 'especial'].indexOf(d.tipo) >= 0 ? d.tipo : 'cena';
  var duracao = { tipo: tipoDur };
  if (tipoDur === 'turnos') {
    duracao.turnos = Math.max(1, Math.min(99, Math.round(Number(d.turnos)) || 1));
    duracao.contador = d.contador === 'participante' ? 'participante' : 'alvo';
    duracao.momento = d.momento === 'fim' ? 'fim' : 'inicio';
    if (duracao.contador === 'participante') {
      var pp = d.participante && typeof d.participante === 'object' ? d.participante : {};
      var pid = String(pp.id || '');
      if (/^[A-Za-z0-9_.:|#-]{1,160}$/.test(pid)) {
        duracao.participante = { id: pid, nome: textoLimpo(pp.nome, 80), combate: /^[A-Za-z0-9_.:|#-]{1,160}$/.test(String(pp.combate || '')) ? String(pp.combate) : '' };
      } else {
        duracao.contador = 'alvo';
      }
    }
  }
  if (tipoDur === 'especial') duracao.texto = textoLimpo(d.texto, 120);
  var origem = b.origem && typeof b.origem === 'object' ? b.origem : {};
  var inclui = (Array.isArray(b.inclui) ? b.inclui : []).map(String).filter(function (k) { return !!CONDICOES_DO_LIVRO[k]; }).slice(0, 6);
  return {
    id: id,
    modelo: modelo,
    tipo: b.tipo === 'condicao' && cm ? 'condicao' : 'efeito',
    nome: nome,
    descricao: textoLimpo(b.descricao, 1000),
    versao: textoLimpo(b.versao, 40),
    origem: { tipo: ORIGENS_DE_EFEITO.indexOf(origem.tipo) >= 0 ? origem.tipo : 'manual', nome: textoLimpo(origem.nome, 80) },
    alvo: { nome: textoLimpo(b.alvo && b.alvo.nome, 80) },
    modificadores: (Array.isArray(b.modificadores) ? b.modificadores : []).map(modificadorRecebido).filter(Boolean).slice(0, 16),
    inclui: inclui,
    restricoes: (Array.isArray(b.restricoes) ? b.restricoes : []).map(function (r) { return textoLimpo(r, 200).trim(); }).filter(Boolean).slice(0, 8),
    acumula: b.acumula === true,
    duracao: duracao,
    eventos: [],
    descartados: [],
    aplicadoEm: new Date().toISOString(),
    /* Quem aplicou vem da SESSÃO, não do pedido. */
    aplicadoPor: { id: String(usuario.id), nome: textoLimpo(usuario.nome || usuario.usuario, 80), papel: papel },
    cena: /^[A-Za-z0-9_.:|#-]{1,160}$/.test(String(b.cena || '')) ? String(b.cena) : '',
    combate: /^[A-Za-z0-9_.:|#-]{1,160}$/.test(String(b.combate || '')) ? String(b.combate) : '',
    personalizado: b.personalizado === true,
    encerrado: null,
  };
}

/* =====================================================================
   efeito_personagem — o mestre aplica, encerra ou liga uma condição
   ---------------------------------------------------------------------
   Sem abrir a ficha inteira na tela: um pedido pequeno, com a mesma
   conferência de acesso de toda gravação de ficha — o dono, ou o mestre
   da campanha em que o personagem está (e o pedido diz qual campanha).
   Um jogador pedindo por um personagem alheio recebe nao_encontrado,
   mesmo trocando o id no pedido.

     aplicar     { efeito, encerrar? }   uma aplicação nova; `encerrar`
                                         termina outra (repetição)
     renovar     { efeitoId, duracao }   reinicia a duração
     encerrar    { efeitoId }
     rastreador  { chave, encerrar? }    liga morrendo, enlouquecendo,
                                         inconsciente ou perturbado

   Com `operacaoId`, o mesmo pedido chegando de novo não aplica duas
   vezes; e uma aplicação com o id que já está na ficha também não.
   ===================================================================== */

function acaoEfeitoPersonagem(corpo, usuario) {
  var op = String(corpo.op || '');
  if (['aplicar', 'renovar', 'encerrar', 'rastreador'].indexOf(op) < 0) return { ok: false, erro: 'dados_invalidos' };
  var operacao = idDeOperacao(corpo.operacaoId);

  return comTrava(function () {
    /* Ação da mesa: só dono ou mestre (v2.44). Compartilhar a ficha não
       põe ninguém na campanha dela. */
    var acesso = personagemAcessivel(corpo.personagemId, usuario, { semCompartilhamento: true });
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;
    if (corpo.campanhaId && String(registro.campanhaId || '') !== String(corpo.campanhaId)) {
      return { ok: false, erro: 'nao_encontrado' };
    }
    if (operacaoJaAplicada(registro, operacao)) return { ok: true, repetida: true, rev: Number(registro.rev) || 0 };

    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);
    if (!ehFichaDeOrdem(ficha)) return { ok: false, erro: 'dados_invalidos' };
    if (!ficha.ordem.condicoes || typeof ficha.ordem.condicoes !== 'object') ficha.ordem.condicoes = {};
    var cond = ficha.ordem.condicoes;
    if (!Array.isArray(cond.efeitos)) cond.efeitos = [];
    var agora = new Date().toISOString();
    var papel = acesso.dono ? 'jogador' : 'mestre';
    var mudou = false;

    function encerrarPorId(id, motivo) {
      var inst = cond.efeitos.filter(function (x) { return x && x.id === id; })[0];
      if (!inst || inst.encerrado) return false;
      inst.encerrado = { em: agora, motivo: motivo, por: textoLimpo(usuario.nome || usuario.usuario, 80) };
      return true;
    }

    if (op === 'aplicar') {
      var efeito = efeitoRecebido(corpo.efeito, usuario, papel);
      if (!efeito) return { ok: false, erro: 'dados_invalidos' };
      var imunes = Array.isArray(cond.imunidades) ? cond.imunidades : [];
      var cm = /^cond:(.+)$/.exec(efeito.modelo);
      if (cm && imunes.indexOf(cm[1]) >= 0) return { ok: false, erro: 'dados_invalidos', motivo: 'imune' };
      if (!cond.efeitos.some(function (x) { return x && x.id === efeito.id; })) {
        cond.efeitos.push(efeito);
        mudou = true;
      }
      if (corpo.encerrar && encerrarPorId(String(corpo.encerrar), 'repeticao')) mudou = true;
      if (cond.efeitos.length > 80) {
        var sobra = cond.efeitos.length - 80;
        cond.efeitos = cond.efeitos.filter(function (x) {
          if (sobra > 0 && x && x.encerrado) { sobra--; return false; }
          return true;
        }).slice(-80);
      }
    } else if (op === 'renovar') {
      var alvo = cond.efeitos.filter(function (x) { return x && x.id === String(corpo.efeitoId || ''); })[0];
      if (!alvo) return { ok: false, erro: 'nao_encontrado' };
      var molde = efeitoRecebido({ id: alvo.id, nome: alvo.nome || 'Efeito', duracao: corpo.duracao }, usuario, papel);
      alvo.eventos = [];
      alvo.descartados = [];
      alvo.aplicadoEm = agora;
      alvo.encerrado = null;
      if (molde) alvo.duracao = molde.duracao;
      mudou = true;
    } else if (op === 'encerrar') {
      mudou = encerrarPorId(String(corpo.efeitoId || ''), 'manual');
    } else {
      var chave = String(corpo.chave || '');
      if (['morrendo', 'enlouquecendo', 'inconsciente', 'perturbado'].indexOf(chave) < 0) return { ok: false, erro: 'dados_invalidos' };
      if (!cond[chave] || typeof cond[chave] !== 'object') cond[chave] = { ativa: false, desde: '' };
      if (cond[chave].ativa !== true) { cond[chave].ativa = true; cond[chave].desde = agora; mudou = true; }
      if (chave === 'morrendo') {
        if (!cond.inconsciente || typeof cond.inconsciente !== 'object') cond.inconsciente = { ativa: false, desde: '' };
        if (cond.inconsciente.ativa !== true) { cond.inconsciente.ativa = true; cond.inconsciente.desde = agora; mudou = true; }
      }
      if (corpo.encerrar && encerrarPorId(String(corpo.encerrar), 'repeticao')) mudou = true;
    }

    if (!mudou) return { ok: true, rev: Number(registro.rev) || 0, dados: { mudou: false } };

    ficha.atualizadoEm = agora;
    registro.atualizadoEm = agora;
    registro.rev = (Number(registro.rev) || 0) + 1;
    var publicado = publicarFicha(registro, ficha, { operacao: operacao });
    if (!publicado.ok) return publicado;
    avisarMesas([registro.campanhaId], ['personagens', 'combates']);
    return { ok: true, rev: registro.rev, dados: { mudou: true } };
  });
}

/* Aplica os inícios e as retiradas de um lote de combate às fichas dos
   personagens. Cada ficha é gravada uma vez, com a revisão subindo como
   em qualquer gravação: quem estiver com ela aberta concilia na próxima
   gravação, evento a evento (js/sync.js). Uma ficha que não se monta não
   é tocada, e o mestre recebe o aviso para contar à mão. */
function aplicarTurnosAsFichas(ctx, combateId, eventos, participantesPorId, opId) {
  var avisos = [];
  if (!eventos.length) return avisos;
  var agora = new Date().toISOString();

  /* Os eventos do lote, com o id de cada um. */
  var evs = [];
  eventos.forEach(function (ev) {
    var pid = String(ev.participanteId);
    if (ev.tipo === 'retirada') { var r1 = idDoInicioDeTurno(combateId, ev.rodada, pid); if (r1) evs.push({ retirada: true, id: r1 }); return; }
    if (ev.tipo === 'retirada-fim') { var r2 = idDoFimDeTurno(combateId, ev.rodada, pid); if (r2) evs.push({ retirada: true, id: r2 }); return; }
    var id = ev.tipo === 'fim' ? idDoFimDeTurno(combateId, ev.rodada, pid) : idDoInicioDeTurno(combateId, ev.rodada, pid);
    if (!id) return;
    evs.push({ tipo: ev.tipo === 'fim' ? 'fim' : 'inicio', id: id, participanteId: pid, rodada: ev.rodada, desde: ev.desde || '', em: agora });
  });
  if (!evs.length) return avisos;

  /* Cada personagem do combate, com o participante que o representa: o
     turno de um participante pode contar na duração de um efeito de
     outro personagem ("até o fim do próximo turno de quem conjurou"). */
  var meuParticipante = {};
  Object.keys(participantesPorId).forEach(function (pid) {
    var p = participantesPorId[pid];
    if (p && p.tipo === 'personagem' && p.personagemId) meuParticipante[String(p.personagemId)] = String(pid);
  });

  Object.keys(meuParticipante).forEach(function (personagemId) {
    var meu = meuParticipante[personagemId];
    var registro = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
    if (!registro || String(registro.campanhaId) !== String(ctx.campanha.id)) return;

    var proj = projecaoDoRegistro(registro);
    if (proj && (!projecaoDeOrdem(proj) || !condicoesPedemLeitura(proj.ordem.condicoes, evs, meu))) return;

    try {
      var lido = lerFichaDoPersonagem(registro);
      if (!lido.ok) { avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId }); return; }
      var ficha = comVinculoDaColuna(lido.ficha, registro);
      if (!ehFichaDeOrdem(ficha)) return;
      var cond = ficha.ordem.condicoes;

      var mudou = false;
      evs.forEach(function (ev) {
        if (ev.retirada) {
          if (retirarInicioDaFicha(ficha, ev.id).length) mudou = true;
          if (retirarTurnoDosEfeitos(cond, ev.id).length) mudou = true;
          return;
        }
        if (ev.tipo === 'inicio' && ev.participanteId === meu) {
          if (registrarInicioNaFicha(ficha, { id: ev.id, rodada: ev.rodada, combate: String(combateId).slice(0, 60), em: agora }).length) mudou = true;
        }
        if (registrarTurnoNosEfeitos(cond, ev, meu).length) mudou = true;
      });
      if (!mudou) return;

      ficha.atualizadoEm = agora;
      registro.atualizadoEm = agora;
      registro.rev = (Number(registro.rev) || 0) + 1;
      var publicado = publicarFicha(registro, ficha, { operacao: idDeOperacao(('turno-' + opId).slice(0, 80)) });
      if (!publicado.ok) { avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId }); return; }
      marcarMesa(ctx.campanha.id, ['personagens']);
    } catch (erro) {
      console.warn('R.A.M.A.: condição de ' + personagemId + ' não contada: ' + erro);
      avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId });
    }
  });
  return avisos;
}

/* =====================================================================
   HEXATOMBE (v2.30 — Arquivos Secretos 2, p. 4–24)
   ---------------------------------------------------------------------
   O modo de campanha do Hexatombe. Uma linha por campanha em
   CAMPANHA_HEXATOMBE.

     ler_hexatombe       mestre: o estado inteiro; jogador: a VISTA dele
                         (a equipe em que tem personagem, as intenções
                         desbloqueadas, os sacrifícios realizados e o
                         diário público ou da equipe). Equipe rival sai só
                         com o nome; notas do mestre, pendências e
                         lançamentos pendentes nunca saem para jogador.
     salvar_hexatombe    só o mestre. O estado chega inteiro, com `rev` e
                         `opId`: o mesmo lote repetido não conta duas
                         vezes; revisão velha recebe o estado atual
                         (conflito). O servidor normaliza com a MESMA
                         régua do site (o módulo abaixo) e desfaz vínculos
                         com personagens que não são desta campanha.
     lancar_hexatombe    só o mestre, num personagem DESTA campanha: os
                         lançamentos de ficha (sede, fome, desertor,
                         castigo, intenção) com id estável — repetir não
                         lança de novo; desfazer marca o lançamento.

   O módulo é cópia fiel de js/ordem/hexatombe.js (o teste do backend
   confere byte a byte). Em Apps Script todos os arquivos dividem o mesmo
   escopo: o módulo só pendura RAMAHexatombe no global.
   ===================================================================== */

/* >>> js/ordem/hexatombe.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal · modo Hexatombe da campanha
   =====================================================================
   As regras de "Jogando o Hexatombe" (Arquivos Secretos 2, p. 4–24)
   como um ESTADO de campanha e um punhado de operações puras sobre ele.
   Quem desenha é js/ordem/telas/campanha-hexatombe.js; quem guarda e filtra
   para cada pessoa é o Apps Script (Campanhas.gs, "HEXATOMBE"), que
   normaliza com a mesma régua deste arquivo e nunca entrega ao jogador
   o que é do mestre ou de outra equipe.

   ---------------------------------------------------------------------
   O QUE O ESTADO GUARDA
   ---------------------------------------------------------------------

     ativo, nome, dia (0–6), fase, faseNota
     equipes        nome, base (melhorias, recursos especiais), estoque
                    (água, comida, sucata, outros itens), produção já
                    recebida por dia, notas do mestre
     participantes  nome, equipe, personagem vinculado (ou NPC),
                    sacrifício e estigma, vivo/morte, desertor, castigos
                    sofridos, perícias alternativas já usadas na jornada,
                    procuras de recursos, consumo por dia, déficits de
                    água e comida, intenções cumpridas, notas do mestre
     sacrificios    as mortes de sacrifício, válidas ou não, com herdeiro
     intencoes      os estigmas desbloqueados (cada sacrifício válido)
     areas, rotas   o mapa explorado (rota percorrida dispensa o teste)
     pendencias     o que só a mesa decide (a Coroa escolhe um herdeiro)
     registro       o diário do Hexatombe (os últimos 60 lançamentos)
     pendentes      lançamentos de ficha que ainda não chegaram
     regrasAs3      as regras opcionais de campanha do Arquivos Secretos 3
                    (v2.33): Trocas de Recursos e Tempo de Construção de
                    Base — desligadas por padrão
     obras          melhorias em construção (Tempo de Construção, AS3
                    p. 121), por equipe
     trocas         informações e segredos trocados por recursos (AS3
                    p. 121), com o conteúdo visível só à equipe e à mesa

   ---------------------------------------------------------------------
   TRÊS DECISÕES
   ---------------------------------------------------------------------

   1. NADA SE RESOLVE SOZINHO. Avançar o dia só muda o dia, a fase e a
      produção da base; mortes, encontros, consumo e intenções são
      lançados pela mesa, cada um na sua hora (p. 14: as fases são
      sugestões, e o mestre ajusta o ritmo).

   2. A FICHA RECEBE LANÇAMENTOS COM ORIGEM. Sede, fome, desertor,
      castigo da Coroa e recompensa de intenção viram lançamentos na
      ficha vinculada (ordem.hexatombe.lancamentos, js/ordem/arquivo2.js)
      com id ESTÁVEL ("hx.<regra>.<participante>.<marca>"): repetir o
      pedido não lança duas vezes, e desfazer é marcar o lançamento.

   3. O QUE O LIVRO NÃO FIXA FICA COM A MESA. A DT do teste de jornada
      não é dada (a mesa informa se passou); a leitura da tabela de
      recursos tem duas opções (uma rolagem na maior coluna alcançada —
      o padrão — ou uma em cada coluna); melhorias de recurso especial
      são instaladas pela mesa, sem teste.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var FASES = ["preparacao", "execucao", "conclusao"];
  var NOMES_FASE = { preparacao: "Preparação (início do dia)", execucao: "Execução (manhã e tarde)", conclusao: "Conclusão (noite)" };
  var DIAS = 6;
  var MAX_EQUIPES = 8;
  var MAX_PARTICIPANTES = 48;
  var MAX_REGISTRO = 60;
  var MAX_PENDENTES = 60;
  var MAX_CASTIGOS = 6;

  /* ---------------- estigmas e intenções (p. 9–10 e 24) ---------------- */

  var ESTIGMAS = [
    { chave: "desejo", nome: "Desejo", sentimentos: "Desejo, Ambição, Inveja",
      missao: "Chegar a morrendo e se recuperar por completo.",
      recompensa: "Na primeira vez no dia em que cair morrendo, recebe +15 PV temporários e se levanta.",
      lancamento: { tipo: "nota", valor: 0 } },
    { chave: "rancor", nome: "Rancor", sentimentos: "Rancor, Frustração, Ansiedade, Ira",
      missao: "Matar duas pessoas no mesmo dia.",
      recompensa: "Quando causa dano, causa +5 do mesmo tipo.",
      lancamento: { tipo: "dano", valor: 5 } },
    { chave: "obsessao", nome: "Obsessão", sentimentos: "Obsessão, Servidão, Paixão",
      missao: "Ser gravemente ferido por alguém da própria equipe.",
      recompensa: "Resistência a dano 5.",
      lancamento: { tipo: "rd", valor: 5 } },
    { chave: "culpa", nome: "Culpa", sentimentos: "Culpa, Vergonha, Arrependimento, Sofrimento",
      missao: "Deixar morrer um aliado que poderia ter sido salvo.",
      recompensa: "Recebe um poder de quem morreu (a mesa escolhe e registra na Progressão).",
      lancamento: { tipo: "nota", valor: 0 } },
    { chave: "prazer", nome: "Prazer", sentimentos: "Prazer, Euforia, Luxúria, Gula",
      missao: "Consumir 3 águas e 3 comidas na mesma noite.",
      recompensa: "+10 PV máximos.",
      lancamento: { tipo: "pvMax", valor: 10 } },
    { chave: "orgulho", nome: "Orgulho", sentimentos: "Orgulho, Desprezo, Arrogância",
      missao: "Matar alguém sem que essa pessoa o fira.",
      recompensa: "+10 PE máximos.",
      lancamento: { tipo: "peMax", valor: 10 } },
  ];
  var POR_ESTIGMA = {};
  ESTIGMAS.forEach(function (e) { POR_ESTIGMA[e.chave] = e; });

  /* ---------------- melhorias de base (p. 16–17) ---------------- */

  var MELHORIAS = [
    { chave: "limpeza", nome: "Limpeza da base", custo: 0, beneficio: "Obrigatória antes de qualquer outra melhoria." },
    { chave: "filtro", nome: "Filtro de água", custo: 1, beneficio: "6 águas por dia.", producao: { agua: 6 } },
    { chave: "geladeira", nome: "Geladeira", custo: 1, beneficio: "6 comidas por dia.", producao: { comida: 6 } },
    { chave: "camas", nome: "Camas", custo: 1, beneficio: "O descanso passa de precário a normal." },
    { chave: "casaNaArvore", nome: "Casa na árvore", custo: 2, beneficio: "Observatório: uma pergunta por dia sobre o estado do Hexatombe." },
    { chave: "defesas", nome: "Defesas externas", custo: 1, beneficio: "Na base: +2 em Iniciativa, Luta, Pontaria e Defesa." },
    { chave: "academia", nome: "Academia", custo: 1, beneficio: "O bônus de exercitar-se passa a +2d6." },
    { chave: "enfermaria", nome: "Enfermaria improvisada", recurso: "Materiais de enfermaria", beneficio: "Dormir sempre conta com cuidados prolongados (OPRPG p. 46)." },
    { chave: "biblioteca", nome: "Biblioteca do Pomba", recurso: "Documentos dos Pássaros (ou outros)", especialDaTransmissao: true, beneficio: "Informações novas todo dia, ou ler passa a +2d6." },
    { chave: "salaDeMusica", nome: "Sala de música", recurso: "Produtos da Psikolera", especialDaTransmissao: true, beneficio: "Dançar (ação de interlúdio): até o fim do dia, +2 em testes de Agi e Pre e −2 nos de For e Vig." },
    { chave: "adega", nome: "Adega de vinho", recurso: "Vinhos dos Vampiros", especialDaTransmissao: true, beneficio: "Beber o vinho de Sangue: até o fim do dia, +2 em testes de For e Vig e −2 nos de Int e Pre." },
    { chave: "garagem", nome: "Garagem", recurso: "Carro dos Couraças", especialDaTransmissao: true, beneficio: "Guarda o carro. Sem efeito de regra." },
  ];
  var POR_MELHORIA = {};
  MELHORIAS.forEach(function (m) { POR_MELHORIA[m.chave] = m; });
  var DT_MELHORIA = 20;

  var ACOES_DE_DESCANSO = ["Dormir", "Exercitar-se", "Ler", "Manutenção", "Relaxar"];

  /* ---------------- tabelas (p. 18–23) ---------------- */

  var CONSEQUENCIAS = [
    { n: 1, nome: "Encontro inesperado", texto: "A jornada para: role já um encontro de exploração (diurno ou noturno, conforme a hora)." },
    { n: 2, nome: "Barranco", texto: "Um personagem sorteado cai: 2d6 de dano de impacto e fatigado até o fim da próxima cena (Fortitude DT 20 reduz à metade e evita a condição)." },
    { n: 3, nome: "Animal peçonhento", texto: "Um personagem sorteado perde 1 PV e fica envenenado (enjoado) até dormir (Fortitude DT 20 evita a condição)." },
    { n: 4, nome: "Solo instável", texto: "Todos afundam e ficam agarrados; ao fim da terceira rodada, afundam de vez (asfixiado e paralisado). Escapar: Atletismo ou Acrobacia DT 20." },
    { n: 5, nome: "Espinheiro", texto: "Dois personagens sorteados sofrem 2d4 de dano de perfuração (Reflexos DT 20 reduz à metade)." },
    { n: 6, nome: "“Pacote” aéreo", texto: "Um personagem sorteado é atingido por uma ave: alquebrado e −2 em testes de Presença até se limpar." },
  ];

  var RECURSOS_ENCONTRADOS = [
    ["Comida", "Bandagem", "Bússola"],
    ["Sucata", "Incenso", "Caixa de Ferramentas"],
    ["Água", "Pedra de Amolar", "Kit de Escalada"],
    ["Bandagem", "Comida", "Catalisador Ampliador"],
    ["Incenso", "Sucata", "Catalisador Perturbador"],
    ["Dose de Álcool", "Água", "Catalisador Potencializador"],
    ["Balas Curtas", "Bússola", "Comida"],
    ["Balas Longas", "Caixa de Ferramentas", "Sucata"],
    ["Cartuchos", "Dose de Álcool", "Água"],
    ["Catalisador Ampliador", "Balas Curtas", "Pedra de Amolar"],
    ["Catalisador Perturbador", "Balas Longas", "Munição Explosiva"],
    ["Catalisador Potencializador", "Cartuchos", "Dinamite"],
  ];
  var COLUNAS_DE_RECURSO = [15, 20, 25];

  var ENCONTROS = {
    noturnoBase: { nome: "Noturno de base", dado: 6, faixas: [
      [2, "Acerto de contas", "Ao anoitecer, alguém de uma equipe rival chega cobrando uma luta de um contra um."],
      [4, "Sobrevivente", "Um grito se aproxima da base: um sobrevivente muito ferido pede ajuda — ou é uma armadilha."],
      [6, "Caçadores", "Três membros de uma equipe rival vêm atrás do sacrifício dos personagens; vão embora assim que um sacrifício for realizado."],
    ] },
    diurnoBase: { nome: "Diurno de base", dado: 8, faixas: [
      [2, "Uma ajuda extra", "Um participante forte de outra equipe propõe uma parceria pontual; aceitando, ele aparece depois para ajudar."],
      [4, "Bisbilhoteiro", "Barulhos ao redor da base: Percepção contra Furtividade revela alguém de outra equipe espiando."],
      [6, "Visita mal-intencionada", "Uma dupla de outra equipe aparece fazendo perguntas e, ao sair, deixa um “presente” adulterado na porta."],
      [8, "Invasão acanhada", "Um animal assustado invade a base. Morto, rende 3 comidas; poupado, fica abrigado até virar uma criatura sanguinária no fim do quinto dia."],
    ] },
    diurnoExploracao: { nome: "Diurno de exploração", dado: 10, faixas: [
      [2, "Fogo cruzado", "Os personagens chegam no meio de um tiroteio entre duas equipes e decidem se ajudam alguma."],
      [4, "Negociação", "Uma dupla de outra equipe vasculha o local; dá para negociar e dividir os recursos, conforme a relação entre as equipes."],
      [6, "Encontro às escondidas", "Dois participantes de equipes diferentes se encontram em segredo."],
      [8, "Pedágio", "Um participante forte de uma rival exige toda a comida e água que o grupo carrega — ou luta."],
      [10, "Armadilha", "Uma armadilha debilitante prende o grupo (testes para perceber e evitar, como a armadilha manda); três membros de uma rival aparecem para ameaçá-los."],
    ] },
    noturnoExploracao: { nome: "Noturno de exploração", dado: 8, faixas: [
      [2, "Armadilha", "Uma armadilha debilitante prende o grupo; três membros de uma rival aparecem para ameaçá-los."],
      [4, "Predador noturno", "Um animal perigoso caça o grupo: Percepção contra a Furtividade dele; quem falhar fica surpreendido na primeira rodada."],
      [6, "Criatura noturna", "Uma criatura paranormal ataca: Percepção contra a Furtividade dela; quem falhar fica surpreendido na primeira rodada."],
      [8, "Confronto antecipado", "Uma equipe a caminho de matar um sacrifício esbarra no grupo: sem sacrifício presente, há diálogo; com, combate até um sacrifício morrer."],
    ] },
  };

  /* ---------------- utilidades ---------------- */

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function agora() { return new Date().toISOString(); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!Number.isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) { var s = String(v || ""); return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) ? s : ""; }
  function copiar(v) { return JSON.parse(JSON.stringify(v)); }
  function chavesValidas(lista0, validas) {
    var vistas = {};
    return lista(lista0).filter(function (k) {
      if (validas.indexOf(k) < 0 || vistas[k]) return false;
      vistas[k] = true;
      return true;
    });
  }
  var CHAVES_ESTIGMA = ESTIGMAS.map(function (e) { return e.chave; });
  var CHAVES_MELHORIA = MELHORIAS.map(function (m) { return m.chave; });

  /* =================================================================
     NORMALIZAÇÃO — a mesma régua do servidor (Campanhas.gs)
     ================================================================= */

  function normalizarEstoque(e) {
    var x = e && typeof e === "object" ? e : {};
    var vistos = {};
    return {
      agua: inteiro(x.agua, 0, 999, 0),
      comida: inteiro(x.comida, 0, 999, 0),
      sucata: inteiro(x.sucata, 0, 999, 0),
      itens: lista(x.itens).map(function (i) {
        if (!i || typeof i !== "object") return null;
        var nome = texto(i.nome, 80);
        if (!nome || vistos[nome]) return null;
        vistos[nome] = true;
        var qtd = inteiro(i.qtd, 0, 999, 0);
        return qtd ? { nome: nome, qtd: qtd } : null;
      }).filter(Boolean).slice(0, 40),
    };
  }

  function normalizarEquipe(b) {
    if (!b || typeof b !== "object") return null;
    var id = idOk(b.id);
    var nome = texto(b.nome, 60);
    if (!id || !nome) return null;
    var base = b.base && typeof b.base === "object" ? b.base : {};
    var producao = {};
    Object.keys(b.producao && typeof b.producao === "object" ? b.producao : {}).forEach(function (d) {
      var n = inteiro(d, 1, DIAS, 0);
      if (n && b.producao[d] === true) producao[n] = true;
    });
    return {
      id: id, nome: nome,
      jogadores: b.jogadores === true,
      base: { nome: texto(base.nome, 80), melhorias: chavesValidas(base.melhorias, CHAVES_MELHORIA) },
      estoque: normalizarEstoque(b.estoque),
      obras: lista(b.obras).map(function (o) {
        if (!o || typeof o !== "object" || !idOk(o.id) || CHAVES_MELHORIA.indexOf(o.melhoria) < 0) return null;
        return { id: idOk(o.id), melhoria: o.melhoria, inicio: inteiro(o.inicio, 0, 999, 0), pessoas: inteiro(o.pessoas, 1, 99, 1),
          dias: inteiro(o.dias, 3, 7, 7), nota: texto(o.nota, 200) };
      }).filter(Boolean).slice(0, 8),
      producao: producao,
      notas: texto(b.notas, 1000),
    };
  }

  function normalizarParticipante(b, equipes) {
    if (!b || typeof b !== "object") return null;
    var id = idOk(b.id);
    var nome = texto(b.nome, 80);
    if (!id || !nome) return null;
    var equipeId = idOk(b.equipeId);
    if (equipeId && !equipes[equipeId]) equipeId = "";
    var morte = b.morte && typeof b.morte === "object" && b.vivo === false ? {
      dia: inteiro(b.morte.dia, 0, DIAS, 0), momento: b.morte.momento === "dia" ? "dia" : "noite",
      causa: ["morto", "suicidio", "acidente", "lua"].indexOf(b.morte.causa) >= 0 ? b.morte.causa : "morto",
      por: idOk(b.morte.por),
    } : null;
    var desertor = b.desertor && typeof b.desertor === "object" ? {
      desde: inteiro(b.desertor.desde, 0, DIAS, 0), motivo: b.desertor.motivo === "saiu" ? "saiu" : "equipe",
    } : null;
    var intencoes = {};
    Object.keys(b.intencoes && typeof b.intencoes === "object" ? b.intencoes : {}).forEach(function (k) {
      if (CHAVES_ESTIGMA.indexOf(k) < 0) return;
      var v = b.intencoes[k];
      if (v && typeof v === "object") intencoes[k] = { dia: inteiro(v.dia, 0, DIAS, 0) };
    });
    var consumo = {};
    Object.keys(b.consumo && typeof b.consumo === "object" ? b.consumo : {}).forEach(function (d) {
      var n = inteiro(d, 1, DIAS, 0);
      var v = b.consumo[d];
      if (n && v && typeof v === "object") consumo[n] = { agua: inteiro(v.agua, 0, 9, 0), comida: inteiro(v.comida, 0, 9, 0) };
    });
    return {
      id: id, nome: nome, equipeId: equipeId,
      personagemId: idOk(b.personagemId),
      sacrificio: b.sacrificio === true,
      estigma: CHAVES_ESTIGMA.indexOf(b.estigma) >= 0 ? b.estigma : "",
      original: b.original === true,
      vivo: b.vivo !== false,
      morte: morte,
      desertor: desertor,
      castigos: inteiro(b.castigos, 0, MAX_CASTIGOS, 0),
      alternativas: lista(b.alternativas).map(function (p) { return texto(p, 40); }).filter(Boolean).slice(0, 20),
      procuras: lista(b.procuras).map(idOk).filter(Boolean).slice(-40),
      consumo: consumo,
      sede: inteiro(b.sede, 0, DIAS, 0),
      fome: inteiro(b.fome, 0, DIAS, 0),
      /* "sede.<dia do déficit>@<dia em que a unidade a mais o recuperou>" */
      recuperados: lista(b.recuperados).filter(function (x) { return /^(sede|fome)\.\d@\d$/.test(String(x)); }).slice(0, 24),
      intencoes: intencoes,
      notas: texto(b.notas, 600),
    };
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var equipes = lista(b.equipes).map(normalizarEquipe).filter(Boolean);
    var vistasE = {};
    equipes = equipes.filter(function (e) { if (vistasE[e.id]) return false; vistasE[e.id] = true; return true; }).slice(0, MAX_EQUIPES);
    var porEquipe = {};
    equipes.forEach(function (e) { porEquipe[e.id] = true; });
    var vistosP = {};
    var participantes = lista(b.participantes).map(function (p) { return normalizarParticipante(p, porEquipe); })
      .filter(function (p) { if (!p || vistosP[p.id]) return false; vistosP[p.id] = true; return true; })
      .slice(0, MAX_PARTICIPANTES);
    var vistasA = {};
    var areas = lista(b.areas).map(function (a) {
      if (!a || typeof a !== "object") return null;
      var id = idOk(a.id);
      var nome = texto(a.nome, 60);
      if (!id || !nome || vistasA[id]) return null;
      vistasA[id] = true;
      return { id: id, nome: nome, explorada: a.explorada === true };
    }).filter(Boolean).slice(0, 40);
    var rotas = lista(b.rotas).map(function (r) {
      if (!r || typeof r !== "object") return null;
      var de = idOk(r.de), para = idOk(r.para);
      return de && para && vistasA[de] && vistasA[para] && de !== para ? { de: de, para: para } : null;
    }).filter(Boolean).slice(0, 80);
    return {
      versao: 1,
      ativo: b.ativo === true,
      nome: texto(b.nome, 60) || "Hexatombe",
      dia: inteiro(b.dia, 0, DIAS, 0),
      fase: FASES.indexOf(b.fase) >= 0 ? b.fase : "preparacao",
      faseNota: texto(b.faseNota, 200),
      leituraDeRecursos: b.leituraDeRecursos === "cumulativa" ? "cumulativa" : "coluna",
      regrasAs3: {
        trocas: !!(b.regrasAs3 && b.regrasAs3.trocas === true),
        construcao: !!(b.regrasAs3 && b.regrasAs3.construcao === true),
      },
      trocas: lista(b.trocas).map(function (x) {
        if (!x || typeof x !== "object" || !idOk(x.id) || !porEquipe[x.equipeId]) return null;
        var pg = x.pagamento && typeof x.pagamento === "object" ? x.pagamento : {};
        return {
          id: idOk(x.id), dia: inteiro(x.dia, 0, DIAS, 0), equipeId: x.equipeId, npc: texto(x.npc, 60),
          tipo: x.tipo === "segredo" ? "segredo" : "informacao",
          pagamento: { agua: inteiro(pg.agua, 0, 3, 0), comida: inteiro(pg.comida, 0, 3, 0), sucata: inteiro(pg.sucata, 0, 3, 0) },
          sobre: texto(x.sobre, 80), conteudo: texto(x.conteudo, 600),
        };
      }).filter(Boolean).slice(-40),
      fracassou: b.fracassou === true,
      equipes: equipes,
      participantes: participantes,
      sacrificios: lista(b.sacrificios).map(function (s) {
        if (!s || typeof s !== "object" || !idOk(s.id)) return null;
        return {
          id: idOk(s.id), dia: inteiro(s.dia, 0, DIAS, 0), participanteId: idOk(s.participanteId),
          estigma: CHAVES_ESTIGMA.indexOf(s.estigma) >= 0 ? s.estigma : "", valido: s.valido === true,
          por: idOk(s.por), herdeiro: idOk(s.herdeiro),
        };
      }).filter(Boolean).slice(-24),
      intencoes: lista(b.intencoes).map(function (x) {
        if (!x || typeof x !== "object" || CHAVES_ESTIGMA.indexOf(x.estigma) < 0) return null;
        return { estigma: x.estigma, dia: inteiro(x.dia, 0, DIAS, 0), sacrificioId: idOk(x.sacrificioId) };
      }).filter(Boolean).slice(0, 24),
      areas: areas,
      rotas: rotas,
      pendencias: lista(b.pendencias).map(function (x) {
        if (!x || typeof x !== "object" || x.tipo !== "herdeiro" || CHAVES_ESTIGMA.indexOf(x.estigma) < 0) return null;
        return { id: idOk(x.id) || ("pend-" + uuid()), tipo: "herdeiro", estigma: x.estigma, dia: inteiro(x.dia, 0, DIAS, 0), motivo: texto(x.motivo, 200) };
      }).filter(Boolean).slice(0, 12),
      registro: lista(b.registro).map(function (r) {
        if (!r || typeof r !== "object" || !idOk(r.id)) return null;
        var vis = r.visivel === "mestre" ? "mestre" : (idOk(r.visivel) && porEquipe[r.visivel] ? r.visivel : "todos");
        return { id: idOk(r.id), dia: inteiro(r.dia, 0, DIAS, 0), tipo: texto(r.tipo, 30), texto: texto(r.texto, 400), em: carimbo(r.em), visivel: vis };
      }).filter(Boolean).slice(-MAX_REGISTRO),
      pendentes: lista(b.pendentes).map(function (x) {
        if (!x || typeof x !== "object") return null;
        var pid = idOk(x.personagemId);
        var l = x.lancamento && typeof x.lancamento === "object" ? x.lancamento : null;
        if (!pid || !l || !idOk(l.id)) return null;
        /* motivo: por que ainda não chegou (ex.: a ficha não liga a
           Participação no Hexatombe, v2.31). */
        return { personagemId: pid, desfazer: x.desfazer === true, motivo: x.motivo === "participacao_desligada" ? x.motivo : "", lancamento: {
          id: idOk(l.id), tipo: texto(l.tipo, 20), valor: inteiro(l.valor, -999, 999, 0), dia: inteiro(l.dia, 0, DIAS, 0),
          motivo: texto(l.motivo, 200), origem: texto(l.origem, 80), atualPv: inteiro(l.atualPv, -999, 0, 0), refazer: l.refazer === true,
        } };
      }).filter(Boolean).slice(-MAX_PENDENTES),
    };
  }

  function vazio() { return normalizar({}); }

  /* =================================================================
     CONSULTAS
     ================================================================= */

  function equipe(estado, id) { return estado.equipes.filter(function (e) { return e.id === id; })[0] || null; }
  function participante(estado, id) { return estado.participantes.filter(function (p) { return p.id === id; })[0] || null; }
  function membros(estado, equipeId) { return estado.participantes.filter(function (p) { return p.equipeId === equipeId; }); }
  function vivos(estado) { return estado.participantes.filter(function (p) { return p.vivo; }); }
  function sacrificioValidoNoDia(estado, dia) { return estado.sacrificios.filter(function (s) { return s.valido && s.dia === dia; })[0] || null; }
  function desbloqueada(estado, estigma) { return estado.intencoes.some(function (x) { return x.estigma === estigma; }); }

  /* A equipe perdeu o sacrifício: algum membro dela, sacrifício, morreu
     (ou o estigma saiu dela) e ninguém da equipe o porta mais. */
  function equipeDesertora(estado, equipeId) {
    var m = membros(estado, equipeId);
    return m.some(function (p) { return p.desertor && p.desertor.motivo === "equipe"; });
  }

  function condicaoDeDescanso(estado, equipeId) {
    var e = equipe(estado, equipeId);
    return e && e.base.melhorias.indexOf("camas") >= 0 ? "normal" : "precária";
  }

  /* =================================================================
     OPERAÇÕES
     -----------------------------------------------------------------
     Todas mudam o estado recebido e devolvem
       { ok, motivo?, avisos: [], lancamentos: [{ personagemId, lancamento }],
         desfazer: [{ personagemId, id }] }
     `rolar(faces)` pode ser injetado (testes); sem ele, Math.random.
     ================================================================= */

  function resultado() { return { ok: true, avisos: [], lancamentos: [], desfazer: [] }; }
  function falha(motivo) { return { ok: false, motivo: motivo, avisos: [], lancamentos: [], desfazer: [] }; }
  function dado(rolar, faces) { return typeof rolar === "function" ? inteiro(rolar(faces), 1, faces, 1) : 1 + Math.floor(Math.random() * faces); }

  function registrar(estado, tipo, txt, visivel) {
    estado.registro.push({ id: "reg-" + uuid(), dia: estado.dia, tipo: texto(tipo, 30), texto: texto(txt, 400), em: agora(), visivel: visivel || "todos" });
    if (estado.registro.length > MAX_REGISTRO) estado.registro = estado.registro.slice(-MAX_REGISTRO);
  }

  /* O lançamento que vai para a ficha vinculada (se houver). */
  function lancar(r, p, id, tipo, valor, motivo, origem, extra) {
    if (!p || !p.personagemId) return;
    var l = Object.assign({ id: id, tipo: tipo, valor: valor, dia: 0, motivo: texto(motivo, 200), origem: texto(origem || "Hexatombe", 80) }, extra || {});
    r.lancamentos.push({ personagemId: p.personagemId, lancamento: l });
  }

  function ligar(estado, ativo) {
    estado.ativo = !!ativo;
    registrar(estado, "modo", ativo ? "O mestre ativou o Hexatombe nesta campanha." : "O mestre desativou o Hexatombe (nada foi apagado).", "mestre");
    return resultado();
  }

  function definirFase(estado, fase, nota) {
    if (FASES.indexOf(fase) < 0) return falha("Fase desconhecida.");
    estado.fase = fase;
    estado.faseNota = texto(nota, 200);
    return resultado();
  }

  /* Só muda o dia, a fase e a produção da base (p. 17). Não resolve
     mortes, encontros, consumo nem intenções. */
  function avancarDia(estado) {
    if (estado.dia >= DIAS) return falha("O sexto dia é o último: a Lua de Sangue fecha o Hexatombe.");
    var r = resultado();
    var anterior = estado.dia;
    if (anterior >= 1 && !sacrificioValidoNoDia(estado, anterior)) {
      r.avisos.push("Nenhum sacrifício válido no dia " + anterior + ": pelas regras, o Hexatombe fracassa (p. 15). Marque o fracasso se a mesa confirmar.");
    }
    if (anterior >= 1) {
      var semConsumo = vivos(estado).filter(function (p) { return !p.consumo[anterior]; }).map(function (p) { return p.nome; });
      if (semConsumo.length) r.avisos.push("Sem consumo registrado no dia " + anterior + ": " + semConsumo.join(", ") + ". Nada foi lançado por eles.");
    }
    estado.dia = anterior + 1;
    estado.fase = "preparacao";
    estado.faseNota = "";
    estado.equipes.forEach(function (e) {
      if (e.producao[estado.dia]) return;
      var agua = 0, comida = 0;
      e.base.melhorias.forEach(function (k) {
        var m = POR_MELHORIA[k];
        if (m && m.producao) { agua += m.producao.agua || 0; comida += m.producao.comida || 0; }
      });
      e.producao[estado.dia] = true;
      if (agua || comida) {
        e.estoque.agua = Math.min(999, e.estoque.agua + agua);
        e.estoque.comida = Math.min(999, e.estoque.comida + comida);
        registrar(estado, "base", e.nome + ": a base produziu " + (agua ? agua + " água(s)" : "") + (agua && comida ? " e " : "") + (comida ? comida + " comida(s)" : "") + ".", e.id);
      }
    });
    registrar(estado, "dia", "Começa o dia " + estado.dia + ".", "todos");
    return r;
  }

  function salvarEquipe(estado, dados) {
    var id = idOk(dados && dados.id) || ("eq-" + uuid());
    var atual = equipe(estado, id);
    var nova = normalizarEquipe(Object.assign({}, atual || {}, dados || {}, { id: id }));
    if (!nova) return falha("A equipe precisa de nome.");
    if (!atual && estado.equipes.length >= MAX_EQUIPES) return falha("Limite de " + MAX_EQUIPES + " equipes.");
    if (atual) estado.equipes[estado.equipes.indexOf(atual)] = nova; else estado.equipes.push(nova);
    var r = resultado();
    r.id = id;
    return r;
  }

  function removerEquipe(estado, id) {
    if (membros(estado, id).length) return falha("Tire os participantes da equipe antes.");
    estado.equipes = estado.equipes.filter(function (e) { return e.id !== id; });
    return resultado();
  }

  function salvarParticipante(estado, dados) {
    var id = idOk(dados && dados.id) || ("pt-" + uuid());
    var atual = participante(estado, id);
    var porEquipe = {};
    estado.equipes.forEach(function (e) { porEquipe[e.id] = true; });
    var novo = normalizarParticipante(Object.assign({}, atual || {}, dados || {}, { id: id }), porEquipe);
    if (!novo) return falha("O participante precisa de nome.");
    if (!atual && estado.participantes.length >= MAX_PARTICIPANTES) return falha("Limite de participantes.");
    if (novo.sacrificio && !novo.estigma) return falha("Um sacrifício porta um estigma: escolha qual.");
    if (!novo.sacrificio) novo.estigma = "";
    if (atual) estado.participantes[estado.participantes.indexOf(atual)] = novo; else estado.participantes.push(novo);
    var r = resultado();
    r.id = id;
    return r;
  }

  function removerParticipante(estado, id) {
    estado.participantes = estado.participantes.filter(function (p) { return p.id !== id; });
    return resultado();
  }

  /* Desertor (p. 11): −1 dado em testes e PV máximos pela metade. Por
     ter saído da arena é temporário (volta ao retornar); por perder o
     sacrifício, permanente. */
  function tornarDesertor(estado, r, p, motivo) {
    if (!p || !p.vivo || p.desertor) return;
    p.desertor = { desde: estado.dia, motivo: motivo === "saiu" ? "saiu" : "equipe" };
    lancar(r, p, "hx.desertor.metade." + p.id, "pvMetade", 0, "Desertor do Hexatombe: PV máximos pela metade (AS2 p. 11)", "Desertor");
    lancar(r, p, "hx.desertor.dado." + p.id, "dadosTestes", -1, "Desertor do Hexatombe: −1 dado em testes (AS2 p. 11)", "Desertor");
  }

  function marcarDesertor(estado, participanteId, motivo) {
    var p = participante(estado, participanteId);
    if (!p || !p.vivo) return falha("Participante não encontrado ou morto.");
    if (p.desertor) return falha("Já é desertor.");
    var r = resultado();
    tornarDesertor(estado, r, p, motivo);
    registrar(estado, "desertor", p.nome + (motivo === "saiu" ? " saiu da arena e virou desertor até voltar." : " virou desertor."), "mestre");
    return r;
  }

  /* Só quem saiu da arena deixa de ser desertor ao voltar. */
  function retornarDaArena(estado, participanteId) {
    var p = participante(estado, participanteId);
    if (!p || !p.desertor) return falha("Não é desertor.");
    if (p.desertor.motivo !== "saiu") return falha("Quem perdeu o sacrifício só deixa de ser desertor ficando entre os seis finais (p. 15).");
    p.desertor = null;
    var r = resultado();
    if (p.personagemId) {
      r.desfazer.push({ personagemId: p.personagemId, id: "hx.desertor.metade." + p.id });
      r.desfazer.push({ personagemId: p.personagemId, id: "hx.desertor.dado." + p.id });
    }
    registrar(estado, "desertor", p.nome + " voltou à arena.", "mestre");
    return r;
  }

  /* A morte de alguém — a regra mais carregada do Hexatombe (p. 6, 11 e
     15). opcoes: { participanteId, por, momento: "noite"|"dia",
     causa: "morto"|"suicidio"|"acidente", rolar } */
  function registrarMorte(estado, opcoes) {
    var o = opcoes || {};
    var p = participante(estado, o.participanteId);
    if (!p) return falha("Participante não encontrado.");
    if (!p.vivo) return falha(p.nome + " já está morto.");
    var momento = o.momento === "dia" ? "dia" : "noite";
    var causa = ["morto", "suicidio", "acidente"].indexOf(o.causa) >= 0 ? o.causa : "morto";
    var algoz = causa === "morto" ? participante(estado, o.por) : null;
    var r = resultado();

    p.vivo = false;
    p.morte = { dia: estado.dia, momento: momento, causa: causa, por: algoz ? algoz.id : "" };

    if (!p.sacrificio) {
      registrar(estado, "morte", p.nome + " morreu.", "mestre");
      return r;
    }

    var valido = momento === "noite" && !sacrificioValidoNoDia(estado, estado.dia);
    var sac = { id: "sac-" + uuid(), dia: estado.dia, participanteId: p.id, estigma: p.estigma, valido: valido, por: algoz ? algoz.id : "", herdeiro: "" };
    estado.sacrificios.push(sac);
    var estigma = POR_ESTIGMA[p.estigma];

    if (valido) {
      /* O sino toca: castigo dos desertores que já existiam, intenção
         desbloqueada — e só depois a equipe do sacrifício deserta. */
      estado.participantes.forEach(function (d) {
        if (!d.vivo || !d.desertor || d.castigos >= MAX_CASTIGOS) return;
        var n = dado(o.rolar, 10);
        d.castigos += 1;
        lancar(r, d, "hx.castigo.pv." + d.id + "." + sac.id, "pvMax", -n, "Castigo da Coroa ao desertor: sacrifício nº " + d.castigos + " (−1d10 = " + n + " PV máx. e atuais)", "Desertor", { atualPv: -n });
        lancar(r, d, "hx.castigo.t." + d.id + "." + sac.id, "testes", -1, "Castigo da Coroa ao desertor: sacrifício nº " + d.castigos + " (−1 em testes)", "Desertor");
        r.avisos.push(d.nome + ": −" + n + " PV máximos e atuais, −1 em testes; Fortitude DT 20 ou fica inconsciente até o amanhecer.");
      });
      if (estigma && !desbloqueada(estado, estigma.chave)) estado.intencoes.push({ estigma: estigma.chave, dia: estado.dia, sacrificioId: sac.id });
      registrar(estado, "sacrificio", "O sino tocou: um sacrifício (" + (estigma ? estigma.nome : "sem estigma") + ") foi realizado no dia " + estado.dia + ". Intenção desbloqueada.", "todos");
      if (estado.dia >= DIAS) r.avisos.push("Sacrifício na sexta noite. Confira se há seis participantes vivos para o sacrifício final (p. 6).");
    } else {
      /* Segundo sacrifício da noite, ou morto de dia: o estigma passa a
         quem matou — ou a Coroa escolhe outro digno. */
      var herda = algoz && algoz.vivo && !algoz.sacrificio && causa === "morto";
      if (herda) {
        algoz.sacrificio = true;
        algoz.estigma = p.estigma;
        algoz.original = false;
        sac.herdeiro = algoz.id;
        registrar(estado, "estigma", algoz.nome + " herdou o estigma de " + (estigma ? estigma.nome : "?") + ".", "mestre");
      } else {
        estado.pendencias.push({ id: "pend-" + uuid(), tipo: "herdeiro", estigma: p.estigma, dia: estado.dia,
          motivo: causa === "suicidio" ? "O sacrifício tirou a própria vida num dia que já teve sacrifício (regra VIII)." : "Quem matou não pode herdar (ou foi acidente)." });
        r.avisos.push("A Coroa de Espinhos escolhe outro participante digno para o estigma. Defina o herdeiro.");
      }
      registrar(estado, "morte", p.nome + " (sacrifício) morreu " + (momento === "dia" ? "de dia" : "depois do sacrifício da noite") + ": não conta como sacrifício.", "mestre");
    }

    /* A equipe que perde o sacrifício deserta (p. 11). */
    if (p.equipeId) {
      var aindaTem = membros(estado, p.equipeId).some(function (m) { return m.vivo && m.sacrificio; });
      if (!aindaTem) {
        membros(estado, p.equipeId).forEach(function (m) { tornarDesertor(estado, r, m, "equipe"); });
        var eq = equipe(estado, p.equipeId);
        registrar(estado, "desertor", (eq ? eq.nome : "A equipe") + " perdeu o sacrifício: seus membros são desertores.", "mestre");
      }
    }
    return r;
  }

  function escolherHerdeiro(estado, pendenciaId, participanteId) {
    var pend = estado.pendencias.filter(function (x) { return x.id === pendenciaId; })[0];
    if (!pend) return falha("Pendência não encontrada.");
    var h = participante(estado, participanteId);
    if (!h || !h.vivo) return falha("O herdeiro precisa estar vivo.");
    if (h.sacrificio) return falha("Quem já é sacrifício não herda outro estigma.");
    h.sacrificio = true;
    h.estigma = pend.estigma;
    h.original = false;
    estado.pendencias = estado.pendencias.filter(function (x) { return x !== pend; });
    registrar(estado, "estigma", "A Coroa escolheu " + h.nome + " para o estigma de " + POR_ESTIGMA[pend.estigma].nome + ".", "mestre");
    return resultado();
  }

  /* Consumo do dia (p. 20): ao menos 1 água e 1 comida por participante
     até a conclusão. Faltando, −10 PV (ou PE) máximos a partir do dia
     seguinte; recupera consumindo 1 unidade a mais no fim de um dia
     seguinte. Tira do estoque da equipe. */
  function consumir(estado, participanteId, agua, comida) {
    var p = participante(estado, participanteId);
    if (!p || !p.vivo) return falha("Participante não encontrado ou morto.");
    if (estado.dia < 1) return falha("O Hexatombe ainda não começou (dia 0).");
    if (p.consumo[estado.dia]) return falha(p.nome + " já tem o consumo do dia " + estado.dia + " registrado. Desfaça antes de registrar de novo.");
    var a = inteiro(agua, 0, 9, 0), c = inteiro(comida, 0, 9, 0);
    var eq = equipe(estado, p.equipeId);
    if (eq && (eq.estoque.agua < a || eq.estoque.comida < c)) return falha("O estoque da equipe não tem o suficiente.");
    if (eq) { eq.estoque.agua -= a; eq.estoque.comida -= c; }
    p.consumo[estado.dia] = { agua: a, comida: c };
    var r = resultado();
    regraDoRecurso(estado, r, p, "sede", a, "pvMax", "PV");
    regraDoRecurso(estado, r, p, "fome", c, "peMax", "PE");
    if (a >= 3 && c >= 3 && desbloqueada(estado, "prazer") && !p.intencoes.prazer) {
      r.avisos.push(p.nome + " consumiu 3 águas e 3 comidas: a intenção do Prazer pode ter sido cumprida (confirme).");
    }
    registrar(estado, "consumo", p.nome + ": " + a + " água(s), " + c + " comida(s).", eq ? eq.id : "mestre");
    return r;
  }

  function regraDoRecurso(estado, r, p, chave, qtd, tipo, sigla) {
    if (qtd < 1) {
      p[chave] += 1;
      lancar(r, p, "hx." + chave + "." + p.id + ".d" + estado.dia, tipo, -10,
        (chave === "sede" ? "Sem água" : "Sem comida") + " no dia " + estado.dia + ": −10 " + sigla + " máximos (AS2 p. 20)", "Hexatombe", { dia: estado.dia + 1 });
      return;
    }
    if (qtd >= 2 && p[chave] > 0) {
      /* A unidade a mais recupera o déficit mais antigo ainda aberto. */
      var campo = chave === "sede" ? "agua" : "comida";
      var jaRecuperados = p.recuperados.map(function (x) { return x.split("@")[0]; });
      var dia = Object.keys(p.consumo).map(Number).sort(function (x, y) { return x - y; }).filter(function (d) {
        return d < estado.dia && p.consumo[d][campo] < 1 && jaRecuperados.indexOf(chave + "." + d) < 0;
      })[0];
      p[chave] -= 1;
      if (dia) {
        p.recuperados.push(chave + "." + dia + "@" + estado.dia);
        if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx." + chave + "." + p.id + ".d" + dia });
        r.avisos.push(p.nome + " recuperou os máximos perdidos " + (chave === "sede" ? "por sede" : "por fome") + " no dia " + dia + ".");
      }
    }
  }

  function desfazerConsumo(estado, participanteId, dia) {
    var p = participante(estado, participanteId);
    var d = inteiro(dia, 1, DIAS, 0);
    if (!p || !p.consumo[d]) return falha("Nada registrado nesse dia.");
    var c = p.consumo[d];
    var eq = equipe(estado, p.equipeId);
    if (eq) { eq.estoque.agua = Math.min(999, eq.estoque.agua + c.agua); eq.estoque.comida = Math.min(999, eq.estoque.comida + c.comida); }
    delete p.consumo[d];
    var r = resultado();
    if (c.agua < 1) { p.sede = Math.max(0, p.sede - 1); if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.sede." + p.id + ".d" + d }); }
    if (c.comida < 1) { p.fome = Math.max(0, p.fome - 1); if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.fome." + p.id + ".d" + d }); }
    /* A unidade a mais daquele dia tinha recuperado um déficit: ele volta. */
    p.recuperados = p.recuperados.filter(function (x) {
      var m = /^(sede|fome)\.(\d)@(\d)$/.exec(x);
      if (!m || Number(m[3]) !== d) return true;
      p[m[1]] += 1;
      lancar(r, p, "hx." + m[1] + "." + p.id + ".d" + m[2], m[1] === "sede" ? "pvMax" : "peMax", -10,
        (m[1] === "sede" ? "Sem água" : "Sem comida") + " no dia " + m[2] + ": −10 " + (m[1] === "sede" ? "PV" : "PE") + " máximos (AS2 p. 20)", "Hexatombe", { dia: Number(m[2]) + 1, refazer: true });
      return false;
    });
    registrar(estado, "consumo", "Consumo de " + p.nome + " no dia " + d + " desfeito (o estoque voltou).", "mestre");
    return r;
  }

  /* Fazer melhorias (p. 16): teste contra DT 20. Passa, faz e gasta;
     falha, nada; falha por 5 ou mais, gasta a sucata sem fazer. */
  function tentarMelhoria(estado, equipeId, chave, total) {
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m) return falha("Equipe ou melhoria desconhecida.");
    if (m.recurso) return falha(m.nome + " depende de um recurso específico: instale pela mesa quando o grupo o conseguir.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("A base já tem " + m.nome + ".");
    if (chave !== "limpeza" && e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    if (e.estoque.sucata < m.custo) return falha("Sucata insuficiente: precisa de " + m.custo + ".");
    var n = Math.round(Number(total));
    if (!Number.isFinite(n)) return falha("Informe o resultado do teste.");
    var r = resultado();
    if (n >= DT_MELHORIA) {
      e.estoque.sucata -= m.custo;
      e.base.melhorias.push(chave);
      r.feito = true;
      registrar(estado, "base", e.nome + " construiu " + m.nome + " (teste " + n + ").", e.id);
    } else if (n <= DT_MELHORIA - 5) {
      e.estoque.sucata -= m.custo;
      r.perdeu = true;
      registrar(estado, "base", e.nome + " falhou por 5 ou mais em " + m.nome + " (teste " + n + "): a sucata quebrou.", e.id);
    } else {
      registrar(estado, "base", e.nome + " não conseguiu fazer " + m.nome + " (teste " + n + "); a sucata ficou.", e.id);
    }
    return r;
  }

  function instalarMelhoriaEspecial(estado, equipeId, chave) {
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m || !m.recurso) return falha("Melhoria especial desconhecida.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("Já instalada.");
    if (e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    e.base.melhorias.push(chave);
    registrar(estado, "base", e.nome + " instalou " + m.nome + " (" + m.recurso + ").", e.id);
    return resultado();
  }

  function removerMelhoria(estado, equipeId, chave) {
    var e = equipe(estado, equipeId);
    if (!e || e.base.melhorias.indexOf(chave) < 0) return falha("A base não tem essa melhoria.");
    e.base.melhorias = e.base.melhorias.filter(function (k) { return k !== chave; });
    registrar(estado, "base", e.nome + " perdeu " + POR_MELHORIA[chave].nome + ".", "mestre");
    return resultado();
  }

  /* ---------------- Arquivos Secretos 3 (p. 121) ---------------- */

  function definirRegrasAs3(estado, regras) {
    var r = regras && typeof regras === "object" ? regras : {};
    estado.regrasAs3 = { trocas: r.trocas === true, construcao: r.construcao === true };
    registrar(estado, "regras", "Regras do Arquivos Secretos 3: trocas de recursos " + (r.trocas ? "ligadas" : "desligadas") +
      ", tempo de construção " + (r.construcao ? "ligado" : "desligado") + ".", "mestre");
    return resultado();
  }

  /* Tempo de Construção de Base: 7 dias para uma pessoa, −1 por pessoa a
     mais, mínimo 3. As melhorias improvisadas (tentarMelhoria, AS2 p. 16)
     continuam valendo ao lado desta regra. A sucata da melhoria sai no
     começo da obra; a obra só termina quando a mesa conclui. */
  function diasDeObra(pessoas) { return Math.max(3, 7 - (inteiro(pessoas, 1, 99, 1) - 1)); }

  function iniciarObra(estado, equipeId, chave, pessoas, nota) {
    if (!estado.regrasAs3 || !estado.regrasAs3.construcao) return falha("A regra Tempo de Construção de Base (Arquivos Secretos 3, p. 121) está desligada.");
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m) return falha("Equipe ou melhoria desconhecida.");
    if (m.recurso) return falha(m.nome + " depende de um recurso específico: instale pela mesa quando o grupo o conseguir.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("A base já tem " + m.nome + ".");
    if (chave !== "limpeza" && e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    if (lista(e.obras).some(function (o) { return o.melhoria === chave; })) return falha(m.nome + " já está em obra.");
    if (e.estoque.sucata < m.custo) return falha("Sucata insuficiente: precisa de " + m.custo + ".");
    var n = inteiro(pessoas, 1, 99, 1);
    var obra = { id: "ob-" + uuid(), melhoria: chave, inicio: estado.dia, pessoas: n, dias: diasDeObra(n), nota: texto(nota, 200) };
    e.estoque.sucata -= m.custo;
    if (!Array.isArray(e.obras)) e.obras = [];
    e.obras.push(obra);
    registrar(estado, "base", e.nome + " começou a construir " + m.nome + " com " + n + " pessoa(s): " + obra.dias + " dias (pronta no dia " + (obra.inicio + obra.dias) + ").", e.id);
    var r = resultado();
    r.obra = obra;
    return r;
  }

  function concluirObra(estado, equipeId, obraId, forcar) {
    var e = equipe(estado, equipeId);
    var obra = e ? lista(e.obras).filter(function (o) { return o.id === obraId; })[0] : null;
    if (!obra) return falha("Obra desconhecida.");
    var pronta = obra.inicio + obra.dias;
    if (estado.dia < pronta && !forcar) return falha("A obra fica pronta no dia " + pronta + " (hoje é o dia " + estado.dia + ").");
    e.obras = e.obras.filter(function (o) { return o.id !== obraId; });
    if (e.base.melhorias.indexOf(obra.melhoria) < 0) e.base.melhorias.push(obra.melhoria);
    registrar(estado, "base", e.nome + " terminou " + POR_MELHORIA[obra.melhoria].nome + ".", e.id);
    return resultado();
  }

  function cancelarObra(estado, equipeId, obraId) {
    var e = equipe(estado, equipeId);
    var obra = e ? lista(e.obras).filter(function (o) { return o.id === obraId; })[0] : null;
    if (!obra) return falha("Obra desconhecida.");
    e.obras = e.obras.filter(function (o) { return o.id !== obraId; });
    registrar(estado, "base", e.nome + " abandonou a obra de " + POR_MELHORIA[obra.melhoria].nome + " (a sucata gasta não volta).", e.id);
    return resultado();
  }

  /* Trocas de Recursos: informação (1 recurso) ou segredo (3), pagos em
     água, comida ou sucata — o NPC pode exigir um só tipo. */
  var CUSTO_DA_TROCA = { informacao: 1, segredo: 3 };

  function registrarTroca(estado, dados) {
    if (!estado.regrasAs3 || !estado.regrasAs3.trocas) return falha("A regra Trocas de Recursos (Arquivos Secretos 3, p. 121) está desligada.");
    var d = dados && typeof dados === "object" ? dados : {};
    var e = equipe(estado, d.equipeId);
    if (!e) return falha("Equipe desconhecida.");
    var tipo = d.tipo === "segredo" ? "segredo" : "informacao";
    var pg = d.pagamento && typeof d.pagamento === "object" ? d.pagamento : {};
    var pagamento = { agua: inteiro(pg.agua, 0, 3, 0), comida: inteiro(pg.comida, 0, 3, 0), sucata: inteiro(pg.sucata, 0, 3, 0) };
    var soma = pagamento.agua + pagamento.comida + pagamento.sucata;
    if (soma !== CUSTO_DA_TROCA[tipo]) return falha((tipo === "segredo" ? "Um segredo custa 3 recursos" : "Uma informação custa 1 recurso") + "; o pagamento soma " + soma + ".");
    var so = d.so === "agua" || d.so === "comida" || d.so === "sucata" ? d.so : "";
    if (so && pagamento[so] !== soma) return falha("O NPC só aceita " + so + ".");
    if (e.estoque.agua < pagamento.agua || e.estoque.comida < pagamento.comida || e.estoque.sucata < pagamento.sucata) return falha("O estoque da equipe não tem o suficiente.");
    e.estoque.agua -= pagamento.agua;
    e.estoque.comida -= pagamento.comida;
    e.estoque.sucata -= pagamento.sucata;
    var t = { id: "tr-" + uuid(), dia: estado.dia, equipeId: e.id, npc: texto(d.npc, 60), tipo: tipo, pagamento: pagamento, sobre: texto(d.sobre, 80), conteudo: texto(d.conteudo, 600) };
    if (!Array.isArray(estado.trocas)) estado.trocas = [];
    estado.trocas.push(t);
    estado.trocas = estado.trocas.slice(-40);
    registrar(estado, "troca", e.nome + " trocou " + soma + " recurso(s) por " + (tipo === "segredo" ? "um segredo" : "uma informação") + (t.sobre ? " sobre " + t.sobre : "") + (t.npc ? " com " + t.npc : "") + ".", e.id);
    var r = resultado();
    r.troca = t;
    return r;
  }

  /* ---------------- exploração (p. 18–19) ---------------- */

  function salvarArea(estado, dados) {
    var id = idOk(dados && dados.id) || ("ar-" + uuid());
    var nome = texto(dados && dados.nome, 60);
    if (!nome) return falha("A área precisa de nome.");
    var atual = estado.areas.filter(function (a) { return a.id === id; })[0];
    if (atual) atual.nome = nome;
    else {
      if (estado.areas.length >= 40) return falha("Limite de áreas.");
      estado.areas.push({ id: id, nome: nome, explorada: !!(dados && dados.explorada) });
    }
    var r = resultado();
    r.id = id;
    return r;
  }

  function rotaPercorrida(estado, de, para) {
    return estado.rotas.some(function (x) { return (x.de === de && x.para === para) || (x.de === para && x.para === de); });
  }

  /* Teste de jornada: só para área ainda não explorada por esse caminho.
     Falhar não impede de chegar — só sorteia uma consequência ruim.
     Perícia que não Sobrevivência: uma vez no Hexatombe inteiro, por
     personagem. opcoes: { de, para, testadorId, pericia, passou, rolar } */
  function registrarJornada(estado, opcoes) {
    var o = opcoes || {};
    var de = idOk(o.de), para = idOk(o.para);
    var destino = estado.areas.filter(function (a) { return a.id === para; })[0];
    if (!destino) return falha("Escolha o destino.");
    var r = resultado();
    var origem = estado.areas.filter(function (a) { return a.id === de; })[0];
    var conhecida = origem && rotaPercorrida(estado, de, para);
    if (conhecida) {
      r.semTeste = true;
      registrar(estado, "jornada", "Jornada por caminho já percorrido (" + origem.nome + " → " + destino.nome + "): sem teste.", "todos");
      return r;
    }
    var testador = participante(estado, o.testadorId);
    var pericia = texto(o.pericia, 40) || "Sobrevivência";
    if (pericia !== "Sobrevivência") {
      if (!testador) return falha("Quem fez o teste com outra perícia?");
      if (testador.alternativas.indexOf(pericia) >= 0) return falha(testador.nome + " já usou " + pericia + " numa jornada: perícia que não Sobrevivência vale uma vez no Hexatombe.");
      testador.alternativas.push(pericia);
    }
    if (typeof o.passou !== "boolean") return falha("Informe se o teste passou.");
    if (!o.passou) {
      var n = o.d6 ? inteiro(o.d6, 1, 6, 1) : dado(o.rolar, 6);
      r.consequencia = CONSEQUENCIAS[n - 1];
      r.avisos.push("Consequência (" + n + "): " + r.consequencia.nome + " — " + r.consequencia.texto);
    }
    destino.explorada = true;
    if (origem && !rotaPercorrida(estado, de, para)) estado.rotas.push({ de: de, para: para });
    registrar(estado, "jornada", "Jornada até " + destino.nome + " (" + pericia + (o.passou ? ", passou" : ", falhou: " + r.consequencia.nome) + "). O grupo chegou.", "todos");
    return r;
  }

  /* Procurar recursos (p. 20): um teste por personagem em cada local. */
  function procurarRecursos(estado, opcoes) {
    var o = opcoes || {};
    var p = participante(estado, o.participanteId);
    var area = estado.areas.filter(function (a) { return a.id === o.areaId; })[0];
    if (!p || !p.vivo || !area) return falha("Escolha quem procura e onde.");
    if (p.procuras.indexOf(area.id) >= 0) return falha(p.nome + " já vasculhou " + area.nome + ".");
    var total = Math.round(Number(o.total));
    if (!Number.isFinite(total)) return falha("Informe o resultado do teste.");
    var alcancadas = COLUNAS_DE_RECURSO.map(function (c, i) { return total >= c ? i : -1; }).filter(function (i) { return i >= 0; });
    var colunas = !alcancadas.length ? [] : (estado.leituraDeRecursos === "cumulativa" ? alcancadas : [alcancadas[alcancadas.length - 1]]);
    var r = resultado();
    r.achados = colunas.map(function (col, i) {
      var n = o.d12 && o.d12[i] ? inteiro(o.d12[i], 1, 12, 1) : dado(o.rolar, 12);
      return { coluna: COLUNAS_DE_RECURSO[col], d12: n, nome: RECURSOS_ENCONTRADOS[n - 1][col] };
    });
    p.procuras.push(area.id);
    var eq = equipe(estado, p.equipeId);
    r.achados.forEach(function (a) {
      if (!eq) return;
      if (a.nome === "Água") eq.estoque.agua = Math.min(999, eq.estoque.agua + 1);
      else if (a.nome === "Comida") eq.estoque.comida = Math.min(999, eq.estoque.comida + 1);
      else if (a.nome === "Sucata") eq.estoque.sucata = Math.min(999, eq.estoque.sucata + 1);
      else {
        var it = eq.estoque.itens.filter(function (x) { return x.nome === a.nome; })[0];
        if (it) it.qtd = Math.min(999, it.qtd + 1);
        else if (eq.estoque.itens.length < 40) eq.estoque.itens.push({ nome: a.nome, qtd: 1 });
      }
    });
    registrar(estado, "recursos", p.nome + " procurou recursos em " + area.nome + " (teste " + total + "): " +
      (r.achados.length ? r.achados.map(function (a) { return a.nome; }).join(", ") : "nada") + ".", eq ? eq.id : "mestre");
    return r;
  }

  function rolarEncontro(estado, tipo, opcoes) {
    var t = ENCONTROS[tipo];
    if (!t) return falha("Tipo de encontro desconhecido.");
    var o = opcoes || {};
    var n = o.valor ? inteiro(o.valor, 1, t.dado, 1) : dado(o.rolar, t.dado);
    var faixa = t.faixas.filter(function (f) { return n <= f[0]; })[0];
    var r = resultado();
    r.encontro = { tipo: tipo, nome: faixa[1], texto: faixa[2], valor: n, dado: t.dado };
    registrar(estado, "encontro", "Encontro " + t.nome.toLowerCase() + " (1d" + t.dado + " = " + n + "): " + faixa[1] + ".", o.visivel || "mestre");
    return r;
  }

  /* Intenção cumprida (p. 24): só com o estigma desbloqueado, uma vez
     por participante. A recompensa vira lançamento na ficha. */
  function cumprirIntencao(estado, participanteId, estigma) {
    var p = participante(estado, participanteId);
    var e = POR_ESTIGMA[estigma];
    if (!p || !e) return falha("Participante ou estigma desconhecido.");
    if (!p.vivo) return falha(p.nome + " está morto.");
    if (!desbloqueada(estado, estigma)) return falha("A intenção de " + e.nome + " ainda não foi desbloqueada por um sacrifício.");
    if (p.intencoes[estigma]) return falha(p.nome + " já cumpriu a intenção de " + e.nome + ".");
    p.intencoes[estigma] = { dia: estado.dia };
    var r = resultado();
    lancar(r, p, "hx.intencao." + p.id + "." + estigma, e.lancamento.tipo, e.lancamento.valor,
      "Intenção cumprida: " + e.sentimentos + " — " + e.recompensa + " (AS2 p. 24)", "Intenção");
    registrar(estado, "intencao", p.nome + " cumpriu a intenção de " + e.nome + ".", p.equipeId || "mestre");
    return r;
  }

  function desfazerIntencao(estado, participanteId, estigma) {
    var p = participante(estado, participanteId);
    if (!p || !p.intencoes[estigma]) return falha("Nada a desfazer.");
    delete p.intencoes[estigma];
    var r = resultado();
    if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.intencao." + p.id + "." + estigma });
    registrar(estado, "intencao", "Intenção de " + POR_ESTIGMA[estigma].nome + " desfeita para " + p.nome + ".", "mestre");
    return r;
  }

  /* A meia-noite do sexto dia (p. 6 e 11): sem o sacrifício final, os
     desertores definham. A mesa confirma. */
  function luaDeSangue(estado, sacrificioFinalFeito) {
    if (estado.dia < DIAS) return falha("A Lua de Sangue é na sexta noite.");
    var r = resultado();
    var restantes = vivos(estado).length;
    if (sacrificioFinalFeito) {
      if (restantes !== 6) r.avisos.push("O sacrifício final pede exatamente seis presentes; há " + restantes + " vivos. Com menos de seis, o Hexatombe fracassa (regra X).");
      estado.participantes.forEach(function (p) {
        if (p.vivo && p.sacrificio && p.original) r.avisos.push(p.nome + " foi eleito sacrifício na origem: pela regra VI, estará morto ao fim do sexto dia.");
      });
      registrar(estado, "final", "O sacrifício final foi realizado sob a Lua de Sangue.", "todos");
      return r;
    }
    estado.participantes.forEach(function (p) {
      if (!p.vivo || !p.desertor) return;
      p.vivo = false;
      p.morte = { dia: estado.dia, momento: "noite", causa: "lua", por: "" };
      r.avisos.push(p.nome + " definhou sob a Lua de Sangue.");
    });
    registrar(estado, "final", "Meia-noite sem o sacrifício final: os desertores definharam.", "todos");
    return r;
  }

  function marcarFracasso(estado, fracassou) {
    estado.fracassou = !!fracassou;
    registrar(estado, "final", fracassou ? "O Hexatombe fracassou." : "Fracasso desmarcado pela mesa.", "todos");
    return resultado();
  }

  function anotar(estado, txt, visivel) {
    if (!texto(txt, 400)) return falha("Escreva algo.");
    registrar(estado, "nota", txt, visivel || "mestre");
    return resultado();
  }

  /* Os lançamentos que ainda não chegaram às fichas ficam pendentes no
     estado até o envio dar certo (o id estável impede a duplicação). */
  function guardarPendentes(estado, r) {
    (r.lancamentos || []).forEach(function (x) { estado.pendentes.push({ personagemId: x.personagemId, desfazer: false, lancamento: copiar(x.lancamento) }); });
    (r.desfazer || []).forEach(function (x) { estado.pendentes.push({ personagemId: x.personagemId, desfazer: true, lancamento: { id: x.id, tipo: "nota", valor: 0 } }); });
    if (estado.pendentes.length > MAX_PENDENTES) estado.pendentes = estado.pendentes.slice(-MAX_PENDENTES);
  }

  function marcarPendente(estado, personagemId, id, motivo) {
    estado.pendentes.forEach(function (x) {
      if (x.personagemId === personagemId && x.lancamento.id === id && !x.desfazer) x.motivo = motivo === "participacao_desligada" ? motivo : "";
    });
  }

  function tirarPendente(estado, personagemId, id, desfazer) {
    estado.pendentes = estado.pendentes.filter(function (x) {
      return !(x.personagemId === personagemId && x.lancamento.id === id && !!x.desfazer === !!desfazer);
    });
  }

  /* =================================================================
     A VISTA DO JOGADOR — a mesma do servidor (Campanhas.gs). Recebe os
     ids dos personagens da pessoa. Equipes rivais: só o nome. Nada de
     notas do mestre, pendências ou registro alheio.
     ================================================================= */

  function vistaDoJogador(bruto, personagemIds) {
    var e = normalizar(bruto);
    if (!e.ativo) return { ativo: false };
    var meus = {};
    lista(personagemIds).forEach(function (id) { meus[String(id)] = true; });
    var minhasEquipes = {};
    e.participantes.forEach(function (p) { if (p.personagemId && meus[p.personagemId] && p.equipeId) minhasEquipes[p.equipeId] = true; });
    return {
      ativo: true, nome: e.nome, dia: e.dia, fase: e.fase, faseNota: e.faseNota, fracassou: e.fracassou,
      equipes: e.equipes.map(function (q) {
        if (!minhasEquipes[q.id]) return { id: q.id, nome: q.nome, rival: true };
        return { id: q.id, nome: q.nome, base: q.base, estoque: q.estoque, obras: q.obras, descanso: condicaoDeDescanso(e, q.id) };
      }),
      participantes: e.participantes.filter(function (p) { return minhasEquipes[p.equipeId]; }).map(function (p) {
        var meu = !!(p.personagemId && meus[p.personagemId]);
        var x = { id: p.id, nome: p.nome, equipeId: p.equipeId, sacrificio: p.sacrificio, estigma: p.estigma, vivo: p.vivo, desertor: !!p.desertor, meu: meu };
        if (meu) { x.intencoes = p.intencoes; x.consumo = p.consumo; x.sede = p.sede; x.fome = p.fome; x.castigos = p.castigos; x.alternativas = p.alternativas; }
        return x;
      }),
      sacrificios: e.sacrificios.filter(function (s) { return s.valido; }).map(function (s) { return { dia: s.dia, estigma: s.estigma }; }),
      intencoes: e.intencoes.map(function (x) { return { estigma: x.estigma, dia: x.dia }; }),
      areas: e.areas,
      rotas: e.rotas,
      registro: e.registro.filter(function (r) { return r.visivel === "todos" || minhasEquipes[r.visivel]; }),
      regrasAs3: e.regrasAs3,
      /* Só as trocas da própria equipe: o conteúdo é dela e da mesa. */
      trocas: e.trocas.filter(function (t) { return minhasEquipes[t.equipeId]; }),
    };
  }

  global.RAMAHexatombe = {
    DIAS: DIAS,
    FASES: FASES,
    NOMES_FASE: NOMES_FASE,
    ESTIGMAS: ESTIGMAS,
    POR_ESTIGMA: POR_ESTIGMA,
    MELHORIAS: MELHORIAS,
    POR_MELHORIA: POR_MELHORIA,
    DT_MELHORIA: DT_MELHORIA,
    ACOES_DE_DESCANSO: ACOES_DE_DESCANSO,
    CONSEQUENCIAS: CONSEQUENCIAS,
    RECURSOS_ENCONTRADOS: RECURSOS_ENCONTRADOS,
    COLUNAS_DE_RECURSO: COLUNAS_DE_RECURSO,
    ENCONTROS: ENCONTROS,
    MAX_CASTIGOS: MAX_CASTIGOS,

    normalizar: normalizar,
    vazio: vazio,
    equipe: equipe,
    participante: participante,
    membros: membros,
    vivos: vivos,
    desbloqueada: desbloqueada,
    equipeDesertora: equipeDesertora,
    condicaoDeDescanso: condicaoDeDescanso,
    rotaPercorrida: rotaPercorrida,

    ligar: ligar,
    definirFase: definirFase,
    avancarDia: avancarDia,
    salvarEquipe: salvarEquipe,
    removerEquipe: removerEquipe,
    salvarParticipante: salvarParticipante,
    removerParticipante: removerParticipante,
    marcarDesertor: marcarDesertor,
    retornarDaArena: retornarDaArena,
    registrarMorte: registrarMorte,
    escolherHerdeiro: escolherHerdeiro,
    consumir: consumir,
    desfazerConsumo: desfazerConsumo,
    tentarMelhoria: tentarMelhoria,
    instalarMelhoriaEspecial: instalarMelhoriaEspecial,
    removerMelhoria: removerMelhoria,
    salvarArea: salvarArea,
    registrarJornada: registrarJornada,
    procurarRecursos: procurarRecursos,
    rolarEncontro: rolarEncontro,
    cumprirIntencao: cumprirIntencao,
    desfazerIntencao: desfazerIntencao,
    luaDeSangue: luaDeSangue,
    marcarFracasso: marcarFracasso,
    anotar: anotar,
    guardarPendentes: guardarPendentes,
    tirarPendente: tirarPendente,
    marcarPendente: marcarPendente,
    vistaDoJogador: vistaDoJogador,
    definirRegrasAs3: definirRegrasAs3,
    diasDeObra: diasDeObra,
    iniciarObra: iniciarObra,
    concluirObra: concluirObra,
    cancelarObra: cancelarObra,
    CUSTO_DA_TROCA: CUSTO_DA_TROCA,
    registrarTroca: registrarTroca,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/ordem/hexatombe.js */

var MAX_OPS_HEXATOMBE = 50;
var MAX_LANCAMENTOS_POR_PEDIDO = 30;
var TIPOS_DE_LANCAMENTO_HEX = ['pvMax', 'peMax', 'pvMetade', 'rd', 'testes', 'dadosTestes', 'dano', 'nota'];

function registroDoHexatombe(campanhaId) {
  try {
    return acharPor(ABAS.CAMPANHA_HEXATOMBE, 'campanhaId', String(campanhaId));
  } catch (erro) {
    /* Sem a aba (setupRama desta versão ainda não rodou): não há
       Hexatombe nesta campanha. */
    return null;
  }
}

/* Para o cabeçalho da campanha: só se está ligado. */
function hexatombeAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_HEXATOMBE).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function idsDosMeusPersonagens(campanhaId, usuario) {
  return daCampanhaLeves(ABAS.PERSONAGENS, campanhaId)
    .filter(function (r) { return meu(r, usuario); })
    .map(function (r) { return String(r.id); });
}

function estadoDoHexatombe(registro) {
  return RAMAHexatombe.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function hexatombeParaCliente(ctx, registro, usuario) {
  var estado = estadoDoHexatombe(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAHexatombe.vistaDoJogador(estado, idsDosMeusPersonagens(ctx.campanha.id, usuario)) };
}

function acaoLerHexatombe(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'hexatombe');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var registro = registroDoHexatombe(ctx.campanha.id);
  var dados = hexatombeParaCliente(ctx, registro, usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoSalvarHexatombe(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'hexatombe');
    if (foraDoSistema) return foraDoSistema;
    var semSuplemento = exigirSuplemento(ctx, 'hexatombe', corpo);
    if (semSuplemento) return semSuplemento;
    try {
      aba(ABAS.CAMPANHA_HEXATOMBE);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_HEXATOMBE' };
    }

    var registro = registroDoHexatombe(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];

    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: hexatombeParaCliente(ctx, registro, usuario) };
    }
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: hexatombeParaCliente(ctx, registro, usuario) };
    }

    var anterior = estadoDoHexatombe(registro);
    var estado = RAMAHexatombe.normalizar(corpo.estado);

    /* Vínculo só com personagem DESTA campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.participantes.forEach(function (p) { if (p.personagemId && !daMesa[p.personagemId]) p.personagemId = ''; });
    estado.pendentes = estado.pendentes.filter(function (x) { return daMesa[x.personagemId]; });

    /* O diário cede primeiro quando o estado não cabe na célula. */
    var json = JSON.stringify(estado);
    while (json.length > MAX_CELULA && estado.registro.length) {
      estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
      json = JSON.stringify(estado);
    }
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_HEXATOMBE) feitas = feitas.slice(feitas.length - MAX_OPS_HEXATOMBE);
    var agora = new Date().toISOString();
    var novo = {
      campanhaId: String(ctx.campanha.id),
      ativo: estado.ativo,
      dia: estado.dia,
      atualizadoEm: agora,
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.CAMPANHA_HEXATOMBE, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.CAMPANHA_HEXATOMBE, novo);

    var partes = ['hexatombe'];
    if (anterior.ativo !== estado.ativo) partes.push('campanha');
    marcarMesa(ctx.campanha.id, partes);
    var gravado = registroDoHexatombe(ctx.campanha.id);
    return { ok: true, rev: revAtual + 1, dados: hexatombeParaCliente(ctx, gravado, usuario) };
  });
}

/* Um lançamento recebido, limpo. null = não vale. */
function lancamentoHexRecebido(l, usuario, dia) {
  if (!l || typeof l !== 'object') return null;
  var id = String(l.id || '');
  if (!/^[A-Za-z0-9_.:|#-]{1,80}$/.test(id)) return null;
  if (TIPOS_DE_LANCAMENTO_HEX.indexOf(l.tipo) < 0) return null;
  var valor = Math.round(Number(l.valor)) || 0;
  return {
    id: id, tipo: l.tipo, valor: Math.max(-999, Math.min(999, valor)),
    dia: Math.max(0, Math.min(99, Math.round(Number(l.dia)) || dia || 0)),
    motivo: textoLimpo(l.motivo, 200), origem: textoLimpo(l.origem || 'Hexatombe', 80),
    em: new Date().toISOString(), por: textoLimpo(usuario.nome || usuario.usuario, 80), desfeito: '',
  };
}

function acaoLancarHexatombe(corpo, usuario) {
  var itens = Array.isArray(corpo.itens) ? corpo.itens : null;
  if (!itens || !itens.length || itens.length > MAX_LANCAMENTOS_POR_PEDIDO) return { ok: false, erro: 'dados_invalidos' };
  var operacao = idDeOperacao(corpo.operacaoId);

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'hexatombe');
    if (foraDoSistema) return foraDoSistema;
    var semSuplemento = exigirSuplemento(ctx, 'hexatombe', corpo);
    if (semSuplemento) return semSuplemento;
    var registro = acharPor(ABAS.PERSONAGENS, 'id', corpo.personagemId);
    if (!registro || String(registro.campanhaId || '') !== String(ctx.campanha.id)) return { ok: false, erro: 'nao_encontrado' };
    if (operacaoJaAplicada(registro, operacao)) return { ok: true, repetida: true, rev: Number(registro.rev) || 0 };

    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);
    if (!ehFichaDeOrdem(ficha)) return { ok: false, erro: 'dados_invalidos' };
    var o = ficha.ordem;
    if (!o.hexatombe || typeof o.hexatombe !== 'object') o.hexatombe = { campanhaId: '', dia: 0, lancamentos: [] };
    if (!Array.isArray(o.hexatombe.lancamentos)) o.hexatombe.lancamentos = [];
    var lista = o.hexatombe.lancamentos;
    var dia = Math.max(0, Math.min(99, Math.round(Number(corpo.dia)) || 0));
    var agora = new Date().toISOString();
    var mudou = false;
    var aplicados = [];
    var recusados = [];
    /* v2.31: a ficha decide. Sem a regra opcional Participação no
       Hexatombe ligada, nenhum lançamento novo entra (nem por esta via):
       eles voltam como recusados e ficam pendentes na campanha. Desfazer
       continua permitido — só tira efeito. */
    var participa = !!(o.opcionais && o.opcionais.participacaoHexatombe === true);

    for (var i = 0; i < itens.length; i++) {
      var it = itens[i] || {};
      var bruto = it.lancamento || {};
      var id = String(bruto.id || '');
      var existente = lista.filter(function (x) { return x && x.id === id; })[0];
      if (it.desfazer === true) {
        if (existente && !existente.desfeito) { existente.desfeito = agora; mudou = true; }
        aplicados.push(id);
        continue;
      }
      if (!participa) { recusados.push(id); continue; }
      if (existente) {
        if (existente.desfeito && bruto.refazer === true) { existente.desfeito = ''; mudou = true; }
        aplicados.push(id);
        continue;
      }
      var l = lancamentoHexRecebido(bruto, usuario, dia);
      if (!l) return { ok: false, erro: 'dados_invalidos', indice: i };
      lista.push(l);
      mudou = true;
      aplicados.push(id);
      /* "Perde PV máximos e atuais": com os atuais em número, eles descem
         junto; vazios (cheios), já acompanham o máximo novo. */
      var atualPv = Math.round(Number(bruto.atualPv)) || 0;
      if (atualPv < 0 && o.recursos && typeof o.recursos.pv === 'number') {
        o.recursos.pv = Math.max(0, o.recursos.pv + atualPv);
      }
    }
    if (o.hexatombe.lancamentos.length > 120) o.hexatombe.lancamentos = o.hexatombe.lancamentos.slice(-120);
    if (participa && String(o.hexatombe.campanhaId || '') !== String(ctx.campanha.id)) { o.hexatombe.campanhaId = String(ctx.campanha.id); mudou = true; }
    if (participa && dia && o.hexatombe.dia !== dia) { o.hexatombe.dia = dia; mudou = true; }
    var extra = recusados.length ? { recusados: recusados, motivo: 'participacao_desligada' } : {};

    if (!mudou) return { ok: true, rev: Number(registro.rev) || 0, dados: Object.assign({ mudou: false, aplicados: aplicados }, extra) };

    ficha.atualizadoEm = agora;
    registro.atualizadoEm = agora;
    registro.rev = (Number(registro.rev) || 0) + 1;
    var publicado = publicarFicha(registro, ficha, { operacao: operacao });
    if (!publicado.ok) return publicado;
    avisarMesas([registro.campanhaId], ['personagens']);
    return { ok: true, rev: registro.rev, dados: Object.assign({ mudou: true, aplicados: aplicados }, extra) };
  });
}

/* =====================================================================
   HACKING (v2.38 — Arquivos Secretos 4, p. 72–73)
   ---------------------------------------------------------------------
   A regra opcional de Hacking da campanha: uma linha por campanha em
   CAMPANHA_HACKING, desligada até o mestre ligar.

     ler_hacking     mestre: o estado inteiro; jogador: só as cenas em
                     que um personagem dele participa, sem as notas do
                     mestre e com os PS só quando o mestre os mostra
     salvar_hacking  só o mestre. O estado chega inteiro, com `rev` e
                     `opId`: a repetição do mesmo opId não grava de novo,
                     e uma `rev` velha é recusada (conflito)

   O módulo é cópia fiel de js/ordem/hacking.js (o teste do backend
   confere). Nada aqui acessa dispositivo, rede ou arquivo de verdade:
   são registros da história.
   ===================================================================== */

/* >>> js/ordem/hacking.js */
/* =====================================================================
   R.A.M.A. — Hacking (v2.38 — Arquivos Secretos 4, p. 72–73)
   =====================================================================
   A regra OPCIONAL de Hacking de uma campanha. Desligada por padrão; é
   o mestre quem liga, na aba Hacking da campanha. Não tem nada a ver
   com o Hexatombe, e as ações daqui NÃO são usos gerais de Tecnologia:
   só existem dentro de uma cena de hacking.

   Tudo aqui é acontecimento do RPG. Nada acessa dispositivo, rede ou
   arquivo de verdade: "sistema", "backdoor" e "vírus" são registros da
   história, guardados na planilha da campanha.

   O livro, em resumo (o texto é o do AS4):

     cena de hacking   turnos e rodadas, como combate e investigação; a
                       rodada pode durar horas, dias ou semanas, e a
                       cena pode se repartir por várias sessões
     PS                pontos de segurança do sistema = a DT da ação
                       Hackear (OPRPG p. 48): DT 20 = 20 PS. Zerou,
                       invadiu: acesso aos arquivos por UMA cena; numa
                       cena posterior, o processo todo de novo
     dados virtuais    d6; ao começar, tantos quanto o Intelecto
     no turno          até duas ações, pelo treino em Tecnologia:
       Procurar Brechas (treinado)  teste de Tecnologia, DT 15 e +5 a
                                    cada tentativa seguinte; sucesso:
                                    +1 dado virtual
       Quebrar Códigos (treinado)   gasta dados à escolha; a soma vira
                                    dano nos PS
       Cobrir Rastros (veterano)    teste de Tecnologia contra os PS
                                    máximos; sucesso: na próxima ação que
                                    rolar dados virtuais, rola de novo os
                                    1 e fica com o segundo resultado
       Programar Backdoor (veterano) gasta 1+ dados sem rolar; cada d6
                                    gasto = um acesso ao sistema, de
                                    outro dispositivo, sem hackear de novo
       Plantar Vírus (expert)       gasta 1 dado sem rolar; o vírus espião
                                    avisa de cada interação nova (a
                                    critério do mestre) e, a cada aviso,
                                    1d4: no 1, o firewall o remove
     Imprevistos       no fim de cada rodada, um por agente, pelo número
                       de resultados 1 nos dados virtuais do último turno
                       dele (até 4): Dor nos pulsos (−2 em Tecnologia na
                       próxima rodada), Código mal escrito (perde 1 dado
                       no começo do próximo turno), Rastro detectado (o
                       sistema recupera 2d6 PS), Invasão detectada (perde
                       o progresso; o sistema recupera todos os PS)

   O que o livro NÃO diz, e esta implementação decide — sempre à vista,
   como interpretação, nunca como regra oficial (AMBIGUIDADES):

     · a ordem 1→Dor nos pulsos … 4→Invasão detectada vem da ordem em
       que o livro lista os imprevistos
     · com zero resultados 1 no turno, nenhum imprevisto é sugerido; o
       mestre pode registrar um à mão
     · com Cobrir Rastros, contam os 1 que SOBRARAM depois de rolar de
       novo (os resultados que valeram)
     · "perde o progresso": os PS voltam ao máximo; os dados virtuais que
       o agente tem ficam como estão
     · a DT de Procurar Brechas sobe por agente (cada um tem as próprias
       tentativas)

   Os dados são rolados pela tela (o motor de dados de sempre) e chegam
   aqui como números: o módulo só confere e aplica, sem sorteio próprio.
   Isso o deixa igual no navegador e no Apps Script, onde ele é copiado
   (backend/Campanhas.gs, entre os marcadores >>> e <<<).
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_CENAS = 12;
  var MAX_PARTICIPANTES = 6;
  var MAX_HISTORICO = 60;
  var MAX_BACKDOORS = 10;
  var MAX_VIRUS = 6;
  var MAX_IMPREVISTOS = 40;
  var ACOES_POR_TURNO = 2;

  var TREINOS = ["treinado", "veterano", "expert"];
  var NIVEL = { treinado: 1, veterano: 2, expert: 3 };
  var NOMES_DO_TREINO = { treinado: "treinado", veterano: "veterano", expert: "expert" };

  var ACOES = [
    { chave: "procurarBrechas", nome: "Procurar Brechas", treino: "treinado" },
    { chave: "quebrarCodigos", nome: "Quebrar Códigos", treino: "treinado" },
    { chave: "cobrirRastros", nome: "Cobrir Rastros", treino: "veterano" },
    { chave: "programarBackdoor", nome: "Programar Backdoor", treino: "veterano" },
    { chave: "plantarVirus", nome: "Plantar Vírus", treino: "expert" },
  ];
  var POR_ACAO = {};
  ACOES.forEach(function (a) { POR_ACAO[a.chave] = a; });

  var IMPREVISTOS = [
    { chave: "dorNosPulsos", uns: 1, nome: "Dor nos pulsos", texto: "−2 em testes de Tecnologia durante a próxima rodada." },
    { chave: "codigoMalEscrito", uns: 2, nome: "Código mal escrito", texto: "Perde um dado virtual no começo do próximo turno." },
    { chave: "rastroDetectado", uns: 3, nome: "Rastro detectado", texto: "O sistema recupera 2d6 PS." },
    { chave: "invasaoDetectada", uns: 4, nome: "Invasão detectada", texto: "O agente perde o progresso do hacking e o sistema recupera todos os seus PS." },
  ];
  var POR_IMPREVISTO = {};
  IMPREVISTOS.forEach(function (x) { POR_IMPREVISTO[x.chave] = x; });

  var AMBIGUIDADES = [
    "A correspondência 1 → Dor nos pulsos, 2 → Código mal escrito, 3 → Rastro detectado, 4 → Invasão detectada segue a ordem em que o livro lista os imprevistos.",
    "Com nenhum resultado 1 no turno, o livro não diz qual imprevisto acontece: nada é sugerido, e o mestre pode registrar um à mão.",
    "Com Cobrir Rastros, contam os resultados 1 que sobraram depois de rolar de novo.",
    "“Perde o progresso do hacking”: os PS voltam ao máximo; os dados virtuais do agente ficam como estão.",
    "A DT de Procurar Brechas (15, +5 a cada tentativa) sobe por agente.",
  ];

  var ESTADOS = ["preparando", "andamento", "invadido", "encerrada"];

  /* ---------------- utilidades ---------------- */

  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").trim().slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) n = padrao;
    return Math.max(min, Math.min(max, n));
  }
  var ID = /^[A-Za-z0-9_-]{1,40}$/;
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) { var s = String(v || ""); return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) ? s : ""; }
  function agora() { return new Date().toISOString(); }
  var contador = 0;
  function novoId(prefixo) {
    contador = (contador + 1) % 100000;
    return prefixo + "-" + Date.now().toString(36) + contador.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }
  function d6(v) { var n = Math.round(Number(v)); return n >= 1 && n <= 6 ? n : 0; }

  /* ---------------- normalização ---------------- */

  function normalizarParticipante(p) {
    var x = obj(p);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    return {
      id: id,
      nome: nome,
      personagemId: texto(x.personagemId, 60).replace(/[^A-Za-z0-9_-]/g, ""),
      treino: TREINOS.indexOf(x.treino) >= 0 ? x.treino : "treinado",
      intelecto: inteiro(x.intelecto, 0, 10, 1),
      dados: inteiro(x.dados, 0, 99, 0),
      tentativas: inteiro(x.tentativas, 0, 99, 0),
      cobrir: x.cobrir === true,
      acoes: inteiro(x.acoes, 0, ACOES_POR_TURNO, 0),
      noTurno: x.noTurno === true,
      uns: inteiro(x.uns, 0, 99, 0),
      unsUltimo: inteiro(x.unsUltimo, 0, 99, 0),
      dor: inteiro(x.dor, 0, 9999, 0),
      perdeDado: x.perdeDado === true,
    };
  }

  function normalizarCena(c) {
    var x = obj(c);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    var psMax = inteiro(x.psMax, 1, 99, 15);
    var participantes = lista(x.participantes).map(normalizarParticipante).filter(Boolean).slice(0, MAX_PARTICIPANTES);
    var ids = {};
    participantes = participantes.filter(function (p) { if (ids[p.id]) return false; ids[p.id] = true; return true; });
    var acesso = obj(x.acesso);
    return {
      id: id,
      nome: nome,
      notas: texto(x.notas, 1000),
      psMax: psMax,
      psAtual: inteiro(x.psAtual, 0, psMax, psMax),
      psVisivel: x.psVisivel === true,
      estado: ESTADOS.indexOf(x.estado) >= 0 ? x.estado : "preparando",
      rodada: inteiro(x.rodada, 1, 9999, 1),
      participantes: participantes,
      acesso: acesso.desde ? { desde: carimbo(acesso.desde) || agora(), origem: acesso.origem === "backdoor" ? "backdoor" : "hacking", por: texto(acesso.por, 80) } : null,
      backdoors: lista(x.backdoors).map(function (b) {
        var y = obj(b);
        var bid = idOk(y.id);
        if (!bid) return null;
        var usos = inteiro(y.usos, 1, 99, 1);
        return { id: bid, por: texto(y.por, 80), dispositivo: texto(y.dispositivo, 80), usos: usos, usados: inteiro(y.usados, 0, usos, 0), em: carimbo(y.em) };
      }).filter(Boolean).slice(-MAX_BACKDOORS),
      virus: lista(x.virus).map(function (v) {
        var y = obj(v);
        var vid = idOk(y.id);
        if (!vid) return null;
        return { id: vid, por: texto(y.por, 80), ativo: y.ativo !== false, avisos: inteiro(y.avisos, 0, 999, 0), em: carimbo(y.em), removidoEm: carimbo(y.removidoEm) };
      }).filter(Boolean).slice(-MAX_VIRUS),
      imprevistos: lista(x.imprevistos).map(function (m) {
        var y = obj(m);
        var tipo = POR_IMPREVISTO[y.tipo] ? y.tipo : "";
        if (!tipo) return null;
        return { rodada: inteiro(y.rodada, 1, 9999, 1), participante: texto(y.participante, 80), uns: inteiro(y.uns, 0, 99, 0), tipo: tipo, manual: y.manual === true, nota: texto(y.nota, 200) };
      }).filter(Boolean).slice(-MAX_IMPREVISTOS),
      historico: lista(x.historico).map(function (h) {
        var y = obj(h);
        var t = texto(y.texto, 300);
        return t ? { em: carimbo(y.em), rodada: inteiro(y.rodada, 0, 9999, 0), texto: t } : null;
      }).filter(Boolean).slice(-MAX_HISTORICO),
      criadaEm: carimbo(x.criadaEm),
      atualizadaEm: carimbo(x.atualizadaEm),
    };
  }

  function normalizar(bruto) {
    var x = obj(bruto);
    var cenas = lista(x.cenas).map(normalizarCena).filter(Boolean);
    var ids = {};
    cenas = cenas.filter(function (c) { if (ids[c.id]) return false; ids[c.id] = true; return true; }).slice(-MAX_CENAS);
    return { versao: VERSAO, ativo: x.ativo === true, cenas: cenas };
  }

  function vazio() { return normalizar({}); }

  /* O que o jogador vê: a regra ligada e as cenas em que um personagem
     dele participa — sem as notas do mestre, e com os PS só quando o
     mestre os mostra. */
  function vistaDoJogador(estado, meusPersonagens) {
    var e = normalizar(estado);
    var meus = {};
    lista(meusPersonagens).forEach(function (id) { meus[String(id)] = true; });
    if (!e.ativo) return { ativo: false, cenas: [] };
    return {
      ativo: true,
      cenas: e.cenas.filter(function (c) {
        return c.participantes.some(function (p) { return p.personagemId && meus[p.personagemId]; });
      }).map(function (c) {
        var v = JSON.parse(JSON.stringify(c));
        delete v.notas;
        if (!c.psVisivel) { v.psMax = null; v.psAtual = null; }
        return v;
      }),
    };
  }

  /* ---------------- consultas ---------------- */

  function cena(estado, id) { return lista(estado && estado.cenas).filter(function (c) { return c.id === id; })[0] || null; }
  function participante(c, id) { return lista(c && c.participantes).filter(function (p) { return p.id === id; })[0] || null; }
  function podeAcao(p, chave) {
    var a = POR_ACAO[chave];
    return !!(a && p && NIVEL[p.treino] >= NIVEL[a.treino]);
  }
  function dtDeBrechas(p) { return 15 + 5 * ((p && p.tentativas) || 0); }
  /* Dor nos pulsos vale na rodada marcada. */
  function penalidadeEmTecnologia(c, p) { return p && p.dor && p.dor === c.rodada ? -2 : 0; }
  function imprevistoPorUns(uns) {
    var n = Math.min(4, Math.max(0, Number(uns) || 0));
    return n ? IMPREVISTOS[n - 1] : null;
  }

  function registrar(c, t) {
    c.historico.push({ em: agora(), rodada: c.rodada, texto: texto(t, 300) });
    if (c.historico.length > MAX_HISTORICO) c.historico = c.historico.slice(-MAX_HISTORICO);
    c.atualizadaEm = agora();
  }

  /* ---------------- o mestre: cenas e participantes ---------------- */

  function ligar(estado, sim) {
    estado.ativo = !!sim;
    return { ok: true };
  }

  /* Uma cena: o sistema-alvo e a DT de Hackear dele, que vira os PS. */
  function criarCena(estado, dados) {
    var d = obj(dados);
    var nome = texto(d.nome, 80);
    if (!nome) return { ok: false, motivo: "Dê um nome ao sistema-alvo." };
    var dt = inteiro(d.dt, 0, 99, 0);
    if (dt < 1) return { ok: false, motivo: "Informe a DT de Hackear do sistema (OPRPG p. 48): ela vira os PS." };
    if (estado.cenas.length >= MAX_CENAS) return { ok: false, motivo: "Até " + MAX_CENAS + " cenas de hacking por campanha: encerre e apague uma antiga." };
    var c = normalizarCena({ id: novoId("hk"), nome: nome, notas: d.notas, psMax: dt, psAtual: dt, psVisivel: d.psVisivel === true, criadaEm: agora() });
    registrar(c, "Cena criada: " + nome + " (DT " + dt + " = " + dt + " PS).");
    estado.cenas.push(c);
    return { ok: true, cena: c };
  }

  function apagarCena(estado, id) {
    var antes = estado.cenas.length;
    estado.cenas = estado.cenas.filter(function (c) { return c.id !== id; });
    return antes === estado.cenas.length ? { ok: false, motivo: "Cena não encontrada." } : { ok: true };
  }

  function editarCena(c, dados) {
    var d = obj(dados);
    if (d.nome !== undefined) { var n = texto(d.nome, 80); if (n) c.nome = n; }
    if (d.notas !== undefined) c.notas = texto(d.notas, 1000);
    if (d.psVisivel !== undefined) c.psVisivel = d.psVisivel === true;
    return { ok: true };
  }

  /* Ao entrar, o agente recebe tantos dados virtuais quanto o Intelecto. */
  function adicionarParticipante(c, dados) {
    var d = obj(dados);
    var nome = texto(d.nome, 80);
    if (!nome) return { ok: false, motivo: "Diga quem hackeia." };
    if (TREINOS.indexOf(d.treino) < 0) return { ok: false, motivo: "Hackear exige ao menos treinamento em Tecnologia (e um aparelho próprio que se conecte ao alvo)." };
    if (c.participantes.length >= MAX_PARTICIPANTES) return { ok: false, motivo: "Até " + MAX_PARTICIPANTES + " agentes por cena." };
    var pid = texto(d.personagemId, 60).replace(/[^A-Za-z0-9_-]/g, "");
    if (pid && c.participantes.some(function (p) { return p.personagemId === pid; })) return { ok: false, motivo: "Esse personagem já está na cena." };
    var int = inteiro(d.intelecto, 0, 10, 1);
    var p = normalizarParticipante({ id: novoId("ag"), nome: nome, personagemId: pid, treino: d.treino, intelecto: int, dados: int });
    c.participantes.push(p);
    registrar(c, nome + " entra (" + NOMES_DO_TREINO[p.treino] + " em Tecnologia): " + int + " dado(s) virtual(is).");
    return { ok: true, participante: p };
  }

  function tirarParticipante(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    c.participantes = c.participantes.filter(function (x) { return x.id !== id; });
    registrar(c, p.nome + " sai da cena.");
    return { ok: true };
  }

  function iniciar(c) {
    if (c.estado !== "preparando") return { ok: false, motivo: "A cena já começou." };
    if (!c.participantes.length) return { ok: false, motivo: "Ninguém está hackeando." };
    c.estado = "andamento";
    c.rodada = 1;
    registrar(c, "O hacking começa (rodada 1).");
    return { ok: true };
  }

  /* ---------------- turnos ---------------- */

  function iniciarTurno(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    if (c.estado !== "andamento") return { ok: false, motivo: "A cena não está em andamento." };
    if (p.noTurno) return { ok: false, motivo: "O turno de " + p.nome + " já começou." };
    var notas = [];
    if (p.perdeDado) {
      p.perdeDado = false;
      if (p.dados > 0) { p.dados -= 1; notas.push("Código mal escrito: −1 dado virtual."); }
      else notas.push("Código mal escrito: não havia dado virtual para perder.");
    }
    p.noTurno = true;
    p.acoes = 0;
    p.uns = 0;
    registrar(c, "Turno de " + p.nome + "." + (notas.length ? " " + notas.join(" ") : ""));
    return { ok: true, notas: notas };
  }

  function encerrarTurno(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    if (!p.noTurno) return { ok: false, motivo: "Não é o turno de " + p.nome + "." };
    p.noTurno = false;
    p.unsUltimo = p.uns;
    registrar(c, "Fim do turno de " + p.nome + " (" + p.uns + " resultado[s] 1 nos dados virtuais).");
    return { ok: true };
  }

  function conferirAcao(c, p, chave) {
    if (!p) return "Agente não encontrado.";
    if (c.estado !== "andamento") return c.estado === "invadido" ? "O sistema já caiu: o acesso está liberado nesta cena." : "A cena não está em andamento.";
    if (!p.noTurno) return "Comece o turno de " + p.nome + " primeiro.";
    if (p.acoes >= ACOES_POR_TURNO) return "Até duas ações de hacking por turno.";
    if (!podeAcao(p, chave)) return POR_ACAO[chave].nome + " exige ser " + POR_ACAO[chave].treino + " em Tecnologia.";
    return "";
  }

  function invadiu(c, por) {
    if (c.psAtual > 0 || c.estado !== "andamento") return false;
    c.estado = "invadido";
    c.acesso = { desde: agora(), origem: "hacking", por: por };
    registrar(c, "Os PS chegaram a zero: o sistema caiu. Acesso aos arquivos durante esta cena.");
    return true;
  }

  /* ---------------- as cinco ações ---------------- */

  /* `total`: o resultado do teste de Tecnologia, rolado na ficha. */
  function procurarBrechas(c, id, total) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "procurarBrechas");
    if (erro) return { ok: false, motivo: erro };
    var t = Math.round(Number(total));
    if (!isFinite(t)) return { ok: false, motivo: "Informe o resultado do teste de Tecnologia." };
    var dt = dtDeBrechas(p);
    var sucesso = t >= dt;
    p.tentativas += 1;
    p.acoes += 1;
    if (sucesso) p.dados = Math.min(99, p.dados + 1);
    registrar(c, p.nome + " · Procurar Brechas: " + t + " contra DT " + dt + " — " + (sucesso ? "brecha encontrada, +1 dado virtual." : "nada.") +
      (penalidadeEmTecnologia(c, p) ? " (com −2 de Dor nos pulsos)" : ""));
    return { ok: true, sucesso: sucesso, dt: dt };
  }

  /* `valores`: os d6 rolados; `novos`: os d6 rolados de novo para cada 1
     (Cobrir Rastros), na ordem. Fica o segundo resultado. */
  function quebrarCodigos(c, id, valores, novos) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "quebrarCodigos");
    if (erro) return { ok: false, motivo: erro };
    var v = lista(valores).map(d6);
    if (!v.length || v.some(function (x) { return !x; })) return { ok: false, motivo: "Os dados virtuais são d6 (1 a 6)." };
    if (v.length > p.dados) return { ok: false, motivo: p.nome + " só tem " + p.dados + " dado(s) virtual(is)." };
    var rerrolados = [];
    if (p.cobrir) {
      var fila = lista(novos).map(d6);
      var precisa = v.filter(function (x) { return x === 1; }).length;
      if (fila.length < precisa || fila.slice(0, precisa).some(function (x) { return !x; })) return { ok: false, motivo: "Cobrir Rastros: role de novo cada resultado 1." };
      var k = 0;
      v = v.map(function (x) { if (x !== 1) return x; var y = fila[k++]; rerrolados.push(y); return y; });
      p.cobrir = false;
    }
    var soma = v.reduce(function (s, x) { return s + x; }, 0);
    var uns = v.filter(function (x) { return x === 1; }).length;
    p.dados -= v.length;
    p.acoes += 1;
    p.uns += uns;
    var antes = c.psAtual;
    c.psAtual = Math.max(0, c.psAtual - soma);
    registrar(c, p.nome + " · Quebrar Códigos: " + v.length + "d6 = " + v.join(", ") + " (soma " + soma + ")" +
      (rerrolados.length ? ", com os 1 rolados de novo (Cobrir Rastros)" : "") + ". PS " + antes + " → " + c.psAtual + ".");
    var caiu = invadiu(c, p.nome);
    return { ok: true, soma: soma, valores: v, uns: uns, invadiu: caiu };
  }

  function cobrirRastros(c, id, total) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "cobrirRastros");
    if (erro) return { ok: false, motivo: erro };
    var t = Math.round(Number(total));
    if (!isFinite(t)) return { ok: false, motivo: "Informe o resultado do teste de Tecnologia." };
    var sucesso = t >= c.psMax;
    p.acoes += 1;
    if (sucesso) p.cobrir = true;
    registrar(c, p.nome + " · Cobrir Rastros: " + t + " contra DT " + c.psMax + " (PS máximos) — " + (sucesso ? "na próxima rolagem de dados virtuais, os 1 rolam de novo." : "falhou."));
    return { ok: true, sucesso: sucesso, dt: c.psMax };
  }

  function programarBackdoor(c, id, quantos, dispositivo) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "programarBackdoor");
    if (erro) return { ok: false, motivo: erro };
    var n = inteiro(quantos, 0, 99, 0);
    if (n < 1) return { ok: false, motivo: "Gaste ao menos 1 dado virtual." };
    if (n > p.dados) return { ok: false, motivo: p.nome + " só tem " + p.dados + " dado(s) virtual(is)." };
    if (c.backdoors.length >= MAX_BACKDOORS) return { ok: false, motivo: "Backdoors demais neste sistema." };
    p.dados -= n;
    p.acoes += 1;
    var b = { id: novoId("bd"), por: p.nome, dispositivo: texto(dispositivo, 80) || "um dispositivo à escolha", usos: n, usados: 0, em: agora() };
    c.backdoors.push(b);
    registrar(c, p.nome + " · Programar Backdoor: " + n + " dado(s) descartado(s) — " + n + " acesso(s) por " + b.dispositivo + ", sem hackear de novo.");
    return { ok: true, backdoor: b };
  }

  function plantarVirus(c, id) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "plantarVirus");
    if (erro) return { ok: false, motivo: erro };
    if (p.dados < 1) return { ok: false, motivo: p.nome + " não tem dado virtual para descartar." };
    if (c.virus.length >= MAX_VIRUS) return { ok: false, motivo: "Vírus demais neste sistema." };
    p.dados -= 1;
    p.acoes += 1;
    var v = { id: novoId("vr"), por: p.nome, ativo: true, avisos: 0, em: agora(), removidoEm: "" };
    c.virus.push(v);
    registrar(c, p.nome + " · Plantar Vírus: 1 dado descartado — o vírus espião avisa das interações novas com o sistema.");
    return { ok: true, virus: v };
  }

  /* ---------------- fim da rodada: imprevistos ---------------- */

  /* A sugestão do livro para cada agente, pelos 1 do último turno. O
     mestre confirma (ou troca) antes de aplicar. */
  function proporImprevistos(c) {
    return c.participantes.map(function (p) {
      var im = imprevistoPorUns(p.unsUltimo);
      return { participante: p.id, nome: p.nome, uns: p.unsUltimo, tipo: im ? im.chave : "" };
    });
  }

  /* `escolhas`: [{ participante, tipo ("" = nenhum), manual }]; `ps2d6`:
     o resultado de 2d6 para cada Rastro detectado, na ordem. */
  function fimDaRodada(c, escolhas, ps2d6) {
    if (c.estado !== "andamento") return { ok: false, motivo: "A cena não está em andamento." };
    if (c.participantes.some(function (p) { return p.noTurno; })) return { ok: false, motivo: "Encerre os turnos abertos antes de fechar a rodada." };
    var rolagens = lista(ps2d6).map(function (x) { return inteiro(x, 2, 12, 0); });
    var k = 0;
    var aplicados = [];
    var rastros = lista(escolhas).filter(function (e) { return e && e.tipo === "rastroDetectado" && participante(c, e.participante); }).length;
    if (rolagens.slice(0, rastros).filter(Boolean).length < rastros) return { ok: false, motivo: "Rastro detectado: role 2d6 de PS recuperados." };
    lista(escolhas).forEach(function (e) {
      var p = participante(c, e && e.participante);
      var tipo = POR_IMPREVISTO[e && e.tipo] ? e.tipo : "";
      if (!p || !tipo) return;
      var nota = "";
      if (tipo === "dorNosPulsos") { p.dor = c.rodada + 1; nota = "−2 em Tecnologia na rodada " + (c.rodada + 1) + "."; }
      if (tipo === "codigoMalEscrito") { p.perdeDado = true; nota = "perde 1 dado virtual no começo do próximo turno."; }
      if (tipo === "rastroDetectado") {
        var r = rolagens[k++];
        var antes = c.psAtual;
        c.psAtual = Math.min(c.psMax, c.psAtual + r);
        nota = "2d6 = " + r + ": PS " + antes + " → " + c.psAtual + ".";
      }
      if (tipo === "invasaoDetectada") { var a2 = c.psAtual; c.psAtual = c.psMax; nota = "o progresso se perde: PS " + a2 + " → " + c.psMax + "."; }
      var reg = { rodada: c.rodada, participante: p.nome, uns: p.unsUltimo, tipo: tipo, manual: e.manual === true, nota: nota };
      c.imprevistos.push(reg);
      aplicados.push(reg);
      registrar(c, "Imprevisto (" + p.nome + ", " + p.unsUltimo + "×1" + (e.manual ? ", escolhido pelo mestre" : "") + "): " + POR_IMPREVISTO[tipo].nome + " — " + nota);
    });
    if (c.imprevistos.length > MAX_IMPREVISTOS) c.imprevistos = c.imprevistos.slice(-MAX_IMPREVISTOS);
    c.participantes.forEach(function (p) { p.unsUltimo = 0; p.uns = 0; p.acoes = 0; });
    c.rodada += 1;
    registrar(c, "Rodada " + c.rodada + ".");
    return { ok: true, aplicados: aplicados };
  }

  /* ---------------- acesso, backdoor e vírus ---------------- */

  /* O acesso vale uma cena: o mestre encerra quando a cena de jogo acaba. */
  function encerrarAcesso(c) {
    if (!c.acesso) return { ok: false, motivo: "Não há acesso aberto." };
    c.acesso = null;
    c.estado = "encerrada";
    registrar(c, "A cena terminou: o acesso aos arquivos acabou. Numa cena posterior, é preciso hackear de novo (ou usar um backdoor).");
    return { ok: true };
  }

  /* Hackear de novo, numa cena posterior: o processo inteiro. Backdoors
     e vírus continuam no sistema. */
  function recomecar(c) {
    c.estado = "preparando";
    c.acesso = null;
    c.psAtual = c.psMax;
    c.rodada = 1;
    c.participantes.forEach(function (p) {
      p.dados = p.intelecto; p.tentativas = 0; p.cobrir = false; p.acoes = 0; p.noTurno = false;
      p.uns = 0; p.unsUltimo = 0; p.dor = 0; p.perdeDado = false;
    });
    registrar(c, "Novo processo de hacking: PS no máximo e dados virtuais pelo Intelecto.");
    return { ok: true };
  }

  function usarBackdoor(c, id) {
    var b = lista(c.backdoors).filter(function (x) { return x.id === id; })[0];
    if (!b) return { ok: false, motivo: "Backdoor não encontrado." };
    if (b.usados >= b.usos) return { ok: false, motivo: "Esse backdoor já foi usado todas as vezes." };
    if (c.acesso) return { ok: false, motivo: "O acesso já está aberto nesta cena." };
    b.usados += 1;
    c.acesso = { desde: agora(), origem: "backdoor", por: b.por };
    if (c.estado !== "andamento") c.estado = "invadido";
    registrar(c, "Backdoor de " + b.por + " (" + b.dispositivo + "): acesso sem hackear (" + b.usados + " de " + b.usos + ").");
    return { ok: true, restam: b.usos - b.usados };
  }

  /* Uma interação nova com o sistema, a critério do mestre: o vírus
     avisa, e o jogador rola 1d4 (no 1, o firewall o remove). */
  function avisoDoVirus(c, id, d4, oQue) {
    var v = lista(c.virus).filter(function (x) { return x.id === id; })[0];
    if (!v || !v.ativo) return { ok: false, motivo: "Esse vírus não está mais no sistema." };
    var r = Math.round(Number(d4));
    if (!(r >= 1 && r <= 4)) return { ok: false, motivo: "Role 1d4." };
    v.avisos += 1;
    var removido = r === 1;
    if (removido) { v.ativo = false; v.removidoEm = agora(); }
    registrar(c, "Vírus de " + v.por + " avisa: " + (texto(oQue, 160) || "nova interação com o sistema") + ". 1d4 = " + r + (removido ? " — o firewall encontrou e removeu o vírus." : "."));
    return { ok: true, removido: removido };
  }

  /* Imprevisto ou nota registrados à mão pelo mestre. */
  function anotar(c, t) {
    var s = texto(t, 300);
    if (!s) return { ok: false, motivo: "Escreva a anotação." };
    registrar(c, s);
    return { ok: true };
  }

  global.RAMAHacking = {
    VERSAO: VERSAO,
    ACOES: ACOES,
    POR_ACAO: POR_ACAO,
    TREINOS: TREINOS,
    IMPREVISTOS: IMPREVISTOS,
    POR_IMPREVISTO: POR_IMPREVISTO,
    AMBIGUIDADES: AMBIGUIDADES,
    ACOES_POR_TURNO: ACOES_POR_TURNO,
    normalizar: normalizar,
    vazio: vazio,
    vistaDoJogador: vistaDoJogador,
    cena: cena,
    participante: participante,
    podeAcao: podeAcao,
    dtDeBrechas: dtDeBrechas,
    penalidadeEmTecnologia: penalidadeEmTecnologia,
    imprevistoPorUns: imprevistoPorUns,
    ligar: ligar,
    criarCena: criarCena,
    apagarCena: apagarCena,
    editarCena: editarCena,
    adicionarParticipante: adicionarParticipante,
    tirarParticipante: tirarParticipante,
    iniciar: iniciar,
    iniciarTurno: iniciarTurno,
    encerrarTurno: encerrarTurno,
    procurarBrechas: procurarBrechas,
    quebrarCodigos: quebrarCodigos,
    cobrirRastros: cobrirRastros,
    programarBackdoor: programarBackdoor,
    plantarVirus: plantarVirus,
    proporImprevistos: proporImprevistos,
    fimDaRodada: fimDaRodada,
    encerrarAcesso: encerrarAcesso,
    recomecar: recomecar,
    usarBackdoor: usarBackdoor,
    avisoDoVirus: avisoDoVirus,
    anotar: anotar,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/ordem/hacking.js */

var MAX_OPS_HACKING = 50;

function registroDoHacking(campanhaId) {
  try {
    return acharPor(ABAS.CAMPANHA_HACKING, 'campanhaId', String(campanhaId));
  } catch (erro) {
    /* Sem a aba (setupRama desta versão ainda não rodou): a regra está
       desligada nesta campanha. */
    return null;
  }
}

function hackingAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_HACKING).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function estadoDoHacking(registro) {
  return RAMAHacking.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function hackingParaCliente(ctx, registro, usuario) {
  var estado = estadoDoHacking(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAHacking.vistaDoJogador(estado, idsDosMeusPersonagens(ctx.campanha.id, usuario)) };
}

function acaoLerHacking(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'hacking');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var dados = hackingParaCliente(ctx, registroDoHacking(ctx.campanha.id), usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoSalvarHacking(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'hacking');
    if (foraDoSistema) return foraDoSistema;
    var semSuplemento = exigirSuplemento(ctx, 'hacking', corpo);
    if (semSuplemento) return semSuplemento;
    try {
      aba(ABAS.CAMPANHA_HACKING);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_HACKING' };
    }

    var registro = registroDoHacking(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];

    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: hackingParaCliente(ctx, registro, usuario) };
    }
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: hackingParaCliente(ctx, registro, usuario) };
    }

    var anterior = estadoDoHacking(registro);
    var estado = RAMAHacking.normalizar(corpo.estado);

    /* Vínculo só com personagem DESTA campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.cenas.forEach(function (c) {
      c.participantes.forEach(function (p) { if (p.personagemId && !daMesa[p.personagemId]) p.personagemId = ''; });
    });

    /* O histórico cede primeiro quando o estado não cabe na célula. */
    var json = JSON.stringify(estado);
    var voltas = 0;
    while (json.length > MAX_CELULA && voltas < 20) {
      voltas++;
      estado.cenas.forEach(function (c) { c.historico = c.historico.slice(Math.ceil(c.historico.length / 4) || 1); });
      json = JSON.stringify(estado);
    }
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_HACKING) feitas = feitas.slice(feitas.length - MAX_OPS_HACKING);
    var novo = {
      campanhaId: String(ctx.campanha.id),
      ativo: estado.ativo,
      atualizadoEm: new Date().toISOString(),
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.CAMPANHA_HACKING, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.CAMPANHA_HACKING, novo);

    var partes = ['hacking'];
    if (anterior.ativo !== estado.ativo) partes.push('campanha');
    marcarMesa(ctx.campanha.id, partes);
    return { ok: true, rev: revAtual + 1, dados: hackingParaCliente(ctx, registroDoHacking(ctx.campanha.id), usuario) };
  });
}


/* =====================================================================
   PERIGOS COMPLEXOS (v2.48 — Arquivos Secretos 5, p. 66–69)
   ---------------------------------------------------------------------
   Mecânica OPCIONAL da campanha, desligada por padrão (Configurações →
   Mecânicas opcionais). Uma linha por campanha em CAMPANHA_PERIGOS, com
   as instâncias (rodada, participantes, sucessos, falhas, registro).

     ler_perigos      mestre: o estado inteiro; jogador: só os perigos em
                      que um personagem dele está (vistaDoJogador)
     salvar_perigos   só o mestre. O estado chega inteiro, com `rev` e
                      `opId`: a repetição não grava de novo, e uma `rev`
                      velha é recusada (conflito)

   Nada aqui aplica dano ou perda numa ficha: o registro diz o que foi
   rolado, e cada um aplica com a própria confirmação. O módulo é cópia
   fiel de js/ordem/perigos.js (o teste do backend confere).
   ===================================================================== */

/* >>> js/ordem/perigos.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal · perigos complexos da campanha
   =====================================================================
   Arquivos Secretos 5, p. 66–69 ("Como fazer e usar perigos
   complexos?"). Um perigo complexo é uma cena por si só, resolvida com
   testes estendidos (OPRPG p. 77): cada personagem faz UMA ação por
   rodada, as ações listadas são sugestões, e soluções criativas valem a
   critério do mestre. As ações pertencem ao PERIGO — não são usos novos
   de perícia.

   MODELOS são os cinco exemplos do livro, imutáveis. A campanha cria
   INSTÂNCIAS independentes (rodada, participantes, sucessos, falhas,
   estado e registro), guardadas entre sessões. Os dados que o perigo
   sorteia (duração, elemento, a DT da rodada) são rolados por clique e
   gravados: recarregar nunca rola de novo.

   DANO É UMA COISA, PERDA É OUTRA. O registro diz qual é qual e marca o
   que o livro declara irredutível. NADA aqui é aplicado numa ficha: o
   mestre e cada jogador aplicam com a confirmação deles.

   Este arquivo é copiado em backend/Campanhas.gs (entre os marcadores
   ">>> js/ordem/perigos.js" e "<<<"): o servidor normaliza com a MESMA
   regra. Um teste confere que as duas cópias são iguais.
   ===================================================================== */

(function (global) {
  "use strict";

  var MAX_PERIGOS = 20;
  var MAX_PARTICIPANTES = 12;
  var MAX_REGISTRO = 80;
  var ID = /^[A-Za-z0-9_.:-]{1,80}$/;

  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function carimbo(v) { return typeof v === "string" && v && !isNaN(new Date(v).getTime()) ? v.slice(0, 40) : ""; }
  function agora() { return new Date().toISOString(); }
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    var u = U && U.uuid ? U.uuid() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return prefixo + "-" + String(u).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
  }

  /* =================================================================
     OS CINCO MODELOS (p. 66–69)
     ================================================================= */

  var ELEMENTOS_DA_HORDA = ["sangue", "morte", "conhecimento", "energia"];
  var NOMES_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia" };
  var RESISTENCIA_DO_ELEMENTO = { sangue: "fortitude", morte: "fortitude", conhecimento: "vontade", energia: "reflexos" };
  var AREAS_DA_CHUVA = { pequena: { nome: "Pequena (uma casa)", testes: 3 }, media: { nome: "Média (um quarteirão)", testes: 5 }, grande: { nome: "Grande (uma cidade)", testes: 7 } };

  var MODELOS = [
    { chave: "explosao", nome: "Explosão em Contagem Regressiva", vd: 80, pagina: 66,
      resumo: "O grupo está diante de um explosivo que entra em contagem regressiva.",
      objetivo: "Desarmar ou escapar da área de explosão.",
      efeito: "Cinco rodadas para se afastar. No fim da quinta, a posição de cada um sai dos sucessos acumulados em correr ou carregar outro: dois ou menos, zona de explosão (8d4 de fogo, 8d4 de impacto e soterrado); três ou quatro, onda de choque (8d4 de impacto); cinco ou mais, escapa ileso. Soterrado: imóvel, 1d6 de impacto no início de cada turno; soltar-se (ou soltar um aliado) pede Atletismo DT 20.",
      rodadas: 5, sucessosParaEscapar: 5, desarmarCom: 3,
      acoes: [
        { chave: "correr", nome: "Correr", teste: "Atletismo DT 20 (Adestramento ou Pilotagem com montaria ou veículo)", dt: 20, conta: "sucesso", dobra: true,
          texto: "Corre para longe do explosivo. Passando, afasta-se; passar por 10 ou mais (ou 20 natural) conta dois sucessos. Mesmos modificadores da ação corrida (OPRPG p. 42)." },
        { chave: "carregarOutro", nome: "Carregar Outro", teste: "Atletismo DT 25", dt: 25, conta: "carregar",
          texto: "Carrega um aliado próximo (no máximo um sucesso de diferença). Passando, um sucesso para si e para o aliado." },
        { chave: "desarmar", nome: "Desarmar Explosivo", teste: "Crime ou Tecnologia DT 20", dt: 20, conta: "desarmar",
          texto: "Sacrifica a corrida para desarmar: passando, um sucesso de desarme. Com três, o explosivo é desarmado e o perigo acaba." },
        { chave: "procurarCaminho", nome: "Procurar Caminho", teste: "Percepção DT 20", dt: 20, conta: "caminho",
          texto: "Analisa o terreno: passando, +5 em todos os testes de correr e carregar outro feitos durante o perigo." },
      ] },
    { chave: "fuga", nome: "Fuga de Horda de Criaturas", vd: 40, pagina: 67,
      resumo: "Uma horda tão grande que fugir é a única opção.",
      objetivo: "Escapar da horda por 1d10+4 rodadas; depois disso, quem sobreviver escapa.",
      efeito: "No início do turno, cada personagem PERDE 2d8 PV — cansaço, desgaste e o que a horda causa; essa perda só pode ser curada depois do perigo. Para fugir, passe em correr ou carregar outro: cinco sucessos ou mais, escapa. Soterrados ficam imóveis e sofrem 1d6 de impacto no início do turno; soltar-se pede Atletismo DT 15.",
      duracao: "1d10+4", sucessosParaEscapar: 5,
      acoes: [
        { chave: "atrair", nome: "Atrair Criaturas", teste: "Enganação DT 15", dt: 15, conta: "proteger",
          texto: "Atrai a horda para proteger os aliados: passando, os aliados próximos (no máximo um sucesso de diferença) não perdem vida por uma rodada, mas o personagem perde 1d8 PV a mais." },
        { chave: "correr", nome: "Correr", teste: "Atletismo DT 15 (Adestramento ou Pilotagem com montaria ou veículo)", dt: 15, conta: "sucesso", dobra: true, metadeDaPerda: true,
          texto: "Foge da horda: passando, afasta-se e a perda de vida do perigo cai à metade por uma rodada. Por 10 ou mais (ou 20 natural), dois sucessos." },
        { chave: "carregarOutro", nome: "Carregar Outro", teste: "Atletismo DT 20", dt: 20, conta: "carregar",
          texto: "Carrega um aliado próximo: um sucesso para si e para o aliado." },
        { chave: "enfrentar", nome: "Enfrentar Criaturas", teste: "teste de ataque DT 15", dt: 15, conta: "proteger",
          texto: "Retarda a horda: passando, os aliados próximos não perdem vida por uma rodada, mas o personagem perde 1d8 PV a mais." },
        { chave: "procurarCaminho", nome: "Procurar Caminho", teste: "Percepção DT 15", dt: 15, conta: "caminho",
          texto: "Passando, +5 em todos os testes de correr e carregar outro durante o perigo." },
      ] },
    { chave: "navio", nome: "Navio Naufragando", vd: 120, pagina: 68,
      resumo: "Um desastre naufraga e inunda a embarcação com o grupo dentro.",
      objetivo: "Escapar do naufrágio em menos de 1d6+6 rodadas; depois disso, o navio é tragado com todos dentro.",
      efeito: "No início do turno, Reflexos para evitar acidentes, destroços e jatos d'água: falhando, 6d6 de impacto; falhando por 10 ou mais, fica preso e uma rodada sem agir para se libertar. A DT é 20+1d6, rolada UMA vez no início de cada rodada e a mesma para todos. Preso falha automaticamente no Reflexos. Cinco sucessos em nadar ou carregar outro: escapa.",
      duracao: "1d6+6", sucessosParaEscapar: 5,
      acoes: [
        { chave: "abrirCaminho", nome: "Abrir Caminho", teste: "teste de ataque DT 23", dt: 23, conta: "grupo", dobra: true,
          texto: "Abre caminho com violência: passando, ele e os aliados próximos se aproximam de uma saída — mas ele falha automaticamente no próximo Reflexos do perigo. Por 10 ou mais (ou 20 natural), dois sucessos." },
        { chave: "carregarOutro", nome: "Carregar Outro", teste: "Atletismo DT 28", dt: 28, conta: "carregar",
          texto: "Nada puxando um aliado próximo: um sucesso para si e para o aliado." },
        { chave: "libertar", nome: "Libertar Aliado", teste: "nenhum teste", dt: 0, conta: "libertar",
          texto: "Liberta um aliado próximo que está preso." },
        { chave: "nadar", nome: "Nadar", teste: "Atletismo DT 23", dt: 23, conta: "sucesso", dobra: true,
          texto: "Nada para fora do navio: passando, aproxima-se de uma saída; por 10 ou mais (ou 20 natural), dois sucessos. Mesmos modificadores da ação natação (OPRPG p. 42)." },
        { chave: "protegerSe", nome: "Proteger-se", teste: "nenhum teste", dt: 0, conta: "protegido",
          texto: "Busca um canto para se proteger: o Reflexos do perigo tem DT 20 (sem o d6) e não há chance de ficar preso — mas não pode nadar nem carregar outro." },
      ] },
    { chave: "predio", nome: "Prédio Ocupado por Criaturas", vd: 180, pagina: 68,
      resumo: "Invadir um prédio e exterminar uma horda de criaturas em pouco tempo.",
      objetivo: "Exterminar a horda em 1d10+5 rodadas.",
      efeito: "Elemento da horda: 1d4 (1 Sangue, 2 Morte, 3 Conhecimento, 4 Energia). No início do turno, cada personagem sofre 5d10 de dano do elemento. A horda tem 360 PV; zerados, o perigo acaba. Ela é imune a dano do seu elemento, a manobras e a efeitos que afetam só uma criatura sem causar dano, e sofre 50% a mais de dano de efeitos de área. Não exterminada a tempo, chegam mais criaturas: só resta fugir (Fuga de Horda de Criaturas).",
      duracao: "1d10+5", pvHorda: 360,
      acoes: [
        { chave: "exterminar", nome: "Exterminar Criaturas", teste: "teste de ataque DT 28", dt: 28, conta: "danoNaHorda",
          texto: "Passando, causa dano aos PV da horda como se tivesse acertado um inimigo em combate." },
        { chave: "protegerSe", nome: "Proteger-se", teste: "resistência DT 28 (Fortitude para Sangue e Morte, Vontade para Conhecimento, Reflexos para Energia)", dt: 28, conta: "metadeProximo",
          texto: "Busca cobertura: passando, reduz à metade o próximo dano do perigo." },
        { chave: "protegerAliado", nome: "Proteger Aliado", teste: "nenhum teste", dt: 0, conta: "protegerAliado",
          texto: "Toma a frente de um aliado: o próximo dano do perigo que ele sofrer é dobrado, mas o aliado não sofre dano do perigo por uma rodada." },
        { chave: "ritual", nome: "Usar Ritual", teste: "Ocultismo DT 28 (no lugar da resistência da horda)", dt: 28, conta: "danoNaHorda",
          texto: "Um ritual de dano contra a horda: se o ritual pede resistência, o personagem faz Ocultismo DT 28 — passando, é como se as criaturas tivessem falhado; falhando, como se tivessem passado." },
      ] },
    { chave: "chuva", nome: "Chuva de Sangue", vd: 300, pagina: 69,
      resumo: "Atravessar uma área tomada por chuva de ácido gástrico e órgãos humanos causada pela entidade de Sangue.",
      objetivo: "Atravessar a chuva de Sangue.",
      efeito: "No início da rodada, cada personagem sofre 5d10 de dano de Sangue (Fortitude DT 35 reduz à metade), 2d10 de dano mental e fica alquebrado (Vontade DT 35 reduz à metade e evita a condição). A área define os sucessos exigidos em avançar: pequena 3, média 5, grande 7. Cada falha: o grupo avança, mas as DT do perigo sobem para 39 por uma rodada. Três falhas: a travessia termina da forma mais desastrosa — todos sofrem 4d10 de Sangue, 2d10 mental e perdem 2d10 PE, sem que nenhum efeito evite ou reduza.",
      falhasMaximas: 3,
      acoes: [
        { chave: "avancar", nome: "Avançar", teste: "Fortitude, ou outra perícia justificada e aprovada pelo mestre (DT varia)", dt: 0, conta: "grupo",
          texto: "Os personagens se alternam fazendo testes até a quantidade exigida (ou três falhas). Fortitude pode repetir; cada outra perícia vale UMA vez no perigo. Teste estendido em grupo e aberto (OPRPG p. 77). Independentemente do resultado, o grupo atravessa: o que está em jogo é o estado de cada um no fim." },
      ] },
  ];
  var POR_MODELO = {};
  MODELOS.forEach(function (m) { POR_MODELO[m.chave] = m; });
  function modelo(chave) { return POR_MODELO[chave] || null; }
  function semTeste(a) { return !!a && a.teste === "nenhum teste"; }
  function acaoDoModelo(m, chave) { return m ? m.acoes.filter(function (a) { return a.chave === chave; })[0] || null : null; }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  var ESTADOS_DO_PARTICIPANTE = ["ativo", "escapou", "preso", "soterrado", "caido"];

  function normalizarParticipante(p) {
    var x = obj(p);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80).trim();
    if (!id || !nome) return null;
    return {
      id: id, nome: nome,
      personagemId: /^[A-Za-z0-9-]{8,60}$/.test(String(x.personagemId || "")) ? String(x.personagemId) : "",
      sucessos: inteiro(x.sucessos, 0, 99, 0),
      estado: ESTADOS_DO_PARTICIPANTE.indexOf(x.estado) >= 0 ? x.estado : "ativo",
      caminho: x.caminho === true,
      ultimaRodada: inteiro(x.ultimaRodada, 0, 999, 0),
      protegidoAte: inteiro(x.protegidoAte, 0, 999, 0),
      metadeProximo: x.metadeProximo === true,
      dobroProximo: x.dobroProximo === true,
      metadeDaPerdaAte: inteiro(x.metadeDaPerdaAte, 0, 999, 0),
      falhaAutomatica: x.falhaAutomatica === true,
      presoAte: inteiro(x.presoAte, 0, 999, 0),
      protegido: x.protegido === true,
      perdaAcumulada: inteiro(x.perdaAcumulada, 0, 9999, 0),
      zona: ["explosao", "onda", "ileso"].indexOf(x.zona) >= 0 ? x.zona : "",
    };
  }

  function normalizarRegistro(r) {
    var x = obj(r);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, rodada: inteiro(x.rodada, 0, 999, 0), participanteId: idOk(x.participanteId),
      tipo: ["acao", "efeito", "rodada", "solucao", "fim", "nota"].indexOf(x.tipo) >= 0 ? x.tipo : "nota",
      acao: texto(x.acao, 40), passou: x.passou === true, total: inteiro(x.total, -99, 999, 0),
      /* Dano e perda não se confundem; irredutível é o que o livro diz que
         nenhum efeito evita ou reduz. */
      natureza: x.natureza === "perda" ? "perda" : (x.natureza === "dano" ? "dano" : ""),
      irredutivel: x.irredutivel === true,
      valor: inteiro(x.valor, 0, 9999, 0), expressao: texto(x.expressao, 60),
      texto: texto(x.texto, 300), em: carimbo(x.em),
    };
  }

  function normalizarInstancia(i) {
    var x = obj(i);
    var id = idOk(x.id);
    var m = modelo(x.modelo);
    if (!id || !m) return null;
    var enc = obj(x.encerrado);
    var vistos = {};
    return {
      id: id, modelo: m.chave,
      nome: texto(x.nome, 120).trim() || m.nome,
      criadoEm: carimbo(x.criadoEm),
      rodada: inteiro(x.rodada, 0, 999, 0),
      rodadasTotal: inteiro(x.rodadasTotal, 0, 99, m.rodadas || 0),
      sorteioDuracao: texto(x.sorteioDuracao, 60),
      dtRodada: inteiro(x.dtRodada, 0, 99, 0),
      elemento: ELEMENTOS_DA_HORDA.indexOf(x.elemento) >= 0 ? x.elemento : "",
      pvHorda: inteiro(x.pvHorda, 0, 9999, m.pvHorda || 0),
      area: AREAS_DA_CHUVA[x.area] ? x.area : "",
      sucessosDoGrupo: inteiro(x.sucessosDoGrupo, 0, 99, 0),
      falhasDoGrupo: inteiro(x.falhasDoGrupo, 0, 9, 0),
      dtElevadaAte: inteiro(x.dtElevadaAte, 0, 999, 0),
      periciasUsadas: lista(x.periciasUsadas).map(function (k) { return texto(k, 40).toLowerCase(); }).filter(function (k) { if (!k || vistos[k]) return false; vistos[k] = true; return true; }).slice(0, 30),
      desarmes: inteiro(x.desarmes, 0, 9, 0),
      participantes: lista(x.participantes).map(normalizarParticipante).filter(Boolean).slice(0, MAX_PARTICIPANTES),
      registro: lista(x.registro).map(normalizarRegistro).filter(Boolean).slice(-MAX_REGISTRO),
      encerrado: x.encerrado ? { em: carimbo(enc.em), motivo: texto(enc.motivo, 40), texto: texto(enc.texto, 300) } : null,
      origem: idOk(x.origem),
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var vistos = {};
    return {
      ativo: b.ativo === true,
      perigos: lista(b.perigos).map(normalizarInstancia).filter(function (p) { if (!p || vistos[p.id]) return false; vistos[p.id] = true; return true; }).slice(-MAX_PERIGOS),
    };
  }

  function falha(m) { return { ok: false, motivo: m }; }
  function ok(extra) { return Object.assign({ ok: true, avisos: [] }, extra || {}); }

  function ligar(estado, sim) { estado.ativo = !!sim; return ok(); }

  function perigo(estado, id) { return estado.perigos.filter(function (p) { return p.id === id; })[0] || null; }
  function participante(inst, id) { return inst.participantes.filter(function (p) { return p.id === id; })[0] || null; }

  function registrar(inst, r) {
    var n = normalizarRegistro(Object.assign({ id: novoId("pr"), rodada: inst.rodada, em: agora() }, r));
    if (n) inst.registro.push(n);
    inst.registro = inst.registro.slice(-MAX_REGISTRO);
    return n;
  }

  /* =================================================================
     CRIAR, PARTICIPANTES, RODADAS
     ================================================================= */

  /* `sorteios`: o que a TELA rolou — { duracao: total da expressão do
     modelo, elemento: 1d4 }. Gravado: recarregar não rola de novo. */
  function criar(estado, chaveModelo, nome, sorteios, area) {
    var m = modelo(chaveModelo);
    if (!m) return falha("Perigo desconhecido.");
    if (estado.perigos.filter(function (p) { return !p.encerrado; }).length >= MAX_PERIGOS) return falha("Há perigos demais em andamento.");
    var s = sorteios || {};
    var inst = normalizarInstancia({ id: novoId("per"), modelo: m.chave, nome: nome || m.nome, criadoEm: agora() });
    if (m.duracao) {
      var d = inteiro(s.duracao, 1, 99, 0);
      if (!d) return falha("Role a duração (" + m.duracao + ").");
      inst.rodadasTotal = d;
      inst.sorteioDuracao = m.duracao + " = " + d;
    }
    if (m.chave === "predio") {
      var e = inteiro(s.elemento, 1, 4, 0);
      if (!e) return falha("Role o elemento da horda (1d4).");
      inst.elemento = ELEMENTOS_DA_HORDA[e - 1];
      inst.pvHorda = m.pvHorda;
    }
    if (m.chave === "chuva") {
      if (!AREAS_DA_CHUVA[area]) return falha("Escolha o tamanho da área.");
      inst.area = area;
    }
    estado.perigos.push(inst);
    estado.perigos = estado.perigos.slice(-MAX_PERIGOS);
    return ok({ perigo: inst });
  }

  function adicionarParticipante(inst, nome, personagemId) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    if (inst.participantes.length >= MAX_PARTICIPANTES) return falha("Participantes demais.");
    var n = texto(nome, 80).trim();
    if (!n) return falha("Diga o nome.");
    if (personagemId && inst.participantes.some(function (p) { return p.personagemId === personagemId; })) return falha(n + " já participa.");
    var p = normalizarParticipante({ id: novoId("pp"), nome: n, personagemId: personagemId });
    inst.participantes.push(p);
    return ok({ participante: p });
  }
  function removerParticipante(inst, id) {
    var antes = inst.participantes.length;
    inst.participantes = inst.participantes.filter(function (p) { return p.id !== id; });
    return inst.participantes.length < antes ? ok() : falha("Participante não encontrado.");
  }

  function rodadaDaDtElevada(inst) { return inst.dtElevadaAte && inst.dtElevadaAte >= inst.rodada; }

  /* Nova rodada. Navio: `d6` é a rolagem da DT da rodada (20+1d6), UMA
     para todos. */
  function novaRodada(inst, d6) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    var m = modelo(inst.modelo);
    if (inst.rodadasTotal && inst.rodada >= inst.rodadasTotal) return falha("As rodadas do perigo acabaram: encerre-o.");
    if (m.chave === "navio") {
      var v = inteiro(d6, 1, 6, 0);
      if (!v) return falha("Role 1d6 para a DT da rodada (20+1d6).");
      inst.rodada += 1;
      inst.dtRodada = 20 + v;
    } else {
      inst.rodada += 1;
    }
    inst.participantes.forEach(function (p) { if (p.estado === "preso" && p.presoAte && p.presoAte < inst.rodada) p.estado = "ativo"; });
    registrar(inst, { tipo: "rodada", texto: "Rodada " + inst.rodada + (inst.rodadasTotal ? " de " + inst.rodadasTotal : "") + (m.chave === "navio" ? " — DT de Reflexos " + inst.dtRodada + " (20+" + (inst.dtRodada - 20) + "), a mesma para todos." : "") +
      (m.chave === "chuva" && rodadaDaDtElevada(inst) ? " — DT das resistências 39 nesta rodada (falha anterior)." : "") });
    return ok({ rodada: inst.rodada });
  }

  /* =================================================================
     AÇÕES (uma por personagem por rodada)
     -----------------------------------------------------------------
     resultado = { passou, total, natural20, porDez, aliadoId, pericia,
     dano, area } — o que a tela rolou e a mesa confirmou.
     ================================================================= */

  function somarSucessos(inst, p, n) {
    var m = modelo(inst.modelo);
    p.sucessos = Math.min(99, p.sucessos + n);
    if (m.sucessosParaEscapar && p.sucessos >= m.sucessosParaEscapar && m.chave !== "explosao") p.estado = "escapou";
  }

  function registrarAcao(inst, participanteId, chaveAcao, resultado) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    if (!inst.rodada) return falha("Comece a primeira rodada.");
    var m = modelo(inst.modelo);
    var a = acaoDoModelo(m, chaveAcao);
    if (!a) return falha("Ação desconhecida neste perigo.");
    var p = participante(inst, participanteId);
    if (!p) return falha("Participante não encontrado.");
    if (p.estado === "escapou") return falha(p.nome + " já escapou.");
    if (p.ultimaRodada === inst.rodada) return falha(p.nome + " já agiu nesta rodada (uma ação por rodada).");
    if (p.estado === "preso" && a.chave !== "libertar") return falha(p.nome + " está preso: uma rodada sem agir para se libertar.");
    if (m.chave === "navio" && p.protegido && (a.chave === "nadar" || a.chave === "carregarOutro")) return falha("Protegido, não pode nadar nem carregar outro nesta rodada.");
    var r = obj(resultado);
    /* Só as ações "nenhum teste" passam sozinhas; Avançar (Chuva) tem DT
       variável, mas tem teste. */
    var passou = semTeste(a) ? true : r.passou === true;
    var dobra = a.dobra && passou && (r.natural20 === true || r.porDez === true);
    var aliado = r.aliadoId ? participante(inst, r.aliadoId) : null;
    var notas = [];
    /* Confere o aliado ANTES de mexer em qualquer coisa: uma ação recusada
       não gasta a vez do personagem. */
    if (passou && (a.conta === "carregar" || a.conta === "protegerAliado") && (!aliado || aliado.id === p.id)) return falha("Escolha o aliado.");
    if (passou && a.conta === "carregar" && Math.abs(aliado.sucessos - p.sucessos) > 1) return falha("Só um aliado próximo (no máximo um sucesso de diferença).");
    if (a.conta === "libertar" && (!aliado || aliado.estado !== "preso")) return falha("Escolha um aliado preso.");

    if (m.chave === "chuva") {
      var k = texto(r.pericia, 40).toLowerCase() || "fortitude";
      if (k !== "fortitude" && inst.periciasUsadas.indexOf(k) >= 0) return falha("Cada perícia que não seja Fortitude só pode ser usada uma vez neste perigo.");
      if (k !== "fortitude") inst.periciasUsadas.push(k);
      if (passou) inst.sucessosDoGrupo += 1;
      else {
        inst.falhasDoGrupo += 1;
        inst.dtElevadaAte = inst.rodada + 1;
        notas.push("Falha: o grupo avança com mais dor — as DT de resistência do perigo sobem para 39 na próxima rodada.");
      }
      p.ultimaRodada = inst.rodada;
      registrar(inst, { tipo: "acao", participanteId: p.id, acao: a.chave, passou: passou, total: inteiro(r.total, -99, 999, 0), texto: p.nome + " · Avançar (" + (r.pericia || "Fortitude") + "): " + (passou ? "sucesso" : "falha") + "." });
      var exigidos = AREAS_DA_CHUVA[inst.area].testes;
      if (inst.falhasDoGrupo >= m.falhasMaximas) return ok({ fim: "desastre", avisos: notas.concat(["Três falhas: a travessia termina da forma mais desastrosa — encerre o perigo para o efeito final."]) });
      if (inst.sucessosDoGrupo >= exigidos) return ok({ fim: "atravessou", avisos: notas.concat(["Sucessos exigidos atingidos: o grupo atravessou."]) });
      return ok({ avisos: notas });
    }

    p.ultimaRodada = inst.rodada;
    if (passou) {
      if (a.conta === "sucesso") somarSucessos(inst, p, dobra ? 2 : 1);
      if (a.conta === "carregar") {
        if (!aliado || aliado.id === p.id) return falha("Escolha o aliado carregado.");
        if (Math.abs(aliado.sucessos - p.sucessos) > 1) return falha("Só um aliado próximo (no máximo um sucesso de diferença).");
        somarSucessos(inst, p, 1);
        somarSucessos(inst, aliado, 1);
      }
      if (a.conta === "grupo" && m.chave === "navio") {
        var proximos = inst.participantes.filter(function (q) { return q.estado !== "escapou" && Math.abs(q.sucessos - p.sucessos) <= 1; });
        proximos.forEach(function (q) { somarSucessos(inst, q, dobra ? 2 : 1); });
        p.falhaAutomatica = true;
        notas.push("Abrir Caminho: " + p.nome + " falha automaticamente no próximo Reflexos do perigo.");
      }
      if (a.conta === "desarmar") {
        inst.desarmes += 1;
        if (inst.desarmes >= m.desarmarCom) {
          inst.encerrado = { em: agora(), motivo: "desarmado", texto: "Três sucessos em Desarmar Explosivo: o explosivo foi desarmado." };
          notas.push("O explosivo foi desarmado: o perigo acabou.");
        }
      }
      if (a.conta === "caminho") p.caminho = true;
      if (a.conta === "proteger") {
        inst.participantes.forEach(function (q) { if (q.id !== p.id && Math.abs(q.sucessos - p.sucessos) <= 1) q.protegidoAte = inst.rodada + 1; });
        notas.push(p.nome + " perde 1d8 PV adicionais (role no efeito do perigo).");
      }
      if (a.conta === "libertar") {
        if (!aliado || aliado.estado !== "preso") return falha("Escolha um aliado preso.");
        aliado.estado = "ativo"; aliado.presoAte = 0;
      }
      if (a.conta === "protegido") p.protegido = true;
      if (a.conta === "metadeProximo") p.metadeProximo = true;
      if (a.conta === "protegerAliado") {
        if (!aliado || aliado.id === p.id) return falha("Escolha o aliado protegido.");
        p.dobroProximo = true;
        aliado.protegidoAte = inst.rodada + 1;
      }
      if (a.conta === "danoNaHorda") {
        var dano = inteiro(r.dano, 0, 9999, 0);
        if (r.area === true) { var antesA = dano; dano = Math.floor(dano * 1.5); notas.push("Efeito de área: +50% (" + antesA + " → " + dano + ")."); }
        if (r.doElemento === true) { dano = 0; notas.push("A horda é imune a dano do próprio elemento."); }
        inst.pvHorda = Math.max(0, inst.pvHorda - dano);
        if (inst.pvHorda === 0) inst.encerrado = { em: agora(), motivo: "exterminada", texto: "A horda foi exterminada." };
      }
      if (a.metadeDaPerda) p.metadeDaPerdaAte = inst.rodada + 1;
    }
    registrar(inst, { tipo: "acao", participanteId: p.id, acao: a.chave, passou: passou, total: inteiro(r.total, -99, 999, 0),
      valor: a.conta === "danoNaHorda" ? inteiro(r.dano, 0, 9999, 0) : 0,
      texto: p.nome + " · " + a.nome + ": " + (semTeste(a) ? "feito" : passou ? (dobra ? "sucesso por 10+ (dois)" : "sucesso") : "falha") + (aliado ? " (" + aliado.nome + ")" : "") + "." });
    return ok({ avisos: notas });
  }

  /* Uma solução criativa aprovada pelo mestre: fica registrada como
     solução da mesa, nunca como ação oficial; os sucessos (se houver)
     são os que a mesa decidiu. */
  function solucaoAlternativa(inst, participanteId, textoDaSolucao, sucessos) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    var t = texto(textoDaSolucao, 300).trim();
    if (!t) return falha("Descreva a solução.");
    var p = participanteId ? participante(inst, participanteId) : null;
    var n = inteiro(sucessos, 0, 5, 0);
    if (p && n) somarSucessos(inst, p, n);
    if (!p && n && inst.modelo === "chuva") inst.sucessosDoGrupo += n;
    registrar(inst, { tipo: "solucao", participanteId: p ? p.id : "", texto: "Solução da mesa" + (p ? " (" + p.nome + ")" : "") + ": " + t + (n ? " — +" + n + " sucesso(s), decisão do mestre." : "") });
    return ok();
  }

  /* =================================================================
     O EFEITO DO PERIGO (início do turno ou da rodada)
     -----------------------------------------------------------------
     Devolve o PLANO — quem, o que rolar, dano ou perda, a DT — para a
     tela rolar e mostrar. Nada é aplicado numa ficha.
     ================================================================= */

  function planoDoEfeito(inst, participanteId) {
    var m = modelo(inst.modelo);
    var p = participante(inst, participanteId);
    if (!p) return falha("Participante não encontrado.");
    var l = [];
    if (m.chave === "fuga") {
      if (p.protegidoAte >= inst.rodada) l.push({ texto: "Protegido por um aliado nesta rodada: não perde vida." });
      else l.push({ rolar: "2d8", natureza: "perda", recurso: "PV", metade: p.metadeDaPerdaAte >= inst.rodada, texto: "Perda de PV da horda (só pode ser curada depois do perigo)" + (p.metadeDaPerdaAte >= inst.rodada ? " — à metade por ter corrido." : ".") });
      if (p.estado === "soterrado") l.push({ rolar: "1d6", natureza: "dano", tipoDano: "impacto", texto: "Soterrado: 1d6 de impacto." });
    }
    if (m.chave === "navio") {
      var dt = p.protegido ? 20 : inst.dtRodada;
      if (p.estado === "preso" || p.falhaAutomatica) l.push({ automatica: true, texto: "Falha automaticamente no Reflexos (" + (p.estado === "preso" ? "preso" : "Abrir Caminho") + ")." });
      l.push({ teste: "reflexos", dt: dt, texto: "Reflexos DT " + dt + (p.protegido ? " (protegido: sem o d6 e sem ficar preso)" : "") + ": falhando, 6d6 de impacto; por 10 ou mais, preso." });
      l.push({ rolar: "6d6", natureza: "dano", tipoDano: "impacto", texto: "Se falhar: 6d6 de impacto." });
    }
    if (m.chave === "predio") {
      if (p.protegidoAte >= inst.rodada) l.push({ texto: "Protegido por um aliado nesta rodada: não sofre dano do perigo." });
      else l.push({ rolar: "5d10", natureza: "dano", tipoDano: inst.elemento, metade: p.metadeProximo, dobro: p.dobroProximo,
        texto: "5d10 de dano de " + NOMES_ELEMENTO[inst.elemento] + (p.metadeProximo ? " — à metade (Proteger-se)" : "") + (p.dobroProximo ? " — dobrado (Proteger Aliado)" : "") + "." });
    }
    if (m.chave === "chuva") {
      var dtC = rodadaDaDtElevada(inst) ? 39 : 35;
      l.push({ rolar: "5d10", natureza: "dano", tipoDano: "Sangue", teste: "fortitude", dt: dtC, texto: "5d10 de dano de Sangue (Fortitude DT " + dtC + " reduz à metade)." });
      l.push({ rolar: "2d10", natureza: "dano", tipoDano: "mental", teste: "vontade", dt: dtC, texto: "2d10 de dano mental e alquebrado (Vontade DT " + dtC + " reduz à metade e evita a condição)." });
    }
    if (m.chave === "explosao" && p.estado === "soterrado") l.push({ rolar: "1d6", natureza: "dano", tipoDano: "impacto", texto: "Soterrado: 1d6 de impacto (soltar-se: Atletismo DT 20)." });
    return ok({ participante: p, partes: l });
  }

  /* O resultado do efeito, já rolado: registra (e gasta os marcadores
     de "próximo dano"). `falhouPorDez`: navio, fica preso. */
  function registrarEfeito(inst, participanteId, partes) {
    var p = participante(inst, participanteId);
    if (!p) return falha("Participante não encontrado.");
    lista(partes).forEach(function (x) {
      var v = inteiro(x.valor, 0, 9999, 0);
      if (x.natureza === "perda" && inst.modelo === "fuga") p.perdaAcumulada = Math.min(9999, p.perdaAcumulada + v);
      registrar(inst, { tipo: "efeito", participanteId: p.id, natureza: x.natureza, irredutivel: x.irredutivel === true, valor: v, expressao: x.expressao,
        texto: p.nome + ": " + (x.natureza === "perda" ? "perde " : "sofre ") + v + (x.recurso ? " " + x.recurso : "") + (x.tipoDano ? " de " + x.tipoDano : "") + (x.irredutivel ? " (irredutível)" : "") + (x.nota ? " — " + x.nota : "") + "." });
    });
    if (inst.modelo === "predio") { p.metadeProximo = false; p.dobroProximo = false; }
    if (inst.modelo === "navio") {
      p.falhaAutomatica = false;
      var presa = lista(partes).some(function (x) { return x.falhouPorDez === true; });
      if (presa && !p.protegido) { p.estado = "preso"; p.presoAte = inst.rodada + 1; }
      p.protegido = false;
    }
    return ok();
  }

  /* =================================================================
     ENCERRAR
     ================================================================= */

  function encerrar(inst, motivo) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    var m = modelo(inst.modelo);
    var avisos = [];
    if (m.chave === "explosao" && motivo !== "desarmado") {
      inst.participantes.forEach(function (p) {
        p.zona = p.sucessos >= 5 ? "ileso" : p.sucessos >= 3 ? "onda" : "explosao";
        if (p.zona === "explosao") p.estado = "soterrado";
        avisos.push(p.nome + ": " + (p.zona === "ileso" ? "escapa ileso" : p.zona === "onda" ? "onda de choque — 8d4 de impacto" : "zona de explosão — 8d4 de fogo, 8d4 de impacto e soterrado") + ".");
      });
    }
    if (m.chave === "fuga") inst.participantes.forEach(function (p) { if (p.estado !== "caido") p.estado = "escapou"; });
    if (m.chave === "navio") inst.participantes.forEach(function (p) { if (p.estado !== "escapou") avisos.push(p.nome + ": tragado com o navio para as profundezas."); });
    if (m.chave === "chuva" && inst.falhasDoGrupo >= m.falhasMaximas) {
      avisos.push("Travessia desastrosa: todos sofrem 4d10 de Sangue e 2d10 de dano mental e perdem 2d10 PE — nenhum efeito evita ou reduz.");
    }
    inst.encerrado = { em: agora(), motivo: texto(motivo || "fim", 40), texto: avisos.join(" ") };
    registrar(inst, { tipo: "fim", texto: "Perigo encerrado" + (motivo ? " (" + motivo + ")" : "") + "." + (avisos.length ? " " + avisos.join(" ") : "") });
    return ok({ avisos: avisos });
  }

  /* O efeito final que a fonte declara, para a tela rolar (explosão por
     zona e a travessia desastrosa da chuva). */
  function efeitoFinal(inst, participanteId) {
    var p = participante(inst, participanteId);
    if (!p || !inst.encerrado) return [];
    if (inst.modelo === "explosao") {
      if (p.zona === "explosao") return [{ rolar: "8d4", natureza: "dano", tipoDano: "fogo" }, { rolar: "8d4", natureza: "dano", tipoDano: "impacto" }];
      if (p.zona === "onda") return [{ rolar: "8d4", natureza: "dano", tipoDano: "impacto" }];
    }
    if (inst.modelo === "chuva" && inst.falhasDoGrupo >= 3) {
      return [{ rolar: "4d10", natureza: "dano", tipoDano: "Sangue", irredutivel: true }, { rolar: "2d10", natureza: "dano", tipoDano: "mental", irredutivel: true },
        { rolar: "2d10", natureza: "perda", recurso: "PE", irredutivel: true }];
    }
    return [];
  }

  /* O prédio não exterminado a tempo vira uma fuga — um perigo novo,
     com os mesmos participantes (os sucessos recomeçam). */
  function transicaoParaFuga(estado, inst, duracao) {
    if (inst.modelo !== "predio") return falha("Só o Prédio Ocupado vira fuga.");
    if (!inst.encerrado) encerrar(inst, "tempo");
    var r = criar(estado, "fuga", "Fuga — " + inst.nome, { duracao: duracao });
    if (!r.ok) return r;
    inst.participantes.forEach(function (p) { adicionarParticipante(r.perigo, p.nome, p.personagemId); });
    r.perigo.origem = inst.id;
    return r;
  }

  /* A VISTA de um jogador: os perigos em que um personagem dele está,
     sem o registro dos outros. */
  function vistaDoJogador(estado, meusPersonagens) {
    var meus = {};
    lista(meusPersonagens).forEach(function (id) { meus[String(id)] = true; });
    return {
      ativo: estado.ativo,
      perigos: estado.perigos.filter(function (i) { return i.participantes.some(function (p) { return p.personagemId && meus[p.personagemId]; }); }).map(function (i) {
        var m = modelo(i.modelo);
        var mineIds = {};
        i.participantes.forEach(function (p) { if (p.personagemId && meus[p.personagemId]) mineIds[p.id] = true; });
        return {
          id: i.id, modelo: i.modelo, nome: i.nome, objetivo: m.objetivo, efeito: m.efeito, rodada: i.rodada, rodadasTotal: i.rodadasTotal,
          dtRodada: i.dtRodada, elemento: i.elemento, pvHorda: i.pvHorda, area: i.area, sucessosDoGrupo: i.sucessosDoGrupo, falhasDoGrupo: i.falhasDoGrupo,
          encerrado: i.encerrado,
          participantes: i.participantes.map(function (p) { return { id: p.id, nome: p.nome, sucessos: p.sucessos, estado: p.estado, zona: p.zona, meu: !!mineIds[p.id] }; }),
          registro: i.registro.filter(function (r) { return !r.participanteId || mineIds[r.participanteId] || r.tipo === "rodada" || r.tipo === "fim"; }).slice(-20),
        };
      }),
    };
  }

  global.RAMAPerigos = {
    MODELOS: MODELOS,
    AREAS_DA_CHUVA: AREAS_DA_CHUVA,
    ELEMENTOS_DA_HORDA: ELEMENTOS_DA_HORDA,
    NOMES_ELEMENTO: NOMES_ELEMENTO,
    RESISTENCIA_DO_ELEMENTO: RESISTENCIA_DO_ELEMENTO,
    modelo: modelo,
    semTeste: semTeste,
    normalizar: normalizar,
    normalizarInstancia: normalizarInstancia,
    ligar: ligar,
    perigo: perigo,
    participante: participante,
    criar: criar,
    adicionarParticipante: adicionarParticipante,
    removerParticipante: removerParticipante,
    novaRodada: novaRodada,
    registrarAcao: registrarAcao,
    solucaoAlternativa: solucaoAlternativa,
    planoDoEfeito: planoDoEfeito,
    registrarEfeito: registrarEfeito,
    encerrar: encerrar,
    efeitoFinal: efeitoFinal,
    transicaoParaFuga: transicaoParaFuga,
    vistaDoJogador: vistaDoJogador,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/ordem/perigos.js */

var MAX_OPS_PERIGOS = 50;

function registroDosPerigos(campanhaId) {
  try {
    return acharPor(ABAS.CAMPANHA_PERIGOS, 'campanhaId', String(campanhaId));
  } catch (erro) {
    /* Sem a aba (setupRama desta versão ainda não rodou): a mecânica está
       desligada nesta campanha. */
    return null;
  }
}

function perigosAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_PERIGOS).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function estadoDosPerigos(registro) {
  return RAMAPerigos.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function perigosParaCliente(ctx, registro, usuario) {
  var estado = estadoDosPerigos(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAPerigos.vistaDoJogador(estado, idsDosMeusPersonagens(ctx.campanha.id, usuario)) };
}

function acaoLerPerigos(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'perigos');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var dados = perigosParaCliente(ctx, registroDosPerigos(ctx.campanha.id), usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoSalvarPerigos(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'perigos');
    if (foraDoSistema) return foraDoSistema;
    var semSuplemento = exigirSuplemento(ctx, 'perigos', corpo);
    if (semSuplemento) return semSuplemento;
    try {
      aba(ABAS.CAMPANHA_PERIGOS);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_PERIGOS' };
    }

    var registro = registroDosPerigos(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];

    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: perigosParaCliente(ctx, registro, usuario) };
    }
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: perigosParaCliente(ctx, registro, usuario) };
    }

    var anterior = estadoDosPerigos(registro);
    var estado = RAMAPerigos.normalizar(corpo.estado);

    /* Vínculo só com personagem DESTA campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.perigos.forEach(function (i) {
      i.participantes.forEach(function (p) { if (p.personagemId && !daMesa[p.personagemId]) p.personagemId = ''; });
    });

    /* O registro cede primeiro quando o estado não cabe na célula. */
    var json = JSON.stringify(estado);
    var voltas = 0;
    while (json.length > MAX_CELULA && voltas < 20) {
      voltas++;
      estado.perigos.forEach(function (i) { i.registro = i.registro.slice(Math.ceil(i.registro.length / 4) || 1); });
      json = JSON.stringify(estado);
    }
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_PERIGOS) feitas = feitas.slice(feitas.length - MAX_OPS_PERIGOS);
    var novo = {
      campanhaId: String(ctx.campanha.id),
      ativo: estado.ativo,
      atualizadoEm: new Date().toISOString(),
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.CAMPANHA_PERIGOS, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.CAMPANHA_PERIGOS, novo);

    var partes = ['perigos'];
    if (anterior.ativo !== estado.ativo) partes.push('campanha');
    marcarMesa(ctx.campanha.id, partes);
    return { ok: true, rev: revAtual + 1, dados: perigosParaCliente(ctx, registroDosPerigos(ctx.campanha.id), usuario) };
  });
}

/* =====================================================================
   VIAGENS NAS ESTRADAS (Arquivos Secretos 11, p. 36–91)
   ---------------------------------------------------------------------
   Mecânica OPCIONAL da campanha de Ordem, desligada por padrão
   (Configurações → Mecânicas opcionais), do suplemento ordem.as11. Uma
   linha por campanha em CAMPANHA_VIAGENS, com as viagens (itinerário,
   veículos, encontros, acidentes, registros) e, numa delas, os controles
   da missão Carcaças Vermelhas.

     ler_viagens     mestre: o estado inteiro (e, com `incluirVeiculos`,
                     os veículos operacionais das fichas da campanha);
                     jogador: a vista filtrada (sem notas, sem encontros
                     futuros, sem etapas fixas não reveladas)
     viagem_operar   UMA operação, com opId. As do mestre exigem o mestre;
                     as do jogador (gastar dados de caçada, Sonnenblume,
                     teste de passageiro, pessoa querida) exigem o dono
                     do agente (ou o mestre). O SERVIDOR rola os dados da
                     operação e grava junto: repetir o mesmo opId devolve
                     o resultado gravado, sem rolar nem cobrar de novo.

   As únicas escritas em ficha são as do cardápio do Sonnenblume (pontos
   temporários com origem) e a expiração deles no fim da missão — com o
   opId na ficha. Veículos vinculados do AS3 são LIDOS das fichas, nunca
   escritos. O módulo é cópia fiel de js/ordem/viagens.js (o teste do
   backend confere).
   ===================================================================== */

/* >>> js/ordem/viagens.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal · viagens nas estradas (Arquivos Secretos 11)
   =====================================================================
   Arquivos Secretos 11 (v1.0, “Gaudérios e as Estradas”): as regras
   opcionais de viagem (Mestrando nas Estradas, p. 36–55), as regalias
   novas (p. 56–57) e a missão Carcaças Vermelhas (p. 60–91), como
   FERRAMENTA OPCIONAL da campanha de Ordem. Desligada por padrão: o
   mestre liga em Configurações → Mecânicas opcionais e, dentro dela,
   prepara uma viagem livre ou inicia os controles da missão. Liberar o
   suplemento não liga nada.

   As viagens do AS11 não precisam de Veículos Operacionais (AS3,
   p. 125): os 17 modelos daqui têm proporções, vagas, autonomia e
   categoria de requisição, e nada de PV, Defesa ou RD. Com o AS3 na
   mesa, um veículo operacional de uma ficha pode ser VINCULADO à viagem:
   ele continua sendo o mesmo registro da ficha (PV, combustível,
   regalias) — a viagem só lê.

   TRÊS COISAS SEPARADAS, SEMPRE:
     preparação   origem, destino, itinerário, veículos, ocupantes,
                  motorista, navegador, velocidade, encontros fixos
     rolagem      o SERVIDOR rola (d100, d20, dados de perda, dados de
                  caçada…) e grava junto com a operação: repetir a
                  operação (mesmo opId) devolve o MESMO resultado, e
                  reabrir a tela nunca rola de novo
     aplicação    toda consequência fica pendente até o mestre confirmar
                  (acidente, encontros a mais, perda de recurso, estado do
                  veículo). Perda e dano de personagem são REGISTRADOS
                  com a natureza e o tipo; cada um aplica na ficha com a
                  própria confirmação. As únicas escritas em ficha são as
                  do cardápio do Sonnenblume (pontos temporários com a
                  origem, que expiram no fim da missão).

   Toda operação vira uma linha do histórico com autor, hora e os
   EFEITOS que causou; desfazer devolve esses efeitos (deltas nos
   contadores, estados antigos nos campos, registros marcados como
   desfeitos) e também o que foi escrito nas fichas.

   Este arquivo é copiado em backend/Ordem.gs (entre os marcadores
   ">>> js/ordem/viagens.js" e "<<<"): o servidor aplica as operações com
   a MESMA regra. Um teste confere que as duas cópias são iguais.
   ===================================================================== */

(function (global) {
  "use strict";

  var MAX_VIAGENS = 8;
  var MAX_ETAPAS = 48;
  var MAX_VEICULOS = 6;
  var MAX_OCUPANTES = 24;
  var MAX_ENCONTROS = 60;
  var MAX_ACIDENTES = 30;
  var MAX_TRECHOS = 40;
  var MAX_HISTORICO = 100;
  var MAX_AGENTES = 12;
  var ID = /^[A-Za-z0-9_.:-]{1,80}$/;

  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function carimbo(v) { return typeof v === "string" && v && !isNaN(new Date(v).getTime()) ? v.slice(0, 40) : ""; }
  function copia(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function ref(p) { return "Arquivos Secretos 11, p. " + p; }
  function porChave(l) { var m = {}; l.forEach(function (x) { m[x.chave] = x; }); return m; }
  function unicoPorId(l) { var v = {}; return l.filter(function (x) { if (!x || v[x.id]) return false; v[x.id] = true; return true; }); }

  /* =================================================================
     VEÍCULOS DE VIAGEM (p. 37)
     -----------------------------------------------------------------
     Proporções, vagas de passageiros ALÉM do condutor, autonomia e
     categoria de requisição — três coisas distintas do tamanho de
     combate. Bicicleta e cavalo andam por dia (um dia = um módulo médio)
     e sempre na velocidade padrão; o ciclista usa Atletismo e o ginete,
     Adestramento.

     Equipamento de série (interpretação do RAMA, editável pelo mestre):
     a fonte diz que carros velhos e motos não têm extintor “por padrão”
     (p. 49) e trata o estepe como o normal de quem tem quatro rodas
     (p. 48). Então: estepe em todo veículo motorizado que não é moto;
     extintor nesses mesmos, menos o carro velho.
     ================================================================= */

  var VEICULOS = [
    { chave: "motoPopular", nome: "Moto popular", proporcoes: 1, passageiros: 1, autonomia: 300, categoria: "I", tipo: "moto" },
    { chave: "motoEstrada", nome: "Moto de estrada", proporcoes: 1, passageiros: 1, autonomia: 400, categoria: "II", tipo: "moto" },
    { chave: "carroVelho", nome: "Carro velho", proporcoes: 2, passageiros: 4, autonomia: 400, categoria: "I", tipo: "carro", velho: true },
    { chave: "carroPopular", nome: "Carro popular", proporcoes: 2, passageiros: 4, autonomia: 600, categoria: "II", tipo: "carro" },
    { chave: "carroEletrico", nome: "Carro elétrico", proporcoes: 2, passageiros: 4, autonomia: 350, categoria: "III", tipo: "carro", eletrico: true },
    { chave: "carroEsportivo", nome: "Carro esportivo", proporcoes: 2, passageiros: 4, autonomia: 500, categoria: "IV", tipo: "carro" },
    { chave: "van", nome: "Van", proporcoes: 3, passageiros: 5, autonomia: 600, categoria: "III", tipo: "carro" },
    { chave: "caminhonete", nome: "Caminhonete", proporcoes: 3, passageiros: 2, autonomia: 700, categoria: "III", tipo: "carro" },
    { chave: "jipe", nome: "Jipe", proporcoes: 3, passageiros: 3, autonomia: 700, categoria: "III", tipo: "carro" },
    { chave: "microOnibus", nome: "Micro-ônibus", proporcoes: 4, passageiros: 20, autonomia: 700, categoria: "III", tipo: "carro" },
    { chave: "motorhome", nome: "Motorhome", proporcoes: 5, passageiros: 4, autonomia: 800, categoria: "III", tipo: "carro", vagas: "2 assentos e 2 camas" },
    { chave: "caminhao", nome: "Caminhão", proporcoes: 6, passageiros: 2, autonomia: 1200, categoria: "II", tipo: "carro" },
    { chave: "onibusTurne", nome: "Ônibus de turnê", proporcoes: 6, passageiros: 12, autonomia: 600, categoria: "II", tipo: "carro", vagas: "4 assentos e 4 beliches" },
    { chave: "onibusPassageiros", nome: "Ônibus de passageiros", proporcoes: 6, passageiros: 40, autonomia: 600, categoria: "III", tipo: "carro" },
    { chave: "carreta", nome: "Carreta", proporcoes: 7, passageiros: 2, autonomia: 1500, categoria: "III", tipo: "carro" },
    { chave: "bicicleta", nome: "Bicicleta", proporcoes: 0, passageiros: 0, autonomia: 0, porDia: 60, categoria: "I", tipo: "bicicleta",
      pericia: "atletismo", soPadrao: true, vagas: "só o ciclista" },
    { chave: "cavalo", nome: "Cavalo", proporcoes: 1, passageiros: 1, autonomia: 0, porDia: 50, porDiaComPassageiro: 30, categoria: "", tipo: "cavalo",
      pericia: "adestramento", soPadrao: true, vagas: "1 passageiro além do ginete" },
  ];
  var POR_VEICULO = porChave(VEICULOS);

  /* Os veículos operacionais do AS3 (p. 126 e 131), só o que a viagem
     mostra de um veículo vinculado. O registro de verdade continua em
     js/ordem/arquivo3.js (o teste confere que os números batem). */
  var MODELOS_AS3 = {
    categoria2: { nome: "Veículo de categoria II", categoria: "II", tamanho: "Grande", pv: 100 },
    categoria3: { nome: "Veículo de categoria III", categoria: "III", tamanho: "Grande", pv: 150 },
    categoria4: { nome: "Veículo de categoria IV", categoria: "IV", tamanho: "Enorme", pv: 200 },
    motoGauderios: { nome: "Motocicleta dos Gaudérios Abutres", categoria: "III", tamanho: "Médio", pv: 120 },
  };

  /* =================================================================
     REGALIAS (p. 56–57) — o que muda NA VIAGEM
     -----------------------------------------------------------------
     O cadastro das regalias (nome, resumo, menor ou inteira, limite)
     mora em js/ordem/arquivo3.js, junto das do AS3, AS5 e AS9: são
     regalias de Veículos Operacionais. Num veículo de viagem do AS11
     (sem vagas na fonte), as mesmas chaves descrevem o equipamento. Aqui
     fica só o EFEITO que a viagem confere. Três regalias menores ocupam a
     vaga de uma inteira.
     ================================================================= */

  var REGALIAS_NA_VIAGEM = {
    airbag: { nome: "Airbag", menor: true, maximo: 2, nota: "Airbag: motorista e passageiro da frente (a segunda aquisição estende aos demais assentos). A fonte não dá redução numérica de dano: a mesa decide." },
    arCondicionado: { nome: "Ar-condicionado", menor: true, temperatura: true },
    carregadorDeAparelhos: { nome: "Carregador de aparelhos", menor: true },
    carrinhoLateral: { nome: "Carrinho Lateral", soMoto: true },
    computadorDeBordo: { nome: "Computador de Bordo", gps: true },
    estepe: { nome: "Estepe", menor: true, maximo: 3, reserva: true },
    extintor: { nome: "Extintor", menor: true, maximo: 3, reserva: true },
    gps: { nome: "GPS", menor: true, gps: true },
    paineisSolares: { nome: "Painéis Solares Avançados", eletricos: true },
    sensoresECameras: { nome: "Sensores e câmeras", menor: true, pilotagem: 2 },
    travasEAlarme: { nome: "Travas elétricas e alarme", menor: true },
    /* Regalias de outros arquivos que a viagem cruza. */
    aprimoramentosDeVelocidade: { nome: "Aprimoramentos de Velocidade", pilotagem: 5, fonte: "Arquivos Secretos 3, p. 128" },
    gaiolaDeProtecao: { nome: "Gaiola de Proteção", capotamento: true, fonte: "Arquivos Secretos 5, p. 59" },
  };
  var CHAVES_AS11 = ["airbag", "arCondicionado", "carregadorDeAparelhos", "carrinhoLateral", "computadorDeBordo", "estepe", "extintor", "gps", "paineisSolares", "sensoresECameras", "travasEAlarme"];

  /* =================================================================
     ITINERÁRIOS (p. 38–40) E NAVEGAÇÃO (p. 41)
     ================================================================= */

  var MODULOS = {
    curta: { nome: "Curta", limite: "até cerca de 200 km (menos de um turno de viagem)", km: 200 },
    media: { nome: "Média", limite: "até cerca de 400 km (mais de um turno)", km: 400 },
    longa: { nome: "Longa", limite: "até cerca de 1.000 km (um dia inteiro)", km: 1000 },
  };

  function etapasDoModulo(modulo, velocidade) {
    var e = function (tipo, periodo, rotulo) { return { tipo: tipo, periodo: periodo || "", rotulo: rotulo || "" }; };
    if (modulo === "curta") return [e("partida"), e("encontro"), e("chegada")];
    if (modulo === "media") {
      return velocidade === "imprudente"
        ? [e("partida"), e("encontro"), e("encontro"), e("chegada")]
        : [e("partida"), e("encontro"), e("parada"), e("encontro"), e("chegada")];
    }
    return velocidade === "imprudente"
      ? [e("partida", "manhã"), e("encontro"), e("parada", "tarde", "Parada (sem interlúdio)"), e("encontro"), e("chegada", "noite")]
      : [e("partida", "manhã"), e("encontro"), e("parada", "tarde"), e("encontro"), e("parada", "noite"), e("encontro"), e("chegada", "madrugada")];
  }

  var NAVEGACAO = {
    conhece: { nome: "“Eu conheço o caminho”", pericia: "", automatico: true },
    gps: { nome: "Aparelho com GPS", pericia: "tecnologia", semSinal: "sobrevivencia" },
    visual: { nome: "Placas e orientação visual", pericia: "percepcao" },
    mapa: { nome: "Mapa", pericia: "sobrevivencia" },
  };
  var NOMES_PERICIA = { pilotagem: "Pilotagem", atletismo: "Atletismo", adestramento: "Adestramento", tecnologia: "Tecnologia", sobrevivencia: "Sobrevivência",
    percepcao: "Percepção", profissao: "Profissão", intuicao: "Intuição", fortitude: "Fortitude", reflexos: "Reflexos", vontade: "Vontade", navegacao: "Navegação", livre: "Perícia justificada" };

  /* =================================================================
     ENCONTROS ALEATÓRIOS (p. 44–53)
     -----------------------------------------------------------------
     d100 na tabela principal e d20 em cada subtabela. Cada evento tem
     `testes` (os que a fonte pede; `soImprudente` quando só valem nessa
     velocidade; `dt` ou [padrão, imprudente]) e `opcoes` (as decisões da
     mesa, cada uma com o próprio teste e consequências). Consequências
     são PROPOSTAS: o mestre confirma uma a uma.
     ================================================================= */

  function C(tipo, x) { return Object.assign({ tipo: tipo }, x || {}); }
  var ACIDENTE = C("acidente");
  function MAIS(n) { return C("encontros", { n: n }); }
  function T(pericia, dt, x) { return Object.assign({ pericia: pericia, dt: dt }, x || {}); }
  var AJUDA = "Teste do motorista com ajuda dos demais (OPRPG p. 76): Luta, Pontaria ou Misticismo (se for ocultista).";

  var TABELA_PRINCIPAL = [
    [1, 1, ["acidente"], "Um acidente! (p. 54)"],
    [2, 60, [], "Nada acontece."],
    [61, 67, ["humano"], "Risco humano."],
    [68, 74, ["veiculo"], "Problema no veículo."],
    [75, 81, ["obstaculo"], "Obstáculo na estrada."],
    [82, 91, ["ambiental"], "Risco ambiental."],
    [92, 95, ["paranormal"], "Ataque do paranormal."],
    [96, 97, ["ambiental", "humano"], "Risco ambiental + risco humano."],
    [98, 98, ["ambiental", "veiculo"], "Risco ambiental + problema no veículo."],
    [99, 99, ["ambiental", "obstaculo"], "Risco ambiental + obstáculo na estrada."],
    [100, 100, ["ambiental", "paranormal"], "Risco ambiental + ataque do paranormal."],
  ];
  var NOMES_TABELA = { acidente: "Acidente", humano: "Risco humano", veiculo: "Problema no veículo", obstaculo: "Obstáculo na estrada", ambiental: "Risco ambiental", paranormal: "Ataque do paranormal" };

  function linhaPrincipal(d100) {
    var n = inteiro(d100, 1, 100, 1);
    for (var i = 0; i < TABELA_PRINCIPAL.length; i++) if (n >= TABELA_PRINCIPAL[i][0] && n <= TABELA_PRINCIPAL[i][1]) return TABELA_PRINCIPAL[i];
    return TABELA_PRINCIPAL[1];
  }

  var SUBTABELAS = {
    humano: [
      { de: 1, ate: 3, chave: "radar", nome: "Radar", pagina: 46, resumo: "Um radar surge em cima da hora. Na velocidade padrão, nada acontece; na imprudente, multa e pontos na carteira (na terceira vez, –2d20 para evitar a polícia até resolver).",
        sempre: [C("infracao", { soImprudente: true })] },
      { de: 4, ate: 6, chave: "descuidoNavegador", nome: "Descuido do navegador", pagina: 46, resumo: "Teste de navegação DT 20; falhando, um retorno curto.",
        testes: [T("navegacao", 20, { papel: "navegador", falha: [MAIS(1)] })] },
      { de: 7, ate: 9, chave: "patetadaNavegador", nome: "Patetada do navegador", pagina: 46, resumo: "Teste de navegação DT 30; falhando, um retorno longo.",
        testes: [T("navegacao", 30, { papel: "navegador", falha: [MAIS(2)] })] },
      { de: 10, ate: 12, chave: "descuidoMotorista", nome: "Descuido do motorista", pagina: 46, resumo: "Pilotagem DT 20; falhando, acidente.",
        testes: [T("pilotagem", 20, { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 13, ate: 15, chave: "patetadaMotorista", nome: "Patetada do motorista", pagina: 46, resumo: "Pilotagem DT 30; falhando, acidente.",
        testes: [T("pilotagem", 30, { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 16, ate: 16, chave: "motoqueirosImprudentes", nome: "Motoqueiros imprudentes", pagina: 47, resumo: "Pilotagem DT 25 para evitá-los; falhando, acidente.",
        testes: [T("pilotagem", 25, { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 17, ate: 17, chave: "motoclube", nome: "Motoclube truculento", pagina: 47, resumo: "Ceder a passagem ou responder às provocações.",
        opcoes: [
          { chave: "ceder", rotulo: "Ceder a passagem", sempre: [C("condicao", { alvo: "ocupantes", texto: "frustrados até dormirem" })] },
          { chave: "enfrentar", rotulo: "Enfrentar", nota: AJUDA, teste: T("pilotagem", 30, { papel: "motorista", ajuda: true, falha: [ACIDENTE], sucesso: [C("nota", { texto: "Os encrenqueiros são postos para correr." })] }) },
        ] },
      { de: 18, ate: 18, chave: "motoristaImprudente", nome: "Motorista imprudente ou muito devagar", pagina: 47, resumo: "Afastar-se (custa tempo) ou ultrapassar.",
        opcoes: [
          { chave: "afastar", rotulo: "Afastar-se", sempre: [MAIS(1)] },
          { chave: "ultrapassar", rotulo: "Ultrapassar", teste: T("pilotagem", 20, { papel: "motorista", falha: [ACIDENTE] }) },
        ] },
      { de: 19, ate: 19, chave: "motoristaIntoxicado", nome: "Motorista intoxicado", pagina: 47, resumo: "Pilotagem DT 25; falhando, acidente.",
        testes: [T("pilotagem", 25, { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 20, ate: 20, chave: "bandidos", nome: "Bandidos na pista", pagina: 47, resumo: "Ceder ao assalto ou enfrentar.",
        opcoes: [
          { chave: "ceder", rotulo: "Ceder ao assalto", sempre: [C("condicao", { alvo: "ocupantes", texto: "esmorecidos até dormirem" })] },
          { chave: "enfrentar", rotulo: "Enfrentar", nota: AJUDA, teste: T("pilotagem", 30, { papel: "motorista", ajuda: true, falha: [ACIDENTE], sucesso: [C("nota", { texto: "Os bandidos fogem." })] }) },
        ] },
    ],
    veiculo: [
      { de: 1, ate: 3, chave: "pneuFurado", nome: "Pneu furado", pagina: 48, resumo: "Padrão: parar e trocar pelo estepe. Imprudente: Pilotagem DT 20 antes, falhando é acidente. Sem estepe, –3d20 em Pilotagem (remendo, Profissão DT 20: –2d20).",
        testes: [T("pilotagem", 20, { papel: "motorista", soImprudente: true, falha: [ACIDENTE] })],
        opcoes: [
          { chave: "estepe", rotulo: "Trocar pelo estepe", precisa: "estepe", sempre: [C("reserva", { item: "estepe", delta: -1 })] },
          { chave: "semEstepe", rotulo: "Seguir sem estepe", sempre: [C("penalidade", { chave: "semEstepe", dados: -3, texto: "–3d20 para pilotar (sem estepe)" })],
            teste: T("profissao", 20, { papel: "qualquer", rotuloTeste: "Remendo (Profissão justificável)", sucesso: [C("penalidade", { chave: "semEstepe", dados: -2, texto: "–2d20 para pilotar (pneu remendado)" })] }) },
        ] },
      { de: 4, ate: 6, chave: "falhaLeve", nome: "Falha mecânica leve (motor)", pagina: 48, resumo: "Profissão justificável DT 20 conserta; falhando, guincho ou mecânico.",
        testes: [T("profissao", 20, { papel: "qualquer", falha: [MAIS(2)] })] },
      { de: 7, ate: 9, chave: "falhaGrave", nome: "Falha mecânica grave (motor)", pagina: 48, resumo: "Só oficina: recomeçar a viagem a partir dela, ou seguir num veículo reserva.",
        sempre: [C("veiculo", { estado: "oficina", texto: "Oficina: recomeçar a viagem a partir dela (ou veículo reserva)." })] },
      { de: 10, ate: 12, chave: "cambio", nome: "Falha mecânica (câmbio e transmissão)", pagina: 48, resumo: "Profissão justificável DT 20 conserta; falhando, guincho ou mecânico. Carro elétrico é imune.",
        imune: { eletrico: true }, testes: [T("profissao", 20, { papel: "qualquer", falha: [MAIS(2)] })] },
      { de: 13, ate: 15, chave: "freio", nome: "Falha mecânica (freio)", pagina: 49, resumo: "Pilotagem DT 25 (30 imprudente) para parar; falhando, acidente. Depois, assistência ou seguir sem freio (–3d20; remendo, Profissão DT 20: –2d20). Carro elétrico é imune, como a fonte diz.",
        imune: { eletrico: true },
        testes: [T("pilotagem", [25, 30], { papel: "motorista", falha: [C("acidente", { semFreio: true })] })],
        opcoes: [
          { chave: "assistencia", rotulo: "Chamar assistência", sempre: [MAIS(2)] },
          { chave: "semFreio", rotulo: "Seguir sem freio", sempre: [C("penalidade", { chave: "semFreio", dados: -3, texto: "–3d20 para pilotar (sem freio)" })],
            teste: T("profissao", 20, { papel: "qualquer", rotuloTeste: "Remendo (Profissão justificável)", sucesso: [C("penalidade", { chave: "semFreio", dados: -2, texto: "–2d20 para pilotar (freio remendado)" })] }) },
        ] },
      { de: 16, ate: 16, chave: "falhaEletrica", nome: "Falha elétrica", pagina: 49, resumo: "O veículo desliga. Imprudente: Pilotagem DT 25, falhando é acidente. Depois, guincho ou mecânico. Painéis Solares Avançados evitam.",
        imune: { paineis: true },
        testes: [T("pilotagem", 25, { papel: "motorista", soImprudente: true, falha: [ACIDENTE] })],
        sempre: [MAIS(2)] },
      { de: 17, ate: 17, chave: "falhaEletronica", nome: "Falha eletrônica", pagina: 49, resumo: "Carro elétrico: Pilotagem DT 25 (30 imprudente) para parar e depois oficina. Os demais perdem GPS e aparelhos, mas seguem. Carro velho e Painéis Solares Avançados são imunes.",
        imune: { velho: true, paineis: true },
        seEletrico: { testes: [T("pilotagem", [25, 30], { papel: "motorista", falha: [ACIDENTE] })], sempre: [C("veiculo", { estado: "oficina", texto: "Guincho e oficina: recomeçar a viagem a partir dela." })] },
        sempre: [C("semEletronica")] },
      { de: 18, ate: 18, chave: "incendio", nome: "Tá pegando fogo, bicho!", pagina: 49, resumo: "Parar e apagar com o extintor (ou outro método). Apagado, ainda é oficina; sem controle, o veículo é consumido. Carros velhos e motos não têm extintor de série.",
        opcoes: [
          { chave: "extintor", rotulo: "Apagar com o extintor", precisa: "extintor", sempre: [C("reserva", { item: "extintor", delta: -1 }), C("veiculo", { estado: "oficina", texto: "Fogo apagado: guincho e oficina, recomeçar a viagem a partir dela." })] },
          { chave: "outro", rotulo: "Outro método (decisão da mesa)", sempre: [C("veiculo", { estado: "oficina", texto: "Fogo apagado: guincho e oficina, recomeçar a viagem a partir dela." })] },
          { chave: "perdido", rotulo: "Não deu para apagar", sempre: [C("veiculo", { estado: "consumido", texto: "O veículo é consumido pelas chamas." })] },
        ] },
      { de: 19, ate: 19, chave: "vazamento", nome: "Vazamento de gasolina", pagina: 49, resumo: "A autonomia cai pela metade até um conserto em oficina.",
        sempre: [C("vazamento")] },
      { de: 20, ate: 20, chave: "colapso", nome: "Colapso geral", pagina: 49, resumo: "O carro desliga. Imprudente: Pilotagem DT 30, falhando é acidente. Basta religar — menos no carro velho, que só volta com conserto total.",
        testes: [T("pilotagem", 30, { papel: "motorista", soImprudente: true, falha: [ACIDENTE] })],
        seVelho: { sempre: [C("veiculo", { estado: "perdaTotal", texto: "Fim da lata velha: só um conserto total traz o carro de volta." })] } },
    ],
    obstaculo: [
      { de: 1, ate: 3, chave: "esburacada", nome: "Pista esburacada", pagina: 50, resumo: "Só na imprudente: Pilotagem DT 25; falhando, acidente.",
        testes: [T("pilotagem", 25, { papel: "motorista", soImprudente: true, falha: [ACIDENTE] })] },
      { de: 4, ate: 6, chave: "pedagio", nome: "Pedágio com fila", pagina: 50, resumo: "Esperar (custa tempo) ou evadir (problemas com a lei, decisão da mesa).",
        opcoes: [
          { chave: "esperar", rotulo: "Esperar a vez", sempre: [MAIS(1)] },
          { chave: "evadir", rotulo: "Furar ou desviar", sempre: [C("nota", { texto: "Desavenças com a lei: resolução da mesa." })] },
        ] },
      { de: 7, ate: 9, chave: "engarrafamento", nome: "Engarrafamento", pagina: 50, resumo: "Esperar (custa tempo) ou ir pelo acostamento (Pilotagem DT 20/25; falhando, acidente; a lei pode cobrar).",
        opcoes: [
          { chave: "esperar", rotulo: "Esperar", sempre: [MAIS(1)] },
          { chave: "acostamento", rotulo: "Pelo acostamento", sempre: [C("nota", { texto: "Desavenças com a lei: resolução da mesa." })], teste: T("pilotagem", [20, 25], { papel: "motorista", falha: [ACIDENTE] }) },
        ] },
      { de: 10, ate: 12, chave: "bloqueioNatural", nome: "Fechamento da pista (obstáculo natural)", pagina: 50, resumo: "Duas etapas a mais; contornar é teste estendido aberto em grupo (DT 30, 3 sucessos), e vencer reduz para uma.",
        opcoes: [
          { chave: "aceitar", rotulo: "Aguardar o desvio", sempre: [MAIS(2)] },
          { chave: "contornar", rotulo: "Contornar (teste estendido em grupo)", estendido: { dt: 30, sucessos: 3, falhas: 3, vitoria: [MAIS(1)], derrota: [MAIS(2)] } },
        ] },
      { de: 13, ate: 15, chave: "bloqueioHumano", nome: "Fechamento da pista (intervenção humana)", pagina: 50, resumo: "Duas etapas a mais; contornar é teste estendido aberto em grupo (DT 30, 3 sucessos), e vencer reduz para uma.",
        opcoes: [
          { chave: "aceitar", rotulo: "Aguardar o desvio", sempre: [MAIS(2)] },
          { chave: "contornar", rotulo: "Contornar (teste estendido em grupo)", estendido: { dt: 30, sucessos: 3, falhas: 3, vitoria: [MAIS(1)], derrota: [MAIS(2)] } },
        ] },
      { de: 16, ate: 16, chave: "trajetoBloqueado", nome: "Trajeto bloqueado", pagina: 51, resumo: "Duas etapas a mais; contornar é teste estendido aberto em grupo (DT 30, 3 sucessos), e vencer reduz para uma.",
        opcoes: [
          { chave: "aceitar", rotulo: "Outro trajeto", sempre: [MAIS(2)] },
          { chave: "contornar", rotulo: "Solução criativa (teste estendido em grupo)", estendido: { dt: 30, sucessos: 3, falhas: 3, vitoria: [MAIS(1)], derrota: [MAIS(2)] } },
        ] },
      { de: 17, ate: 17, chave: "derramamento", nome: "Derramamento na pista", pagina: 51, resumo: "Pilotagem DT 25 (30 imprudente); falhando, acidente.",
        testes: [T("pilotagem", [25, 30], { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 18, ate: 18, chave: "barreiraDesonesta", nome: "Barreira: agentes da lei (desonestos)", pagina: 51, resumo: "Pagar (sem desconto nas finanças, mas frustrados até dormirem) ou resistir.",
        opcoes: [
          { chave: "pagar", rotulo: "Pagar o suborno", sempre: [C("condicao", { alvo: "ocupantes", texto: "frustrados até dormirem" })] },
          { chave: "resistir", rotulo: "Resistir ou passar reto (teste estendido em grupo)", estendido: { dt: 30, sucessos: 3, falhas: 3, vitoria: [MAIS(1)], derrota: [C("nota", { texto: "Apreensão ou horas perdidas: desfecho da mesa." })] } },
        ] },
      { de: 19, ate: 19, chave: "barreiraHonesta", nome: "Barreira: agentes da lei (honestos)", pagina: 51, resumo: "Sem irregularidade, só tempo; com irregularidade ou fuga, a lei cobra (resolução da mesa).",
        opcoes: [
          { chave: "parar", rotulo: "Parar na barreira", sempre: [MAIS(1)] },
          { chave: "irregular", rotulo: "Irregularidade ou fuga", sempre: [C("nota", { texto: "Prestar contas com a lei: resolução da mesa." })] },
        ] },
      { de: 20, ate: 20, chave: "barreiraFalsa", nome: "Barreira: agentes da lei (falsos)", pagina: 51, resumo: "Intuição em grupo DT 30 (um testa, os demais ajudam). Falhando, é a barreira desonesta. Percebendo, teste estendido aberto em grupo (DT 30, 3 sucessos), e vencer custa uma etapa.",
        testes: [T("intuicao", 30, { papel: "qualquer", ajuda: true, falha: [C("nota", { texto: "Tratar como “Barreira: agentes da lei (desonestos)”: pagar ou resistir." })],
          sucesso: [C("estendido", { dt: 30, sucessos: 3, falhas: 3, vitoria: [MAIS(1)], derrota: [C("nota", { texto: "Desfecho da mesa." })] })] })] },
    ],
    ambiental: [
      { de: 1, ate: 5, chave: "temperatura", nome: "Temperatura extrema", pagina: 52, resumo: "Sem ar-condicionado, cada ocupante perde 1d6 PE (Fortitude DT 20 reduz à metade).",
        semAr: [C("perda", { alvo: "ocupantes", partes: [{ recurso: "pe", dado: "1d6" }], resistencia: { pericia: "fortitude", dt: 20, texto: "reduz à metade" } })] },
      { de: 6, ate: 9, chave: "ventania", nome: "Ventania", pagina: 52, resumo: "O motorista perde 1d4 PE.",
        sempre: [C("perda", { alvo: "motorista", partes: [{ recurso: "pe", dado: "1d4" }] })] },
      { de: 10, ate: 13, chave: "visibilidade", nome: "Visibilidade ruim", pagina: 52, resumo: "Pilotagem DT 20 (25 imprudente); falhando, acidente.",
        testes: [T("pilotagem", [20, 25], { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 14, ate: 16, chave: "granizo", nome: "Granizo", pagina: 52, resumo: "Pilotagem DT 20 (25 imprudente); falhando, acidente. (A repetição do texto na fonte é uma resolução só.)",
        testes: [T("pilotagem", [20, 25], { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 17, ate: 19, chave: "chuvaForte", nome: "Chuva forte", pagina: 52, resumo: "Pilotagem DT 25 (30 imprudente); falhando, acidente.",
        testes: [T("pilotagem", [25, 30], { papel: "motorista", falha: [ACIDENTE] })] },
      { de: 20, ate: 20, chave: "tempestade", nome: "Tempestade", pagina: 52, resumo: "Pilotagem DT 30 (35 imprudente); falhando, acidente.",
        testes: [T("pilotagem", [30, 35], { papel: "motorista", falha: [ACIDENTE] })] },
    ],
    paranormal: [
      { de: 1, ate: 2, chave: "medo", nome: "Presença de Medo", pagina: 53, resumo: "Cada agente perde 2d6 PV e 4d6 PE e fica pasmo e apavorado por 2d4 horas (Vontade DT 30 reduz à metade e evita as condições). Uma etapa a mais. Acidente possível conforme quem ficar pasmo; o mestre pode trocar por combate contra criatura de Medo.",
        sempre: [C("perda", { alvo: "agentes", partes: [{ recurso: "pv", dado: "2d6" }, { recurso: "pe", dado: "4d6" }], condicao: "pasmo e apavorado", duracao: "2d4 horas", resistencia: { pericia: "vontade", dt: 30, texto: "reduz à metade e evita as condições" } }),
          MAIS(1), C("acidentePossivel", { condicao: "pasmos" }), C("combate", { elemento: "Medo" })] },
      { de: 3, ate: 4, chave: "sangue", nome: "Presença de Sangue", pagina: 53, resumo: "Cada agente perde 2d6 PV e fica sangrando e furioso por 1d4 rodadas (Fortitude DT 30 reduz à metade e evita condição e fúria). Furioso, gasta as ações para matar cada ser em alcance extremo. Acidente possível; ou combate contra criatura de Sangue.",
        sempre: [C("perda", { alvo: "agentes", partes: [{ recurso: "pv", dado: "2d6" }], condicao: "sangrando e furioso", duracao: "1d4 rodadas", resistencia: { pericia: "fortitude", dt: 30, texto: "reduz à metade e evita condição e fúria" } }),
          C("acidentePossivel", { condicao: "furiosos" }), C("combate", { elemento: "Sangue" })] },
      { de: 5, ate: 6, chave: "morte", nome: "Presença de Morte", pagina: 53, resumo: "Cada agente perde 2d6 PV e envelhece 1d4 anos (Fortitude DT 30 reduz à metade e evita o envelhecimento). Duas etapas a mais; ou combate contra criatura de Morte.",
        sempre: [C("perda", { alvo: "agentes", partes: [{ recurso: "pv", dado: "2d6" }], extra: { rotulo: "anos de envelhecimento", dado: "1d4" }, resistencia: { pericia: "fortitude", dt: 30, texto: "reduz à metade e evita o envelhecimento" } }),
          MAIS(2), C("combate", { elemento: "Morte" })] },
      { de: 7, ate: 8, chave: "conhecimento", nome: "Presença de Conhecimento", pagina: 53, resumo: "Cada agente perde 2d6 PE e fica cego por 2d4 horas (Vontade DT 30 reduz à metade e troca a cegueira por –5 em testes que envolvem visão). Um personagem aleatório revela o maior segredo. Acidente possível; ou combate contra criatura de Conhecimento.",
        sempre: [C("perda", { alvo: "agentes", partes: [{ recurso: "pe", dado: "2d6" }], condicao: "cego", duracao: "2d4 horas", resistencia: { pericia: "vontade", dt: 30, texto: "reduz à metade e troca a cegueira por –5 em testes que envolvem visão" } }),
          C("segredo"), C("acidentePossivel", { condicao: "cegos" }), C("combate", { elemento: "Conhecimento" })] },
      { de: 9, ate: 10, chave: "energia", nome: "Presença de Energia", pagina: 53, resumo: "Cada agente perde 2d6 PV e 2d6 PE e fica confuso por 1d4 rodadas (Reflexos DT 30 reduz à metade e evita a condição). Acidente possível; ou combate contra criatura de Energia.",
        sempre: [C("perda", { alvo: "agentes", partes: [{ recurso: "pv", dado: "2d6" }, { recurso: "pe", dado: "2d6" }], condicao: "confuso", duracao: "1d4 rodadas", resistencia: { pericia: "reflexos", dt: 30, texto: "reduz à metade e evita a condição" } }),
          C("acidentePossivel", { condicao: "confusos" }), C("combate", { elemento: "Energia" })] },
      { de: 11, ate: 20, chave: "pressagio", nome: "Presságio ruim", pagina: 53, resumo: "Os ocupantes ficam abalados até o fim da viagem. Na reincidência, apavorados (Vontade DT 30 evita) — e acidente possível conforme quem ficar apavorado.",
        sempre: [C("pressagio")] },
    ],
  };
  Object.keys(SUBTABELAS).forEach(function (k) { SUBTABELAS[k].forEach(function (e) { e.tabela = k; }); });

  function eventoDaTabela(tabela, d20) {
    var n = inteiro(d20, 1, 20, 1);
    var t = SUBTABELAS[tabela] || [];
    for (var i = 0; i < t.length; i++) if (n >= t[i].de && n <= t[i].ate) return t[i];
    return null;
  }
  function eventoPorChave(chave) {
    var achado = null;
    Object.keys(SUBTABELAS).forEach(function (k) { SUBTABELAS[k].forEach(function (e) { if (e.chave === chave) achado = e; }); });
    return achado;
  }

  /* =================================================================
     ACIDENTES (p. 54–55)
     ================================================================= */

  var OUTROS_ENVOLVIDOS = [
    [1, 1, "animalPequeno", "Animal pequeno", 0], [2, 2, "animalMedio", "Animal médio", 1], [3, 3, "animalGrande", "Animal grande", 2],
    [4, 4, "pedestre", "Pedestre", 0], [5, 14, "motoPopular", "Moto popular", 1], [15, 21, "motoEstrada", "Moto de estrada", 1],
    [22, 31, "carroVelho", "Carro velho", 2], [32, 71, "carroPopular", "Carro popular", 2], [72, 72, "carroEletrico", "Carro elétrico", 2],
    [73, 75, "carroEsportivo", "Carro esportivo", 2], [76, 77, "van", "Van", 3], [78, 83, "caminhonete", "Caminhonete", 3],
    [84, 85, "jipe", "Jipe", 3], [86, 86, "microOnibus", "Micro-ônibus", 4], [87, 87, "motorhome", "Motorhome", 5],
    [88, 92, "caminhao", "Caminhão", 6], [93, 93, "onibusPassageiros", "Ônibus de passageiros", 6], [94, 98, "carreta", "Carreta", 7],
    [99, 99, "cavalo", "Cavalo com ginete", 1], [100, 100, "bicicleta", "Bicicleta", 0],
  ];
  function outroEnvolvido(d100) {
    var n = inteiro(d100, 1, 100, 1);
    for (var i = 0; i < OUTROS_ENVOLVIDOS.length; i++) {
      var x = OUTROS_ENVOLVIDOS[i];
      if (n >= x[0] && n <= x[1]) return { chave: x[2], nome: x[3], proporcoes: x[4], d100: n };
    }
    return null;
  }
  function outroPorChave(chave) {
    for (var i = 0; i < OUTROS_ENVOLVIDOS.length; i++) if (OUTROS_ENVOLVIDOS[i][2] === chave) return { chave: chave, nome: OUTROS_ENVOLVIDOS[i][3], proporcoes: OUTROS_ENVOLVIDOS[i][4] };
    return null;
  }

  /* A tabela impressa começa em 1; zero ou negativo também é colisão
     frontal (extensão do RAMA para o intervalo que a fonte não cobre). */
  var RESULTADOS_ACIDENTE = [
    { ate: 20, chave: "frontal", nome: "Colisão frontal", dano: 20, veiculo: "perdaTotal", texto: "Perda total: só com um longo e custoso conserto." },
    { ate: 25, chave: "lateral", nome: "Colisão lateral", dano: 10, veiculo: "oficina", texto: "Precisa de oficina mecânica." },
    { ate: 30, chave: "traseira", nome: "Colisão traseira", dano: 8, veiculo: "estrada", texto: "Conserto na estrada, com mecânico e guincho." },
    { ate: 35, chave: "capotagem", nome: "Saída de pista com capotagem", dano: 6, veiculo: "oficina", texto: "Precisa de oficina mecânica.", capotamento: true },
    { ate: 40, chave: "obstaculo", nome: "Saída de pista com obstáculo", dano: 4, veiculo: "oficina", texto: "Precisa de oficina mecânica." },
    { ate: 99999, chave: "livre", nome: "Saída de pista livre", dano: 0, veiculo: "", texto: "O motorista evitou o acidente no último segundo!" },
  ];
  function resultadoDoAcidente(total) {
    var t = Math.round(Number(total) || 0);
    for (var i = 0; i < RESULTADOS_ACIDENTE.length; i++) if (t <= RESULTADOS_ACIDENTE[i].ate) return RESULTADOS_ACIDENTE[i];
    return RESULTADOS_ACIDENTE[RESULTADOS_ACIDENTE.length - 1];
  }

  /* A composição do novo teste de Pilotagem (p. 54): o total rolado na
     ficha do motorista + os modificadores, cada um com a origem. */
  function composicaoDoAcidente(pilotagem, causa, proporcoesProprias, outro, regalias) {
    var c = obj(causa);
    var partes = [{ rotulo: "Pilotagem do motorista", valor: Math.round(Number(pilotagem) || 0) }];
    if (c.imprudente) partes.push({ rotulo: "Velocidade imprudente", valor: -5 });
    if (c.intoxicado) partes.push({ rotulo: "Motorista intoxicado", valor: -1 });
    if (c.semFreio) partes.push({ rotulo: "Sem freio", valor: -2 });
    if (c.paranormal) partes.push({ rotulo: "Acidente de origem paranormal", valor: -2 });
    if (outro) {
      var dif = (Number(proporcoesProprias) || 0) - (Number(outro.proporcoes) || 0);
      if (dif) partes.push({ rotulo: "Proporções (" + proporcoesProprias + " − " + outro.proporcoes + ", " + outro.nome + ")", valor: dif });
    }
    lista(regalias).forEach(function (k) {
      var d = REGALIAS_NA_VIAGEM[k];
      if (d && d.pilotagem) partes.push({ rotulo: d.nome + (k === "aprimoramentosDeVelocidade" ? " (em viagens)" : ""), valor: d.pilotagem });
    });
    var total = partes.reduce(function (s, p) { return s + p.valor; }, 0);
    return { partes: partes, total: total, resultado: resultadoDoAcidente(total) };
  }

  /* =================================================================
     CARCAÇAS VERMELHAS (p. 60–91)
     ================================================================= */

  var MISSAO = {
    nome: "Carcaças Vermelhas", paginas: "60–91",
    orientacao: "Missão para quatro agentes de NEX 20% (operadores), com 20 pontos de prestígio. Usa as regras de Mestrando nas Estradas (p. 34) com os encontros já fixados; funciona melhor só com o livro básico (p. 62).",
    perseguicaoInicial: 6,
    roteiro: { padrao: [1, 2, 3, 4, 5, 6, 7], imprudente: [1, 2, 3, 4, 7] },
  };

  var CENAS = [
    { n: 1, nome: "Cena 1 · A largada", paginas: "67–68", decisoes: [
      { chave: "padrao", rotulo: "Saíram na velocidade padrão", perseguicao: -1 },
      { chave: "imprudente", rotulo: "Saíram na velocidade imprudente", perseguicao: 1, caca: 1 },
    ] },
    { n: 2, nome: "Cena 2 · Caranchos do Asfalto e Nicole", paginas: "69–75", decisoes: [
      { chave: "ignorar", rotulo: "Ignoraram o encontro", perseguicao: 1, caca: 1 },
      { chave: "parar", rotulo: "Pararam", perseguicao: -1 },
      { chave: "infoIrmaos", rotulo: "Informações de Bruna e Rômulo", perseguicao: 1, caca: 2 },
      { chave: "infoNicole", rotulo: "Informações de Nicole", perseguicao: 1, caca: 2 },
      { chave: "pessoaQuerida", rotulo: "Confirmaram a pessoa querida entre os reféns", caca: 1 },
      { chave: "nicoleSegura", rotulo: "Deixaram Nicole em segurança", caca: 1 },
      { chave: "tresAliados", rotulo: "Levaram os três aliados na perseguição", perseguicao: 1 },
    ] },
    { n: 3, nome: "Cena 3 · Posto Sonnenblume e a tempestade", paginas: "75–78", decisoes: [
      { chave: "interludio", rotulo: "Interlúdio no posto (padrão)", perseguicao: -1, condicao: "fracos e frustrados até dormir, alimentar-se ou relaxar" },
      { chave: "imprudente", rotulo: "Imprudente: passaram pelo posto", perseguicao: 1, condicao: "fracos e frustrados até o fim da missão" },
      { chave: "semAcidenteComEstepe", rotulo: "Chuva forte (DT 30) e pneu (DT 20): sem acidente, com estepe", perseguicao: 1, caca: 1 },
      { chave: "semAcidenteSemEstepe", rotulo: "Sem acidente e sem estepe", perseguicao: -1, caca: 1 },
      { chave: "acidente", rotulo: "Houve acidente", perseguicao: -1, acidente: true },
    ] },
    { n: 4, nome: "Cena 4 · A viatura e Fredy", paginas: "79–82", decisoes: [
      { chave: "ignorar", rotulo: "Ignoraram a fumaça", perseguicao: 1, caca: 1, nota: "Seguir para a Cena 5 (padrão) ou a Cena 7 (imprudente) — interpretação do RAMA: a volta à Cena 3 indicada na p. 79 contradiz o itinerário e a conclusão da p. 82." },
      { chave: "parar", rotulo: "Pararam", perseguicao: -1 },
      { chave: "infoFredy", rotulo: "Informações de Fredy", perseguicao: 1, caca: 2 },
      { chave: "resgate", rotulo: "Priorizaram o resgate (com atraso)", perseguicao: -1, caca: 1 },
      { chave: "perseguicao", rotulo: "Priorizaram a perseguição", perseguicao: 1 },
    ] },
    { n: 5, nome: "Cena 5 · A barreira", paginas: "83", decisoes: [
      { chave: "parar", rotulo: "Pararam regularmente", perseguicao: -1 },
    ], estendido: { chave: "barreira", rotulo: "Enfrentar a barreira", dt: 30, sucessos: 3, falhas: 3, derrotaPerseguicao: -1, porFalha: "tiros" } },
    { n: 6, nome: "Cena 6 · O caminhoneiro desgovernado", paginas: "84–85", decisoes: [
      { chave: "civis", rotulo: "Priorizaram os civis", perseguicao: -1, caca: 1 },
      { chave: "perseguicao", rotulo: "Priorizaram a perseguição", perseguicao: 1 },
      { chave: "continuar", rotulo: "Depois do acidente, continuaram", perseguicao: -1 },
    ], estendido: { chave: "desastre", rotulo: "Evitar o desastre (inclui a Pilotagem do motorista)", dt: 30, sucessos: 5, falhas: 3, porFalha: "impacto", derrotaAcidente: "caminhao" } },
    { n: 7, nome: "Cena 7 · O confronto final", paginas: "86–91", decisoes: [] },
  ];
  var POR_CENA = {};
  CENAS.forEach(function (c) { POR_CENA[c.n] = c; });

  var CARDAPIO = [
    { chave: "apfelstrudel", nome: "Apfelstrudel", efeito: "+1d4 nos testes de resistência até o fim da missão", dado: "", recurso: "", pagina: 77 },
    { chave: "biscoito", nome: "Biscoito amanteigado", efeito: "1d4 PE temporários", dado: "1d4", recurso: "pe", pagina: 77 },
    { chave: "cuca", nome: "Cuca", efeito: "2d4 PV temporários", dado: "2d4", recurso: "pv", pagina: 77 },
    { chave: "tortaMartaRocha", nome: "Torta Marta Rocha", efeito: "1d4 SAN temporários", dado: "1d4", recurso: "san", pagina: 77 },
  ];
  var POR_CARDAPIO = porChave(CARDAPIO);

  var REMISSOES = [
    { quem: "Carcaças Vermelhas (membros)", pagina: 93, como: "Transtornado assecla (Arquivos Secretos 1, p. 28) ou cultista investido (Ordem Paranormal RPG, p. 286), com rituais de Sangue." },
    { quem: "Emanuel Schneider", pagina: 94, como: "Transtornado investido (Arquivos Secretos 1, p. 29) ou líder de culto (Ordem Paranormal RPG, p. 286), com rituais de Sangue." },
    { quem: "Valentina Schneider", pagina: 98, como: "Transtornado investido (Arquivos Secretos 1, p. 29) ou líder de culto (Ordem Paranormal RPG, p. 286), com rituais de Sangue." },
    { quem: "Bruna e Rômulo Machado", pagina: 92, como: "Policial de elite (Ordem Paranormal RPG, p. 287), com soqueira e revólver (Bruna) ou faca e revólver (Rômulo). Como aliados: perfis na biblioteca de Ordem." },
    { quem: "Nicole Oliva da Silva", pagina: 96, como: "Civil; como aliada, perfil na biblioteca de Ordem." },
    { quem: "Fredy e Letícia", pagina: 95, como: "Sem ficha numérica no pacote." },
  ];

  /* Reféns (p. 89): 14 vivos ao preparar (Nicole já foi resgatada); o
     contador decide as mortes anteriores e o dado da pessoa querida. */
  var REFENS_TOTAL = 14;
  function refensPeloContador(c) {
    var n = inteiro(c, 1, 10, 6);
    if (n === 1) return { mortos: 10, vivos: 4, dado: 4 };
    if (n <= 3) return { mortos: 8, vivos: 6, dado: 6 };
    if (n <= 5) return { mortos: 6, vivos: 8, dado: 8 };
    if (n <= 7) return { mortos: 4, vivos: 10, dado: 10 };
    if (n <= 9) return { mortos: 2, vivos: 12, dado: 12 };
    return { mortos: 0, vivos: 14, dado: 0 };
  }

  /* Falha de passageiro no confronto final (p. 87). */
  var FALHAS_DO_PASSAGEIRO = [
    { de: 1, ate: 4, nome: "Ritual ou poder paranormal", partes: [{ dado: "6d8", tipo: "Sangue" }], resistencia: { pericia: "fortitude", dt: 25, texto: "reduz à metade" } },
    { de: 5, ate: 8, nome: "Taco com pregos ou pregador pneumático", partes: [{ dado: "3d6", tipo: "perfuração" }, { dado: "3d6", tipo: "Sangue" }], resistencia: { pericia: "reflexos", dt: 25, texto: "reduz à metade" } },
    { de: 9, ate: 12, nome: "Corrente farpada ou serra", partes: [{ dado: "3d4", tipo: "corte" }, { dado: "3d4", tipo: "Sangue" }], resistencia: { pericia: "reflexos", dt: 25, texto: "reduz à metade" } },
  ];
  function falhaDoPassageiro(d12) {
    var n = inteiro(d12, 1, 12, 1);
    for (var i = 0; i < FALHAS_DO_PASSAGEIRO.length; i++) if (n >= FALHAS_DO_PASSAGEIRO[i].de && n <= FALHAS_DO_PASSAGEIRO[i].ate) return FALHAS_DO_PASSAGEIRO[i];
    return FALHAS_DO_PASSAGEIRO[0];
  }

  var CONFRONTO = { dtPassageiro: 35, dtMotorista: 25, reducaoPorSucesso: 5, sucessos: 7, falhas: 3, carroceriaFechada: 5 };

  /* =================================================================
     ESTADO
     ================================================================= */

  function estadoVazio() {
    return { v: 1, ativo: false, viagens: [], atual: "", historico: [] };
  }

  function normalizarVeiculoDeViagem(b) {
    var x = obj(b);
    var id = idOk(x.id);
    var modelo = POR_VEICULO[x.modelo] ? x.modelo : "";
    if (!id || !modelo) return null;
    var m = POR_VEICULO[modelo];
    var equip = [];
    lista(x.equipamentos).forEach(function (k) {
      var d = REGALIAS_NA_VIAGEM[k];
      if (!d || CHAVES_AS11.indexOf(k) < 0) return;
      if (d.soMoto && m.tipo !== "moto") return;
      if (equip.filter(function (q) { return q === k; }).length >= (d.maximo || 1)) return;
      equip.push(k);
    });
    var res = obj(x.reservas);
    var vin = x.vinculo && typeof x.vinculo === "object" ? { personagemId: idOk(x.vinculo.personagemId), veiculoId: idOk(x.vinculo.veiculoId) } : null;
    if (vin && (!vin.personagemId || !vin.veiculoId)) vin = null;
    var auto = autonomiaMaximaDe({ modelo: modelo, equipamentos: equip, vazamento: x.vazamento === true }, null);
    return {
      id: id, modelo: modelo, nome: texto(x.nome, 80) || m.nome,
      equipamentos: equip,
      reservas: {
        estepe: inteiro(res.estepe, 0, contar(equip, "estepe"), contar(equip, "estepe")),
        extintor: inteiro(res.extintor, 0, contar(equip, "extintor"), contar(equip, "extintor")),
      },
      vinculo: vin,
      combustivelModo: vin && x.combustivelModo === "dados" ? "dados" : "itinerario",
      autonomiaRestante: x.autonomiaRestante === null || x.autonomiaRestante === undefined ? auto : inteiro(x.autonomiaRestante, 0, 99999, auto),
      vazamento: x.vazamento === true,
      semEletronica: x.semEletronica === true,
      sinal: x.sinal !== false,
      penalidades: lista(x.penalidades).map(function (p) {
        var q = obj(p);
        return ["semEstepe", "semFreio"].indexOf(q.chave) >= 0 ? { chave: q.chave, dados: inteiro(q.dados, -3, 0, -3), texto: texto(q.texto, 120) } : null;
      }).filter(Boolean).slice(0, 4),
      estado: ["ok", "oficina", "estrada", "perdaTotal", "consumido"].indexOf(x.estado) >= 0 ? x.estado : "ok",
      motorista: pessoa(x.motorista),
      navegador: pessoa(x.navegador),
      navegacao: NAVEGACAO[x.navegacao] ? x.navegacao : "visual",
      ocupantes: lista(x.ocupantes).map(pessoa).filter(function (p) { return p.personagemId || p.nome; }).slice(0, MAX_OCUPANTES),
      intoxicado: x.intoxicado === true,
      infracoes: inteiro(x.infracoes, 0, 9, 0),
    };
  }
  function contar(l, k) { return l.filter(function (q) { return q === k; }).length; }
  function pessoa(b) {
    var x = obj(b);
    return { personagemId: idOk(x.personagemId), nome: texto(x.nome, 80) };
  }

  /* Equipamento de série de um modelo novo (ver a nota em VEICULOS). */
  function equipamentoDeSerie(modelo) {
    var m = POR_VEICULO[modelo];
    if (!m || m.tipo !== "carro") return [];
    return m.velho ? ["estepe"] : ["estepe", "extintor"];
  }

  function autonomiaMaximaDe(v, regaliasDoVinculo) {
    var m = POR_VEICULO[v.modelo];
    if (!m) return 0;
    var base = m.porDia ? m.porDia : m.autonomia;
    var tem = function (k) { return lista(v.equipamentos).indexOf(k) >= 0 || lista(regaliasDoVinculo).indexOf(k) >= 0; };
    if (m.eletrico && tem("paineisSolares")) base *= 2;
    if (v.vazamento) base = Math.floor(base / 2);
    return base;
  }

  function normalizarEtapa(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id || ["partida", "encontro", "fixo", "parada", "chegada", "cena"].indexOf(x.tipo) < 0) return null;
    return {
      id: id, tipo: x.tipo, periodo: texto(x.periodo, 20), rotulo: texto(x.rotulo, 80),
      nota: texto(x.nota, 600), revelada: x.revelada === true, feita: x.feita === true,
      origem: texto(x.origem, 120), cena: inteiro(x.cena, 0, 7, 0), desfeita: x.desfeita === true,
    };
  }

  function normalizarTeste(b) {
    var x = obj(b);
    return {
      id: idOk(x.id) || idOk(x.chave), chave: texto(x.chave, 60), pericia: NOMES_PERICIA[x.pericia] ? x.pericia : "livre", dt: inteiro(x.dt, 0, 99, 20),
      papel: texto(x.papel, 20), rotulo: texto(x.rotulo, 120),
      total: x.total === null || x.total === undefined || x.total === "" ? null : inteiro(x.total, -99, 999, 0),
      sucesso: x.sucesso === true ? true : x.sucesso === false ? false : null, automatico: x.automatico === true,
      por: texto(x.por, 80),
    };
  }

  function normalizarConsequencia(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, tipo: texto(x.tipo, 30), texto: texto(x.texto, 300), dados: x.dados && typeof x.dados === "object" ? copia(x.dados) : {},
      estado: ["pendente", "aplicada", "descartada"].indexOf(x.estado) >= 0 ? x.estado : "pendente",
      aplicadaPor: texto(x.aplicadaPor, 40), registro: idOk(x.registro),
    };
  }

  function normalizarEstendido(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, rotulo: texto(x.rotulo, 120), dt: inteiro(x.dt, 0, 99, 30), sucessos: inteiro(x.sucessos, 1, 20, 3), falhas: inteiro(x.falhas, 1, 20, 3),
      feitos: inteiro(x.feitos, 0, 20, 0), errados: inteiro(x.errados, 0, 20, 0),
      testes: lista(x.testes).map(normalizarTeste).slice(-40),
      porFalha: ["", "tiros", "pe", "impacto"].indexOf(x.porFalha) >= 0 ? x.porFalha : "",
      vitoria: lista(x.vitoria).map(obj).slice(0, 6), derrota: lista(x.derrota).map(obj).slice(0, 6),
      fim: ["", "vitoria", "derrota"].indexOf(x.fim) >= 0 ? x.fim : "",
      origem: texto(x.origem, 80), encontroId: idOk(x.encontroId), cena: inteiro(x.cena, 0, 7, 0), desfeito: x.desfeito === true,
      derrotaPerseguicao: inteiro(x.derrotaPerseguicao, -3, 3, 0), derrotaAcidente: x.derrotaAcidente === "caminhao" ? "caminhao" : "",
    };
  }

  function normalizarEncontro(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, etapaId: idOk(x.etapaId), veiculoId: idOk(x.veiculoId), trechoId: idOk(x.trechoId),
      d100: inteiro(x.d100, 0, 100, 0), linha: texto(x.linha, 120),
      eventos: lista(x.eventos).map(function (e) {
        var q = obj(e);
        return {
          tabela: SUBTABELAS[q.tabela] ? q.tabela : (q.tabela === "acidente" ? "acidente" : ""), d20: inteiro(q.d20, 0, 20, 0), chave: texto(q.chave, 40),
          aplicavel: q.aplicavel !== false, motivo: texto(q.motivo, 200), decisao: texto(q.decisao, 40),
          testes: lista(q.testes).map(normalizarTeste).slice(0, 6),
          consequencias: lista(q.consequencias).map(normalizarConsequencia).filter(Boolean).slice(0, 16),
          estendidos: lista(q.estendidos).map(idOk).filter(Boolean).slice(0, 4),
          substituido: texto(q.substituido, 200),
        };
      }).slice(0, 2),
      efetivo: x.efetivo === true, fixo: x.fixo === true, segredo: x.segredo === true, desfeito: x.desfeito === true,
      rolado: carimbo(x.rolado), por: texto(x.por, 80),
    };
  }

  function normalizarAlvoDeRegistro(b) {
    var x = obj(b);
    return {
      personagemId: idOk(x.personagemId), nome: texto(x.nome, 80),
      partes: lista(x.partes).map(function (p) { var q = obj(p); return { recurso: texto(q.recurso, 10), tipo: texto(q.tipo, 30), dado: texto(q.dado, 12), valores: lista(q.valores).map(function (v) { return inteiro(v, 0, 99, 0); }).slice(0, 30), total: inteiro(q.total, 0, 9999, 0) }; }).slice(0, 4),
      extra: x.extra && typeof x.extra === "object" ? { rotulo: texto(x.extra.rotulo, 60), total: inteiro(x.extra.total, 0, 999, 0) } : null,
      duracao: x.duracao && typeof x.duracao === "object" ? { texto: texto(x.duracao.texto, 30), total: inteiro(x.duracao.total, 0, 999, 0) } : null,
      passou: x.passou === true ? true : x.passou === false ? false : null,
    };
  }

  function normalizarRegistroDeEfeito(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, tipo: ["perda", "dano"].indexOf(x.tipo) >= 0 ? x.tipo : "perda", origem: texto(x.origem, 160),
      alvos: lista(x.alvos).map(normalizarAlvoDeRegistro).slice(0, MAX_OCUPANTES),
      condicao: texto(x.condicao, 80), resistencia: x.resistencia && typeof x.resistencia === "object" ? { pericia: texto(x.resistencia.pericia, 20), dt: inteiro(x.resistencia.dt, 0, 99, 20), texto: texto(x.resistencia.texto, 160) } : null,
      em: carimbo(x.em), desfeito: x.desfeito === true,
    };
  }

  function normalizarAcidente(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    var outro = x.outro && typeof x.outro === "object" ? (outroPorChave(x.outro.chave) || null) : null;
    if (outro && x.outro.d100) outro.d100 = inteiro(x.outro.d100, 1, 100, 1);
    var causa = obj(x.causa);
    return {
      id: id, veiculoId: idOk(x.veiculoId), encontroId: idOk(x.encontroId), cena: inteiro(x.cena, 0, 7, 0),
      causa: { imprudente: causa.imprudente === true, intoxicado: causa.intoxicado === true, semFreio: causa.semFreio === true, paranormal: causa.paranormal === true },
      outro: outro, semOutro: x.semOutro === true,
      pilotagem: x.pilotagem === null || x.pilotagem === undefined ? null : inteiro(x.pilotagem, -99, 999, 0),
      total: x.total === null || x.total === undefined ? null : inteiro(x.total, -999, 999, 0),
      resultado: RESULTADOS_ACIDENTE.some(function (r) { return r.chave === x.resultado; }) ? x.resultado : "",
      registro: idOk(x.registro), aplicado: x.aplicado === true, desfeito: x.desfeito === true,
    };
  }

  function normalizarTrecho(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, n: inteiro(x.n, 1, 999, 1), dt: inteiro(x.dt, 10, 99, 10), veiculoId: idOk(x.veiculoId),
      motorista: normalizarTeste(x.motorista), navegador: normalizarTeste(x.navegador),
      falhou: x.falhou === true, encontroId: idOk(x.encontroId), km: inteiro(x.km, 0, 9999, 100), desfeito: x.desfeito === true,
    };
  }

  function normalizarCarcacas(b) {
    if (!b || typeof b !== "object") return null;
    var x = obj(b);
    var caca = {};
    Object.keys(obj(x.caca)).forEach(function (k) { if (idOk(k)) caca[k] = inteiro(x.caca[k], 0, 99, 0); });
    var decisoes = {};
    Object.keys(obj(x.decisoes)).forEach(function (k) { if (/^c[1-7]\.[A-Za-z]{1,40}$/.test(k) && idOk(x.decisoes[k])) decisoes[k] = x.decisoes[k]; });
    var son = {};
    Object.keys(obj(x.sonnenblume)).forEach(function (k) {
      var q = obj(x.sonnenblume[k]);
      if (idOk(k) && POR_CARDAPIO[q.item]) son[k] = { item: q.item, valor: inteiro(q.valor, 0, 99, 0), op: idOk(q.op) };
    });
    var ex = x.explosao && typeof x.explosao === "object" ? x.explosao : null;
    return {
      id: idOk(x.id) || "cv",
      iniciada: carimbo(x.iniciada), velocidade: x.velocidade === "imprudente" ? "imprudente" : "padrao",
      agentes: lista(x.agentes).map(idOk).filter(Boolean).filter(function (v, i, t) { return t.indexOf(v) === i; }).slice(0, MAX_AGENTES),
      perseguicao: inteiro(x.perseguicao, 1, 10, MISSAO.perseguicaoInicial),
      caca: caca, cena: inteiro(x.cena, 1, 7, 1), cenasVistas: lista(x.cenasVistas).map(function (n) { return inteiro(n, 1, 7, 1); }).filter(function (v, i, t) { return t.indexOf(v) === i; }),
      decisoes: decisoes, sonnenblume: son,
      explosao: ex ? {
        contador: inteiro(ex.contador, 0, 10, 10),
        acoes: lista(ex.acoes).map(function (a) { var q = obj(a); return { id: idOk(q.id) || idOk(q.op), quem: texto(q.quem, 80), tipo: ["padrao", "movimento", "completa"].indexOf(q.tipo) >= 0 ? q.tipo : "padrao", op: idOk(q.op) }; }).slice(-40),
        registro: idOk(ex.registro),
      } : null,
      estendidos: lista(x.estendidos).map(normalizarEstendido).filter(Boolean).slice(-12),
      confronto: normalizarConfronto(x.confronto),
      encerrada: carimbo(x.encerrada),
      desfecho: x.desfecho && typeof x.desfecho === "object" ? { resultado: x.desfecho.resultado === "vitoria" ? "vitoria" : "derrota", texto: texto(x.desfecho.texto, 1200), em: carimbo(x.desfecho.em) } : null,
      notas: texto(x.notas, 2000),
    };
  }

  function normalizarConfronto(b) {
    if (!b || typeof b !== "object") return null;
    var x = obj(b);
    var r = obj(x.refens);
    var prog = {};
    Object.keys(obj(x.progresso)).forEach(function (k) { if (idOk(k)) prog[k] = { sucessos: inteiro(x.progresso[k].sucessos, 0, 20, 0), falhas: inteiro(x.progresso[k].falhas, 0, 20, 0) }; });
    var querida = {};
    Object.keys(obj(x.querida)).forEach(function (k) {
      var q = obj(x.querida[k]);
      if (!idOk(k)) return;
      querida[k] = { dado: inteiro(q.dado, 0, 12, 0), escolhido: q.escolhido === null || q.escolhido === undefined ? null : inteiro(q.escolhido, 1, 12, 1), rolado: q.rolado === null || q.rolado === undefined ? null : inteiro(q.rolado, 1, 12, 1),
        estado: ["pendente", "viva", "morta"].indexOf(q.estado) >= 0 ? q.estado : "pendente", quando: texto(q.quando, 60) };
    });
    return {
      preparado: carimbo(x.preparado), contador: inteiro(x.contador, 1, 10, 6),
      refens: { total: REFENS_TOTAL, mortosAntes: inteiro(r.mortosAntes, 0, 14, 0), vivos: inteiro(r.vivos, 0, 14, 0) },
      carroceriaAberta: x.carroceriaAberta === true, sacrificiosAtivos: x.sacrificiosAtivos !== false,
      rodada: inteiro(x.rodada, 1, 99, 1),
      rodadas: lista(x.rodadas).map(function (rd) {
        var q = obj(rd);
        var nr = inteiro(q.n, 1, 99, 1);
        return {
          id: "r" + nr, n: nr,
          passageiros: lista(q.passageiros).map(function (p) {
            var y = obj(p);
            return { id: idOk(y.id), personagemId: idOk(y.personagemId), nome: texto(y.nome, 80), pericia: texto(y.pericia, 40), total: inteiro(y.total, -99, 999, 0), dt: inteiro(y.dt, 0, 99, 35),
              sucesso: y.sucesso === true, impedir: y.impedir === true, registro: idOk(y.registro), desfeito: y.desfeito === true, d12: inteiro(y.d12, 0, 12, 0) };
          }).filter(function (p) { return p.id; }).slice(0, 20),
          motoristas: lista(q.motoristas).map(function (p) {
            var y = obj(p);
            return { id: idOk(y.id), veiculoId: idOk(y.veiculoId), total: inteiro(y.total, -99, 999, 0), dt: inteiro(y.dt, -99, 99, 25), sucesso: y.sucesso === true, desfeito: y.desfeito === true };
          }).filter(function (p) { return p.id; }).slice(0, 8),
          fim: q.fim && typeof q.fim === "object" ? { op: idOk(q.fim.op), sacrificado: q.fim.sacrificado === true, d4: inteiro(q.fim.d4, 0, 4, 0), querida: idOk(q.fim.querida), desfeito: q.fim.desfeito === true } : null,
        };
      }).slice(-40),
      progresso: prog, querida: querida,
    };
  }

  function normalizarViagem(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    var gr = x.granular && typeof x.granular === "object" ? x.granular : null;
    return {
      id: id, nome: texto(x.nome, 80) || "Viagem", origem: texto(x.origem, 80), destino: texto(x.destino, 80),
      metodo: x.metodo === "granular" ? "granular" : "itinerario",
      modulo: MODULOS[x.modulo] ? x.modulo : "curta", dias: inteiro(x.dias, 1, 30, 1),
      velocidade: x.velocidade === "imprudente" ? "imprudente" : "padrao",
      etapas: unicoPorId(lista(x.etapas).map(normalizarEtapa).filter(Boolean)).slice(0, MAX_ETAPAS),
      veiculos: unicoPorId(lista(x.veiculos).map(normalizarVeiculoDeViagem).filter(Boolean)).slice(0, MAX_VEICULOS),
      encontros: unicoPorId(lista(x.encontros).map(normalizarEncontro).filter(Boolean)).slice(-MAX_ENCONTROS),
      acidentes: unicoPorId(lista(x.acidentes).map(normalizarAcidente).filter(Boolean)).slice(-MAX_ACIDENTES),
      registros: unicoPorId(lista(x.registros).map(normalizarRegistroDeEfeito).filter(Boolean)).slice(-60),
      estendidos: unicoPorId(lista(x.estendidos).map(normalizarEstendido).filter(Boolean)).slice(-20),
      granular: gr ? { distancia: inteiro(gr.distancia, 0, 99999, 0), percorrido: inteiro(gr.percorrido, 0, 99999, 0), dt: inteiro(gr.dt, 10, 99, 10),
        trechos: unicoPorId(lista(gr.trechos).map(normalizarTrecho).filter(Boolean)).slice(-MAX_TRECHOS) } : null,
      pressagios: inteiro(x.pressagios, 0, 9, 0),
      emboscada: x.emboscada === true,
      notas: texto(x.notas, 2000),
      criada: carimbo(x.criada), concluida: carimbo(x.concluida),
      carcacas: normalizarCarcacas(x.carcacas),
    };
  }

  function normalizarHistorico(b) {
    var x = obj(b);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, tipo: texto(x.tipo, 40), texto: texto(x.texto, 400), autor: texto(x.autor, 80), autorNome: texto(x.autorNome, 80),
      em: carimbo(x.em), viagem: idOk(x.viagem), privado: x.privado === true,
      efeitos: lista(x.efeitos).map(function (e) { var q = obj(e); return q.tipo ? copia(q) : null; }).filter(Boolean).slice(0, 160),
      resultado: x.resultado && typeof x.resultado === "object" ? copia(x.resultado) : null,
      desfeitoEm: carimbo(x.desfeitoEm), desfeitoPor: texto(x.desfeitoPor, 80), desfaz: idOk(x.desfaz),
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var e = estadoVazio();
    e.ativo = b.ativo === true;
    e.viagens = unicoPorId(lista(b.viagens).map(normalizarViagem).filter(Boolean)).slice(-MAX_VIAGENS);
    e.atual = e.viagens.some(function (v) { return v.id === b.atual; }) ? b.atual : (e.viagens.length ? e.viagens[e.viagens.length - 1].id : "");
    e.historico = unicoPorId(lista(b.historico).map(normalizarHistorico).filter(Boolean)).slice(-MAX_HISTORICO);
    return e;
  }

  function viagemAtual(estado) { return estado.viagens.filter(function (v) { return v.id === estado.atual; })[0] || null; }
  function veiculo(viagem, id) { return viagem ? viagem.veiculos.filter(function (v) { return v.id === id; })[0] || null : null; }
  function etapaAtual(viagem) { return viagem ? viagem.etapas.filter(function (e) { return !e.feita && !e.desfeita; })[0] || null : null; }

  /* =================================================================
     O QUE UM VEÍCULO TEM AGORA (com o vínculo do AS3, quando houver)
     -----------------------------------------------------------------
     `vinculados` = { "personagemId|veiculoId": { nome, modelo, pvAtual,
     combustivel, combustivelMaximo, regalias: [chaves], defeitos } },
     lido das fichas pelo servidor. A viagem nunca escreve nele.
     ================================================================= */

  function regaliasDoVinculo(v, vinculados) {
    if (!v.vinculo || !vinculados) return [];
    var s = vinculados[v.vinculo.personagemId + "|" + v.vinculo.veiculoId];
    return s ? lista(s.regalias) : [];
  }
  function temItem(v, chave, vinculados) {
    return v.equipamentos.indexOf(chave) >= 0 || regaliasDoVinculo(v, vinculados).indexOf(chave) >= 0;
  }
  function autonomiaMaxima(v, vinculados) { return autonomiaMaximaDe(v, regaliasDoVinculo(v, vinculados)); }

  /* Um evento vale para este veículo? */
  function aplicabilidade(evento, v, vinculados) {
    var m = POR_VEICULO[v.modelo] || {};
    if (evento.tabela === "veiculo" && (m.tipo === "bicicleta" || m.tipo === "cavalo")) return { aplicavel: false, motivo: m.nome + " é imune a problemas no veículo (p. 44)." };
    var im = evento.imune || {};
    if (im.eletrico && m.eletrico) return { aplicavel: false, motivo: "Carro elétrico é imune a este evento (p. 48–49)." };
    if (im.velho && m.velho) return { aplicavel: false, motivo: "Carro velho é imune a este evento (p. 49)." };
    if (im.paineis && temItem(v, "paineisSolares", vinculados)) return { aplicavel: false, motivo: "Painéis Solares Avançados: o veículo não sofre com problemas elétricos e eletrônicos (p. 57)." };
    if (evento.chave === "temperatura" && temItem(v, "arCondicionado", vinculados)) return { aplicavel: false, motivo: "Ar-condicionado: o veículo controla a temperatura (p. 52 e 56)." };
    return { aplicavel: true, motivo: "" };
  }

  function dtDoTeste(t, velocidade) {
    return Array.isArray(t.dt) ? (velocidade === "imprudente" ? t.dt[1] : t.dt[0]) : t.dt;
  }

  /* A perícia de navegação do veículo (p. 41). */
  function periciaDeNavegacao(v) {
    var n = NAVEGACAO[v.navegacao] || NAVEGACAO.visual;
    if (n.automatico) return { pericia: "", automatico: true, nota: "Conhece o caminho: sucesso automático." };
    if (v.navegacao === "gps" && (!v.sinal || v.semEletronica)) return { pericia: "sobrevivencia", nota: v.semEletronica ? "Sem eletrônicos (falha eletrônica): o aparelho vira um mapa estático — Sobrevivência." : "Sem sinal: o aparelho vira um mapa estático — Sobrevivência." };
    return { pericia: n.pericia, nota: n.nome + ": " + NOMES_PERICIA[n.pericia] + "." };
  }

  /* Notas que valem para qualquer teste de dirigir ou navegar. */
  function notasDoMotorista(v) {
    var notas = [];
    var m = POR_VEICULO[v.modelo] || {};
    if (m.pericia) notas.push(m.nome + ": " + NOMES_PERICIA[m.pericia] + " no lugar de Pilotagem (p. 37).");
    else notas.push("O motorista precisa ser treinado em Pilotagem (p. 40).");
    if (v.motorista && (v.motorista.personagemId || v.motorista.nome) && mesmaPessoa(v.motorista, v.navegador)) notas.push("O motorista também navega: –1d20 nos testes de dirigir e de navegar (p. 40).");
    v.penalidades.forEach(function (p) { notas.push(p.texto + "."); });
    return notas;
  }
  function mesmaPessoa(a, b) {
    if (!a || !b) return false;
    if (a.personagemId && b.personagemId) return a.personagemId === b.personagemId;
    return !!a.nome && !!b.nome && a.nome.toLowerCase() === b.nome.toLowerCase();
  }

  /* =================================================================
     HISTÓRICO E EFEITOS
     -----------------------------------------------------------------
     Um efeito é uma de três formas, todas desfazíveis:
       { tipo: "delta", caminho, delta }   contador (com o delta REAL,
                                           depois do limite)
       { tipo: "set", caminho, antes, depois }  campo
       { tipo: "marca", caminho }          registro adicionado: desfazer
                                           marca `desfeito`
       { tipo: "ficha", personagemId, id } escrita numa ficha (o servidor
                                           desfaz na ficha)
     O caminho é montado AQUI, nunca recebido do navegador.
     ================================================================= */

  function resolver(estado, caminho) {
    var partes = caminho.split("/");
    var alvo = estado;
    for (var i = 0; i < partes.length - 1; i++) {
      var p = partes[i];
      if (Array.isArray(alvo)) alvo = alvo.filter(function (x) { return x && x.id === p; })[0] || alvo[Number(p)];
      else alvo = alvo ? alvo[p] : undefined;
      if (alvo === undefined || alvo === null) return null;
    }
    return { pai: alvo, chave: partes[partes.length - 1] };
  }
  function ler(estado, caminho) { var r = resolver(estado, caminho); return r ? r.pai[r.chave] : undefined; }
  function gravar(estado, caminho, valor) {
    var r = resolver(estado, caminho);
    if (!r) return false;
    if (valor === undefined) delete r.pai[r.chave];
    else r.pai[r.chave] = valor;
    return true;
  }

  var LIMITES = { perseguicao: [1, 10] };
  function somar(estado, efeitos, caminho, delta, min, max) {
    var atual = Number(ler(estado, caminho)) || 0;
    var novo = atual + delta;
    if (min !== undefined) novo = Math.max(min, novo);
    if (max !== undefined) novo = Math.min(max, novo);
    gravar(estado, caminho, novo);
    if (novo !== atual) efeitos.push({ tipo: "delta", caminho: caminho, delta: novo - atual, min: min, max: max });
    return novo - atual;
  }
  function definir(estado, efeitos, caminho, valor) {
    var antes = ler(estado, caminho);
    if (JSON.stringify(antes) === JSON.stringify(valor)) return;
    gravar(estado, caminho, copia(valor));
    efeitos.push({ tipo: "set", caminho: caminho, antes: copia(antes) === undefined ? null : copia(antes), depois: copia(valor), apagar: antes === undefined });
  }

  function indicePorId(l, id) { for (var i = 0; i < l.length; i++) if (l[i] && l[i].id === id) return i; return -1; }
  function adicionar(estado, efeitos, caminho, item, pos, max) {
    var l = ler(estado, caminho);
    if (!Array.isArray(l)) { l = []; if (!gravar(estado, caminho, l)) return false; }
    if (pos === undefined || pos === null || pos < 0 || pos > l.length) l.push(item); else l.splice(pos, 0, item);
    if (max && l.length > max) l.splice(0, l.length - max);
    efeitos.push({ tipo: "add", caminho: caminho, id: item.id });
    return true;
  }
  function retirar(estado, efeitos, caminho, id) {
    var l = ler(estado, caminho);
    if (!Array.isArray(l)) return null;
    var i = indicePorId(l, id);
    if (i < 0) return null;
    var item = l.splice(i, 1)[0];
    efeitos.push({ tipo: "remove", caminho: caminho, item: copia(item), pos: i });
    return item;
  }

  function desfazerEfeitos(estado, efeitos) {
    var fichas = [];
    efeitos.slice().reverse().forEach(function (e) {
      if (e.tipo === "delta") {
        var atual = Number(ler(estado, e.caminho)) || 0;
        var novo = atual - e.delta;
        if (e.min !== undefined && e.min !== null) novo = Math.max(e.min, novo);
        if (e.max !== undefined && e.max !== null) novo = Math.min(e.max, novo);
        gravar(estado, e.caminho, novo);
      } else if (e.tipo === "set") {
        gravar(estado, e.caminho, e.apagar ? undefined : copia(e.antes));
      } else if (e.tipo === "add") {
        var la = ler(estado, e.caminho);
        if (Array.isArray(la)) { var ia = indicePorId(la, e.id); if (ia >= 0) la.splice(ia, 1); }
      } else if (e.tipo === "remove") {
        var lr = ler(estado, e.caminho);
        if (Array.isArray(lr) && e.item && indicePorId(lr, e.item.id) < 0) lr.splice(Math.min(lr.length, e.pos || 0), 0, copia(e.item));
      } else if (e.tipo === "marca") {
        var alvo = ler(estado, e.caminho);
        if (alvo && typeof alvo === "object") alvo.desfeito = true;
      } else if (e.tipo === "ficha") {
        fichas.push({ personagemId: e.personagemId, id: e.id });
      }
    });
    return fichas;
  }

  /* =================================================================
     AS OPERAÇÕES
     -----------------------------------------------------------------
     aplicar(estado, op, ctx) — ctx = {
       papel: "mestre" | "jogador", autor, autorNome, meus: [ids],
       personagens: [{ id, nome }]  (da campanha),
       vinculados (veículos do AS3, lidos das fichas),
       rolar(faces) → 1..faces, agora (ISO), opId }
     Devolve { ok, motivo, resultado, fichas: [{ personagemId, acao,
     dados }], privado } e muda `estado`. O histórico ganha a linha.
     ================================================================= */

  var OPS_DO_MESTRE = ["ligar", "nova_viagem", "preparar", "selecionar", "veiculo", "etapa", "avancar", "revelar", "encontro", "encontro_teste",
    "encontro_decisao", "encontro_substituir", "consequencia", "estendido_teste", "acidente", "acidente_pilotagem", "acidente_aplicar",
    "trecho", "consumo", "abastecer", "reserva", "resistencia", "concluir", "carcacas_iniciar", "perseguicao", "cena", "decisao",
    "cena_estendido", "caca_conceder", "explosao", "explosao_acao", "explosao_atingidos", "confronto_preparar", "carroceria", "motorista", "rodada_fim",
    "desfecho", "missao_encerrar", "notas", "desfazer"];
  var OPS_DO_JOGADOR = ["caca_gastar", "sonnenblume", "passageiro", "querida"];

  function rolarExpr(rolar, expr) {
    var m = /^(\d{1,2})d(\d{1,3})$/.exec(String(expr || ""));
    if (!m) return { valores: [], total: 0 };
    var n = Number(m[1]), f = Number(m[2]);
    var valores = [];
    for (var i = 0; i < n; i++) valores.push(rolar(f));
    return { valores: valores, total: valores.reduce(function (s, v) { return s + v; }, 0), dado: expr };
  }

  function nomeDe(ctx, pid, padrao) {
    var p = lista(ctx.personagens).filter(function (x) { return x.id === pid; })[0];
    return p ? texto(p.nome, 80) : (padrao || "Personagem");
  }

  function falha(m) { return { ok: false, motivo: m }; }
  function novoIdDe(ctx, sufixo) { return (String(ctx.opId || "op").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60) + "-" + sufixo).slice(0, 80); }

  function aplicar(estado, op, ctx) {
    var o = obj(op);
    var tipo = String(o.tipo || "");
    var mestre = ctx.papel === "mestre";
    if (OPS_DO_MESTRE.indexOf(tipo) < 0 && OPS_DO_JOGADOR.indexOf(tipo) < 0) return falha("Operação desconhecida.");
    if (OPS_DO_MESTRE.indexOf(tipo) >= 0 && !mestre) return falha("Só o mestre faz isso.");
    if (tipo !== "ligar" && tipo !== "desfazer" && !estado.ativo) return falha("As viagens estão desligadas nesta campanha.");
    var efeitos = [];
    var r = OPS[tipo](estado, o, ctx, efeitos);
    if (!r || !r.ok) return r || falha("Não deu para aplicar.");
    if (tipo !== "desfazer" || r.registrar !== false) {
      estado.historico.push(normalizarHistorico({
        id: ctx.opId, tipo: tipo, texto: r.texto || tipo, autor: ctx.autor, autorNome: ctx.autorNome, em: ctx.agora,
        viagem: estado.atual, privado: !!r.privado, efeitos: efeitos, resultado: r.resultado || null, desfaz: r.desfaz || "",
      }));
      estado.historico = estado.historico.slice(-MAX_HISTORICO);
    }
    return { ok: true, resultado: r.resultado || null, texto: r.texto || "", fichas: r.fichas || [], privado: !!r.privado };
  }

  function exigirViagem(estado) { var v = viagemAtual(estado); return v; }
  function exigirMissao(estado) { var v = viagemAtual(estado); return v && v.carcacas ? v : null; }
  function caminhoDaViagem(estado) { return "viagens/" + estado.atual; }

  var OPS = {
    ligar: function (estado, o) {
      estado.ativo = o.ativo === true;
      return { ok: true, texto: estado.ativo ? "Viagens ligadas na campanha." : "Viagens desligadas (tudo fica guardado)." };
    },

    /* Uma viagem nova, livre ou já com o roteiro da missão. */
    nova_viagem: function (estado, o, ctx, efeitos) {
      var id = novoIdDe(ctx, "vg");
      var modulo = MODULOS[o.modulo] ? o.modulo : "curta";
      var velocidade = o.velocidade === "imprudente" ? "imprudente" : "padrao";
      var vg = normalizarViagem({ id: id, nome: texto(o.nome, 80) || "Viagem", origem: o.origem, destino: o.destino, modulo: modulo, velocidade: velocidade,
        metodo: o.metodo, dias: o.dias, criada: ctx.agora, etapas: [] });
      vg.etapas = montarEtapas(vg, ctx);
      if (vg.metodo === "granular") vg.granular = { distancia: inteiro(o.distancia, 0, 99999, 0), percorrido: 0, dt: 10, trechos: [] };
      adicionar(estado, efeitos, "viagens", vg, null, MAX_VIAGENS);
      definir(estado, efeitos, "atual", vg.id);
      return { ok: true, texto: "Nova viagem: " + vg.nome + (vg.origem || vg.destino ? " (" + (vg.origem || "?") + " → " + (vg.destino || "?") + ")" : "") + "." };
    },

    selecionar: function (estado, o) {
      if (!estado.viagens.some(function (v) { return v.id === o.viagemId; })) return falha("Viagem desconhecida.");
      estado.atual = o.viagemId;
      return { ok: true, texto: "Viagem atual trocada.", privado: true };
    },

    /* Nome, origem, destino, módulo, velocidade, método, dias e notas.
       Trocar módulo ou velocidade remonta as etapas que ainda não
       aconteceram (as feitas ficam). */
    preparar: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var base = caminhoDaViagem(estado);
      ["nome", "origem", "destino"].forEach(function (k) { if (o[k] !== undefined) definir(estado, efeitos, base + "/" + k, texto(o[k], 80)); });
      if (o.notas !== undefined) definir(estado, efeitos, base + "/notas", texto(o.notas, 2000));
      if (o.emboscada !== undefined) definir(estado, efeitos, base + "/emboscada", o.emboscada === true);
      var remontar = false;
      if (o.modulo !== undefined && MODULOS[o.modulo] && o.modulo !== vg.modulo) { definir(estado, efeitos, base + "/modulo", o.modulo); remontar = true; }
      if (o.velocidade !== undefined && o.velocidade !== vg.velocidade) {
        var vel = o.velocidade === "imprudente" ? "imprudente" : "padrao";
        if (vel === "imprudente" && vg.veiculos.some(function (v) { return (POR_VEICULO[v.modelo] || {}).soPadrao; })) return falha("Bicicleta e cavalo sempre trafegam na velocidade padrão (p. 37).");
        definir(estado, efeitos, base + "/velocidade", vel); remontar = true;
      }
      if (o.dias !== undefined && inteiro(o.dias, 1, 30, 1) !== vg.dias) { definir(estado, efeitos, base + "/dias", inteiro(o.dias, 1, 30, 1)); remontar = true; }
      if (o.metodo !== undefined && (o.metodo === "granular") !== (vg.metodo === "granular")) {
        definir(estado, efeitos, base + "/metodo", o.metodo === "granular" ? "granular" : "itinerario");
        if (o.metodo === "granular" && !vg.granular) definir(estado, efeitos, base + "/granular", { distancia: inteiro(o.distancia, 0, 99999, 0), percorrido: 0, dt: 10, trechos: [] });
      }
      if (o.distancia !== undefined && vg.granular) definir(estado, efeitos, base + "/granular/distancia", inteiro(o.distancia, 0, 99999, 0));
      if (remontar && !vg.carcacas) {
        var feitas = vg.etapas.filter(function (e) { return e.feita; });
        var novas = montarEtapas(vg, ctx).filter(function (e) { return !feitas.length || e.tipo !== "partida"; });
        vg.etapas.filter(function (e) { return !e.feita && e.tipo !== "fixo"; }).map(function (e) { return e.id; }).forEach(function (id) { retirar(estado, efeitos, base + "/etapas", id); });
        novas.forEach(function (e, k) { if (vg.etapas.length < MAX_ETAPAS) adicionar(estado, efeitos, base + "/etapas", e, feitas.length + k); });
      }
      return { ok: true, texto: "Preparação da viagem atualizada." };
    },

    /* Veículo: criar, mudar ou tirar. */
    veiculo: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var base = caminhoDaViagem(estado);
      if (o.acao === "criar") {
        if (vg.veiculos.length >= MAX_VEICULOS) return falha("Comboio cheio (até " + MAX_VEICULOS + " veículos).");
        var m = POR_VEICULO[o.modelo]; if (!m) return falha("Modelo desconhecido.");
        if (m.soPadrao && vg.velocidade === "imprudente") return falha("Bicicleta e cavalo sempre trafegam na velocidade padrão (p. 37).");
        var vin = o.vinculo && typeof o.vinculo === "object" ? o.vinculo : null;
        if (vin && !(ctx.vinculados && ctx.vinculados[vin.personagemId + "|" + vin.veiculoId])) return falha("Esse veículo operacional não está numa ficha desta campanha.");
        var novo = normalizarVeiculoDeViagem({ id: novoIdDe(ctx, "vc"), modelo: o.modelo, nome: o.nome, equipamentos: vin ? [] : equipamentoDeSerie(o.modelo), vinculo: vin,
          combustivelModo: o.combustivelModo, navegacao: o.navegacao || "visual" });
        adicionar(estado, efeitos, base + "/veiculos", novo);
        return { ok: true, texto: "Veículo: " + novo.nome + (vin ? " (vinculado ao veículo operacional da ficha)" : "") + "." };
      }
      var v = veiculo(vg, o.veiculoId); if (!v) return falha("Veículo desconhecido.");
      if (o.acao === "remover") {
        retirar(estado, efeitos, base + "/veiculos", v.id);
        return { ok: true, texto: "Veículo retirado: " + v.nome + "." };
      }
      var vb = base + "/veiculos/" + v.id;
      var d = obj(o.dados);
      if (d.nome !== undefined) definir(estado, efeitos, vb + "/nome", texto(d.nome, 80) || v.nome);
      if (d.motorista !== undefined) definir(estado, efeitos, vb + "/motorista", pessoa(d.motorista));
      if (d.navegador !== undefined) definir(estado, efeitos, vb + "/navegador", pessoa(d.navegador));
      if (d.navegacao !== undefined && NAVEGACAO[d.navegacao]) definir(estado, efeitos, vb + "/navegacao", d.navegacao);
      if (d.sinal !== undefined) definir(estado, efeitos, vb + "/sinal", d.sinal !== false);
      if (d.intoxicado !== undefined) definir(estado, efeitos, vb + "/intoxicado", d.intoxicado === true);
      if (d.ocupantes !== undefined) {
        var oc = lista(d.ocupantes).map(pessoa).filter(function (p) { return p.personagemId || p.nome; }).slice(0, MAX_OCUPANTES);
        var mm = POR_VEICULO[v.modelo];
        var cabem = mm.passageiros + 1;
        if (oc.length > cabem) return falha(mm.nome + " leva " + (mm.vagas || mm.passageiros + " passageiro(s)") + " além do condutor (" + cabem + " no total).");
        definir(estado, efeitos, vb + "/ocupantes", oc);
      }
      if (d.combustivelModo !== undefined) {
        if (d.combustivelModo === "dados" && !v.vinculo) return falha("A gestão por dados de combustível é a dos Veículos Operacionais: vincule um veículo do AS3.");
        definir(estado, efeitos, vb + "/combustivelModo", d.combustivelModo === "dados" ? "dados" : "itinerario");
      }
      if (d.estado !== undefined && ["ok", "oficina", "estrada", "perdaTotal", "consumido"].indexOf(d.estado) >= 0) definir(estado, efeitos, vb + "/estado", d.estado);
      if (d.vazamento !== undefined) definir(estado, efeitos, vb + "/vazamento", d.vazamento === true);
      if (d.semEletronica !== undefined) definir(estado, efeitos, vb + "/semEletronica", d.semEletronica === true);
      if (d.penalidades !== undefined) definir(estado, efeitos, vb + "/penalidades", lista(d.penalidades).filter(function (p) { return p && ["semEstepe", "semFreio"].indexOf(p.chave) >= 0; }).slice(0, 4));
      if (d.equipamentos !== undefined) {
        if (v.vinculo) return falha("As regalias de um veículo vinculado são as da ficha (Veículos Operacionais).");
        var antes = v.equipamentos.slice();
        var proximo = normalizarVeiculoDeViagem(Object.assign({}, v, { equipamentos: lista(d.equipamentos) })).equipamentos;
        definir(estado, efeitos, vb + "/equipamentos", proximo);
        /* Instalar não mexe em reserva nem autonomia além do que a peça
           traz: cada estepe ou extintor novo vem com a sua unidade; tirar
           a peça tira a unidade dela. */
        ["estepe", "extintor"].forEach(function (k) {
          var dif = contar(proximo, k) - contar(antes, k);
          if (dif) somar(estado, efeitos, vb + "/reservas/" + k, dif, 0, contar(proximo, k));
        });
      }
      return { ok: true, texto: "Veículo atualizado: " + v.nome + "." };
    },

    /* Etapas: acrescentar encontro fixo, parada, transformar encontro em
       fixo, nota e revelação, tirar. */
    etapa: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var base = caminhoDaViagem(estado);
      if (o.acao === "inserir") {
        if (vg.etapas.length >= MAX_ETAPAS) return falha("Itinerário cheio.");
        var tipoE = ["encontro", "fixo", "parada"].indexOf(o.etapa) >= 0 ? o.etapa : "fixo";
        var nova = normalizarEtapa({ id: novoIdDe(ctx, "et"), tipo: tipoE, rotulo: o.rotulo, nota: o.nota, origem: "Inserida pelo mestre" });
        var pos = inteiro(o.posicao, 0, vg.etapas.length, vg.etapas.length);
        var chegada = vg.etapas.map(function (e) { return e.tipo; }).lastIndexOf("chegada");
        if (o.posicao === undefined && chegada >= 0) pos = chegada;
        adicionar(estado, efeitos, base + "/etapas", nova, pos);
        return { ok: true, texto: "Etapa acrescentada ao itinerário: " + (nova.rotulo || tipoE) + ".", privado: tipoE === "fixo" };
      }
      var et = vg.etapas.filter(function (e) { return e.id === o.etapaId; })[0]; if (!et) return falha("Etapa desconhecida.");
      var eb = base + "/etapas/" + et.id;
      if (o.acao === "editar") {
        if (o.rotulo !== undefined) definir(estado, efeitos, eb + "/rotulo", texto(o.rotulo, 80));
        if (o.nota !== undefined) definir(estado, efeitos, eb + "/nota", texto(o.nota, 600));
        if (o.etapa !== undefined && ["encontro", "fixo"].indexOf(o.etapa) >= 0 && ["encontro", "fixo"].indexOf(et.tipo) >= 0 && !et.feita) definir(estado, efeitos, eb + "/tipo", o.etapa);
        return { ok: true, texto: "Etapa atualizada.", privado: true };
      }
      if (o.acao === "remover") {
        if (et.feita) return falha("Uma etapa já percorrida não sai do itinerário.");
        retirar(estado, efeitos, base + "/etapas", et.id);
        return { ok: true, texto: "Etapa retirada.", privado: true };
      }
      return falha("Ação de etapa desconhecida.");
    },

    avancar: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var et = etapaAtual(vg); if (!et) return falha("O itinerário já terminou.");
      if (o.etapaId && o.etapaId !== et.id) return falha("A etapa atual mudou. Atualize a tela.");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/etapas/" + et.id + "/feita", true);
      definir(estado, efeitos, caminhoDaViagem(estado) + "/etapas/" + et.id + "/revelada", true);
      var prox = etapaAtual(vg);
      if (!prox && !vg.concluida) definir(estado, efeitos, caminhoDaViagem(estado) + "/concluida", ctx.agora);
      return { ok: true, texto: "Etapa concluída: " + rotuloDaEtapa(et) + (prox ? ". Agora: " + (prox.tipo === "fixo" && !prox.revelada ? "encontro" : rotuloDaEtapa(prox)) + "." : ". Chegada!") };
    },

    revelar: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var et = vg.etapas.filter(function (e) { return e.id === o.etapaId; })[0]; if (!et) return falha("Etapa desconhecida.");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/etapas/" + et.id + "/revelada", o.revelada !== false);
      return { ok: true, texto: (o.revelada !== false ? "Revelado aos jogadores: " : "Escondido dos jogadores: ") + rotuloDaEtapa(et) + "." };
    },

    /* Rolar um encontro aleatório (d100 e as subtabelas). O servidor
       rola; o resultado fica gravado com a operação. */
    encontro: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var v = veiculo(vg, o.veiculoId) || vg.veiculos[0]; if (!v) return falha("Ponha um veículo na viagem antes.");
      var et = o.etapaId ? vg.etapas.filter(function (e) { return e.id === o.etapaId; })[0] : etapaAtual(vg);
      var trecho = vg.granular && o.trechoId ? vg.granular.trechos.filter(function (t) { return t.id === o.trechoId; })[0] : null;
      var d100 = ctx.rolar(100);
      var linha = linhaPrincipal(d100);
      var eventos = [];
      var acidenteDireto = false;
      linha[2].forEach(function (tab) {
        if (tab === "acidente") { acidenteDireto = true; eventos.push({ tabela: "acidente", d20: 0, chave: "acidente", aplicavel: true, testes: [], consequencias: [] }); return; }
        var d20 = ctx.rolar(20);
        var ev = eventoDaTabela(tab, d20);
        var ap = aplicabilidade(ev, v, ctx.vinculados);
        var reg = { tabela: tab, d20: d20, chave: ev.chave, aplicavel: ap.aplicavel, motivo: ap.motivo, decisao: "", testes: [], consequencias: [], estendidos: [] };
        if (ap.aplicavel) prepararEvento(reg, ev, v, vg, ctx);
        eventos.push(reg);
      });
      /* A emboscada da escolta (p. 42): 02–49 vira a emboscada, se o
         mestre quis assim. */
      var emboscada = vg.emboscada && d100 >= 2 && d100 <= 49;
      var efetivo = eventos.some(function (e) { return e.aplicavel; }) || emboscada;
      var enc = normalizarEncontro({ id: novoIdDe(ctx, "en"), etapaId: et ? et.id : "", veiculoId: v.id, trechoId: trecho ? trecho.id : "", d100: d100,
        linha: emboscada ? "A emboscada da escolta! (p. 42)" : linha[3], eventos: eventos, efetivo: efetivo, rolado: ctx.agora, por: ctx.autorNome });
      if (acidenteDireto) enc.eventos[0].consequencias.push(normalizarConsequencia({ id: novoIdDe(ctx, "cq0"), tipo: "acidente", texto: "Acidente (p. 54): abra a resolução." }));
      adicionar(estado, efeitos, caminhoDaViagem(estado) + "/encontros", enc, null, MAX_ENCONTROS);
      /* Granular (p. 39): encontro que se confirma devolve a DT a 10. */
      if (trecho) {
        definir(estado, efeitos, caminhoDaViagem(estado) + "/granular/trechos/" + trecho.id + "/encontroId", enc.id);
        if (efetivo) definir(estado, efeitos, caminhoDaViagem(estado) + "/granular/dt", 10);
      }
      var desc = enc.linha + (eventos.length ? " " + eventos.map(function (e) { var d = e.tabela === "acidente" ? null : eventoPorChave(e.chave); return d ? NOMES_TABELA[e.tabela] + " (d20 " + e.d20 + "): " + d.nome + (e.aplicavel ? "" : " — não se aplica") : "Acidente"; }).join("; ") : "");
      return { ok: true, texto: "Encontro (d100 " + d100 + "): " + desc, resultado: { encontroId: enc.id, d100: d100 } };
    },

    /* O resultado de um teste pedido pelo encontro (total rolado na
       ficha). Sucesso e falha liberam as consequências da fonte. */
    encontro_teste: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var achado = acharEvento(vg, o.encontroId, o.evento); if (!achado) return falha("Encontro desconhecido.");
      var ev = achado.ev;
      var i = inteiro(o.teste, 0, 5, 0);
      var t = ev.testes[i]; if (!t) return falha("Teste desconhecido.");
      if (t.sucesso !== null) return falha("Esse teste já foi registrado. Desfaça para corrigir.");
      var base = caminhoDaViagem(estado) + "/encontros/" + achado.enc.id + "/eventos/" + achado.indice + "/testes/" + i;
      var total = t.automatico ? null : inteiro(o.total, -99, 999, 0);
      var sucesso = t.automatico ? true : total >= t.dt;
      definir(estado, efeitos, base + "/total", total);
      definir(estado, efeitos, base + "/sucesso", sucesso);
      definir(estado, efeitos, base + "/por", texto(o.por, 80));
      var def = eventoPorChave(ev.chave);
      var teste = acharDefinicaoDoTeste(def, ev, i);
      var cons = teste ? lista(sucesso ? teste.sucesso : teste.falha) : [];
      proporConsequencias(estado, efeitos, achado, cons, vg, ctx, ev.chave + "-t" + i);
      return { ok: true, texto: (def ? def.nome : "Teste") + ": " + (t.automatico ? "sucesso automático" : total + " contra DT " + t.dt + " — " + (sucesso ? "sucesso" : "falha")) + "." };
    },

    encontro_decisao: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var achado = acharEvento(vg, o.encontroId, o.evento); if (!achado) return falha("Encontro desconhecido.");
      var ev = achado.ev;
      if (ev.decisao) return falha("A decisão já foi registrada. Desfaça para mudar.");
      var def = eventoPorChave(ev.chave);
      var opc = def && lista(def.opcoes).filter(function (x) { return x.chave === o.decisao; })[0];
      if (!opc) return falha("Opção desconhecida.");
      var v = veiculo(vg, achado.enc.veiculoId);
      if (opc.precisa && v && !(v.reservas[opc.precisa] > 0 || (v.vinculo && temItem(v, opc.precisa, ctx.vinculados)))) return falha("O veículo não tem " + opc.precisa + " de reserva.");
      var base = caminhoDaViagem(estado) + "/encontros/" + achado.enc.id + "/eventos/" + achado.indice;
      definir(estado, efeitos, base + "/decisao", opc.chave);
      if (opc.teste) adicionar(estado, efeitos, base + "/testes", montarTeste(opc.teste, v, vg, opc.chave));
      if (opc.estendido) criarEstendido(estado, efeitos, vg, Object.assign({ rotulo: opc.rotulo }, opc.estendido), { encontroId: achado.enc.id, indice: achado.indice }, ctx);
      proporConsequencias(estado, efeitos, achado, lista(opc.sempre), vg, ctx, ev.chave + "-d");
      return { ok: true, texto: (def ? def.nome : "Encontro") + ": " + opc.rotulo + "." };
    },

    /* O mestre troca o evento (por outro, por um combate ou rola de novo
       — p. 44 e 52–53). O original fica no registro. */
    encontro_substituir: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var achado = acharEvento(vg, o.encontroId, o.evento); if (!achado) return falha("Encontro desconhecido.");
      var base = caminhoDaViagem(estado) + "/encontros/" + achado.enc.id + "/eventos/" + achado.indice;
      var txt = texto(o.texto, 200) || "Substituído pelo mestre.";
      definir(estado, efeitos, base + "/substituido", txt);
      achado.ev.consequencias.forEach(function (c) {
        if (c.estado === "pendente") definir(estado, efeitos, base + "/consequencias/" + c.id + "/estado", "descartada");
      });
      return { ok: true, texto: "Evento substituído: " + txt };
    },

    /* Aplicar ou descartar uma consequência proposta. */
    consequencia: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var achado = acharConsequencia(vg, o.consequenciaId); if (!achado) return falha("Consequência desconhecida.");
      var c = achado.c;
      if (c.estado !== "pendente") return falha("Essa consequência já foi decidida.");
      var base = achado.caminho;
      if (o.acao === "descartar") {
        definir(estado, efeitos, base + "/estado", "descartada");
        return { ok: true, texto: "Consequência descartada: " + c.texto };
      }
      var r = efetivarConsequencia(estado, efeitos, vg, c, achado, ctx, o);
      if (!r.ok) return r;
      definir(estado, efeitos, base + "/estado", "aplicada");
      definir(estado, efeitos, base + "/aplicadaPor", texto(ctx.autorNome, 40));
      return { ok: true, texto: "Aplicado: " + c.texto + (r.texto ? " — " + r.texto : ""), resultado: r.resultado || null };
    },

    /* Um teste dentro de um teste estendido em grupo. */
    estendido_teste: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var achado = acharEstendido(estado, vg, o.estendidoId); if (!achado) return falha("Teste estendido desconhecido.");
      var x = achado.x;
      if (x.fim || x.desfeito) return falha("Esse teste estendido já terminou.");
      var total = inteiro(o.total, -99, 999, 0);
      var sucesso = total >= x.dt;
      var t = normalizarTeste({ id: novoIdDe(ctx, "et"), chave: "x" + (x.testes.length + 1), pericia: o.pericia || "livre", dt: x.dt, total: total, sucesso: sucesso, por: o.por, rotulo: o.rotulo });
      adicionar(estado, efeitos, achado.caminho + "/testes", t, null, 40);
      somar(estado, efeitos, achado.caminho + (sucesso ? "/feitos" : "/errados"), 1, 0, 20);
      var feitos = x.feitos + (sucesso ? 1 : 0), errados = x.errados + (sucesso ? 0 : 1);
      var resultado = { sucesso: sucesso, feitos: feitos, errados: errados };
      var txt = x.rotulo + ": " + (o.por ? texto(o.por, 40) + " " : "") + total + " contra DT " + x.dt + " — " + (sucesso ? "sucesso" : "falha") + " (" + feitos + "/" + x.sucessos + " sucessos, " + errados + "/" + x.falhas + " falhas).";
      /* Falha que custa (missão): cada falha, uma perda ou dano para
         todos os agentes, rolada aqui. */
      if (!sucesso && x.porFalha && vg.carcacas) {
        var porFalha = x.porFalha === "impacto" ? { tipo: "dano", partes: [{ dado: "2d6", tipo: "impacto" }], rotulo: "2d6 de impacto" }
          : x.porFalha === "tiros" ? { tipo: "perda", partes: [{ dado: o.semTiros ? "1d6" : "1d8", recurso: o.semTiros ? "pe" : "pv" }], rotulo: o.semTiros ? "1d6 PE" : "1d8 PV (com tiros)" }
          : { tipo: "perda", partes: [{ dado: "1d6", recurso: "pe" }], rotulo: "1d6 PE" };
        var reg = registrarPerda(estado, efeitos, vg, { tipo: porFalha.tipo, origem: x.rotulo + " · falha", alvo: "agentes", partes: porFalha.partes }, ctx);
        resultado.registro = reg.id;
        txt += " Cada agente: " + porFalha.rotulo + ".";
      }
      if (feitos >= x.sucessos) {
        definir(estado, efeitos, achado.caminho + "/fim", "vitoria");
        proporDoEstendido(estado, efeitos, vg, x, x.vitoria, ctx);
        txt += " Vitória!";
      } else if (errados >= x.falhas) {
        definir(estado, efeitos, achado.caminho + "/fim", "derrota");
        proporDoEstendido(estado, efeitos, vg, x, x.derrota, ctx);
        if (vg.carcacas && x.derrotaPerseguicao) { somar(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/perseguicao", x.derrotaPerseguicao, 1, 10); txt += " Contador de perseguição " + x.derrotaPerseguicao + "."; }
        txt += " Fracasso total." + (x.derrotaAcidente ? " Acidente contra um caminhão: abra a resolução do acidente (e, se continuarem, −1 no contador)." : "");
        resultado.acidente = x.derrotaAcidente || "";
      }
      return { ok: true, texto: txt, resultado: resultado };
    },

    /* Abrir a resolução de um acidente: o outro envolvido conhecido ou
       sorteado no d100. */
    acidente: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var v = veiculo(vg, o.veiculoId) || vg.veiculos[0]; if (!v) return falha("Nenhum veículo.");
      var outro = null;
      if (o.outro === "sortear") outro = outroEnvolvido(ctx.rolar(100));
      else if (o.outro) outro = outroPorChave(o.outro);
      var c = obj(o.causa);
      var acid = normalizarAcidente({ id: novoIdDe(ctx, "ac"), veiculoId: v.id, encontroId: o.encontroId, cena: o.cena,
        causa: { imprudente: c.imprudente !== undefined ? c.imprudente === true : vg.velocidade === "imprudente", intoxicado: c.intoxicado !== undefined ? c.intoxicado === true : v.intoxicado,
          semFreio: c.semFreio !== undefined ? c.semFreio === true : v.penalidades.some(function (p) { return p.chave === "semFreio"; }), paranormal: c.paranormal === true },
        outro: outro, semOutro: !outro });
      adicionar(estado, efeitos, caminhoDaViagem(estado) + "/acidentes", acid, null, MAX_ACIDENTES);
      return { ok: true, texto: "Acidente com " + v.nome + (outro ? ": o outro envolvido é " + outro.nome + " (proporções " + outro.proporcoes + (outro.d100 ? ", d100 " + outro.d100 : "") + ")" : ", sem outro veículo") + ". Falta a Pilotagem do motorista.", resultado: { acidenteId: acid.id } };
    },

    acidente_pilotagem: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var a = vg.acidentes.filter(function (x) { return x.id === o.acidenteId; })[0]; if (!a) return falha("Acidente desconhecido.");
      if (a.pilotagem !== null) return falha("A Pilotagem desse acidente já foi registrada. Desfaça para corrigir.");
      var v = veiculo(vg, a.veiculoId);
      var regs = v ? v.equipamentos.concat(regaliasDoVinculo(v, ctx.vinculados)) : [];
      var comp = composicaoDoAcidente(o.total, a.causa, v ? POR_VEICULO[v.modelo].proporcoes : 0, a.outro, regs);
      var base = caminhoDaViagem(estado) + "/acidentes/" + a.id;
      definir(estado, efeitos, base + "/pilotagem", inteiro(o.total, -99, 999, 0));
      definir(estado, efeitos, base + "/total", comp.total);
      definir(estado, efeitos, base + "/resultado", comp.resultado.chave);
      return { ok: true, texto: "Acidente: " + comp.partes.map(function (p) { return (p.valor >= 0 && p !== comp.partes[0] ? "+" : "") + p.valor + " (" + p.rotulo + ")"; }).join(" ") + " = " + comp.total + " → " + comp.resultado.nome + (comp.resultado.dano ? ", " + comp.resultado.dano + "d6 de impacto por ocupante" : "") + ".",
        resultado: { total: comp.total, resultado: comp.resultado.chave, partes: comp.partes } };
    },

    /* Aplicar o resultado: dano rolado por ocupante (antes das reduções
       que cada um tiver) e o estado do veículo. */
    acidente_aplicar: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var a = vg.acidentes.filter(function (x) { return x.id === o.acidenteId; })[0]; if (!a) return falha("Acidente desconhecido.");
      if (a.aplicado) return falha("Esse acidente já foi aplicado.");
      if (!a.resultado) return falha("Registre a Pilotagem antes.");
      var res = RESULTADOS_ACIDENTE.filter(function (r) { return r.chave === a.resultado; })[0];
      var v = veiculo(vg, a.veiculoId);
      var base = caminhoDaViagem(estado) + "/acidentes/" + a.id;
      var reg = null;
      if (res.dano && v) {
        var gaiola = res.capotamento && temItem(v, "gaiolaDeProtecao", ctx.vinculados);
        reg = registrarPerda(estado, efeitos, vg, { tipo: "dano", origem: res.nome + (gaiola ? " (Gaiola de Proteção: metade do dano de capotamento)" : ""), alvo: "ocupantes", veiculo: v,
          partes: [{ dado: res.dano + "d6", tipo: "impacto", metade: gaiola }] }, ctx);
        definir(estado, efeitos, base + "/registro", reg.id);
      }
      if (res.veiculo && v) definir(estado, efeitos, caminhoDaViagem(estado) + "/veiculos/" + v.id + "/estado", res.veiculo);
      definir(estado, efeitos, base + "/aplicado", true);
      var notas = [];
      if (v && temItem(v, "airbag", ctx.vinculados)) notas.push("Airbag instalado: a fonte não dá redução numérica — decisão da mesa.");
      return { ok: true, texto: res.nome + ": " + res.texto + (res.dano ? " " + res.dano + "d6 de impacto por ocupante (antes de RD e outras reduções)." : "") + (notas.length ? " " + notas.join(" ") : ""), resultado: { registro: reg ? reg.id : "" } };
    },

    /* Alternativa granular (p. 39): um trecho de 100 km. */
    trecho: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg || !vg.granular) return falha("A viagem não está no modo granular.");
      var v = veiculo(vg, o.veiculoId) || vg.veiculos[0]; if (!v) return falha("Nenhum veículo.");
      var dt = vg.granular.dt;
      var nav = periciaDeNavegacao(v);
      var tm = normalizarTeste({ chave: "motorista", pericia: (POR_VEICULO[v.modelo] || {}).pericia || "pilotagem", dt: dt, total: o.motorista, sucesso: inteiro(o.motorista, -99, 999, 0) >= dt, papel: "motorista" });
      var tn = nav.automatico ? normalizarTeste({ chave: "navegador", pericia: "navegacao", dt: dt, sucesso: true, automatico: true, papel: "navegador" })
        : normalizarTeste({ chave: "navegador", pericia: nav.pericia, dt: dt, total: o.navegador, sucesso: inteiro(o.navegador, -99, 999, 0) >= dt, papel: "navegador" });
      var falhou = !tm.sucesso || !tn.sucesso;
      var km = inteiro(o.km, 1, 100, 100);
      var t = normalizarTrecho({ id: novoIdDe(ctx, "tr"), n: vg.granular.trechos.length + 1, dt: dt, veiculoId: v.id, motorista: tm, navegador: tn, falhou: falhou, km: km });
      var base = caminhoDaViagem(estado) + "/granular";
      adicionar(estado, efeitos, base + "/trechos", t, null, MAX_TRECHOS);
      somar(estado, efeitos, base + "/percorrido", km, 0, 99999);
      somar(estado, efeitos, base + "/dt", 5, 10, 99);
      var txt = "Trecho " + t.n + " (DT " + dt + "): motorista " + (tm.total === null ? "—" : tm.total) + ", navegador " + (tn.automatico ? "conhece o caminho" : tn.total) + (falhou ? " — falhou: role um encontro aleatório." : " — sem incidentes.");
      if (v.combustivelModo === "itinerario" && !(POR_VEICULO[v.modelo] || {}).porDia) {
        somar(estado, efeitos, caminhoDaViagem(estado) + "/veiculos/" + v.id + "/autonomiaRestante", -km, 0, 99999);
        txt += " Autonomia −" + km + " km (granular).";
      } else if (v.combustivelModo === "dados") txt += " Combustível pelos dados do veículo operacional, na ficha (sem baixa aqui).";
      return { ok: true, texto: txt, resultado: { trechoId: t.id, falhou: falhou } };
    },

    /* Baixa de autonomia pelo itinerário (km informados) — nunca para
       veículo que gasta por dados na ficha. */
    consumo: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var v = veiculo(vg, o.veiculoId); if (!v) return falha("Veículo desconhecido.");
      if (v.combustivelModo === "dados") return falha("Este veículo gasta combustível pelos dados do veículo operacional, na ficha: a viagem não dá baixa (evita baixa dupla).");
      var km = inteiro(o.km, 1, 5000, 0);
      if (!km) return falha("Informe os quilômetros.");
      var real = somar(estado, efeitos, caminhoDaViagem(estado) + "/veiculos/" + v.id + "/autonomiaRestante", -km, 0, 99999);
      return { ok: true, texto: v.nome + ": −" + (-real) + " km de autonomia (itinerário" + (o.origem ? ", " + texto(o.origem, 60) : "") + ")." };
    },

    abastecer: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var v = veiculo(vg, o.veiculoId); if (!v) return falha("Veículo desconhecido.");
      if (v.combustivelModo === "dados") return falha("Reabasteça pelo veículo operacional, na ficha.");
      var max = autonomiaMaxima(v, ctx.vinculados);
      definir(estado, efeitos, caminhoDaViagem(estado) + "/veiculos/" + v.id + "/autonomiaRestante", max);
      return { ok: true, texto: v.nome + " abastecido: " + max + " km de autonomia." };
    },

    /* Usar ou repor um estepe ou extintor, sempre explícito. */
    reserva: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      var v = veiculo(vg, o.veiculoId); if (!v) return falha("Veículo desconhecido.");
      if (["estepe", "extintor"].indexOf(o.item) < 0) return falha("Item desconhecido.");
      if (v.vinculo) return falha("As reservas de um veículo vinculado ficam na ficha (Veículos Operacionais).");
      var max = contar(v.equipamentos, o.item);
      var real = somar(estado, efeitos, caminhoDaViagem(estado) + "/veiculos/" + v.id + "/reservas/" + o.item, o.delta > 0 ? 1 : -1, 0, max);
      if (!real) return falha(o.delta > 0 ? "As reservas já estão cheias (" + max + ")." : "Não há " + o.item + " de reserva.");
      return { ok: true, texto: v.nome + ": " + o.item + " " + (real > 0 ? "reposto" : "usado") + " (" + (v.reservas[o.item]) + "/" + max + ")." };
    },

    /* Marcar quem passou na resistência de uma perda ou dano registrado. */
    resistencia: function (estado, o, ctx, efeitos) {
      return marcarResistencia(estado, o, ctx, efeitos);
    },

    concluir: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/concluida", o.reabrir ? "" : ctx.agora);
      return { ok: true, texto: o.reabrir ? "Viagem reaberta." : "Viagem concluída." };
    },

    notas: function (estado, o, ctx, efeitos) {
      var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
      if (vg.carcacas && o.missao) definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/notas", texto(o.texto, 2000));
      else definir(estado, efeitos, caminhoDaViagem(estado) + "/notas", texto(o.texto, 2000));
      return { ok: true, texto: "Notas do mestre atualizadas.", privado: true };
    },

    /* ---------------- Carcaças Vermelhas ---------------- */

    carcacas_iniciar: function (estado, o, ctx, efeitos) {
      var vel = o.velocidade === "imprudente" ? "imprudente" : "padrao";
      var id = novoIdDe(ctx, "cv");
      var vg = normalizarViagem({ id: id, nome: MISSAO.nome, origem: texto(o.origem, 80) || "Serra Gaúcha", destino: texto(o.destino, 80), modulo: "longa", velocidade: vel, criada: ctx.agora, etapas: [] });
      vg.etapas = [normalizarEtapa({ id: id + "-p", tipo: "partida", rotulo: "Partida", revelada: true })].concat(MISSAO.roteiro[vel].map(function (n) {
        return normalizarEtapa({ id: id + "-c" + n, tipo: "cena", cena: n, rotulo: POR_CENA[n].nome, origem: ref(POR_CENA[n].paginas) });
      }));
      var agentes = lista(o.agentes).map(idOk).filter(function (pid) { return lista(ctx.personagens).some(function (p) { return p.id === pid; }); }).slice(0, MAX_AGENTES);
      var caca = {};
      agentes.forEach(function (pid) { caca[pid] = 0; });
      vg.carcacas = normalizarCarcacas({ id: id, iniciada: ctx.agora, velocidade: vel, agentes: agentes, perseguicao: MISSAO.perseguicaoInicial, caca: caca, cena: 1, cenasVistas: [1] });
      adicionar(estado, efeitos, "viagens", vg, null, MAX_VIAGENS);
      definir(estado, efeitos, "atual", vg.id);
      return { ok: true, texto: "Carcaças Vermelhas iniciada (" + (vel === "imprudente" ? "velocidade imprudente: cenas 1, 2, 3, 4 e 7" : "velocidade padrão: cenas 1 a 7") + "). Contador de perseguição em 6." };
    },

    perseguicao: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var d = inteiro(o.delta, -9, 9, 0);
      if (!d) return falha("Informe o aumento ou a redução.");
      var real = somar(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/perseguicao", d, 1, 10);
      var atual = vg.carcacas.perseguicao;
      return { ok: true, texto: "Contador de perseguição " + (d > 0 ? "+" : "") + d + (real !== d ? " (limitado: " + (real > 0 ? "+" : "") + real + ")" : "") + " → " + atual + (o.origem ? " · " + texto(o.origem, 120) : "") + "." };
    },

    cena: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var n = inteiro(o.cena, 1, 7, 1);
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/cena", n);
      if (vg.carcacas.cenasVistas.indexOf(n) < 0) definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/cenasVistas", vg.carcacas.cenasVistas.concat([n]));
      var et = vg.etapas.filter(function (e) { return e.tipo === "cena" && e.cena === n; })[0];
      if (et) {
        vg.etapas.forEach(function (e) { if ((e.tipo === "partida" || (e.tipo === "cena" && e.cena < n && MISSAO.roteiro[vg.carcacas.velocidade].indexOf(e.cena) < MISSAO.roteiro[vg.carcacas.velocidade].indexOf(n))) && !e.feita) definir(estado, efeitos, caminhoDaViagem(estado) + "/etapas/" + e.id + "/feita", true); });
        definir(estado, efeitos, caminhoDaViagem(estado) + "/etapas/" + et.id + "/revelada", true);
      }
      return { ok: true, texto: "Cena atual: " + POR_CENA[n].nome + " (" + ref(POR_CENA[n].paginas) + ")." };
    },

    /* Uma escolha do roteiro de apoio: os efeitos dela, uma vez só. */
    decisao: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var cena = POR_CENA[inteiro(o.cena, 1, 7, 1)];
      var d = cena && cena.decisoes.filter(function (x) { return x.chave === o.decisao; })[0];
      if (!d) return falha("Escolha desconhecida.");
      var chave = "c" + cena.n + "." + d.chave;
      if (vg.carcacas.decisoes[chave]) return falha("Essa escolha já foi registrada. Desfaça para corrigir.");
      var base = caminhoDaViagem(estado) + "/carcacas";
      definir(estado, efeitos, base + "/decisoes/" + chave, ctx.opId);
      var partes = [];
      if (d.perseguicao) { var real = somar(estado, efeitos, base + "/perseguicao", d.perseguicao, 1, 10); partes.push("perseguição " + (d.perseguicao > 0 ? "+" : "") + d.perseguicao + (real !== d.perseguicao ? " (limite)" : "") + " → " + vg.carcacas.perseguicao); }
      if (d.caca) { vg.carcacas.agentes.forEach(function (pid) { somar(estado, efeitos, base + "/caca/" + pid, d.caca, 0, 99); }); partes.push("+" + d.caca + " dado(s) de caçada por agente"); }
      if (d.condicao) partes.push("agentes " + d.condicao);
      if (d.nota) partes.push(d.nota);
      return { ok: true, texto: cena.nome + " — " + d.rotulo + (partes.length ? ": " + partes.join("; ") : "") + ".", resultado: { acidente: !!d.acidente } };
    },

    /* O teste estendido em grupo de uma cena (5: a barreira; 6: o
       caminhoneiro), com o custo de cada falha. */
    cena_estendido: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var cena = POR_CENA[inteiro(o.cena, 1, 7, 1)];
      if (!cena || !cena.estendido) return falha("Essa cena não tem teste estendido.");
      if (vg.carcacas.estendidos.some(function (x) { return x.cena === cena.n && !x.desfeito; })) return falha("O teste estendido desta cena já começou.");
      var e = cena.estendido;
      var x = criarEstendido(estado, efeitos, vg, { rotulo: e.rotulo, dt: e.dt, sucessos: e.sucessos, falhas: e.falhas, porFalha: e.porFalha, cena: cena.n, carcacas: true,
        derrotaPerseguicao: e.derrotaPerseguicao || 0, derrotaAcidente: e.derrotaAcidente || "" }, null, ctx);
      return { ok: true, texto: cena.nome + ": " + e.rotulo + " — teste estendido em grupo, DT " + e.dt + ", " + e.sucessos + " sucessos antes de " + e.falhas + " falhas.", resultado: { estendidoId: x.id } };
    },

    caca_conceder: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var n = inteiro(o.quantidade, -20, 20, 0); if (!n) return falha("Informe a quantidade.");
      var alvos = o.personagemId ? [o.personagemId] : vg.carcacas.agentes;
      alvos = alvos.filter(function (pid) { return vg.carcacas.agentes.indexOf(pid) >= 0; });
      if (!alvos.length) return falha("Nenhum agente da missão.");
      alvos.forEach(function (pid) { somar(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/caca/" + pid, n, 0, 99); });
      return { ok: true, texto: (n > 0 ? "+" : "") + n + " dado(s) de caçada para " + (o.personagemId ? nomeDe(ctx, o.personagemId) : "cada agente") + (o.origem ? " · " + texto(o.origem, 120) : "") + "." };
    },

    /* O agente gasta dados de caçada num teste (p. 62): +1d4 cada, ou
       +1d6 contra um Carcaça Vermelha. O servidor rola; repetir a mesma
       operação devolve o resultado gravado. */
    caca_gastar: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var pid = idOk(o.personagemId);
      if (vg.carcacas.agentes.indexOf(pid) < 0) return falha("Esse personagem não é agente da missão.");
      if (ctx.papel !== "mestre" && lista(ctx.meus).indexOf(pid) < 0) return falha("Só o dono do agente (ou o mestre) gasta os dados dele.");
      if (vg.carcacas.encerrada) return falha("A missão terminou.");
      var q = inteiro(o.quantidade, 1, 20, 1);
      var saldo = vg.carcacas.caca[pid] || 0;
      if (q > saldo) return falha("Saldo insuficiente: " + saldo + " dado(s) de caçada.");
      var faces = o.contraCarcaca === true ? 6 : 4;
      var rol = rolarExpr(ctx.rolar, q + "d" + faces);
      somar(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/caca/" + pid, -q, 0, 99);
      var teste = texto(o.teste, 80);
      return { ok: true, texto: nomeDe(ctx, pid) + " gastou " + q + " dado(s) de caçada" + (teste ? " em " + teste : "") + (o.contraCarcaca ? " contra um Carcaça Vermelha" : "") + ": +" + q + "d" + faces + " = " + rol.total + " (" + rol.valores.join(", ") + "). Saldo: " + (saldo - q) + ".",
        resultado: { personagemId: pid, quantidade: q, faces: faces, valores: rol.valores, total: rol.total, saldo: saldo - q, teste: teste, rolagem: texto(o.rolagem, 80) } };
    },

    /* Cardápio do Sonnenblume (p. 77): uma escolha por agente. Os pontos
       temporários vão para a ficha, com a origem, e expiram no fim da
       missão (ou ao serem consumidos). */
    sonnenblume: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var pid = idOk(o.personagemId);
      if (vg.carcacas.agentes.indexOf(pid) < 0) return falha("Esse personagem não é agente da missão.");
      if (ctx.papel !== "mestre" && lista(ctx.meus).indexOf(pid) < 0) return falha("Só o dono do agente (ou o mestre) escolhe por ele.");
      if (vg.carcacas.encerrada) return falha("A missão terminou.");
      var item = POR_CARDAPIO[o.item]; if (!item) return falha("Item desconhecido do cardápio.");
      if (vg.carcacas.sonnenblume[pid]) return falha(nomeDe(ctx, pid) + " já se alimentou no Sonnenblume.");
      var rol = item.dado ? rolarExpr(ctx.rolar, item.dado) : null;
      var idFicha = novoIdDe(ctx, "sb");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/sonnenblume/" + pid, { item: item.chave, valor: rol ? rol.total : 0, op: ctx.opId });
      var origem = "Sonnenblume · " + item.nome + " (" + ref(77) + ")";
      var ficha = item.recurso
        ? { personagemId: pid, acao: "temporario", dados: { id: idFicha, recurso: item.recurso, valor: rol.total, origem: origem, missao: vg.carcacas.id } }
        : { personagemId: pid, acao: "efeito", dados: { id: idFicha, chave: item.chave, origem: origem, missao: vg.carcacas.id } };
      efeitos.push({ tipo: "ficha", personagemId: pid, id: idFicha });
      return { ok: true, texto: nomeDe(ctx, pid) + " comeu " + item.nome + ": " + (rol ? rol.total + " " + item.recurso.toUpperCase() + " temporários (" + item.dado + " = " + rol.valores.join(" + ") + "), até o fim da missão" : item.efeito) + ".",
        fichas: [ficha], resultado: { item: item.chave, valor: rol ? rol.total : 0 } };
    },

    /* A explosão da Cena 4 (p. 79–80). */
    explosao: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      if (vg.carcacas.explosao && !o.reiniciar) return falha("A contagem já começou.");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/explosao", { contador: 10, acoes: [], registro: "" });
      return { ok: true, texto: "A viatura vai explodir: contador em 10 (ação padrão ou de movimento −1, completa −2)." };
    },

    explosao_acao: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.explosao) return falha("A contagem da explosão não começou.");
      var ex = vg.carcacas.explosao;
      if (ex.contador <= 0) return falha("Já explodiu.");
      var tipoA = ["padrao", "movimento", "completa"].indexOf(o.acao) >= 0 ? o.acao : "padrao";
      var base = caminhoDaViagem(estado) + "/carcacas/explosao";
      var real = somar(estado, efeitos, base + "/contador", tipoA === "completa" ? -2 : -1, 0, 10);
      adicionar(estado, efeitos, base + "/acoes", { id: ctx.opId, quem: texto(o.quem, 80), tipo: tipoA, op: ctx.opId }, null, 40);
      var restante = ex.contador;
      return { ok: true, texto: "Explosão: " + (texto(o.quem, 40) || "alguém") + " usou uma ação " + ({ padrao: "padrão", movimento: "de movimento", completa: "completa" })[tipoA] + " (" + real + ") → " + restante + (restante <= 0 ? ". BUM! Escolha quem estava no raio de 6 m." : ".") };
    },

    explosao_atingidos: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.explosao) return falha("A contagem da explosão não começou.");
      var ex = vg.carcacas.explosao;
      if (ex.contador > 0) return falha("Ainda não explodiu.");
      if (ex.registro) return falha("O dano da explosão já foi rolado. Desfaça para refazer.");
      var alvos = lista(o.personagens).map(idOk).filter(Boolean);
      var nomes = lista(o.outros).map(function (n) { return texto(n, 80); }).filter(Boolean).slice(0, 12);
      if (!alvos.length && !nomes.length) return falha("Escolha quem estava no raio de 6 m.");
      var reg = registrarPerda(estado, efeitos, vg, { tipo: "dano", origem: "Explosão da viatura (" + ref(80) + ")", alvosExplicitos: alvos, nomes: nomes, unico: true,
        partes: [{ dado: "6d6", tipo: "fogo" }, { dado: "6d6", tipo: "impacto" }], condicao: "em chamas", resistencia: { pericia: "reflexos", dt: 25, texto: "reduz à metade e evita em chamas" } }, ctx);
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/explosao/registro", reg.id);
      return { ok: true, texto: "Explosão: 12d6 (6d6 de fogo + 6d6 de impacto) e em chamas para quem estava no raio; Reflexos DT 25 reduz à metade e evita a condição.", resultado: { registro: reg.id } };
    },

    /* O confronto final (p. 86–91). */
    confronto_preparar: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      if (vg.carcacas.confronto) return falha("O confronto final já foi preparado (os reféns não são sorteados de novo).");
      var cont = vg.carcacas.perseguicao;
      var r = refensPeloContador(cont);
      var querida = {};
      vg.carcacas.agentes.forEach(function (pid) { querida[pid] = { dado: r.dado, escolhido: null, rolado: null, estado: r.dado ? "pendente" : "viva", quando: r.dado ? "" : "contador 10: ninguém foi sacrificado ainda" }; });
      var prog = {};
      vg.veiculos.forEach(function (v) { prog[v.id] = { sucessos: 0, falhas: 0 }; });
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/confronto", normalizarConfronto({ preparado: ctx.agora, contador: cont, refens: { mortosAntes: r.mortos, vivos: r.vivos },
        carroceriaAberta: false, sacrificiosAtivos: r.vivos > 0, rodada: 1, rodadas: [{ id: "r1", n: 1, passageiros: [], motoristas: [] }], progresso: prog, querida: querida }));
      if (vg.carcacas.cena !== 7) definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/cena", 7);
      return { ok: true, texto: "Confronto final preparado com o contador em " + cont + ": " + r.mortos + " reféns já sacrificados, " + r.vivos + " vivos" + (r.dado ? " (pessoa querida: d" + r.dado + ")" : " (ninguém foi sacrificado ainda)") + "." };
    },

    querida: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.confronto) return falha("O confronto final não foi preparado.");
      var pid = idOk(o.personagemId);
      var q = vg.carcacas.confronto.querida[pid]; if (!q) return falha("Esse personagem não é agente da missão.");
      if (ctx.papel !== "mestre" && lista(ctx.meus).indexOf(pid) < 0) return falha("Só o dono do agente (ou o mestre) rola por ele.");
      if (q.estado !== "pendente" || q.rolado !== null) return falha("A pessoa querida de " + nomeDe(ctx, pid) + " já foi verificada.");
      var esc = inteiro(o.escolhido, 1, q.dado, 1);
      var rolado = ctx.rolar(q.dado);
      var morta = rolado === esc;
      var base = caminhoDaViagem(estado) + "/carcacas/confronto/querida/" + pid;
      definir(estado, efeitos, base, { dado: q.dado, escolhido: esc, rolado: rolado, estado: morta ? "morta" : "viva", quando: morta ? "antes do confronto" : "" });
      return { ok: true, texto: nomeDe(ctx, pid) + " escolheu " + esc + " no d" + q.dado + " e saiu " + rolado + ": a pessoa querida " + (morta ? "já foi sacrificada." : "está viva na carroceria."), resultado: { rolado: rolado, morta: morta } };
    },

    carroceria: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.confronto) return falha("O confronto final não foi preparado.");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/confronto/carroceriaAberta", o.aberta === true);
      if (o.sacrificios !== undefined) definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/confronto/sacrificiosAtivos", o.sacrificios === true);
      return { ok: true, texto: (o.aberta ? "Carroceria aberta: impedir os sacrifícios volta à DT 35." : "Carroceria fechada: impedir os sacrifícios tem +5 na DT.") + (o.sacrificios === false ? " Sacrifícios interrompidos." : "") };
    },

    /* Um passageiro, uma vez por rodada (p. 86): DT 35, perícia
       justificada, não repete a da rodada anterior. */
    passageiro: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.confronto) return falha("O confronto final não foi preparado.");
      var cf = vg.carcacas.confronto;
      if (cf.desfecho || vg.carcacas.desfecho) return falha("O confronto terminou.");
      var pid = idOk(o.personagemId);
      if (vg.carcacas.agentes.indexOf(pid) < 0) return falha("Esse personagem não é agente da missão.");
      if (ctx.papel !== "mestre" && lista(ctx.meus).indexOf(pid) < 0) return falha("Só o dono do agente (ou o mestre) registra o teste dele.");
      var pericia = texto(o.pericia, 40).trim();
      if (!pericia) return falha("Diga a perícia (e como ela protege o grupo ou ataca os Carcaças).");
      var rodada = rodadaAtual(cf);
      var ja = rodada.passageiros.filter(function (p) { return p.personagemId === pid && !p.desfeito; })[0];
      if (ja) return falha(nomeDe(ctx, pid) + " já agiu como passageiro nesta rodada.");
      var anterior = cf.rodadas.filter(function (r) { return r.n === rodada.n - 1; })[0];
      var repetida = anterior && anterior.passageiros.some(function (p) { return p.personagemId === pid && !p.desfeito && p.pericia.toLowerCase() === pericia.toLowerCase(); });
      if (repetida) return falha(pericia + " foi usada por " + nomeDe(ctx, pid) + " na rodada anterior: escolha outra perícia (p. 86).");
      var impedir = o.impedir === true && cf.sacrificiosAtivos;
      var dt = CONFRONTO.dtPassageiro + (impedir && !cf.carroceriaAberta ? CONFRONTO.carroceriaFechada : 0);
      var total = inteiro(o.total, -99, 999, 0);
      var sucesso = total >= dt;
      var reg = { id: novoIdDe(ctx, "ps"), personagemId: pid, nome: nomeDe(ctx, pid), pericia: pericia, total: total, dt: dt, sucesso: sucesso, impedir: impedir, registro: "", d12: 0 };
      var txt = reg.nome + " (passageiro, " + pericia + "): " + total + " contra DT " + dt + (impedir ? " para impedir os sacrifícios" + (!cf.carroceriaAberta ? " (+5, carroceria fechada)" : "") : "") + " — " + (sucesso ? "sucesso: a DT do motorista cai 5 nesta rodada" : "falha");
      var base = caminhoDaViagem(estado) + "/carcacas/confronto";
      if (!sucesso) {
        var d12 = ctx.rolar(12);
        var f = falhaDoPassageiro(d12);
        var alvos = vg.carcacas.agentes;
        var alvo = alvos[ctx.rolar(alvos.length) - 1];
        var r = registrarPerda(estado, efeitos, vg, { tipo: "dano", origem: "Confronto final · falha de " + reg.nome + " (d12 " + d12 + "): " + f.nome, alvosExplicitos: [alvo], partes: f.partes.map(function (p) { return { dado: p.dado, tipo: p.tipo }; }), resistencia: f.resistencia }, ctx);
        reg.registro = r.id; reg.d12 = d12;
        txt += ". d12 " + d12 + ": " + f.nome + " em " + nomeDe(ctx, alvo) + " (" + f.partes.map(function (p) { return p.dado + " " + p.tipo; }).join(" + ") + "; " + f.resistencia.pericia + " DT " + f.resistencia.dt + " " + f.resistencia.texto + ")";
      }
      if (sucesso && impedir) { definir(estado, efeitos, base + "/sacrificiosAtivos", false); txt += ". Os sacrifícios param"; }
      adicionar(estado, efeitos, base + "/rodadas/r" + rodada.n + "/passageiros", reg);
      var sucessos = rodada.passageiros.filter(function (p) { return p.sucesso && !p.desfeito; }).length + (sucesso ? 1 : 0);
      return { ok: true, texto: txt + ".", resultado: { sucesso: sucesso, dtMotorista: dtDoMotorista(sucessos) } };
    },

    motorista: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.confronto) return falha("O confronto final não foi preparado.");
      var cf = vg.carcacas.confronto;
      var v = veiculo(vg, o.veiculoId) || vg.veiculos[0]; if (!v) return falha("Nenhum veículo na viagem.");
      var rodada = rodadaAtual(cf);
      if (rodada.motoristas.some(function (m) { return m.veiculoId === v.id && !m.desfeito; })) return falha("O motorista de " + v.nome + " já testou nesta rodada.");
      var prog = cf.progresso[v.id] || { sucessos: 0, falhas: 0 };
      if (prog.sucessos >= CONFRONTO.sucessos || prog.falhas >= CONFRONTO.falhas) return falha("O teste estendido de " + v.nome + " já terminou.");
      var sucessosP = rodada.passageiros.filter(function (p) { return p.sucesso && !p.desfeito; }).length;
      var dt = dtDoMotorista(sucessosP);
      var total = inteiro(o.total, -99, 999, 0);
      var sucesso = total >= dt;
      var base = caminhoDaViagem(estado) + "/carcacas/confronto";
      if (!cf.progresso[v.id]) definir(estado, efeitos, base + "/progresso/" + v.id, { sucessos: 0, falhas: 0 });
      somar(estado, efeitos, base + "/progresso/" + v.id + (sucesso ? "/sucessos" : "/falhas"), 1, 0, 20);
      adicionar(estado, efeitos, base + "/rodadas/r" + rodada.n + "/motoristas", { id: novoIdDe(ctx, "mt"), veiculoId: v.id, total: total, dt: dt, sucesso: sucesso });
      var p2 = cf.progresso[v.id];
      var fim = p2.sucessos >= CONFRONTO.sucessos ? " Sete sucessos: vitória possível — o mestre confirma o desfecho." : p2.falhas >= CONFRONTO.falhas ? " Três falhas: derrota possível — o mestre confirma o desfecho." : "";
      return { ok: true, texto: "Motorista de " + v.nome + ": Pilotagem " + total + " contra DT " + dt + (sucessosP ? " (25 − " + (sucessosP * 5) + " pelos passageiros)" : "") + " — " + (sucesso ? "sucesso" : "falha") + " (" + p2.sucessos + "/7 sucessos, " + p2.falhas + "/3 falhas)." + fim,
        resultado: { sucesso: sucesso, dt: dt, progresso: p2 } };
    },

    /* Fim da rodada (p. 89): com reféns vivos e sacrifícios ativos, morre
       um; 1 em 1d4 é a pessoa querida de um agente (entre as vivas,
       sorteada). Uma vez por rodada. */
    rodada_fim: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg || !vg.carcacas.confronto) return falha("O confronto final não foi preparado.");
      var cf = vg.carcacas.confronto;
      var rodada = rodadaAtual(cf);
      if (o.rodada !== undefined && inteiro(o.rodada, 1, 99, 0) !== rodada.n) return falha("A rodada mudou. Atualize a tela.");
      if (rodada.fim && !rodada.fim.desfeito) return falha("O fim desta rodada já foi aplicado.");
      var base = caminhoDaViagem(estado) + "/carcacas/confronto";
      var fim = { op: ctx.opId, sacrificado: false, d4: 0, querida: "" };
      var txt = "Fim da rodada " + rodada.n;
      if (cf.sacrificiosAtivos && cf.refens.vivos > 0) {
        somar(estado, efeitos, base + "/refens/vivos", -1, 0, 14);
        fim.sacrificado = true;
        fim.d4 = ctx.rolar(4);
        var vivas = Object.keys(cf.querida).filter(function (pid) { return cf.querida[pid].estado === "viva"; });
        if (fim.d4 === 1 && vivas.length) {
          fim.querida = vivas[ctx.rolar(vivas.length) - 1];
          var q = cf.querida[fim.querida];
          definir(estado, efeitos, base + "/querida/" + fim.querida, Object.assign({}, q, { estado: "morta", quando: "rodada " + rodada.n }));
        }
        txt += ": um refém foi sacrificado (" + cf.refens.vivos + " vivos). d4 " + fim.d4 + (fim.querida ? ": era a pessoa querida de " + nomeDe(ctx, fim.querida) + "." : vivas.length ? ": não era uma pessoa querida." : ".");
      } else txt += cf.refens.vivos > 0 ? ": os sacrifícios estão interrompidos." : ": não há reféns vivos.";
      definir(estado, efeitos, base + "/rodadas/r" + rodada.n + "/fim", fim);
      adicionar(estado, efeitos, base + "/rodadas", { id: "r" + (rodada.n + 1), n: rodada.n + 1, passageiros: [], motoristas: [], fim: null }, null, 40);
      somar(estado, efeitos, base + "/rodada", 1, 1, 99);
      return { ok: true, texto: txt, resultado: { vivos: cf.refens.vivos, d4: fim.d4, querida: fim.querida } };
    },

    desfecho: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      var res = o.resultado === "vitoria" ? "vitoria" : "derrota";
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/desfecho", { resultado: res, texto: texto(o.texto, 1200), em: ctx.agora });
      return { ok: true, texto: res === "vitoria" ? "Desfecho: os agentes derrotam os Carcaças Vermelhas (p. 90). Sobreviventes: orientação de +5% de NEX e prestígio conforme as ações — aplique pelo fluxo de progressão de cada ficha." :
        "Desfecho: derrota (p. 90–91). Resolva o acidente; o mestre confirma os destinos de personagens e reféns." };
    },

    /* Fim da missão: os temporários do Sonnenblume e o Apfelstrudel
       expiram nas fichas. */
    missao_encerrar: function (estado, o, ctx, efeitos) {
      var vg = exigirMissao(estado); if (!vg) return falha("Nenhuma missão Carcaças Vermelhas.");
      if (vg.carcacas.encerrada) return falha("A missão já foi encerrada.");
      definir(estado, efeitos, caminhoDaViagem(estado) + "/carcacas/encerrada", ctx.agora);
      var fichas = Object.keys(vg.carcacas.sonnenblume).map(function (pid) {
        efeitos.push({ tipo: "ficha", personagemId: pid, id: "expirar:" + vg.carcacas.id });
        return { personagemId: pid, acao: "expirar", dados: { missao: vg.carcacas.id, quando: ctx.agora, op: ctx.opId } };
      });
      return { ok: true, texto: "Missão encerrada. Os pontos temporários do Sonnenblume e o Apfelstrudel expiram.", fichas: fichas };
    },

    /* Desfazer uma operação: os efeitos dela voltam (e o que ela escreveu
       nas fichas). A linha original fica, marcada. */
    desfazer: function (estado, o, ctx) {
      var h = estado.historico.filter(function (x) { return x.id === o.alvo; })[0];
      if (!h) return falha("Operação desconhecida.");
      if (h.desfeitoEm) return falha("Essa operação já foi desfeita.");
      if (h.tipo === "desfazer") return falha("Desfazer um desfazer não é permitido: refaça a operação.");
      if (h.tipo === "ligar") return falha("Ligue ou desligue de novo pelas configurações.");
      var fichas = desfazerEfeitos(estado, h.efeitos);
      h.desfeitoEm = ctx.agora;
      h.desfeitoPor = texto(ctx.autorNome, 80);
      return { ok: true, texto: "Desfeito: " + h.texto, desfaz: h.id,
        fichas: fichas.map(function (f) { return { personagemId: f.personagemId, acao: String(f.id).indexOf("expirar:") === 0 ? "reverterExpiracao" : "desfazer", dados: { id: String(f.id).replace(/^expirar:/, ""), op: ctx.opId } }; }) };
    },
  };

  function rodadaAtual(cf) {
    var r = cf.rodadas.filter(function (x) { return x.n === cf.rodada; })[0];
    if (!r) { r = { id: "r" + cf.rodada, n: cf.rodada, passageiros: [], motoristas: [], fim: null }; cf.rodadas.push(r); }
    return r;
  }
  function dtDoMotorista(sucessosDosPassageiros) {
    return CONFRONTO.dtMotorista - CONFRONTO.reducaoPorSucesso * Math.max(0, sucessosDosPassageiros || 0);
  }

  function rotuloDaEtapa(e) {
    if (e.rotulo) return e.rotulo;
    var nomes = { partida: "Partida", encontro: "Encontro aleatório", fixo: "Encontro fixo", parada: "Parada", chegada: "Chegada", cena: "Cena" };
    return (nomes[e.tipo] || e.tipo) + (e.periodo ? " (" + e.periodo + ")" : "");
  }

  function montarEtapas(vg, ctx) {
    var saida = [];
    var n = 0;
    var dias = vg.modulo === "longa" ? vg.dias : 1;
    for (var d = 1; d <= dias; d++) {
      etapasDoModulo(vg.modulo, vg.velocidade).forEach(function (e) {
        n++;
        saida.push(normalizarEtapa({ id: novoIdDe(ctx, "e" + n), tipo: e.tipo, periodo: e.periodo, rotulo: e.rotulo ? e.rotulo + (dias > 1 ? " · dia " + d : "") : (dias > 1 ? rotuloDaEtapa(e) + " · dia " + d : ""),
          revelada: e.tipo !== "encontro", origem: "Módulo " + MODULOS[vg.modulo].nome.toLowerCase() + " (" + ref(38) + ")" }));
      });
    }
    return saida.slice(0, MAX_ETAPAS);
  }

  function montarTeste(t, v, vg, chave) {
    var dt = dtDoTeste(t, vg.velocidade);
    var pericia = t.pericia;
    var automatico = false;
    var rot = t.rotuloTeste || "";
    if (pericia === "pilotagem" && v && (POR_VEICULO[v.modelo] || {}).pericia) pericia = POR_VEICULO[v.modelo].pericia;
    if (pericia === "navegacao" && v) {
      var nav = periciaDeNavegacao(v);
      automatico = !!nav.automatico;
      pericia = nav.automatico ? "navegacao" : nav.pericia;
      rot = rot || "Navegação: " + (nav.nota || "");
    }
    return normalizarTeste({ chave: chave || "", pericia: pericia, dt: dt, papel: t.papel, rotulo: rot + (t.ajuda ? (rot ? " · " : "") + "com ajuda dos demais" : ""), automatico: automatico, sucesso: automatico ? true : null });
  }

  function prepararEvento(reg, ev, v, vg, ctx) {
    var m = POR_VEICULO[v.modelo] || {};
    var testes = lista(ev.testes);
    var sempre = lista(ev.sempre);
    var prefixo = "t";
    if (ev.chave === "temperatura") sempre = lista(ev.semAr);
    if (ev.seEletrico && m.eletrico) { testes = lista(ev.seEletrico.testes); sempre = lista(ev.seEletrico.sempre); prefixo = "e"; }
    if (ev.seVelho && m.velho) sempre = sempre.concat(lista(ev.seVelho.sempre));
    testes.forEach(function (t, i) {
      if (t.soImprudente && vg.velocidade !== "imprudente") return;
      reg.testes.push(montarTeste(t, v, vg, prefixo + i));
    });
    sempre.forEach(function (c, i) {
      if (c.soImprudente && vg.velocidade !== "imprudente") return;
      reg.consequencias.push(normalizarConsequencia({ id: novoIdDe(ctx, "c" + reg.tabela.slice(0, 3) + i), tipo: c.tipo, texto: textoDaConsequencia(c, v), dados: c }));
    });
    /* Testes automáticos (conhece o caminho) já liberam o sucesso. */
    reg.testes.forEach(function (t) {
      if (!t.automatico) return;
      var def = testes.filter(function (x, i) { return prefixo + i === t.chave; })[0];
      lista(def && def.sucesso).forEach(function (c, i) {
        reg.consequencias.push(normalizarConsequencia({ id: novoIdDe(ctx, "ca" + reg.tabela.slice(0, 3) + i), tipo: c.tipo, texto: textoDaConsequencia(c, v), dados: c }));
      });
    });
  }

  function acharDefinicaoDoTeste(def, ev, i) {
    if (!def) return null;
    var t = ev.testes[i];
    var m = /^([te])(\d)$/.exec(t.chave || "");
    if (m) return (m[1] === "e" ? lista(def.seEletrico && def.seEletrico.testes) : lista(def.testes))[Number(m[2])] || null;
    var opc = lista(def.opcoes).filter(function (x) { return x.chave === t.chave; })[0];
    return opc ? opc.teste : null;
  }

  function textoDaConsequencia(c, v) {
    switch (c.tipo) {
      case "acidente": return "Acidente (p. 54)" + (c.semFreio ? ", sem freio" : "") + ".";
      case "encontros": return "Mais " + c.n + " etapa" + (c.n > 1 ? "s" : "") + " de encontro aleatório no itinerário.";
      case "condicao": return (c.alvo === "motorista" ? "Motorista " : "Ocupantes ") + c.texto + ".";
      case "perda": return perdaEmTexto(c);
      case "veiculo": return c.texto || ("Veículo: " + c.estado + ".");
      case "vazamento": return "Vazamento: autonomia pela metade até o conserto em oficina.";
      case "semEletronica": return "Sem GPS e aparelhos eletrônicos: navegação por aparelho vira mapa estático.";
      case "reserva": return (c.delta < 0 ? "Usa 1 " : "Repõe 1 ") + c.item + " de reserva.";
      case "penalidade": return c.texto + ".";
      case "infracao": return "Multa e pontos na carteira do motorista (velocidade imprudente).";
      case "pressagio": return "Presságio ruim: ocupantes abalados até o fim da viagem (na reincidência, apavorados — Vontade DT 30 evita).";
      case "acidentePossivel": return "Acidente possível conforme os ocupantes " + (c.condicao || "afetados") + " (normalmente motorista e passageiro da frente): confirme ou descarte.";
      case "combate": return "O mestre pode trocar o encontro por um combate contra uma criatura de " + c.elemento + ".";
      case "segredo": return "Um personagem aleatório revela o maior segredo em voz alta.";
      case "estendido": return "Teste estendido aberto em grupo (DT " + c.dt + ", " + c.sucessos + " sucessos).";
      case "nota": return c.texto;
      default: return c.texto || c.tipo;
    }
  }
  function perdaEmTexto(c) {
    var alvo = c.alvo === "motorista" ? "O motorista" : c.alvo === "agentes" ? "Cada agente" : "Cada ocupante";
    return alvo + " perde " + c.partes.map(function (p) { return p.dado + " " + String(p.recurso || p.tipo).toUpperCase(); }).join(" e ") +
      (c.condicao ? " e fica " + c.condicao + (c.duracao ? " por " + c.duracao : "") : "") + (c.extra ? " e " + c.extra.dado + " " + c.extra.rotulo : "") +
      (c.resistencia ? " (" + NOMES_PERICIA[c.resistencia.pericia] + " DT " + c.resistencia.dt + " " + c.resistencia.texto + ")" : "") + ".";
  }

  function acharEvento(vg, encontroId, indice) {
    var enc = vg.encontros.filter(function (e) { return e.id === encontroId; })[0];
    if (!enc || enc.desfeito) return null;
    var i = inteiro(indice, 0, 1, 0);
    var ev = enc.eventos[i];
    return ev ? { enc: enc, ev: ev, indice: i } : null;
  }
  function acharConsequencia(vg, id) {
    var achado = null;
    vg.encontros.forEach(function (enc) {
      enc.eventos.forEach(function (ev, i) {
        ev.consequencias.forEach(function (c) {
          if (c.id === id) achado = { c: c, enc: enc, ev: ev, indice: i, caminho: "viagens/" + vg.id + "/encontros/" + enc.id + "/eventos/" + i + "/consequencias/" + c.id };
        });
      });
    });
    return achado;
  }
  function acharEstendido(estado, vg, id) {
    var x = vg.estendidos.filter(function (e) { return e.id === id; })[0];
    if (x) return { x: x, caminho: "viagens/" + vg.id + "/estendidos/" + x.id };
    if (vg.carcacas) {
      x = vg.carcacas.estendidos.filter(function (e) { return e.id === id; })[0];
      if (x) return { x: x, caminho: "viagens/" + vg.id + "/carcacas/estendidos/" + x.id };
    }
    return null;
  }

  function proporConsequencias(estado, efeitos, achado, cons, vg, ctx, sufixo) {
    if (!cons.length) return;
    var v = veiculo(vg, achado.enc.veiculoId);
    var base = "viagens/" + vg.id + "/encontros/" + achado.enc.id + "/eventos/" + achado.indice;
    cons.forEach(function (c, i) {
      if (c.soImprudente && vg.velocidade !== "imprudente") return;
      if (c.tipo === "estendido") { criarEstendido(estado, efeitos, vg, Object.assign({ rotulo: "Teste estendido em grupo" }, c), { encontroId: achado.enc.id, indice: achado.indice }, ctx); return; }
      if (achado.ev.consequencias.length >= 16) return;
      adicionar(estado, efeitos, base + "/consequencias", normalizarConsequencia({ id: novoIdDe(ctx, sufixo + i), tipo: c.tipo, texto: textoDaConsequencia(c, v), dados: c }));
    });
  }

  function criarEstendido(estado, efeitos, vg, def, liga, ctx) {
    var x = normalizarEstendido({ id: novoIdDe(ctx, "x" + (vg.estendidos.length + (vg.carcacas ? vg.carcacas.estendidos.length : 0) + 1)), rotulo: def.rotulo, dt: def.dt, sucessos: def.sucessos, falhas: def.falhas || 3,
      vitoria: def.vitoria, derrota: def.derrota, porFalha: def.porFalha || "", encontroId: liga && liga.encontroId, cena: def.cena || 0,
      derrotaPerseguicao: def.derrotaPerseguicao || 0, derrotaAcidente: def.derrotaAcidente || "" });
    if (def.carcacas && vg.carcacas) adicionar(estado, efeitos, "viagens/" + vg.id + "/carcacas/estendidos", x, null, 12);
    else adicionar(estado, efeitos, "viagens/" + vg.id + "/estendidos", x, null, 20);
    if (liga && liga.encontroId) {
      var cam = "viagens/" + vg.id + "/encontros/" + liga.encontroId + "/eventos/" + liga.indice + "/estendidos";
      var atual = lista(ler(estado, cam));
      definir(estado, efeitos, cam, atual.concat([x.id]).slice(0, 4));
    }
    return x;
  }

  function proporDoEstendido(estado, efeitos, vg, x, cons, ctx) {
    if (!x.encontroId) {
      /* Da missão: só registra; o mestre aplica pelo roteiro. */
      return;
    }
    var enc = vg.encontros.filter(function (e) { return e.id === x.encontroId; })[0];
    if (!enc) return;
    var i = 0;
    enc.eventos.forEach(function (ev, k) { if (ev.estendidos.indexOf(x.id) >= 0) i = k; });
    proporConsequencias(estado, efeitos, { enc: enc, ev: enc.eventos[i], indice: i }, lista(cons), vg, ctx, "xf");
  }

  /* Uma perda ou dano registrado: o servidor rola por alvo (ou uma vez
     só, para área) e grava; cada alvo depois diz se passou na
     resistência. Nada é tirado de ficha nenhuma. */
  function registrarPerda(estado, efeitos, vg, def, ctx) {
    var alvos = [];
    var v = def.veiculo || null;
    if (def.alvosExplicitos) def.alvosExplicitos.forEach(function (pid) { alvos.push({ personagemId: pid, nome: nomeDe(ctx, pid) }); });
    else if (def.alvo === "motorista") { var mv = v || vg.veiculos[0]; if (mv && (mv.motorista.personagemId || mv.motorista.nome)) alvos.push({ personagemId: mv.motorista.personagemId, nome: mv.motorista.personagemId ? nomeDe(ctx, mv.motorista.personagemId, mv.motorista.nome) : mv.motorista.nome }); }
    else if (def.alvo === "agentes" && vg.carcacas) vg.carcacas.agentes.forEach(function (pid) { alvos.push({ personagemId: pid, nome: nomeDe(ctx, pid) }); });
    else {
      var vs = v ? [v] : vg.veiculos;
      vs.forEach(function (x) { x.ocupantes.forEach(function (p) { if (def.alvo === "agentes" && !p.personagemId) return; alvos.push({ personagemId: p.personagemId, nome: p.personagemId ? nomeDe(ctx, p.personagemId, p.nome) : p.nome }); }); });
    }
    lista(def.nomes).forEach(function (n) { alvos.push({ personagemId: "", nome: n }); });
    if (!alvos.length) alvos.push({ personagemId: "", nome: def.alvo === "motorista" ? "Motorista" : "Ocupantes (sem lista)" });
    var unico = def.unico ? def.partes.map(function (p) { return rolarExpr(ctx.rolar, p.dado); }) : null;
    var registro = normalizarRegistroDeEfeito({
      id: novoIdDe(ctx, "rg" + vg.registros.length), tipo: def.tipo || "perda", origem: def.origem, condicao: def.condicao || "", resistencia: def.resistencia || null, em: ctx.agora,
      alvos: alvos.map(function (a) {
        return {
          personagemId: a.personagemId, nome: a.nome,
          partes: def.partes.map(function (p, i) {
            var r = unico ? unico[i] : rolarExpr(ctx.rolar, p.dado);
            var total = p.metade ? Math.floor(r.total / 2) : r.total;
            return { recurso: p.recurso || "", tipo: p.tipo || "", dado: p.dado + (p.metade ? " (metade)" : ""), valores: r.valores, total: total };
          }),
          extra: def.extra ? { rotulo: def.extra.rotulo, total: rolarExpr(ctx.rolar, def.extra.dado).total } : null,
          duracao: def.duracao ? { texto: def.duracao, total: rolarExpr(ctx.rolar, String(def.duracao).split(" ")[0]).total } : null,
          passou: def.resistencia ? null : null,
        };
      }),
    });
    adicionar(estado, efeitos, "viagens/" + vg.id + "/registros", registro, null, 60);
    return registro;
  }

  function marcarResistencia(estado, o, ctx, efeitos) {
    var vg = exigirViagem(estado); if (!vg) return falha("Nenhuma viagem.");
    var r = vg.registros.filter(function (x) { return x.id === o.registro; })[0]; if (!r) return falha("Registro desconhecido.");
    if (!r.resistencia) return falha("Esse registro não tem resistência.");
    var i = inteiro(o.alvo, 0, r.alvos.length - 1, 0);
    var a = r.alvos[i]; if (!a) return falha("Alvo desconhecido.");
    definir(estado, efeitos, "viagens/" + vg.id + "/registros/" + r.id + "/alvos/" + i + "/passou", o.passou === true ? true : o.passou === false ? false : null);
    return { ok: true, texto: a.nome + ": " + NOMES_PERICIA[r.resistencia.pericia] + " DT " + r.resistencia.dt + " — " + (o.passou === true ? "passou (" + r.resistencia.texto + ")" : o.passou === false ? "falhou" : "a conferir") + "." };
  }

  function efetivarConsequencia(estado, efeitos, vg, c, achado, ctx, o) {
    var d = c.dados || {};
    var v = veiculo(vg, achado.enc.veiculoId);
    var vb = v ? "viagens/" + vg.id + "/veiculos/" + v.id : "";
    switch (c.tipo) {
      case "encontros": {
        var atual = etapaAtual(vg);
        var pos = atual ? vg.etapas.indexOf(atual) + 1 : vg.etapas.length;
        var chegada = vg.etapas.map(function (e) { return e.tipo; }).lastIndexOf("chegada");
        if (chegada >= 0 && pos > chegada) pos = chegada;
        for (var i = 0; i < (d.n || 1); i++) {
          if (vg.etapas.length >= MAX_ETAPAS) break;
          adicionar(estado, efeitos, "viagens/" + vg.id + "/etapas", normalizarEtapa({ id: novoIdDe(ctx, "ex" + i), tipo: "encontro", rotulo: "Encontro aleatório (acrescentado)", origem: "Consequência: " + c.texto }), pos);
        }
        return { ok: true };
      }
      case "acidente":
      case "acidentePossivel": {
        if (!v) return falha("Sem veículo para o acidente.");
        var r = OPS.acidente(estado, { veiculoId: v.id, encontroId: achado.enc.id, outro: o.outro || "sortear", causa: { semFreio: !!d.semFreio, paranormal: achado.ev.tabela === "paranormal" } }, ctx, efeitos);
        return r.ok ? { ok: true, texto: r.texto, resultado: r.resultado } : r;
      }
      case "perda": {
        var reg = registrarPerda(estado, efeitos, vg, Object.assign({}, d, { veiculo: v, origem: (eventoPorChave(achado.ev.chave) || {}).nome || "Encontro" }), ctx);
        definir(estado, efeitos, achado.caminho + "/registro", reg.id);
        return { ok: true, texto: "valores rolados no registro.", resultado: { registro: reg.id } };
      }
      case "veiculo":
        if (!v) return falha("Sem veículo.");
        definir(estado, efeitos, vb + "/estado", d.estado);
        return { ok: true };
      case "vazamento":
        if (!v) return falha("Sem veículo.");
        definir(estado, efeitos, vb + "/vazamento", true);
        if (v.autonomiaRestante > autonomiaMaxima(v, ctx.vinculados)) definir(estado, efeitos, vb + "/autonomiaRestante", autonomiaMaxima(v, ctx.vinculados));
        return { ok: true };
      case "semEletronica":
        if (!v) return falha("Sem veículo.");
        definir(estado, efeitos, vb + "/semEletronica", true);
        return { ok: true };
      case "reserva":
        if (!v) return falha("Sem veículo.");
        if (v.vinculo) return { ok: true, texto: "veículo vinculado: dê baixa na ficha (Veículos Operacionais)." };
        if (!somar(estado, efeitos, vb + "/reservas/" + d.item, d.delta, 0, contar(v.equipamentos, d.item))) return falha("Não há " + d.item + " de reserva.");
        return { ok: true };
      case "penalidade": {
        if (!v) return falha("Sem veículo.");
        var pens = v.penalidades.filter(function (p) { return p.chave !== d.chave; }).concat([{ chave: d.chave, dados: d.dados, texto: d.texto }]);
        definir(estado, efeitos, vb + "/penalidades", pens);
        return { ok: true };
      }
      case "infracao": {
        if (!v) return falha("Sem veículo.");
        somar(estado, efeitos, vb + "/infracoes", 1, 0, 9);
        return { ok: true, texto: v.infracoes >= 3 ? "terceira infração: o motorista perde a carteira e sofre –2d20 para evitar a polícia até resolver (p. 46)." : v.infracoes + "ª infração." };
      }
      case "pressagio": {
        somar(estado, efeitos, "viagens/" + vg.id + "/pressagios", 1, 0, 9);
        if (vg.pressagios >= 2) {
          adicionar(estado, efeitos, achado.caminho.replace(/\/consequencias\/[^/]+$/, "/consequencias"),
            normalizarConsequencia({ id: novoIdDe(ctx, "pa"), tipo: "acidentePossivel", texto: textoDaConsequencia({ tipo: "acidentePossivel", condicao: "apavorados" }), dados: { tipo: "acidentePossivel" } }));
          return { ok: true, texto: "reincidência: os ocupantes ficam apavorados (Vontade DT 30 evita)." };
        }
        return { ok: true };
      }
      default:
        return { ok: true };
    }
  }

  /* =================================================================
     A VISTA DO JOGADOR
     -----------------------------------------------------------------
     Sem notas do mestre, sem encontros futuros, sem etapas fixas ainda
     não reveladas, sem as remissões da missão e sem as linhas privadas
     do histórico. Os registros que não envolvem personagem do jogador
     continuam (a mesa vê o que aconteceu na estrada).
     ================================================================= */

  function vistaDoJogador(estado, meus) {
    var mine = lista(meus);
    var vg = viagemAtual(estado);
    var saida = { ativo: estado.ativo, viagem: null, historico: [] };
    if (!estado.ativo || !vg) return saida;
    var atual = etapaAtual(vg);
    var idxAtual = atual ? vg.etapas.indexOf(atual) : vg.etapas.length;
    var etapasVistas = vg.etapas.filter(function (e, i) {
      if (e.desfeita) return false;
      if (i <= idxAtual) return true;
      return e.tipo === "partida" || e.tipo === "parada" || e.tipo === "chegada" || ((e.tipo === "fixo" || e.tipo === "cena") && e.revelada);
    }).map(function (e) {
      var esconder = (e.tipo === "fixo" || e.tipo === "cena") && !e.revelada;
      return { id: e.id, tipo: esconder ? "encontro" : e.tipo, periodo: e.periodo, rotulo: esconder ? "Encontro" : e.rotulo, feita: e.feita, atual: e === atual, nota: e.revelada && e.tipo === "fixo" ? e.nota : "" };
    });
    var visiveis = {};
    etapasVistas.forEach(function (e) { visiveis[e.id] = true; });
    saida.viagem = {
      id: vg.id, nome: vg.nome, origem: vg.origem, destino: vg.destino, metodo: vg.metodo, modulo: vg.modulo, velocidade: vg.velocidade, dias: vg.dias,
      etapas: etapasVistas, concluida: vg.concluida, pressagios: vg.pressagios,
      veiculos: vg.veiculos.map(function (v) { return copia(v); }),
      encontros: vg.encontros.filter(function (e) { return !e.segredo && !e.desfeito && (!e.etapaId || visiveis[e.etapaId]); }).map(function (e) { return copia(e); }),
      acidentes: vg.acidentes.filter(function (a) { return !a.desfeito; }).map(function (a) { return copia(a); }),
      registros: vg.registros.filter(function (r) { return !r.desfeito; }).map(function (r) { return copia(r); }),
      estendidos: vg.estendidos.filter(function (x) { return !x.desfeito; }).map(function (x) { return copia(x); }),
      granular: vg.granular ? { distancia: vg.granular.distancia, percorrido: vg.granular.percorrido, dt: vg.granular.dt, trechos: copia(vg.granular.trechos) } : null,
      carcacas: null,
    };
    if (vg.carcacas) {
      var cv = vg.carcacas;
      saida.viagem.carcacas = {
        id: cv.id, iniciada: cv.iniciada, velocidade: cv.velocidade, agentes: cv.agentes.slice(), meus: cv.agentes.filter(function (pid) { return mine.indexOf(pid) >= 0; }),
        perseguicao: cv.perseguicao, caca: copia(cv.caca), cena: cv.cena, cenasVistas: cv.cenasVistas.slice(),
        sonnenblume: copia(cv.sonnenblume), explosao: cv.explosao ? { contador: cv.explosao.contador, acoes: copia(cv.explosao.acoes), registro: cv.explosao.registro } : null,
        estendidos: cv.estendidos.filter(function (x) { return !x.desfeito; }).map(function (x) { return copia(x); }),
        confronto: cv.confronto ? copia(cv.confronto) : null, encerrada: cv.encerrada, desfecho: cv.desfecho ? copia(cv.desfecho) : null,
      };
    }
    saida.historico = estado.historico.filter(function (h) { return !h.privado && (!h.viagem || h.viagem === vg.id); }).slice(-60).map(function (h) {
      return { id: h.id, tipo: h.tipo, texto: h.texto, autorNome: h.autorNome, em: h.em, desfeitoEm: h.desfeitoEm, resultado: h.tipo === "caca_gastar" ? copia(h.resultado) : null };
    });
    return saida;
  }

  /* O resultado gravado de uma operação (para a repetição). */
  function resultadoDe(estado, opId) {
    var h = estado.historico.filter(function (x) { return x.id === opId; })[0];
    return h ? { texto: h.texto, resultado: h.resultado } : null;
  }

  /* =================================================================
     NA FICHA (`ordem.arquivo11`): os temporários do Sonnenblume e o
     Apfelstrudel, com a origem e a missão. Usado pelo servidor (que
     escreve) e pela ficha (que normaliza e mostra).
     ================================================================= */

  var RECURSOS_TEMP = ["pv", "pe", "san"];

  function normalizarArquivo11(bruto) {
    var b = obj(bruto);
    return {
      temporarios: unicoPorId(lista(b.temporarios).map(function (t) {
        var x = obj(t);
        var id = idOk(x.id);
        if (!id || RECURSOS_TEMP.indexOf(x.recurso) < 0) return null;
        return { id: id, recurso: x.recurso, valor: inteiro(x.valor, 0, 999, 0), origem: texto(x.origem, 120), missao: idOk(x.missao),
          expirado: carimbo(x.expirado), expirou: inteiro(x.expirou, 0, 999, 0), desfeito: x.desfeito === true };
      }).filter(Boolean)).slice(-24),
      efeitos: unicoPorId(lista(b.efeitos).map(function (t) {
        var x = obj(t);
        var id = idOk(x.id);
        if (!id || !POR_CARDAPIO[x.chave]) return null;
        return { id: id, chave: x.chave, origem: texto(x.origem, 120), missao: idOk(x.missao), expirado: carimbo(x.expirado), desfeito: x.desfeito === true };
      }).filter(Boolean)).slice(-12),
      usos: lista(b.usos).map(idOk).filter(Boolean).slice(-60),
    };
  }

  /* Aplica numa ficha de Ordem (o bloco `ordem`) o que a operação pediu.
     Devolve true se mudou. A mesma escrita duas vezes (id repetido) não
     muda nada. */
  function aplicarNaFicha(ordem, pedido) {
    if (!ordem || typeof ordem !== "object") return false;
    ordem.arquivo11 = normalizarArquivo11(ordem.arquivo11);
    if (!ordem.temporarios || typeof ordem.temporarios !== "object") ordem.temporarios = { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: 0 };
    var a = ordem.arquivo11;
    var d = obj(pedido.dados);
    var t;
    if (pedido.acao === "temporario") {
      if (a.temporarios.some(function (x) { return x.id === d.id; })) return false;
      var valor = inteiro(d.valor, 0, 999, 0);
      ordem.temporarios[d.recurso] = Math.min(999, (inteiro(ordem.temporarios[d.recurso], 0, 999, 0)) + valor);
      a.temporarios.push({ id: d.id, recurso: d.recurso, valor: valor, origem: texto(d.origem, 120), missao: idOk(d.missao), expirado: "", expirou: 0, desfeito: false });
      return true;
    }
    if (pedido.acao === "efeito") {
      if (a.efeitos.some(function (x) { return x.id === d.id; })) return false;
      a.efeitos.push({ id: d.id, chave: d.chave, origem: texto(d.origem, 120), missao: idOk(d.missao), expirado: "", desfeito: false });
      return true;
    }
    /* Expirar no fim da missão: sai o menor entre o que a origem deu e
       os temporários daquele recurso que a ficha ainda tem (o consumido
       já saiu; os permanentes não são tocados). */
    if (pedido.acao === "expirar") {
      var mudou = false;
      a.temporarios.forEach(function (x) {
        if (x.missao !== d.missao || x.expirado || x.desfeito) return;
        var pool = inteiro(ordem.temporarios[x.recurso], 0, 999, 0);
        var tira = Math.min(x.valor, pool);
        ordem.temporarios[x.recurso] = pool - tira;
        x.expirado = carimbo(d.quando) || new Date().toISOString();
        x.expirou = tira;
        mudou = true;
      });
      a.efeitos.forEach(function (x) { if (x.missao === d.missao && !x.expirado && !x.desfeito) { x.expirado = carimbo(d.quando) || new Date().toISOString(); mudou = true; } });
      return mudou;
    }
    /* Desfazer o encerramento: o que expirou volta. */
    if (pedido.acao === "reverterExpiracao") {
      var m2 = false;
      a.temporarios.forEach(function (x) {
        if (x.missao !== d.id || !x.expirado || x.desfeito) return;
        ordem.temporarios[x.recurso] = Math.min(999, inteiro(ordem.temporarios[x.recurso], 0, 999, 0) + x.expirou);
        x.expirado = ""; x.expirou = 0; m2 = true;
      });
      a.efeitos.forEach(function (x) { if (x.missao === d.id && x.expirado && !x.desfeito) { x.expirado = ""; m2 = true; } });
      return m2;
    }
    /* Desfazer a concessão: tira o que ainda resta dela. */
    if (pedido.acao === "desfazer") {
      t = a.temporarios.filter(function (x) { return x.id === d.id; })[0];
      if (t && !t.desfeito) {
        if (!t.expirado) {
          var p = inteiro(ordem.temporarios[t.recurso], 0, 999, 0);
          ordem.temporarios[t.recurso] = p - Math.min(t.valor, p);
        }
        t.desfeito = true;
        return true;
      }
      var e = a.efeitos.filter(function (x) { return x.id === d.id; })[0];
      if (e && !e.desfeito) { e.desfeito = true; return true; }
      return false;
    }
    return false;
  }

  /* O Apfelstrudel vale nesta ficha agora? */
  function apfelstrudelAtivo(ordem) {
    var a = ordem && ordem.arquivo11;
    return !!(a && lista(a.efeitos).some(function (x) { return x.chave === "apfelstrudel" && !x.expirado && !x.desfeito; }));
  }

  global.RAMAViagens = {
    VEICULOS: VEICULOS, POR_VEICULO: POR_VEICULO, MODELOS_AS3: MODELOS_AS3, REGALIAS_NA_VIAGEM: REGALIAS_NA_VIAGEM, CHAVES_AS11: CHAVES_AS11,
    MODULOS: MODULOS, NAVEGACAO: NAVEGACAO, NOMES_PERICIA: NOMES_PERICIA, TABELA_PRINCIPAL: TABELA_PRINCIPAL, NOMES_TABELA: NOMES_TABELA, SUBTABELAS: SUBTABELAS,
    OUTROS_ENVOLVIDOS: OUTROS_ENVOLVIDOS, RESULTADOS_ACIDENTE: RESULTADOS_ACIDENTE, MISSAO: MISSAO, CENAS: CENAS, POR_CENA: POR_CENA, CARDAPIO: CARDAPIO, REMISSOES: REMISSOES,
    FALHAS_DO_PASSAGEIRO: FALHAS_DO_PASSAGEIRO, CONFRONTO: CONFRONTO, OPS_DO_MESTRE: OPS_DO_MESTRE, OPS_DO_JOGADOR: OPS_DO_JOGADOR,
    etapasDoModulo: etapasDoModulo, linhaPrincipal: linhaPrincipal, eventoDaTabela: eventoDaTabela, eventoPorChave: eventoPorChave, aplicabilidade: aplicabilidade,
    outroEnvolvido: outroEnvolvido, outroPorChave: outroPorChave, resultadoDoAcidente: resultadoDoAcidente, composicaoDoAcidente: composicaoDoAcidente,
    refensPeloContador: refensPeloContador, falhaDoPassageiro: falhaDoPassageiro, dtDoMotorista: dtDoMotorista,
    equipamentoDeSerie: equipamentoDeSerie, autonomiaMaxima: autonomiaMaxima, periciaDeNavegacao: periciaDeNavegacao, notasDoMotorista: notasDoMotorista,
    regaliasDoVinculo: regaliasDoVinculo, temItem: temItem, rotuloDaEtapa: rotuloDaEtapa, perdaEmTexto: perdaEmTexto,
    normalizar: normalizar, normalizarViagem: normalizarViagem, estadoVazio: estadoVazio, viagemAtual: viagemAtual, etapaAtual: etapaAtual, veiculo: veiculo,
    aplicar: aplicar, vistaDoJogador: vistaDoJogador, resultadoDe: resultadoDe,
    normalizarArquivo11: normalizarArquivo11, aplicarNaFicha: aplicarNaFicha, apfelstrudelAtivo: apfelstrudelAtivo,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/ordem/viagens.js */

var MAX_OPS_VIAGENS = 80;

function registroDasViagens(campanhaId) {
  try {
    return acharPor(ABAS.CAMPANHA_VIAGENS, 'campanhaId', String(campanhaId));
  } catch (erro) {
    /* Sem a aba (setupRama desta versão ainda não rodou): desligada. */
    return null;
  }
}

function viagensAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_VIAGENS).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function estadoDasViagens(registro) {
  return RAMAViagens.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function roladorDeViagem(faces) {
  var f = Math.max(1, Math.floor(Number(faces) || 1));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) n = n * 256 + ((bytes[i] + 256) % 256);
  return (n % f) + 1;
}

/* As fichas de Ordem da campanha (id, nome, dono). */
function personagensDaViagem(campanhaId) {
  return daCampanhaLeves(ABAS.PERSONAGENS, campanhaId).map(function (r) {
    return { id: String(r.id), nome: String(r.nome || '').slice(0, 80), ownerId: String(r.ownerId || '') };
  });
}

/* Os veículos operacionais (AS3) das fichas da campanha — só leitura.
   `ids`: só estas fichas (as dos vínculos); vazio = todas. */
function veiculosOperacionaisDaCampanha(campanhaId, ids) {
  var saida = {};
  var lista = daCampanhaLeves(ABAS.PERSONAGENS, campanhaId).filter(function (r) { return !ids || ids.indexOf(String(r.id)) >= 0; });
  lista.forEach(function (leve) {
    /* A linha leve não traz a ficha: a inteira, pelo id. */
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(leve.id));
    if (!reg) return;
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) return;
    var ficha = lido.ficha;
    if (!ehFichaDeOrdem(ficha)) return;
    var a3 = ficha.ordem && ficha.ordem.arquivo3;
    var veiculos = a3 && Array.isArray(a3.veiculos) ? a3.veiculos : [];
    veiculos.forEach(function (v) {
      if (!v || !v.id || !RAMAViagens.MODELOS_AS3[v.modelo]) return;
      var m = RAMAViagens.MODELOS_AS3[v.modelo];
      var regs = (Array.isArray(v.regalias) ? v.regalias : []).map(function (r) { return r && r.chave ? String(r.chave) : ''; }).filter(Boolean);
      saida[String(reg.id) + '|' + String(v.id)] = {
        personagemId: String(reg.id), personagemNome: String(reg.nome || '').slice(0, 80), veiculoId: String(v.id),
        nome: String(v.nome || m.nome).slice(0, 80), modelo: v.modelo, modeloNome: m.nome, categoria: m.categoria, tamanho: m.tamanho,
        pvAtual: Math.round(Number(v.pvAtual)) || 0, pvMaximo: m.pv, combustivel: Math.round(Number(v.combustivel)) || 0,
        regalias: regs, defeitos: Array.isArray(v.defeitos) ? v.defeitos.slice(0, 16) : [],
      };
    });
  });
  return saida;
}

function vinculadosDoEstado(ctx, estado) {
  var ids = [];
  estado.viagens.forEach(function (vg) {
    vg.veiculos.forEach(function (v) { if (v.vinculo && ids.indexOf(v.vinculo.personagemId) < 0) ids.push(v.vinculo.personagemId); });
  });
  return ids.length ? veiculosOperacionaisDaCampanha(ctx.campanha.id, ids) : {};
}

function viagensParaCliente(ctx, registro, usuario, opcoes) {
  var estado = estadoDasViagens(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  var vinculados = vinculadosDoEstado(ctx, estado);
  var personagens = personagensDaViagem(ctx.campanha.id).map(function (p) { return { id: p.id, nome: p.nome }; });
  if (ctx.mestre) {
    var saida = { mestre: true, rev: rev, estado: estado, vinculados: vinculados, personagens: personagens };
    if (opcoes && opcoes.incluirVeiculos) saida.veiculosOperacionais = veiculosOperacionaisDaCampanha(ctx.campanha.id, null);
    return saida;
  }
  var meus = idsDosMeusPersonagens(ctx.campanha.id, usuario);
  return { mestre: false, rev: rev, vista: RAMAViagens.vistaDoJogador(estado, meus), vinculados: vinculados, personagens: personagens, meus: meus };
}

function acaoLerViagens(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'viagens');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var dados = viagensParaCliente(ctx, registroDasViagens(ctx.campanha.id), usuario, { incluirVeiculos: corpo.incluirVeiculos === true });
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoViagemOperar(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var op = corpo.operacao && typeof corpo.operacao === 'object' && !Array.isArray(corpo.operacao) ? corpo.operacao : null;
  if (!op) return { ok: false, erro: 'dados_invalidos' };
  var tipo = String(op.tipo || '');
  var V = RAMAViagens;
  var doMestre = V.OPS_DO_MESTRE.indexOf(tipo) >= 0;
  if (!doMestre && V.OPS_DO_JOGADOR.indexOf(tipo) < 0) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'viagens');
    if (foraDoSistema) return foraDoSistema;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
    if (doMestre && !ctx.mestre) return { ok: false, erro: 'sem_permissao' };
    /* Suplemento desligado na campanha: só desligar continua permitido. */
    if (!(tipo === 'ligar' && op.ativo !== true)) {
      var semSuplemento = exigirSuplemento(ctx, 'viagens', null);
      if (semSuplemento) return semSuplemento;
    }
    try {
      aba(ABAS.CAMPANHA_VIAGENS);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_VIAGENS' };
    }

    var registro = registroDasViagens(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    var estado = estadoDasViagens(registro);

    /* Repetição (resposta perdida, clique duplo): o resultado gravado. */
    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: viagensParaCliente(ctx, registro, usuario), resultado: V.resultadoDe(estado, opId) };
    }

    var personagens = personagensDaViagem(ctx.campanha.id);
    var meus = personagens.filter(function (p) { return p.ownerId === String(usuario.id); }).map(function (p) { return p.id; });
    var vinculados = tipo === 'veiculo' && op.acao === 'criar' && op.vinculo
      ? veiculosOperacionaisDaCampanha(ctx.campanha.id, [String(op.vinculo.personagemId || '')])
      : vinculadosDoEstado(ctx, estado);
    var r = V.aplicar(estado, op, {
      papel: ctx.mestre ? 'mestre' : 'jogador', autor: String(usuario.id), autorNome: String(usuario.nome || usuario.usuario || '').slice(0, 80),
      meus: meus, personagens: personagens.map(function (p) { return { id: p.id, nome: p.nome }; }), vinculados: vinculados,
      rolar: roladorDeViagem, agora: new Date().toISOString(), opId: opId,
    });
    if (!r.ok) return { ok: false, erro: 'operacao_recusada', motivo: r.motivo || '' };

    /* As fichas primeiro (cada uma com o opId), depois a mesa. */
    var gf = aplicarViagemNasFichas(ctx, r.fichas || [], opId);
    if (!gf.ok) return gf;

    var normalizado = V.normalizar(estado);
    var json = JSON.stringify(normalizado);
    var voltas = 0;
    /* O histórico e os registros antigos cedem primeiro. */
    while (json.length > MAX_CELULA && voltas < 30) {
      voltas++;
      normalizado.historico = normalizado.historico.slice(Math.ceil(normalizado.historico.length / 4) || 1);
      normalizado.viagens.forEach(function (vg) {
        if (vg.id === normalizado.atual) return;
        vg.encontros = vg.encontros.slice(Math.ceil(vg.encontros.length / 2) || 1);
        vg.registros = vg.registros.slice(Math.ceil(vg.registros.length / 2) || 1);
      });
      if (voltas > 10 && normalizado.viagens.length > 1) normalizado.viagens = normalizado.viagens.filter(function (vg, i) { return vg.id === normalizado.atual || i > 0; });
      json = JSON.stringify(normalizado);
    }
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_VIAGENS) feitas = feitas.slice(feitas.length - MAX_OPS_VIAGENS);
    var anteriorAtivo = registro ? (registro.ativo === true || String(registro.ativo) === 'true') : false;
    var novo = {
      campanhaId: String(ctx.campanha.id),
      ativo: normalizado.ativo,
      atualizadoEm: new Date().toISOString(),
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.CAMPANHA_VIAGENS, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.CAMPANHA_VIAGENS, novo);

    var partes = ['viagens'];
    if (anteriorAtivo !== normalizado.ativo) partes.push('campanha');
    marcarMesa(ctx.campanha.id, partes);
    return { ok: true, rev: revAtual + 1, dados: viagensParaCliente(ctx, registroDasViagens(ctx.campanha.id), usuario), resultado: { texto: r.texto, resultado: r.resultado } };
  });
}

/* O que a operação escreve nas fichas (Sonnenblume e a expiração), cada
   ficha com o opId: a repetição não escreve de novo. Só fichas de Ordem
   DESTA campanha. */
function aplicarViagemNasFichas(ctx, pedidos, opId) {
  if (!pedidos.length) return { ok: true, gravadas: 0 };
  var porFicha = {};
  pedidos.forEach(function (p) { (porFicha[p.personagemId] = porFicha[p.personagemId] || []).push(p); });
  var gravadas = 0;
  var ids = Object.keys(porFicha);
  for (var i = 0; i < ids.length; i++) {
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(ids[i]));
    if (!reg || String(reg.campanhaId || '') !== String(ctx.campanha.id)) continue;
    if (operacaoJaAplicada(reg, opId)) continue;
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) continue;
    var ficha = comVinculoDaColuna(lido.ficha, reg);
    if (!ehFichaDeOrdem(ficha)) continue;
    var mudou = false;
    porFicha[ids[i]].forEach(function (p) { if (RAMAViagens.aplicarNaFicha(ficha.ordem, p)) mudou = true; });
    if (!mudou) continue;
    var quando = new Date().toISOString();
    ficha.atualizadoEm = quando;
    reg.atualizadoEm = quando;
    reg.rev = (Number(reg.rev) || 0) + 1;
    var publicado = publicarFicha(reg, ficha, { operacao: opId });
    if (!publicado.ok) return Object.assign({ parcial: gravadas > 0 }, publicado);
    gravadas++;
  }
  if (gravadas) avisarMesas([ctx.campanha.id], ['personagens']);
  return { ok: true, gravadas: gravadas };
}

/* =====================================================================
   SINCRONIA CONECTIVA (v2.48 — Arquivos Secretos 5, p. 62)
   ---------------------------------------------------------------------
   "Você pode gastar PE de seres em sincronia com você" e "pode sofrer
   perda ou dano que seria sofrido por outro ser em sincronia". Mexer em
   OUTRA ficha só passa por aqui:

     · quem pede age pelo autor como dono ou mestre (não por
       compartilhamento) e é da campanha do pedido;
     · autor e alvo estão nessa campanha;
     · as DUAS fichas estão em sincronia uma com a outra — cada uma
       marcou a outra pela própria ficha (o consentimento do alvo está na
       ficha dele);
     · `pe`: o alvo tem os PE (o atual, ou o máximo do resumo quando está
       cheio); só o alvo é gravado;
     · `redirecionar`: só PV ou PE (nunca SAN); o autor sofre, o alvo fica
       com o registro;
     · o id da operação vai junto, em cada ficha tocada: repetir o pedido
       (resposta perdida) não cobra de novo, e uma falha no meio termina
       na repetição sem dobrar o que já foi feito.
   ===================================================================== */

var RECURSOS_DA_SINCRONIA = ['pv', 'pe'];

function sincroniaDaFicha(ficha) {
  var a = ficha && ficha.ordem && ficha.ordem.arquivo5;
  var t = a && a.transmissao;
  var s = t && t.sincronia;
  return s && typeof s === 'object' && s.id ? s : null;
}

function marcou(sincronia, personagemId) {
  return (Array.isArray(sincronia.participantes) ? sincronia.participantes : []).some(function (p) {
    return p && String(p.personagemId || '') === String(personagemId);
  });
}

function operacaoNaSincronia(sincronia, opId, papel) {
  return (Array.isArray(sincronia.operacoes) ? sincronia.operacoes : []).some(function (o) {
    return o && o.opId === opId && (!papel || o.papel === papel);
  });
}

function anotarNaSincronia(sincronia, op) {
  if (!Array.isArray(sincronia.operacoes)) sincronia.operacoes = [];
  sincronia.operacoes.push(op);
  if (sincronia.operacoes.length > 30) sincronia.operacoes = sincronia.operacoes.slice(-30);
}

/* O valor atual de um recurso da ficha: o gravado, ou o máximo do
   resumo (a ficha cheia grava `null`). Com "Jogando sem Sanidade", os
   PE viraram PD. */
function recursoAtualDoServidor(ficha, qual) {
  var r = ficha.ordem.recursos || {};
  var resumo = ficha.resumoRecursos || {};
  var chave = (qual === 'pe' && resumo.pd !== null && resumo.pd !== undefined) ? 'pd' : qual;
  var atual = r[chave];
  if (atual === null || atual === undefined) atual = resumo[chave];
  var n = Number(atual);
  return { chave: chave, valor: Number.isFinite(n) ? Math.round(n) : null };
}

function acaoSincroniaOperar(corpo, usuario) {
  var tipo = String(corpo.tipo || '');
  var opId = String(corpo.opId || '');
  var valor = Number(corpo.valor);
  if (tipo !== 'pe' && tipo !== 'redirecionar') return { ok: false, erro: 'dados_invalidos' };
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!Number.isFinite(valor) || valor < 1 || valor > 999 || Math.round(valor) !== valor) return { ok: false, erro: 'dados_invalidos' };
  var recurso = tipo === 'pe' ? 'pe' : String(corpo.recurso || '');
  if (RECURSOS_DA_SINCRONIA.indexOf(recurso) < 0) return { ok: false, erro: 'dados_invalidos' };
  var natureza = corpo.natureza === 'perda' ? 'perda' : 'dano';
  var campanhaId = String(corpo.campanhaId || '');
  var autorId = String(corpo.personagemId || '');
  var alvoId = String(corpo.alvoId || '');
  if (!campanhaId || !autorId || !alvoId || autorId === alvoId) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'sincronia');
    if (foraDoSistema) return foraDoSistema;
    var semSuplemento = exigirSuplemento(ctx, 'sincronia', corpo);
    if (semSuplemento) return semSuplemento;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };

    var acesso = personagemAcessivel(autorId, usuario, { semCompartilhamento: true });
    if (!acesso.ok) return acesso;
    var regAutor = acesso.personagem;
    var regAlvo = acharPor(ABAS.PERSONAGENS, 'id', alvoId);
    if (!regAlvo) return { ok: false, erro: 'nao_encontrado' };
    if (String(regAutor.campanhaId || '') !== campanhaId || String(regAlvo.campanhaId || '') !== campanhaId) return { ok: false, erro: 'nao_encontrado' };

    var lidoAutor = lerFichaDoPersonagem(regAutor);
    if (!lidoAutor.ok) return lidoAutor;
    var lidoAlvo = lerFichaDoPersonagem(regAlvo);
    if (!lidoAlvo.ok) return lidoAlvo;
    var fAutor = comVinculoDaColuna(lidoAutor.ficha, regAutor);
    var fAlvo = comVinculoDaColuna(lidoAlvo.ficha, regAlvo);
    if (String(fAutor.tipoFicha || '') !== 'ordem' || String(fAlvo.tipoFicha || '') !== 'ordem') return { ok: false, erro: 'dados_invalidos' };

    /* A regra opcional Poderes de Transmissão (v2.48.2) ligada nas duas. */
    var comRegra = function (f) { return !!(f.ordem && f.ordem.opcionais && f.ordem.opcionais.poderesDeTransmissao === true); };
    if (!comRegra(fAutor) || !comRegra(fAlvo)) return { ok: false, erro: 'sem_sincronia', detalhe: 'regra_desligada' };

    var sAutor = sincroniaDaFicha(fAutor);
    var sAlvo = sincroniaDaFicha(fAlvo);
    /* As duas fichas precisam ter marcado uma à outra. */
    if (!sAutor || !sAlvo || !marcou(sAutor, alvoId) || !marcou(sAlvo, autorId)) return { ok: false, erro: 'sem_sincronia' };

    var nomeAutor = String(fAutor.nome || regAutor.nome || 'Personagem').slice(0, 80);
    var nomeAlvo = String(fAlvo.nome || regAlvo.nome || 'Personagem').slice(0, 80);
    var quando = new Date().toISOString();
    var gravadas = [];

    if (tipo === 'pe') {
      if (operacaoNaSincronia(sAlvo, opId, 'alvo')) return { ok: true, repetida: true, dados: { valor: valor } };
      var atual = recursoAtualDoServidor(fAlvo, 'pe');
      if (atual.valor === null) return { ok: false, erro: 'dados_invalidos' };
      if (atual.valor < valor) return { ok: false, erro: 'sem_recursos', disponivel: atual.valor };
      if (!fAlvo.ordem.recursos || typeof fAlvo.ordem.recursos !== 'object') fAlvo.ordem.recursos = { pv: null, pe: null, san: null, pd: null };
      fAlvo.ordem.recursos[atual.chave] = atual.valor - valor;
      anotarNaSincronia(sAlvo, { opId: opId, tipo: 'pe', papel: 'alvo', outro: nomeAutor, valor: valor, recurso: 'pe', natureza: 'perda', em: quando });
      gravadas.push({ registro: regAlvo, ficha: fAlvo });
    } else {
      /* O autor sofre no lugar do alvo; os dois ficam com o registro. Cada
         ficha confere o próprio id: a repetição termina o que faltou. */
      if (!operacaoNaSincronia(sAutor, opId, 'autor')) {
        var atualA = recursoAtualDoServidor(fAutor, recurso);
        if (atualA.valor === null) return { ok: false, erro: 'dados_invalidos' };
        if (!fAutor.ordem.recursos || typeof fAutor.ordem.recursos !== 'object') fAutor.ordem.recursos = { pv: null, pe: null, san: null, pd: null };
        fAutor.ordem.recursos[atualA.chave] = Math.max(PISO_DE_RECURSO, atualA.valor - valor);
        anotarNaSincronia(sAutor, { opId: opId, tipo: 'redirecionar', papel: 'autor', outro: nomeAlvo, valor: valor, recurso: recurso, natureza: natureza, em: quando });
        gravadas.push({ registro: regAutor, ficha: fAutor });
      }
      if (!operacaoNaSincronia(sAlvo, opId, 'alvo')) {
        anotarNaSincronia(sAlvo, { opId: opId, tipo: 'redirecionar', papel: 'alvo', outro: nomeAutor, valor: valor, recurso: recurso, natureza: natureza, em: quando });
        gravadas.push({ registro: regAlvo, ficha: fAlvo });
      }
      if (!gravadas.length) return { ok: true, repetida: true, dados: { valor: valor } };
    }

    for (var i = 0; i < gravadas.length; i++) {
      var g = gravadas[i];
      g.ficha.atualizadoEm = quando;
      g.registro.atualizadoEm = quando;
      g.registro.rev = (Number(g.registro.rev) || 0) + 1;
      var publicado = publicarFicha(g.registro, g.ficha, { operacao: opId });
      if (!publicado.ok) return publicado;
    }
    marcarMesa(campanhaId, ['personagens']);
    return { ok: true, dados: { valor: valor, gravadas: gravadas.length } };
  });
}


/* =====================================================================
   RAMIFICAÇÃO (v9.5) — os planos de evolução de uma ficha de Ordem
   ---------------------------------------------------------------------
   Os planos são do DONO da ficha e de mais ninguém: ler e salvar exigem
   dono, conferido aqui (Mestre, Editor e Leitor recebem sem_permissao —
   e quem nem alcança a ficha, nao_encontrado). Ficam numa aba à parte
   (PLANOS_EVOLUCAO): salvar um plano NÃO grava a ficha nem muda a
   revisão dela, e não entra na sincronia normal — a tela pede a lista
   ao abrir o planejador e, com um plano ativo, quando a progressão real
   avança.

   O servidor não simula nada (o motor de Ordem mora no navegador):
   aqui só a forma é conferida — no máximo LIMITE_PLANOS_EVOLUCAO planos,
   campos conhecidos, tamanho de uma célula. `rev` recusa a gravação de
   uma aba velha (conflito, com a lista atual) e o opId já aplicado
   responde `repetida` sem gravar de novo (resposta perdida, reenvio).
   O que o plano CONCEDE só entra na ficha pela gravação normal dela,
   com os recibos (ordem.ramificacao).
   ===================================================================== */

var LIMITE_PLANOS_EVOLUCAO = 8;
var MAX_OPS_PLANOS = 40;

function registroDosPlanos(personagemId) {
  try { return acharPor(ABAS.PLANOS_EVOLUCAO, 'personagemId', String(personagemId)); } catch (erro) { return null; }
}

function planosParaCliente(registro) {
  var dados = registro ? lerJson(registro.dadosJson, null) : null;
  return {
    rev: registro ? Number(registro.rev) || 0 : 0,
    formato: dados && dados.formato ? dados.formato : 1,
    planos: dados && Array.isArray(dados.planos) ? dados.planos : [],
    limite: LIMITE_PLANOS_EVOLUCAO,
    atualizadoEm: registro ? String(registro.atualizadoEm || '') : '',
  };
}

/* Só a forma: o resto (vagas, requisitos) é do motor, no navegador, e é
   conferido de novo na hora de aplicar. */
function limparPlanosEvolucao(bruto) {
  var d = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : null;
  if (!d || !Array.isArray(d.planos)) return null;
  if (d.planos.length > LIMITE_PLANOS_EVOLUCAO) return { erro: 'limite' };
  var vistos = {};
  var planos = [];
  for (var i = 0; i < d.planos.length; i++) {
    var p = d.planos[i];
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    var id = String(p.id || '');
    if (!/^[A-Za-z0-9_-]{4,60}$/.test(id) || vistos[id]) return null;
    vistos[id] = true;
    var decisoes = p.decisoes && typeof p.decisoes === 'object' && !Array.isArray(p.decisoes) ? p.decisoes : {};
    var limpas = {};
    Object.keys(decisoes).forEach(function (k) {
      if (/^[A-Za-z0-9.-]{1,60}$/.test(k) && decisoes[k] && typeof decisoes[k] === 'object') limpas[k] = decisoes[k];
    });
    var objeto = function (x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; };
    planos.push({
      id: id,
      nome: String(p.nome || 'Plano').slice(0, 60),
      formato: Number(p.formato) || 1,
      alvo: objeto(p.alvo),
      base: { progresso: objeto(objeto(p.base).progresso), assinatura: String(objeto(p.base).assinatura || '').slice(0, 40) },
      regras: { tipo: String(objeto(p.regras).tipo || 'nex').slice(0, 20) },
      decisoes: limpas,
      criadoEm: String(p.criadoEm || '').slice(0, 40),
      atualizadoEm: String(p.atualizadoEm || '').slice(0, 40),
    });
  }
  return { formato: 1, planos: planos };
}

function acaoLerPlanosEvolucao(corpo, usuario) {
  var acesso = personagemAcessivel(corpo.personagemId, usuario, { exigeDono: true, leve: true });
  if (!acesso.ok) return acesso;
  var dados = planosParaCliente(registroDosPlanos(acesso.personagem.id));
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoSalvarPlanosEvolucao(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };
  var limpo = limparPlanosEvolucao(corpo.dados);
  if (!limpo) return { ok: false, erro: 'dados_invalidos' };
  if (limpo.erro === 'limite') return { ok: false, erro: 'limite', limite: LIMITE_PLANOS_EVOLUCAO };
  var json = JSON.stringify(limpo);
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario, { exigeDono: true, leve: true });
    if (!acesso.ok) return acesso;
    try {
      aba(ABAS.PLANOS_EVOLUCAO);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'PLANOS_EVOLUCAO' };
    }
    var personagemId = String(acesso.personagem.id);
    var registro = registroDosPlanos(personagemId);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];

    if (feitas.indexOf(opId) >= 0) return { ok: true, repetida: true, rev: revAtual, dados: planosParaCliente(registro) };
    if (revPedida !== revAtual) return { ok: false, erro: 'conflito', rev: revAtual, dados: planosParaCliente(registro) };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_PLANOS) feitas = feitas.slice(feitas.length - MAX_OPS_PLANOS);
    var novo = {
      personagemId: personagemId,
      ownerId: String(usuario.id),
      atualizadoEm: new Date().toISOString(),
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.PLANOS_EVOLUCAO, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.PLANOS_EVOLUCAO, novo);
    var gravado = registroDosPlanos(personagemId);
    return { ok: true, rev: revAtual + 1, dados: planosParaCliente(gravado) };
  });
}

/* Excluir a ficha leva os planos junto (chamado por acaoExcluirPersonagem). */
function apagarPlanosDoPersonagem(personagemId) {
  var r;
  try { r = linhaLeve(ABAS.PLANOS_EVOLUCAO, 'personagemId', personagemId); } catch (erro) { return; }
  if (r) apagarLinha(ABAS.PLANOS_EVOLUCAO, r._linha);
}
