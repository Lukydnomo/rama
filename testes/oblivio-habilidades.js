/* =====================================================================
   R.A.M.A. — testes de Oblívio: habilidades e ações específicas
   Chamado por executar-oblivio.js.
   ===================================================================== */

export async function testarHabilidades({ t, fila, persona, exemplosDoLivro }) {
  const C = globalThis.RAMAOblivioCatalogo, R = globalThis.RAMAOblivio, K = globalThis.RAMAOblivioCombate;
  const M = globalThis.RAMAOblivioMesa, H = globalThis.RAMAOblivioHabilidades;

  const ctxRodada = (rodada, cena) => ({ cena: cena || "c1", rodada: rodada, partida: "p1", tipoDeCena: "combate", momento: "inicioDaRodada" });

  t.grupo("Oblívio · Quem Cuida");
  {
    const cuida = persona("cuida", { carne: 2, forca: 0, fuga: 0, determinacao: 0, mente: 8 });
    const ar = persona("age", exemplosDoLivro.age), ju = persona("protege", exemplosDoLivro.protege);
    R.receberEstresse(ar, 6, { regiao: "torso" }); R.receberEstresse(ju, 6, { regiao: "torso" });
    const m = M.estadoVazio(); m.fileiras.personas = ["ar", "cuida", "ju"];
    const fichas = { cuida, ar, ju };
    const r = H.usar("ajudarOsNecessitados", { fichas, quem: "cuida", alvos: ["ar", "ju"], mesa: m, ctx: ctxRodada(1) });
    t.ok("Ajudar os Necessitados: 2 adjacentes recuperam metade de Mente (8 → 4 cada) — exemplo da p. 47", r.ok && R.regiao(ar, "torso").estresse === 2 && R.regiao(ju, "torso").estresse === 2);
    t.ok("  uma vez por rodada", !H.usar("ajudarOsNecessitados", { fichas, quem: "cuida", alvos: ["ar"], mesa: m, ctx: ctxRodada(1) }).ok);
    t.ok("  na rodada seguinte, de novo", H.usar("ajudarOsNecessitados", { fichas, quem: "cuida", alvos: ["ar"], mesa: m, ctx: ctxRodada(2) }).ok);
    t.ok("  fora do início da rodada: recusado", !H.usar("ajudarOsNecessitados", { fichas, quem: "cuida", alvos: ["ar"], mesa: m, ctx: Object.assign(ctxRodada(3), { momento: "" }) }).ok);
    m.fileiras.personas = ["ar", "ju", "cuida"];
    t.ok("  só adjacentes", !H.usar("ajudarOsNecessitados", { fichas, quem: "cuida", alvos: ["ar"], mesa: m, ctx: ctxRodada(4) }).ok);
    R.adquirirHabilidade(cuida, "abrirFeridas", {}, "progressao");
    const af = H.usar("abrirFeridas", { fichas, quem: "cuida", ctx: ctxRodada(4) });
    t.ok("Abrir Feridas: a cura REALMENTE feita em outras nesta cena (4+4+2 = 10) vira dano extra = metade (5)", af.ok && af.extra === 5);
    t.ok("  uma vez por rodada", !H.usar("abrirFeridas", { fichas, quem: "cuida", ctx: ctxRodada(4) }).ok);
    t.ok("  em outra cena, a reserva é outra", !H.usar("abrirFeridas", { fichas, quem: "cuida", ctx: ctxRodada(1, "c2") }).ok);
    R.adquirirHabilidade(cuida, "balsamo", {}, "progressao");
    R.aplicarMazela(ju, "lentidao", {}, {});
    m.fileiras.personas = ["ar", "cuida", "ju"];
    t.ok("Bálsamo tira uma mazela de uma adjacente", H.usar("balsamo", { fichas, quem: "cuida", alvos: ["ju"], mesa: m, ctx: ctxRodada(5), param: { mazela: "lentidao" } }).ok && !R.temMazela(ju, "lentidao"));
    R.aplicarFardo(ju, "fragilidade", fila());
    t.ok("  mas não um Fardo", !H.usar("balsamo", { fichas, quem: "cuida", alvos: ["ju"], mesa: m, ctx: ctxRodada(5), param: { mazela: "fragilidade" } }).ok && ju.fardos.length === 1);
    R.perderRegiao(ar, "bracoE", "teste");
    const br = H.usar("balsamo", { fichas, quem: "cuida", alvos: ["ar"], mesa: m, ctx: ctxRodada(5), param: { regiao: "bracoE", limite: 2 } });
    t.ok("  1×/Partida recupera uma região perdida; quem cuida recebe o limite dela em Estresse", br.ok && R.regiao(ar, "bracoE").estado === "organica" && R.regiao(cuida, "torso").estresse === 2);
    t.ok("  segunda vez na mesma Partida: recusado", !H.usar("balsamo", { fichas, quem: "cuida", alvos: ["ar"], mesa: m, ctx: ctxRodada(6), param: { regiao: "bracoE", limite: 2 } }).ok);
    R.adquirirHabilidade(cuida, "ultimaEsperanca", {}, "progressao");
    R.receberEstresse(ar, 4, { regiao: "torso" });
    H.usar("ultimaEsperanca", { fichas, quem: "cuida", ctx: ctxRodada(7) });
    let antes = R.calcular(ar).estresseTotal;
    H.ultimaEsperancaNoTurno(fichas, "cuida", ctxRodada(7));
    t.igual("Última Esperança: o grupo todo recupera metade de Mente no início do turno", antes - R.calcular(ar).estresseTotal, Math.min(antes, 4));
    H.ultimaEsperancaNoTurno(fichas, "cuida", ctxRodada(8)); H.ultimaEsperancaNoTurno(fichas, "cuida", ctxRodada(9));
    antes = R.calcular(ju).estresseTotal + 1; R.receberEstresse(ju, 1, { regiao: "torso" });
    H.ultimaEsperancaNoTurno(fichas, "cuida", ctxRodada(10));
    t.igual("  só 3 rodadas", R.calcular(ju).estresseTotal, antes);
    t.ok("  uma vez por cena", !H.usar("ultimaEsperanca", { fichas, quem: "cuida", ctx: ctxRodada(11) }).ok);
  }
  t.grupo("Oblívio · Quem Resolve e Quem Sabe");
  {
    const res = persona("resolve", { carne: 2, forca: 0, fuga: 0, determinacao: 6, mente: 2 });
    const ar = persona("age", exemplosDoLivro.age);
    R.adquirirHabilidade(res, "animarOsAnimos", {}, "progressao");
    const m = M.estadoVazio(); m.fileiras.personas = ["ar", "res"];
    R.regiao(ar, "torso").estresse = R.regiao(ar, "torso").limite;
    t.ok("Animar os Ânimos ANTES de Fora de Ação: recupera metade da Determinação (3) e impede", H.usar("animarOsAnimos", { fichas: { res, ar }, quem: "res", alvos: ["ar"], mesa: m, ctx: ctxRodada(1) }).impediu && !R.deveFicarForaDeAcao(ar));
    R.regiao(ar, "torso").estresse = R.regiao(ar, "torso").limite;
    t.ok("  uma vez por cena", !H.usar("animarOsAnimos", { fichas: { res, ar }, quem: "res", alvos: ["ar"], mesa: m, ctx: ctxRodada(2) }).ok);
    R.adquirirHabilidade(res, "copiaBarata", {}, "mesa");
    const cuida = persona("cuida", exemplosDoLivro.cuida); R.adquirirHabilidade(cuida, "balsamo", {}, "mesa");
    const cp = H.usar("copiaBarata", { fichas: { res, cuida }, quem: "res", alvos: ["cuida"], ctx: ctxRodada(3), param: { habilidade: "balsamo" } });
    t.ok("Cópia Barata: usa a Habilidade Única de outra até o fim da cena", cp.ok && R.temHabilidade(res, "balsamo"));
    t.ok("  a mesma não é copiada de novo antes do Descanso", !H.usar("copiaBarata", { fichas: { res, cuida }, quem: "res", alvos: ["cuida"], ctx: ctxRodada(1, "c9"), param: { habilidade: "balsamo" } }).ok);
    R.inicioDaCena(res, { cena: "c2" });
    t.ok("  expira no fim da cena", !R.temHabilidade(res, "balsamo"));
    t.ok("  Principal não se copia", !H.usar("copiaBarata", { fichas: { res, cuida }, quem: "res", alvos: ["cuida"], ctx: ctxRodada(1, "c3"), param: { habilidade: "ajudarOsNecessitados" } }).ok);
    R.adquirirHabilidade(res, "instrucaoDecisiva", {}, "mesa");
    t.ok("Instrução Decisiva: ação fora do turno, nunca Completa", H.usar("instrucaoDecisiva", { fichas: { res }, quem: "res", alvos: ["ar"], ctx: ctxRodada(1), param: { acao: "regular" } }).concede.foraDoTurno && !H.usar("instrucaoDecisiva", { fichas: { res }, quem: "res", alvos: ["ar"], ctx: ctxRodada(1), param: { acao: "completa" } }).ok);
    const sabe = persona("sabe", { carne: 2, forca: 0, fuga: 2, determinacao: 2, mente: 4 });
    const rep = H.usar("repertorioDeConhecimento", { fichas: { sabe }, quem: "sabe", ctx: ctxRodada(1) });
    t.ok("Repertório: +metade de Mente (2) num teste; 1×/rodada", rep.bonus.valor === 2 && !H.usar("repertorioDeConhecimento", { fichas: { sabe }, quem: "sabe", ctx: ctxRodada(1) }).ok);
    const calma = { cena: "d1", partida: "p1", tipoDeCena: "descanso" };
    t.ok("  3 vezes numa cena de Descanso", [1, 2, 3].every(() => H.usar("repertorioDeConhecimento", { fichas: { sabe }, quem: "sabe", ctx: calma }).ok) && !H.usar("repertorioDeConhecimento", { fichas: { sabe }, quem: "sabe", ctx: calma }).ok);
    R.adquirirHabilidade(sabe, "feedbackDefensivo", {}, "mesa");
    const ju = persona("protege", exemplosDoLivro.protege);
    const antes = R.protecaoCompleta(ju).total;
    t.ok("Feedback Defensivo: +metade de Mente (mín. 1) até o fim da cena", H.usar("feedbackDefensivo", { fichas: { sabe, ju }, quem: "sabe", alvos: ["ju"], ctx: ctxRodada(1) }).ok && R.protecaoCompleta(ju).total === antes + 2);
    t.ok("  um por Persona", !H.usar("feedbackDefensivo", { fichas: { sabe, ju }, quem: "sabe", alvos: ["ju"], ctx: ctxRodada(1, "c5") }).ok);
    R.inicioDaCena(ju, { cena: "c6" });
    t.igual("  some na cena seguinte", R.protecaoCompleta(ju).total, antes);
    t.ok("  usos entre Descansos = Fôlego (2): o 3º é recusado", H.usar("feedbackDefensivo", { fichas: { sabe, ju }, quem: "sabe", alvos: ["ju"], ctx: ctxRodada(1, "c7") }).ok
      && (R.inicioDaCena(ju, { cena: "c8" }), !H.usar("feedbackDefensivo", { fichas: { sabe, ju }, quem: "sabe", alvos: ["ju"], ctx: ctxRodada(1, "c8") }).ok));
    R.adquirirHabilidade(sabe, "pontoFraco", {}, "mesa");
    t.ok("Ponto Fraco pede a disputa de Saber primeiro", H.usar("pontoFraco", { fichas: { sabe }, quem: "sabe", ctx: ctxRodada(1), param: {} }).pendente.conhecimento === "saber");
    const pf = H.usar("pontoFraco", { fichas: { sabe }, quem: "sabe", ctx: ctxRodada(1), rolador: fila(4), param: { disputa: "venceu", efeito: "mazela" } });
    t.igual("  mazela aleatória por 1D6 (4 → Jura de Morte)", pf.efeitoNoAlvo.mazela, "juraDeMorte");
    t.ok("  ou −1 de Proteção até o próximo dano", H.usar("pontoFraco", { fichas: { sabe }, quem: "sabe", ctx: ctxRodada(1), param: { disputa: "venceu", efeito: "protecao" } }).efeitoNoAlvo.ate === "proximoDano");
  }
  t.grupo("Oblívio · Quem Age e Quem Protege (passivos com gatilho)");
  {
    const ar = persona("age", exemplosDoLivro.age);
    t.ok("Voracidade: primeiro acerto no alvo nesta cena", H.primeiroAcertoNoAlvo(ar, "x", { cena: "c1" }));
    H.registrarAcerto(ar, "x", { cena: "c1" });
    t.ok("  o segundo não", !H.primeiroAcertoNoAlvo(ar, "x", { cena: "c1" }) && H.primeiroAcertoNoAlvo(ar, "y", { cena: "c1" }));
    R.adquirirHabilidade(ar, "sedeDeSangue", {}, "progressao");
    R.receberEstresse(ar, 5, { regiao: "torso" });
    H.sedeDeSangue(ar, 4, {});
    t.igual("Sede de Sangue: elimina e recupera o dano do ataque final", R.calcular(ar).estresseTotal, 1);
    const est = H.usar("estocada", { fichas: { ar }, quem: "ar", ctx: ctxRodada(1), param: { casas: 2 } });
    t.ok("Estocada precisa de Sede? Não — é do Papel; sem tê-la, recusada", !est.ok);
    R.adquirirHabilidade(ar, "estocada", {}, "progressao");
    const e2 = H.usar("estocada", { fichas: { ar }, quem: "ar", ctx: ctxRodada(1), param: { casas: 2 } });
    t.ok("  com ela: +2 de dano e o teste de Reflexos do alvo ao errar", e2.pendente.casasAvancadas === 2 && e2.pendente.aoErrar.teste === "reflexos");
    t.ok("  sem avançar: recusado", !H.usar("estocada", { fichas: { ar }, quem: "ar", ctx: ctxRodada(1), param: { casas: 0 } }).ok);
    const comp = K.composicaoDoDano(ar, { prep: { arma: "", armaValida: false } }, { casasAvancadas: 2 });
    t.ok("  a Estocada entra na composição do dano", comp.somas.some((s) => s.fonte === "Estocada" && s.valor === 2));
    const ju = persona("protege", { carne: 6, forca: 2, fuga: 0, determinacao: 2, mente: 0 });
    R.adquirirHabilidade(ju, "armaduraDeEspinhos", {}, "progressao");
    t.iguais("Armadura de Espinhos: atacante testa Reflexos (leitura do \"teste de Fuga\") ou sofre metade de Carne", H.armaduraDeEspinhos(ju, { testeDeFuga: "reflexos" }), { teste: "reflexos", dano: 3, fonte: "Armadura de Espinhos" });
    t.igual("  ajuste da mesa: a Testemunha decide o teste", H.armaduraDeEspinhos(ju, { testeDeFuga: "testemunha" }).teste, "testemunha");
    R.adquirirHabilidade(ju, "pesoPesado", {}, "progressao");
    t.ok("Peso Pesado soma metade de Carne no corpo a corpo", K.composicaoDoDano(ju, { prep: { arma: "", armaValida: false } }, {}).somas.some((s) => s.fonte === "Peso Pesado" && s.valor === 3));
    const an = persona("sabe", exemplosDoLivro.sabe);
    H.repartirADor(ju, an, 6, 4, { regiao: "torso" });
    t.ok("Repartir a Dor: quem protege fica com a parte escolhida", R.calcular(ju).estresseTotal === 4 && R.calcular(an).estresseTotal === 2);
  }
  t.grupo("Oblívio · Todos por Um e Ataque em Dupla");
  {
    const a = persona("age", exemplosDoLivro.age), b = persona("protege", exemplosDoLivro.protege);
    t.ok("Todos por Um: todas precisam ter a habilidade", !H.usar("todosPorUm", { fichas: { a, b }, quem: "a", ctx: ctxRodada(1), param: { eleita: "a" } }).ok);
    R.adquirirHabilidade(a, "todosPorUm", {}, "mesa"); R.adquirirHabilidade(b, "todosPorUm", {}, "mesa");
    const tu = H.usar("todosPorUm", { fichas: { a, b }, quem: "a", ctx: ctxRodada(1), param: { eleita: "b" } });
    t.ok("  com todas: ataque coletivo pendente, consumindo o turno de todas", tu.ok && tu.pendente.participantes.length === 2 && tu.pendente.acao === "completa");
    R.adquirirHabilidade(a, "ataqueEmDupla", {}, "progressao");
    const m = M.estadoVazio(); m.fileiras.personas = ["a", "b"];
    const ad = H.usar("ataqueEmDupla", { fichas: { a, b }, quem: "a", alvos: ["b"], mesa: m, ctx: ctxRodada(1) });
    t.ok("Ataque em Dupla: duas rolagens individuais pendentes", ad.ok && ad.pendente.atacantes.join() === "a,b");
  }
  t.grupo("Oblívio · ações específicas e economia do turno");
  {
    const t0 = H.turnoVazio();
    t.ok("Regular + Extra + Movimento no mesmo turno", H.gastarAcao(t0, "regular").ok && H.gastarAcao(t0, "extra").ok && H.gastarAcao(t0, "movimento").ok);
    t.ok("  e nada de Completa depois", !H.gastarAcao(t0, "completa").ok);
    const t1 = H.turnoVazio(); H.gastarAcao(t1, "completa");
    t.ok("Completa ocupa o turno", !H.gastarAcao(t1, "movimento").ok);
    const sf = persona("age", exemplosDoLivro.age); R.aplicarMazela(sf, "semFolego", {}, {});
    t.iguais("Sem Fôlego: Regular vira Completa, Extra vira Regular", [H.custoDaAcao(sf, "regular"), H.custoDaAcao(sf, "extra")], ["completa", "regular"]);
    const ar = persona("age", exemplosDoLivro.age);
    const vel = R.calcularMutaveis(ar).velocidade.total;
    H.agir("acelerar", { fichas: { ar }, quem: "ar", ctx: ctxRodada(1), rolador: fila() });
    t.igual("Acelerar: Velocidade dobrada", R.calcularMutaveis(ar).velocidade.total, vel * 2);
    R.fimDoTurno(ar, {});
    t.igual("  ainda no turno seguinte", R.calcularMutaveis(ar).velocidade.total, vel * 2);
    R.fimDoTurno(ar, {});
    t.igual("  até o fim do próximo turno", R.calcularMutaveis(ar).velocidade.total, vel);
    const lento = persona("protege", { carne: 2, forca: 4, fuga: 2, determinacao: 0, mente: 2 });
    H.agir("acelerar", { fichas: { lento }, quem: "lento", ctx: ctxRodada(1), rolador: fila() });
    const extra = H.agir("acelerar", { fichas: { lento }, quem: "lento", ctx: ctxRodada(2), rolador: fila(3) });
    t.ok("  acima do Fôlego (1): 1D4 nas pernas", extra.eventos.some((e) => e.tipo === "estresse" && e.valor === 3));
    const extra2 = H.agir("acelerar", { fichas: { lento }, quem: "lento", ctx: ctxRodada(3), rolador: fila(1, 1) });
    t.ok("  cumulativo: o uso seguinte, 2D4", extra2.eventos.some((e) => e.tipo === "estresse" && e.valor === 2));
    const p = persona("sabe", exemplosDoLivro.sabe); p.coragem = 0;
    R.aplicarMazela(p, "pavor", {}, {});
    const rg = persona("cuida", exemplosDoLivro.cuida);
    t.ok("Resgatar pede o teste de Emocional", H.agir("resgatar", { fichas: { rg, p }, quem: "rg", alvos: ["p"] }).pendente.conhecimento === "emocional");
    H.agir("resgatar", { fichas: { rg, p }, quem: "rg", alvos: ["p"], param: { resultado: "sucessoRegular" } });
    t.ok("  sucesso: sai do Pavor e ganha 1 de Coragem", !R.temMazela(p, "pavor") && p.coragem === 1);
    const sac = persona("protege", exemplosDoLivro.protege);
    const m = M.estadoVazio(); m.fileiras.personas = ["sac", "p"];
    const cor = sac.coragem;
    H.agir("sacrificar", { fichas: { sac, p }, quem: "sac", alvos: ["p"], mesa: m, ctx: ctxRodada(1), param: { valor: 3, regiao: "torso" } });
    t.ok("Sacrificar: o Estresse vai no corpo de quem se sacrifica e dá 1 de Coragem", R.regiao(sac, "torso").estresse === 3 && sac.coragem === cor + 1);
    t.ok("  1×/rodada", !H.agir("sacrificar", { fichas: { sac, p }, quem: "sac", alvos: ["p"], mesa: m, ctx: ctxRodada(1), param: { valor: 1 } }).ok);
    const sg = persona("age", exemplosDoLivro.age); sg.coragem = 0;
    H.agir("seguirEmFrente", { fichas: { sg }, quem: "sg", param: { resultado: "sucessoRegular" } });
    t.ok("Seguir em Frente: abre mão da Motivação e +1 Coragem", sg.motivacao.abandonada && sg.coragem === 1);
    const pr = persona("age", exemplosDoLivro.age);
    H.agir("preparar", { fichas: { pr }, quem: "pr", param: { gatilho: "a Carcaça avançar", acao: "atacar" } });
    H.agir("acelerar", { fichas: { pr }, quem: "pr", ctx: ctxRodada(1), rolador: fila(), param: { tipo: "regular" } });
    t.ok("Preparar: perdida ao fazer outra Ação Regular antes", !pr.efeitos.some((e) => e.tipo === "preparada"));
    const an = persona("sabe", exemplosDoLivro.sabe);
    const mm = M.estadoVazio();
    const ana = H.agir("analisar", { fichas: { an }, quem: "an", mesa: mm, param: { disputa: "venceu", alvoAmeaca: "am-1" } });
    t.ok("Analisar: vencendo, bônus de metade de Mente contra o alvo; ninguém mais analisa", ana.bonus === 2 && !H.agir("analisar", { fichas: { an }, quem: "an", mesa: mm, param: { disputa: "venceu", alvoAmeaca: "am-1" } }).ok);
  }
}
