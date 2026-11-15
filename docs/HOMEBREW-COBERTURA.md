# Homebrew — inventário de cobertura

Gerado por `testes/executar-homebrew-matriz.js --gerar` a partir dos
adaptadores (`js/homebrew-adaptadores.js`): o que cada sistema oferece,
em que editor, onde entra na ficha e o que fica com a mesa. A mesma
suíte confere, a cada execução, que o servidor e os pacotes aceitam
cada tipo e que nenhum sistema converte conteúdo de outro.

Criaturas entram no combate, nos aliados e na consulta (os editores de
criatura de cada sistema), não na ficha de personagem.

## Ordem Paranormal

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Equipamento geral | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Arma | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Proteção | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Munição | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Acessório | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Consumível | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Item paranormal | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Mochila / recipiente | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Outro (narrativo) | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Habilidade / poder | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Habilidade | Ritual | editor de rituais | Nativo | Entra na aba Rituais, com símbolo, círculo, elemento(s) e a conjuração automática. |
| Tipo estrutural | Elemento | editor de campos | Nativo | Aparece nos seletores de elemento (rituais, criaturas, itens e, se permitido, afinidade). |
| Tipo estrutural | Classe | editor próprio (por etapas) | Nativo | Escolhida na criação do agente (Classes Homebrew), com a cópia guardada na ficha. |
| Tipo estrutural | Origem | editor próprio (por etapas) | Nativo | Escolhida na criação do agente (aba Homebrew) ou ao trocar de origem, com a cópia guardada na ficha. |
| Tipo estrutural | Trilha | editor próprio (por etapas) | Nativo | Aparece na vaga de Trilha da progressão (e na criação, a partir de NEX 10%) para a classe dela, com a cópia guardada na ficha. |

## Ordem Paranormal RPG II

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Arma | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Proteção | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Consumível | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Equipamento | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Outro (narrativo) | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Habilidade | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Habilidade | Poder | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Habilidade | Ritual (experimental) | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Tipo estrutural | Perfil | editor próprio (por etapas) | Nativo | Escolhido na criação de personagens de Ordem II (experimental), com a habilidade de perfil. A cópia fica na ficha. |
| Tipo estrutural | Ocupação | editor próprio (por etapas) | Nativo | Escolhida na criação de personagens de Ordem II (experimental), com a habilidade de ocupação. A cópia fica na ficha. |

## Tormenta20

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Arma | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Armadura | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Escudo | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Vestuário | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Ferramenta | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Alquímico / consumível | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Esotérico | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Equipamento de aventura | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Alimentação | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Munição | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Outro (narrativo) | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Magia | editor de campos | Nativo | Aprendida na aba Magias (+ Aprender magia) e lançada com o custo do círculo, o dano, a cura e os efeitos configurados. A cópia fica na ficha. |
| Habilidade | Poder | editor de campos | Nativo | Escolhido ao subir de nível ou em + Poder avulso, com os efeitos e a ativação configurados. A cópia fica na ficha. |
| Habilidade | Habilidade | editor de campos | Manual | Habilidade só de texto: entra nas anotações da ficha, para consulta (Manual). O que o motor de Tormenta20 aplica tem subtipo próprio: Magia e Poder. |
| Tipo estrutural | Raça | editor próprio (por etapas) | Nativo | Escolhida na criação de personagem (depois das raças do livro), com a cópia guardada na ficha. |
| Tipo estrutural | Origem | editor próprio (por etapas) | Nativo | Escolhida na criação de personagem (depois das origens do livro): quem joga escolhe dois benefícios. A cópia fica na ficha. |
| Tipo estrutural | Divindade | editor próprio (por etapas) | Nativo | Escolhida na criação de personagem (depois do Panteão), com o poder concedido. A cópia fica na ficha. |
| Tipo estrutural | Classe | editor próprio (por etapas) | Nativo | Escolhida na criação de personagem e ao subir de nível (também como multiclasse). A cópia fica na ficha. |

## Oblívio

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Equipamento (com base no catálogo) | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Objeto narrativo | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Habilidade | editor de campos | Nativo | Entra como habilidade Geral: escolhida ao concluir uma Missão ou concedida pela Testemunha (aba Habilidades); o limite de uso é contado pela ficha. A cópia fica na ficha. |
| Tipo estrutural | Papel | editor próprio (por etapas) | Nativo | Escolhido na criação de Personas, com a Habilidade Principal; a cópia fica na ficha. |
| Tipo estrutural | Motivação | editor próprio (por etapas) | Nativo | Escolhida na criação de Personas, depois das do livro; a cópia fica na ficha. |
| Tipo estrutural | Mazela | editor próprio (por etapas) | Nativo | Aparece em “Aplicar mazela” na ficha; a cópia fica na ficha. |
| Tipo estrutural | Fardo | editor próprio (por etapas) | Nativo | A mesa aplica na ficha (“Aplicar Fardo Homebrew”); a cópia fica na ficha. |

## Vampiro: A Máscara

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Arma | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Armadura | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Equipamento | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Objeto sobrenatural | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Outro (narrativo) | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Poder de Disciplina | editor de campos | Nativo | Entra nos poderes da Disciplina (criação e compras com XP), com o custo em Checagens, a parada e a duração; o efeito é da mesa. A cópia fica na ficha. |
| Habilidade | Habilidade | editor de campos | Manual | Habilidade só de texto: entra nas anotações da ficha, para consulta (Manual). O que o motor de Vampiro: A Máscara aplica tem subtipo próprio: Poder de Disciplina. |
| Tipo estrutural | Clã | editor próprio (por etapas) | Nativo | Escolhido na criação de vampiros; a Compulsão entra pelo mesmo caminho das do livro. A cópia fica na ficha. |
| Tipo estrutural | Predador | editor próprio (por etapas) | Nativo | Escolhido na criação: a especialização, a Disciplina e o que ele dá entram na ficha. A cópia fica na ficha. |
| Tipo estrutural | Disciplina | editor próprio (por etapas) | Nativo | Aparece na criação (clã e predador) e nas compras com XP; os poderes têm custo, teste e duração. A cópia fica na ficha. |
| Tipo estrutural | Vantagem / Defeito | editor próprio (por etapas) | Nativo | Aparece na criação e nas compras com XP. A cópia fica na ficha. |
| Tipo estrutural | Ficha de Conhecimento | editor próprio (por etapas) | Nativo | Aparece na criação e nas compras com XP (cada nível à parte). A cópia fica na ficha. |

## Malditos Goblins

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Arma | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Proteção | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Equipamento | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Outro (narrativo) | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Magia | editor de campos | Nativo | Entra na escolha de magias do Bruxo e se conjura como as do livro (teste de Noção; o resultado pelos hits, com o que a ficha aplica). A cópia fica na ficha. |
| Habilidade | Técnica | editor de campos | Nativo | A mesa concede ao goblin (aba Técnicas, em edição); o uso de 1 vez por dia é marcado pela ficha. A cópia fica na ficha. |
| Habilidade | Habilidade | editor de campos | Manual | Habilidade só de texto: entra nas anotações da ficha, para consulta (Manual). O que o motor de Malditos Goblins aplica tem subtipo próprio: Magia e Técnica. |
| Tipo estrutural | Ocupação | editor próprio (por etapas) | Nativo | Escolhida na criação de goblins (e como ocupação épica), com a cópia guardada na ficha. |
| Tipo estrutural | Descritor | editor próprio (por etapas) | Nativo | Escolhido na criação de goblins, depois dos do livro, com a cópia guardada na ficha. |
| Tipo estrutural | PokéPraga | editor de campos | Nativo | Adaptação PokéPragas: a mesa põe à vista na ficha (aba Adaptações, em edição); captura, ataque e evolução seguem a regra. A cópia fica na ficha. |
| Tipo estrutural | Receita | editor de campos | Nativo | Adaptação Vale dos Goblins: aparece na cozinha (aba Adaptações). A cópia fica na ficha. |

## BRUTAL

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Apego: item | editor de campos | Nativo | Vira o Apego "item" da ficha. |
| Habilidade | Vantagem | editor de campos | Nativo | A Diretora traz para a mesa (Vantagens da mesa → Da biblioteca): custo em PT, recarga e o efeito que o motor aplica. A mesa guarda a cópia. |
| Tipo estrutural | Arquétipo | editor próprio (por etapas) | Nativo | Escolhido na criação de Sobreviventes e na troca de Arquétipo; a mesa recebe a cópia pelo resumo da ficha. |
| Tipo estrutural | Estilo | editor próprio (por etapas) | Nativo | Aparece no editor de Arquétipo e nas listas de Estilo da ficha e da mesa. |
| Tipo estrutural | Assassino | editor próprio (por etapas) | Nativo | Modelo de mesa: aparece na mesa da Diretora, ao configurar o Assassino; a mesa guarda a cópia. |
| Tipo estrutural | Ameaça | editor próprio (por etapas) | Nativo | Modelo de mesa: aparece na mesa da Diretora, ao configurar o Assassino; a mesa guarda a cópia. |
| Tipo estrutural | Apavoro | editor próprio (por etapas) | Nativo | Modelo de mesa: aparece na mesa da Diretora, ao configurar o Assassino; a mesa guarda a cópia. |

## Universal

| Tipo | Subtipo | Editor | Na ficha | O que entra e o que é manual |
|---|---|---|---|---|
| Item | Equipamento | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Arma | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Proteção | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Mochila / recipiente | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Consumível | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Ferramenta | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Acessório | editor de campos | Nativo | Entra no inventário com as regras do sistema. |
| Item | Outro (narrativo) | editor de campos | Nativo | Entra no inventário como item narrativo (nome e descrição): as regras ficam com a mesa. |
| Habilidade | Habilidade | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Habilidade | Poder | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Habilidade | Técnica | editor de campos | Nativo | Entra nas habilidades da ficha. |
| Habilidade | Magia | editor de campos | Nativo | Entra nas habilidades da ficha. |

## Ações do Modelo Universal

As ações (custo, teste, efeito em recurso, usos) rodam em toda ficha
(`js/homebrew-recursos.js`). Com recursos nativos: Ordem Paranormal, Ordem Paranormal RPG II, Tormenta20, Vampiro: A Máscara, Malditos Goblins.

- **Oblívio**: Em Oblívio, o Estresse é por região do corpo: custo e efeito em recurso ficam com a mesa (o teste e os usos funcionam).
- **BRUTAL**: Em BRUTAL, os Pontos de Tensão moram na mesa da Diretora: custo e efeito em recurso ficam com ela (o teste e os usos funcionam).

Um recurso que a ficha não tem pelo nome, a pessoa escolhe na lista
(nada é ligado por nome parecido). Num teste, Ordem e Tormenta20 deixam
somar uma perícia nativa. O id da operação evita gravar duas vezes onde
o motor tem id (Ordem II, Tormenta20, Goblins, Vampiro).
