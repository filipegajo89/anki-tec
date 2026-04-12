---
aliases: [Estatísticas TEC, Análise de Erros]
tags: [tec, estatisticas]
---

# 📉 Análise de Erros — TEC Concursos

> Análise detalhada dos seus erros para identificar padrões e pontos fracos.

---

## 🔥 Subtópicos com Mais Erros

```dataview
TABLE WITHOUT ID
  materia AS "Matéria",
  subtopico AS "Subtópico",
  length(rows) AS "Erros"
FROM "TEC"
WHERE resultado = "erro" AND subtopico != null
GROUP BY materia, subtopico
SORT length(rows) DESC
LIMIT 20
```

---

## 📊 Erros por Matéria (detalhe)

```dataview
TABLE WITHOUT ID
  materia AS "Matéria",
  length(rows) AS "Erros",
  min(rows.data) AS "Primeiro Erro",
  max(rows.data) AS "Último Erro"
FROM "TEC"
WHERE resultado = "erro" AND materia != null
GROUP BY materia
SORT length(rows) DESC
```

---

## 🏛️ Erros por Banca

```dataview
TABLE WITHOUT ID
  banca AS "Banca",
  length(rows) AS "Erros",
  length(groupBy(rows, (r) => r.materia)) AS "Matérias Distintas"
FROM "TEC"
WHERE resultado = "erro" AND banca != null
GROUP BY banca
SORT length(rows) DESC
```

---

## 📆 Erros por Mês

```dataview
TABLE WITHOUT ID
  dateformat(data, "yyyy-MM") AS "Mês",
  length(rows) AS "Erros"
FROM "TEC"
WHERE resultado = "erro" AND data != null
GROUP BY dateformat(data, "yyyy-MM")
SORT dateformat(data, "yyyy-MM") DESC
LIMIT 12
```

---

## 📝 Todos os Erros (lista completa)

```dataview
TABLE WITHOUT ID
  link(file.path, "Q" + id) AS "Questão",
  materia AS "Matéria",
  subtopico AS "Subtópico",
  banca AS "Banca",
  ano AS "Ano",
  cargo AS "Cargo",
  data AS "Data Erro"
FROM "TEC"
WHERE resultado = "erro"
SORT data DESC
```
