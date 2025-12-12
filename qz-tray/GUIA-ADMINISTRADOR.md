# 🔧 Guía de Implementación QZ Tray - Administrador de Sistemas

Guía técnica para implementar QZ Tray en múltiples puestos de trabajo.

---

## 📊 Resumen Ejecutivo

**Para implementar en:**
- **1-5 PCs**: Instalación manual (30 min por PC)
- **5-50 PCs**: Script PowerShell + instalación remota (1-2 horas total)
- **50+ PCs**: GPO + distribución automática (setup inicial 2-4 horas, luego automático)

---

## 🎯 Opción 1: Instalación Manual (1-5 PCs)

### Tiempo estimado: 30 minutos por PC

### Pasos:

1. **Descargar instalador una vez**
   ```powershell
   Invoke-WebRequest -Uri "https://github.com/qzind/tray/releases/download/v2.2.0/qz-tray-2.2.exe" `
     -OutFile "C:\Temp\qz-tray-2.2.exe"
   ```

2. **Copiar a USB o red compartida**
   ```
   \\servidor\software\qz-tray\qz-tray-2.2.exe
   ```

3. **En cada PC:**
   - Ejecutar como administrador
   - Marcar "Start on system startup"
   - Finish

4. **Verificar:**
   - Abrir https://localhost:8182/
   - Debe mostrar "QZ Tray v2.2.x"

5. **Configurar impresora en AxiomaWeb:**
   - Usuario configura desde la interfaz web
   - Configuración se guarda automáticamente

---

## ⚡ Opción 2: Script PowerShell (5-50 PCs)

### Tiempo estimado: 1-2 horas total

### Paso 1: Crear script de instalación

Guardar como `install-qztray.ps1`:

```powershell
<#
.SYNOPSIS
    Instala QZ Tray silenciosamente en la PC local
.DESCRIPTION
    Descarga e instala QZ Tray con configuración para inicio automático
.NOTES
    Requiere permisos de administrador
#>

[CmdletBinding()]
param(
    [string]$InstallerUrl = "https://github.com/qzind/tray/releases/download/v2.2.0/qz-tray-2.2.exe",
    [string]$TempPath = "$env:TEMP\qz-tray-installer.exe"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Instalador QZ Tray - AxiomaWeb" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Este script requiere permisos de administrador" -ForegroundColor Red
    Write-Host "Click derecho en PowerShell -> Ejecutar como administrador" -ForegroundColor Yellow
    pause
    exit 1
}

# Descargar instalador
Write-Host "[1/4] Descargando QZ Tray..." -ForegroundColor Yellow
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $TempPath -UseBasicParsing
    Write-Host "  Descargado: $TempPath" -ForegroundColor Green
} catch {
    Write-Host "ERROR: No se pudo descargar QZ Tray" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    pause
    exit 1
}

# Verificar descarga
if (-not (Test-Path $TempPath)) {
    Write-Host "ERROR: Archivo no encontrado despues de descarga" -ForegroundColor Red
    pause
    exit 1
}

# Instalar silenciosamente
Write-Host ""
Write-Host "[2/4] Instalando QZ Tray..." -ForegroundColor Yellow
try {
    $arguments = "/S", "/AllUsers", "/StartOnBoot"
    Start-Process -FilePath $TempPath -ArgumentList $arguments -Wait -NoNewWindow
    Write-Host "  Instalado en: C:\Program Files\QZ Tray" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Fallo la instalacion" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    pause
    exit 1
}

# Verificar instalación
Write-Host ""
Write-Host "[3/4] Verificando instalacion..." -ForegroundColor Yellow
$qzPath = "C:\Program Files\QZ Tray\qz-tray.exe"
if (Test-Path $qzPath) {
    Write-Host "  QZ Tray instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "ERROR: QZ Tray no se instalo correctamente" -ForegroundColor Red
    pause
    exit 1
}

# Iniciar QZ Tray
Write-Host ""
Write-Host "[4/4] Iniciando QZ Tray..." -ForegroundColor Yellow
try {
    Start-Process -FilePath $qzPath
    Start-Sleep -Seconds 3
    Write-Host "  QZ Tray iniciado" -ForegroundColor Green
} catch {
    Write-Host "ADVERTENCIA: No se pudo iniciar automaticamente" -ForegroundColor Yellow
    Write-Host "Iniciar manualmente desde menu inicio" -ForegroundColor Yellow
}

# Configurar firewall
Write-Host ""
Write-Host "[Extra] Configurando firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "QZ Tray" `
        -Direction Inbound `
        -Program $qzPath `
        -Action Allow `
        -ErrorAction SilentlyContinue
    Write-Host "  Firewall configurado" -ForegroundColor Green
} catch {
    Write-Host "  Firewall: ya configurado o sin permisos" -ForegroundColor Yellow
}

# Limpiar
Remove-Item $TempPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Instalacion completada exitosamente!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Verificar icono de diamante azul en bandeja del sistema" -ForegroundColor White
Write-Host "  2. Abrir: https://localhost:8182/ para confirmar" -ForegroundColor White
Write-Host "  3. Ingresar a AxiomaWeb y configurar impresora" -ForegroundColor White
Write-Host ""

# Verificar servicio web
Write-Host "Verificando servicio QZ Tray..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
try {
    $response = Invoke-WebRequest -Uri "https://localhost:8182/" `
        -SkipCertificateCheck `
        -ErrorAction SilentlyContinue `
        -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  QZ Tray responde correctamente en puerto 8182" -ForegroundColor Green
    }
} catch {
    Write-Host "  ADVERTENCIA: QZ Tray aun no responde (esperar 30 seg)" -ForegroundColor Yellow
}

Write-Host ""
pause
```

### Paso 2: Ejecutar en cada PC

**Opción A: Ejecutar localmente**
```powershell
# En cada PC, como administrador
powershell -ExecutionPolicy Bypass -File install-qztray.ps1
```

**Opción B: Ejecutar remotamente**
```powershell
# Desde tu PC, ejecutar en PCs remotas
$pcs = @("PC001", "PC002", "PC003")  # Lista de PCs

foreach ($pc in $pcs) {
    Write-Host "Instalando en $pc..." -ForegroundColor Cyan

    Invoke-Command -ComputerName $pc -ScriptBlock {
        # Copiar script
        $scriptContent = Invoke-WebRequest -Uri "http://servidor/install-qztray.ps1" -UseBasicParsing
        Set-Content -Path "C:\Temp\install.ps1" -Value $scriptContent.Content

        # Ejecutar
        powershell -ExecutionPolicy Bypass -File "C:\Temp\install.ps1"
    }

    Write-Host "  Completado: $pc" -ForegroundColor Green
}
```

### Paso 3: Verificar instalaciones

Script de verificación (`verify-qztray.ps1`):

```powershell
$pcs = Get-Content "pcs.txt"  # Lista de PCs (uno por línea)
$results = @()

foreach ($pc in $pcs) {
    try {
        $test = Test-Connection -ComputerName $pc -Count 1 -Quiet
        if ($test) {
            $qzPath = "\\$pc\C$\Program Files\QZ Tray\qz-tray.exe"
            $installed = Test-Path $qzPath

            $results += [PSCustomObject]@{
                PC = $pc
                Online = $true
                Installed = $installed
                Status = if ($installed) { "OK" } else { "NO INSTALADO" }
            }
        } else {
            $results += [PSCustomObject]@{
                PC = $pc
                Online = $false
                Installed = $false
                Status = "OFFLINE"
            }
        }
    } catch {
        $results += [PSCustomObject]@{
            PC = $pc
            Online = $false
            Installed = $false
            Status = "ERROR"
        }
    }
}

# Mostrar resultados
$results | Format-Table -AutoSize

# Exportar a CSV
$results | Export-Csv -Path "qztray-status.csv" -NoTypeInformation

# Resumen
$total = $results.Count
$installed = ($results | Where-Object { $_.Installed -eq $true }).Count
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Total PCs: $total" -ForegroundColor White
Write-Host "  Instalados: $installed" -ForegroundColor Green
Write-Host "  Pendientes: $($total - $installed)" -ForegroundColor Yellow
```

---

## 🏢 Opción 3: Group Policy (50+ PCs)

### Tiempo estimado: Setup inicial 2-4 horas, luego automático

### Requisitos:
- Active Directory
- Servidor de archivos accesible
- Permisos de GPO

### Paso 1: Preparar instalador

```powershell
# 1. Crear carpeta compartida
New-Item -ItemType Directory -Path "\\servidor\software\qz-tray"
New-SmbShare -Name "Software" -Path "\\servidor\software" -FullAccess "Domain Computers"

# 2. Descargar instalador
Invoke-WebRequest -Uri "https://github.com/qzind/tray/releases/download/v2.2.0/qz-tray-2.2.exe" `
    -OutFile "\\servidor\software\qz-tray\qz-tray-2.2.exe"

# 3. Crear script de instalación
$scriptContent = @'
$installer = "\\servidor\software\qz-tray\qz-tray-2.2.exe"
if (Test-Path $installer) {
    Start-Process -FilePath $installer -ArgumentList "/S", "/AllUsers", "/StartOnBoot" -Wait
    Start-Sleep -Seconds 5
    Start-Process "C:\Program Files\QZ Tray\qz-tray.exe"
}
'@
Set-Content -Path "\\servidor\software\qz-tray\install.ps1" -Value $scriptContent
```

### Paso 2: Crear GPO

**Opción A: Software Installation (MSI)**

Si tienes instalador MSI (o conviertes el EXE):
```
1. Group Policy Management
2. Crear nuevo GPO: "Deploy QZ Tray"
3. Computer Configuration → Software Settings → Software Installation
4. New → Package
5. Seleccionar: \\servidor\software\qz-tray\qz-tray.msi
6. Deployment method: Assigned
```

**Opción B: Startup Script (EXE)**

Para usar el ejecutable directo:
```
1. Group Policy Management
2. Crear nuevo GPO: "Deploy QZ Tray"
3. Computer Configuration → Policies → Windows Settings → Scripts (Startup/Shutdown)
4. Startup → Add → PowerShell Scripts
5. Script Name: \\servidor\software\qz-tray\install.ps1
6. OK
```

### Paso 3: Asignar GPO

```
1. En GPMC, click derecho en OU (ej: "Ventas" o "Sucursales")
2. Link an Existing GPO
3. Seleccionar "Deploy QZ Tray"
4. OK
```

### Paso 4: Forzar actualización (opcional)

En cada PC:
```powershell
gpupdate /force
shutdown /r /t 60  # Reiniciar en 60 segundos
```

O remotamente:
```powershell
Invoke-GPUpdate -Computer "PC001" -Force
```

### Paso 5: Monitorear despliegue

```powershell
# Ver estado de GPO aplicado
Get-GPResultantSetOfPolicy -Computer "PC001" -ReportType Html -Path "report.html"

# Verificar instalación remota
Test-Path "\\PC001\C$\Program Files\QZ Tray\qz-tray.exe"
```

---

## 📝 Post-Implementación

### 1. Documentación para usuarios

- Entregar [GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)
- Realizar capacitación rápida (15 min)
- Mostrar dónde está el icono 💎
- Probar impresión de prueba

### 2. Configuración de impresoras

Dos opciones:

**A. Usuario configura (recomendado)**
- Cada usuario configura su impresora desde AxiomaWeb
- Configuración se guarda en localStorage del navegador

**B. Pre-configuración (opcional)**
```javascript
// Script para pre-configurar impresora por sucursal
// Agregar en AxiomaWeb como configuración global

const printersByLocation = {
  'sucursal-1': 'POS-80',
  'sucursal-2': 'TM-T20',
  'sucursal-3': 'EPSON-TM'
};

const location = window.location.hostname; // o tenant
const defaultPrinter = printersByLocation[location];

if (defaultPrinter) {
  localStorage.setItem('qz-tray-config', JSON.stringify({
    printerName: defaultPrinter,
    defaultTemplate: 'simple'
  }));
}
```

### 3. Soporte nivel 1

**Problemas comunes:**

| Problema | Solución Rápida |
|----------|-----------------|
| No conecta | 1. Verificar icono 💎<br>2. Reiniciar QZ Tray<br>3. Firewall |
| No imprime | 1. Verificar impresora en Windows<br>2. Página de prueba<br>3. Cambiar cable USB |
| Caracteres raros | 1. Verificar modelo compatible ESC/POS<br>2. Actualizar driver |

**Comandos útiles:**

```powershell
# Verificar si QZ Tray está ejecutándose
Get-Process -Name "qz-tray" -ErrorAction SilentlyContinue

# Reiniciar QZ Tray
Stop-Process -Name "qz-tray" -Force
Start-Process "C:\Program Files\QZ Tray\qz-tray.exe"

# Ver logs
Get-Content "$env:USERPROFILE\.qz\qz-tray.log" -Tail 50

# Reinstalar
& "\\servidor\software\qz-tray\qz-tray-2.2.exe" /S /AllUsers /StartOnBoot
```

---

## 📊 Monitoreo y Métricas

### Dashboard de estado (PowerShell)

```powershell
function Get-QZTrayStatus {
    param([string[]]$Computers)

    $results = foreach ($pc in $Computers) {
        $online = Test-Connection -ComputerName $pc -Count 1 -Quiet

        if ($online) {
            $installed = Test-Path "\\$pc\c$\Program Files\QZ Tray\qz-tray.exe"
            $running = Get-Process -ComputerName $pc -Name "qz-tray" -ErrorAction SilentlyContinue

            [PSCustomObject]@{
                Computer = $pc
                Online = $true
                Installed = $installed
                Running = ($null -ne $running)
                Version = if ($installed) { "2.2.0" } else { "N/A" }
                LastCheck = Get-Date -Format "yyyy-MM-dd HH:mm"
            }
        } else {
            [PSCustomObject]@{
                Computer = $pc
                Online = $false
                Installed = $false
                Running = $false
                Version = "N/A"
                LastCheck = Get-Date -Format "yyyy-MM-dd HH:mm"
            }
        }
    }

    $results | Format-Table -AutoSize
}

# Uso
$pcs = Get-ADComputer -Filter * | Select-Object -ExpandProperty Name
Get-QZTrayStatus -Computers $pcs
```

---

## 🔄 Actualización a Nueva Versión

Cuando salga QZ Tray 2.3 o superior:

```powershell
# 1. Descargar nueva versión
Invoke-WebRequest -Uri "URL_NUEVA_VERSION" `
    -OutFile "\\servidor\software\qz-tray\qz-tray-2.3.exe"

# 2. Actualizar script GPO o ejecutar remotamente
Invoke-Command -ComputerName (Get-Content pcs.txt) -ScriptBlock {
    & "\\servidor\software\qz-tray\qz-tray-2.3.exe" /S /AllUsers /StartOnBoot
}
```

---

## 📞 Escalamiento

**Nivel 1 (Usuario):**
- Seguir guía de usuario
- Verificar impresora en Windows
- Reiniciar QZ Tray

**Nivel 2 (Help Desk):**
- Verificar instalación remota
- Revisar logs
- Reinstalar si es necesario

**Nivel 3 (Administrador):**
- Problemas de GPO
- Certificados digitales
- Integración con AxiomaWeb

---

## 📚 Recursos

- **Documentación oficial**: https://qz.io/wiki/
- **GitHub**: https://github.com/qzind/tray
- **Releases**: https://github.com/qzind/tray/releases
- **Soporte comunitario**: https://qz.io/support/

---

**Última actualización:** Enero 2025
**Versión del documento:** 1.0
**Software:** QZ Tray 2.2.x
