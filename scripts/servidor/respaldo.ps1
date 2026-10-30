<#
.SYNOPSIS
  Respaldo de Centro Veterinario: base de datos y archivos adjuntos.

.DESCRIPTION
  Crea en la carpeta de destino:
    - centro_veterinario_AAAA-MM-DD_HHmm.dump   (base de datos, formato pg_dump comprimido)
    - adjuntos_AAAA-MM-DD_HHmm.zip               (ecografías, exámenes, etc.)
  y borra los respaldos con más de -DiasConservar días.

  Se recomienda que el destino sea OTRO disco o una USB, para que un daño en el
  disco del servidor no se lleve también los respaldos.

  Para restaurar, ver la sección "Respaldos" del README.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\servidor\respaldo.ps1 -Destino "D:\Respaldos Centro Veterinario"
#>
param(
  [string]$Destino = "",
  [int]$DiasConservar = 30
)

. (Join-Path $PSScriptRoot "comun.ps1")
$ErrorActionPreference = "Stop"

if (-not $Destino) { $Destino = Join-Path $Script:Raiz "respaldos" }
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino | Out-Null }

try {
  # Ubicar pg_dump (instalación estándar de PostgreSQL para Windows o PATH)
  $pgDump = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Directory.Parent.Name -replace '\D', '') } -Descending |
    Select-Object -First 1 -ExpandProperty FullName
  if (-not $pgDump) {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) { $pgDump = $cmd.Source }
  }
  if (-not $pgDump) { throw "No se encontró pg_dump.exe (instalación de PostgreSQL)." }

  $bd = Leer-ConexionBD
  $marca = "{0:yyyy-MM-dd_HHmm}" -f (Get-Date)

  # 1. Base de datos
  $archivoBD = Join-Path $Destino "$($bd.BaseDatos)_$marca.dump"
  $errores = Join-Path $env:TEMP "respaldo-cv-errores.txt"
  $env:PGPASSWORD = $bd.Clave
  try {
    $p = Start-Process -FilePath $pgDump -NoNewWindow -Wait -PassThru -RedirectStandardError $errores `
      -ArgumentList "-h", $bd.Equipo, "-p", "$($bd.Puerto)", "-U", "`"$($bd.Usuario)`"", "-F", "c", "-f", "`"$archivoBD`"", "`"$($bd.BaseDatos)`""
  } finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  }
  if ($p.ExitCode -ne 0 -or -not (Test-Path $archivoBD)) {
    $detalle = ""
    if (Test-Path $errores) { $detalle = (Get-Content $errores -Raw) }
    throw "pg_dump falló (código $($p.ExitCode)). $detalle"
  }
  $tamano = [math]::Round((Get-Item $archivoBD).Length / 1KB)
  Escribir-Log "respaldo" "Base de datos respaldada: $archivoBD ($tamano KB)"

  # 2. Archivos adjuntos
  $adjuntos = Join-Path $Script:Raiz "uploads\adjuntos"
  if ((Test-Path $adjuntos) -and (Get-ChildItem $adjuntos -File | Select-Object -First 1)) {
    $archivoZip = Join-Path $Destino "adjuntos_$marca.zip"
    Compress-Archive -Path (Join-Path $adjuntos "*") -DestinationPath $archivoZip -Force
    $tamano = [math]::Round((Get-Item $archivoZip).Length / 1KB)
    Escribir-Log "respaldo" "Adjuntos respaldados: $archivoZip ($tamano KB)"
  } else {
    Escribir-Log "respaldo" "No hay archivos adjuntos que respaldar."
  }

  # 3. Limpiar respaldos antiguos
  $antiguos = Get-ChildItem $Destino -File |
    Where-Object { ($_.Name -like "*.dump" -or $_.Name -like "adjuntos_*.zip") -and $_.LastWriteTime -lt (Get-Date).AddDays(-$DiasConservar) }
  foreach ($a in $antiguos) { Remove-Item $a.FullName }
  if ($antiguos) { Escribir-Log "respaldo" "Respaldos con más de $DiasConservar días eliminados: $(@($antiguos).Count)" }
} catch {
  Escribir-Log "respaldo" "ERROR: $($_.Exception.Message)"
  exit 1
}
