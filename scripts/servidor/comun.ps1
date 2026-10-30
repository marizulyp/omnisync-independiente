# Funciones compartidas por los scripts del servidor de Centro Veterinario.
# Se cargan con:  . (Join-Path $PSScriptRoot "comun.ps1")

$Script:Raiz = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Script:CarpetaLogs = Join-Path $Script:Raiz "logs"
$Script:TareaServidor = "Centro Veterinario - Servidor"
$Script:TareaRespaldo = "Centro Veterinario - Respaldo"

# Escribe una línea con fecha en logs\<nombre>-AAAA-MM.log y en pantalla
function Escribir-Log {
  param([string]$Nombre, [string]$Mensaje)
  if (-not (Test-Path $Script:CarpetaLogs)) {
    New-Item -ItemType Directory -Path $Script:CarpetaLogs | Out-Null
  }
  $archivo = Join-Path $Script:CarpetaLogs ("{0}-{1:yyyy-MM}.log" -f $Nombre, (Get-Date))
  $linea = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $Mensaje
  Add-Content -Path $archivo -Value $linea -Encoding UTF8
  Write-Host $linea
}

# Lee DATABASE_URL del .env y devuelve equipo, puerto, usuario, clave y base de datos
function Leer-ConexionBD {
  $archivoEnv = Join-Path $Script:Raiz ".env"
  if (-not (Test-Path $archivoEnv)) { throw "No existe el archivo .env en $Script:Raiz" }
  $linea = Get-Content $archivoEnv -Encoding UTF8 |
    Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
    Select-Object -First 1
  if (-not $linea) { throw "El archivo .env no tiene DATABASE_URL" }

  $url = ($linea -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
  $uri = [Uri]$url
  $partes = $uri.UserInfo.Split(':', 2)
  $clave = ""
  if ($partes.Count -gt 1) { $clave = [Uri]::UnescapeDataString($partes[1]) }
  $puerto = $uri.Port
  if ($puerto -le 0) { $puerto = 5432 }

  [pscustomobject]@{
    Equipo    = $uri.Host
    Puerto    = $puerto
    Usuario   = [Uri]::UnescapeDataString($partes[0])
    Clave     = $clave
    BaseDatos = $uri.AbsolutePath.TrimStart('/')
  }
}

# Devuelve $true si hay algo escuchando en equipo:puerto (espera máximo 2 segundos)
function Probar-Puerto {
  param([string]$Equipo, [int]$Puerto)
  $cliente = New-Object System.Net.Sockets.TcpClient
  try {
    $intento = $cliente.BeginConnect($Equipo, $Puerto, $null, $null)
    return ($intento.AsyncWaitHandle.WaitOne(2000) -and $cliente.Connected)
  } catch {
    return $false
  } finally {
    $cliente.Close()
  }
}

function Esta-EnOneDrive {
  return ($Script:Raiz -match '\\OneDrive')
}
