# Ordem Paranormal — matriz de regras

O que o R.A.M.A. implementa das regras de Ordem Paranormal, de onde cada
regra veio e como ela se comporta.

**Fontes.** `OPRPG` = *Ordem Paranormal RPG — Livro de Regras*, v1.1, Jambô,
2022. `SAH` = *Sobrevivendo ao Horror*, v1.2, Jambô, 2024. As páginas citadas
são as do livro, não as do PDF.

**Regra de ouro deste documento.** Nada aqui foi deduzido de memória nem
preenchido por analogia. O que não foi encontrado nos dois livros, ou o que o
livro deixa ambíguo, está na seção **Lacunas e interpretações**, no fim — com a
leitura que o R.A.M.A. adotou escrita por extenso.

---

## Estado de implementação

| símbolo | significado |
|---|---|
| **A** | automatizado: o R.A.M.A. calcula, valida ou aplica sozinho |
| **P** | parcial: parte do efeito entra na conta; o resto é anotação |
| **I** | informativo: o texto está no catálogo, sem efeito mecânico |
| **—** | não implementado nesta entrega |

---

## Onde cada coisa mora no código

| arquivo | o que guarda |
|---|---|
| `js/ordem/catalogo.js` | atributos, perícias, classes, progressão por classe, trilhas, origens, patentes, elementos |
| `js/ordem/poderes.js` | poderes de classe, poderes gerais, poderes paranormais, habilidades de trilha, habilidades automáticas e alterações por NEX |
| `js/ordem/progressao.js` | o motor de escolhas: vagas, requisitos, pendências, efeitos, afinidade |
| `js/ordem/inventario.js` | espaços, quantidade, categoria e grupo dos itens |
| `js/ordem/regras.js` | todas as contas, com a composição de cada número |
| `js/ordem/opcionais.js` | as regras opcionais, uma chave para cada |
| `js/paginas/ordem-escolhas.js` | as janelas de escolha, iguais na criação e na ficha |

O catálogo de poderes só é carregado nas páginas que calculam a ficha de Ordem
(a ficha e a lista de personagens, onde fica a criação). É um arquivo estático,
guardado em cache pelo navegador, e nunca vai junto na gravação da ficha: a
ficha guarda só a chave de cada escolha.

---

## Progressão: de pendência a escolha

### O modelo

Cada decisão que a progressão abre é uma **vaga** com id estável. O id diz de
onde a vaga veio, nunca o texto mostrado:

| id | vaga |
|---|---|
| `d3.poderClasse` | poder de classe do 3º degrau (NEX 15%, ou nível 3) |
| `d10.atributo` | aumento de atributo do 10º degrau |
| `d10.versatilidade` | versatilidade do 10º degrau |
| `d7.grauTreinamento` | grau de treinamento do 7º degrau |
| `d1.perito` | as duas perícias de Perito (especialista) |
| `d2.trilha` | a escolha da trilha |
| `b.aFavorita` | a opção interna de uma habilidade automática |
| `b.origem.engenheiro` | a opção interna de um poder de origem |
| `x25.transcender` | NEX de exposição 25%, com NEX & Experiência |
| `x25.alteracao` | a alteração de NEX 25%, com NEX & Experiência |
| `afinidade` | a afinidade elemental |

"Degrau" é o passo de progressão: NEX 5% é o 1º, NEX 99% é o 20º. Com NEX &
Experiência, o degrau é o nível. Por isso o id não fala em NEX: ligar ou
desligar a regra não renomeia nenhuma escolha.

A decisão tomada é um **registro** em `ordem.escolhas` (ver
[CHARACTER_SCHEMA.md](CHARACTER_SCHEMA.md)). Resolver uma vaga nunca quita
outra parecida de outro degrau, porque cada registro aponta para uma vaga só.

### Três tipos de benefício

| tipo | exemplo | vira pendência? |
|---|---|---|
| automático | Ataque Especial; os poderes da trilha escolhida em NEX 40%, 65% e 99% | nunca |
| escolhido | poder de classe, aumento de atributo, grau de treinamento, versatilidade | até ser escolhido |
| com opções internas | A Favorita (a arma), Resistir a Elemento (o elemento) | até a opção ser preenchida |

As habilidades de trilha **não** são vagas de escolha: "Você recebe um novo
poder da trilha escolhida em NEX 40%, 65% e 99%" (OPRPG p.24, 28, 33). Até a
v2.3 elas apareciam como pendência permanente; agora chegam sozinhas.

### Efeitos são calculados, nunca gravados

O aumento de atributo não soma 1 no atributo gravado; o Grau de Treinamento não
troca "treinado" por "veterano" na perícia gravada. `ordem.atributos` e
`ordem.pericias` guardam o que foi escolhido na criação (e o que a mesa ajustou à
mão). O que as escolhas de progressão fazem é recalculado a cada leitura, na
ordem dos degraus. Consequências:

- recarregar ou recalcular **nunca** concede de novo o mesmo benefício;
- trocar uma escolha tira **só** o que ela dava, e os ajustes da mesa ficam;
- a ficha mostra os dois valores: o da ficha e o efetivo, com a conta aberta.

### Requisitos são conferidos na etapa

Um poder escolhido em NEX 15% é conferido contra o personagem de NEX 15%:
atributos, graus e poderes que ele tinha **ali**. Uma escolha que deixa de
cumprir requisito — porque uma anterior foi trocada, ou a mesa mexeu num
atributo — **não é apagada**: fica marcada, com o motivo, e os efeitos dela
ficam suspensos. A mesa pode mantê-la mesmo assim ("Manter mesmo assim"); os
problemas continuam listados.

Baixar o NEX também não apaga nada: as escolhas das etapas acima ficam
guardadas, sem efeito, e voltam a valer se o personagem chegar lá de novo.

### O que cada vaga aceita

| vaga | regra | fonte | est. |
|---|---|---|---|
| Trilha | uma trilha da classe; Médico de Campo exige Medicina | OPRPG p.24, 28, 31, 33 | **A** |
| Poder de classe | poder da classe ou, pelo SAH, poder geral | OPRPG p.24, 29, 33; SAH p.33 | **A** |
| Aumento de atributo | +1, sem passar de 5 por esta via | OPRPG p.26 | **A** |
| Ponto de Intelecto | cada ponto de Intelecto aumentado treina uma perícia | OPRPG p.15 | **A** |
| Grau de treinamento | 2 + Int (combatente), 5 + Int (especialista), 3 + Int (ocultista) perícias treinadas sobem um grau; veterano a partir de NEX 35%, expert a partir de 70% | OPRPG p.26, 30, 34 | **A** |
| Versatilidade | um poder de classe ou o primeiro poder de outra trilha da classe | OPRPG p.26, 30, 34 | **A** |
| Perito | duas perícias treinadas, exceto Luta e Pontaria | OPRPG p.28 | **A** |
| Transcender | um poder paranormal; não ganha a Sanidade daquele aumento de NEX | OPRPG p.26, 114 | **A** |
| Treinamento em Perícia | duas perícias: treina, ou sobe para veterano a partir de NEX 35% e expert a partir de 70% | OPRPG p.26 | **A** |
| Traços do Outro Lado (Cultista Arrependido) | um poder paranormal | OPRPG p.18 | **A** |
| Ferramentas Favoritas (Engenheiro) | um item, exceto armas, conta uma categoria abaixo | OPRPG p.18 | **A** |
| Perícias do Amnésico | duas perícias, escolhidas na criação | OPRPG p.16 | **A** |

### Repetição

"A menos que o texto indique o contrário, só pode escolher cada poder uma vez"
(OPRPG p.114). O motor recusa a repetição e diz por quê. São repetíveis
Transcender, Treinamento em Perícia e Aprender Ritual; Foco em Perícia repete
só para perícias diferentes.

Com afinidade, um poder paranormal **do elemento da afinidade** pode ser
escolhido uma segunda vez. A segunda escolha dá **só** o que a linha "Afinidade"
acrescenta: Espreitar da Besta passa de +5 para +10 em Furtividade, não para
+15.

---

## Poderes e habilidades — cobertura

Todas as entradas trazem nome, resumo próprio, requisitos estruturados, livro e
página, e a marca honesta de automação.

| grupo | total | livro básico | SAH | **A** | **P** | **I** |
|---|---|---|---|---|---|---|
| Poderes de classe | 76 | 45 | 31 | 8 | 5 | 63 |
| Poderes gerais | 34 | — | 34 | 7 | 22 | 5 |
| Poderes paranormais | 30 | 22 | 8 | 6 | 2 | 22 |
| Habilidades de trilha (24 trilhas) | 96 | 60 | 36 | 5 | 17 | 74 |
| Habilidades automáticas de classe | 5 | 5 | — | — | — | 5 |
| Alterações por NEX (NEX & Experiência) | 2 | — | 2 | 2 | — | — |

**Por que tantos "I".** A maior parte dos poderes do jogo depende de gastar PE
numa cena, de uma rolagem específica ou de decisão do mestre (Golpe Pesado,
Ataque Furtivo, Surto Temporal). Marcar isso como automatizado seria mentir
sobre o que a ficha faz. Esses poderes aparecem na ficha, com o texto, e quem
joga aplica na hora.

### Efeitos que entram na conta

| efeito | exemplos |
|---|---|
| PV por degrau | Casca Grossa, Vitalidade Reforçada; Sangue de Ferro (por NEX de exposição) |
| PE por degrau, fixo ou por atributo | Potencial Aprimorado, Vontade Inabalável, Personalidade Esotérica, A Força do Saber |
| Sanidade perdida | Transcender como poder de classe |
| Defesa | Reflexos Defensivos, Precognição |
| Bônus em perícia | Sensitivo, Visão do Oculto, Iniciativa Aprimorada, Gatuno, O Sorriso, Espreitar da Besta |
| Treinamento ou +2 | os poderes gerais "treinado em X, ou +2 se já for"; Carteirada, Rastrear o Paranormal |
| Grau de perícia | Grau de Treinamento, Treinamento em Perícia, Poder da Fé (veterano em Religião) |
| Atributo | A Força do Saber (+1 Int), Ser Assustador (−1 Pre), Ser Aterrorizante (por elemento) |
| Atributo-base de perícia | A Força do Saber, Racionalidade Inflexível |
| Deslocamento | Atlético, Correria Desesperada |
| Capacidade de carga | Inventário Otimizado, Inventário Organizado, Mochileiro, Mascate |
| Categoria e espaço de item | A Favorita, Mochila de Utilidades, Remendão, Ferramentas Paranormais, Ferramentas Favoritas |
| Resistências | Resistir a Elemento, Inabalável, Eu Já Sabia; testes: Reflexos Defensivos, Precognição, Mente Sã |
| Proficiências | Armamento Pesado, Proteção Pesada, Balística Avançada, Ninja Urbano, Mira de Elite |
| Poder aninhado | Transcender, Expansão de Conhecimento, Especialista Diletante, Flashback, Ele Me Ensina |

Exemplos dos livros conferidos em teste: Potencial Aprimorado em NEX 30% dá 6 PE
e em NEX 35% dá 7 (OPRPG p.115); Sangue de Ferro em NEX 50% dá 20 PV (OPRPG
p.116); Técnico com Força 1 e Intelecto 3 carrega 20 espaços (OPRPG p.31); Morte 2
exige dois poderes de Morte antes (OPRPG p.114).

---

## Afinidade

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Em NEX 50% o personagem se conecta a um elemento: Conhecimento, Energia, Morte ou Sangue | OPRPG p.110, 114 | a escolha abre sozinha uma vez ao abrir a ficha; fica pendente na Progressão | **A** |
| Com nível e NEX separados, o gatilho é o NEX de exposição | SAH p.98 | o gatilho olha `ordem.nex`, nunca o nível | **A** |
| A conexão não tem efeito imediato; a afinidade se desenvolve na primeira vez que transcender depois | OPRPG p.110, 114 | a ficha separa "conexão" de "afinidade desenvolvida" | **A** |
| Com afinidade, poder paranormal do elemento pode ser escolhido de novo | OPRPG p.114 | aplicado com a linha Afinidade | **A** |
| Rituais sem componentes, +2 dados contra o próprio elemento e −2 contra o opressor | OPRPG p.114 | mostrado na escolha e na ficha | **I** |
| A trilha Monstruoso prende a afinidade ao elemento de Ser Amaldiçoado | SAH p.17 | aviso na ficha; nada é trocado sozinho | **A** |

**Requisitos do projeto que o livro não tem, e como convivem com ele:**

- **"Decidir depois".** O livro diz que a conexão é automática. O R.A.M.A.
  permite adiar: a decisão fica guardada como `adiada`, a janela não reabre, e a
  pendência continua na Progressão. Enquanto não houver elemento, nenhum efeito
  de afinidade é aplicado.
- **"Outro" (Homebrew).** Não existe no livro. Exige nome; nenhum efeito de outro
  elemento é atribuído a ele, e nenhum poder do catálogo repete por ele.
- **Revisar a afinidade.** O livro diz que "uma vez feita, esta escolha não pode
  ser alterada" (OPRPG p.110). O R.A.M.A. permite revisar no modo edição, como
  decisão da mesa, com o aviso do livro na tela e a lista do que deixa de valer.
  As segundas escolhas de poderes do elemento antigo ficam marcadas, não apagadas.

---

## Patente

**OPRPG p.51-53.** Tabela 3.1.

| PP | patente | crédito | cat. I | II | III | IV |
|---|---|---|---|---|---|---|
| 0 | Recruta | Baixo | 2 | — | — | — |
| 20 | Operador | Médio | 3 | 1 | — | — |
| 50 | Agente especial | Médio | 3 | 2 | 1 | — |
| 100 | Oficial de operações | Alto | 3 | 3 | 2 | 1 |
| 200 | Agente de elite | Ilimitado | 3 | 3 | 3 | 2 |

### A chave "Aplicar regras de patente"

Fica na aba Regras, em "Configuração da ficha". **Ligada é o padrão**, e é o
comportamento de toda ficha gravada antes desta chave existir.

| com a chave ligada | com a chave desligada |
|---|---|
| a patente sai dos pontos de prestígio | a patente não é calculada; os PP ficam guardados |
| o limite de crédito é calculado, com Patrocinador da Ordem | o limite de crédito não é calculado |
| os limites por categoria são os da Tabela 3.1 | os limites por categoria são os definidos pela mesa, no modo edição |

Desligar pela primeira vez começa os limites manuais iguais aos da patente
atual, para nada mudar de uma hora para a outra. Os limites manuais ficam
guardados à parte: religar a patente não os apaga, e desligar de novo os traz de
volta. Alternar a chave nunca apaga item.

**Sem limite não é zero.** No formato guardado, `null` é "sem limite" e `0` é
"nenhum item permitido". Na Tabela 3.1, "—" é zero. Categoria 0 é sempre sem
limite quando a patente é aplicada: "Você pode escolher quantos itens quiser de
categoria 0" (OPRPG p.53).

### Contagem

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Patente derivada dos PP, e rebaixamento ao perder | OPRPG p.51 | calculado | **A** |
| Limite de itens por categoria | OPRPG p.53 | contado contra o inventário, com aviso por categoria | **A** |
| Cada unidade conta como um item | OPRPG p.53 | três granadas de categoria I são três itens de categoria I | **A** |
| Categoria reduzida por habilidade | OPRPG p.18, 26, 29, 31, 33 | a categoria efetiva é a que conta | **A** |
| Item sem categoria informada | — | não conta em nenhum limite e aparece listado para classificar | **A** |
| Pontos de prestígio por missão (Tabela 3.2) | OPRPG p.53 | sem automação de missão | **I** |

---

## Carga e capacidade

**OPRPG p.53.** Espaço de inventário **não é peso**: a ficha de Ordem nunca olha
para o campo de peso da ficha universal, e nenhum dos dois é convertido no outro.

| regra | fonte | comportamento | est. |
|---|---|---|---|
| 5 espaços por ponto de Força; Força 0 carrega 2 | OPRPG p.53 | calculado com composição | **A** |
| Um item ocupa 1 espaço por padrão | OPRPG p.53 | item sem espaço informado usa 1, marcado como "padrão" | **A** |
| Espaços × quantidade | OPRPG p.53 | cada item guarda espaços por unidade e quantidade | **A** |
| A mochila não ocupa espaço | OPRPG p.53 | item do tipo mochila vale 0 por padrão | **A** |
| Mochila Militar: +2 de capacidade | OPRPG p.66 | campo "aumenta a capacidade" do item, contado uma vez por item | **A** |
| Sobrecarregado: −5 Defesa, −5 perícias de carga, −3m | OPRPG p.53 | aplicado com a capacidade final | **A** |
| Máximo absoluto = dobro da capacidade | OPRPG p.53 | avisado | **A** |
| Inventário Otimizado: Força + Intelecto | OPRPG p.31 | calculado | **A** |
| Inventário Organizado: +Intelecto; meio espaço vira um quarto | SAH p.34 | calculado | **A** |
| Mochila de Utilidades: um item ocupa 1 espaço a menos | OPRPG p.29 | uma unidade do item escolhido, nunca abaixo de 0 | **A** |
| Mochileiro, Mascate: +5 | SAH p.14, 25 | calculado | **A** |
| Carregar uma pessoa: 10 espaços | OPRPG p.53 | lançado como item pela mesa | **I** |

### Ajuste temporário de capacidade

Um número com sinal, no modo edição, no painel "Carga e capacidade" da aba
Inventário:

```
capacidade calculada + ajuste temporário = capacidade final
```

- `+5` aumenta, `-2` reduz, `0` mantém a calculada;
- muda só a capacidade: não mexe na carga dos itens, na Força nem nos limites por
  categoria;
- fica até alguém mudá-lo ou tirá-lo — nenhuma duração é inventada;
- vai de −99 a +99; fora disso a tela recusa e explica, sem apagar o digitado;
- se levaria a capacidade abaixo de zero, a final fica em 0 e a tela diz isso por
  extenso.

A mesma conta alimenta o bloco superior, o painel de carga do inventário e as
penalidades de sobrecarga.

---

## Atributos

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Cinco atributos: Agilidade, Força, Intelecto, Presença, Vigor | OPRPG p.14 | campos fixos da ficha de Ordem | **A** |
| Todos começam em 1; 4 pontos para distribuir | OPRPG p.14 | a criação guiada distribui e confere o saldo | **A** |
| Pode reduzir **um** atributo a 0 para ganhar +1 ponto | OPRPG p.14 | permitido uma vez; a criação avisa se for usado de novo | **A** |
| Máximo inicial 3 | OPRPG p.14 | a criação recusa 4+ na distribuição inicial | **A** |
| Teste rola Nd20 e pega o maior; atributo 0 rola 2d20 e pega o menor | OPRPG p.14, p.40 | o motor de dados já fazia isso (`NdX` e `-NdX`) | **A** |
| Aumento de atributo em NEX 20%, 50%, 80% e 95%, teto 5 | OPRPG p.26 | vaga de escolha; o teto é conferido | **A** |
| Vigor aumentado sobe os PV **retroativamente** | OPRPG p.15 | o PV é recalculado do zero a cada mudança | **A** |

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
| Grau da ficha e grau efetivo | — | o seletor do modo edição muda o grau da ficha; o efetivo soma as escolhas de progressão e aparece ao lado | **A** |
| Perícia com carga aplica a penalidade de carga total | OPRPG p.40 | aplicado quando sobrecarregado | **A** |
| Bônus em testes de resistência | OPRPG p.25, 114 | mostrado à parte, não somado ao bônus geral de Fortitude, Reflexos e Vontade | **P** |
| Sem o kit exigido, −5 no teste | OPRPG p.40 | informado na perícia; não há controle de posse de kit | **I** |

A rolagem de perícia usa o motor central (`dependente`) e o mostrador de sempre,
que também sobe para o histórico da campanha. As parcelas do bônus aparecem
abertas no resultado.

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

```
passos   = NEX / 5                      (NEX 5% → 1, NEX 99% → 20)
PV       = PVinicial + (passos − 1) × (PVporNex)
PE       = PEinicial + (passos − 1) × (PEporNex)
SAN      = SANinicial + (passos − 1) × (SANporNex)
```

## NEX

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Começa em 5%; sobe 5% por missão concluída | OPRPG p.23 | campo em passos de 5%, de 5% a 99% | **A** |
| Limite de PE por turno = tabela 1.2 | OPRPG p.23 | calculado: NEX 5%→1 … 95%→19, 99%→20 | **A** |
| Sempre pode usar uma habilidade no custo mínimo, mesmo acima do limite | OPRPG p.23 | informado junto do limite | **I** |
| NEX 100% só por desconjuração | OPRPG p.23 | teto de 99% na ficha | **A** |

## Estatísticas derivadas

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Defesa = 10 + Agilidade + modificadores | OPRPG p.36 | calculado com composição visível | **A** |
| Deslocamento padrão 9m | OPRPG p.36 | calculado; −3m sobrecarregado | **A** |
| Força soma no dano corpo a corpo e de arremesso | OPRPG p.15 | somado na rolagem de dano da ficha universal | **I** |

## Origens

**OPRPG p.16-21.** As 26 origens, cada uma com duas perícias treinadas e um
poder.

| origem | poder | efeito | est. |
|---|---|---|---|
| Desgarrado | Calejado | +1 PV por 5% de NEX | **A** |
| Vítima | Cicatrizes Psicológicas | +1 Sanidade por 5% de NEX | **A** |
| Policial | Patrulha | +2 em Defesa | **A** |
| Teórico da Conspiração | Eu Já Sabia | resistência a dano mental = Intelecto | **A** |
| Universitário | Dedicação | +1 PE, +1 PE a cada NEX ímpar; limite de PE por turno +1 | **A** |
| Magnata | Patrocinador da Ordem | limite de crédito um acima (com a patente aplicada) | **A** |
| Cultista Arrependido | Traços do Outro Lado | um poder paranormal (vaga de escolha); **metade** da Sanidade | **A** |
| Engenheiro | Ferramentas Favoritas | um item, exceto armas, uma categoria abaixo (vaga de escolha) | **A** |
| Lutador | Mão Pesada | +2 no dano corpo a corpo | **I** |
| Militar | Para Bellum | +2 no dano com armas de fogo | **I** |
| Amnésico | Vislumbres do Passado | as duas perícias são escolhidas na criação | **P** |

As demais origens têm poderes condicionais, por cena ou por missão, e estão no
catálogo como **I**.

## Rituais

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Círculos 1º a 4º, elementos, execução, alcance, alvo, duração | OPRPG p.117-121 | campos do ritual | **A** |
| Custo: 1º=1 PE, 2º=3 PE, 3º=6 PE, 4º=10 PE | OPRPG p.119 | tabela do catálogo | **A** |
| Ocultista lança 1º círculo em NEX 5%, 2º em 25%, 3º em 55%, 4º em 85% | OPRPG p.33 | mostrado na ficha | **A** |
| Limite de rituais aprendidos por Aprender Ritual = Intelecto | OPRPG p.119 | mostrado na ficha | **I** |
| Um ritual aprendido a cada NEX (ocultista) | OPRPG p.32 | não vira vaga de escolha; ver Lacunas | — |
| DT de resistência a ritual | OPRPG p.78 | ver **Lacunas** | — |

## Regras opcionais

Todas do **SAH**, capítulo 2, "Novas Regras Opcionais" (p.98-123). Começam
**desativadas**, como manda o próprio livro.

| regra | fonte | efeito na ficha | est. |
|---|---|---|---|
| NEX & Experiência (separar nível e NEX) | SAH p.98-103 | ver seção própria | **A** |
| Jogando sem Sanidade | SAH p.104 | esconde Sanidade da ficha | **P** |
| Ferimentos Debilitantes | SAH p.105 | registro de ferimentos | **P** |
| Jogando sem Mapa | SAH p.106 | não afeta a ficha | **I** |
| Evolução por Patentes | SAH p.108-112 | progressão por patente em vez de NEX | **P** |
| Os Limites da Compreensão Humana | SAH p.113 | teto de perícias | **P** |
| Conjuração Complexa | SAH p.114-116 | campos a mais no ritual | **P** |
| Conjurando Rituais Desconhecidos | SAH p.117 | não afeta a ficha | **I** |
| Desastres Paranormais | SAH p.117-118 | não afeta a ficha | **I** |
| Combate Narrativo | SAH p.119-123 | não afeta a ficha | **I** |

A chave "Aplicar regras de patente" **não** é uma destas regras: é configuração
da ficha, e começa ligada.

### NEX & Experiência, em detalhe

**SAH p.98-103.**

- **Nível de experiência** manda em Benefícios por NEX, pré-requisitos de
  habilidades de classe (exceto poderes paranormais) e efeitos de origens e
  habilidades baseados em NEX. **1 nível = 5% de NEX.** As vagas de classe
  (`d3.poderClasse` e companhia) seguem o nível.
- **NEX** mede só a exposição. Continua valendo para afinidade elemental,
  efeitos de poderes paranormais ("+1 PE por NEX" de Potencial Aprimorado olha o
  NEX) e imunidade à Presença Perturbadora.
- **Transcender** deixa de ser poder de classe e não afeta a Sanidade. Com a
  regra ligada, Transcender some da lista de poderes de classe (com o motivo), e
  a exposição abre uma oportunidade opcional em cada valor de NEX com alteração:
  25%, 35%, 50%, 60%, 75% e 90% (`x25.transcender`). Dá para recusar.
- **Alterações gerais.** NEX 25%: Ocultismo sem treino, +2 se treinado, e −5 numa
  perícia entre Diplomacia, Enganação e Intimidação. NEX 35%: um atributo
  (exceto Presença) somado aos PE e −5 numa perícia entre Atletismo, Fortitude e
  Reflexos. As duas viram vagas com escolha e entram na conta.
- **Alterações por elemento** (NEX 60%, 75% e 90%) são descritivas, com
  penalidades em dados, rituais e efeitos de cena: **—**, não automatizadas.
- Ligar a regra numa ficha com Transcender já escolhido como poder de classe
  marca essa escolha como problema — sem apagar. Desligar faz ela voltar a valer.

Exemplos do livro que viraram teste: Proteção Pesada exige NEX 30% → nível 6;
Calejado dá +1 PV por nível.

## Sobrevivendo ao Horror — conteúdo de personagem

| conteúdo | fonte | est. |
|---|---|---|
| Novos poderes de Combatente, Especialista e Ocultista (31) | SAH p.14-27 | **A** no catálogo e nas escolhas; efeitos conforme a tabela de cobertura |
| Novas trilhas (9) | SAH p.15-29 | **A** no catálogo e nas escolhas |
| Poderes gerais (34) | SAH p.33-36 | **A** no catálogo e nas escolhas |
| Poderes paranormais (8) | SAH p.46-47 | **A** no catálogo e nas escolhas |
| Novas origens | SAH p.7-13 | — |
| Nova classe: Sobrevivente | SAH p.30-32 | — |
| Equipamentos, rituais e itens amaldiçoados | SAH p.37-61 | — |

---

## Lacunas e interpretações

Registradas em vez de preenchidas por dedução. Onde o livro deixa uma leitura
aberta, a adotada está escrita — e é a que os testes travam.

1. **DT de resistência a rituais.** A fórmula está no capítulo de regras (OPRPG
   p.78), que não foi estruturado. O campo de DT do ritual aceita o valor, mas não
   é calculado.

2. **Tabela de PV/PE/SAN por NEX.** O livro dá o valor inicial e o incremento por
   nível de exposição, mas não uma tabela fechada para conferir linha a linha.

3. **Tabela 2.1 de perícias (OPRPG p.40).** A extração de texto embaralha as
   colunas; os atributos-base foram tirados dos títulos das perícias.

4. **Resistir a <Elemento>.** O nome com o elemento entre sinais sugere um poder
   por elemento, mas o texto não diz se ele pode ser escolhido para elementos
   diferentes. O R.A.M.A. trata cada elemento como escolha distinta (Resistir a
   Morte e Resistir a Sangue podem coexistir) e só permite repetir o **mesmo**
   elemento pela afinidade, para chegar a 20.

5. **Segunda escolha no mesmo transcender que desenvolve a afinidade.** "Na
   primeira vez que transcender após isso, irá desenvolver afinidade" (OPRPG
   p.114) não diz se o poder recebido nesse mesmo transcender já pode ser a
   segunda escolha. O R.A.M.A. permite — proibir seria inventar requisito.

6. **Ordem das escolhas com nível e NEX separados.** Com a regra, as vagas de
   nível e as de exposição não têm uma ordem cronológica gravada. O motor as
   intercala pelo degrau equivalente (1 nível = 5% de NEX) para conferir requisitos
   como "Morte 2".

7. **Transcender e Cultista Arrependido.** Com "metade da Sanidade normal para
   sua classe", a Sanidade não ganha por Transcender é descontada antes de dividir
   ao meio.

8. **Ele Me Ensina (Possuído, SAH p.28).** "Escolha entre transcender ou..." é
   tratado como receber um poder paranormal, **sem** o custo em Sanidade do poder de
   classe Transcender, que o texto não repete.

9. **Mochila de Utilidades com quantidade.** "Um item [...] ocupa 1 espaço a menos":
   aplicado a uma unidade do item escolhido, não a cada unidade.

10. **Mochila Militar com quantidade.** O aumento de capacidade conta uma vez por
    item, não por unidade.

11. **Profissão com especialidade.** Parapsicólogo exige Profissão (psicólogo) e
    Mascate treina Profissão (armeiro, engenheiro ou químico). O R.A.M.A. tem uma
    perícia Profissão só: o requisito confere o treinamento em Profissão, e a
    especialidade fica com a mesa.

12. **Rituais aprendidos por NEX (ocultista, Saber Ampliado, Grimório).** Não há
    catálogo de rituais nesta entrega. Esses rituais continuam sendo registrados à
    mão na aba de rituais, e não viram vagas de escolha.

13. **Monstruoso usa a Progressão de NEX mesmo sem a regra** (SAH p.17). A trilha
    está no catálogo com os efeitos permanentes de atributo; as alterações da
    Progressão de NEX para essa trilha sem a regra ligada não são aplicadas.

14. **Possuído: Poder Não Desejado** troca cada poder de ocultista por Transcender.
    A troca é conduzida por quem joga; a vaga de poder de classe não é bloqueada.
