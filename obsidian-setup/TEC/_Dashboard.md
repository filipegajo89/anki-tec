---
aliases: [Dashboard TEC, Painel de Estudos]
tags: [tec, dashboard]
---

# 📊 Dashboard — TEC Concursos

> Painel central de acompanhamento dos seus estudos via TEC Concursos.
> Os dados abaixo são atualizados automaticamente via **Dataview**.

---

## 📈 Resumo Geral

```dataview
TABLE
  length(rows) AS "Total",
  length(filter(rows, (r) => r.resultado = "erro")) AS "Erros",
  length(filter(rows, (r) => r.resultado = "acerto")) AS "Acertos"
FROM "TEC"
WHERE id != null
GROUP BY true
```

---

## 📚 Questões por Matéria

```dataview
TABLE WITHOUT ID
  materia AS "Matéria",
  length(rows) AS "Total",
  length(filter(rows, (r) => r.resultado = "erro")) AS "Erros",
  length(filter(rows, (r) => r.resultado = "acerto")) AS "Acertos",
  round(length(filter(rows, (r) => r.resultado = "erro")) / length(rows) * 100, 1) + "%" AS "% Erro"
FROM "TEC"
WHERE id != null AND materia != null
GROUP BY materia
SORT length(rows) DESC
```

---

## ❌ Últimos Erros (20 mais recentes)

```dataview
TABLE WITHOUT ID
  link(file.path, "Q" + id) AS "Questão",
  materia AS "Matéria",
  subtopico AS "Subtópico",
  banca AS "Banca",
  ano AS "Ano",
  data AS "Data"
FROM "TEC"
WHERE resultado = "erro"
SORT data DESC
LIMIT 20
```

---

## 🏆 Acertos Recentes

```dataview
TABLE WITHOUT ID
  link(file.path, "Q" + id) AS "Questão",
  materia AS "Matéria",
  subtopico AS "Subtópico",
  banca AS "Banca",
  ano AS "Ano"
FROM "TEC"
WHERE resultado = "acerto"
SORT data DESC
LIMIT 10
```

---

## 🏛️ Questões por Banca

```dataview
TABLE WITHOUT ID
  banca AS "Banca",
  length(rows) AS "Total",
  length(filter(rows, (r) => r.resultado = "erro")) AS "Erros",
  round(length(filter(rows, (r) => r.resultado = "erro")) / length(rows) * 100, 1) + "%" AS "% Erro"
FROM "TEC"
WHERE id != null AND banca != null
GROUP BY banca
SORT length(rows) DESC
```

---

## 📅 Atividade dos Últimos 7 Dias

```dataview
TABLE WITHOUT ID
  data AS "Dia",
  length(rows) AS "Questões",
  length(filter(rows, (r) => r.resultado = "erro")) AS "Erros",
  length(filter(rows, (r) => r.resultado = "acerto")) AS "Acertos"
FROM "TEC"
WHERE id != null AND data >= date(today) - dur(7 days)
GROUP BY data
SORT data DESC
```
