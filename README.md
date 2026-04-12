# 🚀 TEC → Anki + Obsidian

Automação completa: extrai questões do **TEC Concursos**, gera flashcards cirúrgicos com **Gemini AI** focados no seu erro, salva notas organizadas no **Obsidian** e envia cards para o **Anki** via AnkiConnect.

---

## 📋 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalar Tampermonkey + Userscript](#2-instalar-tampermonkey--userscript)
3. [Configurar Anki + AnkiConnect](#3-configurar-anki--ankiconnect)
4. [Configurar Obsidian](#4-configurar-obsidian)
5. [Primeiro uso](#5-primeiro-uso)
6. [Como usar](#6-como-usar)
7. [Estrutura no Obsidian](#7-estrutura-no-obsidian)
8. [Atalhos de teclado](#8-atalhos-de-teclado)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pré-requisitos

| Software | Versão | Link |
|----------|--------|------|
| **Google Chrome** (ou Firefox/Edge) | Qualquer | — |
| **Tampermonkey** (extensão do navegador) | 5.x+ | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| **Anki** (desktop) | 2.1.50+ | [apps.ankiweb.net](https://apps.ankiweb.net/) |
| **Obsidian** | 1.0+ | [obsidian.md](https://obsidian.md/) |
| **Conta TEC Concursos** | — | [tecconcursos.com.br](https://www.tecconcursos.com.br) |

---

## 2. Instalar Tampermonkey + Userscript

### 2.1 Instalar Tampermonkey

1. Abra a [Chrome Web Store — Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Clique **"Usar no Chrome"** → **"Adicionar extensão"**

### 2.2 Instalar o Userscript

**Opção A — Arrastar e soltar (mais fácil):**
1. Abra o arquivo `tec-to-anki.user.js` deste repositório no navegador
2. O Tampermonkey detectará automaticamente e abrirá a tela de instalação
3. Clique **"Instalar"**

**Opção B — Copiar e colar:**
1. Clique no ícone do Tampermonkey na barra do navegador → **"Criar novo script"**
2. Apague tudo e cole o conteúdo de `tec-to-anki.user.js`
3. Salve com `Ctrl+S`

---

## 3. Configurar Anki + AnkiConnect

### 3.1 Instalar AnkiConnect

1. Abra o **Anki Desktop**
2. Vá em **Ferramentas** → **Complementos** → **Obter Complementos...**
3. Cole o código: **`2055492159`**
4. Clique **OK** e reinicie o Anki

### 3.2 Configurar CORS (importante!)

1. Em **Ferramentas** → **Complementos**, selecione **AnkiConnect**
2. Clique em **Config**
3. Adicione `"https://www.tecconcursos.com.br"` na lista `webCorsOriginList`:

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "ignoreOriginList": [],
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOriginList": [
        "http://localhost",
        "https://www.tecconcursos.com.br"
    ]
}
```

4. Reinicie o Anki

> ⚠️ **O Anki precisa estar aberto** sempre que usar o userscript.

---

## 4. Configurar Obsidian

### 4.1 Criar o Vault

Se ainda não tem um vault:

1. Abra o **Obsidian**
2. Clique **"Criar novo vault"**
3. Nome sugerido: `Concursos` (ou o que preferir)
4. Escolha a pasta onde ficará

### 4.2 Instalar Plugins Obrigatórios

Vá em **Configurações** (⚙️) → **Plugins da comunidade** → **Procurar**:

#### Plugin 1: **Dataview** (consultas dinâmicas)
1. Busque **"Dataview"** por Michael Brenan
2. Instale e **ative**
3. Em **Opções do Dataview**, ative **"Enable JavaScript Queries"** e **"Enable Inline JavaScript Queries"**

#### Plugin 2: **Local REST API** (comunicação com o userscript)
1. Busque **"Local REST API"** por Adam Coddington
2. Instale e **ative**
3. Vá em **Opções do plugin** → copie o **API Key** (você vai colar no userscript)

> A porta padrão é `27124`. O plugin roda em HTTPS.

### 4.3 Copiar Templates para o Vault

Copie a pasta `obsidian-setup/TEC/` deste repositório para **dentro do seu vault**:

```
Seu Vault/
├── TEC/
│   ├── _Dashboard.md          ← Painel geral com queries Dataview
│   ├── _Estatisticas.md       ← Análise detalhada dos erros
│   └── Templates/
│       └── questao-template.md ← Template de referência
```

As questões serão salvas automaticamente em:
```
TEC/{Matéria}/{Subtópico}/Q{id}.md
```

### 4.4 Plugins Recomendados (opcionais)

| Plugin | Para quê |
|--------|----------|
| **Tag Wrangler** | Renomear/mover tags em massa |
| **Calendar** | Visualizar atividade por dia |
| **Templater** | Templates avançados |
| **Graph Analysis** | Visualizar conexões entre temas |

---

## 5. Primeiro Uso

1. **Abra o Anki** (mantenha aberto em segundo plano)
2. **Abra o Obsidian** (mantenha aberto em segundo plano)
3. Acesse o **TEC Concursos** e entre na sua conta
4. Abra qualquer **caderno de questões**

### 5.1 Configurar o Userscript

1. Você verá a toolbar flutuante no canto inferior direito: `📋 Salvar | 📋📋 Erros | ⚙️ | 🟢`
2. Clique no **⚙️** para abrir as configurações
3. Preencha:
   - **Gemini API Key:** já vem preenchida
   - **Nome do Vault:** o nome exato do seu vault no Obsidian
   - **REST API Token:** cole o token do plugin Local REST API
   - **Demais campos:** os padrões já estão bons
4. Clique **"🔌 Testar Conexões"** — ambos devem mostrar ✅
5. Clique **"💾 Salvar"**

### 5.2 Verificar o Status

O ponto colorido na toolbar indica:
- 🟢 **Verde:** Anki + Obsidian conectados
- 🟡 **Amarelo:** Apenas um conectado
- 🔴 **Vermelho:** Nenhum conectado

---

## 6. Como Usar

### Salvar uma questão (individual)

1. Responda uma questão no TEC
2. Abra o **Comentário do Professor** (clique em "Comentário em Texto" ou tecla `O`)
3. Pressione **`Shift+Enter`** ou clique no botão **"📋 Salvar"**
4. O script irá:
   - 🔍 Extrair dados da questão do DOM
   - 🤖 Gerar 2-3 flashcards com Gemini AI
   - 📋 Mostrar preview para confirmação
   - 💾 Salvar no Anki + Obsidian ao confirmar
5. Toast de sucesso aparece com resumo

### Processar todas as erradas (batch)

1. Esteja em um caderno de questões
2. Clique no botão **"📋📋 Erros"**
3. Confirme o processamento
4. O script percorre automaticamente todas as questões erradas
5. Barra de progresso mostra o andamento
6. Clique **"⏹️ Parar"** para interromper

### Salvar questões certas

O botão funciona em **qualquer questão respondida**, não apenas erradas. Para questões certas, a IA gera cards de reforço em vez de correção de erro.

---

## 7. Estrutura no Obsidian

### Organização de Pastas

```
TEC/
├── _Dashboard.md                         ← 📊 Painel geral
├── _Estatisticas.md                      ← 📉 Análise de erros
├── Direito Constitucional/
│   ├── Aplicabilidade das Normas/
│   │   ├── Q1796675.md                   ← Questão individual
│   │   └── Q1834521.md
│   └── Competencias da Uniao/
│       └── Q1456789.md
├── Direito Administrativo/
│   ├── Licitacoes/
│   │   └── Q2345678.md
│   └── Servidores Publicos/
│       └── Q3456789.md
├── Direito Tributario/
│   └── ...
└── Templates/
    └── questao-template.md
```

### Cada Nota Contém

- **Frontmatter YAML:** id, matéria, subtópico, banca, ano, cargo, tags, resultado, data, link
- **Enunciado** completo da questão
- **Alternativas** com marcação de resposta e gabarito
- **Comentário do Professor** na íntegra
- **Erro Identificado pela IA** — análise do mecanismo do erro
- **Flashcards Gerados** — tabela com frente/verso dos cards

### Queries Dataview

O `_Dashboard.md` inclui tabelas automáticas:
- Questões por matéria (total/erros/acertos/%)
- Últimos erros
- Erros por banca
- Atividade dos últimos 7 dias

O `_Estatisticas.md` oferece análise mais profunda:
- Subtópicos com mais erros
- Erros por mês
- Lista completa de erros

---

## 8. Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Shift + Enter` | Salvar questão atual (extrai → IA → Anki + Obsidian) |

> Os atalhos nativos do TEC continuam funcionando normalmente (→, L, O, F, etc.)

---

## 9. Troubleshooting

### "AnkiConnect: ❌ Não conectado"

- Verifique se o **Anki está aberto**
- Verifique se o add-on **AnkiConnect** está instalado (código `2055492159`)
- Reinicie o Anki após instalar o add-on
- Verifique se a porta `8765` não está bloqueada por firewall

### "Obsidian REST API: ❌ Não conectado"

- Verifique se o **Obsidian está aberto**
- Verifique se o plugin **Local REST API** está instalado e **ativado**
- Copie o token correto das opções do plugin
- A porta padrão é `27124` (HTTPS)

### "Não foi possível extrair a questão"

- Certifique-se de estar na **página de uma questão respondida**
- O comentário do professor deve estar **aberto** (clique "Comentário em Texto" primeiro)
- Use o **Discovery Mode** (menu Tampermonkey → 🔍) para diagnosticar
- Abra o console (F12) para ver detalhes técnicos

### "Erro na IA / Gemini"

- Verifique se a **API key** está correta nas configurações
- Verifique sua cota no [Google AI Studio](https://aistudio.google.com/)
- O script ainda salvará no Obsidian/Anki mesmo se a IA falhar (sem flashcards)

### Cards duplicados no Anki

- O script usa `allowDuplicate: false` — cards idênticos não serão duplicados
- Se quiser reprocessar, delete o card existente primeiro

### Nota não aparece no Obsidian

- Verifique se o **nome do vault** está correto nas configurações
- Verifique se o **token** do REST API está correto
- Tente o método **"URI Scheme"** como alternativa (não precisa de plugin)
- Como último recurso, use **"Clipboard"** e cole manualmente

---

## 🏗️ Arquitetura

```
┌─────────────────────────────┐
│     TEC Concursos           │
│     (Navegador)             │
│                             │
│  Userscript injeta botão    │
│  📋 Salvar (Shift+Enter)   │
└──────────┬──────────────────┘
           │ Extrai DOM
           ▼
┌─────────────────────────────┐
│     Gemini 2.0 Flash        │
│     (API REST)              │
│                             │
│  papiro_skill como system   │
│  instruction + dados da     │
│  questão → JSON estruturado │
│  com 2-3 flashcards         │
└──────────┬──────────────────┘
           │ JSON {materia, subtopico,
           │       erro_identificado, cards[]}
           ▼
┌────────────────┐  ┌────────────────┐
│  AnkiConnect   │  │  Obsidian      │
│  :8765         │  │  REST API      │
│                │  │  :27124        │
│ createDeck     │  │                │
│ addNotes       │  │ PUT /vault/... │
│ (2-3 cards)    │  │ (.md com YAML) │
└────────────────┘  └────────────────┘
```

---

## 📜 Licença

Uso pessoal. Feito para otimizar estudos para concursos públicos.
