/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · antagonistas do Livro Básico
   =====================================================================
   p. 369–377 (PDF +4). Cada um com a fisiologia própria:
     natureza "mortal"   paradas Físico/Social/Mental padrão + as
                         excepcionais; Debilitado = incapacitado
     natureza "animal"   idem, com o dano extra da espécie
     natureza "vampiro"  ficha completa (Atributos, Habilidades,
                         Disciplinas, Humanidade, Potência)
     natureza "criatura" sem Fome: o que seria Checagem vira 1
                         Superficial à FdV ou à Vitalidade (p. 376)
   O catálogo é só leitura: uma cópia vira PN da crônica e pode ser
   editada lá, marcada como personalizada.
   ===================================================================== */

(function (global) {
  "use strict";

  function m(chave, nome, natureza, o) { return Object.assign({ chave: chave, nome: nome, natureza: natureza }, o); }

  var LISTA = [
    /* Mortais (p. 371–372) */
    m("detetive", "Detetive da Polícia", "mortal", { paradas: { fisico: 4, social: 3, mental: 4 }, vitalidade: 6, forcaDeVontade: 5, excepcionais: { atletismo: 5, armasDeFogo: 5, investigacao: 6, manha: 5 }, pagina: 371 }),
    m("criminoso", "Criminoso", "mortal", { paradas: { fisico: 4, social: 3, mental: 3 }, vitalidade: 6, forcaDeVontade: 4, excepcionais: { briga: 5, armasDeFogo: 5, intimidacao: 5, ladroagem: 5, manha: 7 }, pagina: 371 }),
    m("clerigo", "Clérigo", "mortal", { paradas: { fisico: 3, social: 5, mental: 4 }, vitalidade: 5, forcaDeVontade: 7, excepcionais: { erudicao: 6, sagacidade: 7, ocultismo: 5, lideranca: 6 }, especial: "Alguns possuem Fé Verdadeira (p. 222).", pagina: 371 }),
    m("cacadorDaFe", "Caçador da Fé", "mortal", { paradas: { fisico: 4, social: 4, mental: 5 }, vitalidade: 6, forcaDeVontade: 8, excepcionais: { erudicao: 7, percepcao: 7, armasBrancas: 6, investigacao: 7, ocultismo: 8 }, especial: "Sangue alterado: +4 dados para resistir a Disciplinas; beber dele causa 4 Agravado salvo Vigor + Determinação, Dif 5.", resistirDisciplinas: 4, pagina: 371 }),
    m("investigadorInquisicao", "Investigador da Inquisição", "mortal", { paradas: { fisico: 5, social: 4, mental: 5 }, vitalidade: 7, forcaDeVontade: 7, excepcionais: { erudicao: 6, percepcao: 7, armasDeFogo: 6, investigacao: 7 }, pagina: 372 }),
    m("inquisidorDelta", "Inquisidor Delta", "mortal", { paradas: { fisico: 6, social: 4, mental: 4 }, vitalidade: 8, forcaDeVontade: 7, excepcionais: { atletismo: 8, percepcao: 7, briga: 8, armasDeFogo: 9, armasBrancas: 8, especialista: 9 }, especial: "Equipamento apropriado à missão (armaduras, munições especiais).", pagina: 372 }),
    m("carnical", "Carniçal", "carnical", { paradas: { fisico: 4, social: 4, mental: 4 }, vitalidade: 6, forcaDeVontade: 5, excepcionais: { percepcao: 6, intimidacao: 5, ocultismo: 6, furtividade: 5 }, disciplinas: 1, especial: "Uma Disciplina com valor 1 (p. 234).", pagina: 372 }),
    /* Animais (p. 373) */
    m("morcego", "Morcego (grande)", "animal", { paradas: { fisico: 3, social: 1, mental: 1 }, vitalidade: 2, forcaDeVontade: 1, excepcionais: { percepcao: 7, furtividade: 5 }, pagina: 373 }),
    m("urso", "Urso", "animal", { paradas: { fisico: 7, social: 1, mental: 1 }, vitalidade: 8, forcaDeVontade: 3, excepcionais: { percepcao: 3, intimidacao: 6 }, danoExtra: 2, pagina: 373 }),
    m("aveDeRapina", "Ave de Rapina", "animal", { paradas: { fisico: 4, social: 1, mental: 1 }, vitalidade: 3, forcaDeVontade: 2, excepcionais: { percepcao: 6, briga: 5, furtividade: 6 }, pagina: 373 }),
    m("caoDeGuarda", "Cão de Guarda", "animal", { paradas: { fisico: 5, social: 1, mental: 1 }, vitalidade: 5, forcaDeVontade: 2, excepcionais: { percepcao: 4, briga: 6, intimidacao: 4, furtividade: 4 }, danoExtra: 1, pagina: 373 }),
    m("cavalo", "Cavalo", "animal", { paradas: { fisico: 6, social: 1, mental: 1 }, vitalidade: 7, forcaDeVontade: 2, excepcionais: { percepcao: 4 }, danoExtra: 2, especial: "+2 de dano ao pisotear caídos.", pagina: 373 }),
    m("rato", "Rato", "animal", { paradas: { fisico: 3, social: 1, mental: 1 }, vitalidade: 1, forcaDeVontade: 1, excepcionais: { percepcao: 5, briga: 4, furtividade: 7 }, especial: "Um bando soma 3 à Vitalidade e às rolagens Físicas.", pagina: 373 }),
    m("lobo", "Lobo", "animal", { paradas: { fisico: 6, social: 1, mental: 1 }, vitalidade: 6, forcaDeVontade: 3, excepcionais: { percepcao: 3, intimidacao: 5, furtividade: 5 }, danoExtra: 1, pagina: 373 }),
    /* Vampiros (p. 374–375) */
    m("harpiaDeElisio", "Harpia de Elísio", "vampiro", {
      atributos: { forca: 2, destreza: 3, vigor: 2, carisma: 4, manipulacao: 4, autocontrole: 3, inteligencia: 2, raciocinio: 3, determinacao: 3 }, vitalidade: 5, forcaDeVontade: 6,
      habilidades: { erudicao: 2, percepcao: 4, financas: 2, investigacao: 3, politica: 4, ocultismo: 1, atletismo: 1, briga: 1, oficios: 1, conducao: 2, etiqueta: 5, sagacidade: 4, intimidacao: 3, lideranca: 3, performance: 3, persuasao: 4, manha: 3, subterfugio: 4 },
      disciplinas: { auspicios: 3, celeridade: 2, fortitude: 1, presenca: 3 }, humanidade: 6, potencia: 3, pagina: 374 }),
    m("revolucionarioAnarch", "Revolucionário Anarch", "vampiro", {
      atributos: { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 3, autocontrole: 2, inteligencia: 2, raciocinio: 4, determinacao: 4 }, vitalidade: 6, forcaDeVontade: 6,
      habilidades: { erudicao: 1, percepcao: 3, investigacao: 1, ocultismo: 1, politica: 3, ciencia: 2, tecnologia: 3, atletismo: 4, briga: 4, conducao: 3, armasDeFogo: 3, ladroagem: 4, armasBrancas: 3, furtividade: 2, sobrevivencia: 2, empatiaComAnimais: 2, etiqueta: 1, sagacidade: 2, intimidacao: 2, lideranca: 2, persuasao: 1, manha: 4, subterfugio: 1 },
      disciplinas: { animalismo: 2, celeridade: 2, fortitude: 3, potencia: 2, proteanismo: 1 }, humanidade: 7, potencia: 2, pagina: 374 }),
    m("bispoNodista", "Bispo Nodista", "vampiro", {
      atributos: { forca: 2, destreza: 2, vigor: 2, carisma: 5, manipulacao: 3, autocontrole: 4, inteligencia: 5, raciocinio: 3, determinacao: 5 }, vitalidade: 8, forcaDeVontade: 9,
      habilidades: { erudicao: 4, percepcao: 2, financas: 1, investigacao: 2, medicina: 2, politica: 4, ocultismo: 5, ciencia: 1, ladroagem: 2, armasBrancas: 1, furtividade: 2, empatiaComAnimais: 1, etiqueta: 4, sagacidade: 3, intimidacao: 3, lideranca: 4, performance: 2, persuasao: 5, subterfugio: 4 },
      disciplinas: { auspicios: 2, dominacao: 2, fortitude: 3, presenca: 4 }, humanidade: 5, potencia: 3, pagina: 375 }),
    m("xerifeSanguinario", "Xerife Sanguinário", "vampiro", {
      atributos: { forca: 4, destreza: 5, vigor: 4, carisma: 2, manipulacao: 1, autocontrole: 2, inteligencia: 3, raciocinio: 4, determinacao: 4 }, vitalidade: 7, forcaDeVontade: 7,
      habilidades: { erudicao: 1, percepcao: 3, financas: 1, investigacao: 4, politica: 2, tecnologia: 2, atletismo: 4, briga: 3, conducao: 2, armasDeFogo: 4, ladroagem: 3, armasBrancas: 3, furtividade: 4, sobrevivencia: 3, empatiaComAnimais: 2, etiqueta: 1, sagacidade: 1, intimidacao: 5, lideranca: 1, persuasao: 1, manha: 3 },
      disciplinas: { animalismo: 2, celeridade: 3, ofuscacao: 3, potencia: 4 }, humanidade: 5, potencia: 4, pagina: 375 }),
    m("criatura", "Criatura (Humanidade 0)", "vampiro", {
      atributos: { forca: 3, destreza: 3, vigor: 5, carisma: 1, manipulacao: 1, autocontrole: 1, inteligencia: 1, raciocinio: 4, determinacao: 2 }, vitalidade: 8, forcaDeVontade: 3,
      habilidades: { percepcao: 5, investigacao: 4, atletismo: 4, briga: 4, armasDeFogo: 1, armasBrancas: 2, furtividade: 4, sobrevivencia: 5, empatiaComAnimais: 2, intimidacao: 4, subterfugio: 2 },
      disciplinas: { animalismo: 3, celeridade: 4, fortitude: 3, potencia: 4 }, humanidade: 0, potencia: 3, pagina: 375 }),
    /* Criaturas de horror (p. 376–377) */
    m("lobisomem", "Lobisomem", "criatura", { semFome: true, vitalidade: 7, forcaDeVontade: 6,
      atributos: { forca: 3, destreza: 3, vigor: 4, carisma: 3, manipulacao: 3, autocontrole: 2, inteligencia: 3, raciocinio: 4, determinacao: 4 },
      disciplinas: { animalismo: 5, auspicios: 5, celeridade: 4, fortitude: 5, ofuscacao: 1, potencia: 5 },
      especial: "Sofre Agravado só de armas de prata e fogo; recupera 1 Superficial à Vitalidade por turno; garras e presas causam Superficial não dividido em vampiros (+3); +3 em todos os Atributos Físicos na forma de guerra. Sangue: cada gole sacia o dobro e +1 Dificuldade para resistir a frenesi por Fome saciada.", pagina: 376 }),
    m("mago", "Mago", "criatura", { semFome: true, vitalidade: 5, forcaDeVontade: 10,
      atributos: { forca: 2, destreza: 3, vigor: 2, carisma: 3, manipulacao: 4, autocontrole: 5, inteligencia: 5, raciocinio: 4, determinacao: 5 },
      disciplinas: { auspicios: 4, feiticaria: 4, dominacao: 4, ofuscacao: 3, presenca: 2 },
      especial: "Tão vulnerável quanto mortais; pode erguer defesas ad hoc gastando 1 FdV.", pagina: 377 }),
    m("feerico", "Feérico", "criatura", { semFome: true, vitalidade: 6, forcaDeVontade: 7,
      atributos: { forca: 2, destreza: 4, vigor: 3, carisma: 7, manipulacao: 5, autocontrole: 4, inteligencia: 3, raciocinio: 4, determinacao: 4 },
      disciplinas: { celeridade: 1, dominacao: 4, ofuscacao: 4, presenca: 5 },
      especial: "Agravado só de fogo e ferro frio; ilusões: Raciocínio ou Determinação + Auspícios vs. Manipulação + Raciocínio.", pagina: 377 }),
    m("espectro", "Espectro", "criatura", { semFome: true, vitalidade: 7, forcaDeVontade: 4,
      atributos: { forca: 4, destreza: 4, vigor: 4, carisma: 1, manipulacao: 3, autocontrole: 2, inteligencia: 3, raciocinio: 3, determinacao: 2 },
      disciplinas: { auspicios: 4, celeridade: 2, dominacao: 2, ofuscacao: 2 },
      especial: "Não pode ser atacado sem forma concreta; possui corpos (como Possessão); Destreza + Briga para arremessar objetos.", pagina: 377 }),
  ];

  /* Antagonista simples (p. 370): só uma Dificuldade. */
  function simples(nome, dificuldade) { return { chave: "", nome: nome, natureza: "simples", dificuldade: Math.max(1, Math.min(7, Number(dificuldade) || 3)) }; }

  global.RAMAVampiroAntagonistas = {
    LISTA: LISTA, simples: simples,
    porChave: function (k) { return LISTA.filter(function (a) { return a.chave === k; })[0] || null; },
  };
})(typeof window !== "undefined" ? window : globalThis);
