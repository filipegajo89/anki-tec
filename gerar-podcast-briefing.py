#!/usr/bin/env python3
"""
gerar-podcast-briefing.py
=========================
Lê todas as Q*.md do vault Obsidian (TEC/), extrai pontos de erro,
confusão e pegadinhas identificadas pela IA e gera um briefing
narrativo por matéria — otimizado para upload no NotebookLM e
geração de podcast Deep Dive.

Uso:
    python3 gerar-podcast-briefing.py              # processa tudo
    python3 gerar-podcast-briefing.py --materia "Direito Tributário"
    python3 gerar-podcast-briefing.py --dry-run    # só mostra o que faria
"""

import re
import sys
import argparse
import pathlib
import datetime
from collections import defaultdict

# ──────────────────────────────────────────────────────────────
# CONFIGURAÇÃO
# ──────────────────────────────────────────────────────────────
VAULT_ROOT   = pathlib.Path("/Users/filipegajo/Filipe - Obs/TEC")
OUTPUT_DIR   = pathlib.Path("/Users/filipegajo/Filipe - Obs/TEC/_Podcasts")
LOG_FILE     = pathlib.Path("/Users/filipegajo/anki-tec/podcast-briefing.log")

# Seções do MD que interessam para o podcast
SECOES_RELEVANTES = [
    r"##\s+🎯\s+Erro Identificado",
    r"##\s+🔍\s+Pegadinha",
    r"##\s+📝\s+Flashcards Gerados",
    r"##\s+Enunciado",
    r"##\s+Resultado",
    r"##\s+Alternativas",
]

# ──────────────────────────────────────────────────────────────
# PARSING
# ──────────────────────────────────────────────────────────────

def parse_frontmatter(text: str) -> dict:
    """Extrai o YAML frontmatter de uma nota Q*.md."""
    meta = {}
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        return meta
    for line in m.group(1).splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta


def extract_section(text: str, heading_pattern: str) -> str:
    """Extrai o conteúdo de uma seção ## até a próxima seção ##."""
    pattern = rf"({heading_pattern}.*?)(?=\n##|\Z)"
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return ""


def clean_html_tags(text: str) -> str:
    """Remove tags HTML deixando apenas o texto."""
    return re.sub(r"<[^>]+>", "", text)


def parse_nota(filepath: pathlib.Path):
    """Lê e parseia uma nota Q*.md. Retorna dict com campos relevantes."""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return None

    meta = parse_frontmatter(text)
    if not meta:
        return None

    # Remove frontmatter para processar o corpo
    body = re.sub(r"^---\n.*?\n---\n", "", text, flags=re.DOTALL)

    # Erro/Pegadinha (seção principal de análise da IA)
    analise_ia = (
        extract_section(body, r"##\s+🎯\s+Erro Identificado")
        or extract_section(body, r"##\s+🔍\s+Pegadinha[^\n]*")
    )

    # Enunciado (contexto da questão)
    enunciado = extract_section(body, r"##\s+Enunciado")

    # Resultado
    resultado_sec = extract_section(body, r"##\s+Resultado")

    # Flashcards — extrai só as frentes/versos da tabela
    flashcards_raw = extract_section(body, r"##\s+📝\s+Flashcards")
    flashcards = parse_flashcard_table(flashcards_raw)

    # Alternativas — extrai gabarito e resposta do aluno
    alternativas = extract_section(body, r"##\s+Alternativas")
    resposta_aluno, gabarito = parse_alternativas(alternativas)

    return {
        "id":         meta.get("id", filepath.stem),
        "materia":    meta.get("materia", ""),
        "subtopico":  meta.get("subtopico", ""),
        "banca":      meta.get("banca", ""),
        "ano":        meta.get("ano", ""),
        "resultado":  meta.get("resultado", ""),
        "link":       meta.get("link", ""),
        "analise_ia": clean_html_tags(analise_ia),
        "enunciado":  clean_html_tags(enunciado.replace("## Enunciado", "").strip()),
        "flashcards": flashcards,
        "resposta_aluno": resposta_aluno,
        "gabarito":   gabarito,
        "filepath":   str(filepath),
    }


def parse_flashcard_table(text: str) -> list[dict]:
    """Extrai linhas de flashcard da tabela markdown."""
    cards = []
    for line in text.splitlines():
        # Formato: | N | Frente | Verso |
        parts = [p.strip() for p in line.split("|") if p.strip()]
        if len(parts) >= 3 and parts[0].isdigit():
            cards.append({
                "frente": clean_html_tags(parts[1]),
                "verso":  clean_html_tags(parts[2]),
            })
    return cards


def parse_alternativas(text: str) -> tuple[str, str]:
    """Extrai resposta do aluno e gabarito das alternativas."""
    resposta = gabarito = ""
    for line in text.splitlines():
        if "_(sua resposta)_" in line or "sua resposta" in line.lower():
            m = re.search(r"\*\*([A-E])\*\*", line)
            if m:
                resposta = m.group(1)
        if "_(gabarito)_" in line or "gabarito" in line.lower():
            m = re.search(r"\*\*([A-E])\*\*", line)
            if m:
                gabarito = m.group(1)
    return resposta, gabarito


# ──────────────────────────────────────────────────────────────
# GERAÇÃO DO BRIEFING
# ──────────────────────────────────────────────────────────────

INTRO_TEMPLATE = """\
# BRIEFING PARA PODCAST — {materia}
**Gerado em:** {data}
**Total de questões analisadas:** {total}
**Erros/Confusões:** {n_erros} | **Pegadinhas acertadas:** {n_pegadinhas}

---

## CONTEXTO PARA OS APRESENTADORES

Este material reúne os principais pontos de erro, confusão e pegadinhas identificados
por Filipe Gajo ao estudar **{materia}** para concursos públicos. A IA analisou cada
questão e identificou o mecanismo exato de engano ou a nuance que a banca explorou.

O objetivo do podcast é explorar esses padrões de erro com profundidade: por que o
candidato erra, qual a armadilha que a banca monta, e como fixar a regra certa.

---
"""

BLOCO_ERRO_TEMPLATE = """\
### ❌ CASO {n} — {subtopico}
**Questão {id}** · {banca} {ano}
**Marcou:** {resposta} · **Gabarito:** {gabarito}
**Link:** {link}

**Contexto (enunciado resumido):**
{enunciado}

**O que a IA identificou como erro/confusão:**
{analise_ia}

**Pontos para discutir no podcast:**
{pontos_podcast}

---
"""

BLOCO_PEGADINHA_TEMPLATE = """\
### 🔍 PEGADINHA {n} — {subtopico}
**Questão {id}** · {banca} {ano} _(acertou, mas havia armadilha)_
**Link:** {link}

**O que a IA identificou como nuance/pegadinha:**
{analise_ia}

**Pontos para discutir no podcast:**
{pontos_podcast}

---
"""

FLASHCARDS_SECTION_TEMPLATE = """\

---

## ARSENAL DE FLASHCARDS — PONTOS CRÍTICOS

Estes são os flashcards gerados para fixação dos pontos mais críticos desta matéria.
Cada um representa um padrão de erro ou nuance que já custou pontos ao candidato.

{flashcards_text}
"""


def gerar_pontos_podcast(nota: dict) -> str:
    """Gera bullets de discussão para o podcast a partir da análise da IA."""
    pontos = []
    analise = nota.get("analise_ia", "")

    # Remove o heading da seção se presente
    analise = re.sub(r"^##[^\n]*\n", "", analise).strip()

    if not analise:
        return "- (sem análise da IA disponível)"

    # Divide em sentenças e transforma em bullets para os apresentadores
    frases = re.split(r"(?<=[.!?])\s+", analise)
    for frase in frases[:4]:  # máximo 4 bullets por questão
        frase = frase.strip()
        if len(frase) > 20:
            pontos.append(f"- {frase}")

    if not pontos:
        pontos = [f"- {analise[:300]}"]

    return "\n".join(pontos)


def gerar_briefing(materia: str, notas: list[dict]) -> str:
    """Gera o briefing completo de podcast para uma matéria."""
    erros     = [n for n in notas if n["resultado"] == "erro" and n["analise_ia"]]
    pegadinhas = [n for n in notas if n["resultado"] != "erro" and n["analise_ia"]]

    # Cabeçalho
    texto = INTRO_TEMPLATE.format(
        materia=materia,
        data=datetime.date.today().strftime("%d/%m/%Y"),
        total=len(notas),
        n_erros=len(erros),
        n_pegadinhas=len(pegadinhas),
    )

    # ── Seção de erros ──────────────────────────────────────────
    if erros:
        texto += "\n## PARTE 1 — ERROS E CONFUSÕES\n\n"
        texto += (
            "Aqui estão os casos em que o candidato errou. Para cada um, a IA\n"
            "identificou exatamente o mecanismo do erro — a confusão conceitual,\n"
            "o detalhe esquecido, ou a armadilha da banca.\n\n---\n\n"
        )
        for i, nota in enumerate(erros, 1):
            enunciado = nota["enunciado"].replace("## Enunciado", "").strip()
            # Trunca enunciado longo
            if len(enunciado) > 400:
                enunciado = enunciado[:400] + "..."

            analise = nota["analise_ia"].replace(
                "## 🎯 Erro Identificado (IA)", ""
            ).strip()

            texto += BLOCO_ERRO_TEMPLATE.format(
                n=i,
                subtopico=nota["subtopico"] or "—",
                id=nota["id"],
                banca=nota["banca"],
                ano=nota["ano"],
                resposta=nota["resposta_aluno"] or "?",
                gabarito=nota["gabarito"] or "?",
                link=nota["link"],
                enunciado=enunciado if enunciado else "(enunciado não disponível)",
                analise_ia=analise if analise else "(análise não disponível)",
                pontos_podcast=gerar_pontos_podcast(nota),
            )

    # ── Seção de pegadinhas ─────────────────────────────────────
    if pegadinhas:
        texto += "\n## PARTE 2 — PEGADINHAS E NUANCES (questões acertadas)\n\n"
        texto += (
            "Aqui estão questões que o candidato acertou, mas onde a banca havia\n"
            "plantado uma armadilha. A IA identificou a nuance para reforço.\n\n---\n\n"
        )
        for i, nota in enumerate(pegadinhas, 1):
            analise = nota["analise_ia"].replace(
                "## 🔍 Pegadinha/Nuance Identificada (IA)", ""
            ).strip()

            texto += BLOCO_PEGADINHA_TEMPLATE.format(
                n=i,
                subtopico=nota["subtopico"] or "—",
                id=nota["id"],
                banca=nota["banca"],
                ano=nota["ano"],
                link=nota["link"],
                analise_ia=analise if analise else "(análise não disponível)",
                pontos_podcast=gerar_pontos_podcast(nota),
            )

    # ── Flashcards críticos ─────────────────────────────────────
    todos_flashcards = []
    for nota in notas:
        for fc in nota.get("flashcards", []):
            todos_flashcards.append(fc)

    if todos_flashcards:
        fc_text = ""
        for i, fc in enumerate(todos_flashcards, 1):
            fc_text += f"**{i}. {fc['frente']}**\n→ {fc['verso']}\n\n"

        texto += FLASHCARDS_SECTION_TEMPLATE.format(
            flashcards_text=fc_text.strip()
        )

    # ── Resumo final (para os apresentadores) ──────────────────
    texto += "\n\n---\n\n## PAUTA SUGERIDA PARA O PODCAST\n\n"
    texto += f"1. **Introdução:** Apresentar {materia} — relevância para concursos CEBRASPE/FGV\n"
    texto += f"2. **Top 3 erros mais graves** desta matéria (escolher os mais ricos)\n"
    texto += f"3. **Padrão da banca:** quais armadilhas a {notas[0]['banca'] if notas else 'banca'} mais usa nesta matéria\n"
    texto += f"4. **Regra de ouro:** o que não pode esquecer na prova\n"
    texto += f"5. **Fechamento:** flashcard relâmpago — ouvinte responde, apresentador corrige\n\n"

    return texto


# ──────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Gera briefings de podcast por matéria")
    parser.add_argument("--materia", help="Processar só esta matéria (nome exato)")
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que faria sem salvar")
    args = parser.parse_args()

    if not VAULT_ROOT.exists():
        log(f"ERRO: vault não encontrado em {VAULT_ROOT}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Coleta todas as notas ───────────────────────────────────
    log("Coletando notas do vault...")
    notas_por_materia: dict[str, list] = defaultdict(list)
    total_lidas = 0

    for filepath in sorted(VAULT_ROOT.rglob("Q*.md")):
        # Pula a pasta _Podcasts para não processar outputs
        if "_Podcasts" in str(filepath):
            continue

        nota = parse_nota(filepath)
        if nota and nota.get("materia"):
            notas_por_materia[nota["materia"]].append(nota)
            total_lidas += 1

    log(f"Total de notas lidas: {total_lidas}")
    log(f"Matérias encontradas: {list(notas_por_materia.keys())}")

    # ── Filtra matéria se especificada ─────────────────────────
    if args.materia:
        filtrado = {k: v for k, v in notas_por_materia.items() if args.materia.lower() in k.lower()}
        if not filtrado:
            log(f"AVISO: matéria '{args.materia}' não encontrada.")
            log(f"Matérias disponíveis: {list(notas_por_materia.keys())}")
            sys.exit(1)
        notas_por_materia = filtrado

    # ── Gera briefing por matéria ───────────────────────────────
    for materia, notas in notas_por_materia.items():
        # Só processa se houver ao menos 1 nota com análise da IA
        com_analise = [n for n in notas if n.get("analise_ia")]
        if not com_analise:
            log(f"  Pulando '{materia}': nenhuma nota com análise da IA ainda.")
            continue

        log(f"  Gerando briefing: {materia} ({len(com_analise)} notas com análise)")

        briefing = gerar_briefing(materia, notas)

        # Nome do arquivo de saída
        safe_name = re.sub(r'[^\w\s\-\(\)]', '', materia).strip()
        output_path = OUTPUT_DIR / f"Podcast Briefing — {safe_name}.md"

        if args.dry_run:
            log(f"  [DRY-RUN] Salvaria em: {output_path}")
            print(f"\n{'='*60}")
            print(f"PREVIEW: {materia}")
            print('='*60)
            print(briefing[:1500])
            print("... (truncado)")
        else:
            output_path.write_text(briefing, encoding="utf-8")
            log(f"  ✓ Salvo: {output_path.name}")

    log("Concluído.")


if __name__ == "__main__":
    main()
