#!/usr/bin/env python3
"""
Analisa erros do TEC Concursos salvos no Obsidian.
Organizado por matéria, com pontos fracos e subtópicos problemáticos.

Uso:
  python3 tec_analysis.py          # relatório estatístico no terminal
  python3 tec_analysis.py --send   # envia relatório estatístico via Telegram
  python3 tec_analysis.py --deep   # análise comportamental por IA no terminal
  python3 tec_analysis.py --deep --send  # envia análise comportamental via Telegram
  python3 tec_analysis.py --json   # saída JSON (para Hermes)
"""

import json
import os
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import yaml

VAULT_PATH = Path("/Users/filipegajo/Filipe - Obs/TEC")
CHAT_ID = "1701302966"
RECENT_DAYS = 14

# Carrega .env do diretório do script (opcional)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN") or os.environ.get("PAPIRO_SAAS_TOKEN", "")


# ── Parsing ───────────────────────────────────────────────────────────────────

def parse_frontmatter(filepath: Path):
    text = filepath.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    try:
        return yaml.safe_load(text[3:end].strip())
    except yaml.YAMLError:
        return None


def load_questions():
    questions = []
    for md in VAULT_PATH.rglob("Q*.md"):
        fm = parse_frontmatter(md)
        if fm and "resultado" in fm:
            questions.append(fm)
    return questions


# ── Normalização ──────────────────────────────────────────────────────────────

def normalize_banca(raw: str) -> str:
    b = (raw or "").upper()
    if "CEBRASPE" in b or "CESPE" in b:
        return "CEBRASPE"
    if "FGV" in b:
        return "FGV"
    if "FCC" in b:
        return "FCC"
    if "VUNESP" in b:
        return "VUNESP"
    return "Outra"


def parse_data(raw):
    if not raw:
        return None
    try:
        return raw if isinstance(raw, date) else date.fromisoformat(str(raw))
    except (ValueError, TypeError):
        return None


def severity_label(vezes: int) -> str:
    if vezes >= 5:
        return "crítico"
    if vezes >= 3:
        return "crônico"
    if vezes >= 2:
        return "recorrente"
    return ""


# ── Análise ───────────────────────────────────────────────────────────────────

def analyze(questions):
    cutoff = date.today() - timedelta(days=RECENT_DAYS)

    # por matéria → por subtópico
    materias: dict[str, dict] = defaultdict(lambda: {
        "total": 0, "erros": 0,
        "subs": defaultdict(lambda: {"total": 0, "erros": 0, "max_vezes": 0, "recente": False})
    })
    bancas: dict[str, dict] = defaultdict(lambda: {"total": 0, "erros": 0})

    for q in questions:
        materia = q.get("materia") or "Sem Matéria"
        subtop  = q.get("subtopico") or "Sem Subtópico"
        erro    = q.get("resultado") == "erro"
        vezes   = int(q.get("vezes_errado") or 1) if erro else 0
        banca   = normalize_banca(q.get("banca", ""))
        d       = parse_data(q.get("data"))
        recente = bool(d and d >= cutoff)

        m = materias[materia]
        m["total"] += 1
        if erro:
            m["erros"] += 1

        s = m["subs"][subtop]
        s["total"] += 1
        if erro:
            s["erros"] += 1
            if vezes > s["max_vezes"]:
                s["max_vezes"] = vezes
            if recente:
                s["recente"] = True

        bancas[banca]["total"] += 1
        if erro:
            bancas[banca]["erros"] += 1

    # Montar lista de matérias — ranking por cronicidade, depois por volume de erros
    result = []
    for nome, m in materias.items():
        erros = m["erros"]
        all_subs = list(m["subs"].items())

        top3 = sorted(
            [(s, d) for s, d in all_subs if d["erros"] > 0],
            key=lambda x: (-x[1]["erros"], -x[1]["max_vezes"])
        )[:3]
        cronicos = sorted(
            [(s, d) for s, d in all_subs if d["max_vezes"] >= 3],
            key=lambda x: -x[1]["max_vezes"]
        )
        recentes = [(s, d) for s, d in all_subs if d["erros"] > 0 and d["recente"]]

        # Status baseado em cronicidade e volume (percentual não é confiável)
        if cronicos:
            status = "🔴"
        elif erros >= 5:
            status = "🟡"
        else:
            status = "🟢"

        result.append({
            "materia": nome,
            "erros": erros,
            "status": status,
            "top3": top3,
            "cronicos": cronicos,
            "recentes": recentes,
        })

    # Ordenar: 🔴 primeiro (por nº de crônicos), depois 🟡 (por nº de erros), depois 🟢
    result.sort(key=lambda x: (-len(x["cronicos"]), -x["erros"]))
    return result, dict(bancas)


# ── Formatação ────────────────────────────────────────────────────────────────

def format_telegram(materias, bancas, questions) -> str:
    hoje  = date.today().strftime("%d/%m/%Y")
    erros = sum(1 for q in questions if q.get("resultado") == "erro")

    lines = [
        f"📊 *TEC – Pontos Fracos por Matéria | {hoje}*",
        f"_{erros} erros registrados em {len(materias)} matérias_",
        "",
    ]

    urgentes = []

    for m in materias:
        lines.append(f"{m['status']} *{m['materia']}* — {m['erros']} erros")

        if m["top3"]:
            for subtop, d in m["top3"]:
                sev = severity_label(d["max_vezes"])
                badges = (" ⚠️" if sev in ("crônico", "crítico") else "") + (" 📅" if d["recente"] else "")
                vezes_str = f" ({d['max_vezes']}x)" if d["max_vezes"] > 1 else ""
                lines.append(f"  • {subtop}{vezes_str}{badges}")
                if sev in ("crônico", "crítico"):
                    urgentes.append(f"• {m['materia']} › {subtop} — {d['max_vezes']}x {sev}")
        else:
            lines.append("  _sem erros registrados_")

        lines.append("")

    if urgentes:
        lines.append("🚨 *Revisão urgente (crônicos)*")
        lines.extend(urgentes[:6])
        lines.append("")

    # Banca: volume de erros, não percentual (sample enviesada para erros)
    banca_parts = []
    for b, d in sorted(bancas.items(), key=lambda x: -x[1]["erros"]):
        if d["erros"]:
            banca_parts.append(f"{b}: {d['erros']} erros")
    if banca_parts:
        lines.append("🏦 *Por Banca (erros):* " + " | ".join(banca_parts))

    prioridades = [m["materia"] for m in materias if m["status"] == "🔴"][:3]
    if not prioridades:
        # Sem crônicos: prioriza por volume de erros
        prioridades = [m["materia"] for m in materias if m["erros"] > 0][:3]
    if prioridades:
        lines.append("🎯 *Foco desta semana:* " + " → ".join(prioridades))

    return "\n".join(lines)


def format_json(materias, bancas, questions):
    return {
        "date": date.today().isoformat(),
        "erros_total": sum(1 for q in questions if q.get("resultado") == "erro"),
        "materias": [
            {
                "materia": m["materia"],
                "erros": m["erros"],
                "status": m["status"],
                "top_subtopicos": [
                    {"subtopico": s, "erros": d["erros"], "max_vezes": d["max_vezes"], "recente": d["recente"]}
                    for s, d in m["top3"]
                ],
                "cronicos": [
                    {"subtopico": s, "max_vezes": d["max_vezes"]}
                    for s, d in m["cronicos"]
                ],
                "recentes": [s for s, _ in m["recentes"]],
            }
            for m in materias
        ],
        "bancas": {
            b: {"erros": d["erros"]}
            for b, d in sorted(bancas.items(), key=lambda x: -x[1]["erros"])
            if d["erros"]
        },
    }


# ── Análise comportamental por LLM ───────────────────────────────────────────

def extract_deep_content(filepath: Path, fm: dict) -> dict:
    """Extrai Resultado + Erro Identificado do corpo do arquivo."""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return {}

    resultado = ""
    m = re.search(r"## Resultado\n+(.*?)(?=\n##|\Z)", text, re.DOTALL)
    if m:
        resultado = m.group(1).strip()[:150]

    erro_ia = ""
    m = re.search(r"##\s*[🎯🔍][^\n]*\n+(.*?)(?=\n##|\Z)", text, re.DOTALL)
    if m:
        erro_ia = m.group(1).strip()[:350]

    return {
        "materia":    fm.get("materia", ""),
        "subtopico":  fm.get("subtopico", ""),
        "banca":      normalize_banca(fm.get("banca", "")),
        "ano":        fm.get("ano", ""),
        "vezes":      fm.get("vezes_errado", 1),
        "resultado":  resultado,
        "erro_ia":    erro_ia,
    }


def load_deep_errors(n: int = 40, days: int = 30, full: bool = False) -> list:
    """Carrega erros para análise LLM.

    full=True  → todos os erros, sem filtro de data.
                 Ordenados por cronicidade (vezes_errado desc) para garantir
                 que os piores apareçam primeiro. Garante ao menos 3 erros
                 por matéria, até o limite n.
    full=False → erros dentro da janela de `days` dias (padrão: 30).
                 Expande para 60 dias se houver menos de 15 erros.
    """
    erros = []
    for md in VAULT_PATH.rglob("Q*.md"):
        fm = parse_frontmatter(md)
        if not fm or fm.get("resultado") != "erro":
            continue
        d = parse_data(fm.get("data"))
        erros.append((d or date.min, md, fm))

    if full:
        # Ordena por cronicidade desc, depois data desc
        erros.sort(key=lambda x: (-int(x[2].get("vezes_errado") or 1), x[0]), reverse=False)
        erros.sort(key=lambda x: (int(x[2].get("vezes_errado") or 1), x[0] or date.min), reverse=True)

        # Garante cobertura mínima por matéria (≥3 por matéria se disponível)
        por_materia: dict[str, list] = defaultdict(list)
        for item in erros:
            m = item[2].get("materia", "")
            por_materia[m].append(item)

        selecionados = []
        # Primeiro, pega os 3 mais crônicos de cada matéria
        for m_erros in por_materia.values():
            selecionados.extend(m_erros[:3])
        # Completa com os mais crônicos globais que ainda não entraram
        ids_sel = {item[2].get("id") for item in selecionados}
        for item in erros:
            if item[2].get("id") not in ids_sel:
                selecionados.append(item)
                ids_sel.add(item[2].get("id"))
            if len(selecionados) >= n:
                break
        candidatos = selecionados[:n]
    else:
        erros.sort(key=lambda x: x[0], reverse=True)
        cutoff = date.today() - timedelta(days=days)
        candidatos = [(d, md, fm) for d, md, fm in erros if d >= cutoff]
        if len(candidatos) < 15:
            cutoff = date.today() - timedelta(days=60)
            candidatos = [(d, md, fm) for d, md, fm in erros if d >= cutoff]
        candidatos = candidatos[:n]

    result = []
    for _, md, fm in candidatos:
        content = extract_deep_content(md, fm)
        if content:
            result.append(content)
    return result


def build_llm_prompt(erros: list, full: bool = False) -> str:
    linhas = []
    for i, q in enumerate(erros, 1):
        vezes_str = f" [{q['vezes']}x errado]" if q.get("vezes", 1) > 1 else ""
        linhas.append(
            f"[{i}] {q['materia']} › {q['subtopico']} | {q['banca']} {q['ano']}{vezes_str}"
        )
        if q.get("resultado"):
            linhas.append(f"    {q['resultado']}")
        if q.get("erro_ia"):
            linhas.append(f"    Análise: {q['erro_ia']}")

    erros_texto = "\n".join(linhas)

    if full:
        instrucao = f"""Você é um especialista em pedagogia de concursos públicos — Auditor Fiscal (SEFAZ estadual / Receita Federal), bancas CEBRASPE, FGV, FCC.

INSTRUÇÕES CRÍTICAS:
- Este é o DIAGNÓSTICO HISTÓRICO COMPLETO do candidato (todos os erros acumulados).
- Escreva DIRETAMENTE a resposta nas seções abaixo. NÃO mostre raciocínio interno.
- Para cada matéria com erros significativos, identifique os subtópicos problemáticos e o padrão de erro dominante.
- Máximo 600 palavras no total.

Erros históricos do candidato ({len(erros)} questões, amostra representativa por matéria):

{erros_texto}

RESPONDA AGORA com exatamente estas seções:

**1. Diagnóstico por matéria** (para cada matéria com ≥3 erros: subtópicos críticos + padrão de erro dominante)

**2. Confusões conceituais mais graves** (os erros que se repetem e custam mais pontos)

**3. Perfil de erro por banca** (o que CEBRASPE, FGV e FCC exploram que te derruba)

**4. Raiz comum dos erros** (padrão comportamental/cognitivo que atravessa matérias)

**5. Plano de ataque — top 5 prioridades absolutas** (o que resolver primeiro para maior impacto no score)"""
    else:
        instrucao = f"""Você é um especialista em pedagogia de concursos públicos — Auditor Fiscal (SEFAZ estadual / Receita Federal), bancas CEBRASPE, FGV, FCC.

INSTRUÇÕES CRÍTICAS:
- Escreva DIRETAMENTE a resposta nas 5 seções abaixo. NÃO mostre raciocínio interno.
- Seja específico e cirúrgico. Cite assuntos concretos.
- Máximo 400 palavras no total.

Erros recentes do candidato ({len(erros)} questões):

{erros_texto}

RESPONDA AGORA com exatamente estas 5 seções:

**1. Padrões comportamentais**

**2. Confusões conceituais recorrentes**

**3. Armadilhas de banca**

**4. Padrões transversais entre matérias**

**5. Top 3 ações desta semana**"""

    return instrucao


def call_opencode(prompt: str, api_key: str) -> str:
    url   = os.environ.get("OPENCODE_BASE_URL", "https://opencode.ai/zen/go/v1") + "/chat/completions"
    body  = json.dumps({
        "model": "deepseek-v4-flash",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 6000,
        "temperature": 0.3,
    }).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent":    "Mozilla/5.0 (compatible; tec-analysis/1.0)",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            msg     = data["choices"][0]["message"]
            content = (msg.get("content") or "").strip()
            if content:
                return content
            # fallback: reasoning_content — extrai a partir da seção "1." se disponível
            reasoning = (msg.get("reasoning_content") or "").strip()
            # tenta localizar a resposta formatada dentro do reasoning
            m = re.search(r"\*\*1\.[^\n]*\n", reasoning)
            if m:
                return reasoning[m.start():].strip()
            return reasoning
    except Exception as e:
        return f"Erro ao chamar OpenCode: {e}"


def run_deep_analysis(full: bool = False) -> str:
    api_key = (
        os.environ.get("OPENCODE_API_KEY")
        or os.environ.get("OPENROUTER_API_KEY", "")
    )
    if not api_key:
        return "ERRO: OPENCODE_API_KEY não definido no .env"

    n = 80 if full else 40
    erros = load_deep_errors(n=n, full=full)
    if not erros:
        return "Nenhum erro encontrado para análise."

    prompt   = build_llm_prompt(erros, full=full)
    analysis = call_opencode(prompt, api_key)

    hoje = date.today().strftime("%d/%m/%Y")
    if full:
        header = f"📋 *Diagnóstico Histórico Completo — {hoje}*\n_(amostra de {len(erros)} erros representativos de toda a história)_"
    else:
        header = f"🧠 *Análise Comportamental — {hoje}*\n_(baseada nos {len(erros)} erros mais recentes)_"
    return f"{header}\n\n{analysis}"


# ── Telegram ──────────────────────────────────────────────────────────────────

def send_telegram(text):
    import urllib.request
    if not BOT_TOKEN:
        print("ERRO: defina TELEGRAM_BOT_TOKEN no arquivo .env ou variável de ambiente.", file=sys.stderr)
        return False
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    for chunk in [text[i:i + 4000] for i in range(0, len(text), 4000)]:
        body = json.dumps({"chat_id": CHAT_ID, "text": chunk, "parse_mode": "Markdown"}).encode()
        req  = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=15)
        except Exception as e:
            print(f"Telegram error: {e}", file=sys.stderr)
            return False
    return True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args    = set(sys.argv[1:])
    deep    = "--deep" in args
    full    = "--full" in args
    send    = "--send" in args
    as_json = "--json" in args

    questions = load_questions()
    if not questions:
        print("Nenhuma questão encontrada no vault.", file=sys.stderr)
        sys.exit(1)

    if deep or full:
        modo = "histórico completo" if full else "recente (30 dias)"
        print(f"Analisando padrões via IA [{modo}]...", file=sys.stderr)
        report = run_deep_analysis(full=full)
        if send:
            ok = send_telegram(report)
            print("Análise enviada." if ok else "Falha no envio.")
        else:
            print(report)
        return

    materias, bancas = analyze(questions)

    if as_json:
        out = format_json(materias, bancas, questions)
        report_path = Path(__file__).parent / "tec_report.json"
        report_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return

    report = format_telegram(materias, bancas, questions)

    if send:
        ok = send_telegram(report)
        if ok:
            print(f"Relatório enviado via Telegram ({len(questions)} questões analisadas).")
        else:
            print(report)
    else:
        print(report)


if __name__ == "__main__":
    main()
