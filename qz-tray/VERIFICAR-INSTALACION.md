# 🔍 Verificar Instalación de QZ Tray

Guía rápida para verificar que QZ Tray está funcionando correctamente.

---

## ✅ Paso 1: Verificar que QZ Tray está ejecutándose

### Windows

**Opción A: Buscar el icono**

Buscar en la **bandeja del sistema** (abajo a la derecha):

```
🔍 Buscar icono de DIAMANTE AZUL 💎
```

- ✅ Si lo ves → QZ Tray está ejecutándose
- ❌ Si NO lo ves:
  - Click en la **flechita hacia arriba** (^)
  - Buscar el diamante ahí
  - O abrir manualmente desde Menú Inicio

**Opción B: Administrador de Tareas**

1. `Ctrl + Shift + Esc` (Administrador de Tareas)
2. Pestaña **"Procesos"**
3. Buscar **"QZ Tray"**
4. Si aparece → ✅ Está ejecutándose
5. Si NO aparece → ❌ No está ejecutándose

### Linux

```bash
# Verificar proceso
ps aux | grep qz-tray

# Si no aparece, iniciar
qz-tray &
```

### Mac

```bash
# Verificar proceso
ps aux | grep -i "qz tray"

# Ver aplicaciones ejecutándose
open /Applications/QZ\ Tray.app
```

---

## ✅ Paso 2: Verificar el Puerto

QZ Tray escucha en el puerto **8182**.

### Verificar con navegador

**⚠️ IMPORTANTE**: QZ Tray usa **HTTP**, NO HTTPS

```
✅ Correcto:   http://localhost:8182
❌ Incorrecto: https://localhost:8182  (da error SSL)
```

**Probar:**

1. Abrir navegador
2. Ir a: `http://localhost:8182`
3. Debe mostrar:

```
QZ Tray
Version: 2.2.x
Status: Ready
```

### Verificar con PowerShell (Windows)

```powershell
# Verificar que el puerto está abierto
Test-NetConnection -ComputerName localhost -Port 8182

# Debe mostrar:
# TcpTestSucceeded : True
```

### Verificar con curl

```bash
# Windows (PowerShell)
curl http://localhost:8182

# Linux/Mac
curl http://localhost:8182

# Debe retornar HTML con "QZ Tray"
```

---

## ❌ Errores Comunes y Soluciones

### Error 1: "ERR_SSL_PROTOCOL_ERROR"

**Causa**: Intentando usar HTTPS en lugar de HTTP

**Solución**:
```
❌ https://localhost:8182
✅ http://localhost:8182
```

### Error 2: "No se puede acceder a este sitio"

**Causa**: QZ Tray no está ejecutándose

**Solución**:
```
1. Abrir Menú Inicio
2. Buscar "QZ Tray"
3. Click para ejecutar
4. Esperar 10 segundos
5. Reintentar: http://localhost:8182
```

### Error 3: "La conexión fue rechazada"

**Causa**: Puerto bloqueado por firewall

**Solución**:
```powershell
# Windows - Agregar regla de firewall
New-NetFirewallRule -DisplayName "QZ Tray" `
    -Direction Inbound `
    -LocalPort 8182 `
    -Protocol TCP `
    -Action Allow
```

### Error 4: "Tiempo de espera agotado"

**Causa**: QZ Tray tardando en iniciar

**Solución**:
```
1. Esperar 30 segundos después de iniciar QZ Tray
2. Reintentar
3. Si persiste, reiniciar QZ Tray:
   - Click derecho en icono 💎
   - Exit
   - Volver a abrir desde Menú Inicio
```

---

## 🔧 Comandos de Diagnóstico

### Windows

```powershell
# Ver si QZ Tray está ejecutándose
Get-Process -Name "qz-tray" -ErrorAction SilentlyContinue

# Ver si el puerto 8182 está en uso
Get-NetTCPConnection -LocalPort 8182 -ErrorAction SilentlyContinue

# Ver logs de QZ Tray
Get-Content "$env:USERPROFILE\.qz\qz-tray.log" -Tail 20

# Reiniciar QZ Tray
Stop-Process -Name "qz-tray" -Force -ErrorAction SilentlyContinue
Start-Process "C:\Program Files\QZ Tray\qz-tray.exe"
Start-Sleep -Seconds 5
curl http://localhost:8182
```

### Linux

```bash
# Ver si está ejecutándose
systemctl status qz-tray

# Ver puerto
netstat -tuln | grep 8182

# Ver logs
tail -f ~/.qz/qz-tray.log

# Reiniciar
systemctl restart qz-tray
# O manualmente:
killall qz-tray
qz-tray &
```

---

## 🧪 Test Completo

Script de PowerShell para verificar todo:

```powershell
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Test de QZ Tray" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Instalación
Write-Host "[1/5] Verificando instalacion..." -ForegroundColor Yellow
$qzPath = "C:\Program Files\QZ Tray\qz-tray.exe"
if (Test-Path $qzPath) {
    Write-Host "  Instalado en: $qzPath" -ForegroundColor Green
} else {
    Write-Host "  QZ Tray NO esta instalado" -ForegroundColor Red
    exit
}

# Test 2: Proceso ejecutándose
Write-Host ""
Write-Host "[2/5] Verificando proceso..." -ForegroundColor Yellow
$process = Get-Process -Name "qz-tray" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "  QZ Tray esta ejecutandose (PID: $($process.Id))" -ForegroundColor Green
} else {
    Write-Host "  QZ Tray NO esta ejecutandose" -ForegroundColor Red
    Write-Host "  Iniciando QZ Tray..." -ForegroundColor Yellow
    Start-Process $qzPath
    Start-Sleep -Seconds 5
}

# Test 3: Puerto abierto
Write-Host ""
Write-Host "[3/5] Verificando puerto 8182..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 8182 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  Puerto 8182 esta abierto" -ForegroundColor Green
} else {
    Write-Host "  Puerto 8182 NO esta abierto" -ForegroundColor Red
}

# Test 4: Conexión HTTP
Write-Host ""
Write-Host "[4/5] Probando conexion HTTP..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8182" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  Conexion HTTP exitosa (Status: 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  No se pudo conectar via HTTP" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Version
Write-Host ""
Write-Host "[5/5] Obteniendo version..." -ForegroundColor Yellow
try {
    $content = (Invoke-WebRequest -Uri "http://localhost:8182" -UseBasicParsing).Content
    if ($content -match "Version:\s*([\d.]+)") {
        Write-Host "  Version: $($matches[1])" -ForegroundColor Green
    }
} catch {
    Write-Host "  No se pudo obtener version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Resumen" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL correcta: http://localhost:8182" -ForegroundColor White
Write-Host "NO usar: https://localhost:8182" -ForegroundColor Red
Write-Host ""
```

Guardar como `test-qztray.ps1` y ejecutar:
```powershell
powershell -ExecutionPolicy Bypass -File test-qztray.ps1
```

---

## ✅ Checklist Final

- [ ] QZ Tray instalado en `C:\Program Files\QZ Tray\`
- [ ] Proceso `qz-tray.exe` ejecutándose
- [ ] Icono 💎 visible en bandeja del sistema
- [ ] Puerto 8182 abierto
- [ ] `http://localhost:8182` accesible (**HTTP**, no HTTPS)
- [ ] Página muestra "QZ Tray Version: 2.2.x"

Si todos tienen ✅ → **QZ Tray funcionando correctamente**

---

## 🔄 Reinicio Completo (Si nada funciona)

```powershell
# 1. Cerrar QZ Tray
Stop-Process -Name "qz-tray" -Force -ErrorAction SilentlyContinue

# 2. Esperar
Start-Sleep -Seconds 3

# 3. Limpiar caché (opcional)
Remove-Item "$env:USERPROFILE\.qz\cache" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Iniciar de nuevo
Start-Process "C:\Program Files\QZ Tray\qz-tray.exe"

# 5. Esperar que inicie
Start-Sleep -Seconds 10

# 6. Verificar
curl http://localhost:8182
```

---

## 📞 Si Persiste el Problema

1. **Desinstalar completamente**:
   ```
   Panel de Control → Programas → Desinstalar QZ Tray
   ```

2. **Eliminar carpeta de configuración**:
   ```powershell
   Remove-Item "$env:USERPROFILE\.qz" -Recurse -Force
   ```

3. **Reinstalar**:
   - Descargar de: https://qz.io/download/
   - Ejecutar como administrador
   - Marcar "Start on startup"

4. **Verificar nuevamente**:
   ```
   http://localhost:8182
   ```
