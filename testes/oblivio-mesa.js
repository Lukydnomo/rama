/* =====================================================================
   R.A.M.A. — testes de Oblívio: Ameaças, mesa, Farol e Buraco
   Chamado por executar-oblivio.js (mesma fila de dados combinados).
   ===================================================================== */

export async function testarMesa({ t, fila, persona, exemplosDoLivro }) {
  const C = globalThis.RAMAOblivioCatalogo, R = globalThis.RAMAOblivio, K = globalThis.RAMAOblivioCombate;
  const A = globalThis.RAMAOblivioAmeacas, AM = globalThis.RAMAOblivioMotorAmeacas, M = globalThis.RAMAOblivioMesa;
  const B = globalThis.RAMAOblivioBuraco, BM = globalThis.RAMAOblivioMotorBuraco;

  /* =================================================================
     AMEAÇAS — catálogo
     ================================================================= */
  t.grupo("Oblívio · Ameaças do livro");
  const nomes = ["Golfo", "Peste", "Trombadinha", "Carcaça", "Mortalha", "Mutágeno", "Amálgama Golfada", "Cilada", "Enxame", "Coletor", "Patógeno", "Quimera", "Errante", "Horda", "Rei dos Ratos", "A Forca", "Apogeu", "Comensal"];
  t.iguais("as 18 Ameaças, na ordem do livro", A.AMEACAS.map((a) => a.nome), nomes);
  t.iguais("graus conferidos nas páginas (desenho)", A.AMEACAS.map((a) => a.grau), [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6]);
  t.ok("toda Ameaça tem tabela de recompensa com 1–6 coberto", A.AMEACAS.every((a) => [1, 2, 3, 4, 5, 6].every((d) => a.recompensa.some((x) => d >= x.de && d <= x.ate))));
  t.ok("os itens de recompensa existem no catálogo (ou são lacuna marcada)", A.AMEACAS.every((a) => a.recompensa.every((x) => x.itens.every((i) => C.equipamento[i.item] || i.lacuna))));
  t.ok("Rei dos Ratos e Enxame: graus 5 e 3, como no exemplo de Escapar (p. 87)", A.ameaca.reiDosRatos.grau === 5 && A.ameaca.enxame.grau === 3);
  t.iguais("valores publicados, não recalculados: Carcaça Dano 3, Proteção 2, Velocidade 2", [A.ameaca.carcaca.dano, A.ameaca.carcaca.protecao, A.ameaca.carcaca.velocidade], [3, 2, 2]);
  t.ok("Fôlego citado bate com os atributos (Rei 8, Apogeu 7, Patógeno 6, Coletor 7)", [["reiDosRatos", 8], ["apogeu", 7], ["patogeno", 6], ["coletor", 7]].every(([k, v]) => R.metade(A.ameaca[k].atributos.carne + A.ameaca[k].atributos.determinacao) === v));

  /* =================================================================
     AMEAÇAS — instâncias e comportamentos
     ================================================================= */
  t.grupo("Oblívio · instâncias de encontro independentes do catálogo");
  {
    const c1 = AM.criarInstancia("carcaca", fila()), c2 = AM.criarInstancia("carcaca", fila());
    AM.sofrerDano(c1, 5, {});
    t.ok("dano numa instância não mexe na outra nem no catálogo", c1.estresse === 5 && c2.estresse === 0 && A.ameaca.carcaca.limiteEstresse === 22);
    t.igual("regiões divididas pelo limite (22/4 → 6,5,5,5; sobra na primeira)", c1.regioes.map((r) => r.limite).join(","), "7,5,5,5");
    const col = AM.criarInstancia("coletor", fila(4));
    t.igual("Coletor: 5 + 1D10 regiões (4 → 9)", col.regioes.length, 9);
    const forca = AM.criarInstancia("forca", fila(2, 3, 1));
    t.igual("Forca: 2 + 3D4 → 2 regiões e 6 corpos", forca.regioes.length + "/" + forca.corpos.length, "2/6");
    t.igual("  Proteção 5 + corpos (x)", AM.protecaoCompleta(forca, {}).total, 11);
  }
  t.grupo("Oblívio · comportamentos especiais");
  {
    const golfos = [1, 2, 3, 4].map(() => AM.criarInstancia("golfo", fila()));
    const u = AM.unirGolfos(golfos, fila());
    t.ok("4 Golfos viram uma Amálgama com +5 de limite e +1 região (1 adicional)", u.ok && u.nova.limite === 43 && u.nova.regioes.length === 4 && golfos.every((g) => g.estado === "unida"));
    t.ok("  com +1 em Carne (preferência)", u.nova.atributos.carne === 9);
    t.ok("2 Golfos não unem", !AM.unirGolfos([AM.criarInstancia("golfo", fila()), AM.criarInstancia("golfo", fila())], fila()).ok);
    const sozinhos = [AM.criarInstancia("golfo", fila())];
    AM.marcarGolfosSemUniao(sozinhos);
    AM.fimDaRodada(sozinhos[0], {}); t.igual("sem união: ainda vivo na rodada atual", sozinhos[0].estado, "ativa");
    AM.fimDaRodada(sozinhos[0], {}); t.igual("  destruído no fim da próxima rodada", sozinhos[0].estado, "destruida");

    const mut = AM.criarInstancia("mutageno", fila());
    AM.sofrerDano(mut, 3, {}, fila(5)); AM.sofrerDano(mut, 3, {}, fila(2)); AM.sofrerDano(mut, 3, {}, fila(6));
    t.igual("Mutação: 4–6 no 1D6 dá ponto (5, 2, 6 → 2 pontos)", mut.mutacao.pontos, 2);
    t.ok("gastar 1 ponto: +1 num Atributo Fixo", AM.gastarMutacao(mut, "atributo", { atributo: "forca" }).ok && mut.atributos.forca === 1);
    t.ok("3 pontos: recusado com 1", !AM.gastarMutacao(mut, "regiao").ok);
    mut.mutacao.pontos = 15;
    AM.gastarMutacao(mut, "evolui");
    AM.fimDaRodada(mut, {});
    t.ok("15 pontos: evolui para Patógeno no fim da rodada, mantendo Mutações", mut.chave === "patogeno" && mut.mutacao.gastos.includes("atributo"));

    const enx = AM.criarInstancia("enxame", fila());
    AM.sofrerDano(enx, 4, {});
    t.igual("Enxame: dano > 3 de uma vez perde 1 região", enx.regioes.length, 11);
    AM.sofrerDano(enx, 3, {});
    t.igual("  3 não basta", enx.regioes.length, 11);
    const h = AM.criarInstancia("horda", fila());
    const d1 = AM.sofrerDano(h, 20, {});
    t.ok("Horda: −5 em todo dano e perde 2 regiões acima de 10", h.estresse === 15 && h.regioes.length === 14 && d1.eventos.some((e) => e.tipo === "reduzido"));
    AM.sofrerDano(h, 4, { classe: "bomba" });
    t.igual("  bombas causam o dobro", h.estresse, 23);
    const mort = AM.criarInstancia("mortalha", fila());
    AM.sofrerDano(mort, 10, {});
    t.igual("Mortalha: dano comum não pega", mort.estresse, 0);
    AM.sofrerDano(mort, 25, { corrompido: true });
    t.ok("  Equipamento Corrompido derrota e deixa o retorno pendente", mort.estado === "derrotada" && mort.retorno);
    AM.fimDaCena(mort); t.igual("  fim desta cena: ainda derrotada", mort.estado, "derrotada");
    AM.fimDaCena(mort); t.ok("  fim da PRÓXIMA cena: volta inteira", mort.estado === "ativa" && mort.estresse === 0);
    const car = AM.criarInstancia("carcaca", fila());
    AM.sofrerDano(car, 30, {});
    t.ok("Carcaça: Combustível impede a Regeneração Maldita", AM.impedirRetorno(car, "combustivel").ok);
    t.ok("  Ração não impede", !AM.impedirRetorno(AM.criarInstancia("carcaca", fila()), "racao").ok);
    AM.fimDaCena(car); t.igual("  destruída de vez", car.estado, "destruida");
    const rei = AM.criarInstancia("reiDosRatos", fila());
    AM.sofrerDano(rei, 10, {}); AM.fimDaRodada(rei, {});
    t.igual("Vida Longa ao Rei: regenera 8 por rodada", rei.estresse, 2);
    AM.sofrerDano(rei, 60, {});
    t.ok("primeira derrota: vira Enxame por 3 rodadas", rei.estado === "ativa" && rei.virouEnxame && rei.limite === 36);
    AM.fimDaRodada(rei, {}); AM.fimDaRodada(rei, {}); AM.fimDaRodada(rei, {});
    t.ok("não derrotado em 3: volta Rei com metade do Estresse", !rei.virouEnxame && rei.limite === 56 && rei.estresse === 28);
    const apo = AM.criarInstancia("apogeu", fila());
    AM.sofrerDano(apo, 20, {});
    t.igual("Apogeu: dano pela metade", apo.estresse, 10);
    AM.sofrerDano(apo, 10, { regiao: apo.regioes[2].id, pontoFraco: apo.regioes[2].id });
    t.igual("  no ponto fraco analisado, o dobro", apo.estresse, 30);
    AM.sofrerDano(apo, 2, { ferida: true });
    const antes = apo.estresse; AM.fimDaRodada(apo, {});
    t.igual("  Ferida desliga a regeneração até o fim da Partida", apo.estresse, antes);
    const err = AM.criarInstancia("errante", fila());
    t.igual("Errante com 5 Personas: Proteção 5 + 5", AM.protecaoCompleta(err, { personasNaCena: 5 }).total, 10);
    t.igual("  com 3 (ajuste padrão: metade)", AM.protecaoCompleta(err, { personasNaCena: 3, ajustes: { errante: "metade" } }).total, 6);
    t.igual("  com 3 (ajuste: zero)", AM.protecaoCompleta(err, { personasNaCena: 3, ajustes: { errante: "zero" } }).total, 5);
    const am = AM.criarInstancia("amalgamaGolfada", fila());
    t.iguais("Toque Corrosivo: acerto corpo a corpo reflete 4", AM.reflexoDoAcerto(am, { corpoACorpo: true }), { dano: 4, fonte: "Toque Corrosivo" });
    t.igual("  à distância, nada", AM.reflexoDoAcerto(am, { corpoACorpo: false }), null);
    const col = AM.criarInstancia("coletor", fila(1));
    const m1 = AM.sofrerDano(col, 20, { muralha: 2 });
    t.ok("Muralha de Carne: 2 regiões a menos, −14 de dano", col.regioes.length === 4 && col.estresse === 6 && m1.eventos.some((e) => e.tipo === "muralha"));
    const mur = AM.trocarRegioesPor(col, "muralha", fila());
    t.ok("  Ação de Movimento: região vira Muralha (5, Proteção 1)", mur.ok && mur.nova.limite === 5 && mur.nova.protecao === 1);
    t.ok("Benefícios da Apropriação: até 3", AM.beneficioDaApropriacao(col, "dano", fila(2)).ok && AM.beneficioDaApropriacao(col, "velocidade", fila(4)).ok && AM.beneficioDaApropriacao(col, "acao", fila()).ok && !AM.beneficioDaApropriacao(col, "protecao", fila(1)).ok);
    t.igual("  +1D2 de Dano entra no Dano atual", AM.danoAtual(col), 10);
    const hor = AM.criarInstancia("horda", fila());
    const inv = AM.trocarRegioesPor(hor, "carcaca", fila());
    t.ok("Destacar Forças: 2 regiões viram uma Carcaça", inv.ok && hor.regioes.length === 14 && inv.nova.chave === "carcaca");
    const q = AM.montarQuimera([{ ameaca: "peste", habilidade: "ataquePeconhento" }, { ameaca: "cilada", habilidade: "surpresa" }, { ameaca: "enxame", habilidade: "dificilDeAcertar" }], fila());
    t.ok("Quimera: 3 componentes, uma habilidade de cada, mais as dela", q.ok && ["ataquePeconhento", "surpresa", "dificilDeAcertar", "decifraMeOuTeDevoro"].every((k) => q.nova.habilidades.includes(k)));
    t.ok("  habilidade que não é do componente: recusada", !AM.montarQuimera([{ ameaca: "peste", habilidade: "surpresa" }, { ameaca: "cilada", habilidade: "surpresa" }, { ameaca: "enxame", habilidade: "dificilDeAcertar" }], fila()).ok);
    const rec = AM.recompensa("trombadinha", fila(6));
    t.iguais("recompensa: 1D6 na tabela da Ameaça", rec.itens, [{ item: "kitPrimeirosSocorros", qtd: 1 }]);
    t.ok("Errante 5–6: Lâmina Grande vem marcada como lacuna (sem inventar)", AM.recompensa("errante", fila(5)).itens[0].lacuna === true);
  }
  t.grupo("Oblívio · ataque da Ameaça contra uma Persona");
  {
    const ana = persona("sabe", exemplosDoLivro.sabe);
    R.adicionarItem(ana, "vestimentaLeve"); R.equipar(ana, ana.inventario.itens[0].id, "torso");
    const pAna = R.protecaoCompleta(ana).total;
    t.igual("Ana com Vestimenta Leve: Proteção 4 (exemplo p. 36)", pAna, 4);
    const car = AM.criarInstancia("carcaca", fila());
    const at = AM.rolarAtaque(car, { dados: 4 }, fila(14, 15, 16, 3));
    t.igual("Carcaça arrisca 4 regiões: 3 sucessos", at.sucessos, 3);
    const est = K.novoEstadoDeProtecao(pAna);
    t.ok("3 sucessos contra 4 não acertam", !K.aplicarSucessos(est, at.sucessos, car.id).acertou);
    t.igual("a falha cansa a Carcaça (1)", car.estresse, 1);
    const dn = AM.danoDaHabilidade(car, "ataqueDaCarcaca", fila(2, 3));
    t.igual("dano 2D4+3 (2+3+3)", dn.total, 8);
    t.ok("nunca mais de 5 dados", AM.rolarAtaque(AM.criarInstancia("enxame", fila()), { dados: 12 }, fila(5, 5, 5, 5, 5)).dados.length === 5);
  }

  /* =================================================================
     MESA
     ================================================================= */
  t.grupo("Oblívio · cenas, turnos, Ordem de Ação");
  {
    const m = M.estadoVazio();
    t.ok("iniciar Missão", M.iniciarMissao(m, "Vila").ok && m.missao.nome === "Vila");
    t.ok("não inicia outra por cima", !M.iniciarMissao(m, "Outra").ok);
    const part = [{ ref: "juliana", tipo: "persona", velocidade: 1 }, { ref: "arthur", tipo: "persona", velocidade: 4 }, { ref: "carc", tipo: "ameaca", velocidade: 2 }, { ref: "ana", tipo: "persona", velocidade: 2 }];
    const ci = M.iniciarCena(m, "combate", part);
    t.iguais("Ordem de Ação por Velocidade (empate na ordem de entrada): Arthur, Carcaça, Ana, Juliana (p. 35)", m.cena.ordem.map((o) => o.ref), ["arthur", "carc", "ana", "juliana"]);
    t.ok("iniciar a cena pede o momento inicioDaCena para as fichas", ci.momentos.some((x) => x.tipo === "inicioDaCena"));
    let r = M.avancarTurno(m, fila());
    t.ok("fim do turno de Arthur: momento fimDoTurno dele", r.momentos.some((x) => x.tipo === "fimDoTurno" && x.persona === "arthur"));
    M.avancarTurno(m, fila()); M.avancarTurno(m, fila());
    r = M.avancarTurno(m, fila());
    t.ok("depois do último: fimDaRodada e rodada 2", r.momentos.some((x) => x.tipo === "fimDaRodada") && m.cena.rodada === 2 && M.atual(m).ref === "arthur");
    t.ok("adiar desce na ordem", M.adiar(m, "arthur", 2).ok && m.cena.ordem[2].ref === "arthur");
    t.ok("trocar posição só numa Cena de Tensão", !M.trocarNaTensao(m, "ana", "juliana").ok);
    M.iniciarCena(m, "tensao", part, { rodadas: 3, sucessos: 2 });
    t.ok("  na Tensão, troca", M.trocarNaTensao(m, "ana", "juliana").ok);
    M.somarNaTensao(m, "sucessoExtremo", false);
    t.ok("Escapar: Extremo vale 2 e alcança a meta", M.somarNaTensao(m, "falhaRegular", false).alcancou);
    const m2 = M.estadoVazio(); M.iniciarCena(m2, "tensao", [], { rodadas: 1, sucessos: 5 });
    t.igual("Escapar como Ação Completa dobra (Regular → 2)", M.somarNaTensao(m2, "sucessoRegular", true).acumulados, 2);
  }
  t.grupo("Oblívio · Proteção na mesa: completa x restante, restauração no turno certo");
  {
    const m = M.estadoVazio();
    M.iniciarCena(m, "combate", [{ ref: "ju", tipo: "persona", velocidade: 3 }, { ref: "an", tipo: "persona", velocidade: 2 }, { ref: "x", tipo: "ameaca", velocidade: 1 }]);
    const p = M.protecaoDoAlvo(m, "x", 3);
    K.aplicarSucessos(p, 2, "ju");
    M.protecaoDoAlvo(m, "x", 3);
    t.igual("recalcular a completa não devolve o restante", p.restante, 1);
    M.avancarTurno(m, fila());
    K.aplicarSucessos(p, 1, "an");
    t.ok("Ana fecha o desgaste e acerta", p.zerada && p.zerada.atacante === "an");
    M.avancarTurno(m, fila()); M.avancarTurno(m, fila());
    t.igual("turno da Juliana (rodada 2): ainda zerada", p.restante, 0);
    M.avancarTurno(m, fila());
    t.igual("turno da Ana: volta cheia", p.restante, 3);
    const q = M.protecaoDoAlvo(m, "y", 2);
    K.aplicarSucessos(q, 1, "ju");
    M.encerrarCena(m);
    t.igual("fim da cena: desgaste parcial some (ajuste padrão)", q.restante, 2);
  }
  t.grupo("Oblívio · fileiras, alcance e Escudo Humano");
  {
    const m = M.estadoVazio();
    m.fileiras.personas = ["ju", "ar", "an"];
    m.fileiras.ameacas = ["a1", "a2", "a3", "a4", "a5", "a6"];
    t.iguais("alcance pela casa do alvo na fileira dele", ["a1", "a2", "a3", "a4", "a5", "a6"].map((x) => M.alcanceDe(M.casaDoAlvo(m, x)).chave), ["adjacente", "curto", "medio", "longo", "absoluto", "absoluto"]);
    t.ok("Disparo Médio alcança Adjacente, Curto e Médio, não Longo (p. 118)", M.noAlcance(m, "a3", "medio").ok && !M.noAlcance(m, "a4", "medio").ok);
    m.fileiras.ameacas = ["grande", "b"];
    t.igual("Ameaça de 3 casas empurra a seguinte para a 4ª casa", M.casaDoAlvo(m, "b", (id) => id === "grande" ? 3 : 1), 4);
    t.iguais("adjacentes na fileira", M.adjacentesNaFileira(m, "ar"), ["ju", "an"]);
    const ju = persona("protege", exemplosDoLivro.protege), ar = persona("age", exemplosDoLivro.age), an = persona("sabe", exemplosDoLivro.sabe);
    const fichas = { ju, ar, an };
    t.ok("Escudo Humano: quem está atrás ganha metade da Carne (4 → 2)", M.bonusDeGrupo(m, fichas, "an")[0].valor === 2 && M.bonusDeGrupo(m, fichas, "ju").length === 0);
    t.igual("  e entra na Proteção da Persona", R.protecaoCompleta(an, { bonusDeGrupo: M.bonusDeGrupo(m, fichas, "an") }).total, 4);
    R.aplicarMazela(ju, "noChao", {}, {});
    t.igual("  Quem Protege No Chão: ninguém atrás recebe", M.bonusDeGrupo(m, fichas, "an").length, 0);
    R.removerMazela(ju, "noChao", "mesa");
    R.adquirirHabilidade(ju, "repartirADor", {}, "mesa");
    t.igual("Repartir a Dor: quem pode dividir o dano de Ana", M.podeRepartirADor(m, fichas, "an"), "ju");
  }
  t.grupo("Oblívio · Farol, luz e Escuridão");
  {
    const m = M.estadoVazio();
    m.fileiras.personas = ["ju", "ar", "an"];
    M.definirFarol(m, "ju");
    t.ok("Farol na ponta da fileira: a Persona da outra ponta No Escuro", M.problemasDoFarol(m).some((p) => p.chave === "extremidade" && p.noEscuro === "an"));
    M.moverNaFileira(m, "ju", 1);
    t.ok("  no meio, sem problema de posição", !M.problemasDoFarol(m).some((p) => p.chave === "extremidade"));
    t.ok("duas luzes acesas: gatilho para a Testemunha (sem criar Ameaça)", M.problemasDoFarol(m, null, 2).some((p) => p.chave === "duasLuzes" && p.gatilho));
    M.acender(m, {});
    t.iguais("acesa: 1 cena ou 6 rodadas", [m.farol.rodadas, m.farol.cenas], [6, 1]);
    M.iniciarCena(m, "combate", [{ ref: "ar", tipo: "persona", velocidade: 1 }]);
    for (let i = 0; i < 5; i++) M.avancarTurno(m, fila());
    t.igual("5 rodadas de combate consomem 5", m.farol.rodadas, 1);
    t.ok("Combustível de aliado não adjacente: recusado", !M.abastecer(m, "longe").ok);
    const ab = M.abastecer(m, "an");
    t.ok("aliado adjacente abastece gastando Movimento + Regular", ab.ok && ab.acoes.join("+") === "movimento+regular" && m.farol.rodadas === 7);
    for (let i = 0; i < 7; i++) M.avancarTurno(m, fila());
    t.ok("acabou o combustível: apagou, com prazo para reacender", !m.farol.aceso && m.farol.apagada.graca);
    const e = M.avancarTurno(m, fila(2));
    t.ok("sem reacender até o fim da próxima rodada: a Escuridão rola 1D6 (2 → 1 rodada)", m.farol.apagada.rodadas === 1 && e.eventos.some((x) => x.tipo === "escuridaoIminente"));
    const fim = M.avancarTurno(m, fila());
    t.ok("e no fim desse prazo, o evento final da Escuridão (resolvido pela mesa, não pelo relógio)", fim.eventos.some((x) => x.tipo === "escuridao"));
    const m2 = M.estadoVazio();
    m2.buraco = { regras: { luz: 0.5 } };
    M.acender(m2, {});
    t.igual("Buraco Escuro: a luz dura metade (3 rodadas)", m2.farol.rodadas, 3);
    const m3 = M.estadoVazio(); M.acender(m3, { efetividade: true });
    t.igual("Combustível com Efetividade: 12 rodadas", m3.farol.rodadas, 12);
    M.derrubarLuz(m3, "golfo-1");
    t.ok("luz derrubada: alguém pega (mesma zona: Movimento ou Regular)", M.pegarLuz(m3, "an", true).acoes[0] === "movimento|regular");
  }
  t.grupo("Oblívio · Escapar, Descanso perigoso, Missão");
  {
    const m = M.estadoVazio();
    M.adicionarAmeaca(m, "reiDosRatos", fila()); M.adicionarAmeaca(m, "enxame", fila()); M.adicionarAmeaca(m, "enxame", fila());
    t.igual("Escapar de 1 Rei dos Ratos e 2 Enxames: 8 sucessos (p. 87)", M.sucessosParaEscapar(m), 8);
    const m1 = M.estadoVazio(); M.adicionarAmeaca(m1, "cilada", fila());
    t.igual("de uma Ameaça só: o Grau dela", M.sucessosParaEscapar(m1), 3);
    t.ok("Descanso perigoso: 5 ou 6, nada", !M.descansoPerigoso(fila(5), 0).encontro);
    t.ok("  1–4, Encontro", M.descansoPerigoso(fila(4), 0).encontro);
    t.ok("  vigília com 2 sucessos: só 1–2", !M.descansoPerigoso(fila(3), 2).encontro && M.descansoPerigoso(fila(2), 2).encontro);
    const mm = M.estadoVazio(); M.iniciarMissao(mm, "x"); M.registrarMorte(mm, "p1");
    const cm = M.concluirMissao(mm);
    t.ok("concluir a Missão manda a progressão para as vivas, com o número de mortos", cm.ok && cm.momentos[0].mortos === 1 && cm.momentos[0].para === "vivas");
    t.ok("  vai para o histórico", mm.missoes.length === 1 && !mm.missao);
    const op = (x) => M.iniciarMissao(x, "y");
    M.aplicarOperacao(mm, "op-m", op);
    t.ok("operação repetida na mesa: aplica uma vez", M.aplicarOperacao(mm, "op-m", op).repetida && mm.missao.nome === "y");
  }
  t.grupo("Oblívio · vista dos Jogadores sem o privado da Testemunha");
  {
    const m = M.estadoVazio();
    M.adicionarAmeaca(m, "errante", fila());
    m.registro.push({ tipo: "nota", privado: true, texto: "segredo" });
    const v = M.vistaDosJogadores(m);
    t.ok("Ameaça sem ficha completa (sem limite, atributos, habilidades)", v.encontro.ameacas[0].nome === "Errante" && v.encontro.ameacas[0].limite === undefined && v.encontro.ameacas[0].habilidades === undefined);
    t.ok("registro privado não sai", !v.registro.some((r) => r.privado));
  }

  /* =================================================================
     BURACO
     ================================================================= */
  t.grupo("Oblívio · tabelas do Buraco");
  const cobre = (tab, faces) => { for (let d = 1; d <= faces; d++) if (!tab.some((x) => d >= x.de && d <= x.ate)) return false; return true; };
  t.ok("Entrada 1D12: 1–12 cobertos (2/3/4 conexões)", cobre(B.ENTRADA, 12));
  t.ok("Construção 1D100: 1–60 cobertos", cobre(B.CONSTRUCAO, 60));
  const tabs = { Efeito: B.EFEITO, Missão: B.MISSAO, Armadilha: B.ARMADILHA, "Encontro fácil": B.ENCONTRO.facil, "Encontro médio": B.ENCONTRO.medio, "Encontro difícil": B.ENCONTRO.dificil, Infortúnio: B.INFORTUNIO, Saída: B.SAIDA, Segredo: B.SEGREDO, Tesouro: B.TESOURO };
  Object.keys(B.OBJETIVO).forEach((k) => { tabs["Objetivo " + k] = B.OBJETIVO[k]; });
  Object.keys(tabs).forEach((k) => {
    const tab = tabs[k];
    const sem = [1, 2, 3, 4, 5, 6].filter((d) => tab.filter((x) => d >= x.de && d <= x.ate).length !== 1);
    t.ok("1D6 " + k + ": cada face em exatamente uma linha", !sem.length, "faces: " + sem.join(","));
  });
  t.ok("toda linha tem eventos estruturados (não só texto)", Object.keys(tabs).every((k) => tabs[k].every((l) => l.eventos.length > 0)));
  t.ok("encontros usam só Ameaças do catálogo", ["facil", "medio", "dificil"].every((d) => B.ENCONTRO[d].every((l) => l.eventos[0].ameacas.every((a) => A.ameaca[a.ameaca]))));
  t.igual("dificuldade pelo maior: 2 Personas mas 4 missões → Médio", BM.dificuldadeDeEncontro(2, 4), "medio");
  t.igual("6 Personas → Difícil", BM.dificuldadeDeEncontro(6, 0), "dificil");
  t.grupo("Oblívio · explorar o Buraco");
  {
    /* Efeito 4 (Escuro), Missão 2 (Ache a Saída → objetivo antes: 3 Fim da
       Linha), Entrada 1D12=11 (4 conexões). */
    const c = BM.criarBuraco(fila(4, 2, 3, 11), { personas: 3 });
    const b = c.buraco;
    t.ok("fundação: Efeito Escuro vira regra (luz pela metade)", b.efeito.chave === "escuro" && b.regras.luz === 0.5);
    t.ok("Missão Ache a Saída: Entrada fechada e Objetivo rolado antes", b.missao.chave === "acheASaida" && b.regras.entradaFechada && b.missao.objetivoAntes.chave === "fimDaLinha");
    t.igual("Entrada com 4 conexões", b.cartas[0].conexoes, 4);
    t.igual("Fim da Linha: Saída Falsa até 3", b.saidasFalsasAte, 3);
    /* 1D100: 75 (rola de novo), 12 → Encontro com 2 conexões; tabela fácil 1D6=3 (Necrotério). */
    const e1 = BM.explorar(b, b.cartas[0].id, fila(75, 12, 3));
    t.ok("61+ rola de novo; 12 = Encontro (2 conexões)", e1.carta.tipo === "encontro" && e1.carta.rerolagens === 1 && e1.carta.conexoes === 2);
    t.ok("o resultado vira evento estruturado: iniciar encontro com 2 Carcaças", e1.carta.eventos[0].tipo === "iniciarEncontro" && e1.carta.eventos[0].ameacas[0].ameaca === "carcaca" && e1.carta.eventos[0].ameacas[0].qtd === 2);
    const ex = BM.expandirEvento(e1.carta.eventos[0], fila());
    t.iguais("expandir: as Ameaças a pôr em combate", ex.ameacas, [{ ameaca: "carcaca", qtd: 2 }]);
    BM.resolverEvento(b, e1.carta.id, e1.carta.eventos[0].id, { vencido: true });
    t.igual("encontro vencido conta", b.combatesVencidos, 1);
    /* Saída: d100=40, tabela de saída d6=2 → com Fim da Linha (≤3) vira Saída Falsa. */
    const e2 = BM.explorar(b, e1.carta.id, fila(40, 2));
    t.ok("Fim da Linha: o 2 na Tabela de Saída vira Saída Falsa", e2.carta.resultado.chave === "saidaFalsa");
    t.ok("não se sai por Saída Falsa", !BM.sair(b, e2.carta.id).ok);
    t.ok("Entrada fechada em Ache a Saída", !BM.sair(b, b.cartas[0].id).ok);
    t.ok("Saída com uma conexão só: não dá para seguir dela", !BM.explorar(b, e2.carta.id, fila(1)).ok);
    BM.entrar(b, e1.carta.id, fila());
    const volta = BM.entrar(b, e1.carta.id, fila());
    t.ok("revisitar: o encontro resolvido não se repete", e1.carta.eventos[0].estado === "resolvido" && !volta.eventos.some((x) => x.tipo === "dejaVu"));
    t.ok("sem caminho direto: recusado", !BM.entrar(b, e2.carta.id + "x", fila()).ok);
  }
  {
    const c = BM.criarBuraco(fila(11), { semEfeito: true, semMissao: true });
    const b = c.buraco;
    /* Infortúnio Déjà-vu (d100=25 → 2 conexões; 1D6=3). */
    const e = BM.explorar(b, b.cartas[0].id, fila(25, 3));
    BM.resolverEvento(b, e.carta.id, e.carta.eventos[0].id, {});
    /* Volta para a Entrada (já explorada, sem resultado de tabela) e de
       novo para o Infortúnio: o Déjà-vu repete o efeito dele. */
    BM.entrar(b, b.cartas[0].id, fila());
    const de = BM.entrar(b, e.carta.id, fila());
    t.ok("Déjà-vu: o próximo cômodo já explorado repete o efeito", de.eventos.some((x) => x.tipo === "dejaVu") && e.carta.eventos.some((x) => x.estado === "pendente"));
    /* Coringa: d100=1 (Armadilha 2 conexões), 1D6=2 → na próxima entrada rola (5: Ferimento). */
    const co = BM.explorar(b, b.cartas[0].id, fila(1, 2));
    t.ok("Armadilha Coringa não dispara na primeira vez", co.carta.resultado.chave === "coringa");
    BM.entrar(b, b.cartas[0].id, fila());
    const dispara = BM.entrar(b, co.carta.id, fila(5));
    t.ok("  dispara ao entrar de novo (rola a tabela)", dispara.eventos.some((x) => x.tipo === "armadilhaDisparou" && x.nome === "Ferimento"));
    /* Escada: novo andar com nova Entrada. */
    const es = BM.explorar(b, b.cartas[0].id, fila(21, 7));
    t.ok("Escada: novo andar com uma Entrada de 1D12", es.carta.tipo === "escada" && b.andares.length === 2);
    const vj = BM.vistaDosJogadores(b);
    t.ok("vista dos Jogadores esconde a armadilha armada", !vj.cartas.some((x) => x.eventos.some((y) => y.tipo === "armadilhaArmada")));
  }
  {
    const c = BM.criarBuraco(fila(6, 1, 2, 2), { personas: 2 });
    t.ok("Acabe com o Mal: combates = metade das Personas (mín. 1) + 1D4", c.buraco.missao.chave === "acabeComOMal" && c.buraco.missao.combatesNecessarios === 3);
    const tesouro = BM.rolarTabela(B.TESOURO, fila(2));
    const exp = BM.expandirEvento(tesouro.eventos[0], fila(1, 2, 1, 6));
    t.ok("Contrabando: 1D4 armas com peso por D6 (escolha da Testemunha, sem inventar item)", exp.escolhas.length === 2 && exp.escolhas[0].peso === "leve" && exp.escolhas[1].peso === "pesada");
    const leg = BM.expandirEvento(B.OBJETIVO.devolvaAoLar[1].eventos[0], fila(6, 1));
    t.ok("Legião 6: uma Ameaça de Grau 6 do catálogo", leg.ameacas.length === 1 && A.ameaca[leg.ameacas[0].ameaca].grau === 6);
  }
}
