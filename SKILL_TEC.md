---
name: tec-error-analysis
description: Analisa padrões de erro do TEC Concursos salvos no Obsidian e identifica pontos fracos por matéria
version: 1.0.0
---

## Propósito

Esta skill analisa os erros de questões do TEC Concursos que foram salvos no Obsidian em `/Users/filipegajo/Filipe - Obs/TEC/`. Ela lê os arquivos `Q*.md`, parseia o frontmatter YAML de cada questão e gera um relatório por matéria com:

- Taxa de erro por matéria (ranking do mais fraco ao mais forte)
- Subtópicos mais problemáticos dentro de cada matéria
- Erros crônicos (mesma questão ou subtópico errado 3+ vezes)
- Erros recentes (últimas 2 semanas)
- Breakdown por banca (CEBRASPE, FGV, FCC)

## Como invocar

```bash
# Relatório no terminal
python3 /Users/filipegajo/anki-tec/tec_analysis.py

# Enviar via Telegram
python3 /Users/filipegajo/anki-tec/tec_analysis.py --send

# Saída JSON (para processar com o Hermes)
python3 /Users/filipegajo/anki-tec/tec_analysis.py --json
```

O JSON de saída é salvo em `/Users/filipegajo/anki-tec/tec_report.json`.

## Formato dos dados (vault)

Cada arquivo `Q{id}.md` tem frontmatter YAML com:
- `materia`: nome da disciplina
- `subtopico`: tópico específico
- `banca`: organizadora (CEBRASPE, FGV, FCC, VUNESP...)
- `resultado`: `"erro"` ou `"acerto"`
- `vezes_errado`: quantas vezes errou (incrementa em repetições)
- `data`: data de captura (YYYY-MM-DD)
- `tags`: inclui `erro-recorrente`, `erro-cronico`, `erro-critico` conforme severidade

## Quando usar esta skill

- Quando o usuário perguntar "onde preciso revisar?", "quais meus pontos fracos?", "o que estudar esta semana?"
- Para gerar o relatório semanal de segunda-feira (automatizado via launchd)
- Para responder perguntas específicas como "como estou em Direito Tributário?" ou "qual minha banca mais difícil?"

## Interpretação do JSON

```json
{
  "materias": [
    {
      "materia": "Direito Tributário",
      "taxa_erro": 0.71,
      "status": "🔴",
      "top_subtopicos": [...],
      "cronicos": [{"subtopico": "...", "max_vezes": 4}]
    }
  ],
  "bancas": {
    "CEBRASPE": {"acerto_pct": 58.3}
  }
}
```

- `status 🔴`: taxa de erro ≥ 65% — foco urgente
- `status 🟡`: taxa 45-64% — atenção
- `status 🟢`: taxa < 45% — razoável
- `cronicos`: subtópicos com `vezes_errado ≥ 3` — revisão imediata

## Learning loop

Após usar esta skill, observe se os mesmos subtópicos aparecem como crônicos semana após semana. Se um subtópico se mantém como crônico por 3+ semanas sem melhora, escalone a prioridade para o topo do relatório e sugira criar novos flashcards Anki específicos para ele (via `papiro_skill.md`).
