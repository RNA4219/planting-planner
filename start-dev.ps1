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

function Resolve-BackendCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    if (Get-Command "poetry" -ErrorAction SilentlyContinue) {
        return "Set-Location -LiteralPath '$RepoRoot'; poetry run uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000"
    }

    if (Get-Command "py" -ErrorAction SilentlyContinue) {
        return "Set-Location -LiteralPath '$RepoRoot'; py -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000"
    }

    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        return "Set-Location -LiteralPath '$RepoRoot'; python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000"
    }

    throw "Missing backend launcher. Install Poetry or Python 3.11+."
}

$repoRoot = $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"
$frontendNodeModules = Join-Path $frontendRoot "node_modules"

Assert-Command -Name "powershell.exe"
Assert-Command -Name "npm"

if (-not (Test-Path -LiteralPath $frontendRoot)) {
    throw "Missing frontend directory: $frontendRoot"
}

if (-not (Test-Path -LiteralPath $frontendNodeModules)) {
    Write-Warning "frontend/node_modules is missing. Run 'cd frontend; npm install' first."
}

$backendCommand = Resolve-BackendCommand -RepoRoot $repoRoot
$frontendCommand = "Set-Location -LiteralPath '$frontendRoot'; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"

if ($CheckOnly) {
    Write-Host "Planting Planner startup check"
    Write-Host "Repo root   : $repoRoot"
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
