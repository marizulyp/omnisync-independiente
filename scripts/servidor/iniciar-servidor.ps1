<#
.SYNOPSIS
  Inicia Centro Veterinario en modo producción y lo mantiene encendido.

.DESCRIPTION
  Pensado para ejecutarse desde el Programador de tareas al iniciar Windows
  (lo registra instalar-tareas.ps1), pero también se puede ejecutar a mano.

  1. Evita que se inicien dos copias a la vez.
  2. Espera a que PostgreSQL responda (hasta 10 minutos).
  3. Si no existe la compilación de producción, ejecuta "npm run build".
  4. Inicia la app en el puerto indicado, accesible desde la red local.
  5. Si la app se cierra por cualquier motivo, la vuelve a iniciar a los 15 segundos.

  Registro: logs\servidor-AAAA-MM.log (eventos) y logs\app-*.log (salida de la app).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\servidor\iniciar-servidor.ps1
#>
param(
  [int]$Puerto = 3001
)

. (Join-Path $PSScriptRoot "comun.ps1")
$ErrorActionPreference = "Stop"

# 1. Una sola instancia
$mutex = New-Object System.Threading.Mutex($false, "Global\CentroVeterinarioServidor$Puerto")
try { $tieneMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $tieneMutex = $true }
if (-not $tieneMutex) {
  Escribir-Log "servidor" "Ya hay una instancia del servidor en el puerto $Puerto. Se cancela este inicio."
  exit 0
}

if (Esta-EnOneDrive) {
  Escribir-Log "servidor" "AVISO: el proyecto está dentro de OneDrive ($Script:Raiz). Para un servidor se recomienda una carpeta local como C:\CentroVeterinario."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Escribir-Log "servidor" "ERROR: no se encontró Node.js. Instálalo desde https://nodejs.org y reinicia el equipo."
  exit 1
}

$next = Join-Path $Script:Raiz "node_modules\next\dist\bin\next"
if (-not (Test-Path $next)) {
  Escribir-Log "servidor" "ERROR: faltan las dependencias. Ejecuta 'npm install' en $Script:Raiz."
  exit 1
}

if (Probar-Puerto "127.0.0.1" $Puerto) {
  Escribir-Log "servidor" "El puerto $Puerto ya está en uso (¿la app ya está corriendo?). Se cancela este inicio."
  exit 0
}

# 2. Esperar a PostgreSQL
$bd = Leer-ConexionBD
$intentos = 0
while (-not (Probar-Puerto $bd.Equipo $bd.Puerto)) {
  $intentos++
  if ($intentos -eq 1) { Escribir-Log "servidor" "Esperando a PostgreSQL en $($bd.Equipo):$($bd.Puerto)..." }
  if ($intentos -ge 60) {
    Escribir-Log "servidor" "ERROR: PostgreSQL no respondió en 10 minutos. Revisa el servicio 'postgresql' en services.msc."
    exit 1
  }
  Start-Sleep -Seconds 10
}

# 3. Compilar si hace falta
if (-not (Test-Path (Join-Path $Script:Raiz ".next\BUILD_ID"))) {
  Escribir-Log "servidor" "No hay compilación de producción. Ejecutando 'npm run build' (puede tardar unos minutos)..."
  $marca = "{0:yyyy-MM-dd_HHmmss}" -f (Get-Date)
  $build = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "build" -WorkingDirectory $Script:Raiz `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput (Join-Path $Script:CarpetaLogs "build-$marca.log") `
    -RedirectStandardError (Join-Path $Script:CarpetaLogs "build-$marca-errores.log")
  if ($build.ExitCode -ne 0) {
    Escribir-Log "servidor" "ERROR: la compilación falló (ver logs\build-$marca*.log)."
    exit 1
  }
}

# 4 y 5. Iniciar y mantener encendida la app
while ($true) {
  $marca = "{0:yyyy-MM-dd_HHmmss}" -f (Get-Date)
  Escribir-Log "servidor" "Iniciando Centro Veterinario en el puerto $Puerto (red local: http://IP-DEL-SERVIDOR:$Puerto)."
  $app = Start-Process -FilePath "node" `
    -ArgumentList "node_modules\next\dist\bin\next", "start", "-H", "0.0.0.0", "-p", "$Puerto" `
    -WorkingDirectory $Script:Raiz -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput (Join-Path $Script:CarpetaLogs "app-$marca.log") `
    -RedirectStandardError (Join-Path $Script:CarpetaLogs "app-$marca-errores.log")
  Escribir-Log "servidor" "La app se detuvo (código $($app.ExitCode)). Se reinicia en 15 segundos."
  Start-Sleep -Seconds 15

  # Conservar solo 30 días de registros de la app
  Get-ChildItem $Script:CarpetaLogs -Filter "app-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -ErrorAction SilentlyContinue
}
