# Configuracao Portavel de Cards Anki

Este arquivo consolida a configuracao que produziu os melhores cards no projeto atual. A ideia e simples: copiar este documento para outro projeto e pedir para a IA implementar exatamente estes blocos.

Fonte canonica extraida de `public/tec-to-anki.user.js` em 2026-04-23.

## 1. Objetivo pedagogico

Esta configuracao foi desenhada para gerar cards:

- autocontidos
- cirurgicos
- baseados no Principio da Informacao Minima
- focados no mecanismo do erro ou na pegadinha da questao
- com preferencia por Cloze quando isso melhorar a retencao
- com verso curto, claro e visualmente escaneavel no Anki

## 2. System Prompt Canonico

Use este prompt como `system prompt` da IA geradora:

```text
Você é um especialista em concursos públicos e criação de flashcards para Anki. A partir da questão, do comentário do professor e do "Erro Identificado", crie no máximo 2 flashcards focados exclusivamente na lacuna de conhecimento que causou o erro. Ignore conceitos da questão que o aluno já domina.

## Princípio da Informação Mínima (Wozniak)

Aplique rigorosamente: cada card testa UMA ÚNICA informação — um prazo, uma exceção, uma palavra-chave, uma tese do STF. Nunca agrupe dois fatos num mesmo card.

**Evite enumerações:** se a questão cobrar uma lista de 3+ itens (requisitos, características, hipóteses), prefira criar 1 card por item em vez de 1 card com a lista inteira.

## Formato dos cards

### PRIORIDADE 1 — Cloze (lacunas)

Prefira SEMPRE este formato para regras, leis e jurisprudências. Escreva uma afirmação AUTOCONTIDA, que faça sentido mesmo sem a questão original. A lacuna entre {{ }} deve ser um RÓTULO GENÉRICO do que falta (ex: {{tipo}}, {{regra}}, {{conceito}}), nunca a resposta já preenchida (ex: {{N:N}}, {{igual para todas as contas}}).

❌ Ruim (Q&A genérico):
Frente: O que diz a Súmula 539 do STJ sobre juros?
Verso: É permitida a capitalização com periodicidade inferior a um ano.

✅ Bom (Cloze):
Frente: A capitalização de juros com periodicidade inferior a um ano é {{regra}} em contratos celebrados após 31/03/2000. (Súmula 539 STJ)
Verso: permitida

Em contratos após 31/03/2000, admite-se capitalização inferior a um ano. (Súmula 539 STJ)

### PRIORIDADE 2 — Q&A cirúrgico

Use apenas quando Cloze não for natural. Regras obrigatórias:
- Pergunta sem pistas na formulação: NÃO use "Segundo o STF..." se isso entrega a resposta
- O verso deve abrir com a resposta curta e, se necessário, trazer 1 explicação breve logo abaixo para deixar o card autocontido
- Para fórmulas ou cálculos: prefira Cloze com a variável como lacuna; inclua um exemplo numérico concreto no verso para ancorar a memória

✅ Bom (Q&A):
Frente: Qual princípio veda cobrar tributo no mesmo exercício da lei que o criou?
Verso: Anterioridade anual.

Impede a cobrança no mesmo exercício da lei instituidora. (CF art. 150, III, b)

## O que fazer

1. Leia os dados da questão fornecidos
2. Verifique se o aluno ERROU ou ACERTOU a questão
3. Siga as instruções do cenário correspondente abaixo

---

## CENÁRIO 1: QUESTÃO ERRADA

Identifique com precisão:
- Qual alternativa o aluno marcou (a errada)
- Qual o gabarito correto
- POR QUE o aluno errou: qual confusão, troca, ou lacuna específica causou o erro

Crie ATÉ 2 flashcards que corrigem EXATAMENTE essa confusão.

### REGRA DE OURO: foque no MECANISMO DO ERRO, não no tema geral

O objetivo NÃO é ensinar o assunto de forma genérica. É CORRIGIR a confusão específica que fez o aluno errar.

### Exemplos de erros comuns e como abordar:

**Erro por TROCA/INVERSÃO de conceitos:**
Se a banca trocou as descrições de dois institutos, o card deve forçar o aluno a DISTINGUIR X de Y. Prefira Cloze comparativo, mas use Q&A ou V/F se o Cloze ficar artificial.

**Erro por EXCEÇÃO desconhecida:**
Se o aluno generalizou uma regra que tem exceção, o card deve focar na exceção via Cloze: "A regra X se aplica, EXCETO quando {{situação}}."

**Erro por CONFUSÃO de competência/sujeito:**
Se a banca trocou quem faz o quê, o card testa via Cloze: "É competente para X: {{A ou B}}?"

**Erro por PEGADINHA de redação:**
Se um item parece certo mas tem uma palavra que o torna errado, o card usa Cloze para fixar a palavra crítica.

**Erro por GENERALIZAÇÃO (como "toda norma...", "sempre...", "nunca..."):**
Cloze: "A regra X se aplica {{sempre / salvo quando}}..."

**Questão de jurisprudência (STF/STJ):**
Prefira o sentido caso→tese: frente = situação fática do julgado, verso = tese fixada pelo tribunal. Se a tese for amplamente cobrada em provas, um segundo card tese→caso consolida o reconhecimento inverso.

### Tipos de cards para questão ERRADA (em ordem de prioridade):

1. **Card da distinção (OBRIGATÓRIO):** Force o aluno a distinguir os conceitos que ele CONFUNDIU. Prefira Cloze, salvo se um Q&A ou V/F ficar mais claro.
2. **Card da regra correta (se necessário):** Pergunta direta sobre o artigo, súmula ou regra que fundamenta a resposta correta.

**No campo "erro_identificado":** descreva o mecanismo do erro (ex: "Confundiu competência da União com a dos Estados").

---

## CENÁRIO 2: QUESTÃO ACERTADA

Quando o aluno ACERTA mas pede cards, é porque NÃO teve certeza da resposta. O objetivo é BLINDAR esse conhecimento.

Identifique com precisão:
- Qual a PEGADINHA ou NUANCE da questão (o que a tornava difícil)
- Qual o detalhe sutil que a banca explorou para confundir
- Quais alternativas eram mais "sedutoras" e por quê

### Tipos de cards para questão ACERTADA (em ordem de prioridade):

1. **Card da pegadinha (OBRIGATÓRIO):** Exponha a armadilha da banca. Use Cloze se ficar natural; caso contrário, use Q&A ou V/F autocontido.
2. **Card da nuance (se necessário):** Teste a distinção sutil que tornava a questão difícil sem depender da redação da questão original.

**No campo "erro_identificado":** descreva a pegadinha/nuance da questão (ex: "A alternativa B parecia correta por usar 'sempre que possível', mas o art. X não admite exceção neste caso").

## Regras gerais para os flashcards

- **MÁXIMO 2 cards** — se a confusão for simples, 1 card basta
- O PRIMEIRO card SEMPRE deve atacar o ponto central: a confusão (se errou) ou a pegadinha/nuance (se acertou)
- O card precisa ser AUTOCONTIDO: quem o lê deve entender o erro e a distinção sem voltar à questão
- **Tipo**: indique no campo "tipo" se é "Cloze" ou "Q&A". Você pode combinar 1 Cloze + 1 Q&A quando isso ensinar melhor
- **Cloze**: use {{rotulo_generico}} para marcar a informação oculta; nunca coloque a resposta dentro das chaves. O verso deve começar pela resposta curta e pode trazer 1 explicação breve logo abaixo
- **Q&A**: frente cirúrgica, verso começando pela resposta curta. Depois, se necessário, acrescente 1 explicação breve. Não use "Segundo o STF..." se isso entrega a resposta
- Use perguntas COMPARATIVAS quando o erro envolver troca de conceitos
- NUNCA crie cards genéricos sobre o assunto. Cada card deve ter relação direta com o motivo do erro
- NUNCA copie o enunciado da questão. O card deve testar o CONCEITO, não a questão específica
- Se a distinção importante não couber num Cloze limpo, prefira um Q&A ou V/F curto e claro
- Se a questão envolver artigo de lei, cite o artigo no verso
- materia: nome oficial como em editais (Direito Constitucional, Direito Tributário, etc.)
- ATENÇÃO na classificação de matéria: classifique pelo CONTEÚDO TÉCNICO do tema
- subtopico: específico (ex: "Aplicabilidade das Normas - Art. 5º §1º CF", não "Normas")

## Formatação HTML dos campos frente e verso

Use HTML inline para destacar visualmente os elementos-chave dentro do texto dos cards. Isso é FUNDAMENTAL para facilitar a memorização.

### Tags disponíveis (use sempre que aplicável):

- **<b>texto</b>** → para termos jurídicos centrais, nomes de princípios, institutos (ex: <b>legalidade tributária</b>)
- **<span class="neg">texto</span>** → para NEGAÇÕES, exceções, vedações, alertas (ex: <span class="neg">NÃO exige lei para alteração de prazo</span>)
- **<mark>texto</mark>** → para palavras-chave críticas dentro da frase que o aluno deve gravar (ex: a legalidade é sobre a <mark>forma</mark>; a anterioridade é sobre o <mark>tempo</mark>)
- **<ul><li>texto</li></ul>** → para listas enumerativas (ex: atos que exigem lei: instituição, aumento, majoração de alíquota, alteração de base de cálculo)
- **<span class="ref">texto</span>** → para referências legais e artigos (ex: <span class="ref">CF art. 150, I</span>)
- **<div class="answer-line">texto</div>** → para a primeira linha do verso, com a resposta curta
- **<div class="explanation">texto</div>** → para a explicação breve que contextualiza a distinção

### Regras de formatação:
- Em cards Cloze: use <mark> na lacuna assim: <mark>{{rotulo_generico}}</mark> para destacar visualmente a informação oculta
- No verso, prefira a estrutura: <div class="answer-line">resposta curta</div> + <div class="explanation">explicação breve</div>
- Use <b> em TODA menção a conceitos jurídicos importantes no verso
- Use <span class="neg"> SEMPRE que houver negação, vedação, exceção ou contraste ("NÃO", "vedado", "salvo", "exceto")
- Use <mark> com moderação (1-3 palavras por card) apenas nas palavras que são o NÚCLEO da distinção
- Na FRENTE do card, use <b> para o termo central da pergunta e <mark> para destaques pontuais
- Listas com <ul><li> são preferíveis a texto corrido quando há 3+ itens
- NUNCA use tags de formatação no campo palavras_chave (é plain text)

## Palavras-chave consagradas

Para cada card, inclua no campo "palavras_chave" as EXPRESSÕES CANÔNICAS que identificam o conceito/instituto jurídico abordado. São os termos consagrados na lei, doutrina ou jurisprudência que funcionam como "impressão digital" daquele conceito — quando o aluno vê essas palavras num enunciado longo, deve imediatamente reconhecer de qual instituto se trata.

### O que SÃO palavras-chave (exemplos por conceito):
- Capacidade contributiva → "circunstâncias pessoais", "capacidade econômica real", "será pessoal sempre que possível"
- Princípio da legalidade tributária → "somente a lei pode", "instituir ou aumentar tributo", "vedado à União, Estados..."
- Imunidade recíproca → "vedado cobrar impostos", "patrimônio, renda ou serviços uns dos outros"
- Devido processo legal → "contraditório e ampla defesa", "privado de seus bens", "sem o devido processo"
- Ato administrativo vinculado → "a Administração DEVE", "preenchidos os requisitos", "direito subjetivo"

### O que NÃO são palavras-chave:
- Palavras genéricas do tema: "STF", "imposto de renda", "deduções", "tributo"
- Nomes de institutos: o nome do conceito em si não é palavra-chave, são as expressões que SINALIZAM ele

### Regras:
- Liste 1-2 expressões por card (somente as mais fortes e discriminativas)
- Priorize trechos literais de artigos de lei ou súmulas
- Se não houver expressões canônicas claras para o conceito, deixe o campo vazio ("")
```

## 3. Prompt de Entrada do Usuario

Monte o prompt do usuario com esta estrutura:

```text
## Dados da Questão {{Errada|Acertada}}

**ID:** #{{id}}
**Banca:** {{banca}}
**Ano:** {{ano}}
**Cargo:** {{cargo}}
**Matéria:** {{materia}}
**Assunto:** {{assunto}}
**Tipo:** {{tipo}}

### Enunciado
{{enunciado}}

### Alternativas
{{alternativas_com_marcacao_de_aluno_e_gabarito}}

### Resultado
- **Aluno marcou:** {{respostaAluno}}
- **Gabarito:** {{gabarito}}
- **Resultado:** {{ERROU ou ACERTOU}}

### Comentário do Professor
{{comentario}}

---
Com base nas informações acima, identifique o mecanismo do erro e crie no máximo 2 cards AUTOCONTIDOS, podendo combinar 1 Cloze + 1 Q&A quando isso deixar a distinção mais clara.
```

## 4. Schema de Saida Canonico

### Forma JSON esperada

```json
{
  "materia": "string",
  "subtopico": "string",
  "erro_identificado": "string",
  "cards": [
    {
      "tipo": "Cloze ou Q&A",
      "frente_texto_limpo": "string",
      "verso_texto_limpo": "string",
      "frente_html": "string",
      "verso_html": "string",
      "palavras_chave": "string"
    }
  ]
}
```

### Schema estruturado

```js
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    materia: { type: 'string', description: 'Matéria do edital' },
    subtopico: { type: 'string', description: 'Subtópico específico' },
    erro_identificado: { type: 'string', description: 'Se errou: descrição do mecanismo do erro. Se acertou: descrição da pegadinha/nuance que tornava a questão difícil.' },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['Cloze', 'Q&A'], description: 'Formato do card: Cloze para afirmação autocontida com {{rotulo_generico}}, Q&A para pergunta direta, V/F ou distinção breve' },
          frente_texto_limpo: { type: 'string', description: 'Card autocontido em texto puro. Se for Cloze, use {{rotulo_generico}}, nunca a resposta preenchida.' },
          verso_texto_limpo: { type: 'string', description: 'Primeira linha com resposta curta em texto puro. Depois, se necessário, uma explicação breve.' },
          frente_html: { type: 'string', description: 'Mesmo conteúdo da frente com HTML e destaque visual; se for Cloze, use <mark>{{rotulo_generico}}</mark>.' },
          verso_html: { type: 'string', description: 'Verso em HTML, idealmente com <div class="answer-line">resposta curta</div> e <div class="explanation">explicação breve</div>.' },
          palavras_chave: { type: 'string', description: 'Expressões canônicas da lei/doutrina que identificam este conceito jurídico, separadas por " | ". Vazio se não houver.' }
        },
        required: ['tipo', 'frente_texto_limpo', 'verso_texto_limpo', 'frente_html', 'verso_html', 'palavras_chave']
      }
    }
  },
  required: ['materia', 'subtopico', 'erro_identificado', 'cards']
};
```

## 5. Regras de Pos-Processamento Obrigatorias

So o prompt nao basta. Estes ajustes locais foram decisivos para a qualidade final.

### 5.1. Regras funcionais

- limitar `palavras_chave` a no maximo 2 expressoes
- remover HTML antes de comparar texto da resposta com a lacuna
- se a lacuna vier preenchida com a propria resposta, trocar por `{{lacuna}}`
- em cards Cloze, garantir `<mark>{{rotulo_generico}}</mark>` no HTML da frente
- no verso, transformar a primeira linha em `<div class="answer-line">...` e o resto em `<div class="explanation">...`
- normalizar o tipo do card: se houver `{{...}}`, assumir `Cloze`; senao, `Q&A`

### 5.2. Implementacao de referencia

```js
function normalizeKeywords(value) {
  return (value || '')
    .split(/\s*\|\s*/)
    .map(item => stripHtml(item).trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' | ');
}

function extractAnswerLabel(content) {
  return stripHtml(content || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)[0]
    .split('\n')[0]
    .trim()
    .replace(/[.:;!]+$/, '')
    .toLowerCase();
}

function normalizeClozePlaceholder(text, answerText = '', wrapWithMark = false) {
  if (!text) return text;

  const answerLabel = extractAnswerLabel(answerText);

  let normalized = text.replace(/\{\{([^}]+)\}\}/g, (_, inner) => {
    const clean = stripHtml(inner).trim();
    if (!clean) return '{{lacuna}}';

    if (answerLabel && clean.toLowerCase() === answerLabel) {
      return '{{lacuna}}';
    }

    if (/^[A-Za-zÀ-ÿ0-9_-]{1,24}(?:\s+[A-Za-zÀ-ÿ0-9_-]{1,24})?$/.test(clean)) {
      return `{{${clean}}}`;
    }

    return '{{lacuna}}';
  });

  if (wrapWithMark && !/<mark>\s*\{\{/.test(normalized)) {
    normalized = normalized.replace(/\{\{([^}]+)\}\}/g, '<mark>{{$1}}</mark>');
  }

  return normalized;
}

function normalizeBackText(content) {
  return (content || '').trim().replace(/\n{3,}/g, '\n\n');
}

function formatCardBack(content) {
  if (!content) return content;

  const trimmed = content.trim();
  if (!trimmed || /class="answer-line"|class="explanation"/.test(trimmed)) {
    return trimmed;
  }

  const blocks = trimmed.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  if (!blocks.length) return trimmed;

  const answerLine = blocks.shift().replace(/\n/g, '<br>');
  const explanation = blocks.length
    ? `<div class="explanation">${blocks.map(block => `<div class="explanation-block">${block.replace(/\n/g, '<br>')}</div>`).join('')}</div>`
    : '';

  return `<div class="answer-line">${answerLine}</div>${explanation}`;
}

function normalizeGeneratedCard(card) {
  const normalized = { ...card };

  if (normalized.frente_html && !normalized.frente) {
    normalized.frente = normalized.frente_html;
    normalized.verso = normalized.verso_html;
  }
  if (normalized.frente && !normalized.frente_html) {
    normalized.frente_html = normalized.frente;
    normalized.verso_html = normalized.verso;
    normalized.frente_texto_limpo = normalized.frente.replace(/<[^>]+>/g, '');
    normalized.verso_texto_limpo = normalized.verso.replace(/<[^>]+>/g, '');
  }

  normalized.tipo = normalized.tipo || (/\{\{[^}]+\}\}/.test(normalized.frente_html || normalized.frente_texto_limpo || '') ? 'Cloze' : 'Q&A');

  if (normalized.tipo === 'Cloze') {
    const answerText = normalized.verso_texto_limpo || normalized.verso || normalized.verso_html || '';
    normalized.frente_texto_limpo = normalizeClozePlaceholder(normalized.frente_texto_limpo || '', answerText, false);
    normalized.frente_html = normalizeClozePlaceholder(normalized.frente_html || normalized.frente_texto_limpo || '', answerText, true);
  }

  normalized.verso_texto_limpo = normalizeBackText(normalized.verso_texto_limpo || normalized.verso || '');
  normalized.verso_html = formatCardBack(normalized.verso_html || normalized.verso || normalized.verso_texto_limpo);
  normalized.frente = normalized.frente_html;
  normalized.verso = normalized.verso_html;
  normalized.palavras_chave = normalizeKeywords(normalized.palavras_chave);
  return normalized;
}

function normalizeGeneratedResult(result) {
  if (!result || !Array.isArray(result.cards)) return result;
  result.cards = result.cards.map(normalizeGeneratedCard);
  return result;
}
```

## 6. Configuracao do Modelo de Nota no Anki

### 6.1. Campos na ordem exata

```js
['Frente', 'Verso', 'PalavrasChave', 'Contexto', 'Fonte', 'ErroIdentificado']
```

### 6.2. CSS canonico

```css
.card {
  font-family: 'Segoe UI', system-ui, sans-serif;
  max-width: 640px; margin: 0 auto; padding: 28px;
  line-height: 1.72; color: #e8e8e8; background: #1e1e2e;
}
.frente { font-size: 1.22em; color: #eef2ff; font-weight: 500; }
.frente b { color: #60a5fa; }
.frente mark { background: #fde047; color: #111827; padding: 1px 4px; border-radius: 3px; }
.verso { font-size: 1.02em; color: #d4d4d4; margin-top: 4px; }
.answer-line { font-size: 1.3em; font-weight: 800; color: #fca5a5; margin: 0 0 12px; }
.answer-line b, .answer-line .neg { color: inherit; }
.explanation { color: #e5e7eb; line-height: 1.75; }
.explanation-block + .explanation-block { margin-top: 10px; }
.verso b { color: #93c5fd; font-weight: 700; }
.verso .neg { color: #fca5a5; font-weight: 800; }
.verso mark { background: rgba(253, 224, 71, 0.28); color: #fde68a; padding: 1px 4px; border-radius: 3px; }
.verso .ref { color: #a5b4fc; font-style: italic; font-size: 0.92em; }
.verso ul { margin: 8px 0 8px 18px; padding: 0; }
.verso li { margin-bottom: 4px; }
.palavras-chave {
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px;
  padding: 8px 10px; background: #23283d; border-left: 3px solid #60a5fa; border-radius: 8px;
}
.palavras-chave .kw {
  background: transparent; color: #c7d2fe; padding: 0;
  border: none; font-size: 0.82em; font-weight: 600; letter-spacing: 0.1px;
}
.contexto { color: #a0a0b8; font-size: 0.82em; margin-bottom: 14px;
  padding-bottom: 10px; border-bottom: 1px solid #3a3a4e; letter-spacing: 0.3px; }
.fonte { color: #787890; font-size: 0.72em; margin-top: 20px; text-align: right; }
.erro { background: #3a3520; color: #ffd866; padding: 10px 14px; border-radius: 8px;
  font-size: 0.85em; margin-top: 14px; border-left: 3px solid #ffd866; }
hr { border: none; border-top: 1px solid #3a3a4e; margin: 18px 0; }
/* Modo claro */
.card.night_mode_off, :root[class*="light"] .card {
  color: #1f2937; background: #ffffff;
}
:root[class*="light"] .frente { color: #111827; }
:root[class*="light"] .frente b { color: #1d4ed8; }
:root[class*="light"] .frente mark { background: #fde047; color: #111827; }
:root[class*="light"] .verso { color: #1f2937; }
:root[class*="light"] .answer-line { color: #b42318; }
:root[class*="light"] .explanation { color: #111827; }
:root[class*="light"] .verso b { color: #1d4ed8; }
:root[class*="light"] .verso .neg { color: #b42318; }
:root[class*="light"] .verso mark { background: #fde68a; color: #111827; }
:root[class*="light"] .verso .ref { color: #6b7280; }
:root[class*="light"] .palavras-chave { background: #eef2ff; border-left-color: #4f46e5; }
:root[class*="light"] .palavras-chave .kw { color: #4338ca; }
:root[class*="light"] .contexto { color: #6b7280; border-bottom-color: #e5e7eb; }
:root[class*="light"] .fonte { color: #9ca3af; }
:root[class*="light"] .erro { background: #fff3cd; color: #856404; border-left-color: #856404; }
:root[class*="light"] hr { border-top-color: #dee2e6; }
```

### 6.3. Template do card

```js
const cardTemplate = {
  Name: 'Card',
  Front: '<div class="card"><div class="contexto">{{Contexto}}</div><div class="frente">{{Frente}}</div></div>',
  Back: `<div class="card">
<div class="contexto">{{Contexto}}</div>
<div class="frente">{{Frente}}</div>
<hr>
<div class="verso">{{Verso}}</div>
{{#PalavrasChave}}<div class="palavras-chave">{{PalavrasChave}}</div>{{/PalavrasChave}}
{{#ErroIdentificado}}<div class="erro">💡 {{ErroIdentificado}}</div>{{/ErroIdentificado}}
<div class="fonte">{{Fonte}}</div>
</div>`,
};
```

### 6.4. Criacao/atualizacao do modelo

Se o modelo ja existir, atualizar CSS e templates. Se nao existir, criar com estes campos e esse template.

```js
await ankiInvoke('createModel', {
  modelName,
  inOrderFields: ['Frente', 'Verso', 'PalavrasChave', 'Contexto', 'Fonte', 'ErroIdentificado'],
  css: modelCss,
  cardTemplates: [cardTemplate],
});
```

## 7. Mapeamento dos Campos ao Salvar no Anki

```js
fields: {
  Frente: card.frente_html || card.frente,
  Verso: card.verso_html || card.verso,
  PalavrasChave: (card.palavras_chave || '')
    .split(/\s*\|\s*/)
    .filter(Boolean)
    .map(kw => `<span class="kw">${kw.trim()}</span>`)
    .join(' '),
  Contexto: contexto,
  Fonte: fonte,
  ErroIdentificado: aiResult.erro_identificado || '',
}
```

### Regras adicionais de persistencia

- `Contexto` deve ser `Materia › Subtopico` quando houver subtopico
- `Fonte` deve preferir `Q#ID | Banca Ano | Cargo`
- `PalavrasChave` entra como HTML com spans `.kw`
- `allowDuplicate: false`
- `duplicateScope: 'deck'`

## 8. Estrutura de Deck e Tags

### Nome do deck

```text
{prefixo}::{Materia}::{Subtopico}
```

Se nao houver subtopico:

```text
{prefixo}::{Materia}
```

### Tags recomendadas

```js
[
  'tec',
  slugify(questionData.banca || 'sem-banca'),
  questionData.ano || '',
  slugify(materia),
  questionData.errou ? 'erro' : 'acerto',
]
```

Adicionar tambem:

- `revisar` se o card vier marcado para revisao
- `dual-pipeline` se o modo dual estiver ativo

## 9. Instrucoes curtas para outra IA implementar

Se voce quiser colar este arquivo em outro projeto e mandar outra IA reproduzir a configuracao, use algo proximo disto:

```text
Implemente exatamente a configuracao descrita em ANKI_CARD_CONFIG_PORTAVEL.md.

Requisitos obrigatorios:
1. Use o system prompt canonico sem simplificar.
2. Gere saida no schema definido.
3. Aplique o pos-processamento local obrigatorio, especialmente:
   - limitar palavras-chave a 2
   - impedir Cloze com resposta dentro da lacuna
   - formatar o verso com answer-line + explanation
4. Crie/atualize o modelo de nota do Anki com os 6 campos, o CSS e o template descritos.
5. Salve os cards no Anki usando o mapeamento de campos e tags especificado.
6. Preserve cards autocontidos, foco no mecanismo do erro e prioridade para Cloze.
```

## 10. Checklist de reproducao

- copiar o system prompt
- copiar o prompt de entrada do usuario
- copiar o schema de saida
- copiar o pos-processamento local
- copiar o CSS do modelo Anki
- copiar o template front/back
- copiar a ordem dos campos
- copiar o mapeamento de `fields` no momento de criar a nota
- copiar a logica de deck/tags se quiser manter o mesmo fluxo organizacional

Se algum desses blocos for omitido, o resultado tende a piorar. No projeto original, a qualidade excepcional veio da combinacao de prompt + schema + normalizacao + template do Anki, e nao apenas do prompt isolado.