# A ficha de Ordem Paranormal — composição (v6.4)

A ficha de Ordem foi reorganizada em v6.4 (codinome PENTAGRAMA) pela frequência
de uso. Esta página é o inventário de campos e ações feito **antes** da
mudança. Cada linha diz onde o campo ou a ação ficou depois dela. Cálculos,
regras, schema e manipuladores não mudaram: só o lugar e o peso visual de cada
coisa.

## As três necessidades

| Necessidade | Onde |
|---|---|
| **Durante a sessão**: atributos, recursos, defesa, condições, ataques e perícias | bloco compacto acima das abas (resumo) e aba **Geral** (a visão de jogo) |
| **Consulta do personagem**: identidade, habilidades, rituais, inventário, anotações e aliados | parte de baixo da Geral ("Personagem") e as abas Habilidades, Rituais, Inventário, Anotações e Aliados |
| **Preparação e manutenção**: progressão, regras opcionais, personalizações e ajustes da mesa | abas **Progressão** e **Regras**, no fim da tira e separadas das outras |

A tira de abas ganhou três grupos (`grupo` em `js/sistemas.js`): jogo
(Geral, Perícias), personagem (Habilidades, Rituais, Inventário, Anotações,
Aliados) e preparo (Progressão, Regras). A separação é só visual: cada aba
continua sendo um `role="tab"`, as setas do teclado continuam andando entre
todas e a aba guardada (`rama.ficha.aba`) não muda de chave.

## O bloco acima das abas

Antes, o bloco mostrava a foto, a identidade curta e os painéis completos de
Atributos, Recursos, Condições e Defesa. Era preciso passar por eles toda vez
que se abria Rituais ou Inventário. Agora ele é uma linha:

- foto pequena, classe, origem, NEX ou nível, estágio (sobrevivente) e patente
  (**só com a regra de patente ligada e aplicada**);
- o resumo de sessão: PV, PE e SAN (ou PD) com atual/máximo, Defesa,
  condições críticas ativas (Morrendo, Enlouquecendo, Inconsciente,
  Perturbado), quantos efeitos estão ativos e quantas escolhas da Progressão
  estão pendentes.

O resumo **não tem controle que altere a ficha**. Cada item é um atalho: leva
à Geral e põe o foco no recurso, na Defesa ou nas condições, ou leva à
Progressão no caso das pendências. O ajuste manual de um recurso, que não
redesenha a ficha para não tirar o foco do campo, atualiza o resumo e a barra
no lugar (`sincronizarRecursos`).

## A aba Geral

No desktop (a partir de 1000 px), em duas colunas, como a página 1 da ficha de
papel:

| Coluna da esquerda | Coluna da direita |
|---|---|
| Atributos (o pentagrama) | Condições e efeitos |
| Recursos | Ataques (as armas do inventário) e Munição (regra opcional) |
| Defesa e movimento, com proteção em uso, carga e rituais | Perícias — consulta rápida |
| Proficiências e resistências | |

Com uma condição crítica ativa, o painel de Condições sobe para o topo da
Geral, na largura toda, e não pode ser recolhido.

Embaixo, na largura toda, vem **Personagem**: Identidade (com a foto e o nome
no modo edição), Cicatrizado (quando o poder existe) e Componentes
ritualísticos (regra opcional).

No celular, e no painel lateral da campanha (`?painel=1`), tudo vira uma
coluna, nesta ordem: condições críticas, atributos, recursos, defesa,
proficiências, condições, ataques, perícias e Personagem.

## Verificação

`testes/ficha-ordem-interface.js` confere esta composição no Chrome, contra o
servidor local, com dados sintéticos (ver o README). Ele cobre o bloco sem
controles, a ordem e os grupos das abas, nenhum botão dentro de outro, as
posições do pentagrama, o ajuste manual sem redesenho (mesmo campo, foco e
resumo), a ação de recurso a partir do valor atual, a condição crítica no topo e
o atalho do resumo, os ajustes da mesa só em Regras, as rolagens e as janelas, a
patente desligada, o modo edição, Mundano, Sobrevivente e o celular a 390 px sem
rolagem horizontal.

### Atributos

AGI em cima, FOR à esquerda, INT à direita, PRE embaixo à esquerda e VIG
embaixo à direita, em volta do centro, como na imagem de referência. O desenho
(anel e raios) é um SVG decorativo (`aria-hidden`). Cada atributo é um grupo
com um `<button>` de rolar (sigla, valor e dados) e, quando o valor efetivo é
diferente do da ficha, um botão "conta" ao lado — não mais um botão dentro de
outro. No modo edição o pentagrama vira uma grade de cartões com o controle de
valor. Num espaço menor que 280 px a grade também é usada.

### Recursos

Três camadas separadas, com rótulo escrito:

1. **Atual · ajuste manual**: o número grande é o próprio campo de ajuste (−,
   valor, +). Muda o valor e mais nada.
2. **Máximo**: o calculado, com "=" e a composição no clique.
3. **Aplicar com as regras**: a quantidade e as ações (Dano, Cura, Gastar,
   Dano mental, Recuperar — as de `condicoes.js` para cada recurso). Só elas
   aplicam as consequências das regras.

Uma barra mostra quanto sobrou. Ela é leitura periférica: o número continua lá.

### Condições e efeitos

| Estado | Como aparece |
|---|---|
| Ativo que exige atenção (Morrendo, Enlouquecendo, Inconsciente, Perturbado) | cartão cheio, traço de aviso (ou de erro no limite), painel no topo da Geral e alerta no resumo |
| Sugestão não aplicada (PV ou SAN em 0) | cartão tracejado na cor de aviso, com o botão que aplica |
| Efeito aplicado | cartão com traço paranormal |
| Encerrado ou histórico | dentro de "Terminados", apagado |
| Configuração ou explicação | "Cena, combate e imunidades", recolhível |

Sem nada ativo, Morrendo e Enlouquecendo viram uma linha com os dois botões
de ativar.

## Inventário (antes → depois)

### Bloco superior

| Campo ou ação | Antes | Depois |
|---|---|---|
| Foto | bloco | bloco (pequena); trocar foto: Identidade, no modo edição |
| Nome (edição) | bloco | Identidade (Geral), no modo edição |
| Classe, origem, estágio, NEX/nível, patente | bloco | bloco (linha) e Identidade |
| Aviso de pendências → Ver na Progressão | bloco | bloco (resumo) |
| Atributos: rolar, valor da ficha (edição), conta | bloco | Geral · Atributos |
| Recursos: máximo e composição, ajuste manual, quantidade, ações das regras, nota de determinação | bloco | Geral · Recursos (resumo no bloco) |
| Cena: Nova cena, Novo interlúdio, integrar ao combate | bloco | Geral · Condições (Nova cena à vista; o resto em "Cena, combate e imunidades") |
| Barganha Insana pendente → resolver | bloco | Geral · Condições |
| Morrendo e Enlouquecendo: ativar, +1 início de turno, −1 corrigir, encerrar, sugestão | bloco | Geral · Condições |
| Inconsciente: marcar e encerrar; Perturbado: encerrar | bloco | Geral · Condições |
| Adicionar condição; doenças e venenos (AS6) | bloco | Geral · Condições |
| Efeitos ativos: +1 turno, −1 corrigir, editar, encerrar, inverter (AS5), descrição | bloco | Geral · Condições |
| Automáticas, trazidas por outras, contextuais, "enquanto valerem", rolagens pedidas | bloco | Geral · Condições |
| Terminados: −1 corrigir, reativar, remover da lista | bloco | Geral · Condições ("Terminados") |
| Imunidades: editar | bloco | Geral · Condições ("Cena, combate e imunidades") |
| Defesa, Bloqueio, Esquiva (composição e bônus extra) | bloco | Geral · Defesa e movimento (Defesa também no resumo) |
| Deslocamento, limite de PE/PD por turno, exceções | bloco | Geral · Defesa e movimento |
| Carga (resumo) e círculo de rituais | bloco | Geral · Defesa e movimento |

### Aba Geral (antes)

| Campo ou ação | Antes | Depois |
|---|---|---|
| Identidade completa, campanha (seletor na edição), suplementos em uso, trocar origem | Geral | Geral · Personagem · Identidade |
| Cicatrizado: sacrificar, nova sessão, desfazer, registro | Geral | Geral · Personagem |
| Proficiências e resistências | Geral | Geral, coluna da esquerda |
| Munição (regra opcional) | Geral | Geral, junto dos Ataques |
| Componentes ritualísticos (regra opcional) | Geral | Geral · Personagem |
| Ajustes da mesa: lista, remover, + ajuste manual | Geral | **Regras** (fim da aba); a Defesa avisa quantos há |

### Novos pontos de acesso (os mesmos manipuladores)

| O quê | Onde | Reutiliza |
|---|---|---|
| Ataques | Geral | `SecaoInventarioOrdem.botoesDaArma` (Ataque, Dano, dano alternativo), `R.armaEfetiva` |
| Perícias — consulta rápida | Geral | `botaoDoNome` (consulta dos usos), `rolarPericia`, `abrirComposicao`, a mesma ordem da aba Perícias |
| Proteção em uso | Geral · Defesa | `R.protecaoEmUso` (só leitura; usar e guardar continuam no Inventário) |
| Item em uso | Inventário | `classeDoItem` do perfil de Ordem marca a proteção em uso |

A aba **Perícias** continua sendo onde se edita grau, atributo e extra, onde
se escolhe a ordem e onde se arrasta. As demais abas (Progressão, Habilidades,
Rituais, Inventário, Anotações, Regras, Aliados) têm o mesmo conteúdo de antes.
