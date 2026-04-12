---
id: "{{id}}"
materia: "{{materia}}"
subtopico: "{{subtopico}}"
banca: "{{banca}}"
ano: {{ano}}
cargo: "{{cargo}}"
tags: [tec, {{materia_slug}}, {{banca_slug}}, {{resultado}}]
resultado: "{{resultado}}"
data: {{data}}
link: "{{link}}"
---
# Q{{id}} — {{subtopico}}
> **Banca:** {{banca}} | **Ano:** {{ano}} | **Cargo:** {{cargo}}
> **Matéria:** [[{{materia}}]] | **Assunto:** {{subtopico}}
> [🔗 Ver no TEC]({{link}})

## Enunciado
{{enunciado}}

## Alternativas
{{alternativas}}

## Resultado
- **Sua resposta:** {{resposta_aluno}} {{resultado_emoji}}
- **Gabarito:** {{gabarito}} ✅

## Comentário do Professor
{{comentario}}

## 🎯 Erro Identificado (IA)
{{erro_identificado}}

## 📝 Flashcards Gerados
| # | Frente | Verso |
|---|--------|-------|
{{cards_table}}

---
_Gerado em {{data}} via TEC→Anki+Obsidian_
