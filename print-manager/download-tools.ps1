# Script de PowerShell para descargar herramientas necesarias automáticamente
# Ejecutar como: powershell -ExecutionPolicy Bypass -File download-tools.ps1

Write-Host ""
Write-Host "========================================"
Write-Host "  Descargando Herramientas para Build"
Write-Host "========================================"
Write-Host ""

$ErrorActionPreference = "Stop"

# Crear directorios
Write-Host "📁 Creando directorios..."
New-Item -ItemType Directory -Force -Path "tools\openssl" | Out-Null
New-Item -ItemType Directory -Force -Path "tools\nssm" | Out-Null
New-Item -ItemType Directory -Force -Path "tools\temp" | Out-Null

# Descargar OpenSSL portable
Write-Host ""
Write-Host "⏬ Descargando OpenSSL portable..."

try {
    # Usar build portable de GitHub
    $OPENSSL_URL = "https://github.com/ganbarodigital/openssl-windows/releases/download/v1.1.1s-20221115/openssl-1.1.1s-win64-mingw.zip"
    $opensslZip = "tools\temp\openssl.zip"

    Write-Host "   Descargando desde GitHub..."
    Invoke-WebRequest -Uri $OPENSSL_URL -OutFile $opensslZip -UserAgent "Mozilla/5.0"

    Write-Host "   Extrayendo..."
    Expand-Archive -Path $opensslZip -DestinationPath "tools\temp\openssl" -Force

    # Buscar y copiar openssl.exe
    $opensslExe = Get-ChildItem -Path "tools\temp\openssl" -Recurse -Filter "openssl.exe" | Select-Object -First 1
    if ($opensslExe) {
        Copy-Item $opensslExe.FullName -Destination "tools\openssl\openssl.exe"
        Write-Host "   ✅ OpenSSL descargado: tools\openssl\openssl.exe"
    } else {
        throw "No se encontró openssl.exe"
    }
} catch {
    Write-Host "   ❌ Error: $_"
    Write-Host ""
    Write-Host "   Descarga manual:"
    Write-Host "   1. https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "   2. Descargar 'Win64 OpenSSL Light'"
    Write-Host "   3. Instalar y copiar openssl.exe a tools\openssl\"
}

# Descargar NSSM
Write-Host ""
Write-Host "⏬ Descargando NSSM..."

try {
    $NSSM_URL = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip = "tools\temp\nssm.zip"

    Write-Host "   Descargando..."
    Invoke-WebRequest -Uri $NSSM_URL -OutFile $nssmZip -UserAgent "Mozilla/5.0"

    Write-Host "   Extrayendo..."
    Expand-Archive -Path $nssmZip -DestinationPath "tools\temp" -Force

    # Copiar nssm.exe (64-bit)
    $nssmExe = "tools\temp\nssm-2.24\win64\nssm.exe"
    if (Test-Path $nssmExe) {
        Copy-Item $nssmExe -Destination "tools\nssm\nssm.exe"
        Write-Host "   ✅ NSSM descargado: tools\nssm\nssm.exe"
    } else {
        throw "No se encontró nssm.exe"
    }
} catch {
    Write-Host "   ❌ Error: $_"
    Write-Host ""
    Write-Host "   Descarga manual:"
    Write-Host "   1. https://nssm.cc/download"
    Write-Host "   2. Descargar y extraer"
    Write-Host "   3. Copiar win64\nssm.exe a tools\nssm\"
}

# Limpiar
Write-Host ""
Write-Host "🧹 Limpiando..."
Remove-Item -Path "tools\temp" -Recurse -Force -ErrorAction SilentlyContinue

# Verificar
Write-Host ""
Write-Host "========================================"
Write-Host "  Verificación"
Write-Host "========================================"
Write-Host ""

if (Test-Path "tools\openssl\openssl.exe") {
    Write-Host "✅ OpenSSL: OK"
} else {
    Write-Host "❌ OpenSSL: FALTA"
}

if (Test-Path "tools\nssm\nssm.exe") {
    Write-Host "✅ NSSM: OK"
} else {
    Write-Host "❌ NSSM: FALTA"
}

Write-Host ""
Write-Host "Presiona Enter para salir..."
Read-Host
