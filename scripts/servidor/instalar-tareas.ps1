<#
.SYNOPSIS
  Configura el computador servidor de Centro Veterinario. EJECUTAR COMO ADMINISTRADOR.

.DESCRIPTION
  Crea (o actualiza) en el Programador de tareas de Windows:
    - "Centro Veterinario - Servidor": inicia la app al encender el equipo, sin
      necesidad de iniciar sesión, y la mantiene encendida (iniciar-servidor.ps1).
    - "Centro Veterinario - Respaldo": respaldo diario de base de datos y adjuntos
      (respaldo.ps1). Si el equipo estaba apagado a esa hora, se ejecuta al encenderlo.
  Además abre el puerto de la app en el firewall, solo para la red local.

  Requisitos previos: PostgreSQL instalado como servicio automático, el proyecto
  con "npm install" hecho y el archivo .env configurado (ver README).

.PARAMETER DestinoRespaldos
  Carpeta donde guardar los respaldos. Recomendado: otro disco o una USB.
  Por defecto: <proyecto>\respaldos

.PARAMETER HoraRespaldo
  Hora diaria del respaldo (formato 24 h). Por defecto 22:00.

.PARAMETER ComoSistema
  Ejecuta las tareas con la cuenta SYSTEM en lugar del usuario actual.
  Úsalo si Windows rechaza registrar la tarea con el usuario actual.

.PARAMETER PermitirOneDrive
  Permite instalar aunque el proyecto esté dentro de OneDrive. En ese caso la app
  arranca al INICIAR SESIÓN (no al encender), porque OneDrive necesita la sesión abierta.

.PARAMETER SinSuspension
  Configura Windows para que el equipo no se suspenda ni hiberne conectado a la corriente.

.PARAMETER Quitar
  Elimina las tareas y la regla de firewall creadas por este script.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\servidor\instalar-tareas.ps1 -DestinoRespaldos "D:\Respaldos Centro Veterinario" -SinSuspension
#>
#Requires -RunAsAdministrator
param(
  [string]$DestinoRespaldos = "",
  [string]$HoraRespaldo = "22:00",
  [int]$Puerto = 3001,
  [switch]$ComoSistema,
  [switch]$PermitirOneDrive,
  [switch]$SinSuspension,
  [switch]$Quitar
)

. (Join-Path $PSScriptRoot "comun.ps1")
$ErrorActionPreference = "Stop"
$reglaFirewall = "Centro Veterinario ($Puerto)"

if ($Quitar) {
  foreach ($nombre in @($Script:TareaServidor, $Script:TareaRespaldo)) {
    if (Get-ScheduledTask -TaskName $nombre -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $nombre -Confirm:$false
      Write-Host "Tarea eliminada: $nombre"
    }
  }
  Get-NetFirewallRule -DisplayName $reglaFirewall -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Write-Host "Regla de firewall eliminada (si existía): $reglaFirewall"
  Write-Host "La app que esté corriendo ahora sigue activa hasta reiniciar o ejecutar detener-servidor.ps1."
  exit 0
}

# ── Comprobaciones previas ──────────────────────────────────────────────────
$enOneDrive = Esta-EnOneDrive
if ($enOneDrive -and -not $PermitirOneDrive) {
  Write-Host ""
  Write-Warning "El proyecto está dentro de OneDrive: $Script:Raiz"
  Write-Host "Para un servidor se recomienda una carpeta local, por ejemplo:"
  Write-Host "  git clone https://github.com/davidcm1017-oss/Centro-Veterinario.git C:\CentroVeterinario"
  Write-Host "Si aun así quieres instalar aquí (la app arrancará al iniciar sesión), añade -PermitirOneDrive."
  exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "No se encontró Node.js en el PATH." }
if (-not (Test-Path (Join-Path $Script:Raiz "node_modules"))) { throw "Falta 'npm install' en $Script:Raiz." }
$null = Leer-ConexionBD   # valida que el .env exista y tenga DATABASE_URL
$hora = [datetime]::ParseExact($HoraRespaldo, "HH:mm", $null)

$servicioPg = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($servicioPg -and $servicioPg.StartType -ne "Automatic") {
  Set-Service -Name $servicioPg.Name -StartupType Automatic
  Write-Host "Servicio $($servicioPg.Name) configurado con inicio automático."
}

# ── Cuenta con la que corren las tareas ─────────────────────────────────────
$usuarioActual = "$env:USERDOMAIN\$env:USERNAME"
if ($ComoSistema) {
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $cuenta = "SYSTEM"
} elseif ($enOneDrive) {
  $principal = New-ScheduledTaskPrincipal -UserId $usuarioActual -LogonType Interactive -RunLevel Limited
  $cuenta = "$usuarioActual (al iniciar sesión)"
} else {
  # S4U: corre aunque nadie haya iniciado sesión, sin guardar la contraseña
  $principal = New-ScheduledTaskPrincipal -UserId $usuarioActual -LogonType S4U -RunLevel Limited
  $cuenta = "$usuarioActual (sin necesidad de iniciar sesión)"
}

function Accion-Script([string]$Script, [string]$Argumentos) {
  $ruta = Join-Path $PSScriptRoot $Script
  New-ScheduledTaskAction -Execute "powershell.exe" -WorkingDirectory $Script:Raiz `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ruta`" $Argumentos"
}

# ── Tarea 1: servidor ───────────────────────────────────────────────────────
if ($enOneDrive) {
  $disparador = New-ScheduledTaskTrigger -AtLogOn -User $usuarioActual
} else {
  $disparador = New-ScheduledTaskTrigger -AtStartup
}
$disparador.Delay = "PT1M"   # dar tiempo a la red y a PostgreSQL
$ajustes = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $Script:TareaServidor -Force `
  -Description "Inicia Centro Veterinario en el puerto $Puerto y lo mantiene encendido." `
  -Action (Accion-Script "iniciar-servidor.ps1" "-Puerto $Puerto") `
  -Trigger $disparador -Principal $principal -Settings $ajustes | Out-Null

# ── Tarea 2: respaldo diario ────────────────────────────────────────────────
$argsRespaldo = ""
if ($DestinoRespaldos) {
  if (-not (Test-Path $DestinoRespaldos)) { New-Item -ItemType Directory -Path $DestinoRespaldos | Out-Null }
  $argsRespaldo = "-Destino `"$DestinoRespaldos`""
}
$ajustesRespaldo = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Script:TareaRespaldo -Force `
  -Description "Respaldo diario de la base de datos y adjuntos de Centro Veterinario." `
  -Action (Accion-Script "respaldo.ps1" $argsRespaldo) `
  -Trigger (New-ScheduledTaskTrigger -Daily -At $hora) -Principal $principal -Settings $ajustesRespaldo | Out-Null

# ── Firewall: solo equipos de la red local ──────────────────────────────────
if (-not (Get-NetFirewallRule -DisplayName $reglaFirewall -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $reglaFirewall -Direction Inbound -Protocol TCP -LocalPort $Puerto `
    -RemoteAddress LocalSubnet -Action Allow -Profile Any | Out-Null
}

# ── Energía ─────────────────────────────────────────────────────────────────
if ($SinSuspension) {
  powercfg /change standby-timeout-ac 0
  powercfg /change hibernate-timeout-ac 0
}

# ── Resumen ─────────────────────────────────────────────────────────────────
$destinoTexto = $DestinoRespaldos
if (-not $destinoTexto) { $destinoTexto = Join-Path $Script:Raiz "respaldos" }
$arranque = "al encender el equipo (1 min de espera)"
if ($enOneDrive) { $arranque = "al iniciar sesión (1 min de espera)" }
$ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress -join ", "

Write-Host ""
Write-Host "Listo. Configuración del servidor Centro Veterinario:" -ForegroundColor Green
Write-Host "  App:        $arranque, puerto $Puerto, cuenta $cuenta"
Write-Host "  Respaldo:   todos los días a las $HoraRespaldo en $destinoTexto (30 días)"
Write-Host "  Firewall:   regla '$reglaFirewall' solo para la red local"
if ($SinSuspension) { Write-Host "  Energía:    sin suspensión ni hibernación conectado a la corriente" }
Write-Host "  Acceso:     http://<IP>:$Puerto   (IP de este equipo: $ips)"
Write-Host ""
Write-Host "Para iniciar la app ahora sin reiniciar:"
Write-Host "  Start-ScheduledTask -TaskName `"$($Script:TareaServidor)`""
Write-Host "Registros en: $Script:CarpetaLogs"
