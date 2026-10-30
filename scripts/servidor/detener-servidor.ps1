<#
.SYNOPSIS
  Detiene Centro Veterinario (por ejemplo, antes de actualizar la app).

.DESCRIPTION
  Detiene la tarea programada (si existe), el script que mantiene la app
  encendida y el proceso que atiende el puerto. Para volver a iniciarla:
    Start-ScheduledTask -TaskName "Centro Veterinario - Servidor"
  o reiniciar el equipo.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\servidor\detener-servidor.ps1
#>
param(
  [int]$Puerto = 3001
)

. (Join-Path $PSScriptRoot "comun.ps1")

# 1. Tarea programada (solo si es la que sirve este mismo puerto)
$tarea = Get-ScheduledTask -TaskName $Script:TareaServidor -ErrorAction SilentlyContinue
$argsTarea = ""
if ($tarea) { $argsTarea = ($tarea.Actions | Select-Object -First 1).Arguments }
$mismoPuerto = ($argsTarea -like "*-Puerto $Puerto*") -or ($Puerto -eq 3001 -and $argsTarea -notlike "*-Puerto*")
if ($tarea -and $mismoPuerto -and $tarea.State -eq "Running") {
  try {
    Stop-ScheduledTask -TaskName $Script:TareaServidor -ErrorAction Stop
    Escribir-Log "servidor" "Tarea programada detenida."
  } catch {
    Write-Warning "No se pudo detener la tarea programada (ejecuta este script como administrador)."
  }
}

# 2. Script supervisor (si no se detiene, volvería a iniciar la app)
Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" |
  Where-Object {
    $_.ProcessId -ne $PID -and $_.CommandLine -like "*iniciar-servidor.ps1*" -and
    ($_.CommandLine -like "*-Puerto $Puerto*" -or ($Puerto -eq 3001 -and $_.CommandLine -notlike "*-Puerto*"))
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Escribir-Log "servidor" "Supervisor detenido (proceso $($_.ProcessId))."
  }

# 3. Proceso de la app en el puerto
$procesos = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
foreach ($id in $procesos) {
  Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
  Escribir-Log "servidor" "App detenida (proceso $id, puerto $Puerto)."
}
if (-not $procesos) { Write-Host "No había ninguna app escuchando en el puerto $Puerto." }
