# Ordem Paranormal — matriz de regras

O que o R.A.M.A. implementa das regras de Ordem Paranormal, de onde cada
regra veio e como ela se comporta.

**Fontes.** `OPRPG` = *Ordem Paranormal RPG — Livro de Regras*, v1.1, Jambô,
2022. `SAH` = *Sobrevivendo ao Horror*, v1.2, Jambô, 2024. As páginas citadas
são as do livro, não as do PDF.

**Regra de ouro deste documento.** Nada aqui foi deduzido de memória nem
preenchido por analogia. O que não foi encontrado nos dois livros está na
seção **Lacunas**, no fim, em vez de aparecer como regra.

---

## Estado de implementação

| símbolo | significado |
|---|---|
| **A** | automatizado: o R.A.M.A. calcula, valida ou aplica sozinho |
| **P** | parcial: estruturado e conferido, mas o efeito mecânico não entra no cálculo |
| **I** | informativo: o texto está no catálogo, sem efeito mecânico |
| **—** | não implementado nesta entrega |

---

## Atributos

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Cinco atributos: Agilidade, Força, Intelecto, Presença, Vigor | OPRPG p.14 | campos fixos da ficha de Ordem | **A** |
| Todos começam em 1; 4 pontos para distribuir | OPRPG p.14 | a criação guiada distribui e confere o saldo | **A** |
| Pode reduzir **um** atributo a 0 para ganhar +1 ponto | OPRPG p.14 | permitido uma vez; a criação avisa se for usado de novo | **A** |
| Máximo inicial 3 | OPRPG p.14 | a criação recusa 4+ na distribuição inicial | **A** |
| Teste rola Nd20 e pega o maior; atributo 0 rola 2d20 e pega o menor | OPRPG p.14, p.40 | o motor de dados já fazia isso (`NdX` e `-NdX`) | **A** |
| Aumento de atributo em NEX 20%, 50%, 80% e 95%, teto 5 | OPRPG p.26 | a progressão oferece a escolha e valida o teto | **A** |
| Vigor aumentado sobe os PV **retroativamente** | OPRPG p.15 | o PV é recalculado do zero a cada mudança, então é retroativo por construção | **A** |

## Perícias

As 28 perícias, com atributo-base, exigência de treinamento, penalidade de
carga e kit. **OPRPG p.41-49.**

Atributo-base conferido nos títulos de cada perícia (p.41-49), que é a fonte
autoritativa. A Tabela 2.1 (p.40) foi descartada como referência primária
porque a extração de texto do PDF embaralha as colunas dela.

| perícia | atrib. | só treinada | carga | kit |
|---|---|---|---|---|
| Acrobacia | AGI | — | sim | — |
| Adestramento | PRE | sim | — | — |
| Artes | PRE | sim | — | — |
| Atletismo | FOR | — | — | — |
| Atualidades | INT | — | — | — |
| Ciências | INT | sim | — | — |
| Crime | AGI | sim | sim | sim |
| Diplomacia | PRE | — | — | — |
| Enganação | PRE | — | — | sim |
| Fortitude | VIG | — | — | — |
| Furtividade | AGI | — | sim | — |
| Iniciativa | AGI | — | — | — |
| Intimidação | PRE | — | — | — |
| Intuição | PRE | — | — | — |
| Investigação | INT | — | — | — |
| Luta | FOR | — | — | — |
| Medicina | INT | — | — | sim |
| Ocultismo | INT | sim | — | — |
| Percepção | PRE | — | — | — |
| Pilotagem | AGI | sim | — | — |
| Pontaria | AGI | — | — | — |
| Profissão | INT | sim | — | — |
| Reflexos | AGI | — | — | — |
| Religião | PRE | sim | — | — |
| Sobrevivência | INT | — | — | — |
| Tática | INT | sim | — | — |
| Tecnologia | INT | sim | — | sim |
| Vontade | PRE | — | — | — |

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Bônus por grau: destreinado 0, treinado +5, veterano +10, expert +15 | OPRPG p.40 | calculado e mostrado com a composição | **A** |
| Perícias treinadas = origem (2) + classe + Intelecto | OPRPG p.39 | a criação conta o saldo e impede passar | **A** |
| Perícia repetida entre origem e classe: escolhe outra | OPRPG p.22 | a criação detecta e pede a substituta | **A** |
| Intelecto aumentado dá uma perícia treinada por ponto | OPRPG p.15 | a progressão abre a escolha; **não** escolhe sozinha | **A** |
| Veterano a partir de NEX 35%, expert a partir de NEX 70% | OPRPG p.26 | validado ao aplicar grau de treinamento | **A** |
| Perícia com carga aplica a penalidade de carga total | OPRPG p.40 | aplicado quando sobrecarregado | **A** |
| Sem o kit exigido, −5 no teste | OPRPG p.40 | informado na perícia; não há controle de posse de kit | **I** |

## Classes

**OPRPG p.24-35.** Valores iniciais valem em NEX 5%; a partir daí, cada 5% de
NEX soma o valor "por NEX".

| classe | PV inicial | PV/NEX | PE inicial | PE/NEX | SAN inicial | SAN/NEX |
|---|---|---|---|---|---|---|
| Combatente | 20 + Vigor | 4 + Vigor | 2 + Presença | 2 + Presença | 12 | 3 |
| Especialista | 16 + Vigor | 3 + Vigor | 3 + Presença | 3 + Presença | 16 | 4 |
| Ocultista | 12 + Vigor | 2 + Vigor | 4 + Presença | 4 + Presença | 20 | 5 |

| classe | perícias treinadas | proficiências |
|---|---|---|
| Combatente | Luta **ou** Pontaria, Fortitude **ou** Reflexos, mais 1 + Intelecto | armas simples, armas táticas, proteções leves |
| Especialista | 7 + Intelecto | armas simples, proteções leves |
| Ocultista | Ocultismo e Vontade, mais 3 + Intelecto | armas simples |

Fórmula implementada, para NEX em passos de 5%:

```
passos   = NEX / 5                      (NEX 5% → 1, NEX 99% → 20)
PV       = PVinicial + (passos − 1) × (PVporNex)
PE       = PEinicial + (passos − 1) × (PEporNex)
SAN      = SANinicial + (passos − 1) × (SANporNex)
```

> **Conferência.** Combatente NEX 5% com Vigor 1: PV 21. Em NEX 10%: 21 + 5 =
> 26. O livro não traz uma tabela de PV por NEX para conferir linha a linha;
> a fórmula acima é a leitura literal de "a cada novo nível de exposição
> 4 PV (+Vig)" com o bloco "20+VIGOR" como valor inicial (OPRPG p.25).

## NEX

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Começa em 5%; sobe 5% por missão concluída | OPRPG p.23 | campo em passos de 5%, de 5% a 99% | **A** |
| Limite de PE por turno = tabela 1.2 | OPRPG p.23 | calculado: NEX 5%→1 … 95%→19, 99%→20 | **A** |
| Sempre pode usar uma habilidade no custo mínimo, mesmo acima do limite | OPRPG p.23 | informado junto do limite | **I** |
| NEX 100% só por desconjuração | OPRPG p.23 | teto de 99% na ficha | **A** |
| Habilidades de classe do NEX alcançado | OPRPG p.23 | a progressão lista o que entra em cada NEX | **A** |

## Estatísticas derivadas

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Defesa = 10 + Agilidade + modificadores | OPRPG p.36 | calculado com composição visível | **A** |
| Deslocamento padrão 9m | OPRPG p.36 | calculado; −3m sobrecarregado | **A** |
| Carga = 5 espaços por ponto de Força; Força 0 → 2 espaços | OPRPG p.53 | calculado a partir do inventário | **A** |
| Sobrecarregado: −5 Defesa, −5 perícias de carga, −3m deslocamento | OPRPG p.53 | aplicado automaticamente | **A** |
| Teto absoluto = 2× o limite | OPRPG p.53 | avisado; não bloqueia a edição | **A** |
| Teste de ataque = bônus de Luta (corpo a corpo) ou Pontaria (à distância) | OPRPG p.36 | usado nas rolagens de ataque | **A** |
| Força soma no dano corpo a corpo e de arremesso | OPRPG p.15 | somado na rolagem de dano | **A** |

## Patente

**OPRPG p.51-52.** Tabela 3.1.

| PP | patente | crédito | cat. I | II | III | IV |
|---|---|---|---|---|---|---|
| 0 | Recruta | Baixo | 2 | — | — | — |
| 20 | Operador | Médio | 3 | 1 | — | — |
| 50 | Agente especial | Médio | 3 | 2 | 1 | — |
| 100 | Oficial de operações | Alto | 3 | 3 | 2 | 1 |
| 200 | Agente de elite | Ilimitado | 3 | 3 | 3 | 2 |

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Patente derivada dos pontos de prestígio | OPRPG p.51 | calculada a partir dos PP | **A** |
| Limite de itens por categoria | OPRPG p.52 | contado contra o inventário, com aviso ao passar | **A** |
| Rebaixamento ao perder PP | OPRPG p.51 | a patente recalcula para baixo também | **A** |
| Pontos de prestígio por missão (tabela 3.2) | OPRPG p.53 | informativo, sem automação de missão | **I** |

## Origens

**OPRPG p.16-21.** As 26 origens, cada uma com duas perícias treinadas e um
poder. Ver `js/ordem/catalogo.js`.

Poderes de origem com efeito **numérico e permanente**, ligados ao cálculo:

| origem | poder | efeito | est. |
|---|---|---|---|
| Desgarrado | Calejado | +1 PV por 5% de NEX | **A** |
| Vítima | Cicatrizes Psicológicas | +1 Sanidade por 5% de NEX | **A** |
| Lutador | Mão Pesada | +2 no dano corpo a corpo | **A** |
| Militar | Para Bellum | +2 no dano com armas de fogo | **A** |
| Policial | Patrulha | +2 em Defesa | **A** |
| Teórico da Conspiração | Eu Já Sabia | resistência a dano mental = Intelecto | **A** |
| Universitário | Dedicação | +1 PE, +1 PE a cada NEX ímpar; limite de PE por turno +1 | **A** |
| Magnata | Patrocinador da Ordem | limite de crédito um acima | **A** |
| Cultista Arrependido | Traços do Outro Lado | um poder paranormal; **metade** da Sanidade da classe | **A** |

As demais 17 origens têm poderes condicionais, por cena ou por missão, e estão
no catálogo como **I** — o texto aparece na ficha, mas o gasto de PE e a
condição de uso são decisão de quem joga.

## Rituais

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Círculos 1º a 4º | OPRPG p.117 | campo do ritual | **A** |
| Elementos: Conhecimento, Energia, Morte, Sangue, Medo | OPRPG p.118 | campo do ritual | **A** |
| Custo: 1º=1 PE, 2º=3 PE, 3º=6 PE, 4º=10 PE | OPRPG p.119 | calculado a partir do círculo | **A** |
| Limite de rituais aprendidos por Aprender Ritual = Intelecto | OPRPG p.119 | contado e avisado | **A** |
| Rituais de ocultista por habilidade de classe não contam no limite | OPRPG p.119 | contados à parte | **A** |
| Ocultista lança 1º círculo em NEX 5%, 2º em 25%, 3º em 55%, 4º em 85% | OPRPG p.33 | validado ao aprender ritual | **A** |
| Execução, alcance, alvo/área, duração, resistência | OPRPG p.119-121 | campos do ritual, com as opções do livro | **A** |
| Relação entre elementos (opressor dá −OO na resistência, mesmo elemento +OO) | OPRPG p.118 | **I** — depende da criatura alvo, que é decisão do mestre |
| DT de resistência a ritual | OPRPG p.78 | ver **Lacunas** | — |
| Conjuração com proteção leve/pesada é condição ruim/terrível | OPRPG p.119 | avisado quando há proteção equipada | **P** |

## Regras opcionais

Todas do **SAH**, capítulo 2, "Novas Regras Opcionais" (p.98-123). Começam
**desativadas**, como manda o próprio livro: "as regras opcionais são
exatamente isso — opcionais! Use-as apenas se quiser" (SAH p.99).

| regra | fonte | efeito na ficha | est. |
|---|---|---|---|
| NEX & Experiência (separar nível e NEX) | SAH p.98-103 | dois campos independentes; ver seção própria | **A** |
| Jogando sem Sanidade | SAH p.104 | remove Sanidade da ficha | **P** |
| Ferimentos Debilitantes | SAH p.105 | acrescenta o registro de ferimentos | **P** |
| Jogando sem Mapa | SAH p.106 | não afeta a ficha | **I** |
| Evolução por Patentes | SAH p.108-112 | progressão por patente em vez de NEX | **P** |
| Os Limites da Compreensão Humana | SAH p.113 | teto de perícias | **P** |
| Conjuração Complexa | SAH p.114-116 | acrescenta campos ao ritual | **P** |
| Conjurando Rituais Desconhecidos | SAH p.117 | não afeta a ficha | **I** |
| Desastres Paranormais | SAH p.117-118 | não afeta a ficha | **I** |
| Combate Narrativo | SAH p.119-123 | não afeta a ficha | **I** |

### NEX & Experiência, em detalhe

**SAH p.98-99.** É a regra que o pedido cita nominalmente.

Com ela ativada:

- **Nível de experiência** passa a representar a competência geral. Substitui o
  NEX em: Benefícios por NEX (OPRPG p.23), pré-requisitos de habilidades de
  classe **exceto poderes paranormais**, e efeitos de origens e habilidades
  baseados em NEX. **1 nível = 5% de NEX.**
- **NEX** passa a representar só a exposição ao Outro Lado. Continua valendo
  para afinidade elemental, efeitos de poderes paranormais e imunidade à
  Presença Perturbadora.
- Todo personagem começa em **nível 1** e sobe 1 nível onde subiria 5% de NEX.
- Todo personagem começa com **NEX 0%** e sobe por exposição:
  branda (sem efeito), moderada (+1%), profunda (+2%), total (+5%).
- Aprender um ritual aumenta o NEX em um valor igual ao círculo do ritual,
  **inclusive os rituais iniciais**.
- Teto de 99% de NEX só por exposição.
- **Transcender** deixa de ser poder de classe que afeta Sanidade; passa a ser
  recebido ao atingir um valor de NEX com alteração.

Exemplos que o próprio livro dá, e que viraram teste:

- Proteção Pesada exige NEX 30% → com a regra, exige **nível 6**.
- Calejado dá +1 PV por 5% de NEX → com a regra, **+1 PV por nível**.

## Sobrevivendo ao Horror — conteúdo de personagem

| conteúdo | fonte | est. |
|---|---|---|
| Novas origens | SAH p.7-13 | — |
| Novas opções para Combatente / Especialista / Ocultista | SAH p.14-29 | — |
| Nova classe: Sobrevivente | SAH p.30-32 | — |
| Poderes gerais | SAH p.33-36 | — |
| Equipamentos | SAH p.37-45 | — |
| Poderes paranormais | SAH p.46-47 | — |
| Novos rituais | SAH p.48-56 | — |
| Novos itens amaldiçoados | SAH p.57-61 | — |

---

## Lacunas

Registradas em vez de preenchidas por dedução.

1. **DT de resistência a rituais.** A fórmula está no capítulo de regras
   (OPRPG p.78, "Testes & Habilidades"), que não foi lido nesta entrega. O
   campo de DT do ritual existe na ficha e aceita o valor, mas não é
   calculado.

2. **Tabela de PV/PE/SAN por NEX.** O livro dá o valor inicial e o incremento
   por nível de exposição, mas não uma tabela fechada de NEX 5% a 99% para
   conferir. A fórmula implementada é a leitura literal do bloco de cada
   classe (OPRPG p.25, p.29, p.33). Se existir tabela em outra página, ela não
   foi localizada.

3. **Tabela 2.1 de perícias (OPRPG p.40).** A extração de texto embaralha as
   colunas. Os atributos-base foram tirados dos títulos das perícias
   (p.41-49), que conferem com a descrição dos atributos (p.14-15) — exceto
   Adestramento e Artes, que os títulos dão como PRE e a descrição do atributo
   Presença não menciona. Adotado o título.

4. **Conteúdo do Sobrevivendo ao Horror.** Identificado e paginado, mas não
   estruturado no catálogo nesta entrega.
