/* =====================================================================
   R.A.M.A. — Tormenta20 · equipamento (p. 138–167)
   ---------------------------------------------------------------------
   Preços em T$ (TC = 0,1 T$; TO = 10 T$). Carga em espaços (p. 141):
   10 + 2 por Força (–1 por Força negativa); acima, sobrecarregado
   (penalidade de armadura –5, deslocamento –3m); máximo o dobro.
   Até quatro itens vestidos com benefício; dois empunhados.
   ===================================================================== */

(function (global) {
  "use strict";

  /* ---------- dinheiro (p. 140) ---------- */
  var DINHEIRO_INICIAL = { 1: "4d6", 2: 300, 3: 600, 4: 1000, 5: 2000, 6: 3000, 7: 5000, 8: 7000, 9: 10000, 10: 13000, 11: 19000, 12: 27000, 13: 36000, 14: 49000, 15: 66000, 16: 88000, 17: 110000, 18: 150000, 19: 200000, 20: 260000 };
  var MOEDAS = { tc: 0.1, ts: 1, to: 10 };
  var VENDA = 0.5;
  var ITENS_INICIAIS = { pagina: 140, sempre: ["mochila", "sacoDeDormir", "trajeDeViajante"], dinheiro: "4d6",
    resumo: "Mochila, saco de dormir, traje de viajante; uma arma simples (e uma marcial, se proficiente); armadura de couro, couro batido ou gibão de peles (brunea, se proficiente em pesadas; escudo leve, se proficiente em escudos; arcanistas sem armadura); T$ 4d6." };

  /* ---------- passos de dano (Tabela 3-2, p. 143) ---------- */
  var PASSOS = [
    ["1", "1d2", "1d3", "1d4", "1d6", "1d8"],
    ["1d2", "1d3", "1d4", "1d6", "1d8", "1d10"],
    ["1d3", "1d4", "1d6", "1d8", "1d10", "1d12"],
    ["1d4", "1d6", "1d8|2d4", "1d10", "1d12", "3d6"],
    ["1d6", "1d8", "1d10", "1d12", "3d6", "4d6"],
    ["1d8", "1d10", "1d12|2d6|3d4", "3d6", "4d6", "4d8"],
    ["1d10", "2d6", "2d8", "3d8", "4d8", "4d10"],
    ["2d6", "2d8", "2d10", "3d10", "4d10", "4d12"],
  ];
  var NORMAL = 2;
  function naCelula(celula, dano) { return celula.split("|").indexOf(dano) >= 0; }
  function primeiraDa(celula) { return celula.split("|")[0]; }
  /* Um passo de cada vez: a linha onde o dano é o "normal"; senão,
     qualquer linha em que ele apareça e haja para onde andar. */
  function umPasso(dano, sentido) {
    var r, c;
    for (r = 0; r < PASSOS.length; r++) if (naCelula(PASSOS[r][NORMAL], dano)) return primeiraDa(PASSOS[r][NORMAL + sentido]);
    for (r = 0; r < PASSOS.length; r++) for (c = 0; c < PASSOS[r].length; c++) {
      if (naCelula(PASSOS[r][c], dano) && PASSOS[r][c + sentido]) return primeiraDa(PASSOS[r][c + sentido]);
    }
    return dano;
  }
  function passoDeDano(dano, n) {
    var d = String(dano || "").trim();
    var k = Math.round(Number(n) || 0);
    while (k > 0) { d = umPasso(d, 1); k--; }
    while (k < 0) { d = umPasso(d, -1); k++; }
    return d;
  }

  /* ---------- armas (Tabela 3-3, p. 144–151) ---------- */
  function a(id, nome, prof, prop, emp, preco, dano, margem, mult, alcance, tipo, espacos, extra) {
    return Object.assign({ id: id, nome: nome, categoria: "arma", proficiencia: prof, proposito: prop, empunhadura: emp, preco: preco, dano: dano, margem: margem, mult: mult, alcance: alcance, tipo: tipo, espacos: espacos, habilidades: [], pagina: 144 }, extra || {});
  }
  var ARMAS = [
    a("adaga", "Adaga", "simples", "corpo", "leve", 2, "1d4", 19, 2, "curto", "P", 1, { arremesso: true, usaDesAtaque: true, ocultar: 5, grupos: ["faca"] }),
    a("espadaCurta", "Espada curta", "simples", "corpo", "leve", 10, "1d6", 19, 2, null, "P", 1, { grupos: ["espada"] }),
    a("foice", "Foice", "simples", "corpo", "leve", 4, "1d6", 20, 3, null, "C", 1),
    a("clava", "Clava", "simples", "corpo", "umaMao", 0, "1d6", 20, 2, null, "I", 1, { madeira: true }),
    a("lanca", "Lança", "simples", "corpo", "umaMao", 2, "1d6", 20, 2, "curto", "P", 1, { arremesso: true, madeira: true }),
    a("maca", "Maça", "simples", "corpo", "umaMao", 12, "1d8", 20, 2, null, "I", 1),
    a("bordao", "Bordão", "simples", "corpo", "duasMaos", 0, "1d6/1d6", 20, 2, null, "I", 2, { habilidades: ["dupla"], madeira: true }),
    a("pique", "Pique", "simples", "corpo", "duasMaos", 2, "1d8", 20, 2, null, "P", 2, { habilidades: ["alongada"], madeira: true }),
    a("tacape", "Tacape", "simples", "corpo", "duasMaos", 0, "1d10", 20, 2, null, "I", 2, { madeira: true }),
    a("azagaia", "Azagaia", "simples", "distancia", "umaMao", 1, "1d6", 20, 2, "medio", "P", 1, { arremesso: true, corpoPenalidade: -5 }),
    a("bestaLeve", "Besta leve", "simples", "distancia", "umaMao", 35, "1d8", 19, 2, "medio", "P", 1, { disparo: true, municao: "virotes", recarga: "movimento" }),
    a("funda", "Funda", "simples", "distancia", "umaMao", 0, "1d4", 20, 2, "medio", "I", 1, { disparo: true, municao: "pedras", recarga: "movimento", somaFor: true, semMunicaoPassos: -1 }),
    a("arcoCurto", "Arco curto", "simples", "distancia", "duasMaos", 30, "1d6", 20, 3, "medio", "P", 2, { disparo: true, municao: "flechas", recarga: "livre", montado: true, madeira: true, grupos: ["arco"] }),
    a("machadinha", "Machadinha", "marcial", "corpo", "leve", 6, "1d6", 20, 3, "curto", "C", 1, { arremesso: true, grupos: ["machado"] }),
    a("cimitarra", "Cimitarra", "marcial", "corpo", "umaMao", 15, "1d6", 18, 2, null, "C", 1, { habilidades: ["agil"], grupos: ["espada"] }),
    a("espadaLonga", "Espada longa", "marcial", "corpo", "umaMao", 15, "1d8", 19, 2, null, "C", 1, { grupos: ["espada"] }),
    a("florete", "Florete", "marcial", "corpo", "umaMao", 20, "1d6", 18, 2, null, "P", 1, { habilidades: ["agil"], grupos: ["espada"] }),
    a("machadoDeBatalha", "Machado de batalha", "marcial", "corpo", "umaMao", 10, "1d8", 20, 3, null, "C", 1, { grupos: ["machado"] }),
    a("mangual", "Mangual", "marcial", "corpo", "umaMao", 8, "1d8", 20, 2, null, "I", 1, { habilidades: ["versatil"], manobras: { desarmar: 2 } }),
    a("marteloDeGuerra", "Martelo de guerra", "marcial", "corpo", "umaMao", 12, "1d8", 20, 3, null, "I", 1, { grupos: ["martelo"] }),
    a("picareta", "Picareta", "marcial", "corpo", "umaMao", 8, "1d6", 20, 4, null, "P", 1, { grupos: ["picareta"] }),
    a("tridente", "Tridente", "marcial", "corpo", "umaMao", 15, "1d8", 20, 2, "curto", "P", 1, { arremesso: true, habilidades: ["versatil"], manobras: { derrubar: 2 } }),
    a("alabarda", "Alabarda", "marcial", "corpo", "duasMaos", 10, "1d10", 20, 3, null, "C/P", 2, { habilidades: ["alongada"], grupos: ["machado"] }),
    a("alfange", "Alfange", "marcial", "corpo", "duasMaos", 75, "2d4", 18, 2, null, "C", 2, { grupos: ["espada"] }),
    a("gadanho", "Gadanho", "marcial", "corpo", "duasMaos", 18, "2d4", 20, 4, null, "C", 2),
    a("lancaMontada", "Lança montada", "marcial", "corpo", "duasMaos", 10, "1d8", 20, 3, null, "P", 2, { habilidades: ["alongada"], montadaUmaMao: true, investidaMontada: "2d8" }),
    a("machadoDeGuerra", "Machado de guerra", "marcial", "corpo", "duasMaos", 20, "1d12", 20, 3, null, "C", 2, { grupos: ["machado"] }),
    a("marreta", "Marreta", "marcial", "corpo", "duasMaos", 20, "3d4", 20, 2, null, "I", 2, { grupos: ["marreta"] }),
    a("montante", "Montante", "marcial", "corpo", "duasMaos", 50, "2d6", 19, 2, null, "C", 2, { grupos: ["espada"] }),
    a("arcoLongo", "Arco longo", "marcial", "distancia", "duasMaos", 100, "1d8", 20, 3, "medio", "P", 2, { disparo: true, municao: "flechas", recarga: "livre", somaFor: true, naoMontado: true, madeira: true, grupos: ["arco"] }),
    a("bestaPesada", "Besta pesada", "marcial", "distancia", "duasMaos", 50, "1d12", 19, 2, "medio", "P", 2, { disparo: true, municao: "virotes", recarga: "padrao" }),
    a("chicote", "Chicote", "exotica", "corpo", "umaMao", 2, "1d3", 20, 2, null, "C", 1, { alcanceCorpo: 4.5, habilidades: ["agil", "versatil"], manobras: { derrubar: 2, desarmar: 2 } }),
    a("espadaBastarda", "Espada bastarda", "exotica", "corpo", "umaMao", 35, "1d10/1d12", 19, 2, null, "C", 1, { habilidades: ["adaptavel"], marcialDuasMaos: true, grupos: ["espada"] }),
    a("katana", "Katana", "exotica", "corpo", "umaMao", 100, "1d8/1d10", 19, 2, null, "C", 1, { habilidades: ["adaptavel", "agil"], marcialDuasMaos: true, grupos: ["espada"] }),
    a("machadoAnao", "Machado anão", "exotica", "corpo", "umaMao", 30, "1d10", 20, 3, null, "C", 1, { marcialDuasMaos: true, grupos: ["machado"] }),
    a("correnteDeEspinhos", "Corrente de espinhos", "exotica", "corpo", "duasMaos", 25, "2d4/2d4", 19, 2, null, "C", 2, { alcanceCorpo: 4.5, habilidades: ["agil", "dupla", "versatil"], manobras: { derrubar: 2, desarmar: 2 } }),
    a("machadoTaurico", "Machado táurico", "exotica", "corpo", "duasMaos", 50, "2d8", 20, 3, null, "C", 2, { habilidades: ["desbalanceada"], grupos: ["machado"] }),
    a("rede", "Rede", "exotica", "distancia", "umaMao", 20, null, null, null, "curto", null, 1, { enreda: true, pv: 5, resumo: "Acerto não causa dano: a vítima fica enredada; segurando a corda, Força oposta para contê-la. Soltar: ação completa e Força ou Acrobacia CD 20." }),
    a("pistola", "Pistola", "fogo", "distancia", "leve", 250, "2d6", 19, 3, "curto", "P", 1, { disparo: true, municao: "balas", recarga: "padrao" }),
    a("mosquete", "Mosquete", "fogo", "distancia", "duasMaos", 500, "2d8", 19, 3, "medio", "P", 2, { disparo: true, municao: "balas", recarga: "padrao" }),
  ];
  var MUNICOES = [
    { id: "balas", nome: "Balas (20)", categoria: "municao", preco: 20, espacos: 1, quantidade: 20, pagina: 151 },
    { id: "flechas", nome: "Flechas (20)", categoria: "municao", preco: 1, espacos: 1, quantidade: 20, pagina: 151 },
    { id: "pedras", nome: "Pedras (20)", categoria: "municao", preco: 0.5, espacos: 1, quantidade: 20, pagina: 151 },
    { id: "virotes", nome: "Virotes (20)", categoria: "municao", preco: 2, espacos: 1, quantidade: 20, pagina: 151 },
  ];
  var DESARMADO = { id: "desarmado", nome: "Ataque desarmado", categoria: "arma", proficiencia: "simples", proposito: "corpo", empunhadura: "leve", dano: "1d3", margem: 20, mult: 2, tipo: "I", naoLetal: true, natural: true, pagina: 143 };
  var IMPROVISADA = { id: "improvisada", nome: "Arma improvisada", categoria: "arma", proficiencia: "simples", proposito: "corpo", empunhadura: "umaMao", dano: "1d6", margem: 20, mult: 2, tipo: "I", ataque: -2, pagina: 147 };
  var ALCANCES = { curto: 9, medio: 30, longo: 90 };

  /* ---------- armaduras e escudos (Tabela 3-5, p. 152–154) ---------- */
  function ar(id, nome, tipo, preco, defesa, penalidade, espacos, extra) {
    return Object.assign({ id: id, nome: nome, categoria: tipo === "escudo" ? "escudo" : "armadura", tipoArmadura: tipo, preco: preco, defesa: defesa, penalidade: penalidade, espacos: espacos, pagina: 153 }, extra || {});
  }
  var ARMADURAS = [
    ar("acolchoada", "Armadura acolchoada", "leve", 5, 1, 0, 2, { efeitos: [{ t: "bonus", alvo: "pericia.fortitude", valor: 2, categoria: "item" }], naoMetal: true }),
    ar("couro", "Armadura de couro", "leve", 20, 2, 0, 2, { naoMetal: true }),
    ar("couroBatido", "Couro batido", "leve", 35, 3, -1, 2),
    ar("gibaoDePeles", "Gibão de peles", "leve", 25, 4, -3, 2, { naoMetal: true }),
    ar("couraca", "Couraça", "leve", 500, 5, -4, 2),
    ar("brunea", "Brunea", "pesada", 50, 5, -2, 5),
    ar("cotaDeMalha", "Cota de malha", "pesada", 150, 6, -2, 5),
    ar("lorigaSegmentada", "Loriga segmentada", "pesada", 250, 7, -3, 5),
    ar("meiaArmadura", "Meia armadura", "pesada", 600, 8, -4, 5),
    ar("armaduraCompleta", "Armadura completa", "pesada", 3000, 10, -5, 5, { ajusteUsuario: 200 }),
    ar("escudoLeve", "Escudo leve", "escudo", 5, 1, -1, 1, { ataque: { dano: "1d4", mult: 2, tipo: "I" }, maoSemArma: true, madeira: true }),
    ar("escudoPesado", "Escudo pesado", "escudo", 15, 2, -2, 2, { ataque: { dano: "1d6", mult: 2, tipo: "I" } }),
  ];
  var REGRAS_ARMADURA = {
    pericias: ["acrobacia", "furtividade", "ladinagem"], natacao: "atletismo",
    pesada: { semDes: true, deslocamento: -3, vestir: "cinco minutos", dormir: "fatigado" }, leve: { vestir: "completa" }, escudo: { vestir: "movimento" },
    naoProficiente: "aplica a penalidade em todas as perícias de Força e Destreza",
  };

  /* ---------- itens gerais (Tabela 3-6, p. 155–163) ---------- */
  function it(id, nome, cat, preco, espacos, extra) { return Object.assign({ id: id, nome: nome, categoria: cat, preco: preco, espacos: espacos }, extra || {}); }
  function bonus(pericia, valor, cond) { return [{ t: "bonus", alvo: "pericia." + pericia, valor: valor, categoria: "item", cond: cond }]; }
  var ITENS = [
    /* equipamento de aventura (CD 15) */
    it("aguaBenta", "Água benta", "aventura", 10, 0.5, { pagina: 155, uso: { execucao: "padrao", alcance: "curto", alvo: "morto-vivo, demônio ou diabo", dano: { dados: "2d10", tipo: "luz" }, resistencia: { pericia: "reflexos", atributo: "sab", efeito: "metade" }, consumivel: true } }),
    it("algemas", "Algemas", "aventura", 15, 1, { pagina: 155, resumo: "Prender exige agarrar e vencer novo agarrar. Pulsos presos: –5 em testes com as mãos e impede conjuração. Escapar: ação completa, Acrobacia 30 ou Força 25." }),
    it("arpeu", "Arpéu", "aventura", 5, 1, { pagina: 155, resumo: "Prender: Pontaria CD 15. Subir com corda: +5 em Atletismo." }),
    it("bandoleiraDePocoes", "Bandoleira de poções", "aventura", 20, 1, { pagina: 155, vestido: true, resumo: "Saca alquímicos e poções como ação livre." }),
    it("barraca", "Barraca", "aventura", 10, 1, { pagina: 155, efeitos: bonus("sobrevivencia", 2, "para acampar"), resumo: "Saco de dormir para duas pessoas." }),
    it("corda", "Corda (10m)", "aventura", 1, 1, { pagina: 155, efeitos: bonus("atletismo", 5, "descendo buraco ou muro com a corda") }),
    it("espelho", "Espelho", "aventura", 10, 1, { pagina: 155 }),
    it("lampiao", "Lampião", "aventura", 7, 1, { pagina: 155, resumo: "Acender: ação padrão; ilumina 15m de raio por uma cena por carga de óleo." }),
    it("mochila", "Mochila", "aventura", 2, 0, { pagina: 155 }),
    it("mochilaDeAventureiro", "Mochila de aventureiro", "aventura", 50, 0, { pagina: 155, vestido: true, efeitos: [{ t: "bonus", alvo: "carga", valor: 2, categoria: "item" }] }),
    it("oleo", "Óleo", "aventura", 0.1, 0.5, { pagina: 155, uso: { execucao: "padrao", alcance: "curto", texto: "Se o alvo sofrer dano de fogo até o fim do seu próximo turno, +1d6 e fica em chamas.", consumivel: true } }),
    it("organizadorDePergaminhos", "Organizador de pergaminhos", "aventura", 25, 1, { pagina: 155, vestido: true, resumo: "Saca pergaminhos como ação livre." }),
    it("peDeCabra", "Pé de cabra", "aventura", 2, 1, { pagina: 155, comoArma: "clava", resumo: "+5 em Força para abrir portas, janelas e baús." }),
    it("sacoDeDormir", "Saco de dormir", "aventura", 1, 1, { pagina: 155 }),
    it("simboloSagrado", "Símbolo sagrado", "aventura", 5, 1, { pagina: 157, vestido: true, efeitos: [{ t: "bonus", alvo: "resistencias", valor: 1, categoria: "item", cond: "símbolo do seu deus" }] }),
    it("tocha", "Tocha", "aventura", 0.1, 1, { pagina: 157, comoArma: { dano: "1d4", extra: "1 de fogo", mult: 2, tipo: "I", empunhadura: "leve" }, resumo: "Acender: ação padrão; ilumina 9m por uma cena." }),
    it("varaDeMadeira", "Vara de madeira (3m)", "aventura", 0.2, 1, { pagina: 157 }),
    /* ferramentas (CD 20) */
    it("alaudeElfico", "Alaúde élfico", "ferramenta", 300, 1, { pagina: 158, instrumento: true, resumo: "Empunhado: Inspiração como ação de movimento." }),
    it("colecaoDeLivros", "Coleção de livros", "ferramenta", 75, 1, { pagina: 158, escolhaBonus: ["conhecimento", "guerra", "misticismo", "nobreza", "religiao"], valor: 1 }),
    it("equipamentoDeViagem", "Equipamento de viagem", "ferramenta", 10, 1, { pagina: 158, ferramentaDe: { pericia: "sobrevivencia", uso: "acampar" } }),
    it("estojoDeDisfarces", "Estojo de disfarces", "ferramenta", 50, 1, { pagina: 158, ferramentaDe: { pericia: "enganacao", uso: "disfarce" } }),
    it("flautaMistica", "Flauta mística", "ferramenta", 150, 1, { pagina: 158, instrumento: true, resumo: "Bardo empunhando: +1 na CD das magias." }),
    it("gazua", "Gazua", "ferramenta", 5, 1, { pagina: 158, ferramentaDe: { pericia: "ladinagem", uso: "abrir fechadura" } }),
    it("instrumentosDeOficio", "Instrumentos de ofício", "ferramenta", 30, 1, { pagina: 158, escolhaOficio: true, ferramentaDe: { pericia: "oficio" } }),
    it("instrumentoMusical", "Instrumento musical", "ferramenta", 35, 1, { pagina: 158, instrumento: true }),
    it("luneta", "Luneta", "ferramenta", 100, 1, { pagina: 158, efeitos: bonus("percepcao", 5, "observando em alcance longo ou além") }),
    it("maletaDeMedicamentos", "Maleta de medicamentos", "ferramenta", 50, 1, { pagina: 158, ferramentaDe: { pericia: "cura" } }),
    it("sela", "Sela", "ferramenta", 20, 1, { pagina: 158, ferramentaDe: { pericia: "cavalgar" } }),
    it("tamborDasProfundezas", "Tambor das profundezas", "ferramenta", 80, 1, { pagina: 158, instrumento: true, resumo: "Empunhado: alcance da Inspiração e das Músicas dobrado." }),
    /* vestuário (CD 20; vestido) */
    it("andrajosDeAldeao", "Andrajos de aldeão", "vestuario", 1, 1, { pagina: 159, vestido: true, efeitos: bonus("investigacao", 2, "para interrogar"), resumo: "–2 em perícias de Carisma com quem se importa com classe social." }),
    it("bandana", "Bandana", "vestuario", 5, 1, { pagina: 159, vestido: true, efeitos: bonus("intimidacao", 1) }),
    it("botasReforcadas", "Botas reforçadas", "vestuario", 20, 1, { pagina: 159, vestido: true, resumo: "+1,5m no deslocamento reduzido por terreno difícil." }),
    it("camisaBufante", "Camisa bufante", "vestuario", 25, 1, { pagina: 159, vestido: true, efeitos: bonus("atuacao", 1) }),
    it("capaEsvoacante", "Capa esvoaçante", "vestuario", 25, 1, { pagina: 159, vestido: true, efeitos: bonus("enganacao", 1) }),
    it("capaPesada", "Capa pesada", "vestuario", 15, 1, { pagina: 159, vestido: true, efeitos: bonus("fortitude", 1) }),
    it("casacoLongo", "Casaco longo", "vestuario", 20, 1, { pagina: 159, vestido: true, efeitos: bonus("fortitude", 5, "contra frio").concat([{ t: "bonus", alvo: "penalidadeArmadura", valor: -2, categoria: "item" }]) }),
    it("chapeuArcano", "Chapéu arcano", "vestuario", 50, 1, { pagina: 159, vestido: true, efeitos: [{ t: "bonus", alvo: "pm", valor: 1, categoria: "item", se: "tem.caminho" }] }),
    it("enfeiteDeElmo", "Enfeite de elmo", "vestuario", 15, 1, { pagina: 159, vestido: true, efeitos: [{ t: "bonus", alvo: "resist.medo", valor: 2, categoria: "item" }] }),
    it("farraposDeErmitao", "Farrapos de ermitão", "vestuario", 1, 1, { pagina: 159, vestido: true, efeitos: bonus("adestramento", 2).concat(bonus("diplomacia", -2)) }),
    it("gorroDeErvas", "Gorro de ervas", "vestuario", 75, 1, { pagina: 159, vestido: true, efeitos: bonus("vontade", 1) }),
    it("luvaDePelica", "Luva de pelica", "vestuario", 5, 1, { pagina: 159, vestido: true, efeitos: bonus("ladinagem", 1) }),
    it("manopla", "Manopla", "vestuario", 10, 1, { pagina: 159, vestido: true, desarmadoLetal: true, recebeMelhoriasDeArma: true }),
    it("mantoCamuflado", "Manto camuflado", "vestuario", 12, 1, { pagina: 159, vestido: true, escolhaTerreno: true, efeitos: bonus("furtividade", 2, "no terreno do manto") }),
    it("mantoEclesiastico", "Manto eclesiástico", "vestuario", 20, 1, { pagina: 159, vestido: true, efeitos: bonus("religiao", 1) }),
    it("robeMistico", "Robe místico", "vestuario", 50, 1, { pagina: 159, vestido: true, efeitos: bonus("misticismo", 1) }),
    it("sapatosDeCamurca", "Sapatos de camurça", "vestuario", 8, 1, { pagina: 159, vestido: true, efeitos: bonus("acrobacia", 1) }),
    it("tabardo", "Tabardo", "vestuario", 10, 1, { pagina: 159, vestido: true, efeitos: bonus("diplomacia", 1) }),
    it("trajeDaCorte", "Traje da corte", "vestuario", 100, 1, { pagina: 159, resumo: "Sem ele, em bailes e palácios: –5 em perícias de Carisma." }),
    it("trajeDeViajante", "Traje de viajante", "vestuario", 10, 0, { pagina: 159 }),
    it("vesteDeSeda", "Veste de seda", "vestuario", 25, 1, { pagina: 159, vestido: true, efeitos: bonus("reflexos", 1) }),
    /* esotéricos (CD 20, treinado em Misticismo; empunhado) */
    it("bolsaDePo", "Bolsa de pó", "esoterico", 300, 1, { pagina: 159, esoterico: { pmAprimoramento: 2, escolas: ["encantamento", "ilusao"] } }),
    it("cajadoArcano", "Cajado arcano", "esoterico", 1000, 2, { pagina: 160, duasMaos: true, comoArma: "bordao", esoterico: { limitePM: 1, cd: 1, tipoMagia: "arcana" } }),
    it("cetroElemental", "Cetro elemental", "esoterico", 750, 1, { pagina: 160, escolhaElemento: ["acido", "eletricidade", "fogo", "frio"], esoterico: { dadoExtraDoTipo: true } }),
    it("costelaDeLich", "Costela de lich", "esoterico", 300, 1, { pagina: 160, esoterico: { danoExtra: { dados: "1d6", tipo: "trevas" }, semCuraMagica: true } }),
    it("dedoDeEnte", "Dedo de ente", "esoterico", 200, 1, { pagina: 160, esoterico: { recuperaPM: "1d4 = 4" } }),
    it("luvaDeFerro", "Luva de ferro", "esoterico", 150, 1, { pagina: 160, esoterico: { bonusPessoal: 1, tipoMagia: "arcana" } }),
    it("medalhaoDePrata", "Medalhão de prata", "esoterico", 750, 1, { pagina: 160, esoterico: { desconto: 1, alcance: "pessoal" } }),
    it("orbeCristalino", "Orbe cristalino", "esoterico", 750, 1, { pagina: 160, esoterico: { limitePM: 1, tipoMagia: "arcana" } }),
    it("tomoHermetico", "Tomo hermético", "esoterico", 1500, 1, { pagina: 160, escolhaEscola: true, esoterico: { cd: 2, tipoMagia: "arcana", escolaEscolhida: true } }),
    it("varinhaArcana", "Varinha arcana", "esoterico", 100, 1, { pagina: 160, esoterico: { cd: 1, tipoMagia: "arcana" } }),
    /* alquímicos — preparados (CD 15) */
    it("acido", "Ácido", "alquimico", 10, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "padrao", alcance: "curto", dano: { dados: "2d4", tipo: "acido" }, resistencia: { pericia: "reflexos", atributo: "des", efeito: "metade" }, consumivel: true } }),
    it("balsamoRestaurador", "Bálsamo restaurador", "alquimico", 10, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "completa", cura: "2d4", consumivel: true } }),
    it("bomba", "Bomba", "alquimico", 50, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "movimento (acender) + padrao", alcance: "curto", area: "raio 3m", dano: { dados: "6d6", tipo: "impacto" }, resistencia: { pericia: "reflexos", atributo: "des", efeito: "metade" }, consumivel: true } }),
    it("cosmetico", "Cosmético", "alquimico", 30, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "completa", duracao: "cena", efeitos: [{ t: "bonus", alvo: "pericias.car", valor: 2, categoria: "item" }], consumivel: true } }),
    it("elixirDoAmor", "Elixir do amor", "alquimico", 100, 0.5, { pagina: 160, subtipo: "preparado", uso: { resistencia: { pericia: "vontade", atributo: "car" }, condicao: { id: "enfeiticado", duracao: "1d3 dias" }, consumivel: true } }),
    it("essenciaDeMana", "Essência de mana", "alquimico", 50, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "padrao", pm: "1d4", consumivel: true } }),
    it("fogoAlquimico", "Fogo alquímico", "alquimico", 10, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "padrao", alcance: "curto", dano: { dados: "1d6", tipo: "fogo" }, condicao: { id: "emChamas" }, resistencia: { pericia: "reflexos", atributo: "des", efeito: "metade e evita as chamas" }, consumivel: true } }),
    it("poDoDesaparecimento", "Pó do desaparecimento", "alquimico", 100, 0.5, { pagina: 160, subtipo: "preparado", uso: { duracao: "2d6 rodadas (secreta)", condicao: { id: "invisivel" }, consumivel: true } }),
    /* alquímicos — catalisadores (CD 15, Misticismo; empunhado, um por vez) */
    it("bagaDeFogo", "Baga-de-fogo", "alquimico", 30, 0.5, { pagina: 160, subtipo: "catalisador", catalisador: { danoExtra: { dados: "1d6", tipo: "fogo" } } }),
    it("denteDeDragao", "Dente-de-dragão", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { dadoExtra: 1 } }),
    it("essenciaAbissal", "Essência abissal", "alquimico", 150, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { sobeDado: true, tipoDano: "fogo" } }),
    it("liquenLilas", "Líquen lilás", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { danoExtra: { dados: "1d6", tipo: "frio" } } }),
    it("musgoPurpura", "Musgo púrpura", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { cd: 2, escola: "ilusao" } }),
    it("ossosDeMonstro", "Ossos de monstro", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { cd: 2, escola: "necromancia" } }),
    it("poDeCristal", "Pó de cristal", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { desconto: 1, escola: "encantamento" } }),
    it("poDeGiz", "Pó de giz", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { desconto: 1, escola: "convocacao" } }),
    it("ramoVerdejante", "Ramo verdejante", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { curaPorDado: 1 } }),
    it("sacoDeSal", "Saco de sal", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { cd: 2, escola: "abjuracao" } }),
    it("seixoDeAmbar", "Seixo de âmbar", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { desconto: 1, escola: "transmutacao" } }),
    it("terraDeCemiterio", "Terra de cemitério", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { danoExtra: { dados: "1d6", tipo: "trevas" } } }),
    /* alquímicos — venenos (CD 20, salvo indicado; Fortitude contra a CD do aplicador, Int) */
    it("beladona", "Beladona", "alquimico", 1500, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "ingestao", efeito: "paralisado 3 rodadas", parcial: "lento", cdExtra: 5 } }),
    it("brumaSonolenta", "Bruma sonolenta", "alquimico", 150, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "inalacao", efeito: "inconsciente", parcial: "enjoado 1 rodada" } }),
    it("cicuta", "Cicuta", "alquimico", 60, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "ingestao", perda: "1d12", rodadas: 3, parcial: "perde 1d12 PV" } }),
    it("essenciaDeSombra", "Essência de sombra", "alquimico", 100, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "contato", efeito: "debilitado", parcial: "fraco" } }),
    it("nevoaToxica", "Névoa tóxica", "alquimico", 30, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "inalacao", perda: "1d12", rodadas: 3, parcial: "perde 1d12 PV" } }),
    it("peconhaComum", "Peçonha comum", "alquimico", 15, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "contato", perda: "1d12" } }),
    it("peconhaConcentrada", "Peçonha concentrada", "alquimico", 90, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "contato", perda: "1d12", rodadas: 3, parcial: "perde 1d12 PV" } }),
    it("peconhaPotente", "Peçonha potente", "alquimico", 600, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "contato", perda: "2d12", rodadas: 3, parcial: "perde 2d12 PV" } }),
    it("poDeLich", "Pó de lich", "alquimico", 3000, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "ingestao", perda: "4d12", rodadas: 5, parcial: "perde 4d12 PV", cdExtra: 5 } }),
    it("risoDeNimb", "Riso de Nimb", "alquimico", 150, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "inalacao", efeito: "confuso", parcial: "lento 1 rodada" } }),
    /* alimentação (um bônus por dia; consumido ao comprar; Ofício cozinheiro CD 15) */
    it("batataValkariana", "Batata valkariana", "alimentacao", 2, 0.5, { pagina: 162, alimento: { bonusUnico: "1d6" } }),
    it("goradQuente", "Gorad quente", "alimentacao", 18, 0.5, { pagina: 162, alimento: { pmTemp: 2 } }),
    it("macarraoDeYuvalin", "Macarrão de Yuvalin", "alimentacao", 6, 0.5, { pagina: 162, alimento: { pvTemp: 5 } }),
    it("pratoDoAventureiro", "Prato do aventureiro", "alimentacao", 1, 0.5, { pagina: 162, alimento: { recuperacaoPV: "nivel" } }),
    it("racaoDeViagem", "Ração de viagem (dia)", "alimentacao", 0.5, 0.5, { pagina: 162 }),
    it("refeicaoComum", "Refeição comum", "alimentacao", 0.3, 0.5, { pagina: 162 }),
    it("sopaDePeixe", "Sopa de peixe", "alimentacao", 1, 0.5, { pagina: 162, alimento: { recuperacaoPM: "nivel" } }),
    /* animais (parceiros iniciantes) */
    it("alforje", "Alforje", "animal", 30, 0, { pagina: 162, resumo: "A montaria carrega até 10 espaços." }),
    it("caoDeCaca", "Cão de caça", "animal", 150, 0, { pagina: 162, parceiro: { tipos: ["perseguidor", "montaria"], nivel: "iniciante" } }),
    it("cavalo", "Cavalo", "animal", 75, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" }, resumo: "Sem treino: Cavalgar CD 20 por rodada em combate." }),
    it("cavaloDeGuerra", "Cavalo de guerra", "animal", 400, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    it("estabulo", "Estábulo (dia)", "animal", 0.1, 0, { pagina: 162 }),
    it("ponei", "Pônei", "animal", 5, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    it("poneiDeGuerra", "Pônei de guerra", "animal", 30, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    it("trobo", "Trobo", "animal", 60, 0, { pagina: 163, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    /* veículos */
    it("balaoGoblin", "Balão goblin", "veiculo", 200, 0, { pagina: 163, veiculo: { tamanho: "enorme", deslocamento: { voo: 12 }, defesa: "5 + Des", pv: 100, carga: "8 Médias ou 160 espaços" } }),
    it("carroca", "Carroça", "veiculo", 150, 0, { pagina: 163, veiculo: { tamanho: "grande", deslocamento: { terrestre: 9 }, defesa: "8 + Des", pv: 50, carga: "4 Médias ou 80 espaços" } }),
    it("carruagem", "Carruagem", "veiculo", 500, 0, { pagina: 163, veiculo: { tamanho: "grande", deslocamento: { terrestre: 9 }, defesa: "8 + Des", pv: 50, cobertura: "leve" } }),
    it("canoa", "Canoa", "veiculo", 70, 0, { pagina: 163, veiculo: { tamanho: "grande", deslocamento: { natacao: 9 }, defesa: "8 + Des", pv: 50 } }),
    it("veleiro", "Veleiro", "veiculo", 10000, 0, { pagina: 163 }),
  ];
  var SERVICOS = [
    { id: "estadiaComum", nome: "Estadia comum (noite)", preco: 0.5, descanso: "normal", pagina: 163 },
    { id: "estadiaConfortavel", nome: "Estadia confortável (noite)", preco: 4, descanso: "confortavel", pagina: 163 },
    { id: "estadiaLuxuosa", nome: "Estadia luxuosa (noite)", preco: 20, descanso: "luxuosa", pagina: 163 },
    { id: "conducaoTerrestre", nome: "Condução terrestre", preco: 0.5, unidade: "km" },
    { id: "conducaoMaritima", nome: "Condução marítima", preco: 0.1, unidade: "km" },
    { id: "conducaoAerea", nome: "Condução aérea", preco: 10, unidade: "km", risco: "1 em 20 de queda (não fatal) a cada 100 km" },
    { id: "curandeiro", nome: "Curandeiro", preco: 5 },
    { id: "magia1", nome: "Magia de 1º círculo", preco: 10 },
    { id: "magia2", nome: "Magia de 2º círculo", preco: 90 },
    { id: "magia3", nome: "Magia de 3º círculo", preco: 360 },
    { id: "mensageiro", nome: "Mensageiro", preco: 0.5, unidade: "km" },
  ];
  /* A estalagem "comum" recupera 1 por nível (p. 163) — o descanso normal. */

  /* ---------- itens superiores (p. 164–167) ---------- */
  var PRECO_MELHORIAS = { 1: 300, 2: 3000, 3: 9000, 4: 18000 };
  var CD_MELHORIAS = { 1: 5, 2: 10, 3: 15, 4: 20 };
  function mel(id, nome, cats, resumo, extra) { return Object.assign({ id: id, nome: nome, categorias: cats, resumo: resumo, pagina: 164 }, extra || {}); }
  var MELHORIAS = [
    mel("certeira", "Certeira", ["arma"], "+1 nos testes de ataque.", { arma: { ataque: 1 } }),
    mel("pungente", "Pungente", ["arma"], "+2 nos testes de ataque.", { req: "certeira", arma: { ataque: 2 }, substitui: "certeira" }),
    mel("cruel", "Cruel", ["arma"], "+1 nas rolagens de dano.", { arma: { dano: 1 } }),
    mel("atroz", "Atroz", ["arma"], "+2 nas rolagens de dano.", { req: "cruel", arma: { dano: 2 }, substitui: "cruel" }),
    mel("equilibrada", "Equilibrada", ["arma"], "+2 em testes de manobras.", { arma: { manobras: 2 } }),
    mel("harmonizadaArma", "Harmonizada", ["arma"], "Uma habilidade de ataque escolhida custa –1 PM com a arma.", { req: "outra" }),
    mel("injecaoAlquimica", "Injeção alquímica", ["arma"], "Acerto libera uma carga de preparado ou água benta (2 doses; recarregar: ação completa)."),
    mel("macica", "Maciça", ["arma"], "+1 no multiplicador de crítico.", { arma: { mult: 1 }, exclui: "precisa" }),
    mel("miraTelescopica", "Mira telescópica", ["arma"], "Alcance +1 categoria e Ataque Furtivo em alcance médio (armas de disparo, exceto fundas).", { arma: { alcance: 1 } }),
    mel("precisa", "Precisa", ["arma"], "+1 na margem de ameaça.", { arma: { margem: 1 }, exclui: "macica" }),
    mel("ajustada", "Ajustada", ["armadura", "escudo"], "–1 na penalidade de armadura.", { armadura: { penalidade: 1 } }),
    mel("sobMedida", "Sob medida", ["armadura", "escudo"], "–2 na penalidade de armadura (só o usuário).", { req: "ajustada", armadura: { penalidade: 2 }, substitui: "ajustada" }),
    mel("delicada", "Delicada", ["armadura"], "Armadura pesada que permite 1 ponto de Destreza na Defesa.", { soPesada: true, armadura: { desMax: 1 }, exclui: "reforcada" }),
    mel("espinhosaArmadura", "Espinhosa", ["armadura"], "Agarrar ou ser agarrado causa perfuração igual à Força (ao fazer e no início de cada turno)."),
    mel("espinhosoEscudo", "Espinhoso", ["escudo"], "Ataque com escudo: dano +1 passo.", { escudo: { passo: 1 } }),
    mel("polida", "Polida", ["armadura", "escudo"], "+5 na Defesa na primeira rodada de combate (ambiente iluminado).", { armadura: { defesaPrimeiraRodada: 5 } }),
    mel("reforcada", "Reforçada", ["armadura", "escudo"], "+1 na Defesa e +1 na penalidade de armadura.", { armadura: { defesa: 1, penalidade: -1 }, exclui: "delicada" }),
    mel("selada", "Selada", ["armadura"], "+1 nos testes de resistência (só armadura pesada).", { soPesada: true, armadura: { resistencias: 1 } }),
    mel("canalizador", "Canalizador", ["esoterico"], "+1 no limite de PM das magias.", { esoterico: { limitePM: 1 } }),
    mel("energetico", "Energético", ["esoterico"], "Magias de dano causam +1d6 do mesmo tipo.", { esoterico: { danoExtra: "1d6" } }),
    mel("harmonizadoEsoterico", "Harmonizado", ["esoterico"], "Uma magia escolhida custa –1 PM (trocar: um dia e T$ 100).", { esoterico: { descontoMagiaEscolhida: 1 } }),
    mel("poderoso", "Poderoso", ["esoterico"], "+1 na CD das magias.", { esoterico: { cd: 1 } }),
    mel("vigilante", "Vigilante", ["esoterico"], "+2 na Defesa.", { esoterico: { defesa: 2 } }),
    mel("aprimorado", "Aprimorado", ["ferramenta", "vestuario"], "+1 na perícia que o item modifica.", { pericia: 1 }),
    mel("banhadoAOuro", "Banhado a ouro", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "+2 em Diplomacia.", { efeitos: [{ t: "bonus", alvo: "pericia.diplomacia", valor: 2, categoria: "item" }] }),
    mel("cravejadoDeGemas", "Cravejado de gemas", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "+2 em Enganação.", { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 2, categoria: "item" }] }),
    mel("discreto", "Discreto", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "–1 espaço (mín. 1) e +5 em Ladinagem para ocultar.", { espacos: -1 }),
    mel("macabro", "Macabro", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "+2 em Intimidação e –2 em Diplomacia.", { efeitos: [{ t: "bonus", alvo: "pericia.intimidacao", valor: 2, categoria: "item" }, { t: "bonus", alvo: "pericia.diplomacia", valor: -2, categoria: "item" }] }),
    mel("materialEspecial", "Material especial", ["arma", "armadura", "escudo", "esoterico"], "Feito de um material especial (preço do material à parte)."),
  ];
  var MATERIAIS = [
    { id: "acoRubi", nome: "Aço-rubi", pagina: 166, precos: { arma: 6000, leve: 3000, pesada: 6000, escudo: 3000, esoterico: 6000 },
      arma: "Ignora 10 de RD e a imunidade a crítico de lefeu.", armadura: "Chance de ignorar dano extra de crítico e furtivo: 25% leve/escudo, 50% pesada (cumulativas).", esoterico: "Magias de dano ignoram 10 de RD e as imunidades de lefeu.", efeitoArma: { ignoraRD: 10 } },
    { id: "adamante", nome: "Adamante", pagina: 166, precos: { arma: 3000, leve: 6000, pesada: 18000, escudo: 6000, esoterico: 3000 },
      arma: "Dano +1 passo.", armadura: "RD 2 (leve e escudo) ou 5 (pesada).", esoterico: "+1 PM para rolar de novo resultados 1 no dano da magia.", efeitoArma: { passo: 1 }, rdArmadura: { leve: 2, escudo: 2, pesada: 5 } },
    { id: "geloEterno", nome: "Gelo eterno", pagina: 166, precos: { arma: 600, leve: 1500, pesada: 3000, escudo: 1500, esoterico: 3000 },
      arma: "+2 de dano de frio.", armadura: "Redução de fogo 5 (leve e escudo) ou 10 (pesada).", esoterico: "Rola de novo 1s no dano das magias de frio.", efeitoArma: { danoExtraFixo: 2, tipo: "frio" }, rdFogo: { leve: 5, escudo: 5, pesada: 10 } },
    { id: "madeiraTollon", nome: "Madeira Tollon", pagina: 167, precos: { arma: 1500, escudo: 1500, esoterico: 1500 }, soMadeira: true,
      arma: "Conta como mágica para vencer RD; habilidades de ataque custam –1 PM.", armadura: "Escudo leve: resistência a magia +2.", esoterico: "Resistência a magia +2." },
    { id: "materiaVermelha", nome: "Matéria vermelha", pagina: 167, precos: { arma: 1500, leve: 6000, pesada: 18000, escudo: 6000, esoterico: 3000 }, penalidadeCarisma: -2,
      arma: "+1d6 de dano; cada acerto custa 1 PV ao usuário (lefou e lefeu imunes).", armadura: "Falha 10% (leve e escudo) ou 25% (pesada), cumulativas.", esoterico: "Você e inimigos em alcance curto sofrem –2 em resistência contra magia.", efeitoArma: { danoExtra: "1d6" } },
    { id: "mitral", nome: "Mitral", pagina: 167, precos: { arma: 1500, leve: 1500, pesada: 12000, escudo: 1500, esoterico: 3000 }, espacos: -1,
      arma: "+1 na margem de ameaça.", armadura: "–2 na penalidade; pesada permite até 2 de Destreza na Defesa.", esoterico: "+2 PM para +2 na CD da magia.", efeitoArma: { margem: 1 } },
  ];
  /* Munição superior ou mágica paga metade do aumento de uma arma (p. 151). */
  var FATOR_MUNICAO = 0.5;
  /* Fabricar (p. 121–122, 167): matéria-prima 1/3 do preço; CD 15 simples ou 20 complexo, + CD das melhorias. */
  function precoDoItem(base, nMelhorias, material) { return (Number(base) || 0) + (PRECO_MELHORIAS[nMelhorias] || 0) + (Number(material) || 0); }

  function porId(lista) { var m = {}; lista.forEach(function (x) { m[x.id] = x; }); return m; }
  var TODOS = ARMAS.concat(MUNICOES, ARMADURAS, ITENS);
  var ITEM = porId(TODOS);

  global.RAMATormenta20Equipamento = {
    DINHEIRO_INICIAL: DINHEIRO_INICIAL, MOEDAS: MOEDAS, VENDA: VENDA, ITENS_INICIAIS: ITENS_INICIAIS,
    PASSOS: PASSOS, passoDeDano: passoDeDano,
    ARMAS: ARMAS, MUNICOES: MUNICOES, DESARMADO: DESARMADO, IMPROVISADA: IMPROVISADA, ALCANCES: ALCANCES,
    ARMADURAS: ARMADURAS, REGRAS_ARMADURA: REGRAS_ARMADURA, ITENS: ITENS, SERVICOS: SERVICOS,
    PRECO_MELHORIAS: PRECO_MELHORIAS, CD_MELHORIAS: CD_MELHORIAS, MELHORIAS: MELHORIAS, MELHORIA: porId(MELHORIAS),
    MATERIAIS: MATERIAIS, MATERIAL: porId(MATERIAIS), FATOR_MUNICAO: FATOR_MUNICAO, precoDoItem: precoDoItem,
    TODOS: TODOS, ITEM: ITEM,
  };
})(typeof window !== "undefined" ? window : globalThis);
