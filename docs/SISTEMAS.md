# A plataforma e os sistemas

Desde a v4.0, o R.A.M.A. é a **plataforma** e cada sistema de RPG é um
**módulo** dela. Ordem Paranormal, Oblívio e Universal são integrações do mesmo
nível: nenhuma é o modelo padrão que as outras adaptam. Este documento diz o
que é de quem, como o núcleo escolhe o comportamento de cada sistema, como
funciona o sistema de uma campanha e como entra um sistema novo.

## Núcleo × módulos

| | Núcleo (plataforma) | Módulo de sistema |
|---|---|---|
| **O quê** | sessão, contas, permissões, compartilhamento, armazenamento em blocos, pastas, Homebrew, temas, a estrutura da campanha (participantes, sistema da campanha, personagens vinculados, rolagens, documentos, notas, capa, marcas) e o rastreador de combate (ordem, turno, rodada) | o bloco de regras da ficha, os cálculos, o que o painel da mesa mostra, o resumo que a mesa lê, as ferramentas e mecânicas de mesa do sistema |
| **Servidor** | `Dados.gs`, `Codigo.gs`, `Campanhas.gs`, `Sistemas.gs` | `Ordem.gs`, `Oblivio.gs`, `Vampiro.gs`, `Goblins.gs`, `Brutal.gs`, `Tormenta20.gs`, `Ordem2.gs`, `Universal.gs` |
| **Site** | `js/*.js`, `js/paginas/` (telas da plataforma e seções de ficha comuns: Geral, Perícias, Habilidades, Rituais, Inventário, Anotações, Aliados) | `js/ordem/` e `js/ordem/telas/`, `js/oblivio/` e `js/oblivio/telas/`, `js/vampiro/` e `js/vampiro/telas/`, `js/goblins/` e `js/goblins/telas/`, `js/brutal/` e `js/brutal/telas/`, `js/tormenta20/` e `js/tormenta20/telas/`, `js/ordem2/` e `js/ordem2/telas/`; o modelo Universal usa as seções comuns |

Seções comuns (Habilidades, Rituais, Inventário, Anotações, Aliados) são as
mesmas em todo sistema que as usa — duplicá-las só para mudar o cabeçalho seria
manter dois códigos iguais. Quando uma delas tem um acréscimo de um sistema (a
biblioteca de rituais de Ordem, a ficha de consumo), ela pergunta se a ficha é
daquele sistema (`RAMAFicha.ehDoSistema`) e só então acrescenta.

## O registro central

Dois registros, um em cada lado, que dizem a mesma coisa
(`testes/sistemas-backend.js` confere):

- **Site — `js/sistemas.js`** (`RAMASistemas`), carregado logo depois de
  `js/util.js` em toda página. Cada entrada declara:
  - `ficha.bloco` e `ficha.motor`: a chave do bloco de regras (`ficha.ordem`,
    `ficha.oblivio`) e o módulo que o normaliza e cria o vazio (`normalizar`,
    `fichaVazia`). Sem bloco, a ficha usa só o núcleo do modelo (Universal).
  - `ficha.abas` e `ficha.blocoSuperior`: as seções da ficha. Cada aba pode ter
    `grupo` (v6.4): a tira abre um respiro quando o grupo muda (Ordem: jogo,
    personagem, preparo — ver `docs/FICHA-ORDEM.md`).
  - `ficha.resumo`: o resumo que a mesa lê sem abrir a ficha (campo e função
    do motor).
  - `ficha.modulosConfiguraveis`, `ficha.periciasPadrao`, `ficha.pontos`.
  - `campanha.mestre` (Mestre, Testemunha), `campanha.ferramentas` e
    `campanha.mecanicas`.
- **Servidor — `backend/Sistemas.gs`** (`SISTEMAS_DO_RAMA`): id, nome, arquivo,
  ferramentas e mecânicas. Os ganchos de cada sistema vêm de uma função
  `sistema<Nome>()` no arquivo dele (`MODULOS_DE_SISTEMA`), pedida só quando
  usada — o Apps Script não garante a ordem dos arquivos.

### Suplementos (v6.1)

Conteúdo adicional de um sistema, habilitável por ficha e por campanha.
Tudo em `js/suplementos.js` (`RAMASuplementos`), espelhado em
`backend/Sistemas.gs` (`SUPLEMENTOS_DO_RAMA`; `testes/sistemas-backend.js`
confere).

- **Cadastro**: `{ id, sistema, fontes, nome, curto, descricao, capa, capaAlt }`.
  `fontes` são as siglas que os catálogos do sistema já usam (Ordem: `SAH`,
  `AS1`–`AS7` e `AS9` (o AS7 desde a v6.5, o AS9 desde a v6.9) e, desde a v6.2, `EXTRA` — os Extras, sempre por último). `FERRAMENTAS` liga ferramentas/mecânicas de mesa a um
  suplemento (Ordem: Hexatombe → AS2, Hacking → AS4, Perigos e Sincronia → AS5).
- **Ficha**: `ficha.suplementos` — ausente = todos (fichas anteriores);
  lista vazia = só o livro básico.
- **Campanha**: `dados.suplementos[sistema]` — o que a mesa permite, por
  sistema (trocar o sistema não apaga). Salvo por `salvar_campanha` com
  `{ suplementos: { sistema, ids } }` (só o mestre); devolvido por
  `ler_campanha` e `listar_campanhas`.
- **Contexto**: cada página chama `definirContexto({ sistema, ficha, campanha })`;
  `fonteLiberada(sistema, fonte)` responde para NOVAS escolhas (ficha ∩
  campanha). Fonte sem suplemento (livro básico, Homebrew, sem fonte) vale
  sempre.
- **Componente**: `painel({ sistema, selecao, aoMudar, campanha, emUso, somenteLeitura })`
  e a janela `abrir(...)` — a escolha do tipo de ficha, "Opções da ficha →
  Suplementos" e Configurações da campanha usam o mesmo.
- **Servidor**: `exigirSuplemento(ctx, ferramenta, corpo)` recusa iniciar e
  operar uma ferramenta de suplemento desligado na campanha
  (`suplemento_desligado`); ler e desligar a mecânica continuam permitidos.

Um sistema novo com suplementos: entradas no cadastro (os dois lados) e, nos
catálogos dele, a pergunta `fonteLiberada` nas listas de escolha.

### Os ganchos do servidor

| Gancho | Quem chama | Ordem | Oblívio | Vampiro | Goblins | BRUTAL | Tormenta20 | Ordem II | Universal |
|---|---|---|---|---|---|---|---|---|---|
| `rotas()` | `rotaDe()` (Codigo.gs) | efeito, resumo, Hexatombe, Hacking, Perigos, Sincronia | `ler_oblivio`, `salvar_oblivio`, `oblivio_operar` | `ler_vampiro`, `salvar_vampiro`, `vampiro_operar` | `ler_goblins`, `salvar_goblins`, `goblins_operar` | `ler_brutal`, `brutal_operar` | `ler_tormenta20`, `salvar_tormenta20`, `tormenta20_operar` | `ler_ordem2`, `ordem2_operar` | — |
| `fichaDoSistema(ficha)` | `moduloDaFicha` | tem o bloco `ordem` | tem o bloco `oblivio` | tem o bloco `vampiro` | tem o bloco `goblins` | tem o bloco `brutal` | tem o bloco `tormenta20` | tem o bloco `ordem2` | — |
| `projecao(ficha)` | a projeção do painel | bloco do painel, itens, resumo | a Persona do painel | `resumoParaMesa`, calculado com o motor | `resumoParaMesa`, calculado com o motor | `resumoParaMesa` (Arquétipo, Estilos) | `resumoParaMesa` calculado com o motor (PV, PM, Defesa, condições) | `resumoParaMesa` calculado com o motor (perfil, PV, PD, armadura, pavor, condições) | atributos e status |
| `painel(proj, o)` | `listar_personagens_campanha` | o cartão de Ordem | o da Persona | trilhas, Fome, Humanidade, Potência (ou só clã e natureza) | atributos, ferimentos, efeitos (ou só ocupação e nível) | Arquétipo e Estilos (o jogo é da Mesa da Diretora) | raça, classes, nível; PV, PM, Defesa, iniciativa e condições seguindo "Esconder status" | perfil, ocupação/vocação, nível; PV, PD, armadura, pavor e condições seguindo "Esconder status" | atributos e status |
| `recursosNoCombate(proj)` | a lista do combate | PV/PE/SAN/PD e condições | — | — | — | — | — | — | status |
| `turnosNasFichas(...)` | `atualizar_combate` | condições e efeitos por turno | — | — | — | — | — | — | — |
| `resumo` | criar/salvar personagem | `resumoRecursos` | — | — | — | — | — | — | — |
| `ajustes` | `ajustar_personagem` | o alvo `recurso` | — | — | — | — | — | — | — |
| `estadoDasMecanicas` | `ler_campanha` | Hexatombe, Hacking, Perigos | a mesa gravada | a crônica gravada | o Covil gravado | o Thriller gravado | a Mesa gravada | a mesa de Ordem II gravada | — |

Status e atributo, no ajuste rápido, são do núcleo: todo modelo de ficha tem
essas listas.

## As regras de compatibilidade

Os únicos lugares que decidem o sistema de um registro que não o diz. São
exceções históricas, escritas de propósito, e **nunca** o padrão de um registro
novo — ficha nova nasce com `tipoFicha`, campanha nova com `sistema`:

- **Ficha sem `tipoFicha`** (anterior ao campo): Universal —
  `SISTEMA_DAS_FICHAS_ANTIGAS`, igual nos dois lados.
- **Campanha sem `sistema`** (anterior à v4.0): Ordem Paranormal; Oblívio se a
  mesa da v3.0 estava ligada nela (a coluna `CAMPANHA_OBLIVIO.ativo`) —
  `sistemaDeCampanhaAntiga`. Ler não grava nada; o sistema fica escrito quando o
  mestre salva as configurações. `ler_campanha` devolve `sistemaHerdado: true`
  enquanto isso.

Um identificador de sistema que esta versão não conhece **não** cai em regra
nenhuma: fica como veio. A ficha abre só para leitura, com o aviso, e o cartão
da mesa mostra só a identificação — nunca vira Universal, porque gravá-la como
Universal seria convertê-la em silêncio.

## O sistema de uma campanha

- **Na criação**, o mestre escolhe o sistema (`criar_campanha` recusa sem ele).
- O sistema decide as **abas** da campanha: Combate (Ordem e Universal), a
  mesa da Testemunha (Oblívio), as mecânicas opcionais de Ordem (Hexatombe,
  Hacking, Perigos, ligadas em Configurações) e o que **o servidor aceita**:
  uma ferramenta de outro sistema responde `outro_sistema`
  (`exigirFerramenta`).
- **Trocar** é do mestre, em Configurações → Sistema da campanha. Antes de
  confirmar, a tela diz o que fica suspenso, o que passa a valer, o que volta
  guardado e quantas fichas vinculadas são de outro sistema. A troca:
  - não converte ficha nenhuma e não desvincula ninguém;
  - não apaga nada: as abas do sistema anterior (`CAMPANHA_HEXATOMBE`,
    `CAMPANHA_OBLIVIO`, os combates…) ficam como estão, só recusadas;
  - devolve tudo como estava ao voltar ao sistema anterior (`ler_campanha`
    lista em `guardadas` as ferramentas de outro sistema com estado gravado).
- Uma ficha de um sistema numa campanha de outro continua com o cartão do
  sistema dela, mas sem as ferramentas de mesa da campanha (o combate de uma
  campanha Universal, por exemplo, não conta turnos nas condições de uma ficha
  de Ordem: quem conta é o sistema da CAMPANHA).

## Como entra um sistema novo

Um exemplo: **BRUTAL** (implementado na v7.0 seguindo exatamente estes passos — ver `docs/BRUTAL.md`). Ordem Paranormal RPG II (v9.0) entrou do mesmo jeito, como sistema À PARTE de `ordem` — ver `docs/ORDEM2.md`. Uma arte de capa que não seja 2:3 declara `capaEncaixe: "conter"` no registro do site: o componente mostra a imagem inteira, sem cortar.

1. **Registro do site** — uma entrada em `js/sistemas.js`: id `brutal`, nome,
   capa (opcional), `ficha` (bloco, motor, abas, bloco superior, resumo) e
   `campanha` (mestre, ferramentas, mecânicas).
2. **Registro do servidor** — a mesma entrada em `SISTEMAS_DO_RAMA` e uma
   linha em `MODULOS_DE_SISTEMA` apontando para `sistemaBrutal()`.
3. **Regras no site** — `js/brutal/` com o motor (`normalizar`, `fichaVazia`,
   o cálculo do resumo) e `js/brutal/telas/` com as seções da ficha.
4. **Servidor** — `backend/Brutal.gs` com `sistemaBrutal()` e os ganchos que
   ele precisar (projeção e painel, no mínimo; rotas, se tiver ferramentas de
   mesa).
5. **Criação** — a função de criação em `CRIACOES`
   (`js/paginas/personagens.js`) e o resumidor do cartão em
   `RAMAPainelMesa.registrar` (`js/campanha-painel.js`).
6. **Testes** — o teste de registro dos dois lados já confere que eles dizem
   o mesmo.

Nada no núcleo precisa saber que Brutal existe além do registro.
