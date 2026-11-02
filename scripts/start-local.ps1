$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$webUrl = 'http://127.0.0.1:5183/'
function Test-Studio {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5183/login' -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content.Contains('STANDING')
    } catch { return $false }
}
function Test-BridgeHost {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5184/status' -Headers @{ Origin = 'http://127.0.0.1:5183' } -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content.Contains('overlay-studio-live-bridge')
    } catch { return $false }
}
try {
    if (-not (Test-Studio)) {
        $nodePath = (Get-Command node -ErrorAction Stop).Source
        $logPath = Join-Path $projectPath 'outputs'
        New-Item -ItemType Directory -Path $logPath -Force | Out-Null
        & $nodePath 'scripts/init-local.mjs'
        if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize local database.' }
        $server = Start-Process -FilePath $nodePath -ArgumentList 'scripts/run-framework.mjs dev' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'local-server.log') -RedirectStandardError (Join-Path $logPath 'local-server-error.log') -PassThru
        $deadline = (Get-Date).AddSeconds(60)
        while (-not (Test-Studio)) {
            if ($server.HasExited) { throw 'Web failed to start. Check outputs/local-server-error.log.' }
            if ((Get-Date) -gt $deadline) { throw 'Web startup timed out. Check outputs/local-server.log.' }
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not (Test-BridgeHost)) {
        $nodePath = (Get-Command node -ErrorAction Stop).Source
        $logPath = Join-Path $projectPath 'outputs'
        New-Item -ItemType Directory -Path $logPath -Force | Out-Null
        $bridgeHost = Start-Process -FilePath $nodePath -ArgumentList 'scripts/live-bridge-host.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'local-bridge-host.log') -RedirectStandardError (Join-Path $logPath 'local-bridge-host-error.log') -PassThru
        $bridgeDeadline = (Get-Date).AddSeconds(15)
        while (-not (Test-BridgeHost)) {
            if ($bridgeHost.HasExited) { throw 'Local game bridge host failed to start. Check outputs/local-bridge-host-error.log.' }
            if ((Get-Date) -gt $bridgeDeadline) { throw 'Local game bridge host startup timed out.' }
            Start-Sleep -Milliseconds 250
        }
    }
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host ('LAN: http://' + $_.IPAddress + ':5183/') }
    Start-Process $webUrl -WindowStyle Hidden
    Write-Host 'Overlay Studio is ready: http://127.0.0.1:5183/login'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
