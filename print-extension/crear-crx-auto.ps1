# Script PowerShell para crear CRX usando crx3
# Funciona en Chrome 75+

param(
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Uso: .\crear-crx-auto.ps1

Este script crea un archivo .crx para distribuir la extension.
Usa Node.js y el paquete 'crx3'.

Requisitos:
- Node.js instalado
- npm instalado

"@
    exit
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Crear Paquete CRX - Axioma Print Manager" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js no esta instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalar desde: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "O usar el metodo manual: ver CREAR-CRX-MANUAL.md" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "  Node.js encontrado: $nodeVersion" -ForegroundColor Green

# Verificar que estamos en la carpeta correcta
if (-not (Test-Path "manifest.json")) {
    Write-Host "ERROR: Ejecutar desde la carpeta print-extension" -ForegroundColor Red
    pause
    exit 1
}

# Crear carpeta dist
Write-Host ""
Write-Host "[2/5] Preparando carpetas..." -ForegroundColor Yellow
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

# Instalar crx3 si no esta instalado
Write-Host ""
Write-Host "[3/5] Instalando herramienta crx3 (puede tardar)..." -ForegroundColor Yellow
$crx3Path = Join-Path $env:APPDATA "npm\node_modules\crx3"
if (-not (Test-Path $crx3Path)) {
    Write-Host "  Instalando crx3 globalmente..." -ForegroundColor Cyan
    npm install -g crx3 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Fallo instalacion de crx3" -ForegroundColor Red
        Write-Host "Intentar manualmente: npm install -g crx3" -ForegroundColor Yellow
        pause
        exit 1
    }
    Write-Host "  crx3 instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "  crx3 ya esta instalado" -ForegroundColor Green
}

# Generar o usar clave existente
$pemFile = "dist\axioma-print-manager.pem"
$crxFile = "dist\axioma-print-manager.crx"

Write-Host ""
Write-Host "[4/5] Empaquetando extension..." -ForegroundColor Yellow

if (Test-Path $pemFile) {
    Write-Host "  Usando clave privada existente: $pemFile" -ForegroundColor Cyan
} else {
    Write-Host "  Generando nueva clave privada..." -ForegroundColor Cyan
}

# Crear script temporal de Node.js
$scriptContent = @"
const fs = require('fs');
const path = require('path');
const ChromeExtension = require('crx3');

async function createCrx() {
    const crx = new ChromeExtension({
        privateKey: fs.existsSync('$pemFile') ? fs.readFileSync('$pemFile') : null
    });

    const buffer = await crx.load(process.cwd());
    const crxBuffer = await crx.pack(buffer);

    // Guardar CRX
    fs.writeFileSync('$crxFile', crxBuffer);

    // Guardar PEM si es nuevo
    if (!fs.existsSync('$pemFile')) {
        fs.writeFileSync('$pemFile', crx.privateKey);
    }

    console.log('OK');
}

createCrx().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
"@

$tempScript = "dist\temp-pack.js"
$scriptContent | Out-File -FilePath $tempScript -Encoding UTF8

# Ejecutar script
$output = node $tempScript 2>&1
Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0 -or $output -notmatch "OK") {
    Write-Host "ERROR: Fallo empaquetado" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    Write-Host ""
    Write-Host "Usar metodo manual: ver CREAR-CRX-MANUAL.md" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "  Extension empaquetada correctamente" -ForegroundColor Green

# Verificar archivos creados
Write-Host ""
Write-Host "[5/5] Verificando archivos..." -ForegroundColor Yellow

if (Test-Path $crxFile) {
    $crxSize = (Get-Item $crxFile).Length
    Write-Host "  CRX creado: $crxFile ($([math]::Round($crxSize/1KB, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se creo el archivo CRX" -ForegroundColor Red
    exit 1
}

if (Test-Path $pemFile) {
    Write-Host "  PEM guardado: $pemFile" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se creo la clave privada" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Extension empaquetada exitosamente!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivos generados:" -ForegroundColor Cyan
Write-Host "  - $crxFile  (distribuir)" -ForegroundColor White
Write-Host "  - $pemFile  (GUARDAR SEGURO!)" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  Haz backup del archivo .pem en un lugar seguro." -ForegroundColor Yellow
Write-Host "  Lo necesitaras para futuras actualizaciones." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para instalar:" -ForegroundColor Cyan
Write-Host "  1. Arrastra $crxFile a chrome://extensions/" -ForegroundColor White
Write-Host "  2. Confirma instalacion" -ForegroundColor White
Write-Host ""
pause
