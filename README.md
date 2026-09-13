# R.A.M.A.

**Rede de Arquivamento Multiversal de Agentes** — sistema pessoal de fichas de
RPG: personagens, rolagens, inventário, homebrew e anotações.

Site estático no GitHub Pages, backend em Google Apps Script, dados numa
planilha do Google. Sem build, sem npm, sem servidor próprio.

```
Navegador  ──POST JSON──►  Apps Script (app da Web)  ──►  Google Sheets
(GitHub Pages)                  toda a segurança            fonte da verdade
```

A planilha é a **fonte da verdade**. `localStorage` guarda só a sessão e
preferências de tela — nunca é tratado como banco.

---

## Estrutura

```
/
  index.html            Home: apresentação do sistema e por onde começar
  personagens/          lista de personagens
  campanhas/            lista de campanhas
  campanha/             uma campanha (?id=...)
  homebrew/             biblioteca de itens
  perfil/               conta, exibição e importação
  ficha/                a ficha (?id=...)
  testes/               casos de teste, no navegador e no terminal

  css/
    tokens.css          cor, espaço, traço, tempo — os valores literais
    base.css            reset, @font-face, tipografia, véu de CRT
    componentes.css     botão, campo, painel, cartão, modal, aviso…
    layout.css          cabeçalho, navegação, listas, rodapé
    ficha.css           só o que é exclusivo da ficha

  js/
    config.js           ÚNICO arquivo a editar ao publicar
    util.js             ids, datas, números, DOM, comparação canônica
    rede.js             transporte: POST, prazos, retentativas
    api.js              uma função por ação do servidor
    auth.js             sessão, portão de entrada, guarda de página
    dados.js            motor de dados — o único Math.random do sistema
    ficha.js            modelo da ficha, padrões e normalização
    validacao.js        validação central, incluindo importação
    sync.js             conciliação de três vias e tela de conflito
    salvar.js           debounce, fila, backoff, revisão
    imagem.js           recorte, redução e compressão de foto
    importar.js         janela de importação com prévia
    ui.js               avisos, janelas, menus, indicadores, recolhível
    app.js              casca: cabeçalho, navegação, preferências, changelog
    versao.js           FONTE ÚNICA da versão e do changelog
    habilidades.js      modelo e árvore recursiva de habilidades
    criaturas.js        mini ficha de criatura
    fila.js             fila de gravação por entidade
    campanha-painel.js  o que cada cartão do painel da mesa mostra (sem fórmula própria)
    ordem/              as regras de Ordem Paranormal, em camada própria
      catalogo.js       origens, classes, trilhas, perícias e patentes
      poderes.js        poderes de classe, gerais, paranormais e de trilha
      progressao.js     vagas de escolha, requisitos, pendências e efeitos
      inventario.js     espaços, quantidade e categoria dos itens
      personalizacao.js versões personalizadas e exclusão de habilidades oficiais
      biblioteca.js     o catálogo arrumado para a janela "Da biblioteca"
      regras.js         os cálculos, com a composição de cada número
      opcionais.js      as regras opcionais, uma chave para cada
    historico.js        rolagem → histórico da campanha, num funil só
    paginas/            um arquivo por tela

  backend/
    Dados.gs            esquema das abas e acesso ao Sheets
    Codigo.gs           núcleo: sessão, personagens, homebrew, perfil
    Campanhas.gs        campanhas, rolagens, documentos, notas, combates
    appsscript.json     manifesto do projeto

  docs/
    DATABASE.md         abas, colunas e o porquê de cada uma
    API.md              todas as ações, entradas e saídas
    CHARACTER_SCHEMA.md o formato da ficha, campo a campo
    PERMISSIONS.md      quem alcança o quê, e onde isso é decidido
    CAMPAIGNS.md        campanhas, combate, histórico e criaturas
    PERFORMANCE.md      o que custa caro, o que foi feito e como medir
    ORDEM-REGRAS.md     matriz de regras de Ordem: fonte, página e lacunas
```

---

## Como rodar localmente

Não há build. Sirva a pasta por HTTP — **debaixo de um subdiretório**, para um
caminho absoluto esquecido quebrar aqui e não na publicação:

```bash
python -m http.server 8099 --directory ..
```

E abra `http://localhost:8099/rama/`.

`file://` também abre, mas o `localStorage` fica instável — prefira HTTP.

### Testes

São três conjuntos.

**Modelo e motor de dados** — 1084 verificações. No navegador, abra `testes/`;
no terminal:

```bash
deno run --allow-read testes/executar.js
```

Cobrem expressões de dado válidas e inválidas, dado principal, perícia, dano,
crítico, a ficha padrão, peso do inventário, habilidades e a árvore recursiva,
rituais, versões de ritual com dano, rótulos compartilhados, categorias,
migração de ficha antiga, importação e versionamento. E a camada de Ordem
Paranormal: catálogo, fórmulas conferidas contra exemplos dos livros,
recálculo que não acumula bônus nem restaura recurso gasto, regras opcionais e
a separação entre nível e NEX; o motor de progressão — cada tipo de pendência,
requisitos e repetição, concessão automática sem duplicação, revisão com
dependências, afinidade (inclusive adiada e Homebrew), patente com limites
manuais, carga por quantidade e o ajuste temporário de capacidade.

**Permissões e concorrência do backend** — 307 verificações:

```bash
deno run --allow-read testes/executar-backend.js
```

Carregam os três arquivos do Apps Script num simulador da plataforma
(`testes/apps-script-simulado.js`) e entram por `doPost`, como uma requisição de
verdade. É onde se confirma que um usuário não alcança o que não é dele —
inclusive mandando o pedido direto, sem passar pela interface. Cobrem também
revisão conflitante, gravação repetida, cache ausente, revogação de sessão,
contenção da trava e planilha com as colunas fora de ordem.

**Transporte do frontend** — 28 verificações:

```bash
deno run --allow-read testes/executar-frontend.js
```

O site e o Apps Script são publicados separadamente e podem estar em versões
diferentes. Estes testes trancam as duas regras que valem nesse intervalo: o
lote é otimização e não requisito, e o portão de login só aparece quando o
problema é mesmo a sessão.

**Custo das operações** — não é teste, é medição:

```bash
deno run --allow-read testes/medir.js
```

Ver [docs/PERFORMANCE.md](docs/PERFORMANCE.md) para o que esses números podem e
não podem dizer.

---

## Configurar do zero

### 1. Criar a planilha

Crie uma planilha nova no Google Drive. Copie o id da URL:

```
https://docs.google.com/spreadsheets/d/ISTO_AQUI_E_O_ID/edit
```

Não precisa criar aba nenhuma à mão — o passo 3 faz isso.

### 2. Criar o Apps Script

Em <https://script.google.com>, crie um projeto novo.

São **três arquivos**, e os três precisam existir:

1. cole `backend/Codigo.gs` no editor, substituindo o `Codigo.gs` padrão;
2. crie um arquivo chamado **`Campanhas`** (o botão `+` ao lado de
   Arquivos) e cole `backend/Campanhas.gs` nele;
3. crie um arquivo chamado **`Dados`** e cole `backend/Dados.gs` nele.

> O Apps Script lê todos os `.gs` no mesmo escopo e iça as declarações de
> função entre arquivos, então a ordem em que eles aparecem não importa.
> São três por manutenção — separar arquivos não deixa nada mais rápido.
>
> Faltando o `Dados.gs`, o sistema não tem como ler nada, e toda ação
> responde `instalacao_incompleta` em vez de uma pilha de execução.
> `conferirInstalacao()` diz qual arquivo está faltando.

Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto
appsscript.json" e cole o conteúdo de `backend/appsscript.json`.

Ainda em Configurações do projeto → **Propriedades do script**, adicione:

| Propriedade        | Valor                                            |
|--------------------|--------------------------------------------------|
| `RAMA_PLANILHA_ID` | o id copiado no passo 1                          |
| `RAMA_ITERACOES`   | `10000` (opcional — veja "Senhas" abaixo)        |

O `RAMA_PEPPER` **não** se preenche à mão: o passo 3 gera.

### 3. Preparar o banco

No editor do Apps Script, rode estas funções, nesta ordem, pelo seletor de
função (autorize o acesso quando o Google pedir):

1. **`setupRama()`** — cria as abas e os cabeçalhos.
   Pode rodar quantas vezes quiser: não apaga nada e não sobrescreve aba já
   configurada. Quando uma versão futura acrescentar colunas, é ela que as
   acrescenta.

2. **`gerarPepper()`** — cria o segredo do servidor, **uma única vez**.
   Trocar o pepper depois invalida todas as senhas já cadastradas.

3. **`criarPrimeiroUsuario()`** — abra a função, troque o usuário, o nome e a
   senha pelos seus, salve e rode.
   **Depois apague a senha do editor.**

4. **`conferirInstalacao()`** — diz o que ainda falta, se faltar algo. Também
   confere, aba por aba, se o cabeçalho ainda tem todas as colunas que o
   código procura.

5. **`diagnosticarLogin("usuario")`** — só quando um login certo for recusado.
   Diz se o pepper existe, se a conta foi encontrada e está ativa, se o
   cabeçalho de `USUARIOS` está são e se a derivação da senha roda. Não
   imprime hash, sal nem pepper, e não conta qual foi a senha testada.

### 4. Publicar o app da Web

**Implantar → Nova implantação → Tipo: App da Web**

| Campo            | Valor              |
|------------------|--------------------|
| Executar como    | **Eu**             |
| Quem tem acesso  | **Qualquer pessoa**|

Copie a URL que termina em `/exec`.

> "Qualquer pessoa" libera o **endereço**, não os dados. Sem token válido toda
> ação responde erro. É o que permite um site no GitHub Pages conversar com o
> script sem exigir login do Google de cada pessoa.

### 5. Apontar o frontend

Em `js/config.js`:

```js
window.RAMA_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfy.../exec",
  ...
};
```

É o único arquivo do frontend que muda. Nunca coloque aqui senha, hash, sal, id
de planilha ou qualquer segredo — este arquivo é público.

### 6. Testar a conexão

Abra o site, entre, vá em **Perfil → Testar conexão**. Ele mostra o tempo de
resposta e o nome da planilha.

---

## Publicar no GitHub Pages

1. Suba os arquivos para o repositório.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, pasta `/`.
3. O site sai em `https://SEU-USUARIO.github.io/rama/`.

Todos os caminhos do projeto são relativos e a raiz é descoberta a partir do
próprio `<script src>`, então funciona debaixo de subpasta sem ajuste.

**A pasta `backend/` vai junto, e isso é intencional**: o `Codigo.gs` não contém
segredo nenhum — ele os lê das Script Properties. Publicá-lo não expõe nada.

### Atualizar o backend

Cole a versão nova no editor do Apps Script e faça **Implantar → Gerenciar
implantações → editar (lápis) → Versão: Nova versão**. Editar a implantação
existente mantém a mesma URL; criar uma implantação nova gera outra URL e
exigiria mexer no `config.js`.

Se a atualização acrescentar abas ou colunas, rode `setupRama()` de novo. Ele
cria só o que falta e nunca apaga o que existe.

---

## Senhas

Ficam **só** no Apps Script, e nunca em texto:

- derivadas com PBKDF2-HMAC-SHA256, sal por usuário e um *pepper* do servidor;
- o pepper vive nas Script Properties, **fora da planilha** — quem conseguir uma
  cópia do arquivo ainda não consegue testar senhas;
- a comparação é de tempo constante;
- oito tentativas erradas bloqueiam o usuário por 15 minutos.

`RAMA_ITERACOES` controla o custo. Rode **`medirDerivacao()`** para ver quanto
tempo o seu projeto leva; algo entre 300 ms e 1,5 s é um bom alvo. Menos protege
pouco, mais irrita quem entra.

Para trocar uma senha: `trocarSenha('usuario', 'nova-senha')` no editor — ela
encerra as sessões daquele usuário junto. Apague a senha do editor depois.

Para acrescentar alguém: `criarUsuario('login', 'Nome', 'senha')`.

---

## Fontes

A identidade usa a família **PixelMplus**, que tem licença própria e **não
acompanha este repositório**. Sem ela o sistema cai na monoespaçada do sistema
operacional e continua inteiro — só muda a letra.

Para instalar, veja `assets/fonts/LEIA-ME.md`.

---

## Como o sistema se comporta

**Salvamento.** A tela muda na hora; o envio vai atrás, juntando alterações
seguidas num só POST (400 ms). Só uma gravação voa por vez — o que chegar
durante o voo entra na fila. O indicador diz sempre onde as coisas estão:
`Salvo`, `Salvando…`, `Alterações pendentes`, `Sem conexão`, `Erro ao salvar`,
`Conflito`.

**Conflito.** Cada registro tem uma revisão. Se ela mudou no servidor, a
gravação é recusada e o estado atual volta junto. O sistema compara três
versões — a última confirmada, a desta tela e a do servidor — e junta sozinho
tudo o que não se cruzou. Só o que os dois lados mudaram vira pergunta, com os
dois valores lado a lado. **Nada do que foi digitado desaparece.**

**Rede.** Leitura pode ser repetida (com espera crescente); gravação não, para
não duplicar registro. "Sem internet" e "o servidor recusou" são mensagens
diferentes, porque são problemas diferentes.

**Permissão.** O servidor confere o dono em **toda** leitura e **toda**
gravação. O `ownerId` nunca vem do pedido: é derivado da sessão. Trocar o id no
console não abre o registro de outra conta.

---

## Limitações conhecidas

- **O histórico de rolagens é lido inteiro do lado do servidor** antes de ser
  paginado. Para uma mesa isso é irrelevante; para dezenas de milhares de
  linhas, o mestre precisará limpar o histórico de vez em quando.
- **Um mestre só por campanha na interface.** O banco já guarda o papel por
  membro e aceita mais de um mestre, mas a tela não oferece promover ninguém.
- **Combate não tem grid, distância, turno automático nem condições.** Nada
  disso foi especificado.
- **Uma ficha cabe numa célula** (~45 000 caracteres de JSON). É muito para uma
  ficha normal, mas anotações muito longas podem esbarrar; o servidor recusa com
  `dados_grandes` em vez de truncar.
- **A foto é uma miniatura** de 256 px, comprimida no navegador. A original
  nunca sobe.
- **Sem histórico de alterações.** Há `criadoEm` e `atualizadoEm`; o schema está
  preparado para auditoria, mas ela não foi construída.
- **O freio de tentativas usa CacheService**, que é volátil. Ele cumpre a janela
  de 15 minutos, mas não sobrevive a uma reinicialização do projeto.
- **Histórico de rolagens vive só na aba** e não sobe para a planilha.
- **A biblioteca Homebrew não versiona.** Editar um modelo não muda as fichas
  que já o usam — isso é de propósito —, mas também não há como ver o que mudou.

## Próximos passos sugeridos

1. Auditoria: quem mudou o quê e quando, aproveitando o `rev` que já existe.
2. Promover um segundo mestre pela interface (o banco já suporta).
3. Aplicativo instalável (Service Worker) para a ficha abrir sem rede.
4. Condições e efeitos temporários, que hoje moram no bônus temporário.
5. Turno e rodada no combate, se a mesa quiser.

---

## Versionamento

**A versão do sistema vive só em `js/versao.js`**, e é sempre o primeiro
registro do `CHANGELOG`. O rodapé lê dali; clicar nele abre o histórico.

Três números diferentes, que não se misturam:

| | Onde | O que é |
|---|---|---|
| versão do aplicativo | `js/versao.js` | o que a pessoa vê: v2.0.0 |
| `schemaVersion` | `js/ficha.js` | o formato da FICHA |
| `versaoFormato` | `js/config.js` | o formato dos arquivos de importação |

A cada entrega: um registro novo no topo, com codinome inédito e a data real.
PATCH para correções, MINOR para funcionalidades, MAJOR para mudança de fase —
e os números de baixo zeram ao subir. As regras completas estão comentadas no
próprio `js/versao.js`.

---

## O primeiro acesso é lento — e isso é normal

O Apps Script **hiberna**. Depois de um tempo parado, a primeira chamada precisa
subir o contêiner de execução no Google, e isso pode passar de meio minuto. As
seguintes respondem na hora. É o motivo de "só a primeira vez dá erro".

O R.A.M.A. lida com isso sozinho:

- **A primeira tentativa tem prazo curto de propósito** (12 s). Se o servidor
  estiver dormindo, ela vai estourar de qualquer jeito — e abortar o pedido
  **não cancela a execução do lado do Google**, que continua e acaba de acordar
  o contêiner. A tentativa seguinte, com prazo maior, encontra tudo quente.
- **Leituras e gravações idempotentes repetem sozinhas** quando o prazo estoura.
  Só as ações que criam registro é que não repetem — repetir `criar_personagem`
  criaria dois personagens.
- **A tela de entrada acorda o servidor enquanto você digita a senha**, com um
  ping disparado assim que ela aparece. Os segundos de arranque acontecem
  durante a digitação.
- Se a espera passar da primeira tentativa, a tela de carregamento **explica**
  que o servidor está acordando, em vez de ficar com uma barra andando sem dizer
  nada.

Se mesmo assim o erro aparecer com frequência, há dois ajustes:

1. **`TEMPO_LIMITE_MS` em `js/config.js`** — aumente (o padrão é 30 000 ms por
   tentativa).
2. **`RAMA_ITERACOES` nas Script Properties** — este afeta só o *login*. Rode
   `medirDerivacao()` no editor do Apps Script: se as iterações estiverem
   levando muitos segundos, o login soma esse tempo ao arranque. Um alvo
   razoável é de 300 ms a 1,5 s.
