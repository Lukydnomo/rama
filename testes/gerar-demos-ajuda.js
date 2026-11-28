/* =====================================================================
   R.A.M.A. — gera as fichas de demonstração dos tutoriais por sistema
   ---------------------------------------------------------------------
       deno run --allow-read --allow-write=assets/ajuda testes/gerar-demos-ajuda.js

   Cada ficha é montada com o MOTOR do próprio sistema — as mesmas
   receitas dos testes (testes/executar-*.js) — e normalizada pelo
   modelo da ficha (js/ficha.js), como uma ficha recém-criada. Nomes e
   detalhes FICTÍCIOS; as fichas prontas de Ordem II são as dos
   playtests, como o próprio sistema oferece na criação.

   Saída: assets/ajuda/demos/<sistema>.json = { ficha, foto }, lido por
   js/ajuda/demos.js só quando alguém abre o percurso daquele sistema.
   Rode de novo quando o schema da ficha ou um motor mudar; o teste
   testes/executar-ajuda.js confere que cada arquivo ainda se normaliza.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

const MOTORES = [
  "js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js", "js/tema-modelo.js",
  "js/ordem/catalogo.js", "js/ordem/elementos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js",
  "js/ordem/condicoes.js", "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/ramificacao.js", "js/ordem/biblioteca.js", "js/ordem/homebrew-ordem.js", "js/ordem/grade.js",
  "js/ordem/regras.js", "js/ordem/itens.js", "js/ordem/rituais.js", "js/ordem/maldicoes.js",
  "js/ordem/arquivo2.js", "js/ordem/arquivo3.js", "js/ordem/arquivo4.js", "js/ordem/arquivo5.js", "js/ordem/arquivo6.js", "js/ordem/arquivo7.js", "js/ordem/arquivo9.js",
  "js/oblivio/catalogo.js", "js/oblivio/ameacas-dados.js", "js/oblivio/buraco-dados.js", "js/oblivio/regras.js", "js/oblivio/combate.js", "js/oblivio/habilidades.js",
  "js/vampiro/catalogo.js", "js/vampiro/disciplinas-dados.js", "js/vampiro/antagonistas-dados.js", "js/vampiro/dados.js", "js/vampiro/regras.js", "js/vampiro/poderes.js",
  "js/goblins/catalogo.js", "js/goblins/dados.js", "js/goblins/regras.js",
  "js/brutal/catalogo.js", "js/brutal/regras.js",
  "js/tormenta20/dados.js", "js/tormenta20/expressao.js", "js/tormenta20/racas.js", "js/tormenta20/classes-a.js", "js/tormenta20/classes-b.js",
  "js/tormenta20/classes-c.js", "js/tormenta20/origens.js", "js/tormenta20/deuses.js", "js/tormenta20/poderes.js", "js/tormenta20/equipamento.js",
  "js/tormenta20/magias.js", "js/tormenta20/magias-1.js", "js/tormenta20/magias-2.js", "js/tormenta20/magias-3.js", "js/tormenta20/magias-4.js",
  "js/tormenta20/magias-5.js", "js/tormenta20/parceiros.js", "js/tormenta20/itens-magicos.js", "js/tormenta20/itens-magicos-2.js", "js/tormenta20/regras.js",
  "js/ordem2/catalogo.js", "js/ordem2/regras.js", "js/ordem2/motor.js", "js/ordem2/evolucao.js", "js/ordem2/paranormal.js",
  "js/criaturas.js", "js/ordem/companheiro.js", "js/ficha.js",
];
const RAIZ = new URL("../", import.meta.url);
export async function carregarMotores() {
  for (const c of MOTORES) (0, eval)(await Deno.readTextFile(new URL(c, RAIZ)));
}

const fila = (...v) => { const q = v.flat(); const f = () => (q.length ? q.shift() : 1); return f; };

/* As receitas. Cada uma devolve { ficha, foto }. */
export function receitas() {
  const F = globalThis.RAMAFicha;
  const nova = (tipoFicha, nome, bloco, extra) => F.normalizarFicha(Object.assign(F.criarFicha(Object.assign({ tipoFicha, nome }, extra || {})), bloco ? { [tipoFicha]: bloco } : {}));

  return {
    /* Ordem Paranormal: combatente de NEX 5%, origem Atleta (OPRPG).
       As escolhas da classe ficam abertas na Progressão, como numa ficha
       recém-criada — é a preparação que o percurso mostra. */
    ordem() {
      const R = globalThis.RAMAOrdemRegras;
      const o = R.fichaVazia();
      o.nex = 5;
      o.classe = "combatente";
      o.origem = "atleta";
      o.atributos = { agi: 2, for: 3, int: 1, pre: 1, vig: 2 };
      ["luta", "fortitude", "acrobacia", "atletismo", "percepcao", "iniciativa"].forEach((p) => { o.pericias[p] = "treinado"; });
      o.periciasDaOrigem = ["acrobacia", "atletismo"];
      const ficha = nova("ordem", "Davi Ferraz", R.normalizar(o), { classe: "Combatente", origem: "Atleta" });
      ficha.anotacoes.soltas.push({ id: "demo-nota", titulo: "Conceito", conteudo: "Ex-atleta de corrida de rua recrutado depois de sobreviver a um ataque paranormal no parque.", imagens: [], criadoEm: ficha.criadoEm, atualizadoEm: ficha.criadoEm });
      return { ficha, foto: "" };
    },

    /* Ordem II: uma ficha pronta do Playtest Beta (o sistema oferece
       essas fichas na criação, com a procedência registrada). */
    ordem2() {
      const R = globalThis.RAMAOrdem2;
      const K = globalThis.RAMAOrdem2Catalogo;
      const id = K.PRESETS.filter((p) => /beta/i.test(p.fonte || ""))[0]?.id || K.PRESETS[0].id;
      const bloco = R.dePreset(id, "2026-01-01T00:00:00.000Z");
      const ficha = nova("ordem2", K.preset(id).nome, bloco);
      return { ficha, foto: "" };
    },

    /* Oblívio: Quem Sabe, com os atributos do exemplo do livro. */
    oblivio() {
      const R = globalThis.RAMAOblivio;
      const C = globalThis.RAMAOblivioCatalogo;
      const o = R.fichaVazia();
      o.papel = "sabe";
      Object.assign(o.atributos, { carne: 2, forca: 0, fuga: 2, determinacao: 2, mente: 4 });
      C.papel.sabe.lista.slice(0, 3).forEach((k) => o.especializacoes.push({ id: R.novoId("es"), conhecimento: k, origem: "papel" }));
      const extra = C.CONHECIMENTOS.map((c) => c.chave).filter((k) => !o.especializacoes.some((s) => s.conhecimento === k));
      for (let i = 0; i < R.metade(o.atributos.mente); i++) o.especializacoes.push({ id: R.novoId("es"), conhecimento: extra[i], origem: "mente" });
      const lim = R.limiteTotal(o).total;
      const mapa = R.sugerirDistribuicao(o);
      o.corpo.regioes.forEach((r) => { if (mapa[r.chave] !== undefined) r.limite = mapa[r.chave]; });
      const soma = o.corpo.regioes.reduce((s, r) => s + r.limite, 0);
      if (soma !== lim) R.regiao(o, "torso").limite += lim - soma;
      R.concluirCriacao(o);
      return { ficha: nova("oblivio", "Lia Montenegro", o), foto: "" };
    },

    /* Vampiro V5: Brujah neófito regular (validarCriacao sem pendências). */
    vampiro() {
      const R = globalThis.RAMAVampiro;
      const o = R.fichaVazia("vampiro");
      Object.assign(o, { conceito: "Mecânica de motos que não aceita o Príncipe", cla: "brujah", senhor: "Ana", geracao: 13, idade: "neofito", ambicao: "Tirar o bairro das mãos do Príncipe", desejo: "Ganhar a corrida de sábado" });
      Object.assign(o.atributos, { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, autocontrole: 2, inteligencia: 2, raciocinio: 2, determinacao: 1 });
      o.criacao.distribuicao = "especialista";
      Object.assign(o.habilidades, { briga: 4, atletismo: 3, intimidacao: 3, manha: 3, persuasao: 2, furtividade: 2, armasBrancas: 2, conducao: 1, percepcao: 1, sobrevivencia: 1 });
      o.especializacoes.push({ id: "es-1", habilidade: "briga", nome: "Membros", origem: "criacao" });
      o.disciplinas = { potencia: 2, celeridade: 1 };
      o.poderes = [{ id: "p1", chave: "corpoLetal", origem: "criacao" }, { id: "p2", chave: "poderio", origem: "criacao" }, { id: "p3", chave: "reflexosRapidos", origem: "criacao" }];
      R.escolherPredador(o, "viraLata", { especializacao: 1, disciplina: "celeridade", poder: "gracaFelina" });
      o.vantagens.push({ id: "v1", chave: "recursos", pontos: 2, origem: "criacao" }, { id: "v2", chave: "aliados", pontos: 3, origem: "criacao" }, { id: "v3", chave: "refugio", pontos: 2, origem: "criacao" }, { id: "v4", chave: "inimigos", pontos: 2, origem: "criacao" });
      o.convicoes.push({ id: "cv1", texto: "Nunca abandonar um amigo" });
      o.pilares.push({ id: "pi1", nome: "Irmã", convicaoId: "cv1", estado: "vivo" });
      const v = R.validarCriacao(o);
      if (!v.completa) throw new Error("vampiro com pendências: " + JSON.stringify(v.pendencias));
      return { ficha: nova("vampiro", "Rita Valença", o), foto: "" };
    },

    /* Malditos Goblins: mercenário medíocre, criação concluída. */
    goblins() {
      const R = globalThis.RAMAGoblins;
      const o = R.fichaVazia();
      o.ocupacao = "mercenario"; o.descritor = "mediocre";
      o.caracteristicas = [{ id: "ca-1", chave: "pintas", quantidade: null }];
      o.equipamentoInicial = 0;
      o.escolhas.armaFavorita = "espada";
      const r = R.concluirCriacao(o, fila(4, 2, 5, 3, 6, 1, 2, 3));
      if (!r.ok) throw new Error("goblin: " + r.motivo);
      return { ficha: nova("goblins", "Gnarlo Pé-de-Lama", o), foto: "" };
    },

    /* BRUTAL: a Cética, com Apegos. */
    brutal() {
      const B = globalThis.RAMABrutal;
      const bloco = B.normalizar({
        arquetipo: "cetica", pronomes: "ela/dela", interprete: "",
        apegos: { item: { nome: "Bloco de notas" }, relacao: { nome: "O irmão mais novo" }, desejo: { texto: "Provar que o fantasma do acampamento é um homem de verdade." } },
      });
      return { ficha: nova("brutal", "Iva Martins", bloco), foto: "assets/brutal/arquetipos/cetica.webp" };
    },

    /* Tormenta20: guerreiro humano de 1º nível, soldado (p. 19, 64 e 92). */
    tormenta20() {
      const R = globalThis.RAMATormenta20;
      const b = R.fichaVazia();
      b.metodo = "pontos";
      b.atributosBase = { "for": 3, des: 1, con: 2, "int": 0, sab: 1, car: 0 };
      b.raca = { id: "humano", variante: "", atributos: ["for", "con", "des"], escolhas: {} };
      b.origem = { id: "soldado", beneficios: [{ tipo: "pericia", id: "fortitude" }, { tipo: "poder", id: "influenciaMilitar" }], escolhas: {} };
      b.niveis = [{ classe: "guerreiro", escolhas: { pericias: ["atletismo", "intimidacao"], ou: ["luta"] } }];
      b.inventario.itens = [
        R.normalizarItem({ ref: "espadaLonga", estado: "empunhado", mao: "principal" }),
        R.normalizarItem({ ref: "cotaDeMalha", estado: "vestido" }),
      ];
      return { ficha: nova("tormenta20", "Tália de Valkaria", R.normalizar(b)), foto: "" };
    },
  };
}

if (import.meta.main) {
  await carregarMotores();
  const pasta = new URL("assets/ajuda/demos/", RAIZ);
  await Deno.mkdir(pasta, { recursive: true });
  const r = receitas();
  for (const sistema of Object.keys(r)) {
    const { ficha, foto } = r[sistema]();
    if (ficha.tipoFicha !== sistema) throw new Error(sistema + ": tipoFicha " + ficha.tipoFicha);
    const texto = JSON.stringify({ gerado: "testes/gerar-demos-ajuda.js", ficha, foto }, null, 1) + "\n";
    await Deno.writeTextFile(new URL(sistema + ".json", pasta), texto);
    console.log(sistema.padEnd(11), (texto.length / 1024).toFixed(1) + " KB", ficha.nome);
  }
}
