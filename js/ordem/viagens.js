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
