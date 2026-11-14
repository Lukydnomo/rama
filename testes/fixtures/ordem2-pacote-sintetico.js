/* =====================================================================
   R.A.M.A. — um pacote de missão SINTÉTICO de Ordem II (testes)
   ---------------------------------------------------------------------
   Conteúdo inventado, só para exercitar os procedimentos (quadro,
   desafios, ferramentas, sobrecarga, ondas, perseguição, esconderijo)
   sem depender do pacote real — que é conteúdo do Mestre e mora fora do
   git (backend/Ordem2Pacotes.local.gs). Mesmo formato.
   ===================================================================== */
globalThis.PACOTE_SINTETICO_ORDEM2 = {
  sintetico: {
    id: "sintetico", nome: "Pacote sintético", versao: 1, perfil: "beta-vigilia",
    anexos: [
      { id: "h-foto", nome: "Foto da estante (sintética)", arquivo: "foto.png", veio: true },
      { id: "a-bips", nome: "Áudio de bips (sintético)", arquivo: "", veio: false, alternativa: "Bip — bip — bip-bip-bip (1-1-3)." },
      { id: "h-laser", nome: "Varredura (sintética)", arquivo: "laser.png", veio: true },
    ],
    compendium: {
      manifestacoes: [{ id: "x", codigo: "TST-0001", nome: "Manifestação de teste", elementos: ["Sangue"], tracos: ["Traço inventado"] }],
      sinais: { Sangue: { laboratorio: ["Resíduo em autofagia"], termometro: ["Quente"] } },
    },
    cenas: [
      { id: "sala", nome: "Sala de testes", tipo: "investigacao", perfil: "alpha-contemporaneo",
        areas: [{ id: "a1", nome: "Sala", laser: { pontos: ["estante"], anexo: "h-laser" } }],
        ferramentas: ["laboratorio", "uv", "radio", "emf", "termometro", "camera", "compendium", "laser"],
        anunciados: ["estante"],
        pontos: [
          { id: "estante", numero: "1", area: "a1", nome: "Estante sintética", descricao: "Uma estante cheia de caixas.", contextual: "Atrás dela há um cofre (solução: 4-2-6).",
            notaPrivada: "SOLUCAO-SECRETA",
            pistas: [
              { id: "e1", pericias: ["percepcao"], dt: 6, texto: "Há poeira mexida na prateleira de baixo." },
              { id: "e2", pericias: ["percepcao"], dt: 8, texto: "Uma caixa tem fundo falso.", anexo: "h-foto" },
              { id: "e3", pericias: ["pesquisar"], dt: 6, texto: "PISTA-COM-REQUISITO", requer: ["desafio:cofre"] },
              { id: "e4", pericias: ["intuicao"], dt: 4, texto: "Só a Rhiona sente isso.", restricao: "Rhiona" },
              { id: "e5", pericias: ["percepcao"], dt: 4, texto: "Com cinco na mesa, há marcas extras.", jogadores: [5] },
            ],
            ferramentas: {
              laboratorio: { sequencia: 5, texto: "O resíduo se devora." },
              uv: { texto: "A caixa brilha." },
              emf: { padrao: "1-1-3", anexo: "a-bips" },
              termometro: { texto: "Mais quente que o ambiente." },
              radio: { conjuntos: ["A CAIXA", "ESTÁ", "VAZIA", "FALSO-1", "FALSO-2", "FALSO-3"], falsos: ["FALSO-1", "FALSO-2", "FALSO-3"], solucao: "A caixa está vazia." },
            },
            desafios: ["cofre", "teclado", "porta", "prateleira", "celular"] },
          { id: "oculto", numero: "2", area: "a1", nome: "Ponto ainda oculto", descricao: "Não anunciado.", pistas: [{ id: "o1", pericias: ["percepcao"], dt: 4, texto: "PISTA-DO-OCULTO" }] },
        ],
        desafios: [
          { id: "cofre", tipo: "destrancar", nome: "Cofre sintético", ponto: "estante", publico: true, config: { faces: 6, max: 3 }, segredo: { senha: [3, 5, 2] } },
          { id: "teclado", tipo: "senha", nome: "Teclado sintético", ponto: "estante", publico: true, config: { digitos: 6, bloqueio: { erros: 3, rodadas: 2 } }, segredo: { resposta: "482915" } },
          { id: "porta", tipo: "arrombar", nome: "Porta sintética", ponto: "estante", publico: true, config: { dt: 7, pa: 10, consequencia: "faz barulho" } },
          { id: "prateleira", tipo: "alcancar", nome: "Prateleira alta", ponto: "estante", publico: true, config: { dt: 7 } },
          { id: "celular", tipo: "hackSocial", nome: "Celular sintético", ponto: "estante", publico: true, config: { dt: 7, necessarias: 2, perguntas: ["Nome do dono?", "Ano?", "Cor favorita?"] }, segredo: { respostas: [["Fulano de Tal"], ["1999"], ["azul"]] } },
          { id: "painel", tipo: "hackTecnico", nome: "Painel sintético", ponto: "estante", publico: true, config: { faixas: [{ min: 10, problema: "2 + 2", segundos: 10 }, { min: 1, max: 9, problema: "17 × 3", segundos: 10 }] }, segredo: { respostas: ["4", "51"] } },
        ],
        tabelas: [
          { id: "sobrecarga", nome: "Sobrecarga (sintética)", tipo: "sobrecarga", ativa: true, inicio: 1, linhas: [{ de: 1, ate: 2, pd: "0" }, { de: 3, ate: 4, pd: "1" }, { de: 5, ate: 6, pd: "1d4" }, { de: 7, ate: 8, pd: "1d6" }, { de: 9, ate: 999, pd: "2d4" }] },
          { id: "maldicao", nome: "Maldição (sintética)", tipo: "maldicao", ativa: false, inicio: 1, linhas: [{ de: 4, ate: 4, pd: "1", condicional: "causarDano", texto: "A marca pulsa." }] },
        ],
        itens: [{ id: "chave", nome: "Chave sintética" }],
      },
      { id: "trilha", nome: "Trilha de testes", tipo: "acao",
        desafios: [
          { id: "tronco", tipo: "equilibrio", nome: "Tronco sintético", publico: true, config: { sucessos: 99, travessia: "trilha-t", avanco: 1, falha: { dano: "1d4", flag: "nadando", recomecar: false, texto: "cai na água" } } },
          { id: "escada", tipo: "equilibrio", nome: "Escada sintética", publico: true, config: { sucessos: 3, falha: { dano: "1d4", texto: "rola escada abaixo" } } },
          { id: "trilha-t", tipo: "travessia", nome: "Travessia sintética", publico: true, config: { areas: [
            { id: "b", nome: "Bosque", meta: 4, acoes: [{ id: "direto", nome: "Direto", pericia: "acrobacia", dt: 10, avanco: 2, falha: { dano: "1d4" } }, { id: "volta", nome: "Pela volta", pericia: "acrobacia", dt: 7, avanco: 1, falha: { dano: "1d4" } }, { id: "trilha", nome: "Procurar trilha", pericia: "sobrevivencia", dt: 7, ganhaPasso: 1 }] },
            { id: "r", nome: "Rio", meta: 3, acoes: [{ id: "tronco", nome: "Tronco", equilibrio: "tronco", requer: ["!nadando"] }, { id: "nadar", nome: "Nadar", pericia: "atletismo", dt: 10, avanco: 1, falha: { dano: "1" } }] },
            { id: "e", nome: "Encosta", meta: 4, escuridao: { apos: 2, passos: -1 }, acoes: [{ id: "andar", nome: "Andando", pericia: "atletismo", dt: 10, avanco: 2, falha: { dano: "1d4", quedaPorFaltante: true, quedaMargem: 3, quedaFaces: 6 } }, { id: "salto", nome: "Salto de fé", pericia: "acrobacia", dt: 7, salto: true }] },
          ] } },
          { id: "torre", tipo: "acumular", nome: "Torre sintética", publico: true, config: { meta: 10, pericia: "atletismo", modos: [{ id: "rapido", nome: "Rápido", dt: 8, soma: "ra" }, { id: "cauteloso", nome: "Cauteloso", dt: 6, soma: "rb" }] } },
          { id: "pedra", tipo: "sustentar", nome: "Pedra sintética", publico: true, config: { dt: 10, porRodada: 1, consequencia: { dano: "2d6" } } },
        ],
        recursos: { runa: { nome: "Runa sintética", opcoes: [{ id: "pv", nome: "1d10 PV", efeito: "pv", dado: "1d10" }, { id: "esc", nome: "Esconderijo d10", efeito: "esconderijo", dado: "1d10" }] } },
        encontro: { nome: "Fuga sintética", perseguicao: { rodadas: 5, pericia: "atletismo", dt: 10, efeito: "devorado", limiares: [{ rodada: 3, minimo: 15 }, { rodada: 4, minimo: 20 }, { rodada: 5, minimo: 30 }], chegada: 30, cabecas: { fisico: [1, 6], emocional: [1, 6], facilitado: [1, 4] }, recuperarFolego: true, sacrificio: true, vala: { limiar: 15, dt: 10, pericia: "percepcao" }, maxMortesFacilitado: 3 } },
      },
      { id: "gruta", nome: "Gruta de testes", tipo: "combate",
        anunciados: ["nichos", "altar"],
        pontos: [
          { id: "altar", nome: "Altar sintético", descricao: "Uma pedra.", pistas: [{ id: "g1", pericias: ["inspecionar"], dt: 6, texto: "Uma runa escondida.", concede: ["item:runa-a"] }, { id: "g2", pericias: ["percepcao"], dt: 4, texto: "Outra runa.", concede: ["item:runa-b"] }] },
          { id: "nichos", nome: "Nichos sintéticos", descricao: "Dois buracos na parede.", pistas: [], desafios: ["runas"] },
        ],
        itens: [{ id: "runa-a", nome: "Pedra (traço)", runa: "terra" }, { id: "runa-b", nome: "Pedra (círculo)", runa: "sol" }],
        desafios: [{ id: "runas", tipo: "runas", nome: "Nichos das runas", ponto: "nichos", publico: true, config: { nichos: 2, concede: ["grupo:chamaAcesa"], aoResolver: "a chama acende" }, segredo: { ordem: ["terra", "sol"] } }],
        encontro: { nome: "Ondas sintéticas", bloqueio: { exatos: 2, porDefensor: 2 }, etapas: [{ id: "luta", nome: "Luta", fases: "quatro" }],
          ondas: { ameaca: "cria-da-floresta", porPersonagem: 1, primeira: 2, intervalo: 3, chegada: 0, pararCom: "chamaAcesa", minimoAntesDeParar: 2, avisoIntuicao: [3, 4] } },
        efeitos: { susto: { nome: "Susto sintético", pericia: "disciplina", dt: 10, dano: "1d6", danoTipo: "emocional", falha: { pavor: true } } },
        roteiro: [{ rodada: 2, texto: "ROTEIRO-SECRETO: as criaturas chegam." }],
      },
    ],
  },
};
