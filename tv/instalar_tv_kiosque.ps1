# =========================================================================
#  Instalador da TV do escritorio — modo kiosque + auto-refresh + watchdog.
#
#  O que faz:
#    1. Cria HTML wrapper em C:\CabanaTV\ com refresh automatico.
#    2. Cria .bat que abre Chrome em kiosque com perfil dedicado.
#    3. Cria watchdog que verifica a cada 5 min se o Chrome kiosque
#       esta rodando — se cair, reabre.
#    4. Registra o watchdog no Task Scheduler.
#    5. Configura o Windows pra nunca suspender/apagar tela.
#
#  RODE COMO ADMINISTRADOR.
# =========================================================================
$ErrorActionPreference = 'Stop'

# ── CONFIGURACAO ─────────────────────────────────────────────────────────
$URL_DASHBOARD   = "https://cabana-dashboards.bi-253.workers.dev/"
# Horarios fixos de refresh (formato HH:MM, 24h). Ao atingir cada horario,
# a pagina recarrega. Use este formato pra suportar TVs que ficam
# ligadas o dia todo sem depender de intervalo em minutos.
$REFRESH_HORARIOS = @("08:30", "15:00")
$PASTA_LOCAL     = "C:\CabanaTV"
$PASTA_PERFIL    = "$PASTA_LOCAL\perfil"
$NOME_HTML       = "refresh_dashboards.html"
$NOME_BAT        = "abrir_tv_kiosque.bat"
$NOME_WATCHDOG   = "watchdog_tv.ps1"
$WATCHDOG_TASK   = "Cabana - Watchdog TV Kiosque"

# ── 1) CRIA PASTAS ───────────────────────────────────────────────────────
foreach ($p in @($PASTA_LOCAL, $PASTA_PERFIL)) {
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p | Out-Null
        Write-Host "[OK] Pasta criada: $p" -ForegroundColor Green
    }
}

# ── 2) HTML WRAPPER COM AUTO-REFRESH ─────────────────────────────────────
# Converte a lista PowerShell pra array JS: ["08:30","15:00"]
$horariosJs = ($REFRESH_HORARIOS | ForEach-Object { "`"$_`"" }) -join ","
$html = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cabana TV</title>
  <style>
    html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#000; }
    iframe { border:0; width:100vw; height:100vh; display:block; }
  </style>
</head>
<body>
  <iframe src="$URL_DASHBOARD"></iframe>
  <script>
    // Recarrega a pagina nos horarios fixos abaixo.
    var HORARIOS = [$horariosJs];

    function proximoDisparoMs() {
      var agora = new Date();
      var candidatos = HORARIOS.map(function(h) {
        var partes = h.split(':');
        var d = new Date(agora);
        d.setHours(parseInt(partes[0],10), parseInt(partes[1],10), 0, 0);
        if (d <= agora) d.setDate(d.getDate() + 1); // ja passou hoje, vai pra amanha
        return d;
      });
      var proximo = candidatos.reduce(function(a,b){ return a<b?a:b; });
      return proximo.getTime() - agora.getTime();
    }

    function agendar() {
      var ms = proximoDisparoMs();
      console.log('[TV] Proximo refresh em ' + Math.round(ms/60000) + ' minutos');
      setTimeout(function() { location.reload(); }, ms);
    }

    agendar();
  </script>
</body>
</html>
"@
$htmlPath = Join-Path $PASTA_LOCAL $NOME_HTML
Set-Content -Path $htmlPath -Value $html -Encoding UTF8
Write-Host "[OK] HTML criado: $htmlPath (refresh nos horarios: $($REFRESH_HORARIOS -join ', '))" -ForegroundColor Green

# ── 3) LOCALIZA O NAVEGADOR (Chrome ou Edge) ─────────────────────────────
$navegadores = @(
    @{Nome='Chrome'; Path="$env:ProgramFiles\Google\Chrome\Application\chrome.exe"},
    @{Nome='Chrome'; Path="${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"},
    @{Nome='Chrome'; Path="$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"},
    @{Nome='Edge';   Path="$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"},
    @{Nome='Edge';   Path="${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"}
)
$navegador = $navegadores | Where-Object { Test-Path $_.Path } | Select-Object -First 1
if (-not $navegador) {
    throw "Nem Chrome nem Edge foram encontrados. Instale um dos dois antes de rodar."
}
$chromePath  = $navegador.Path
$navegadorNome = $navegador.Nome
Write-Host "[OK] Navegador encontrado ($navegadorNome): $chromePath" -ForegroundColor Green

# ── 4) .BAT QUE ABRE O NAVEGADOR EM KIOSQUE ──────────────────────────────
# Edge tem uma flag extra pra "fullscreen kiosk" (evita popups de reinicio).
$edgeExtra = ""
if ($navegadorNome -eq 'Edge') {
    $edgeExtra = "--edge-kiosk-type=fullscreen ^`r`n    "
}
$bat = @"
@echo off
REM Abre a TV em modo kiosque. Perfil dedicado permite ao watchdog
REM identificar exatamente este processo. Navegador: $navegadorNome
timeout /t 5 /nobreak >nul
start "" "$chromePath" ^
    --kiosk ^
    $edgeExtra--user-data-dir="$PASTA_PERFIL" ^
    --disable-features=TranslateUI ^
    --autoplay-policy=no-user-gesture-required ^
    --disable-session-crashed-bubble ^
    --disable-infobars ^
    --no-first-run ^
    --no-default-browser-check ^
    "$htmlPath"
"@
$batPath = Join-Path $PASTA_LOCAL $NOME_BAT
Set-Content -Path $batPath -Value $bat -Encoding ASCII
Write-Host "[OK] .bat criado: $batPath" -ForegroundColor Green

# ── 5) WATCHDOG — verifica se Chrome kiosque esta rodando ────────────────
$exeNome = if ($navegadorNome -eq 'Edge') { 'msedge.exe' } else { 'chrome.exe' }
$watchdog = @"
# Watchdog TV — se o navegador kiosque nao estiver rodando, reabre.
`$ErrorActionPreference = 'SilentlyContinue'
`$perfil = '$PASTA_PERFIL'
`$bat = '$batPath'

# Procura pelo processo do navegador cuja linha de comando contenha o
# user-data-dir da TV (isso identifica exatamente o kiosque).
`$rodando = Get-CimInstance Win32_Process -Filter "Name='$exeNome'" |
    Where-Object { `$_.CommandLine -like "*`$perfil*" }

if (-not `$rodando) {
    Write-Host "[watchdog] $navegadorNome kiosque NAO esta rodando. Reabrindo..."
    Start-Process -FilePath `$bat -WindowStyle Hidden
} else {
    Write-Host "[watchdog] $navegadorNome kiosque OK (`$(`$rodando.Count) processo(s))"
}
"@
$watchdogPath = Join-Path $PASTA_LOCAL $NOME_WATCHDOG
Set-Content -Path $watchdogPath -Value $watchdog -Encoding UTF8
Write-Host "[OK] Watchdog criado: $watchdogPath" -ForegroundColor Green

# ── 6) REGISTRA WATCHDOG NO TASK SCHEDULER (roda a cada 5 min) ───────────
try {
    Unregister-ScheduledTask -TaskName $WATCHDOG_TASK -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$watchdogPath`"" `
    -WorkingDirectory $PASTA_LOCAL

# Trigger: dispara ao logar + repete a cada 5 min pra sempre.
$triggerBoot  = New-ScheduledTaskTrigger -AtLogOn
$triggerLoop  = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
                    -RepetitionInterval (New-TimeSpan -Minutes 5) `
                    -RepetitionDuration ([TimeSpan]::MaxValue)

$user = "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

Register-ScheduledTask -TaskName $WATCHDOG_TASK `
    -Action $action `
    -Trigger @($triggerBoot, $triggerLoop) `
    -Principal $principal `
    -Settings $settings | Out-Null

Write-Host "[OK] Watchdog registrado no Task Scheduler (a cada 5 min)" -ForegroundColor Green

# ── 7) COPIA ATALHO PRO STARTUP ─────────────────────────────────────────
$startupDir = [Environment]::GetFolderPath("Startup")
$atalhoPath = Join-Path $startupDir "Cabana_TV_Kiosque.lnk"
$wshell = New-Object -ComObject WScript.Shell
$atalho = $wshell.CreateShortcut($atalhoPath)
$atalho.TargetPath = $batPath
$atalho.WorkingDirectory = $PASTA_LOCAL
$atalho.WindowStyle = 7
$atalho.Description = "Abre TV em kiosque (Cabana Dashboards)"
$atalho.Save()
Write-Host "[OK] Atalho no Startup: $atalhoPath" -ForegroundColor Green

# ── 8) POWERCFG — nunca suspender/apagar ─────────────────────────────────
try {
    powercfg /change monitor-timeout-ac 0
    powercfg /change standby-timeout-ac 0
    powercfg /change hibernate-timeout-ac 0
    powercfg /change monitor-timeout-dc 0
    powercfg /change standby-timeout-dc 0
    Write-Host "[OK] Windows configurado pra NUNCA suspender" -ForegroundColor Green
} catch {
    Write-Warning "Falha ao configurar powercfg: $($_.Exception.Message)"
}

# ── FINALIZACAO ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Instalacao concluida" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Camadas de robustez:"
Write-Host "  - .bat inicia Chrome kiosque no login"
Write-Host "  - Watchdog a cada 5 min: se Chrome cair, reabre"
Write-Host "  - powercfg: PC nunca dorme"
Write-Host "  - HTML: refresh nos horarios $($REFRESH_HORARIOS -join ' e ')"
Write-Host ""
Write-Host "URL: $URL_DASHBOARD"
Write-Host ""
Write-Host "TESTE AGORA — sem esperar reboot:" -ForegroundColor Yellow
Write-Host "  $batPath"
Write-Host ""
Write-Host "Pra sair do kiosque: Alt+F4"
