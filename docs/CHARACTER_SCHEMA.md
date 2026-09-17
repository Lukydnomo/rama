# O formato da ficha

O que vai dentro de `fichaJson`. Definido em `js/ficha.js`, que também é quem
cria a ficha padrão e normaliza o que chega de fora.

## As duas ideias

**Nada é campo fixo além do que precisa ser.** Força e PV são *padrões
iniciais*, não estrutura da tabela. Quem quiser CORRUPÇÃO, SANGUE ou uma perícia
nova acrescenta — por isso tudo é lista de objetos com `id`, e não coluna.

**Todo registro carrega um id permanente.** Nome muda, ordem muda, atributo
vinculado muda; o id não. É o que permite renomear "Vigor" sem quebrar as
perícias que apontam para ele.

## As três naturezas

Fazem parte do **dado**, não só da tela:

| Natureza      | O que é                                                        |
|---------------|----------------------------------------------------------------|
| `informacao`  | texto que se lê: nome, classe, origem                          |
| `rolavel`     | tem **valor** e tem **dado**, que são coisas diferentes         |
| `dependente`  | rola através de outro: a perícia usa o dado do atributo         |

> **Valor e dado não são a mesma informação.** Vigor 2 **não** quer dizer 2d20.
> Pode existir um Vigor de valor 2 que rola 3d20. São dois campos, e um não
> deriva do outro.

---

## A ficha

```jsonc
{
  "schemaVersion": 5,
  "tipoFicha": "universal",

  "nome": "Michael",
  "campanhaId": null,          // campanha em que o dono é mestre ou jogador, ou null; só o dono troca
  "classe": "",
  "origem": "",

  "criadoEm": "2026-03-14T18:20:00.000Z",
  "atualizadoEm": "2026-09-03T16:30:00.000Z",

  "atributos": [ /* ... */ ],
  "status": [ /* ... */ ],
  "defesa": { "dt": 0, "esquiva": 0, "bloqueio": 0, "resistencia": 0 },
  "pericias": [ /* ... */ ],
  "habilidades": { "filhos": [] },
  "rituais": { "rotuloSecao": "Rituais", "rotulos": { }, "itens": [] },

  "inventario": { "limite": 0, "itens": [] },
  "anotacoes": { "pastas": [], "soltas": [] },
  "camposCustomizados": []
}
```

`id` e `ownerId` **não** ficam aqui: vivem nas colunas da planilha, onde o
servidor os controla.

---

## Atributos

```jsonc
{
  "id": "uuid",
  "natureza": "rolavel",
  "nome": "Agilidade",
  "sigla": "AGI",
  "valor": 3,
  "dado": "2d20"
}
```

Padrão inicial: Força (FOR), Agilidade (AGI), Presença (PRE), Intelecto (INT),
Vigor (VIG) — todos com valor `0` e dado `1d20`.

Clicar num atributo no modo normal rola o **dado**, não o valor.

---

## Status

```jsonc
{ "id": "uuid", "nome": "PV", "atual": 12, "maximo": 20 }
```

Padrão inicial: PV, PE e Sanidade, zerados. Nada é calculado automaticamente —
nem PV por classe, nem PE, nem Sanidade. São valores configuráveis.

- **modo normal:** só `atual` muda;
- **modo edição:** tudo, e status podem nascer e morrer.

---

## Defesa

```jsonc
{ "dt": 0, "esquiva": 0, "bloqueio": 0, "resistencia": 0 }
```

Valores configuráveis, sem fórmula. As armaduras do inventário somam um número
que a ficha **mostra ao lado**, mas não aplica sozinha: cada mesa conta a
armadura de um jeito, e um número calculado que não bate com a mesa é pior do
que um digitado à mão.

---

## Perícias

```jsonc
{
  "id": "uuid",
  "natureza": "dependente",
  "nome": "Acrobacia",
  "atributoId": "uuid-da-agilidade",
  "atributosPermitidos": ["uuid-int", "uuid-pre"],   // só quando há escolha
  "bonus": 2,
  "bonusTemporario": 0,
  "dadosExtras": [
    { "id": "uuid", "operacao": "+", "dado": "1d6" }
  ]
}
```

As 28 perícias padrão, com o atributo de cada uma:

| | | | |
|---|---|---|---|
| Acrobacia (AGI) | Adestramento\* (PRE) | Artes\* (PRE) | Atletismo (FOR) |
| Atualidades (INT) | Ciências\* (INT) | Crime\* (AGI) | Diplomacia (PRE) |
| Enganação (PRE) | Fortitude (VIG) | Furtividade (AGI) | Iniciativa (AGI) |
| Intimidação (PRE) | Intuição (INT) | Investigação (INT) | Luta (FOR) |
| Medicina (INT) | Ocultismo\* (INT) | Percepção (PRE) | Pilotagem\* (AGI) |
| Pontaria (AGI) | Profissão\* (INT) | Reflexos (AGI) | Religião\* (INT) |
| Sobrevivência (INT **ou** PRE) | Tática\* (INT) | Tecnologia\* (INT) | Vontade (PRE) |

**O asterisco faz parte do nome** e fica onde está: ele marca a perícia que se
especializa, e apagar o símbolo apagaria a informação.

**Sobrevivência** é a única com dois atributos possíveis. Ela carrega
`atributosPermitidos`, e cada ficha escolhe o seu no modo edição.

`dadosExtras` guarda operação e expressão **separadas**, e não achatadas num
texto tipo `"+1d6-1d4"`. Achatado, seria preciso reinterpretar a string toda vez
que alguém quisesse tirar só um deles.

---

## Inventário

```jsonc
{
  "limite": 12,
  "itens": [ /* ... */ ]
}
```

O **peso atual não é armazenado** — é calculado:

```
peso = soma dos pesos dos itens − soma das reduções das mochilas   (mínimo 0)
```

Um peso digitado à mão para de bater com o inventário na primeira troca de item,
e aí ninguém sabe qual dos dois está certo. O `limite` é configurável.

Todo item aceita a mesma `etiqueta` opcional das habilidades (ver
[Etiqueta colorida](#etiqueta-colorida)): `{ "texto": "Sangue", "cor": "#A33B3B" }`.
Duplicar um item copia a etiqueta junto, com id novo.

### Os quatro tipos

Cada um tem os seus campos, e só os seus:

```jsonc
// item
{ "id", "tipo": "item", "nome", "peso", "descricao", "origemHomebrewId" }

// arma
{ "id", "tipo": "arma", "nome", "peso", "descricao", "origemHomebrewId",
  "periciaId": "uuid-da-luta",
  "dano": "2d10",
  "danoExtra": "4",          // número ou expressão de dado
  "critico": 18,             // face a partir da qual é crítico; 0 desliga
  "multiplicador": 2 }

// armadura
{ "id", "tipo": "armadura", "nome", "peso", "descricao", "defesa": 3 }

// mochila
{ "id", "tipo": "mochila", "nome", "descricao", "reducaoPeso": 3 }
```

A mochila **não tem peso**: ela é o que tira peso.

`origemHomebrewId` é **rastro, não vínculo**. O item na ficha é uma cópia; editar
o modelo na biblioteca não muda as fichas que já o usam.

---

## Anotações

```jsonc
{
  "pastas": [
    { "id": "uuid", "nome": "Investigação",
      "notas": [ { "id": "uuid", "titulo": "...", "conteudo": "...",
                   "criadoEm": "...", "atualizadoEm": "..." } ] }
  ],
  "soltas": [ /* notas sem pasta */ ]
}
```

Esta é a **única seção editável no modo normal**: anotar acontece durante a
sessão, não antes dela. Obrigar a destravar a estrutura inteira da ficha para
escrever uma frase seria pedir que a pessoa esquecesse de travar de volta.

---

## Campos personalizados

```jsonc
// informação
{ "id": "uuid", "natureza": "informacao", "nome": "Contato", "valor": "Gina" }

// rolável — tem valor E dado próprios
{ "id": "uuid", "natureza": "rolavel", "nome": "Carga", "valor": 2, "dado": "1d6" }
```

---

## O motor de dados

Vive em `js/dados.js` — o **único lugar do sistema onde um número aleatório
nasce**. Se um dado rolasse em outro arquivo, ele fugiria dos testes e das
regras daqui.

### Expressão

```
[-]NdX      N ≥ 1,  X ≥ 1,  ambos inteiros
```

Aceita `1d20`, `2d20`, `-2d20`, `3d6`, `10d100`.
Recusa `d20`, `2d`, `0d20`, `2d0`, `2.5d20`, `abc`, `2x20`.

### As três operações

| | O que faz | Onde se usa |
|---|---|---|
| `rolar` | sorteia N dados e **elege um** | atributo |
| `somar` | sorteia N dados e **soma todos** | dano |
| `dependente` | usa o principal do atributo e aplica o que é da perícia | perícia |

**`2d20`** rola dois d20 e vale o **maior**.
**`-2d20`** rola dois d20 e vale o **menor**.

```js
RAMADados.rolar("2d20")
→ { expressao: "2d20", rolagens: [6, 15], principal: 15, selecao: "maior" }

RAMADados.rolar("-2d20")
→ { expressao: "-2d20", rolagens: [6, 15], principal: 6, selecao: "menor" }
```

### Rolagem de perícia

1. pega o atributo vinculado;
2. rola o dado **dele**;
3. determina o principal;
4. soma bônus fixo e temporário;
5. rola os dados extras e soma (ou subtrai);
6. **tudo isso só no principal.**

> Agilidade `2d20` → **6** e **15**, principal **15**.
> Acrobacia `+2` e `+1d6`, que sai **5**.
> Total: **15 + 2 + 5 = 22**.
> O 6 continua sendo 6 — ele foi descartado e não recebe nada.

### Dano

Todos os dados somam. Não existe dado principal.

> `2d10` → 6 + 9 = **15**

### Crítico

O crítico é conferido pelo **resultado natural principal** do ataque, antes de
qualquer bônus. Um `+5` de perícia não pode transformar um 13 em crítico.

No dano crítico multiplica-se a **quantidade de dados-base**, não o resultado
somado. **O dano extra fica de fora.**

> Dano `2d10`, extra `+4`, crítico `18`, multiplicador `x2`, ataque natural `19`.
> Dano crítico = **4d10 + 4**
> e **não** `(2d10 + 4) × 2`.

---

## Importação e exportação

```jsonc
{
  "rama": true,
  "tipo": "personagem",        // ou "homebrew-item"
  "versaoFormato": 1,
  "geradoEm": "2026-09-03T16:30:00.000Z",
  "dados": { }
}
```

Ao importar, nesta ordem:

1. confere que é um arquivo do R.A.M.A., do tipo certo e de uma versão
   conhecida;
2. **arranca** `ownerId`, `userId`, `id`, `rev`, `token`, `senha`, `hashSenha`,
   `salt` e afins, em qualquer nível — um arquivo que declara `ownerId` está
   tentando escrever no arquivo de outra pessoa;
3. normaliza a estrutura, consertando o que dá e descartando o que não dá;
4. mostra a **prévia**;
5. só então grava, sempre como registro **novo**, sob a conta de quem importou.

**Nenhuma ficha existente é sobrescrita**, nem quando o arquivo traz o mesmo id.
O servidor repete essa limpeza — o frontend avisa cedo, o servidor é quem
protege.

---

## Habilidades

Modelo em `js/habilidades.js`. **Habilidade é INFORMAÇÃO** — não tem valor, não
tem dado, não tem atributo vinculado. Clicar nela abre o texto; não rola nada.

A árvore é **recursiva de verdade**. Não é "pasta → habilidade": uma pasta
guarda filhos, e um filho pode ser outra pasta. Modelar isso como dois níveis
fixos condenaria a estrutura a uma reescrita no dia em que alguém quisesse
`Classe → Passivas → Defensivas`.

```jsonc
"habilidades": {
  "filhos": [
    { "id", "tipo": "pasta", "nome": "Classe", "aberta": true, "filhos": [
      { "id", "tipo": "pasta", "nome": "Passivas", "aberta": true, "filhos": [
        { "id", "tipo": "habilidade", "nome": "Habilidade X",
          "texto": "...", "origem": "Classe",
          "cor": "#C6564B", "negrito": false,
          "etiqueta": { "texto": "Energia", "cor": "#7E6BB5" },   // opcional
          "origemHabilidadeId": null }
      ] }
    ] }
  ]
}
```

O teto de profundidade é **6**, e é limite da TELA, não do modelo: mais que isso
e o recuo de cada nível não cabe num celular. O teto também protege a
normalização de recursão infinita num JSON importado que aponte para si mesmo.

**A cor é validada como hexadecimal** (`#abc` ou `#A33B3B`) e aplicada por
`style.setProperty`, nunca concatenada numa string de CSS. Nome de cor, `var()`,
`javascript:` e qualquer outra coisa viram vazio. E a cor nunca é a única forma
de identificar algo: nome e origem continuam valendo.

`origemHabilidadeId` é **rastro, não vínculo**: editar o modelo na biblioteca
não muda a cópia que já está na ficha.

### Etiqueta colorida

`etiqueta` é a marca abaixo do nome ("ENERGIA" em roxo). Vale igual para
habilidades e itens, nas fichas Universal e de Ordem e na Homebrew.

- `texto`: até 32 caracteres, uma linha só (quebras e caracteres de controle
  viram espaço). Vazio = **sem etiqueta**, e o campo não é gravado.
- `cor`: hexadecimal de seis dígitos (`#abc` vira `#AABBCC`). Qualquer outra
  coisa vira a cor padrão `#7E6BB5`. A cor do texto não é gravada: é preto ou
  branco, o de maior contraste com o fundo, calculado na tela.

**É apresentação, nunca regra.** Nenhum cálculo, requisito, elemento, afinidade,
categoria ou permissão lê a etiqueta. Ela não reaproveita `cor` (o contorno da
habilidade), `categoria` (a gaveta do item) nem o elemento de um poder. O texto
entra na tela por `textContent` e a cor por `style.setProperty`, depois de
validada — nada vira HTML ou CSS. Registros antigos simplesmente não têm o campo.

### Data de adição

Habilidades, pastas, itens e rituais ganham `adicionadoEm` (ISO) **no momento em
que entram na ficha**: criar, trazer da biblioteca, duplicar (a cópia é um
registro novo) e transformar uma versão personalizada em habilidade comum. Editar
não muda a data. O campo só é **preservado** pela normalização — nunca inventado:
um registro anterior à v2.7 não tem data e não ganha uma. Data inválida é
descartada. É o que a ordem "de adição" usa (ver `ordem.organizacao`).

## Rituais

```jsonc
"rituais": {
  "rotuloSecao": "Rituais",
  "rotulos": {
    "circulo": "Círculo", "alcance": "Alcance", "duracao": "Duração",
    "alvo": "Alvo", "efeito": "Efeito"
  },
  "itens": [
    {
      "id", "nome", "circulo", "alcance", "duracao", "alvo", "efeito",
      "versoes": [
        { "id": "uuid", "nome": "Normal",   "dano": "6d8" },
        { "id": "uuid", "nome": "Discente", "dano": "10d8" },
        { "id": "uuid", "nome": "Ritual",   "dano": "" }
      ]
    }
  ]
}
```

**O nome da seção e os rótulos são configuráveis; as CHAVES internas não.**

Trocar "Círculo" por "Nível" muda o que a tela escreve, não o que está gravado —
então nenhum ritual precisa ser migrado e nada se perde. A aba da ficha também
passa a mostrar o nome escolhido.

**Os rótulos pertencem à SEÇÃO, não a cada ritual.** Se cada registro carregasse
os próprios nomes de campo, dois rituais da mesma ficha poderiam chamar a mesma
coisa de dois jeitos.

Rótulo deixado em branco volta ao padrão.

### Versões

Um ritual pode ser conjurado de mais de um jeito, e cada jeito tem o próprio
dano. Em Ordem Paranormal o costume é Normal, Discente e Verdadeiro; isso é
vocabulário de uma mesa, não estrutura do R.A.M.A.

Por isso as versões são uma **coleção**, e não três campos fixos chamados
`dano`, `danoDiscente` e `danoVerdadeiro`. A diferença não é estética:

- campos fixos obrigariam todo ritual a ter os três, e um sistema com quatro
  níveis não caberia sem mexer no código;
- o nome exibido deixaria de ser texto e viraria chave. Renomear "Discente"
  para "Ampliado" mudaria onde o dado está gravado, e quem renomeasse perderia
  o valor.

Aqui o **nome é conteúdo** e o **id é identidade**. Renomear não move nada,
remover não desloca as outras, e duas versões podem até se chamar igual sem uma
sobrescrever a outra.

| campo | o que é |
|---|---|
| `id` | uuid, estável. Sobrevive a renomear, salvar, exportar e importar. |
| `nome` | texto livre, até 40 caracteres. Em branco vira `Normal`. |
| `dano` | expressão `NdX`, **opcional**. |

**O dano é opcional de verdade.** Existe ritual que não causa dano, e campo
vazio é uma resposta legítima — nunca zero. Versão sem dano não aparece na
ficha; ela existe, guarda o nome e espera.

**Expressão válida é gravada na forma canônica** (`6 D 8` vira `6d8`), para dois
aparelhos não brigarem por um espaço. **Expressão inválida é gravada como veio**:
apagá-la em silêncio faria alguém perder o que digitou sem nunca saber por quê.
Ela volta a aparecer na tela, o editor recusa salvar por cima dela com a mesma
mensagem que o dano de uma arma recebe, e a rolagem explica o motivo.

**Todo ritual tem pelo menos uma versão.** É isso que faz um ritual gravado
antes da 2.2 abrir com a `Normal` em branco — e é isso que impede a normalização
seguinte de acrescentar uma segunda, porque quando já existe uma ela não
acrescenta nada.

**Duplicar um ritual gera ids novos para as versões.** Uma cópia que
reaproveitasse os ids do original ficaria colada nele na hora de conciliar duas
edições.

Teto de 12 versões por ritual: é contra um arquivo importado trazer mil, não
uma regra de jogo.

## Migração

`schemaVersion` é `6`. Toda ficha lida passa por `normalizarFicha()`, que aceita
o que faltar e conserta o que dá.

**A v2.6 subiu o schema de 5 para 6 sem converter nada.** Os campos novos
(`etiqueta` em habilidades e itens; `ordem.personalizacoes` e `ordem.excluidas`)
são opcionais, e uma ficha 5 abre igual. A subida existe para proteger os dados:
uma aba ainda aberta com a versão anterior do aplicativo não conhece esses campos
e os descartaria ao gravar — com o schema 6 ela recusa abrir a ficha e pede para
recarregar.

**Ficha gravada na v1 continua abrindo.** Ela não tem `habilidades`, não tem
`rituais` e os itens não têm `categoria`; a normalização cria a árvore vazia, a
estrutura padrão de rituais e a categoria em branco. Nenhuma migração manual,
nenhum aviso, nenhuma célula editada à mão — e nada é inventado: a ficha
antiga não ganha habilidade nem ritual nenhum, só as estruturas vazias.

**Ritual gravado na v2 continua abrindo.** Ele não tem `versoes`; a normalização
acrescenta a `Normal` com dano em branco. Rodar a normalização de novo não
acrescenta uma segunda, e o id da que existe sobrevive — é o que permite salvar,
recarregar, exportar e importar sem a versão trocar de identidade no caminho.

**Ficha gravada antes da v2.3 continua abrindo, e é Universal.** Ela não tem
`tipoFicha`; a normalização a lê como `"universal"` — que é o único modelo que
existia e o único que não impõe regra nenhuma. Nenhum dado é convertido.

## Tipo de ficha

```jsonc
"tipoFicha": "universal" | "ordem"
```

**O tipo é um campo, e só um campo.** Nada no sistema o deduz do conteúdo: uma
ficha universal cujo dono chamou os atributos de AGI, FOR, INT, PRE e VIG
continua universal, e uma ficha de Ordem com a seção de rituais renomeada para
"Magias" continua de Ordem.

Valor desconhecido vira `universal`. Errar para o lado do modelo que não impõe
nada é o único erro seguro: um arquivo adulterado dizendo `"ordem"` faria a
ficha ser desenhada com cálculos que os dados dela não sustentam.

**Não existe conversão automática entre os dois.** Ela teria de adivinhar qual
atributo livre vira Agilidade, qual perícia vira qual e o que fazer com o que
não tem equivalente — e cada adivinhação dessas apaga trabalho em silêncio.

### O bloco `ordem`

Só existe na ficha de Ordem. Guarda **escolhas**, **recursos gastos** e
**ajustes manuais** — nunca valores calculados.

```jsonc
"ordem": {
  "nex": 5,                       // exposição paranormal, 0-99
  "nivel": 1,                     // só usado com a regra NEX & Experiência
  "classe": "especialista",
  "origem": "investigador",
  "trilha": "medico",
  "atributos": { "agi": 2, "for": 0, "int": 3, "pre": 3, "vig": 1 },  // os da criação
  "pericias": { "investigacao": "treinado" },   // graus da criação; o que falta é destreinado
  "prestigio": 0,
  "escolhas": [ {                 // uma decisão por vaga de progressão
    "id": "uuid",
    "etapa": "d3.poderClasse",    // id estável da vaga, nunca o texto mostrado
    "tipo": "poderClasse",
    "valor": "transcender",       // chave do catálogo
    "opcoes": { "poder": { "valor": "resistirAElemento", "opcoes": { "elemento": "morte" } } },
    "nome": "Transcender → Resistir a Morte",   // retrato do rótulo, só para leitura
    "ignorarRequisitos": false,   // "manter mesmo assim", decisão da mesa
    "registradoEm": "2026-09-12T10:00:00.000Z"
  } ],
  "afinidade": { "elemento": "", "nomeOutro": "", "adiada": false },
  "personalizacoes": [ {          // versão desta ficha de uma habilidade oficial
    "id": "uuid",
    "aquisicao": "d3.poderClasse|reflexosDefensivos",   // id estável da aquisição
    "poder": "reflexosDefensivos",
    "nome": "Reflexos de Gato", "texto": "...", "origem": "Poder de classe",
    "cor": "", "negrito": false,
    "etiqueta": { "texto": "Agilidade", "cor": "#3B6EA3" },   // opcional
    "efeitos": "herdados",        // ou "desativados"
    "homebrewId": null,           // rastro, se foi salva na biblioteca
    "criadoEm": "...", "atualizadoEm": "..."
  } ],
  "excluidas": [ {                // habilidades automáticas tiradas da ficha
    "id": "uuid", "aquisicao": "t.cascaGrossa|cascaGrossa", "poder": "cascaGrossa",
    "nome": "Casca Grossa", "excluidaEm": "..."
  } ],
  "patente": { "aplicar": true, "limites": null },
  "progressao": [ { "id", "nex", "tipo", "valor", "rotulo" } ],   // texto livre da v2.3, preservado
  "recursos": { "pv": null, "pe": null, "san": null },
  "ajustes": [ { "id", "alvo", "valor", "motivo", "manual": true } ],
  "temporarios": { "pv": 0, "pe": 0, "san": 0, "defesa": 0, "capacidade": 0 },
  "bonusExtra": { "defesa": 2, "bloqueio": 3, "esquiva": -1 },   // −99 a +99; fica até mudar
  "periciasAjustes": {            // só o que difere do padrão
    "luta": { "atributo": "agi" },            // atributo escolhido na ficha
    "fortitude": { "extra": 2 }               // bônus extra da perícia
  },
  "organizacao": {                // como cada aba ordena a lista — só apresentação
    "habilidades": { "modo": "personalizada", "regras": [ "auto|ataqueEspecial" ] },
    "rituais": { "modo": "az" },
    "inventario": { "modo": "adicao" }
  },
  "opcionais": { "nexExperiencia": true }
}
```

**As escolhas guardam decisões, não efeitos.** Um aumento de atributo não soma
nada em `atributos`; um Grau de Treinamento não troca nada em `pericias`. Os
dois campos continuam sendo o que a criação definiu e a mesa ajustou à mão, e o
motor de progressão recalcula o efeito de cada escolha a cada leitura. É isso
que impede recarregar a ficha de conceder o mesmo benefício de novo.

Ids de vaga (`etapa`):

| formato | vaga |
|---|---|
| `d<degrau>.<tipo>` | vaga da progressão da classe: `poderClasse`, `atributo`, `grauTreinamento`, `versatilidade`, `perito` |
| `b.<chave>` | opção interna de uma habilidade automática de trilha |
| `b.origem.<chave>` | opção interna do poder de origem |
| `x<nex>.transcender`, `x<nex>.alteracao` | vagas de exposição, só com NEX & Experiência |

A trilha **não** é registro: continua em `trilha`. A afinidade também não: está
em `afinidade`.

Uma escolha cuja etapa deixou de existir (o NEX baixou, a classe mudou) **não é
apagada** na leitura: ela fica guardada, sem efeito, e volta a valer se a etapa
voltar a existir.

`afinidade.elemento` é `conhecimento`, `energia`, `morte`, `sangue`, `outro` ou
vazio. `nomeOutro` é obrigatório para `outro` e continua guardado se o elemento
for trocado depois. `adiada: true` quer dizer que alguém escolheu decidir depois:
a janela não reabre, e a pendência continua na Progressão.

`patente.aplicar` ausente vale `true` — o comportamento de toda ficha anterior a
esta chave. `patente.limites` guarda os limites manuais por categoria, com as
chaves `"0"` a `"4"`: `null` é **sem limite**, um número é o máximo, e `0` é
**nenhum item**. Os limites ficam guardados mesmo com a patente ligada.

`temporarios.capacidade` é o ajuste temporário de capacidade de carga, em
espaços, de −99 a +99. Ele não tem duração: fica até alguém mudar.

### O resumo de recursos

```jsonc
"resumoRecursos": { "versao": 1, "pv": 32, "pe": 9, "san": null }   // ao lado de "ordem", não dentro
```

Desde a v2.12, o `fichaJson` gravado de uma ficha de Ordem leva os **máximos** de
PV, PE e Sanidade, para os outros jogadores da campanha verem os recursos sem
receber a ficha (ver "Painel da mesa" em [CAMPAIGNS.md](CAMPAIGNS.md)). Os atuais
continuam só em `ordem.recursos`. `san` é `null` com "Jogando sem Sanidade".

Ele **não** faz parte da ficha que a tela edita nem do arquivo exportado: é
calculado a cada gravação a partir do bloco `ordem`
(`RAMAOrdemRegras.resumoDeRecursos`) e anexado só à cópia que sobe. O servidor
valida a forma (inteiros de −999 a 99.999) e, numa gravação sem resumo, mantém o
anterior. Ficha universal não tem resumo — os status dela já são os números.

### Bônus extras e ajustes de perícia

`bonusExtra` guarda um número por estatística — `defesa`, `bloqueio`, `esquiva` —,
de −99 a +99. Ficha antiga lê tudo 0.

`periciasAjustes` guarda, por chave de perícia do catálogo, o `atributo` escolhido
(uma das cinco chaves) e/ou o `extra` (−99 a +99). Perícia sem troca e com extra 0 não
é gravada; perícia ou atributo inexistente é descartado na leitura. Nenhum dos dois
toca `pericias` (os graus) nem `atributos`: são ajustes à parte, recalculados a cada
leitura, e por isso nunca acumulam.

### Organização das listas

`organizacao` guarda, por aba (Habilidades, Rituais, Inventário), o **modo** de
exibição. É da ficha — vale em qualquer aparelho — e é só apresentação: nenhuma
conta, requisito ou permissão lê isto, e escolher um modo **não reescreve** a
lista guardada.

| `modo` | a tela mostra |
|---|---|
| `personalizada` (padrão) | a ordem guardada; Subir e Descer mexem nela |
| `adicao` | pela data de `adicionadoEm`, do mais antigo ao mais novo. O que não tem data (anterior à v2.7) vem primeiro, na ordem guardada. Uma habilidade escolhida na progressão usa o `registradoEm` da escolha; uma automática não tem data |
| `az` / `za` | pelo nome, sem diferença de acento nem de maiúscula, com números em ordem natural ("Nível 2" antes de "Nível 10"). Pastas vêm antes das habilidades |

Modo ausente ou desconhecido vale `personalizada`, que é o comportamento de toda
ficha anterior. Empates desempatam pela posição guardada.

`habilidades.regras` é a ordem personalizada das habilidades **das regras** (ids
de aquisição), que não moram na árvore. As que não estão na lista entram no fim,
na ordem da progressão. Ids repetidos ou fora do padrão são descartados.

Numa ficha Universal não há `organizacao`: as abas mostram a ordem guardada, e o
inventário continua com as armas primeiro.

### Versões personalizadas e habilidades excluídas

Cada habilidade oficial que o personagem tem é uma **aquisição**, com um id
estável dado pelo motor de progressão: a etapa mais a chave do poder, nunca o
nome.

| id | aquisição |
|---|---|
| `auto\|<chave>` | habilidade automática de classe (Ataque Especial, Perito…) |
| `t.<chave>\|<chave>` | habilidade automática de trilha |
| `<etapa>\|<chave>` | poder vindo de uma escolha: `d3.poderClasse\|golpePesado`, `x60.transcender\|sangueDeFerro` |
| `…#2` | a mesma chave duas vezes na mesma etapa |

`personalizacoes` guarda, **uma por aquisição**, o que a mesa mudou na
apresentação. Ela não abre nem consome escolha e não é lida como regra. Duas para
a mesma aquisição (sincronização de dois aparelhos) valem pela mais recente.
`efeitos: "desativados"` é o único dado mecânico: o motor pula os efeitos daquela
aquisição e mais nada — o poder continua adquirido para requisitos e repetição, e
bônus de outras fontes e ajustes manuais ficam.

`excluidas` guarda habilidades que **chegam sozinhas** (classe, trilha) e foram
tiradas da ficha: somem da lista e os efeitos saem da conta, como
`"desativados"`. Um poder **escolhido** não entra aqui: excluí-lo desfaz a
escolha em `escolhas`, e a personalização dele é apagada junto.

Se a aquisição deixa de existir (a classe, a trilha ou a escolha mudou), a
personalização e a exclusão **não são apagadas**: ficam guardadas, sem efeito, e
voltam a valer se a mesma aquisição voltar.

### O bloco `ordem` de um item

Numa ficha de Ordem, cada item do inventário pode ter um bloco próprio. Um item
de ficha universal nunca o ganha, e o `peso` do item nunca é convertido.

```jsonc
"ordem": {
  "espacos": 2,        // por unidade; null = padrão do livro (1)
  "quantidade": 3,     // unidades, a partir de 1
  "categoria": 1,      // 0 a 4 (0, I, II, III, IV); null = não informada
  "grupo": "geral",    // arma, municao, protecao, geral, paranormal
  "capacidade": 0,     // quanto o item AUMENTA a capacidade (Mochila Militar: 2)
  "emUso": true        // só em proteção, e só quando verdade: é a que soma na Defesa
}
```

`emUso` só existe em item do tipo `armadura` (proteção) e só é gravado quando é
verdade. Uma ficha de Ordem tem no máximo uma proteção em uso — a tela garante; se
vierem duas, o cálculo usa a de maior Defesa. Categoria e espaços **efetivos**
(depois de Mochila de Utilidades, A Favorita, Inventário Organizado…) nunca são
gravados: `categoria` e `espacos` são sempre os valores-base.

Espaços aceitam qualquer número a partir de 0 (0,1, 0,5, 2,75…), guardado com
duas casas decimais. Quantidade e categoria são coisas
diferentes: a quantidade diz quantas unidades existem; a categoria é o que conta
contra o limite da patente — e cada unidade conta como um item.

**Valor calculado não é gravado.** PV máximo, Defesa, carga e bônus de perícia
nascem da soma completa toda vez que alguém pergunta. É isso que torna
impossível — e não só improvável — aplicar um bônus duas vezes.

**`null` em `recursos` é "nunca foi tocado" e vale o máximo.** Zero é "gastou
tudo". Confundir os dois é como um recálculo acaba curando um personagem.

Ver [ORDEM-REGRAS.md](ORDEM-REGRAS.md) para a matriz de regras, com fonte,
página e o que está automatizado.

Além disso:

- ficha sem atributo nenhum recebe os cinco padrões (senão as perícias não teriam
  onde se apoiar);
- perícia apontando para um atributo que não existe mais é **religada** ao
  primeiro — o vínculo se conserta em um clique, a perícia não;
- expressão de dado inválida vira `""` e a pessoa conserta na tela, em vez de
  derrubar a ficha inteira;
- `atual` acima do `maximo` é aparado;
- item sem id ganha um.

Uma versão futura acrescenta o passo dela nessa mesma função.
