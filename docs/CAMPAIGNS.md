# Campanhas, combate e histórico

O que a campanha guarda, onde cada coisa mora e por quê.

Permissões estão em [PERMISSIONS.md](PERMISSIONS.md); este documento trata da
estrutura.

---

## As abas da campanha

Montadas em `js/paginas/campanha.js`. As duas últimas só existem para o mestre —
não são renderizadas desabilitadas, simplesmente não entram na lista.

| Aba | Quem vê | O que faz |
|---|---|---|
| Visão geral | todos | panorama, mesa, aviso de rolagens ocultas |
| Personagens | membros | grade de cartões: recursos com barra e ajuste rápido, atributos e estatísticas só para consulta |
| Rolagens | membros | histórico paginado; rolagem livre só para o mestre |
| Documentos | membros | só os documentos liberados para você |
| Combate | membros | só os combates liberados para você |
| Notas | **mestre** | anotações privadas, gerais ou por personagem |
| Configurações | **mestre** | nome, visibilidade, participantes, rolagens ocultas |

---

## O banco

Cinco tabelas novas, e a razão de nenhuma delas caber no `dadosJson` da
campanha: rolagens crescem sem fim, documentos carregam imagem, notas e combates
têm permissão própria e são editados de forma independente. Enfiados num só
JSON, abrir a campanha baixaria tudo e uma nota nova reescreveria o histórico
inteiro.

| Aba | Guarda |
|---|---|
| `CAMPANHA_MEMBROS` | `id, campanhaId, userId, papel, criadoEm` |
| `CAMPANHA_ROLAGENS` | `id, campanhaId, autorUserId, personagemId, tipo, nome, visibilidade, criadoEm, dadosJson` |
| `CAMPANHA_DOCUMENTOS` | `id, campanhaId, nome, descricao, visiveisJson, criadoEm, atualizadoEm, rev` |
| `CAMPANHA_DOCUMENTOS_IMAGENS` | `documentoId, campanhaId, imagem, atualizadoEm` |
| `CAMPANHA_NOTAS` | `id, campanhaId, personagemId, pasta, titulo, criadoEm, atualizadoEm, conteudo` |
| `CAMPANHA_COMBATES` | `id, campanhaId, nome, estado, visiveisJson, criadoEm, atualizadoEm, rev, dadosJson` |

`CAMPANHAS` ganhou a coluna `visibilidade`. `HOMEBREW` também.

**O vínculo personagem↔campanha continua morando no personagem** (`campanhaId`),
e só nele. Guardar dos dois lados exigiria manter dois lugares em sincronia, e a
primeira gravação que falhasse deixaria um personagem numa campanha que não sabe
dele.

**Membros usam ID de usuário, nunca nome ou username.** Renomear uma conta não
pode dar nem tirar acesso de ninguém.

---

## Histórico de rolagens

### Um funil só

O sistema já tinha um ponto por onde toda rolagem passava para ser MOSTRADA:
`RAMARolagens.mostrar()`. O histórico se pendurou nesse mesmo ponto.

```
ação rolável
      ↓
motor de dados (rola UMA vez)
      ↓
resultado ──┬── RAMARolagens.mostrar()   → aparece na tela
            └── RAMAHistorico.registrar() → sobe, se houver campanha
```

É por isso que `ficha-pericias.js`, `ficha-geral.js` e `ficha-inventario.js` não
têm uma linha de código de histórico. Espalhar isso por quatro arquivos
garantiria que o quinto esquecesse.

### A rolagem acontece uma vez

O resultado já existe quando chega ao `js/historico.js`. Se a gravação falhar, o
que se repete é o **envio** — nunca o sorteio. O número que a mesa viu é o número
que vai para o histórico.

Cada rolagem carrega um `id` gerado no momento em que aconteceu. Esse id
acompanha todas as retentativas, e é ele que faz o servidor reconhecer a segunda
chegada como repetição em vez de criar uma segunda linha. **Gerar um id novo ao
repetir seria o mesmo que rolar de novo, com um disfarce.**

### Paginação

O histórico cresce sem teto. `listar_rolagens` aceita `pulo` e `limite` (padrão
50, máximo 200), e a tela pede mais quando precisa. Baixar a tabela inteira para
desenhar as últimas vinte linhas seria pagar caro por nada.

O mestre pode limpar o histórico da própria campanha, com confirmação.

---

## Combate

### Fica salvo

Na planilha, não na memória da aba. Recarregar a página, fechar o navegador ou
abrir em outro computador encontra o combate onde ele estava.

### Criaturas entram como snapshot

Ao acrescentar uma criatura ao combate, o sistema copia a mini ficha dela para
dentro do combate. Editar o modelo na biblioteca depois **não** muda combate
nenhum já montado.

Cada ocorrência tem id próprio: "Existido #1" e "Existido #2" vêm do mesmo
modelo e têm estados independentes. `origemId` fica como rastro histórico — o
combate nunca o consulta para desenhar nada.

### Iniciativa

**É digitada, não sorteada.** O sistema só ordena, do maior para o menor, e a
ordenação é estável: quem empata mantém a posição relativa em vez de pular de
lugar a cada digitação.

```
[ 22 ] Michael
[ 18 ] Existido #1
[ 14 ] Gina
[  7 ] Cultista
```

Não existe rolagem automática de iniciativa, turno automático, grid, distância
nem condição oficial. Nada disso foi especificado, e o sistema não inventa regra.

### Estados

`preparando` → `ativo` → `encerrado`. Os três existem para o fluxo ser
utilizável; não há subsistema de regras por trás deles.

---

## Criaturas

Modelo em `js/criaturas.js`, editor em `js/paginas/homebrew-criatura.js`.

Ela **reusa** os conceitos que já existem — atributo com valor e dado separados,
perícia como rolagem dependente, ataque com dano e crítico, habilidade igual à da
ficha — mas **não herda a ficha inteira**: uma criatura com três perícias tem três
perícias, e não as 28 padrão.

```jsonc
{
  "tipo": "criatura",
  "nome": "Existido",
  "visibilidade": "privado",
  "categoria": "",
  "descricao": "",
  "status":      [ { "id", "nome", "atual", "maximo" } ],
  "atributos":   [ { "id", "nome", "sigla", "valor", "dado" } ],
  "pericias":    [ { "id", "nome", "atributoId", "bonus", "bonusTemporario" } ],
  "ataques":     [ { "id", "nome", "periciaId", "dado", "dano", "danoExtra",
                     "critico", "multiplicador", "descricao" } ],
  "habilidades": [ /* mesmo schema de habilidade da ficha */ ]
}
```

A imagem mora fora, em `CRIATURAS_IMAGENS` — mesma razão da foto de personagem.

Vida e Esforço nascem como **sugestão**, não como regra: são dois status
comuns, removíveis e renomeáveis como qualquer outro. Nada é calculado.

---

## Painel da mesa (aba Personagens)

Uma grade de cartões compactos (`js/paginas/campanha-personagens.js`) que se
ajusta à largura — vários por linha no desktop, um por linha no celular, sem
rolagem horizontal. Cada cartão: foto (ou iniciais), nome (cortado com
reticências, completo no título e nos rótulos de acessibilidade), classe e trilha,
jogador, NEX ou nível; atributos só para consulta; barras de recurso; estatísticas;
**Abrir ficha** no rodapé; e, para o mestre, **Tirar da campanha** num menu
separado dos recursos.

**O que cada cartão mostra** sai de `js/campanha-painel.js`, sem fórmula própria:

| ficha | recursos | atributos | estatísticas |
|---|---|---|---|
| Ordem | PV, PE e Sanidade (sem Sanidade com "Jogando sem Sanidade"), atual e máximo calculados por `RAMAOrdemRegras.calcular` | efetivos | Defesa, PE por turno, deslocamento |
| Universal | os status configurados na ficha, com os nomes dela | os configurados | nenhuma — nada de Ordem é imposto |

Bloqueio e Esquiva não existem no R.A.M.A. e não aparecem. A barra limita só a
LARGURA ao espaço dela: o número mostrado é o de verdade (zerado, negativo ou acima
do máximo). A cor de cada recurso vem acompanhada do nome escrito.

**Quem vê o quê.** O mestre e o dono do personagem recebem os dados de cálculo; os
outros jogadores veem, de uma ficha de Ordem alheia, só a identificação (classe,
trilha, NEX) — a mesma medida do que já viam antes. Da universal alheia continuam
vendo status e atributos, sem controles.

**Ajuste rápido.** `[−]`, `[+]` e o número, que abre um campo: Enter ou ✓ confirma,
Esc ou × cancela. Vazio, texto, decimal ou fora dos limites da ficha é recusado com
o motivo — nunca vira zero. Os limites são os da ficha completa (Ordem: −99 até o
máximo; universal: −9999 até o máximo, sem teto quando ele é 0). Só o valor atual
muda: máximos, atributos e valores-base não.

A mudança aparece na hora (a barra fica tracejada até o servidor confirmar) e entra
na fila de `js/fila.js`: cliques seguidos viram um envio com o valor final, e o
cartão mostra "Salvando…", "Salvo", "Tentando de novo…" ou o erro. Num conflito de
revisão, a fila busca a listagem de novo e **só reenvia se aquele recurso continua
com o valor de quando o mestre começou**; se o jogador acabou de mexer nele, o
ajuste não passa por cima e a tela avisa. Buscar a listagem (botão **Atualizar**)
atualiza os cartões no lugar, sem tocar num recurso sendo digitado ou com gravação
pendente.

## Ajuste rápido de status

Os botões `[-]` e `[+]` do painel do mestre poderiam reusar `salvar_personagem`,
mas isso obrigaria a baixar a ficha inteira, mudar um número e devolver tudo — e
duas pessoas mexendo em personagens diferentes disputariam a mesma gravação
enorme.

`ajustar_personagem` faz a alteração cirúrgica: um campo, por id, **com a
revisão conferida do mesmo jeito**. Não é um caminho paralelo mais frouxo — é o
mesmo controle de concorrência sobre um payload menor.

O servidor valida o alvo (`status`, `atributo` ou `recurso`), o campo (lista
fechada) e o valor — que precisa ser um número de verdade: vazio, `null` ou texto é
recusado, e não vira 0. Um campo fora da lista, ou um alvo inventado, é recusado.

`recurso` é da ficha de Ordem: `itemId` é `pv`, `pe` ou `san`, o campo é só
`atual`, o piso é −99 (o da ficha) e o valor vai para `ordem.recursos`. O máximo é
calculado pelas regras e nunca é gravado. Numa ficha universal, `recurso` é
recusado.

Com `campanhaId` no pedido, o servidor confere também que o personagem continua
vinculado àquela campanha — um cartão aberto há uma hora não mexe numa ficha que
já saiu da mesa. A permissão continua a de sempre: dono, ou mestre da campanha em
que o personagem está.

---

## Documentos e imagens

O pipeline de imagem do sistema comprime no navegador antes de subir. Para
documentos ele é chamado com `{ lado: 1024, quadrado: false }`: uma planta baixa
recortada em quadrado de 256px não serviria para nada.

A imagem vai para uma tabela própria, separada dos metadados, porque ela é o
campo mais pesado e o que menos muda — e porque a permissão precisa ser
conferida de novo na hora de entregá-la.

O servidor recusa acima do limite de célula com `dados_grandes` em vez de
truncar. **Conteúdo truncado em silêncio é pior do que uma recusa.**
