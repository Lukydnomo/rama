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
  index.html            Home: painel do agente
  personagens/          lista de personagens
  campanhas/            campanhas (base)
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
    ui.js               avisos, janelas, menus, indicadores
    app.js              casca: cabeçalho, navegação, preferências
    paginas/            um arquivo por tela

  backend/
    Codigo.gs           o Apps Script inteiro (sem segredos)
    appsscript.json     manifesto do projeto

  docs/
    DATABASE.md         abas, colunas e o porquê de cada uma
    API.md              todas as ações, entradas e saídas
    CHARACTER_SCHEMA.md o formato da ficha, campo a campo
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

No navegador: abra `testes/`.
No terminal:

```bash
deno run --allow-read testes/executar.js
```

São os mesmos casos nos dois lugares. Cobrem o motor de dados (expressões
válidas e inválidas, dado principal, perícia, dano, crítico), a ficha padrão, o
peso do inventário, a normalização e a importação.

---

## Configurar do zero

### 1. Criar a planilha

Crie uma planilha nova no Google Drive. Copie o id da URL:

```
https://docs.google.com/spreadsheets/d/ISTO_AQUI_E_O_ID/edit
```

Não precisa criar aba nenhuma à mão — o passo 3 faz isso.

### 2. Criar o Apps Script

Em <https://script.google.com>, crie um projeto novo. Cole o conteúdo de
`backend/Codigo.gs` no editor (substituindo o `Codigo.gs` padrão).

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

4. **`conferirInstalacao()`** — diz o que ainda falta, se faltar algo.

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

Se a atualização acrescentar colunas, rode `setupRama()` de novo.

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

- **Campanhas são a base**: nome, descrição e vínculo de personagens. Não há
  nada de mestre (iniciativa, combate, NPCs, convites) — falta especificação, e
  inventar agora seria construir para desfazer depois.
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

1. Campanhas de verdade, quando a mesa souber o que precisa.
2. Auditoria: quem mudou o quê e quando, aproveitando o `rev` que já existe.
3. Compartilhar uma ficha em leitura com o mestre.
4. Aplicativo instalável (Service Worker) para a ficha abrir sem rede.
5. Condições e efeitos temporários, que hoje moram no bônus temporário.
