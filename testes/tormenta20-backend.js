/* =====================================================================
   R.A.M.A. — testes do backend: Tormenta20 (Tormenta20.gs, v8.0)
   Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

import { ARQUIVOS_T20 } from "./gerar-tormenta20-gs.js";

export async function testarTormenta20Backend({ t, preparar, novaConta, comoFn }) {
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url)).then((s) => s.replace(/\r\n/g, "\n"));
  const R = globalThis.RAMATormenta20;
  const G = globalThis;

  t.grupo("Tormenta20 · o motor do servidor é o mesmo do navegador");
  for (const destino of Object.keys(ARQUIVOS_T20)) {
    const gs = await ler(destino);
    let todas = true;
    for (const n of ARQUIVOS_T20[destino]) {
      const caminho = "js/tormenta20/" + n + ".js";
      const marca = "/* >>> " + caminho + " */\n";
      const ini = gs.indexOf(marca) + marca.length;
      const fim = gs.indexOf("/* <<< " + caminho + " */");
      if (gs.slice(ini, fim).replace(/\n$/, "") !== (await ler(caminho)).replace(/\n$/, "")) { todas = false; t.ok("cópia de " + caminho + " idêntica em " + destino, false); }
    }
    t.ok("todas as cópias em " + destino + " batem (rode testes/gerar-tormenta20-gs.js ao mudar)", todas);
  }

  function ficha(nome, classe, extra) {
    const b = R.fichaVazia();
    b.atributosBase = { for: 3, des: 2, con: 2, int: 0, sab: 1, car: 0 };
    b.raca = { id: "humano", variante: "", atributos: ["for", "con", "des"], escolhas: {} };
    b.origem = { id: "soldado", beneficios: [{ tipo: "pericia", id: "fortitude" }, { tipo: "pericia", id: "guerra" }], escolhas: {} };
    b.niveis = [{ classe: classe, escolhas: classe === "arcanista" ? { caminho: "bruxo" } : {} }];
    if (classe === "arcanista") { b.atributosBase.int = 3; b.magias = [{ id: "explosaoDeChamas", fonte: "classe:arcanista" }, { id: "armaduraArcana", fonte: "classe:arcanista" }]; }
    b.inventario.itens = classe === "guerreiro" ? [R.normalizarItem({ ref: "espadaLonga", estado: "empunhado" })] : [];
    Object.assign(b, extra || {});
    return { schemaVersion: 34, tipoFicha: "tormenta20", nome, campanhaId: null, tormenta20: b, atributos: [], status: [], pericias: [], inventario: { itens: [] }, anotacoes: { pastas: [], soltas: [] } };
  }
  function bloco(C, id) { return R.normalizar(C({ acao: "ler_personagem", personagemId: id }).dados.tormenta20); }

  t.grupo("Tormenta20 · a ficha é de um sistema conhecido");
  preparar();
  const mestra = novaConta("t20_mestra"), jo = novaConta("t20_jo"), lu = novaConta("t20_lu"), fora = novaConta("t20_fora");
  const M = comoFn(mestra), J = comoFn(jo), L = comoFn(lu), F = comoFn(fora);
  const avulsa = J({ acao: "criar_personagem", dados: ficha("Ayla", "guerreiro") });
  t.ok("cria uma ficha de Tormenta20", avulsa.ok);
  const lida = J({ acao: "ler_personagem", personagemId: avulsa.dados.id });
  t.ok("lê de volta com o bloco e o tipo", lida.ok && lida.dados.tipoFicha === "tormenta20" && lida.dados.tormenta20.niveis[0].classe === "guerreiro");
  const lp = J({ acao: "listar_personagens" });
  t.ok("a lista de personagens diz o sistema", lp.ok && lp.dados.some((p) => p.id === avulsa.dados.id && p.sistema === "tormenta20"));

  t.grupo("Tormenta20 · a mesa é do mestre");
  const camp = M({ acao: "criar_campanha", dados: { sistema: "tormenta20", nome: "A Ruína de Khalifor" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: jo.id, papel: "jogador" }, { userId: lu.id, papel: "jogador" }] });
  const pj = J({ acao: "criar_personagem", dados: ficha("Tork", "guerreiro") }).dados.id;
  const pl = L({ acao: "criar_personagem", dados: ficha("Lyra", "arcanista") }).dados.id;
  J({ acao: "vincular_personagem", campanhaId: camp, personagemId: pj });
  L({ acao: "vincular_personagem", campanhaId: camp, personagemId: pl });
  const lc = M({ acao: "ler_campanha", campanhaId: camp }).dados;
  t.ok("ler_campanha diz o sistema e a ferramenta da mesa, sem o combate do núcleo", lc.sistema === "tormenta20" && lc.mesaT20 === true && lc.combate === undefined);
  const l0 = M({ acao: "ler_tormenta20", campanhaId: camp });
  t.ok("o mestre lê a mesa vazia e os personagens", l0.ok && l0.dados.mestre === true && l0.dados.rev === 0 && l0.dados.personagens.length === 2);
  t.ok("  com o resumo de cada um (PV, PM e Defesa calculados no servidor)", l0.dados.personagens.every((p) => p.resumo && p.resumo.pv && p.resumo.pv.max > 0 && p.resumo.defesa >= 10));
  const lf = F({ acao: "ler_tormenta20", campanhaId: camp });
  t.ok("quem não é da mesa não lê", lf.ok === false && ["sem_permissao", "nao_encontrado"].indexOf(lf.erro) >= 0);

  const Me = G.RAMATormenta20Mesa;
  const e = Me.normalizar({});
  e.notas = "O vilão é o barão.";
  Me.adicionarPC(e, { personagemId: pj, nome: "Tork" });
  Me.adicionarPC(e, { personagemId: pl, nome: "Lyra" });
  const orcs = Me.adicionarAmeaca(e, "orcCombatente", 2).participantes;
  const espiao = Me.adicionarAmeaca(e, "goblinSalteador", 1, { oculto: true }).participantes[0];
  Me.registrarDesafio(e, { id: "des1", nome: "Orcs da estrada", nd: "1/2", resultado: "vencido" });
  t.recusa("jogador não salva a mesa", J({ acao: "salvar_tormenta20", campanhaId: camp, rev: 0, opId: "op-t20-salva-jo", estado: e }), "sem_permissao");
  const s1 = M({ acao: "salvar_tormenta20", campanhaId: camp, rev: 0, opId: "op-t20-salva-001", estado: e });
  t.ok("o mestre salva (rev 1)", s1.ok && s1.rev === 1);
  const s1b = M({ acao: "salvar_tormenta20", campanhaId: camp, rev: 0, opId: "op-t20-salva-001", estado: e });
  t.ok("o mesmo opId de novo é reconhecido como repetido", s1b.ok && s1b.repetida === true && s1b.rev === 1);
  t.recusa("rev antigo com outro opId dá conflito", M({ acao: "salvar_tormenta20", campanhaId: camp, rev: 0, opId: "op-t20-salva-002", estado: e }), "conflito");
  const vJ = J({ acao: "ler_tormenta20", campanhaId: camp }).dados;
  t.ok("o jogador recebe a vista, sem notas", vJ.mestre === false && vJ.vista && vJ.vista.notas === undefined && vJ.estado === undefined);
  t.ok("  sem o participante oculto", !vJ.vista.combate.participantes.some((p) => p.id === espiao.id));
  t.ok("  e sem os números das ameaças (só o estado aparente)", vJ.vista.combate.participantes.filter((p) => p.tipo === "ameaca").every((p) => p.pv === undefined && p.def === null && p.estado === "ileso"));
  t.ok("  sem desafios ainda não distribuídos", vJ.vista.desafios.length === 0);

  t.grupo("Tormenta20 · iniciativa e ataque contra uma ameaça (rolados no servidor)");
  const ini = J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-ini-jo1", operacao: { tipo: "iniciativa", quem: pj } });
  t.ok("o jogador rola a iniciativa do próprio personagem", ini.ok && Number.isFinite(ini.dados.resultado.iniciativa));
  t.recusa("não age pelo personagem de outra pessoa", J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-ini-jo2", operacao: { tipo: "iniciativa", quem: pl } }), "sem_permissao");
  const cTork = R.calcular(bloco(J, pj));
  const arma = cTork.ataques[0];
  const atq = J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-atq-0001", operacao: { tipo: "atacarAmeaca", quem: pj, ataque: arma.id, alvo: orcs[0].id } });
  t.ok("ataca um orc da mesa", atq.ok && atq.dados.resultado.ataque && typeof atq.dados.resultado.ataque.acertou === "boolean");
  const atqDeNovo = J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-atq-0001", operacao: { tipo: "atacarAmeaca", quem: pj, ataque: arma.id, alvo: orcs[0].id } });
  t.ok("o mesmo ataque repetido não rola nem aplica de novo", atqDeNovo.ok && atqDeNovo.repetida === true);
  const mAtq = M({ acao: "ler_tormenta20", campanhaId: camp }).dados.estado;
  const orcDepois = mAtq.combate.participantes.find((p) => p.id === orcs[0].id);
  t.ok("o PV do orc reflete só um ataque", atq.dados.resultado.ataque.acertou ? orcDepois.pv.atual < orcDepois.pv.max : orcDepois.pv.atual === orcDepois.pv.max);
  const hist = M({ acao: "listar_rolagens", campanhaId: camp });
  t.ok("a rolagem entrou no histórico da campanha uma vez", hist.ok && (JSON.stringify(hist.dados).match(/Tork ataca Orc/g) || []).length === 1);

  t.grupo("Tormenta20 · magia contra ameaças cobra PM uma vez só");
  const pmAntes = R.calcular(bloco(L, pl)).pm.atual;
  const mg = L({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mag-0001", operacao: { tipo: "magiaAmeaca", quem: pl, magia: "explosaoDeChamas", escolhas: { aprim: {} }, alvos: [orcs[0].id, orcs[1].id] } });
  t.ok("lança Explosão de Chamas nos orcs", mg.ok && mg.dados.resultado.custo === 1 && mg.dados.resultado.alvos.length === 2);
  t.ok("  cada orc faz o próprio Reflexos contra a CD", mg.dados.resultado.alvos.every((a) => a.resistencia && Number.isFinite(a.resistencia.total)));
  const mgDeNovo = L({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mag-0001", operacao: { tipo: "magiaAmeaca", quem: pl, magia: "explosaoDeChamas", escolhas: { aprim: {} }, alvos: [orcs[0].id] } });
  t.ok("o clique repetido volta como repetido", mgDeNovo.ok && mgDeNovo.repetida === true);
  t.igual("e os PM caíram uma vez", R.calcular(bloco(L, pl)).pm.atual, pmAntes - 1);
  t.recusa("magia que o personagem não conhece é recusada", L({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mag-0002", operacao: { tipo: "magiaAmeaca", quem: pl, magia: "bolaDeFogo", alvos: [orcs[1].id] } }), "dados_invalidos");

  t.grupo("Tormenta20 · ataque de uma ameaça contra um personagem");
  const lerChefe = M({ acao: "ler_tormenta20", campanhaId: camp }).dados;
  const eChefe = Me.normalizar(lerChefe.estado);
  const chefe = Me.adicionarAmeaca(eChefe, "orcChefe", 1).participantes[0];
  M({ acao: "salvar_tormenta20", campanhaId: camp, rev: lerChefe.rev, opId: "op-t20-salva-chefe", estado: eChefe });
  const pvAntes = R.calcular(bloco(J, pj)).pv.atual;
  const aa = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-aa-00001", operacao: { tipo: "ataqueAmeaca", participante: chefe.id, ataque: "a0", personagem: pj } });
  t.ok("o mestre rola o ataque do orc contra a Defesa da ficha", aa.ok && aa.dados.resultado.ataque && aa.dados.resultado.ataque.teste);
  const pvDepois = R.calcular(bloco(J, pj)).pv.atual;
  t.ok("  acertando, o dano vai para a ficha (menos RD); errando, nada", aa.dados.resultado.ataque.acertou ? pvDepois < pvAntes : pvDepois === pvAntes);
  t.recusa("jogador não comanda ataques de ameaças", J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-aa-00002", operacao: { tipo: "ataqueAmeaca", participante: chefe.id, ataque: "a0", personagem: pj } }), "sem_permissao");

  t.grupo("Tormenta20 · manobras (teste oposto rolado no servidor, p. 234)");
  const mj = J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mnb-0001", operacao: { tipo: "manobraContraAmeaca", quem: pj, alvo: chefe.id, manobra: "derrubar" } });
  t.ok("o jogador tenta derrubar o orc: o servidor rola os dois lados", mj.ok && mj.dados.resultado.manobra && mj.dados.resultado.manobra.oposto.rodadas.length >= 1);
  const estMnb = Me.normalizar(M({ acao: "ler_tormenta20", campanhaId: camp }).dados.estado);
  const caido = (Me.participante(estMnb, chefe.id).condicoes || []).some((c) => c.id === "caido");
  t.ok("  vencendo, o orc fica caído na mesa; perdendo, nada muda", mj.dados.resultado.manobra.venceu ? caido : !caido);
  const mjDeNovo = J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mnb-0001", operacao: { tipo: "manobraContraAmeaca", quem: pj, alvo: chefe.id, manobra: "derrubar" } });
  t.ok("  o clique repetido não rola de novo", mjDeNovo.ok && mjDeNovo.repetida === true);
  t.recusa("manobra que não existe é recusada", J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mnb-0002", operacao: { tipo: "manobraContraAmeaca", quem: pj, alvo: chefe.id, manobra: "voar" } }), "dados_invalidos");
  t.recusa("o jogador não comanda a manobra da ameaça", J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mnb-0003", operacao: { tipo: "manobraDeAmeaca", participante: chefe.id, personagem: pj, manobra: "agarrar" } }), "sem_permissao");
  const mm = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-mnb-0004", operacao: { tipo: "manobraDeAmeaca", participante: chefe.id, personagem: pj, manobra: "agarrar" } });
  const agarrado = R.calcular(bloco(J, pj)).condicoes.some((c) => c.id === "agarrado");
  t.ok("o mestre: o orc tenta agarrar; vencendo, a ficha fica agarrada", mm.ok && (mm.dados.resultado.manobra.venceu ? agarrado : !agarrado));

  t.grupo("Tormenta20 · recompensas sem duplicar");
  const rec = { tipo: "recompensa", personagens: [pj, pl], xp: { [pj]: 1250, [pl]: 1250 }, tibar: { [pj]: 150, [pl]: 150 }, itens: [{ alvo: pl, item: { ref: "essenciaDeMana" } }], desafios: ["des1"], resumo: "Orcs da estrada" };
  const xpAntes = bloco(J, pj).xp;
  const r1 = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-rec-0001", operacao: rec });
  t.ok("o mestre distribui XP, tibares e um item", r1.ok && r1.dados.gravadas === 2);
  const r2 = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-rec-0001", operacao: rec });
  t.ok("a mesma distribuição repetida não aplica de novo", r2.ok && r2.repetida === true);
  t.igual("Tork ganhou 1.250 XP uma vez só", bloco(J, pj).xp, xpAntes + 1250);
  t.ok("Lyra recebeu a essência de mana", bloco(L, pl).inventario.itens.some((i) => i.ref === "essenciaDeMana"));
  const mRec = M({ acao: "ler_tormenta20", campanhaId: camp }).dados.estado;
  t.ok("a mesa registra a distribuição e marca o desafio", mRec.distribuicoes.some((d) => d.id === "op-t20-rec-0001") && mRec.desafios.find((d) => d.id === "des1").distribuido === "op-t20-rec-0001");
  const apagar = Object.assign({}, mRec, { distribuicoes: [], desafios: [] });
  const sApagar = M({ acao: "salvar_tormenta20", campanhaId: camp, rev: M({ acao: "ler_tormenta20", campanhaId: camp }).dados.rev, opId: "op-t20-salva-003", estado: apagar });
  t.ok("salvar o estado não apaga distribuições nem desafios já distribuídos", sApagar.ok && sApagar.dados.estado.distribuicoes.length >= 1 && sApagar.dados.estado.desafios.some((d) => d.id === "des1"));
  t.ok("o jogador vê a distribuição", J({ acao: "ler_tormenta20", campanhaId: camp }).dados.vista.distribuicoes.some((d) => d.id === "op-t20-rec-0001"));
  t.recusa("jogador não distribui recompensas", J({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-rec-0002", operacao: rec }), "sem_permissao");

  t.grupo("Tormenta20 · descanso, condição e fim de cena");
  const d1 = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-desc-001", operacao: { tipo: "descanso", personagens: [pj, pl], condicao: "confortavel" } });
  t.ok("descanso confortável aplicado aos dois", d1.ok && d1.dados.resultado.aplicadas[pj].ok && d1.dados.resultado.aplicadas[pl].ok);
  t.igual("  Lyra volta com os PM cheios (recupera o dobro do nível)", R.calcular(bloco(L, pl)).pm.atual, R.calcular(bloco(L, pl)).pm.max);
  const c1 = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-cond-001", operacao: { tipo: "condicao", personagens: [pj], condicao: "abalado" } });
  const c2 = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-cond-002", operacao: { tipo: "condicao", personagens: [pj], condicao: "abalado" } });
  t.ok("abalado de novo vira apavorado (agravamento, p. 394)", c1.ok && c2.ok && bloco(J, pj).condicoes.some((c) => c.id === "apavorado") && !bloco(J, pj).condicoes.some((c) => c.id === "abalado"));
  const fc = M({ acao: "tormenta20_operar", campanhaId: camp, opId: "op-t20-cena-001", operacao: { tipo: "fimDeCena" } });
  t.ok("o fim da cena tira as condições de cena", fc.ok && bloco(J, pj).condicoes.length === 0);

  t.grupo("Tormenta20 · em campanha de outro sistema, a mesa não responde");
  const outra = M({ acao: "criar_campanha", dados: { sistema: "ordem", nome: "Outra" } }).dados.id;
  t.recusa("ler_tormenta20 numa campanha de Ordem", M({ acao: "ler_tormenta20", campanhaId: outra }), "outro_sistema");
}
