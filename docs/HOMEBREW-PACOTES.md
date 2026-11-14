# Pacotes de Homebrew — v9.6

Na página **Homebrew**, além de **Minhas criações** e **Públicas**, há a aba
**Pacotes**: coleções que a conta monta com criações da própria biblioteca,
para um sistema do registro (incluindo **Universal**), com nome, descrição e
capa. Um pacote é para compartilhar com uma mesa e deixar cada pessoa
escolher o que copiar.

Importar um pacote não registra suplemento oficial nem liga regra opcional
em ficha nenhuma: só cria cópias na biblioteca de quem importa.

## Na tela

- **+ Criar pacote** e **Abrir com código** em destaque na aba.
- **Meus pacotes** e **Pacotes públicos**:
  - busca por nome e filtro por sistema;
  - estados de vazio, carregando e erro;
  - o aviso de instalação quando o servidor ainda não tem as abas.
- **Cartões em forma de livro**: a capa na moldura 2:3 das capas dos
  sistemas, ou uma lombada neutra com nome e sistema. As capas chegam em
  lote, só as dos cartões visíveis.
- **Criar ou editar** é um editor em três etapas:
  1. **Sistema e capa**: sistema pelas capas, nome (até 80), descrição
     (até 1500) e capa opcional.
  2. **Conteúdo**:
     - a biblioteca do dono, com busca, filtro por tipo, seleção múltipla e
       contador "N de 40";
     - o que não cabe aparece desabilitado, com o motivo;
     - o que já está no pacote pode ser removido ou marcado **Atualizar pela
       criação original**, quando o original mudou.
  3. **Revisão**: a prévia (capa, sistema, nome, descrição, conteúdo
     agrupado por tipo, remover) e a visibilidade, com o aviso sobre as
     cópias.
  - Fechar com mudanças pede confirmação, e o rascunho sobrevive ao editor
    de capa.
- **O pacote nasce Privado.**

### Capa

O destino `pacote` do `RAMAEditorImagem` (`js/imagem-editor.js`) é o mesmo
editor das capas de campanha e dos avatares:

- moldura 2:3, com prévia, arraste, zoom e **Usar imagem**;
- o arquivo final tem sempre **320 × 480 px** (o recorte, não o original);
- o cartão mostra a imagem com `object-fit: cover` numa moldura da mesma
  proporção, sem segundo corte nem distorção;
- um GIF é convertido para imagem estática, com o aviso no editor;
- cancelar o recorte mantém o rascunho e a capa anterior;
- é possível trocar ou remover a capa.

## Compatibilidade (tela e servidor dizem o mesmo)

| Criação | Cabe em |
|---|---|
| item, arma, armadura, mochila, habilidade | qualquer sistema (inclusive os sem editor nativo de criatura, como BRUTAL) |
| ritual | sistemas cuja ficha tem a aba Rituais no registro (`js/sistemas.js`): Ordem Paranormal e Universal |
| criatura | só o sistema **nativo** dela. Uma criatura de Ordem sem o bloco de ameaça é Universal. O R.A.M.A. nunca converte uma ficha de um sistema para outro. |

O motivo de indisponibilidade aparece na seleção, e o servidor recusa com
`incompativel` e a lista. `testes/executar-pacotes.js` confere, para cada
sistema e cada tipo, que tela e servidor dão a mesma resposta com o mesmo
texto.

## Acesso

| Acesso | Como funciona |
|---|---|
| **Público** | Contas autenticadas acham na galeria, abrem o link direto (`homebrew/?pacote=<id>`) e importam. Só o dono edita, muda a visibilidade ou exclui. |
| **Privado** | Só o dono, ou uma conta que apresenta o **código** gerado pelo R.A.M.A. O id sozinho não abre capa, lista, detalhes nem importação: a resposta é igual à de um pacote que não existe. |
| **Cópia importada** | Fica na biblioteca de quem importou, privada e editável, com `pacote: { id, entradaId, nome, rev, importadoEm }` (aparece no rodapé da consulta). Revogar o código, mudar ou excluir o pacote não toca nela. |

### Código

- **Gerar código**, **Copiar**, **Gerar novo código** e **Revogar acesso
  por código**, na tela do dono.
- Tem 16 símbolos de um alfabeto de 32 (sem 0, 1, I, O), em 4 grupos: 80
  bits tirados de `novoSegredo()`.
- O servidor guarda só o **hash** (com o pepper do servidor). O código em
  claro aparece **uma vez**, na geração.
- Gerar outro invalida o anterior. Revogar apaga. **Público → privado
  também apaga**: só um novo compartilhamento deliberado reabre.
- Cada leitura (`ler_pacote`, `ler_capas_pacotes`) e cada importação
  conferem o código de novo.
- Não vai no endereço nem para o armazenamento do navegador: vive na
  memória da página e vai no corpo dos pedidos.
- Código inválido, revogado ou trocado responde `codigo_invalido`, sem
  revelar que existe um pacote privado.

## Importar

- **Abrir com código** mantém a pessoa na aba Pacotes e mostra a prévia:
  capa, título, sistema, descrição, quantidade e a lista agrupada por tipo,
  com **Consultar**.
- Dá para escolher **Importar tudo** ou só as marcadas. O que já está na
  biblioteca aparece como "Já na sua biblioteca".
- **Resultado**: quantas foram copiadas, quantas já existiam, o que falhou
  (com o motivo) e o atalho **Ver Minhas criações**.
- Um erro de conexão preserva a seleção, e o reenvio usa o mesmo opId.
- **Cópia**: ids novos e campos nativos preservados (blocos de sistema,
  efeitos, versões). A imagem da criatura vai junto, copiada da entrada.
- **Recibos** (`PACOTES_HOMEBREW_IMPORTACOES`): reconhecem reenvio e cópia
  já feita, sem tocar nas edições de quem importou. Se a pessoa apagar a
  cópia, a entrada pode vir de novo.
- **Mesma revisão**: a importação leva o `rev` da prévia. Se o dono mudou o
  pacote, a resposta é `pacote_mudou` e nada é copiado; a tela recarrega e
  pede para revisar o conteúdo novo.
- **Falha parcial**: cada entrada é independente. O que entrou fica, e o
  restante pode ser importado de novo.

## Conteúdo estável

Cada entrada é uma **cópia** dos dados da criação no momento da inclusão.
Editar, ocultar ou apagar o original não muda o pacote. O dono vê "Original
mudou" ou "Original apagado" e escolhe, de forma explícita, **Atualizar pela
criação original**.

Nome, descrição, capa e visibilidade mudam sem recriar o conteúdo. Excluir o
pacote avisa que as cópias já importadas continuam com quem importou.

## Servidor (`backend/HomebrewPacotes.gs`)

### Rotas

Todas exigem sessão.

| Rota | O que faz |
|---|---|
| `listar_pacotes {escopo}` | `meus` (qualquer estado) ou `publicos` (de outras contas, públicos e prontos). Leve: sem capa e sem conteúdo. |
| `ler_pacote {pacoteId, codigo?}` | Metadados, descrição e entradas completas. Para o dono, também a origem; para quem pede, `importada`. |
| `abrir_pacote_codigo {codigo}` | Acha o pacote pelo hash do código. |
| `ler_capas_pacotes {pacoteIds ≤ 24, codigo?}` | As capas que a conta alcança (a mesma conferência do pacote). |
| `salvar_pacote {pacoteId?, rev, opId, dados, conteudo?, capa?}` | Cria ou atualiza; detalhes abaixo. |
| `codigo_pacote {pacoteId, tipo: gerar\|revogar}` | Só o dono. |
| `excluir_pacote {pacoteId}` | Só o dono. Leva entradas, imagens, capa e recibos; as cópias importadas ficam. |
| `importar_pacote {pacoteId, codigo?, rev, opId, entradas ≤ 40}` | Copia as entradas pedidas para a biblioteca de quem pede. |

### `salvar_pacote`

- `conteudo` são **ids** (`manter`, `adicionar`, `atualizar`). O servidor
  lê as criações da biblioteca de quem pede, confere a posse e o sistema e
  copia dali. JSON de entrada não é aceito.
- O conteúdo inteiro é conferido antes de gravar qualquer coisa.
- `estado: "montando"` durante a troca das entradas. Uma execução que cai
  no meio não deixa um pacote válido para mais ninguém: o dono vê
  "Incompleto — salve de novo".
- `rev` errada responde `conflito`. O mesmo opId responde `repetida`
  (`opsJson`, ou `opCriacao` na criação).

### Limites

- 40 entradas por pacote e 30 pacotes por conta.
- Nome até 80 caracteres e descrição até 1500.
- Entrada até uma célula (45 000).
- Capa em até duas células (`imagemCont`).
- 40 entradas por importação e 24 capas por pedido.

O Homebrew individual (`listar/ler/salvar/excluir_homebrew`, imagens de
criatura) não mudou.

## Validação v9.6

### Automática

**`testes/pacotes-backend.js`**, com as rotas chamadas direto:

- compatibilidade: Vampiro em Ordem, ritual em Vampiro, BRUTAL e Universal;
- posse e JSON recusado;
- privado pelo id: lista, leitura, capa e importação;
- código: não fica em claro, o amigo lê e importa mas não edita nem exclui;
- importar parte, repetir o mesmo envio, um pedido novo da mesma entrada;
- originais editados e apagados não mudam pacote nem cópias;
- prévia velha recebe `pacote_mudou`; importar o resto; reimportar uma
  cópia apagada;
- Atualizar pela criação original;
- trocar e revogar o código;
- público, link e galeria, e de volta a privado (fecha o link e invalida o
  código);
- `montando`, capas inválidas, remover capa, limites e excluir.

**`testes/executar-pacotes.js`**: a matriz sistema × tipo igual na tela e no
servidor, agrupamento, código e o destino da capa.

**`testes/executar-editor-imagem.js`**: o destino `pacote` e a saída
320 × 480.

### Na interface

No servidor local, com duas contas sintéticas:

- **Dona**: montou "Dossiê do hospital" (duas criaturas, uma delas com
  imagem, um ritual e um item). Recortou a capa deslocada e conferiu o mesmo
  enquadramento na prévia e no cartão (320 × 480, mostrada 2:3). Salvou como
  privado e gerou o código.
- **Amigo**:
  - o pacote não aparece na galeria;
  - abriu com o código e consultou a criatura;
  - uma queda de conexão simulada preservou a seleção, e o reenvio usou o
    mesmo opId;
  - importou só uma criatura e o ritual;
  - repetir o envio não duplicou;
  - as cópias apareceram em Minhas criações com a procedência e a imagem.
- **Revogação**: a dona revogou o código. O amigo não abre mais (nem a
  capa), e as duas cópias continuam.
- **Edição pela tela**: cancelar o recorte manteve capa e rascunho, e o foco
  voltou ao botão da capa. Publicou: o link abriu para uma terceira conta e
  o pacote apareceu na galeria. De volta a privado, o link responde "não
  encontrado".
- **BRUTAL**: só o item genérico disponível.
- Celular (375 px, sem rolagem lateral), desktop, Legacy e Modern20.

## Publicar a v9.6

**Servidor:**

1. Adicione **`HomebrewPacotes.gs`** (arquivo novo) e troque **`Dados.gs`**
   e **`Codigo.gs`**.
2. **Rode `setupRama()`**: ele cria as abas `PACOTES_HOMEBREW`,
   `PACOTES_HOMEBREW_ENTRADAS`, `PACOTES_HOMEBREW_IMAGENS`,
   `PACOTES_HOMEBREW_CAPAS` e `PACOTES_HOMEBREW_IMPORTACOES`.
3. Crie uma versão nova da implantação.

Sem o arquivo, as rotas respondem `acao_desconhecida`. Sem `setupRama`,
respondem `instalacao_incompleta`, e a aba explica. O pepper
(`gerarPepper`) já existe em toda instalação.

**Site:** `js/pacotes-homebrew.js`, `js/paginas/homebrew-pacotes.js`,
`js/paginas/homebrew.js`, `js/imagem-editor.js`, `js/api.js`,
`homebrew/index.html`, `css/homebrew.css`, `css/modern20/homebrew.css` e
`js/versao.js`.
