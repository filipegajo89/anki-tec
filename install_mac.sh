#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════╗
# ║     TEC → Anki + Obsidian — Instalador Automático para macOS        ║
# ║     Versão 1.0 | Abril 2026                                         ║
# ╚═══════════════════════════════════════════════════════════════════════╝
#
# USO:
#   1. Abra o Terminal (Cmd+Espaço → digite "Terminal" → Enter)
#   2. Cole este comando e pressione Enter:
#
#      bash <(curl -sL https://raw.githubusercontent.com/filipegajo89/anki-tec/main/install_mac.sh)
#
#   3. Siga as instruções na tela
#
# O que este script faz:
#   ✅ Instala Homebrew (se não tiver)
#   ✅ Instala Google Chrome, Anki, Obsidian (via Homebrew)
#   ✅ Instala Node.js (para MCP filesystem)
#   ✅ Instala uv + notebooklm-mcp-cli (para podcasts)
#   ✅ Cria pasta de Podcasts no iCloud Drive
#   ✅ Configura Claude Desktop (MCPs)
#   ✅ Abre links necessários (Tampermonkey, Gemini API Key)
#
# O que você precisa fazer MANUALMENTE (o script avisa):
#   👤 Instalar Tampermonkey no Chrome (o script abre o link)
#   👤 Instalar AnkiConnect no Anki (o script mostra o código)
#   👤 Instalar Local REST API no Obsidian (o script guia)
#   👤 Gerar chave API do Gemini (o script abre o link)
#   👤 Instalar o script TEC no Tampermonkey
#   👤 Configurar o script (⚙️) com suas credenciais

set -e

# ── Cores e formatação ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "\n${CYAN}▶ $1${NC}"
}

print_ok() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

print_manual() {
    echo -e "\n${YELLOW}╭─────────────────────────────────────────────────────╮${NC}"
    echo -e "${YELLOW}│ 👤 AÇÃO MANUAL NECESSÁRIA                           │${NC}"
    echo -e "${YELLOW}╰─────────────────────────────────────────────────────╯${NC}"
    echo -e "${BOLD}$1${NC}"
}

wait_enter() {
    echo ""
    echo -e "${BOLD}  Pressione ENTER quando terminar...${NC}"
    read -r
}

# ══════════════════════════════════════════════════════════════
#  INÍCIO
# ══════════════════════════════════════════════════════════════

clear
echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║                                                   ║"
echo "  ║     📚 TEC → Anki + Obsidian                     ║"
echo "  ║     Instalador Automático para macOS              ║"
echo "  ║                                                   ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "  Este script vai instalar e configurar tudo para você."
echo "  Alguns passos precisam de interação manual — o script"
echo "  vai avisar quando for necessário."
echo ""
echo -e "  ${YELLOW}Tempo estimado: ~15 minutos${NC}"
echo ""
read -p "  Pressione ENTER para começar (ou Ctrl+C para cancelar)... "

# ══════════════════════════════════════════════════════════════
#  PASSO 1: HOMEBREW
# ══════════════════════════════════════════════════════════════

print_header "PASSO 1/12 — Homebrew (gerenciador de pacotes)"

if command -v brew &>/dev/null; then
    print_ok "Homebrew já está instalado ($(brew --version | head -1))"
else
    print_step "Instalando Homebrew..."
    echo "  Pode pedir sua senha do Mac — é normal."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Adicionar ao PATH (Apple Silicon)
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    print_ok "Homebrew instalado!"
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 2: GOOGLE CHROME
# ══════════════════════════════════════════════════════════════

print_header "PASSO 2/12 — Google Chrome"

if [[ -d "/Applications/Google Chrome.app" ]]; then
    print_ok "Google Chrome já está instalado"
else
    print_step "Instalando Google Chrome..."
    brew install --cask google-chrome
    print_ok "Chrome instalado!"
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 3: ANKI
# ══════════════════════════════════════════════════════════════

print_header "PASSO 3/12 — Anki (flashcards)"

if [[ -d "/Applications/Anki.app" ]]; then
    print_ok "Anki já está instalado"
else
    print_step "Instalando Anki..."
    brew install --cask anki
    print_ok "Anki instalado!"
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 4: ANKICONNECT
# ══════════════════════════════════════════════════════════════

print_header "PASSO 4/12 — AnkiConnect (plugin do Anki)"

print_manual "Siga estes passos:"
echo ""
echo "  1. Abra o Anki (se não estiver aberto)"
echo ""

# Abrir o Anki automaticamente
open -a Anki 2>/dev/null || true
sleep 2

echo "  2. No Anki, vá em: Ferramentas → Complementos → Obter Complementos"
echo "  3. Digite este código: ${BOLD}2055492159${NC}"
echo "  4. Clique OK e reinicie o Anki"
echo ""
echo "  5. Depois, vá em: Ferramentas → Complementos → AnkiConnect → Configurar"
echo "  6. Encontre a linha 'webCorsOriginList' e mude para:"
echo -e "     ${CYAN}\"webCorsOriginList\": [\"*\"]${NC}"
echo "  7. Clique OK e reinicie o Anki"
wait_enter

# ══════════════════════════════════════════════════════════════
#  PASSO 5: OBSIDIAN
# ══════════════════════════════════════════════════════════════

print_header "PASSO 5/12 — Obsidian (notas)"

if [[ -d "/Applications/Obsidian.app" ]]; then
    print_ok "Obsidian já está instalado"
else
    print_step "Instalando Obsidian..."
    brew install --cask obsidian
    print_ok "Obsidian instalado!"
fi

# Detectar vault existente
VAULT_PATH=""
VAULT_NAME=""
OBSIDIAN_CONFIG="$HOME/Library/Application Support/obsidian/obsidian.json"
if [[ -f "$OBSIDIAN_CONFIG" ]]; then
    # Extrair o primeiro vault path
    VAULT_PATH=$(python3 -c "
import json
with open('$OBSIDIAN_CONFIG') as f:
    data = json.load(f)
    for v in data.get('vaults', {}).values():
        print(v.get('path', ''))
        break
" 2>/dev/null || true)
fi

if [[ -n "$VAULT_PATH" && -d "$VAULT_PATH" ]]; then
    VAULT_NAME=$(basename "$VAULT_PATH")
    print_ok "Vault detectado: $VAULT_NAME"
    echo -e "     Caminho: ${CYAN}$VAULT_PATH${NC}"
else
    print_manual "Crie um vault no Obsidian:"
    echo ""
    echo "  1. Abra o Obsidian"
    open -a Obsidian 2>/dev/null || true
    echo "  2. Clique em 'Criar novo vault'"
    echo "  3. Dê um nome (ex: 'Meu Estudo')"
    echo "  4. Escolha onde salvar (pode ser Documentos)"
    echo "  5. Clique em 'Criar'"
    wait_enter

    # Tentar detectar novamente
    if [[ -f "$OBSIDIAN_CONFIG" ]]; then
        VAULT_PATH=$(python3 -c "
import json
with open('$OBSIDIAN_CONFIG') as f:
    data = json.load(f)
    for v in data.get('vaults', {}).values():
        print(v.get('path', ''))
        break
" 2>/dev/null || true)
        VAULT_NAME=$(basename "$VAULT_PATH")
    fi

    if [[ -z "$VAULT_PATH" ]]; then
        echo ""
        read -p "  Digite o caminho completo do vault: " VAULT_PATH
        VAULT_NAME=$(basename "$VAULT_PATH")
    fi
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 6: OBSIDIAN LOCAL REST API PLUGIN
# ══════════════════════════════════════════════════════════════

print_header "PASSO 6/12 — Plugin Local REST API (Obsidian)"

print_manual "No Obsidian, instale o plugin:"
echo ""
echo "  1. Abra o Obsidian (se não estiver aberto)"
echo "  2. Clique na ⚙️ engrenagem (canto inferior esquerdo)"
echo "  3. Vá em 'Plugins da comunidade'"
echo "  4. Clique 'Ativar plugins' (se for primeira vez)"
echo "  5. Clique 'Procurar' e busque: ${BOLD}Local REST API${NC}"
echo "  6. Instale e ative o plugin"
echo "  7. Nas configurações do plugin, copie a ${BOLD}API Key${NC}"
echo ""
read -p "  Cole a API Key do Obsidian aqui (ou ENTER para pular): " OBS_TOKEN
OBS_TOKEN=${OBS_TOKEN:-"COLE_SUA_API_KEY_AQUI"}

# ══════════════════════════════════════════════════════════════
#  PASSO 7: NODE.JS
# ══════════════════════════════════════════════════════════════

print_header "PASSO 7/12 — Node.js"

if command -v node &>/dev/null; then
    print_ok "Node.js já está instalado ($(node --version))"
else
    print_step "Instalando Node.js..."
    brew install node
    print_ok "Node.js instalado! ($(node --version))"
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 8: UV + NOTEBOOKLM-MCP-CLI
# ══════════════════════════════════════════════════════════════

print_header "PASSO 8/12 — uv + NotebookLM CLI (para podcasts)"

if command -v uv &>/dev/null; then
    print_ok "uv já está instalado ($(uv --version))"
else
    print_step "Instalando uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"

    # Garantir no PATH permanente
    if ! grep -q '.local/bin' "$HOME/.zshrc" 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    fi
    print_ok "uv instalado!"
fi

export PATH="$HOME/.local/bin:$PATH"

if command -v nlm &>/dev/null; then
    print_ok "notebooklm-mcp-cli já está instalado ($(nlm --version 2>&1 | head -1))"
else
    print_step "Instalando notebooklm-mcp-cli..."
    uv tool install notebooklm-mcp-cli
    print_ok "notebooklm-mcp-cli instalado!"
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 9: AUTENTICAR NOTEBOOKLM
# ══════════════════════════════════════════════════════════════

print_header "PASSO 9/12 — Autenticar no NotebookLM"

print_step "Abrindo Chrome para login no Google..."
echo "  O Chrome vai abrir — faça login com sua conta Google."
echo "  A janela fecha sozinha quando terminar."
echo ""

nlm login 2>&1 || true

# Verificar
if nlm login --check &>/dev/null; then
    print_ok "Autenticado no NotebookLM!"
else
    print_warn "Autenticação pode ter falhado. Rode 'nlm login' depois."
fi

# ══════════════════════════════════════════════════════════════
#  PASSO 10: CRIAR PASTAS E CONFIGURAR
# ══════════════════════════════════════════════════════════════

print_header "PASSO 10/12 — Criar pastas e configurar Claude Desktop"

# Criar pasta TEC no vault
if [[ -n "$VAULT_PATH" ]]; then
    mkdir -p "$VAULT_PATH/TEC"
    print_ok "Pasta TEC criada no vault: $VAULT_PATH/TEC"
fi

# Criar pasta Podcasts no iCloud Drive
ICLOUD_PATH="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
PODCASTS_PATH="$ICLOUD_PATH/Podcasts"
if [[ -d "$ICLOUD_PATH" ]]; then
    mkdir -p "$PODCASTS_PATH"
    print_ok "Pasta Podcasts criada no iCloud Drive"
else
    PODCASTS_PATH="$HOME/Documents/Podcasts"
    mkdir -p "$PODCASTS_PATH"
    print_warn "iCloud Drive não encontrado. Pasta criada em: $PODCASTS_PATH"
fi

# Configurar Claude Desktop
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
NLM_PATH=$(which notebooklm-mcp 2>/dev/null || echo "$HOME/.local/bin/notebooklm-mcp")
TEC_PATH="${VAULT_PATH}/TEC"

mkdir -p "$CLAUDE_CONFIG_DIR"

print_step "Configurando Claude Desktop..."

python3 << PYEOF
import json, os

config_path = "$CLAUDE_CONFIG"
config = {}

# Ler config existente
if os.path.exists(config_path):
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except:
        config = {}

# Adicionar MCPs (sem sobrescrever preferences)
config["mcpServers"] = {
    "filesystem": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            "$TEC_PATH",
            "$PODCASTS_PATH"
        ]
    },
    "notebooklm-mcp": {
        "command": "$NLM_PATH",
        "env": {
            "NOTEBOOKLM_HL": "pt"
        }
    }
}

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("OK")
PYEOF

print_ok "Claude Desktop configurado com MCPs!"
echo -e "     filesystem → ${CYAN}$TEC_PATH${NC}"
echo -e "     filesystem → ${CYAN}$PODCASTS_PATH${NC}"
echo -e "     notebooklm → ${CYAN}$NLM_PATH${NC}"

# ══════════════════════════════════════════════════════════════
#  PASSO 11: TAMPERMONKEY + SCRIPT
# ══════════════════════════════════════════════════════════════

print_header "PASSO 11/12 — Tampermonkey e Script TEC"

print_manual "Instale o Tampermonkey e o script:"
echo ""
echo "  Abrindo links no Chrome..."
sleep 1

# Abrir Tampermonkey na Chrome Web Store
open "https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" 2>/dev/null || true
echo ""
echo "  1. Na aba que abriu, clique '${BOLD}Usar no Chrome${NC}' → '${BOLD}Adicionar extensão${NC}'"
wait_enter

# Abrir link de instalação do script
open "https://github.com/filipegajo89/anki-tec/raw/main/tec-to-anki.user.js" 2>/dev/null || true
echo ""
echo "  2. O Tampermonkey vai mostrar a tela de instalação"
echo "     Clique em '${BOLD}Instalar${NC}'"
wait_enter

# ══════════════════════════════════════════════════════════════
#  PASSO 12: CHAVE API GEMINI + CONFIGURAÇÃO FINAL
# ══════════════════════════════════════════════════════════════

print_header "PASSO 12/12 — Chave API Gemini e Configuração Final"

print_manual "Gere sua chave API do Gemini:"
echo ""
echo "  Abrindo o Google AI Studio..."
sleep 1
open "https://aistudio.google.com/apikey" 2>/dev/null || true
echo ""
echo "  1. Faça login com sua conta Google"
echo "  2. Clique em '${BOLD}Criar chave de API${NC}'"
echo "  3. Copie a chave (começa com AIzaSy...)"
echo ""
read -p "  Cole a chave API do Gemini aqui (ou ENTER para pular): " GEMINI_KEY
GEMINI_KEY=${GEMINI_KEY:-"COLE_SUA_CHAVE_AQUI"}

echo ""
echo -e "${YELLOW}╭─────────────────────────────────────────────────────╮${NC}"
echo -e "${YELLOW}│ ⚙️  CONFIGURAÇÃO DO SCRIPT                          │${NC}"
echo -e "${YELLOW}╰─────────────────────────────────────────────────────╯${NC}"
echo ""
echo "  Agora configure o script no TEC Concursos:"
echo ""
echo "  1. Abra ${BOLD}tecconcursos.com.br${NC} no Chrome"
echo "  2. Navegue até qualquer questão"
echo "  3. Clique no botão ⚙️ na barra flutuante (canto inferior direito)"
echo "  4. Preencha:"
echo ""
echo -e "     ${BOLD}Gemini API Key:${NC}    ${CYAN}$GEMINI_KEY${NC}"
echo -e "     ${BOLD}Nome do Vault:${NC}     ${CYAN}$VAULT_NAME${NC}"
echo -e "     ${BOLD}Token Obsidian:${NC}    ${CYAN}$OBS_TOKEN${NC}"
echo -e "     ${BOLD}Porta Obsidian:${NC}    ${CYAN}27123${NC}"
echo -e "     ${BOLD}Pasta Base:${NC}        ${CYAN}TEC${NC}"
echo -e "     ${BOLD}Prefixo Deck:${NC}      ${CYAN}Meus Erros${NC} (ou o que preferir)"
echo ""
echo "  5. Clique '💾 Salvar'"
wait_enter

# ══════════════════════════════════════════════════════════════
#  RESUMO FINAL
# ══════════════════════════════════════════════════════════════

clear
echo ""
echo -e "${GREEN}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║                                                   ║"
echo "  ║     🎉 INSTALAÇÃO CONCLUÍDA!                     ║"
echo "  ║                                                   ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "  ✅ Programas instalados:"
echo "     • Google Chrome"
echo "     • Anki + AnkiConnect"
echo "     • Obsidian + Local REST API"
echo "     • Node.js"
echo "     • uv + notebooklm-mcp-cli"
echo ""
echo "  ✅ Configurações:"
echo "     • Claude Desktop → MCPs configurados"
echo -e "     • Vault Obsidian: ${CYAN}$VAULT_PATH${NC}"
echo -e "     • Pasta Podcasts: ${CYAN}$PODCASTS_PATH${NC}"
echo ""
echo -e "  ${BOLD}📋 COMO USAR:${NC}"
echo ""
echo "  Para gerar flashcards:"
echo "    1. Abra o Anki e o Obsidian"
echo "    2. No TEC Concursos, resolva um caderno"
echo "    3. Na questão errada: pressione ${BOLD}Shift + Enter${NC}"
echo "    4. Ou clique em ${BOLD}📋 Erros${NC} para processar todas"
echo ""
echo "  Para gerar podcasts:"
echo "    1. Abra o Claude Desktop"
echo "    2. Diga: 'Leia minhas notas de Direito Constitucional"
echo "       e gere um podcast no NotebookLM'"
echo ""
echo -e "  ${YELLOW}⚠️  LEMBRETE: Anki e Obsidian precisam estar ABERTOS${NC}"
echo -e "  ${YELLOW}    quando for usar o script no TEC.${NC}"
echo ""
echo -e "  ${BLUE}📖 Guia completo: github.com/filipegajo89/anki-tec${NC}"
echo ""
