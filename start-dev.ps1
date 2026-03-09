param(
    [switch]$CheckOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command: $Name. Check the README prerequisites."
    }
}

function Resolve-PoetryCommand {
    function Test-PoetryModule {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Launcher
        )

        if (-not (Get-Command $Launcher -ErrorAction SilentlyContinue)) {
            return $false
        }

        cmd.exe /d /c "$Launcher -m poetry --version >nul 2>nul"
        return $LASTEXITCODE -eq 0
    }

    if (Get-Command "poetry" -ErrorAction SilentlyContinue) {
        return "poetry"
    }

    if (Test-PoetryModule -Launcher "py") {
        return "py -m poetry"
    }

    if (Test-PoetryModule -Launcher "python") {
        return "python -m poetry"
    }

    throw "Poetry was not found. Install Poetry or add it to PATH."
}

$repoRoot = $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"
$frontendNodeModules = Join-Path $frontendRoot "node_modules"
$poetryCommand = Resolve-PoetryCommand

Assert-Command -Name "powershell.exe"
Assert-Command -Name "npm"

if (-not (Test-Path -LiteralPath $frontendRoot)) {
    throw "Missing frontend directory: $frontendRoot"
}

if (-not (Test-Path -LiteralPath $frontendNodeModules)) {
    Write-Warning "frontend/node_modules is missing. Run 'cd frontend; npm install' first."
}

$backendCommand = "Set-Location -LiteralPath '$repoRoot'; $poetryCommand run uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"
$frontendCommand = "Set-Location -LiteralPath '$frontendRoot'; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"

if ($CheckOnly) {
    Write-Host "Planting Planner startup check"
    Write-Host "Repo root   : $repoRoot"
    Write-Host "Poetry cmd  : $poetryCommand"
    Write-Host "Backend cmd : $backendCommand"
    Write-Host "Frontend cmd: $frontendCommand"
    exit 0
}

Start-Process -FilePath "powershell.exe" -WorkingDirectory $repoRoot -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $backendCommand
)

Start-Process -FilePath "powershell.exe" -WorkingDirectory $frontendRoot -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $frontendCommand
)

if (-not $NoBrowser) {
    Start-Sleep -Seconds 4
    Start-Process "http://127.0.0.1:5173"
}
