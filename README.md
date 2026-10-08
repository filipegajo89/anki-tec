# 🚀 TEC → Anki + Obsidian

Automação completa: extrai questões do **TEC Concursos**, gera flashcards cirúrgicos com **GPT 5.6 Luna (xhigh)** e os valida com um **Auditor GLM 5.2** via OpenCode Zen ou OpenCode Go, salva notas organizadas no **Obsidian** e envia os cards para o **Anki** via AnkiConnect.

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

1. Você verá a barra compacta no canto inferior direito: **Marcar card · Mapa · Mais (⋯)**.
2. Abra **Mais (⋯) → Configurações**.
3. Preencha:
   - **Serviço OpenCode:** escolha `Zen` (créditos pay-as-you-go) ou `Go` (assinatura). O Zen continua selecionado por padrão; cada serviço sincroniza seu catálogo público sem misturar credenciais
   - **OpenCode API Key:** cole a chave do serviço escolhido; as credenciais de Zen e Go ficam salvas separadamente
   - **Pipeline:** mantenha `Dual estrito` para usar Luna xhigh como Creator e GLM 5.2 como Auditor; se um deles falhar, nenhum modelo substituto salva cards silenciosamente
   - **Modelos:** GPT 5.6 Luna, GPT 6 Luna e GLM 5.2 aparecem em `⭐ Recomendados`, no topo. Os dois Luna rodam em `xhigh`; o GPT 6 Luna é mais novo e custa metade, mas o padrão continua o 5.6 até você trocar. Se necessário, use `⭐ Aplicar Zen + Luna xhigh + GLM 5.2`; os seletores continuam livres para futuras trocas, e Zen ↔ Go também muda rota e catálogo automaticamente
   - **Nome do Vault:** o nome exato do seu vault no Obsidian
   - **REST API Token:** cole o token do plugin Local REST API
   - **Demais campos:** os padrões já estão bons
4. Clique **"🔌 Testar Conexões"** — o teste confirma separadamente o Creator e o Auditor selecionados
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
3. Pressione **`Shift+Enter`** ou abra **Mais (⋯) → Gerar questão atual**.
4. O script irá:
   - 🔍 Extrair dados da questão do DOM
   - 🧠 Gerar até 2 flashcards com GPT 5.6 Luna em `xhigh`
   - ⚖️ Revisar os cards com o Auditor configurado
   - 📋 Mostrar preview para confirmação
   - 💾 Salvar no Anki + Obsidian ao confirmar
5. Toast de sucesso aparece com resumo

### Processar todas as erradas (batch)

1. Esteja em um caderno de questões
2. Abra **Mais (⋯) → Processar erros do caderno**.
3. Confirme o processamento
4. O script percorre automaticamente todas as questões erradas
5. Barra de progresso mostra o andamento
6. Clique **"⏹️ Parar"** para interromper

### Salvar questões certas

**Gerar questão atual** funciona em **qualquer questão respondida**, não apenas erradas. Para questões certas, a IA gera cards de reforço em vez de correção de erro.

### Escolher cards enquanto resolve o caderno (v1.18.0)

1. Clique em **Marcar card**, na barra inferior, quando quiser revisar a questão depois. Pode marcar antes de responder ou após acertar. O controle passa a mostrar **Marcada**; clique novamente para desmarcar.
2. Clique em **Mapa** para abrir o painel recolhível com os números das questões do caderno. Clique no número para marcar ou desmarcar; uma seleção fica azul e recebe um pequeno check. A questão atual tem contorno escuro. Pontos verdes indicam acertos já lidos e vermelhos, erros. Questões ainda não visitadas ficam sem ponto. Cadernos maiores têm páginas de 100 questões.
3. As escolhas ficam salvas neste navegador, separadas por caderno, inclusive após recarregar a página. Abrir o mapa ou marcar uma caixa não inicia a geração.
4. Clique em **Gerar cards** quando terminar. O script percorre o caderno, coleta apenas as escolhidas e volta à posição inicial. Confira a seleção e o raciocínio, gere com o Creator + Auditor e revise os cards antes de salvar.
5. A marcação é removida quando os cards são salvos nos destinos habilitados. Questões com dados/gabarito indisponíveis, geração cancelada, duplicatas recusadas ou falha de salvamento continuam marcadas. **Parar** interrompe as ações automáticas na posição atual.

**Mais (⋯) → Processar erros do caderno** continua oferecendo a coleta de questões erradas. A seleção manual não muda um acerto para erro nem altera respostas no TEC. Quando uma questão já conhecida muda de posição no caderno, sua seleção acompanha o ID; posições ainda não visitadas são vinculadas ao ID na primeira coleta.

Na v1.18.1, a barra reúne somente seleção, mapa e o menu **Mais**. Geração individual, erros, raciocínio, revisão de véspera, reformulação e configurações ficam nesse menu, com ícones vetoriais e status das conexões. O mapa usa uma legenda curta e mostra navegação de páginas somente quando necessária. Feche os painéis pelo botão, por Escape ou, no menu Mais, clicando fora.

Na v1.19.2, a coleta das marcadas usa **Acessar questão pelo número**, do próprio TEC, para saltar somente às escolhidas e voltar à posição inicial. Se esse controle estiver indisponível, percorre por setas somente a distância necessária entre os alvos. Exemplo: começar na 5 com 8 e 17 marcadas resulta em **5 → 8 → 17 → 5**, sem passar pela questão 1. A posição e o ID são conferidos após cada salto; uma falha ou divergência mantém as marcações e interrompe a geração. **Parar** continua interrompendo sem navegar de volta.

Na **v1.19.5**, o mapa coleta as marcadas diretamente pela API do TEC, usando sua sessão, sem trocar a questão aberta. Isso evita depender de cliques e da renderização da aba em segundo plano. Se uma marcação antiga estiver na posição errada, o script procura o ID no caderno e atualiza a posição, preservando a escolha. Marcações ainda sem posição aparecem em um bloco recolhível do mapa. Uma transição incompleta entre ID e número não altera mais as escolhas; índices de alternativas recebidos como texto também são aceitos. Ao finalizar ou interromper, uma consulta final preserva o marcador de retomada do TEC na questão que está aberta, sem navegar pela tela. O desempenho pessoal é consultado pelo ID confirmado para preservar a contagem de erros usada no Obsidian. Se algum dado essencial faltar, o aviso informa a questão e a causa, mantém as marcações e interrompe antes da IA. O fluxo de seleção, Creator + Auditor e revisão antes de salvar continua igual.

### Exportar as questões para planilha (v1.21.0)

1. Abra **Mais (⋯) → Exportar para planilha**.
2. Escolha **questão atual**, **marcadas**, **caderno inteiro** ou **próximo lote do caderno**. Os lotes podem ter **15, 20 ou 30 questões** e continuam da próxima questão pendente em uma execução futura.
3. Escolha **dois mais votados** ou **dois primeiros na ordem por data** para o fórum.
4. Clique em **Coletar próximo lote** ou **Coletar e baixar**. O arquivo **CSV UTF-8**, separado por ponto e vírgula, abre no Excel. Cada questão ocupa uma linha, com enunciado, alternativas, gabarito disponível, metadados, comentário do professor, desempenho geral/pessoal e dois comentários do fórum.
5. **Dados completos (JSON)** preserva também os objetos originais, HTML e histórico pessoal. Imagens são mantidas como links nos textos e no HTML; não são incorporadas como imagens na planilha.

A exportação consulta os dados equivalentes aos painéis **O**, **H** e **F** na sessão autenticada do TEC, sem movimentar a tela, responder questões, chamar IA, gerar cards ou enviar para Anki/Obsidian. Os pedidos são sequenciais: aguardam 3,5 segundos entre chamadas, 15 segundos entre questões e fazem uma pausa de 1 minuto a cada 15 questões. HTTP 403 e 429, limites e sessão expirada pausam a coleta; quando o TEC envia Retry-After, esse prazo aparece no aviso. Falhas ou conteúdo não confirmado aparecem nas colunas **Status** e **Observações**, em vez de serem tratados como conteúdo vazio confirmado. Um gabarito ausente permanece vazio.

Para um lote futuro, selecione **Agendar este lote** e escolha data e hora. O agendamento é único e fica salvo no Tampermonkey; no horário, a aba do caderno precisa estar aberta, conectada ao TEC e com a sessão válida. Se o navegador suspender a aba, a execução pode atrasar; se o caderno ficar indisponível por mais de 10 minutos, o horário expira e precisa ser reagendado. Ao concluir, o CSV acumulado é baixado automaticamente. Como o navegador exige uma ação do usuário para escolher e sobrescrever um arquivo específico, use **Salvar planilha acumulada** para atualizar o mesmo arquivo manualmente.

Os resultados e o avanço dos lotes ficam salvos no armazenamento local do Tampermonkey, por caderno. Um lote interrompido é retomado antes de iniciar outro; os lotes seguintes continuam no próximo número. **Salvar planilha acumulada** reúne os registros de todos os lotes anteriores e atuais no mesmo CSV. No seletor do navegador, escolha o mesmo arquivo para substituí-lo pela versão acumulada mais recente; se o navegador não oferecer gravação direta, o script baixa um CSV acumulado. Use **Parar** para interromper e **Continuar a coleta salva** para retomar uma seleção/caderno/ordem do fórum sem refazer os dados prontos. Deixe essa opção desmarcada para atualizar os dados com uma nova coleta. Não há remoção de marcações ao exportar. Se a ordenação por votos retornar erro 500, a coleta usa os dois primeiros por data e informa essa mudança na tela, no CSV e no JSON; não apresenta esse resultado como os dois mais votados.

### Cadência das ações automáticas

Inspirado nas [esperas por condição do Scrapling](https://github.com/D4Vinci/Scrapling/blob/main/docs/fetching/dynamic.md) e no seu [controle de cadência](https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/throttle.py), o UserScript aguarda a mudança da questão e usa pausas variáveis: 1,2–2,8 segundos antes de navegar e 0,65–1,4 segundos antes de ações que abrem ou buscam comentários. Os valores são escolhas deste projeto. Cliques e teclas automáticos disparam uma única vez; marcar caixas e abrir o menu responde imediatamente.

Scrapling é uma biblioteca Python; este script adapta os princípios compatíveis com Tampermonkey. Intervalos aleatórios não garantem invisibilidade nem alteram a identidade do navegador.

Para executar os testes de seleção, persistência e geração em ambiente simulado: `npm ci` e `npm test` (Node 22.22.2 ou posterior). Os testes não chamam TEC, IA, Anki ou Obsidian reais.

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

### "Erro na IA / OpenCode"

- Verifique se a **API key** está correta nas configurações
- Verifique sua chave, assinatura/saldo e limites no console do OpenCode
- Confirme em **Serviço OpenCode** se a rota desejada é Zen ou Go; no console, Zen usa `/zen/v1/...` e Go usa `/zen/go/v1/...`
- No pipeline estrito, uma falha do Luna interrompe a geração em vez de usar o GLM como Creator; uma falha do GLM também impede cards sem auditoria

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
│ GPT 5.6 Luna (xhigh)        │
│     (API REST)              │
│                             │
│  Creator + Auditor GLM 5.2  │
│  instruction + dados da     │
│  questão → JSON estruturado │
│  com até 2 flashcards       │
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
