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
| **Servidor** | `Dados.gs`, `Codigo.gs`, `Campanhas.gs`, `Sistemas.gs` | `Ordem.gs`, `Oblivio.gs`, `Vampiro.gs`, `Universal.gs` |
| **Site** | `js/*.js`, `js/paginas/` (telas da plataforma e seções de ficha comuns: Geral, Perícias, Habilidades, Rituais, Inventário, Anotações, Aliados) | `js/ordem/` e `js/ordem/telas/`, `js/oblivio/` e `js/oblivio/telas/`, `js/vampiro/` e `js/vampiro/telas/`; o modelo Universal usa as seções comuns |

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
  - `ficha.abas` e `ficha.blocoSuperior`: as seções da ficha.
  - `ficha.resumo`: o resumo que a mesa lê sem abrir a ficha (campo e função
    do motor).
  - `ficha.modulosConfiguraveis`, `ficha.periciasPadrao`, `ficha.pontos`.
  - `campanha.mestre` (Mestre, Testemunha), `campanha.ferramentas` e
    `campanha.mecanicas`.
- **Servidor — `backend/Sistemas.gs`** (`SISTEMAS_DO_RAMA`): id, nome, arquivo,
  ferramentas e mecânicas. Os ganchos de cada sistema vêm de uma função
  `sistema<Nome>()` no arquivo dele (`MODULOS_DE_SISTEMA`), pedida só quando
  usada — o Apps Script não garante a ordem dos arquivos.

### Os ganchos do servidor

| Gancho | Quem chama | Ordem | Oblívio | Vampiro | Universal |
|---|---|---|---|---|---|
| `rotas()` | `rotaDe()` (Codigo.gs) | efeito, resumo, Hexatombe, Hacking, Perigos, Sincronia | `ler_oblivio`, `salvar_oblivio`, `oblivio_operar` | `ler_vampiro`, `salvar_vampiro`, `vampiro_operar` | — |
| `fichaDoSistema(ficha)` | `moduloDaFicha` | tem o bloco `ordem` | tem o bloco `oblivio` | tem o bloco `vampiro` | — |
| `projecao(ficha)` | a projeção do painel | bloco do painel, itens, resumo | a Persona do painel | `resumoParaMesa`, calculado com o motor | atributos e status |
| `painel(proj, o)` | `listar_personagens_campanha` | o cartão de Ordem | o da Persona | trilhas, Fome, Humanidade, Potência (ou só clã e natureza) | atributos e status |
| `recursosNoCombate(proj)` | a lista do combate | PV/PE/SAN/PD e condições | — | — | status |
| `turnosNasFichas(...)` | `atualizar_combate` | condições e efeitos por turno | — | — | — |
| `resumo` | criar/salvar personagem | `resumoRecursos` | — | — | — |
| `ajustes` | `ajustar_personagem` | o alvo `recurso` | — | — | — |
| `estadoDasMecanicas` | `ler_campanha` | Hexatombe, Hacking, Perigos | a mesa gravada | a crônica gravada | — |

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

Um exemplo: **Brutal** (não implementado nesta versão).

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
