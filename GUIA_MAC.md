# 📚 Guia de Instalação — macOS

> **TEC → Anki + Obsidian + Podcasts**
> Tudo que você precisa para transformar seus erros do TEC Concursos em flashcards, notas e podcasts.

---

## 🚀 Instalação Rápida (Recomendado)

Temos um **script automático** que faz quase tudo por você!

### Como usar:

1. Abra o **Terminal** (pressione `Cmd + Espaço`, digite `Terminal` e pressione Enter)

2. Cole este comando e pressione **Enter**:

```bash
bash <(curl -sL https://raw.githubusercontent.com/filipegajo89/anki-tec/main/install_mac.sh)
```

3. Siga as instruções na tela (leva ~15 minutos)

> 💡 **Nunca usou o Terminal?** Não se preocupe! Você só precisa colar o comando acima e o script faz o resto. Ele vai perguntar sua senha do Mac (é normal) e guiar você passo a passo.

---

## 📋 O que o script instala automaticamente

| Programa | Para que serve |
|----------|---------------|
| **Homebrew** | Gerenciador de pacotes (instala os outros programas) |
| **Google Chrome** | Navegador onde o script funciona |
| **Anki** | Programa de flashcards com repetição espaçada |
| **Obsidian** | Programa para organizar suas notas de estudo |
| **Node.js** | Necessário para o MCP filesystem |
| **uv** | Gerenciador Python moderno |
| **notebooklm-mcp-cli** | CLI para gerar podcasts via NotebookLM |

---

## 👤 O que você precisa fazer manualmente

O script **abre os links e mostra instruções** para cada passo manual:

### 1. Tampermonkey (extensão do Chrome)

O script abre a Chrome Web Store automaticamente.

- Clique em **"Usar no Chrome"** → **"Adicionar extensão"**

### 2. Script TEC → Anki

O script abre o link de instalação automaticamente.

- O Tampermonkey mostra uma tela de confirmação
- Clique em **"Instalar"**

### 3. AnkiConnect (plugin do Anki)

No Anki:

1. **Ferramentas** → **Complementos** → **Obter Complementos**
2. Digite o código: **`2055492159`**
3. Clique OK e reinicie o Anki
4. Vá em **Ferramentas** → **Complementos** → **AnkiConnect** → **Configurar**
5. Encontre `webCorsOriginList` e mude para:
   ```json
   "webCorsOriginList": ["*"]
   ```
6. Clique OK e reinicie o Anki

### 4. Local REST API (plugin do Obsidian)

No Obsidian:

1. Clique na ⚙️ engrenagem (canto inferior esquerdo)
2. Vá em **Plugins da comunidade** → **Procurar**
3. Busque: **"Local REST API"**
4. Instale e ative
5. Nas configurações do plugin, copie a **API Key**

### 5. Chave API do Gemini

O script abre o Google AI Studio automaticamente.

1. Faça login com sua conta Google
2. Clique em **"Criar chave de API"**
3. Copie a chave (começa com `AIzaSy...`)

> ⚠️ **IMPORTANTE:** A chave é gratuita, mas guarde-a em segredo!

### 6. Configurar o Script

No TEC Concursos (qualquer página de questão):

1. Clique no botão ⚙️ na barra flutuante (canto inferior direito)
2. Preencha:
   - **Gemini API Key**: sua chave do passo 5
   - **Nome do Vault**: nome do seu vault do Obsidian
   - **Token Obsidian**: API Key do passo 4
   - **Porta Obsidian**: `27123`
   - **Pasta Base**: `TEC`
   - **Prefixo do Deck**: escolha (ex: `Meus Erros`)
3. Clique **💾 Salvar**

---

## 🎯 Como Usar

### Gerar flashcards de UMA questão

1. Abra o **Anki** e o **Obsidian**
2. No TEC Concursos, resolva um caderno
3. Na questão que errou, pressione **`Shift + Enter`**
4. O script gera o flashcard e salva no Anki + Obsidian

### Gerar flashcards de TODAS as questões erradas

1. Abra o **Anki** e o **Obsidian**
2. No caderno (página de correção), clique em **📋 Erros** na barra flutuante
3. O script processa todas as questões erradas automaticamente

### Gerar podcasts com NotebookLM

1. Abra o **Claude Desktop**
2. Digite algo como:
   > "Leia minhas notas de Direito Constitucional na pasta TEC e gere um podcast no NotebookLM"
3. O Claude vai usar os MCPs para ler suas notas e criar o podcast
4. O áudio será salvo no **iCloud Drive → Podcasts**

---

## ⚠️ Problemas Comuns

| Problema | Solução |
|----------|---------|
| "Shift+Enter não faz nada" | Verifique se Anki e Obsidian estão abertos |
| "Erro de conexão com Anki" | Verifique se AnkiConnect está instalado (código `2055492159`) |
| "Erro de conexão com Obsidian" | Verifique se o plugin Local REST API está ativo |
| "Erro de API Gemini" | Verifique se a chave está correta em ⚙️ |
| "O script não aparece no TEC" | Verifique se o Tampermonkey está ativo (ícone no Chrome) |
| "Homebrew pede senha" | É normal! Digite sua senha do Mac (não aparece na tela enquanto digita) |
| "nlm login falhou" | Rode `nlm login` no Terminal novamente |

---

## 🔄 Atualizações

O script do TEC se atualiza automaticamente pelo Tampermonkey.

Para atualizar o notebooklm-mcp-cli:
```bash
uv tool upgrade notebooklm-mcp-cli
```

---

## 🗂️ Onde ficam as coisas

| O quê | Onde |
|-------|------|
| Flashcards | Anki → Deck com seu prefixo |
| Notas | Obsidian → pasta `TEC/` |
| Podcasts | iCloud Drive → pasta `Podcasts/` |
| Config Claude | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Config Anki | `~/Library/Application Support/Anki2/` |

---

## ❓ FAQ

**P: Preciso pagar alguma coisa?**
R: Não! Todos os programas são gratuitos. A API do Gemini tem cota gratuita generosa.

**P: Funciona offline?**
R: O Anki e Obsidian funcionam offline, mas a geração de flashcards e podcasts precisa de internet.

**P: Posso usar no Safari?**
R: Não. O Tampermonkey funciona melhor no Chrome.

**P: O script funciona em cadernos que já fiz?**
R: Sim! Basta voltar ao caderno no TEC Concursos.

**P: Como desinstar tudo?**
R: No Terminal, rode:
```bash
brew uninstall --cask anki obsidian google-chrome
uv tool uninstall notebooklm-mcp-cli
```
E remova o Tampermonkey pelo Chrome.
