#!/bin/bash
# watch-tec-podcast.sh
# Monitora a pasta TEC do Obsidian e regenera os podcast briefings
# sempre que um novo arquivo Q*.md for criado ou modificado.
#
# Requer: fswatch (brew install fswatch)
# Rodado pelo LaunchAgent br.filipegajo.tec-podcast.plist

set -euo pipefail

VAULT_TEC="/Users/filipegajo/Filipe - Obs/TEC"
SCRIPT="/Users/filipegajo/anki-tec/gerar-podcast-briefing.py"
LOG="/Users/filipegajo/anki-tec/podcast-watch.log"
PYTHON="/usr/bin/python3"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

log "=== Watch iniciado ==="
log "Monitorando: $VAULT_TEC"

# Verifica dependências
if ! command -v fswatch &>/dev/null; then
    log "ERRO: fswatch não instalado. Execute: brew install fswatch"
    exit 1
fi

if [ ! -f "$SCRIPT" ]; then
    log "ERRO: script não encontrado em $SCRIPT"
    exit 1
fi

# Executa uma vez ao iniciar (processa estado atual)
log "Execução inicial..."
"$PYTHON" "$SCRIPT" >> "$LOG" 2>&1 && log "Execução inicial concluída." || log "Erro na execução inicial."

# Debounce: aguarda N segundos após último evento antes de re-executar
DEBOUNCE=10
LAST_RUN=0

log "Aguardando mudanças em Q*.md..."

fswatch \
    --event Created \
    --event Updated \
    --event Renamed \
    --include "Q[0-9]+\\.md$" \
    --exclude "_Podcasts" \
    --recursive \
    "$VAULT_TEC" | while read -r changed_file; do

    # Só processa arquivos Q*.md
    if [[ "$changed_file" != *"/Q"* ]]; then
        continue
    fi

    NOW=$(date +%s)
    DIFF=$((NOW - LAST_RUN))

    if [ "$DIFF" -lt "$DEBOUNCE" ]; then
        log "Mudança detectada (debounce ativo, aguardando...): $changed_file"
        continue
    fi

    LAST_RUN=$NOW
    log "Mudança detectada: $changed_file"
    log "Regenerando podcast briefings..."

    # Detecta a matéria pelo caminho do arquivo
    # Estrutura: .../TEC/<Matéria>/<Subtópico>/Q*.md
    MATERIA=$(echo "$changed_file" | sed "s|$VAULT_TEC/||" | cut -d'/' -f1)

    if [ -n "$MATERIA" ] && [ "$MATERIA" != "_Podcasts" ]; then
        log "Matéria detectada: $MATERIA"
        "$PYTHON" "$SCRIPT" --materia "$MATERIA" >> "$LOG" 2>&1 \
            && log "✓ Briefing de '$MATERIA' atualizado." \
            || log "Erro ao gerar briefing de '$MATERIA'."
    else
        # Regenera tudo se não conseguir detectar a matéria
        "$PYTHON" "$SCRIPT" >> "$LOG" 2>&1 \
            && log "✓ Todos os briefings atualizados." \
            || log "Erro ao gerar briefings."
    fi
done
