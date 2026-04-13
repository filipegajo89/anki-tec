# 📖 Guia Completo de Instalação — TEC → Anki + Obsidian + Podcast

> **Versão:** 1.0 | **Data:** Abril 2026  
> **Autor:** filipegajo  
> Este guia foi feito para pessoas **sem experiência técnica**. Siga cada passo na ordem.

---

## 📋 O que este sistema faz?

1. **Você resolve questões** no TEC Concursos normalmente
2. **O script detecta** as questões que você **errou**
3. **A IA (Gemini)** analisa seu erro e cria **flashcards cirúrgicos**
4. **Os flashcards vão para o Anki** automaticamente, organizados por matéria
5. **Uma nota detalhada** é salva no Obsidian com enunciado, comentário do professor e análise da IA
6. **Bônus:** Você pode gerar **podcasts** a partir das suas notas de erro usando NotebookLM + Claude

---

## 🧩 O que precisa instalar (visão geral)

| Programa | Para que serve | Obrigatório? |
|----------|---------------|--------------|
| Google Chrome | Navegador principal | ✅ Sim |
| Tampermonkey | Roda o script no TEC | ✅ Sim |
| Anki | App de flashcards | ✅ Sim |
| AnkiConnect | Plugin que permite o script enviar cards pro Anki | ✅ Sim |
| Obsidian | App de anotações | ⭐ Recomendado |
| Obsidian Local REST API | Plugin que permite o script salvar notas | ⭐ Recomendado |
| Chave API do Gemini | IA que gera os flashcards | ✅ Sim |
| Claude Desktop + MCPs | Gerar podcasts dos seus erros | 🎧 Opcional |

---

# PARTE 1 — Instalação Base (Anki + Obsidian + Script)

---

## Passo 1: Instalar o Google Chrome

> Se você já usa o Chrome, pule para o Passo 2.

### Mac
1. Abra o Safari
2. Vá em [google.com/chrome](https://www.google.com/chrome)
3. Clique em **"Fazer download do Chrome"**
4. Abra o arquivo `.dmg` baixado
5. Arraste o ícone do Chrome para a pasta **Aplicativos**
6. Abra o Chrome pela pasta Aplicativos

### Windows
1. Abra o Edge (vem com o Windows)
2. Vá em [google.com/chrome](https://www.google.com/chrome)
3. Clique em **"Fazer download do Chrome"**
4. Abra o arquivo `.exe` baixado
5. Siga as instruções de instalação
6. O Chrome abrirá automaticamente

---

## Passo 2: Instalar o Tampermonkey

O Tampermonkey é uma extensão do Chrome que permite rodar scripts em sites.

1. Abra o Chrome
2. Vá em: [chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
3. Clique em **"Usar no Chrome"** (botão azul)
4. Na janela que aparecer, clique em **"Adicionar extensão"**
5. Você verá um ícone novo no canto superior direito do Chrome (um quadrado preto)

✅ **Tampermonkey instalado!**

---

## Passo 3: Instalar o Anki

O Anki é o app de flashcards com repetição espaçada.

### Mac
1. Vá em [apps.ankiweb.net](https://apps.ankiweb.net)
2. Clique em **"Download"** na versão para macOS
   - Se seu Mac é de **2020 ou mais novo** (chip M1/M2/M3/M4), baixe a versão **Apple Silicon**
   - Se é **mais antigo**, baixe a versão **Intel**
   - **Não sabe qual?** Clique no menu  (maçã) no canto superior esquerdo → **"Sobre este Mac"** → veja se diz "Apple M1/M2/M3" ou "Intel"
3. Abra o arquivo `.dmg` baixado
4. Arraste o Anki para a pasta **Aplicativos**
5. Abra o Anki pela pasta Aplicativos
6. Se aparecer "Anki é de um desenvolvedor não identificado": vá em **Ajustes do Sistema → Privacidade e Segurança** e clique "Abrir Mesmo Assim"

### Windows
1. Vá em [apps.ankiweb.net](https://apps.ankiweb.net)
2. Clique em **"Download"** na versão para Windows
3. Abra o arquivo `.exe` baixado
4. Siga o instalador (Next → Next → Install → Finish)
5. Abra o Anki pelo menu Iniciar

✅ **Anki instalado!**

---

## Passo 4: Instalar o AnkiConnect (plugin do Anki)

O AnkiConnect permite que o script envie flashcards para o Anki automaticamente.

1. **Abra o Anki** (se não estiver aberto)
2. No menu superior, clique em **Ferramentas** → **Complementos** (ou **Tools** → **Add-ons**)
3. Clique em **"Obter Complementos..."** (ou **"Get Add-ons..."**)
4. Na caixa de texto, digite este código: **`2055492159`**
5. Clique em **OK**
6. Aguarde o download terminar
7. **Reinicie o Anki** (feche e abra de novo)

### ⚠️ Configuração importante (liberar acesso)

1. No Anki, vá em **Ferramentas → Complementos**
2. Selecione **"AnkiConnect"** na lista
3. Clique em **"Configurar"** (ou **"Config"**)
4. No texto que aparecer, encontre a linha `"webCorsOriginList"` e certifique-se que ela contém `"*"`:
   ```json
   "webCorsOriginList": ["*"]
   ```
5. Clique **OK** e reinicie o Anki

> 💡 **IMPORTANTE:** O Anki precisa estar **aberto** sempre que você for usar o script. Se o Anki estiver fechado, os flashcards não serão salvos.

✅ **AnkiConnect instalado e configurado!**

---

## Passo 5: Instalar o Obsidian

O Obsidian salva notas detalhadas de cada questão que você errou.

> Se você não quiser usar o Obsidian, pode pular para o Passo 7. O script funciona só com o Anki também.

### Mac
1. Vá em [obsidian.md/download](https://obsidian.md/download)
2. Baixe a versão para macOS
3. Abra o `.dmg` e arraste para **Aplicativos**
4. Abra o Obsidian

### Windows
1. Vá em [obsidian.md/download](https://obsidian.md/download)
2. Baixe a versão para Windows
3. Execute o instalador
4. Abra o Obsidian

### Criar um Vault (cofre de notas)

1. Ao abrir o Obsidian pela primeira vez, ele pergunta o que fazer
2. Clique em **"Criar novo vault"** (ou **"Create new vault"**)
3. Dê um nome, por exemplo: `Meu Estudo`
4. Escolha onde salvar (pode ser na pasta Documentos)
5. Clique em **Criar**

> 📝 **Anote o nome do vault** — você vai precisar dele no Passo 8.

✅ **Obsidian instalado!**

---

## Passo 6: Instalar o plugin Local REST API no Obsidian

Este plugin permite que o script salve notas automaticamente no Obsidian.

1. **Abra o Obsidian** com o vault que você criou
2. Clique no ícone de **engrenagem ⚙️** no canto inferior esquerdo
3. Na barra lateral, clique em **"Plugins da comunidade"** (ou **"Community plugins"**)
4. Se for a primeira vez, clique em **"Ativar plugins da comunidade"** e confirme
5. Clique em **"Procurar"** (ou **"Browse"**)
6. Na barra de busca, digite: **`Local REST API`**
7. Clique no resultado **"Local REST API"** (por Adam Coddington)
8. Clique em **"Instalar"**
9. Depois que instalar, clique em **"Ativar"**

### Configurar o plugin

1. Ainda nas configurações, clique em **"Local REST API"** na lista de plugins ativos
2. Você verá um campo **"API Key"** — copie esse texto (ou defina uma chave sua)
3. A porta padrão é **27123** — não precisa mudar
4. Certifique-se de que o toggle **"Enable"** está ativo

> 📝 **Anote a API Key** — você vai precisar dela no Passo 8.

> 💡 **IMPORTANTE:** O Obsidian precisa estar **aberto** com este vault sempre que for usar o script.

✅ **Local REST API instalado e configurado!**

---

## Passo 7: Obter a chave API do Gemini (IA do Google)

A chave API é gratuita e permite que o script use a IA do Google para analisar seus erros.

1. Abra o Chrome e vá em: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Faça login com sua **conta Google**
3. Clique em **"Criar chave de API"** (ou **"Create API Key"**)
4. Selecione qualquer projeto (ou crie um novo — pode ser "Meu Projeto")
5. A chave será gerada — é um texto longo começando com **`AIzaSy...`**
6. **Copie a chave** (clique no ícone de copiar ao lado dela)

> ⚠️ **GUARDE ESSA CHAVE EM UM LUGAR SEGURO!**  
> Não compartilhe com ninguém e não publique na internet.  
> Se alguém usar sua chave, o Google pode bloquear.

> 📝 **Anote a chave API** — você vai usar ela no Passo 8.

✅ **Chave API do Gemini obtida!**

---

## Passo 8: Instalar e configurar o script TEC → Anki

Agora vamos instalar o script que faz tudo funcionar.

### 8.1 — Instalar o script

1. Abra o Chrome
2. Vá em: [github.com/filipegajo89/anki-tec/raw/main/public/tec-to-anki.user.js](https://github.com/filipegajo89/anki-tec/raw/main/public/tec-to-anki.user.js)
3. O Tampermonkey vai detectar automaticamente e mostrar uma tela de instalação
4. Clique em **"Instalar"** (ou **"Install"**)

> Se a tela do Tampermonkey não aparecer:
> 1. Clique no ícone do Tampermonkey (quadrado preto) no Chrome
> 2. Clique em **"Criar um novo script"**
> 3. Apague tudo que estiver lá
> 4. Copie e cole todo o conteúdo do arquivo `tec-to-anki.user.js`
> 5. Pressione **Ctrl+S** (Windows) ou **Cmd+S** (Mac) para salvar

### 8.2 — Configurar o script

1. Abra o TEC Concursos no Chrome: [tecconcursos.com.br](https://www.tecconcursos.com.br)
2. Faça login na sua conta do TEC
3. Abra qualquer caderno ou questão
4. Você verá uma **barra flutuante** no canto inferior direito com botões coloridos
5. Clique no botão **⚙️** (engrenagem) — o painel de configurações abrirá

### 8.3 — Preencher as configurações

No painel que abriu, preencha:

| Campo | O que colocar |
|-------|---------------|
| **Gemini API Key** | Cole a chave API que você copiou no Passo 7 (`AIzaSy...`) |
| **Modelo Gemini** | Deixe em `gemini-2.5-flash` (padrão) |
| **Método Obsidian** | Escolha `REST API (automático)` |
| **Nome do Vault** | O nome do vault que você criou no Passo 5 (ex: `Meu Estudo`) |
| **Token Obsidian** | Cole a API Key do plugin Local REST API (Passo 6) |
| **Porta Obsidian** | Deixe `27123` (padrão) |
| **Pasta Base** | `TEC` (as notas serão salvas em TEC/Matéria/Assunto/) |
| **Prefixo do Deck Anki** | Um nome para o deck principal (ex: `Meus Erros`) |
| **Nome do Modelo Anki** | Deixe `TEC Concursos` (padrão) |

6. Marque ou desmarque:
   - ☑️ **Mostrar preview** — mostra uma prévia antes de salvar (recomendado)
   - ☑️ **Salvar no Anki** — ativa o envio para o Anki
   - ☑️ **Salvar no Obsidian** — ativa o envio para o Obsidian

7. Clique em **💾 Salvar**

✅ **Script instalado e configurado!**

---

## Passo 9: Testar tudo

### Checklist antes de testar:
- [ ] Chrome aberto com o TEC Concursos logado
- [ ] Anki aberto
- [ ] Obsidian aberto com o vault correto
- [ ] Script do Tampermonkey ativo (verifique: ícone do Tampermonkey → script "TEC → Anki + Obsidian" deve estar ✅)

### Teste rápido:
1. No TEC, abra um caderno que você **já resolveu** e **errou** alguma questão
2. Navegue até uma questão **errada**
3. Pressione **Shift + Enter** no teclado
4. O script vai:
   - Mostrar um loading "Processando..."
   - Chamar a IA do Gemini
   - Mostrar uma prévia dos flashcards gerados
   - Ao confirmar, salvar no Anki e no Obsidian
5. Abra o Anki — você verá um novo deck com os cards!
6. Abra o Obsidian — haverá uma nova nota em `TEC/Matéria/Assunto/`

### Teste do modo em lote (batch):
1. No caderno, clique no botão **📋 Erros** na barra flutuante
2. O script pergunta quantos erros processar
3. Confirme e ele processará **todas as questões erradas** automaticamente
4. Ao final, um aviso fica fixo na tela até você fechar (✕)

✅ **Tudo funcionando!** 🎉

---

# PARTE 2 — Pipeline de Podcasts (Opcional)

> Esta parte permite que você gere **podcasts** a partir das suas notas de erro.  
> Dois "hosts" de IA discutem seus erros em português — ótimo para revisar no trânsito.  
> **Requer:** Claude Desktop (app pago da Anthropic)

---

## Passo 10: Instalar o Claude Desktop

1. Vá em [claude.ai/download](https://claude.ai/download)
2. Baixe a versão para seu sistema (Mac ou Windows)
3. Instale normalmente
4. Abra e faça login com sua conta Anthropic

> 💡 O Claude Desktop precisa de um plano pago (Pro) para usar os MCPs.

---

## Passo 11: Instalar o `uv` (gerenciador Python)

O `uv` é necessário para instalar a ferramenta que conecta ao NotebookLM.

### Mac
1. Abra o **Terminal** (Aplicativos → Utilitários → Terminal, ou busque "Terminal" no Spotlight com Cmd+Espaço)
2. Cole este comando e pressione Enter:
   ```
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
3. Feche e abra o Terminal novamente
4. Verifique digitando: `uv --version` — deve mostrar algo como `uv 0.11.x`

### Windows
1. Abra o **PowerShell** (clique com botão direito no menu Iniciar → "Windows PowerShell")
2. Cole este comando e pressione Enter:
   ```
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```
3. Feche e abra o PowerShell novamente
4. Verifique digitando: `uv --version`

✅ **uv instalado!**

---

## Passo 12: Instalar o notebooklm-mcp-cli

Esta ferramenta permite controlar o NotebookLM por comandos.

### Mac (Terminal) ou Windows (PowerShell)
```
uv tool install notebooklm-mcp-cli
```

Aguarde a instalação (pode levar 1-2 minutos).

Verifique: `nlm --version` — deve mostrar `nlm version 0.5.x`

✅ **notebooklm-mcp-cli instalado!**

---

## Passo 13: Autenticar no NotebookLM

O script precisa de permissão para acessar seu NotebookLM.

### Mac (Terminal) ou Windows (PowerShell)
```
nlm login
```

1. O Chrome vai abrir automaticamente
2. Faça login com sua **conta Google** (a mesma que você usa no NotebookLM)
3. Quando o login terminar, o terminal mostrará: `✓ Successfully authenticated!`
4. Pronto! Os cookies ficam salvos por ~2-4 semanas

> 🔁 Quando os cookies expirarem, basta rodar `nlm login` de novo.

Para verificar se está tudo ok: `nlm login --check`

✅ **Autenticado no NotebookLM!**

---

## Passo 14: Instalar o Node.js

Necessário para o MCP de acesso a arquivos.

> Se você já tem Node.js instalado (verifique com `node --version`), pule este passo.

### Mac
1. Vá em [nodejs.org](https://nodejs.org)
2. Baixe a versão **LTS** (recomendada)
3. Abra o `.pkg` e siga o instalador
4. Reinicie o Terminal
5. Verifique: `node --version` e `npx --version`

### Windows
1. Vá em [nodejs.org](https://nodejs.org)
2. Baixe a versão **LTS** (recomendada)
3. Execute o instalador (Next → Next → Install)
4. Reinicie o PowerShell
5. Verifique: `node --version` e `npx --version`

✅ **Node.js instalado!**

---

## Passo 15: Configurar os MCPs no Claude Desktop

Agora vamos configurar o Claude Desktop para poder ler suas notas e gerar podcasts.

### 15.1 — Descobrir o caminho do vault do Obsidian

Você precisa saber **onde está a pasta do vault** no seu computador.

**Mac (Terminal):**
```
cat "$HOME/Library/Application Support/obsidian/obsidian.json"
```

**Windows (PowerShell):**
```
Get-Content "$env:APPDATA\obsidian\obsidian.json"
```

O resultado vai mostrar algo como:
```json
{"vaults":{"abc123":{"path":"/Users/seunome/Meu Estudo"}}}
```

O caminho é o que está em `"path"` — no exemplo: `/Users/seunome/Meu Estudo`

> 📝 **Anote esse caminho** — vamos usar no próximo passo.

### 15.2 — Descobrir o caminho do notebooklm-mcp

**Mac (Terminal):**
```
which notebooklm-mcp
```

**Windows (PowerShell):**
```
where.exe notebooklm-mcp
```

Vai mostrar algo como: `/Users/seunome/.local/bin/notebooklm-mcp`

> 📝 **Anote esse caminho também.**

### 15.3 — Criar a pasta de Podcasts

**Mac (Terminal):**
```
mkdir -p "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Podcasts"
```
> Isso cria uma pasta "Podcasts" no seu iCloud Drive, que sincroniza com o iPhone.

**Windows (PowerShell):**
```
New-Item -ItemType Directory -Path "$env:USERPROFILE\Documents\Podcasts" -Force
```

### 15.4 — Editar o arquivo de configuração do Claude Desktop

**Mac (Terminal):**
```
open "$HOME/Library/Application Support/Claude/"
```
> Vai abrir a pasta no Finder. Procure o arquivo `claude_desktop_config.json`.

**Windows (PowerShell):**
```
explorer "$env:APPDATA\Claude"
```
> Vai abrir a pasta no Explorer. Procure o arquivo `claude_desktop_config.json`.

Se o arquivo **não existir**, crie um novo arquivo chamado `claude_desktop_config.json`.

Abra o arquivo com um editor de texto (Bloco de Notas no Windows, TextEdit no Mac) e edite para ter este conteúdo:

> ⚠️ **Substitua os caminhos** pelos seus caminhos reais que você anotou acima!

#### Mac:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/SEUNOME/CAMINHO-DO-VAULT/TEC",
        "/Users/SEUNOME/Library/Mobile Documents/com~apple~CloudDocs/Podcasts"
      ]
    },
    "notebooklm-mcp": {
      "command": "/Users/SEUNOME/.local/bin/notebooklm-mcp",
      "env": {
        "NOTEBOOKLM_HL": "pt"
      }
    }
  }
}
```

#### Windows:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\SEUNOME\\CAMINHO-DO-VAULT\\TEC",
        "C:\\Users\\SEUNOME\\Documents\\Podcasts"
      ]
    },
    "notebooklm-mcp": {
      "command": "C:\\Users\\SEUNOME\\.local\\bin\\notebooklm-mcp.exe",
      "env": {
        "NOTEBOOKLM_HL": "pt"
      }
    }
  }
}
```

> ⚠️ **ATENÇÃO:** Se o arquivo já tinha conteúdo (como `"preferences": {...}`), adicione o bloco `"mcpServers"` **dentro** do JSON existente, sem apagar o que já estava lá. Exemplo:
> ```json
> {
>   "preferences": {
>     ...o que já estava aqui...
>   },
>   "mcpServers": {
>     ...o bloco novo...
>   }
> }
> ```

5. **Salve o arquivo**
6. **Reinicie o Claude Desktop** (feche completamente e abra de novo)

✅ **Claude Desktop configurado!**

---

## Passo 16: Testar o pipeline de podcasts

1. Abra o **Claude Desktop**
2. Verifique se os MCPs estão conectados:
   - Clique no ícone de ferramentas/MCP (geralmente um martelo 🔨 ou plug 🔌)
   - Devem aparecer: **filesystem** e **notebooklm-mcp**
3. Digite esta mensagem no Claude:

> Leia todas as minhas notas na pasta TEC/Direito Constitucional, consolide por subtópico, crie um notebook no NotebookLM chamado "DCON - Revisão", adicione o conteúdo como fonte, gere um podcast no formato deep_dive, e salve o áudio na pasta Podcasts.

4. O Claude vai executar automaticamente:
   - Ler suas notas do Obsidian
   - Criar um notebook no NotebookLM
   - Gerar um podcast (demora 2-5 minutos)
   - Baixar o áudio e salvar na pasta Podcasts

5. **No iPhone (Mac):** Abra o app **Arquivos** → **iCloud Drive** → **Podcasts** — o áudio estará lá!
6. **No Windows:** Abra a pasta `Documentos/Podcasts`

✅ **Pipeline de podcasts funcionando!** 🎙️

---

# ❓ Perguntas Frequentes

### O Anki precisa estar aberto?
**Sim.** O Anki precisa estar aberto para o script enviar os flashcards. Se o Anki estiver fechado, você verá um erro "Failed to connect to AnkiConnect".

### O Obsidian precisa estar aberto?
**Sim**, se você usar o método REST API (recomendado). O plugin Local REST API só funciona com o Obsidian aberto.

### Posso usar só o Anki sem o Obsidian?
**Sim!** Nas configurações do script (⚙️), desmarque "Salvar no Obsidian". O script vai gerar flashcards e enviar só para o Anki.

### A chave API do Gemini é paga?
**Não!** O uso gratuito do Gemini é suficiente. A Google oferece uma cota generosa grátis. Você só pagaria se fizesse centenas de milhares de requisições.

### Como atualizar o script?
Se houver uma versão nova:
1. Clique no ícone do Tampermonkey → "Painel de Controle"
2. Encontre "TEC → Anki + Obsidian" na lista
3. Clique no nome para editar
4. Apague tudo e cole a versão nova
5. Salve com Ctrl+S (Windows) ou Cmd+S (Mac)

### Os cookies do NotebookLM expiraram, o que faço?
Rode `nlm login` no Terminal/PowerShell novamente. Demora 30 segundos.

### Posso usar em mais de um computador?
**Sim!** Instale tudo em cada computador seguindo este guia. As configurações do script (chave API, vault, etc.) são **por navegador** — você terá que configurar em cada um.

### O modo em lote parou no meio, perdi algo?
**Não!** As questões já processadas foram salvas no Anki e Obsidian. Quando rodar novamente, o script pula questões já processadas (detecta por ID).

---

# 🆘 Solução de Problemas

| Problema | Solução |
|----------|---------|
| "Failed to connect to AnkiConnect" | Abra o Anki. Ele precisa estar aberto. |
| "API key do Gemini não configurada" | Clique em ⚙️ na barra flutuante e cole sua chave API. |
| "Gemini API error 403" | Sua chave foi bloqueada. Gere uma nova em [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| "Obsidian REST API error" | Abra o Obsidian. Verifique se o plugin Local REST API está ativo. |
| Barra flutuante não aparece | Verifique: Tampermonkey → o script está ativo (✅)? Você está no tecconcursos.com.br? |
| "Nenhum erro detectado" no batch | O caderno precisa ter questões erradas. O script pode pedir para digitar manualmente. Veja a aba "Estatísticas". |
| Flashcards não aparecem no Anki | Verifique: Anki aberto? AnkiConnect instalado? `webCorsOriginList` configurado com `["*"]`? |
| Podcast não gerou | Verifique: `nlm login --check`. Se expirou, rode `nlm login`. |

---

# 📱 Dica: Ouvir podcasts no iPhone

Para uma experiência melhor que o app Arquivos:

1. Instale o app **Pocket Casts** (grátis na App Store)
2. Abra o Pocket Casts → **Arquivos** (Files)
3. Importe os MP3/M4A do iCloud Drive
4. Pronto! Você tem controle de **velocidade** (1.5x, 2x), **pular silêncio**, **timer de sono**, etc.

---

_Guia criado em abril/2026. Para dúvidas ou problemas, abra uma issue em [github.com/filipegajo89/anki-tec](https://github.com/filipegajo89/anki-tec)._
