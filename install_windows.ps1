# Requires -RunAsAdministrator
# ╔═══════════════════════════════════════════════════════════════════════╗
# ║     TEC → Anki + Obsidian — Instalador Automático para Windows      ║
# ║     Versão 1.0 | Abril 2026                                         ║
# ╚═══════════════════════════════════════════════════════════════════════╝
#
# USO:
#   1. Clique com botão direito no PowerShell → "Executar como Administrador"
#   2. Cole este comando e pressione Enter:
#
#      Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/filipegajo89/anki-tec/main/install_windows.ps1 | iex
#
#   3. Siga as instruções na tela

$ErrorActionPreference = "Stop"

# ── Cores e formatação ──
function Write-Header($text) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║ $text" -ForegroundColor Blue
    Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Blue
}

function Write-Step($text) {
    Write-Host "`n▶ $text" -ForegroundColor Cyan
}

function Write-OK($text) {
    Write-Host "  ✅ $text" -ForegroundColor Green
}

function Write-Warn($text) {
    Write-Host "  ⚠️  $text" -ForegroundColor Yellow
}

function Write-Err($text) {
    Write-Host "  ❌ $text" -ForegroundColor Red
}

function Write-Manual($text) {
    Write-Host ""
    Write-Host "╭─────────────────────────────────────────────────────╮" -ForegroundColor Yellow
    Write-Host "│ 👤 AÇÃO MANUAL NECESSÁRIA                           │" -ForegroundColor Yellow
    Write-Host "╰─────────────────────────────────────────────────────╯" -ForegroundColor Yellow
    Write-Host $text -ForegroundColor White
}

function Wait-Enter {
    Write-Host ""
    Write-Host "  Pressione ENTER quando terminar..." -ForegroundColor White -NoNewline
    Read-Host
}

function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# ══════════════════════════════════════════════════════════════
#  INÍCIO
# ══════════════════════════════════════════════════════════════

Clear-Host
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║                                                   ║" -ForegroundColor Blue
Write-Host "  ║     📚 TEC → Anki + Obsidian                     ║" -ForegroundColor Blue
Write-Host "  ║     Instalador Automático para Windows            ║" -ForegroundColor Blue
Write-Host "  ║                                                   ║" -ForegroundColor Blue
Write-Host "  ╚═══════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "  Este script vai instalar e configurar tudo para você."
Write-Host "  Alguns passos precisam de interação manual — o script"
Write-Host "  vai avisar quando for necessário."
Write-Host ""
Write-Host "  Tempo estimado: ~15 minutos" -ForegroundColor Yellow
Write-Host ""
Read-Host "  Pressione ENTER para começar (ou feche a janela para cancelar)"

# Verificar se está rodando como Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "Este script precisa ser executado como Administrador!"
    Write-Host ""
    Write-Host "  Clique com botão direito no PowerShell → 'Executar como Administrador'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Pressione ENTER para sair"
    exit 1
}

# Verificar se winget está disponível
$hasWinget = Test-Command "winget"
if (-not $hasWinget) {
    Write-Warn "winget não encontrado. Verificando versão do Windows..."
    # Tentar instalar App Installer (que inclui winget) via Microsoft Store
    Write-Step "Abrindo Microsoft Store para instalar 'Instalador de Aplicativo'..."
    Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1"
    Write-Manual "Instale o 'Instalador de Aplicativo' na Microsoft Store que abriu."
    Wait-Enter
    # Verificar novamente
    $hasWinget = Test-Command "winget"
    if (-not $hasWinget) {
        Write-Err "winget ainda não encontrado. Instale o Windows App Installer e tente novamente."
        exit 1
    }
}
Write-OK "winget disponível"

# ══════════════════════════════════════════════════════════════
#  PASSO 1: GOOGLE CHROME
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 1/12 — Google Chrome"

$chrome = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" -ErrorAction SilentlyContinue
if ($chrome) {
    Write-OK "Google Chrome já está instalado"
} else {
    Write-Step "Instalando Google Chrome..."
    winget install -e --id Google.Chrome --accept-package-agreements --accept-source-agreements
    Write-OK "Chrome instalado!"
}

# ══════════════════════════════════════════════════════════════
#  PASSO 2: ANKI
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 2/12 — Anki (flashcards)"

$ankiPath = "$env:LOCALAPPDATA\Programs\Anki\anki.exe"
$ankiExists = (Test-Path $ankiPath) -or (Test-Command "anki")

if ($ankiExists) {
    Write-OK "Anki já está instalado"
} else {
    Write-Step "Instalando Anki..."
    winget install -e --id Anki.Anki --accept-package-agreements --accept-source-agreements
    Write-OK "Anki instalado!"
}

# ══════════════════════════════════════════════════════════════
#  PASSO 3: ANKICONNECT
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 3/12 — AnkiConnect (plugin do Anki)"

Write-Manual "Siga estes passos:"
Write-Host ""
Write-Host "  1. Abra o Anki (se não estiver aberto)"

# Tentar abrir o Anki
try {
    Start-Process "anki" -ErrorAction SilentlyContinue
} catch {
    try {
        Start-Process "$env:LOCALAPPDATA\Programs\Anki\anki.exe" -ErrorAction SilentlyContinue
    } catch {}
}
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "  2. No Anki, vá em: Ferramentas → Complementos → Obter Complementos"
Write-Host "  3. Digite este código: " -NoNewline
Write-Host "2055492159" -ForegroundColor White
Write-Host "  4. Clique OK e reinicie o Anki"
Write-Host ""
Write-Host "  5. Depois, vá em: Ferramentas → Complementos → AnkiConnect → Configurar"
Write-Host "  6. Encontre a linha 'webCorsOriginList' e mude para:"
Write-Host '     "webCorsOriginList": ["*"]' -ForegroundColor Cyan
Write-Host "  7. Clique OK e reinicie o Anki"
Wait-Enter

# ══════════════════════════════════════════════════════════════
#  PASSO 4: OBSIDIAN
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 4/12 — Obsidian (notas)"

$obsidianExists = (Test-Path "$env:LOCALAPPDATA\Obsidian\Obsidian.exe") -or (Test-Command "obsidian")

if ($obsidianExists) {
    Write-OK "Obsidian já está instalado"
} else {
    Write-Step "Instalando Obsidian..."
    winget install -e --id Obsidian.Obsidian --accept-package-agreements --accept-source-agreements
    Write-OK "Obsidian instalado!"
}

# Detectar vault
$vaultPath = ""
$vaultName = ""
$obsidianConfig = "$env:APPDATA\obsidian\obsidian.json"

if (Test-Path $obsidianConfig) {
    try {
        $obsConfig = Get-Content $obsidianConfig -Raw | ConvertFrom-Json
        $firstVault = $obsConfig.vaults.PSObject.Properties | Select-Object -First 1
        if ($firstVault) {
            $vaultPath = $firstVault.Value.path
            $vaultName = Split-Path $vaultPath -Leaf
        }
    } catch {}
}

if ($vaultPath -and (Test-Path $vaultPath)) {
    Write-OK "Vault detectado: $vaultName"
    Write-Host "     Caminho: $vaultPath" -ForegroundColor Cyan
} else {
    Write-Manual "Crie um vault no Obsidian:"
    Write-Host ""
    Write-Host "  1. Abra o Obsidian"
    try { Start-Process "obsidian" -ErrorAction SilentlyContinue } catch {}
    Write-Host "  2. Clique em 'Criar novo vault'"
    Write-Host "  3. Dê um nome (ex: 'Meu Estudo')"
    Write-Host "  4. Clique em 'Criar'"
    Wait-Enter

    # Tentar novamente
    if (Test-Path $obsidianConfig) {
        try {
            $obsConfig = Get-Content $obsidianConfig -Raw | ConvertFrom-Json
            $firstVault = $obsConfig.vaults.PSObject.Properties | Select-Object -First 1
            if ($firstVault) {
                $vaultPath = $firstVault.Value.path
                $vaultName = Split-Path $vaultPath -Leaf
            }
        } catch {}
    }

    if (-not $vaultPath) {
        $vaultPath = Read-Host "  Digite o caminho completo do vault"
        $vaultName = Split-Path $vaultPath -Leaf
    }
}

# ══════════════════════════════════════════════════════════════
#  PASSO 5: OBSIDIAN LOCAL REST API PLUGIN
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 5/12 — Plugin Local REST API (Obsidian)"

Write-Manual "No Obsidian, instale o plugin:"
Write-Host ""
Write-Host "  1. Abra o Obsidian (se não estiver aberto)"
Write-Host "  2. Clique na ⚙️ engrenagem (canto inferior esquerdo)"
Write-Host "  3. Vá em 'Plugins da comunidade'"
Write-Host "  4. Clique 'Ativar plugins' (se for primeira vez)"
Write-Host "  5. Clique 'Procurar' e busque: " -NoNewline
Write-Host "Local REST API" -ForegroundColor White
Write-Host "  6. Instale e ative o plugin"
Write-Host "  7. Nas configurações do plugin, copie a API Key"
Write-Host ""
$obsToken = Read-Host "  Cole a API Key do Obsidian aqui (ou ENTER para pular)"
if (-not $obsToken) { $obsToken = "COLE_SUA_API_KEY_AQUI" }

# ══════════════════════════════════════════════════════════════
#  PASSO 6: NODE.JS
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 6/12 — Node.js"

if (Test-Command "node") {
    Write-OK "Node.js já está instalado ($(node --version))"
} else {
    Write-Step "Instalando Node.js..."
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-OK "Node.js instalado!"
}

# ══════════════════════════════════════════════════════════════
#  PASSO 7: UV + NOTEBOOKLM-MCP-CLI
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 7/12 — uv + NotebookLM CLI (para podcasts)"

$uvPath = "$env:USERPROFILE\.local\bin\uv.exe"
$hasUv = (Test-Command "uv") -or (Test-Path $uvPath)

if ($hasUv) {
    Write-OK "uv já está instalado"
} else {
    Write-Step "Instalando uv..."
    irm https://astral.sh/uv/install.ps1 | iex
    # Refresh PATH
    $env:Path = "$env:USERPROFILE\.local\bin;" + $env:Path
    Write-OK "uv instalado!"
}

# Garantir PATH
if ($env:Path -notlike "*\.local\bin*") {
    $env:Path = "$env:USERPROFILE\.local\bin;" + $env:Path
}

# Adicionar ao PATH permanente do usuário
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$localBin = "$env:USERPROFILE\.local\bin"
if ($userPath -notlike "*$localBin*") {
    [System.Environment]::SetEnvironmentVariable("Path", "$localBin;$userPath", "User")
    Write-OK "PATH atualizado permanentemente"
}

$nlmPath = "$env:USERPROFILE\.local\bin\notebooklm-mcp.exe"
$hasNlm = (Test-Command "nlm") -or (Test-Path $nlmPath)

if ($hasNlm) {
    Write-OK "notebooklm-mcp-cli já está instalado"
} else {
    Write-Step "Instalando notebooklm-mcp-cli..."
    uv tool install notebooklm-mcp-cli
    Write-OK "notebooklm-mcp-cli instalado!"
}

# ══════════════════════════════════════════════════════════════
#  PASSO 8: AUTENTICAR NOTEBOOKLM
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 8/12 — Autenticar no NotebookLM"

Write-Step "Abrindo Chrome para login no Google..."
Write-Host "  O Chrome vai abrir — faça login com sua conta Google."
Write-Host "  A janela fecha sozinha quando terminar."
Write-Host ""

try {
    & nlm login 2>&1
} catch {
    Write-Warn "Erro durante autenticação. Rode 'nlm login' depois."
}

# Verificar
try {
    & nlm login --check 2>&1 | Out-Null
    Write-OK "Autenticado no NotebookLM!"
} catch {
    Write-Warn "Autenticação pode ter falhado. Rode 'nlm login' depois."
}

# ══════════════════════════════════════════════════════════════
#  PASSO 9: CRIAR PASTAS
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 9/12 — Criar pastas"

# Criar pasta TEC no vault
if ($vaultPath) {
    $tecPath = Join-Path $vaultPath "TEC"
    New-Item -ItemType Directory -Path $tecPath -Force | Out-Null
    Write-OK "Pasta TEC criada: $tecPath"
}

# Pasta Podcasts
$podcastsPath = Join-Path $env:USERPROFILE "Documents\Podcasts"
New-Item -ItemType Directory -Path $podcastsPath -Force | Out-Null
Write-OK "Pasta Podcasts: $podcastsPath"

# ══════════════════════════════════════════════════════════════
#  PASSO 10: CONFIGURAR CLAUDE DESKTOP
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 10/12 — Configurar Claude Desktop"

# Verificar se Claude Desktop está instalado
$claudeConfigDir = "$env:APPDATA\Claude"
$claudeConfig = "$claudeConfigDir\claude_desktop_config.json"
$nlmExe = "$env:USERPROFILE\.local\bin\notebooklm-mcp.exe"

if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

# Escapar caminhos para JSON (backslashes -> forward slashes)
$tecPathJson = $tecPath -replace '\\', '/'
$podcastsPathJson = $podcastsPath -replace '\\', '/'
$nlmExeJson = $nlmExe -replace '\\', '/'

# Ler config existente ou criar nova
$config = @{}
if (Test-Path $claudeConfig) {
    try {
        $config = Get-Content $claudeConfig -Raw | ConvertFrom-Json -AsHashtable
    } catch {
        $config = @{}
    }
}

$config["mcpServers"] = @{
    "filesystem" = @{
        "command" = "npx"
        "args" = @(
            "-y"
            "@modelcontextprotocol/server-filesystem"
            $tecPathJson
            $podcastsPathJson
        )
    }
    "notebooklm-mcp" = @{
        "command" = $nlmExeJson
        "env" = @{
            "NOTEBOOKLM_HL" = "pt"
        }
    }
}

$config | ConvertTo-Json -Depth 10 | Set-Content $claudeConfig -Encoding UTF8
Write-OK "Claude Desktop configurado com MCPs!"
Write-Host "     filesystem → $tecPathJson" -ForegroundColor Cyan
Write-Host "     filesystem → $podcastsPathJson" -ForegroundColor Cyan
Write-Host "     notebooklm → $nlmExeJson" -ForegroundColor Cyan

# ══════════════════════════════════════════════════════════════
#  PASSO 11: TAMPERMONKEY + SCRIPT
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 11/12 — Tampermonkey e Script TEC"

Write-Manual "Instale o Tampermonkey e o script:"
Write-Host ""
Write-Host "  Abrindo links no Chrome..."
Start-Sleep -Seconds 1

Start-Process "https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
Write-Host ""
Write-Host "  1. Na aba que abriu, clique 'Usar no Chrome' → 'Adicionar extensão'"
Wait-Enter

Start-Process "https://github.com/filipegajo89/anki-tec/raw/main/tec-to-anki.user.js"
Write-Host ""
Write-Host "  2. O Tampermonkey vai mostrar a tela de instalação"
Write-Host "     Clique em 'Instalar'"
Wait-Enter

# ══════════════════════════════════════════════════════════════
#  PASSO 12: CHAVE API GEMINI + CONFIGURAÇÃO FINAL
# ══════════════════════════════════════════════════════════════

Write-Header "PASSO 12/12 — Chave API Gemini e Configuração Final"

Write-Manual "Gere sua chave API do Gemini:"
Write-Host ""
Write-Host "  Abrindo o Google AI Studio..."
Start-Sleep -Seconds 1
Start-Process "https://aistudio.google.com/apikey"
Write-Host ""
Write-Host "  1. Faça login com sua conta Google"
Write-Host "  2. Clique em 'Criar chave de API'"
Write-Host "  3. Copie a chave (começa com AIzaSy...)"
Write-Host ""
$geminiKey = Read-Host "  Cole a chave API do Gemini aqui (ou ENTER para pular)"
if (-not $geminiKey) { $geminiKey = "COLE_SUA_CHAVE_AQUI" }

Write-Host ""
Write-Host "╭─────────────────────────────────────────────────────╮" -ForegroundColor Yellow
Write-Host "│ ⚙️  CONFIGURAÇÃO DO SCRIPT                          │" -ForegroundColor Yellow
Write-Host "╰─────────────────────────────────────────────────────╯" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Agora configure o script no TEC Concursos:"
Write-Host ""
Write-Host "  1. Abra tecconcursos.com.br no Chrome"
Write-Host "  2. Navegue até qualquer questão"
Write-Host "  3. Clique no botão ⚙️ na barra flutuante"
Write-Host "  4. Preencha:"
Write-Host ""
Write-Host "     Gemini API Key:    " -NoNewline; Write-Host $geminiKey -ForegroundColor Cyan
Write-Host "     Nome do Vault:     " -NoNewline; Write-Host $vaultName -ForegroundColor Cyan
Write-Host "     Token Obsidian:    " -NoNewline; Write-Host $obsToken -ForegroundColor Cyan
Write-Host "     Porta Obsidian:    " -NoNewline; Write-Host "27123" -ForegroundColor Cyan
Write-Host "     Pasta Base:        " -NoNewline; Write-Host "TEC" -ForegroundColor Cyan
Write-Host "     Prefixo Deck:      " -NoNewline; Write-Host "Meus Erros (ou o que preferir)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  5. Clique '💾 Salvar'"
Wait-Enter

# ══════════════════════════════════════════════════════════════
#  RESUMO FINAL
# ══════════════════════════════════════════════════════════════

Clear-Host
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                                                   ║" -ForegroundColor Green
Write-Host "  ║     🎉 INSTALAÇÃO CONCLUÍDA!                     ║" -ForegroundColor Green
Write-Host "  ║                                                   ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  ✅ Programas instalados:"
Write-Host "     • Google Chrome"
Write-Host "     • Anki + AnkiConnect"
Write-Host "     • Obsidian + Local REST API"
Write-Host "     • Node.js"
Write-Host "     • uv + notebooklm-mcp-cli"
Write-Host ""
Write-Host "  ✅ Configurações:"
Write-Host "     • Claude Desktop → MCPs configurados"
Write-Host "     • Vault Obsidian: $vaultPath" -ForegroundColor Cyan
Write-Host "     • Pasta Podcasts: $podcastsPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📋 COMO USAR:" -ForegroundColor White
Write-Host ""
Write-Host "  Para gerar flashcards:"
Write-Host "    1. Abra o Anki e o Obsidian"
Write-Host "    2. No TEC Concursos, resolva um caderno"
Write-Host "    3. Na questão errada: pressione Shift + Enter"
Write-Host "    4. Ou clique em 📋 Erros para processar todas"
Write-Host ""
Write-Host "  Para gerar podcasts:"
Write-Host "    1. Abra o Claude Desktop"
Write-Host "    2. Diga: 'Leia minhas notas de Direito Constitucional"
Write-Host "       e gere um podcast no NotebookLM'"
Write-Host ""
Write-Host "  ⚠️  LEMBRETE: Anki e Obsidian precisam estar ABERTOS" -ForegroundColor Yellow
Write-Host "     quando for usar o script no TEC." -ForegroundColor Yellow
Write-Host ""
Write-Host "  📖 Guia completo: github.com/filipegajo89/anki-tec" -ForegroundColor Blue
Write-Host ""
Read-Host "  Pressione ENTER para fechar"
