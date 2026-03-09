param(
    [switch]$CheckOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

function Test-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $listener) {
            $listener.Stop()
        }
    }
}

function Find-AvailablePort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PreferredPort,
        [int]$SearchWindow = 20
    )

    for ($offset = 0; $offset -le $SearchWindow; $offset += 1) {
        $candidate = $PreferredPort + $offset
        if (Test-PortAvailable -Port $candidate) {
            return $candidate
        }
    }

    throw "No available port found between $PreferredPort and $($PreferredPort + $SearchWindow)."
}

function Wait-HttpReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$TimeoutSeconds = 30,
        [string]$Label = $Url
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    } while ((Get-Date) -lt $deadline)

    Write-Warning "$Label did not become ready within ${TimeoutSeconds}s."
    return $false
}

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
$frontendPort = Find-AvailablePort -PreferredPort 5173
$frontendUrl = "http://127.0.0.1:$frontendPort"

Assert-Command -Name "powershell.exe"
Assert-Command -Name "npm"

if (-not (Test-Path -LiteralPath $frontendRoot)) {
    throw "Missing frontend directory: $frontendRoot"
}

if (-not (Test-Path -LiteralPath $frontendNodeModules)) {
    Write-Warning "frontend/node_modules is missing. Run 'cd frontend; npm install' first."
}

$backendCommand = Resolve-BackendCommand -RepoRoot $repoRoot
$frontendCommand =
    "Set-Location -LiteralPath '$frontendRoot'; " +
    "Write-Host 'Starting frontend at $frontendUrl'; " +
    "npm run dev -- --host 127.0.0.1 --port $frontendPort --strictPort"

if ($CheckOnly) {
    Write-Host "Planting Planner startup check"
    Write-Host "Repo root   : $repoRoot"
    Write-Host "Backend cmd : $backendCommand"
    Write-Host "Frontend cmd: $frontendCommand"
    Write-Host "Frontend URL: $frontendUrl"
    exit 0
}

if ($frontendPort -ne 5173) {
    Write-Warning "Port 5173 is already in use. The frontend will start on $frontendUrl instead."
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

Wait-HttpReady -Url "http://127.0.0.1:8000/api/health" -TimeoutSeconds 30 -Label "Backend API" | Out-Null
Wait-HttpReady -Url $frontendUrl -TimeoutSeconds 30 -Label "Frontend app" | Out-Null

if (-not $NoBrowser) {
    Start-Process $frontendUrl
}
