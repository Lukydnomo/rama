# Vampiro: A Máscara (V5) no R.A.M.A. (v5.0)

Vampiro: A Máscara, 5ª edição (manual básico em português), como um sistema
completo da plataforma: ficha, criação guiada, motor de regras, a crônica do
Narrador e o servidor. Só o livro básico da V5 — nada de Pontos de Sangue,
Virtudes, Trilhas de Iluminação ou regras de edições anteriores; a ficha
antiga serviu apenas de referência visual.

**Páginas.** Toda referência dá a página **impressa**; o PDF do manual tem
deslocamento: impressa 1–305 → PDF = impressa + 2; impressa 306 em diante →
PDF = impressa + 4 (`RAMAVampiroCatalogo.paginaDoPdf`). Na matriz, a página
do PDF vem entre parênteses quando ajuda a achar.

**Fonte das tabelas.** O texto extraído do PDF é ruim (OCR); as tabelas foram
lidas na página renderizada, uma a uma, e os nomes conferidos no original.

---

## Arquitetura

```
js/vampiro/
  catalogo.js            dados do livro (Atributos, Habilidades, clãs,
                         Predadores, Vantagens, Fichas de Conhecimento,
                         Ressonâncias, Discrasias, tabelas de Potência,
                         Humanidade, geração, frenesi, compulsões, armas…)
  disciplinas-dados.js   as 11 Disciplinas, todos os poderes do básico,
                         26 rituais, proteções, Alquimia Sangue-Ralo
  antagonistas-dados.js  mortais, animais, vampiros e criaturas (p. 369–377)
  dados.js               o motor de dados: Fome, críticos, bestiais,
                         Força de Vontade, Checagens, disputas, conflito
  regras.js              a ficha em camadas e todas as regras de jogo
  poderes.js             usar poderes, rituais e alquimia
  cronica.js             o estado da crônica do Narrador e a vista dos
                         jogadores
  telas/
    vampiro-comum.js       operar, trilhas, pontos, Fome, a janela da
                           rolagem pendente, escolhas da mesa; a ficha
                           numa crônica (RAMAVampiroMesaDaFicha)
    ficha-vampiro.js       seções da ficha (Personagem, Sangue, Humanidade,
                           Vantagens, Experiência, Equipamento)
    ficha-vampiro-disciplinas.js   Disciplinas, Rituais, Alquimia
    vampiro-criar.js       criação guiada em 12 etapas
    campanha-vampiro.js    a aba Crônica da campanha
backend/Vampiro.gs       ler_vampiro, salvar_vampiro, vampiro_operar e a
                         CÓPIA FIEL do motor (testes/gerar-vampiro-gs.js)
css/vampiro.css, css/modern20/vampiro.css
assets/sistemas/vampiro-capa.webp, vampiro-capa-pequena.webp
```

**Registro de sistemas (v4.0).** `js/sistemas.js` e `backend/Sistemas.gs`
declaram o sistema `vampiro`: bloco da ficha `vampiro`, motor `RAMAVampiro`,
abas, resumo para a mesa (`resumoVampiro`, calculado com `resumoParaMesa`),
quem conduz (**Narrador**) e a ferramenta `cronica`. Trocar o sistema de uma
campanha guarda a crônica (`CAMPANHA_VAMPIRO`) suspensa; voltar devolve tudo.

### A ficha em camadas

Cada valor permanente é a soma de camadas, e a ficha mostra de onde vem cada
número (passe o mouse; o leitor de tela lê "Composição"):

| Camada | Onde mora | Quem escreve |
|---|---|---|
| base (criação) | `atributos`, `habilidades`, `disciplinas`, `humanidadeBase` | a criação guiada |
| concessões | calculadas, nunca gravadas: `R.concessoes(o)` | clã, idade, Predador — trocar o Predador troca o que ele dá, sem duplicar |
| compras | `compras[]` (de, para, custo, crédito, noite) | a XP, nível a nível |
| ajustes | `ajustes[]` (valor, origem, motivo) | o modo Edição depois da criação, a mesa |

Os **saldos** — dano Superficial e Agravado, Fome, Máculas, estados
(Torpor, estaca, frenesi, Compulsão, Morte Final), efeitos ativos, Laços —
são guardados como estão: recalcular a ficha nunca cura nem devolve um custo.

### Tempo, operações e idempotência

- Cada ação da ficha é UMA operação com id (`R.aplicarOperacao`): clique
  repetido, resposta perdida ou volta à página não aplicam duas vezes (os
  últimos 300 ids ficam na ficha).
- **Momentos**: `inicioDaSessao` (recupera FdV; NÃO é uma noite),
  `novaNoite` (Checagem do despertar; efeitos "noite" expiram; a estaca e o
  Torpor contam), `novaCena`, `fimDaCena`, `fimDoTurno`, `fimDaSessao`
  (Ambição, XP, Remorso de quem tem Máculas).
- **Ficha avulsa**: o tempo anda pelos botões da própria ficha.
  **Numa crônica**: quem anda é o Narrador; o servidor aplica os momentos em
  todas as fichas de Vampiro da campanha (`vampiro_operar`, tipo
  `momentos`), uma vez por id, com o dado do servidor.
- **Rolagem pendente**: o teste fica aberto até "Concluir" — rerrolar com
  Força de Vontade, julgar a Dificuldade que veio depois, vencer a um custo.
  Fechar a janela CONCLUI (não dá para descartar um dado e rolar de novo).
  O resultado vai pelo funil de sempre (`RAMARolagens.mostrar`) para o
  histórico da campanha, com a marca de cada dado de Fome.

### Segurança

- O servidor confere toda leitura e gravação. A crônica completa só vai ao
  Narrador; o jogador recebe a **vista** calculada no servidor
  (`vistaDosJogadores`): sem PNs ocultos, sem notas privadas, sem relações
  privadas, sem relações que toquem um PN oculto (nem a existência dele
  vaza), sem o registro privado.
- `salvar_vampiro`: só o Narrador (rev + opId). A coterie só aceita
  personagens da própria campanha.
- `vampiro_operar`: momentos, XP, Máculas, dano, Pilar e Diablerie só pelo
  Narrador. Beber de outro vampiro e Direto da Fonte exigem que quem pede
  possa editar a ficha de quem bebe E a do doador — ou que seja o Narrador.
  **Uma ação válida contra outro personagem nunca abre a ficha dele**: o
  servidor aplica o efeito da regra e devolve só os eventos.
- O resumo do painel (`resumoVampiro`) é recalculado no servidor com o motor;
  Convicções, Pilares, Laços e notas nunca entram nele. "Esconder status dos
  jogadores" vale como para os outros sistemas.
- Decisões que só a mesa toma — matar uma vítima, violar uma Convicção,
  quebrar a Máscara, a consequência de um resultado bestial — **nunca** são
  sorteadas nem aplicadas sozinhas: o motor devolve uma pendência e a tela
  pergunta.

---

## Matriz de cobertura

Legenda da coluna "Verif.": **T** = teste automatizado
(`testes/executar-vampiro.js`, `testes/vampiro-backend.js`), **N** = revisão
no navegador (servidor local, dados sintéticos), **—** = sem verificação
dedicada. "Automático" é o que o motor faz sozinho; "Mesa" é o que fica com
quem joga ou com o Narrador.

### Regras básicas (pp. 115–130, PDF 117–132)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Parada: Atributo + Habilidade/Disciplina, dois Atributos; nunca < 1 dado | 118–120 (120–122) | `ATRIBUTOS`, `HABILIDADES` | `montarParada` | composição com fonte de cada dado | escolhe a parada | T, N |
| Especialização +1 (uma por rolagem) | 119 (121) | `especializacoes` | `montarParada` | soma se escolhida | escolhe | T, N |
| Dificuldade 1–7 e limiar 6 | 119 (121) | `DIFICULDADES` | `D.classificar` | julgamento | define a Dif. (ou depois) | T, N |
| Pares de 10 = +2 (crítico); três 10 = 5 | 120–121 (122–123) | — | `D.contar` | | | T |
| Vitória automática (parada ≥ 2 × Dif.), nunca em Checagem | 120, 123 | — | `D.vitoriaAutomatica` | oferece | concede | T |
| Vencer a um custo | 121 (123) | — | `D.concluir({vencerACusto})` | só se houve sucesso e falhou | o Narrador aceita | T, N |
| Falha total | 122 (124) | — | `D.classificar` | | | T |
| Força de Vontade rerrola até 3 dados comuns (nunca Fome, trilha, Checagem, rolagem única); 1 Superficial sem dividir | 122, 126, 158 | — | `R.rerrolarComFdV`, `D.rerrolar` | uma vez por rolagem; recusa em frenesi | escolhe os dados | T, N |
| Checagem: 1 dado, 6+ | 122 (124) | — | `D.checagem` | | | T |
| Disputa e "pegar a metade" | 123 (125) | — | `D.disputa`, `D.pegarAMetade` | quem age vence o empate | | T |
| Conflito: dano = margem (+ arma); bilateral empatado = margem 1 dos dois | 124–126 | `ARMAS`, `ARMADURAS`, `COBERTURA` | `D.resolverConflito` | | ordem e declarações | T |
| Superficial dividido (arred. para cima); "/" e "X" | 126 (128) | — | `R.sofrerDano` | divide, converte, transborda | tipo e fonte | T, N |
| Debilitado: −2 físicos / sociais e mentais | 126 (128) | — | `R.penalidadesDeTrilha` | | | T |
| Fim da trilha: vampiro → Torpor; fogo/sol → Morte Final; mortal → morte | 127 (129) | — | `fimDaTrilha` | | | T |
| Cura mortal e Medicina | 127 (129) | — | `R.curarComoMortal`, `R.tratarComMedicina` | | dias, sucessos | T |
| XP: 1 por sessão, +1 por história | 130 (132) | — | `R.fimDaSessao`, crônica | | o Narrador concede | T, N |

### Criação (pp. 135–154, PDF 137–156) — 12 etapas

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| 1 Conceito, natureza (vampiro, carniçal, mortal) | 136 (138) | ficha | etapa 1 | | jogador | N |
| 2 Clã, Caitiff, Sangue-Ralo; Perdição (Malkaviano: categoria; Ventrue: presa) | 59–114, 136 | `CLAS` | etapa 2 | trocar limpa as Disciplinas da criação | jogador | T, N |
| 3 Senhor; Mar do Tempo (Criança, Neófito, Ancilla); geração | 137, 148–151 | `IDADES`, `GERACOES` | etapa 3 | Potência, XP, Humanidade e Vantagens da idade | jogador | T, N |
| 4 Atributos 4/3/3/3/2/2/2/2/1; Vitalidade = Vigor + 3; FdV = Autocontrole + Determinação | 136, 154 | `DISTRIBUICAO_DE_ATRIBUTOS` | etapa 4 | contador ao vivo | jogador | T, N |
| 5 Habilidades: Pau pra Toda Obra, Equilibrado, Especialista | 136, 145 | `DISTRIBUICOES_DE_HABILIDADES` | etapa 5 | contador | jogador | T, N |
| 5 Especializações grátis (Erudição, Ofícios, Performance, Ciência) + 1 livre; sem repetir a do Predador | 149, 159 | `HABILIDADES` | etapa 5 | pendências | jogador | T, N |
| 6 Disciplinas 2 + 1 do clã (Caitiff: quaisquer); um poder por ponto, amálgamas e pré-requisitos | 149, 244 | `DISCIPLINAS`, `PODERES` | etapa 6, `podeAdquirirPoder`, `requisitosDoPoder` | só oferece o permitido; revalida se o clã/Predador mudar | jogador | T, N |
| 6 Feitiçaria de Sangue: um Ritual de nível 1 | 274 | `RITUAIS` | etapa 6 | | jogador | T |
| 6 Sangue-Ralo: Alquimia só com a Qualidade Alquimista (método + fórmula 1) | 109–113, 282 | `SANGUE_RALO`, `METODOS_DE_ALQUIMIA` | etapa 6 | | jogador | T |
| 7 Predador: especialização (+1 ponto se a Habilidade é 0), Disciplina + poder, Humanidade, Potência, Vantagens, Defeitos, escolhas; proibições | 175–178 (177–180) | `PREDADORES` | etapa 7, `concessoes` | concede sem duplicar; filtra amálgamas sem requisito | jogador | T, N |
| 8 Vantagens 7 (+2 ancilla), Defeitos 2 (+2) além dos do Predador; Fichas de Conhecimento contam | 179, 382 | `VANTAGENS`, `FICHAS_DE_CONHECIMENTO` | etapa 8 | contador; proíbe o que o clã não pode | jogador | T, N |
| 8 Sangue-Ralo: 1–3 Qualidades e o mesmo número de Defeitos; conflitos; sem Status/Mawla/Lacaios | 109–113, 149 | `SANGUE_RALO` | etapa 8 | | jogador | T |
| 9 Convicções 1–3, cada uma com um Pilar | 172–173 | ficha | etapa 9 | | jogador | T, N |
| 10 Ambição e Desejo | 173–174 | ficha | etapa 10 | | jogador | T, N |
| 11 XP inicial (Neófito 15, Ancilla 35), cada nível pago | 137, 151 | `CUSTOS_XP` | etapa 11, `R.comprar` | desfaz a última compra | jogador | T |
| 12 Revisão; criar com pendências (a ficha avisa e retoma) | — | — | `R.validarCriacao`, `R.concluirCriacao` | | jogador | T, N |

### Características (pp. 155–171)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| 9 Atributos, 27 Habilidades com exemplos de especialização | 155–171 | `ATRIBUTOS`, `HABILIDADES` | aba Personagem | composição por camada | | N |
| FdV não se compra; recuperação no início da sessão (exceto cena de ação interrompida) | 157–159 | — | `R.inicioDaSessao` | | | T, N |
| Desejo 1×/sessão (1 Superficial); Ambição no fim da sessão (1 Agravado) | 158–159 | — | `R.cumprirDesejo`, `R.fimDaSessao` | | a mesa confirma | T, N |
| Recuperações a critério (Pilar, Convicção, Compulsão bem jogada) | 158–159 | — | `R.recuperarFdV` | | o Narrador decide | T |
| Especializações até o valor (Ofícios sem limite) | 159, 164 | `semLimiteDeEspecializacoes` | `validarCompra` | | | T |

### Vantagens, Fichas de Conhecimento, Coterie (pp. 179–199, 382–406)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Qualidades, Defeitos e Antecedentes por grupo, com níveis e efeitos mecânicos (Analfabeto limita Erudição/Ciência etc.) | 179–194 | `VANTAGENS`, `GRUPOS_DE_DEFEITO` | aba Vantagens, `pontosLimite` | limites e proibições por clã | | T, N |
| 25 Fichas de Conhecimento; cada nível independente (não dá os anteriores); exclusivas de clã (Hardestadt, Helena, Tyler, Zelios, Vasantasena, Karl Schrekt, Xaviar) | 180, 382–406 (384–410) | `FICHAS_DE_CONHECIMENTO` | criação, `validarCompra` tipo `ficha` | custo 3 XP por ponto; limite de uso anotado (história/sessão/crônica) | usar | T, N |
| Coterie: parada (1 por membro, 2 com ≤ 3 jogadores), Domínio (Chasse, Lien, Portillon), 15 tipos | 195–199 | `COTERIES`, `DOMINIO` | `CR.parada`, `CR.definirCoterie` | o tipo aplica domínio e Antecedentes (origem "tipo") | escolhe | T, N |
| Caçar no domínio: Dificuldade 7 − Chasse | 196 | `dificuldadeDeCacaDoChasse` | crônica, caçada | | | T |

### Vampiros: Fome, Compulsões, Inflamar o Sangue (pp. 201–213)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Dados de Fome substituem dados comuns (os últimos da parada); nunca em trilha/Checagem/rolagem única | 205 (207) | — | `D.rolar`, `D.dadosDeFome` | losango, símbolo e texto acessível; marca no histórico | | T, N |
| Crítico bestial (vitória crítica com um 10 de Fome) e falha bestial (falha com um 1 de Fome) | 207 (209) | — | `D.classificar`, `R.concluirTeste` | vira pendência | o Narrador escolhe UMA consequência | T |
| Compulsões: tabela d10 (Fome, Dominância, Dano, Paranoia, clã); Caitiff/Sangue-Ralo rerrolam o 10 | 208–211 | `COMPULSOES`, `CLAS[].compulsao` | `R.iniciarCompulsao` | penalidade nos testes | termina pela ficção | T, N |
| Inflamar o Sangue: Checagem; falha → +1 Fome; Fome 5 recusa o voluntário; forçada e falhada → frenesi Dif 4 ou Torpor | 211 (213) | — | `R.checagemDeSangue`, `R.checagens` | | | T, N |
| Saciar: fontes, tempos, mínimos pela Potência; matar exige confirmação | 211–213 | `FONTES_DE_SANGUE` | `R.planejarAlimentacao`, `R.alimentar` | plano antes de confirmar | confirma morte/Convicção/Máscara | T, N |

### O Sangue: geração, Potência, dons e perigos (pp. 215–225)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Geração → limites de Potência | 215 | `GERACOES` | `R.limitesDePotencia` | compra recusada acima | | T |
| Tabela de Potência 0–10 (Surto, cura, bônus em Disciplinas, rerrolar Checagem de poder, Perdição, penalidade de alimentação) | 216 | `POTENCIA` | `R.potencia`, `montarParada`, `planejarAlimentacao` | | | T, N |
| Surto de Sangue (Checagem antes) | 217 | — | `R.rolarTeste({surto})` | | escolhe | T, N |
| Curar Superficial (1/turno), Agravado (3 Checagens, 1/noite, Torpor se a Fome passar de 5) | 218–219 | — | `R.curarSuperficial`, `R.curarAgravado` | | | T |
| Rubor de Vida | 218 | — | `R.ruborDeVida` | Humanidade 8 rola 2 | | T |
| Sono diurno e despertar de dia | 219 | — | `R.despertarDeDia` | | Dif. da crise | T |
| Frenesi (fúria, fome, terror): FdV atual + 1/3 da Humanidade, sem Fome; Curtir a Onda | 219–220 | `FRENESI` | `R.testarFrenesi`, `R.entrarEmFrenesi`, `R.encerrarFrenesi`, `R.assumirControle` | só Disciplinas físicas, sem FdV para rerrolar | gatilho e Dif. | T, N |
| Luz do sol, fogo | 221–222 | — | `R.luzDoSol`, `R.fogo` | Agravado; Torpor com fogo/sol → Morte Final | exposição | T |
| Estaca; Torpor (duração pela Humanidade); Morte Final | 222–223 | `HUMANIDADE` | `R.estaquear`, `R.entrarEmTorpor`, `R.despertarDoTorpor`, `R.morteFinal` | a ficha fica para consulta | | T, N |

### Ressonância, Laços, Carniçais, Diablerie (pp. 226–235)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Humores e temperamento; tabelas d10; Intenso +1 dado nas Disciplinas | 226–228 | `RESSONANCIAS`, `TEMPERAMENTOS` | `R.definirRessonancia`, `R.ressonanciaAleatoria` | expira ao alimentar/Fome 5 | define | T, N |
| 26 Discrasias (efeitos e créditos de XP restritos) | 230–231 | `DISCRASIAS` | `montarParada`, `creditosAplicaveis` | | | T |
| XP em Disciplina exige a Ressonância; fora do clã, provar o Sangue | 231 | — | `validarCompra` | | confirma | T, N |
| Sangue-Ralo: Disciplina temporária pela Ressonância | 113 | — | `definirRessonancia` | | escolhe poderes | T |
| Laço de Sangue: 3 bebidas, força até 6, −1 por mês, desafiar | 233–234 | — | `R.beberDeVampiro`, `R.paradaContraLaco`, `R.enfraquecerLacos` | | | T |
| Beber de outro vampiro (Potência relativa sacia ×2 / ½) | 212, 233 | — | `vampiro_operar` `alimentarDeVampiro` | servidor confere as duas fichas | | T |
| Carniçais: poderes > 1 custam 1 Agravado; curam o dobro | 234 | — | `checagemDeSangue`, `ativarPoder`, `curarComoMortal` | | | T |
| Diablerie: etapas por turno; consumada → Humanidade, XP restrito, geração | 234–235 | — | `R.diablerieTurno`, `R.diablerieConsumada`, `vampiro_operar` `diablerie` | | o Narrador consuma | T |

### Humanidade (pp. 236–241)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Tabela 10–0 (Rubor, comida, despertar, penalidade com humanos, Torpor) | 236–241 | `HUMANIDADE` | aba Humanidade, `montarParada` | | | T, N |
| Máculas da direita; Princípios da Crônica | 239 | `principios` | `R.adicionarMaculas` | | o Narrador dá (crônica) | T, N |
| Convicção mitiga | 239 | — | `adicionarMaculas({convicao})` | | | T |
| Remorso no fim da sessão (espaços vazios, mínimo 1) | 239 | — | `R.testarRemorso` | | | T, N |
| Degeneração (Agravado à FdV, −2) e aceitar perder 1 | 239 | — | `R.aceitarDegeneracao` | | | T |
| Pilares: Máculas por evento; transferir (Humanidade Dif 4) | 240 | `MACULAS_DE_PILAR` | `R.eventoDePilar`, `R.transferirPilar` | | | T, N |
| Humanidade 0: wassail, Físicos 5, frenesi | 241 | — | `R.mudarHumanidade` | | | T |
| Subir Humanidade: arco narrativo + XP 10 × novo valor | 241 | — | `validarCompra({autorizado})` | | o Narrador autoriza | T |

### Disciplinas, Rituais, Alquimia (pp. 244–288)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Um poder por ponto, nível ≤ valor, amálgamas, pré-requisitos | 244 | `PODERES` | `podeAdquirirPoder`, `requisitosDoPoder` | | escolhe | T, N |
| Animalismo, Auspícios, Celeridade, Dominação, Fortitude, Ofuscação, Potência, Presença, Proteanismo, Feitiçaria de Sangue — todos os poderes do básico | 244–282 | `PODERES` | aba Disciplinas, `P.ativarPoder`, `P.resolverPoder` | custo antes (Checagens, FdV, Máculas); efeitos com duração; bônus de Potência | alvo, Dif./oposição | T, N |
| Efeitos mecânicos (Pele de Mármore, Desafio à Perdição, Tenacidade, Resiliência, Poder Vindo da Dor, formas…) | 260–273 | `efeitos` | `sofrerDano`, `vitalidadeMaxima`, `aplicarEfeitoDoPoder` | | | T |
| Rituais: Checagem + Inteligência + Feitiçaria contra nível + 1 | 274–282 | `RITUAIS`, `PROTECOES` | `P.executarRitual`, `P.resolverRitual` | | | T |
| Alquimia Sangue-Ralo: métodos, destilação (qualidade pelos sucessos), doses prontas | 282–288 | `METODOS_DE_ALQUIMIA`, fórmulas | `P.destilar`, `P.concluirDestilacao`, `P.ativarFormula` | Athanor: uma ativa; Fixatio: limite de armazenamento | | T |
| Direto da Fonte (Celeridade, Fortitude, Potência 4) | 256, 262, 268 | — | `vampiro_operar` `diretoDaFonte` | servidor confere as duas fichas | | T |

### Sistemas avançados e crônica (pp. 289–316, 337–368)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Sessão, noite, cena (destaque, abstraída, interlúdio), modos de jogo, turno | 290–292 | `TIPOS_DE_CENA`, `MODOS_DE_JOGO` | `CR.iniciarSessao` … `CR.proximoTurno` | momentos nas fichas pelo servidor | o Narrador conduz | T, N |
| Testes estendidos (padrão, difícil, em cascata, disputa) | 293–294 | — | `D.testeEstendido`, `CR.registrarNoEstendido` | | | T |
| Conflito avançado; rolagem única | 295–305 | `ROLAGEM_UNICA`, `AUDIENCIA_SOCIAL`, `FERIMENTOS` | `D.resolverConflito`, `D.danoDeRolagemUnica`, `CR.novoConflito` | | | T |
| Caçada: parada do Predador × território | 306–308 (310–312) | `TERRITORIOS_DE_CACA`, `MODIFICADORES_DE_CACA` | `R.paradaDeCaca`, `R.dificuldadeDeCaca` | | território | T, N |
| Memoriam (uma por história; dados extras) | 311–314 (315–318) | — | `CR.iniciarMemoriam` | Checagem no servidor | resultado | T |
| Prestação (favores) | 314–315 (318–319) | `FAVORES` | crônica | | | N |
| Princípios da Crônica, Mapa de Relacionamentos, PNs | 142, 337–368 | — | crônica | vista dos jogadores sem o oculto | o Narrador | T, N |

### Antagonistas e itens (pp. 369–381)

| Regra | p. (PDF) | Dados | Implementação | Automático | Mesa | Verif. |
|---|---|---|---|---|---|---|
| Mortais, animais, vampiros e criaturas (sem Fome) | 369–377 (373–381) | `AN.LISTA` | PN a partir do modelo (cópia) | | | T |
| Modelos de mortais (Fraco a Mortífero) | 377 | `MODELOS_MORTAIS` | — | | | — |
| Armas e armaduras | 379–380 | `ARMAS`, `ARMADURAS` | aba Equipamento | | | N |
| Fé Verdadeira e drogas | 381 | `FE_VERDADEIRA`, `DROGAS` | referência | | | — |

---

## Interpretações adotadas

Onde o livro não fecha a regra, ou se contradiz, esta é a leitura
implementada — nunca uma errata.

1. **Humanidade 10 e o Torpor.** A tabela da p. 241 começa em 9; para 10, o
   motor usa "um dia" (menor que o de 9).
2. **Caitiff "duas" Disciplinas.** A criação dá 2 + 1 pontos em quaisquer
   duas (p. 149); o texto do clã fala em "três" em outro trecho — vale o da
   criação.
3. **Custo da Alquimia** para quem é Sangue-Ralo: como Disciplina de clã
   (novo × 5).
4. **Uma rerrolagem de Força de Vontade por rolagem**, de até 3 dados
   comuns, custando 1 Superficial à FdV **sem dividir** (gasto voluntário).
5. **Fim da Compulsão.** Cada uma termina pela condição do livro; a
   Perfeccionismo (Tremere) termina na vitória crítica de Habilidade ou na
   segunda repetição.
6. **Potência 2 com sangue animal ou ensacado** sacia a metade: dois meios
   pontos (`fracaoDeFome`) fazem um.
7. **Perdição Ventrue** fora da presa preferida: gasto de FdV igual à
   Gravidade (cobrado no plano de alimentação).
8. **Sangue-Ralo não escolhe Predador na criação** (p. 149: ainda não
   descobriu como caça).
9. **Rolagem sem Dificuldade**: fica pendente; o Narrador pode julgar
   depois. Sem julgamento, conclui só com os sucessos (sem vitória a
   anunciar).
10. **Fichas de Conhecimento**: cada nível custa como Antecedente (3 XP por
    ponto, nível × 3) e não concede os níveis abaixo (p. 180).
11. **Especialização repetida** (a livre igual à do Predador) é pendência
    da criação: não soma nada.

## Lacunas e limites conhecidos

- **A ficha é de quem a edita.** Como nos outros sistemas, o dono (e quem
  tem acesso de Editor) pode corrigir a própria ficha no modo Edição —
  inclusive a XP de uma ficha avulsa. Numa crônica, a tela só oferece a XP e
  as Máculas ao Narrador, e as operações entre fichas são conferidas no
  servidor; a gravação comum da própria ficha não é revalidada regra a regra.
- **A rolagem é do navegador** (como em toda a plataforma). A rolagem
  pendente fica na janela: recarregar a página antes de concluir perde a
  rolagem — ela não vai ao histórico.
- **Mapa de Relacionamentos em lista** (acessível e legível no celular), não
  em grafo desenhado.
- **Efeitos narrativos** de poderes e Discrasias ficam como texto na ficha;
  o motor aplica os que mudam número (paradas, trilhas, custos, durações).
- **Projetos, jogo ponderado e Apêndice II/III** (pp. 413–425): não
  automatizados.
- **Visão do jogador da crônica no navegador** não foi revista com uma
  segunda conta; é coberta pelos testes do servidor.

---

## Verificação

### Verificação da v5.0.0

**Executado (29/10/2026), com dados sintéticos:**

- `testes/executar-vampiro.js` — 257 verificações (motor com dados
  combinados: criação nas 12 etapas e as restrições, camadas, Predador sem
  duplicar, Fome e críticos/falhas bestiais, Força de Vontade, Checagens,
  dano e cura, frenesi, Compulsões, Humanidade, Máculas, Remorso, Pilares,
  Torpor, estaca, sol, fogo, Ressonância, alimentação, Laços, Diablerie, XP
  nível a nível, Fichas de Conhecimento, poderes, rituais, alquimia, crônica e
  vista dos jogadores, antagonistas).
- `testes/executar-backend.js` — 1757 verificações, nos dois modos (normal e
  `--servico-avancado`); `testes/vampiro-backend.js` (37) confere a cópia do
  motor no `.gs`, a vista do Narrador e a dos jogadores sem nada privado,
  gravação com rev/opId e repetição, momentos (sessão ≠ noite, sem repetir,
  Checagem com o dado do servidor), XP e Máculas só pelo Narrador, beber de
  outro vampiro com as duas permissões, resumo do painel e a troca de sistema
  guardando a crônica.
- As demais suítes, sem regressão: 3436 regras, 494 Oblívio, 252 tema, 249
  frontend, 213 CRIS, 188 criaturas, 89 feedback, 73 dados, 57 pastas, 40
  editor de imagem, 19 coordenação; sintaxe de todos os `.js` e `.gs`.
- Revisão no navegador (servidor local `testes/servidor-local.js`, conta de
  teste): Vampiro com a capa na escolha de sistema; criação guiada nas 12
  etapas até a ficha (Brujah, Vira-lata, Ficha de Conhecimento de clã);
  teste Força + Briga com 1 dado de Fome, rerrolagem de 3 dados com Força de
  Vontade (1 Superficial, uma vez só), conclusão e cartão com a face de Fome;
  abas Disciplinas, Sangue, Humanidade (evento de Pilar → Mácula), Vantagens
  e Experiência (compra nível a nível); campanha de Vampiro criada, ficha
  vinculada, aba Crônica: iniciar sessão e nova noite chegando à ficha
  (Checagem do despertar rolada no servidor, FdV recuperada); cartão do
  painel; histórico da campanha com "de Fome"; celular (375 px, sem rolagem
  lateral) e Modern20.

**Não é validação de implantação.** Tudo acima roda no servidor simulado
local; a implantação real do Apps Script (com `setupRama()` e a versão nova)
precisa ser conferida depois de atualizar o backend.
