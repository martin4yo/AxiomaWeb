# 🖨️ Instalación del Print Manager en Windows

## 📋 Guía Completa Paso a Paso

Esta guía te llevará desde **cero** hasta tener el sistema de impresión funcionando en Windows.

---

## ⏱️ Tiempo Estimado

- **Primera instalación:** 20-30 minutos
- **Instalaciones posteriores:** 5 minutos

---

## 🎯 Requisitos Previos

- ✅ PC con **Windows 10 o superior**
- ✅ **Impresora térmica** conectada por USB (Gprinter, Epson TM-T20, Star, etc.)
- ✅ Conexión a **Internet** (para descargar dependencias)
- ✅ Privilegios de **Administrador** en la PC

---

## 📦 PASO 1: Instalar Node.js

### 1.1. Descargar Node.js

1. Abrir navegador web
2. Ir a: **https://nodejs.org/**
3. Hacer clic en el botón verde grande **"Download Node.js (LTS)"**
4. Se descargará un archivo `.msi` de aproximadamente 30 MB

**💡 Tip:** La versión LTS (Long Term Support) es la recomendada para producción.

### 1.2. Instalar Node.js

1. **Doble clic** en el archivo descargado (ej: `node-v20.11.0-x64.msi`)
2. Si aparece advertencia de seguridad, hacer clic en **"Sí"**
3. En el instalador:
   - Click **"Next"** (Siguiente)
   - Aceptar licencia → Click **"Next"**
   - Dejar ruta por defecto → Click **"Next"**
   - Dejar todas las opciones marcadas → Click **"Next"**
   - Click **"Install"**
4. Esperar 1-2 minutos mientras se instala
5. Click **"Finish"**

### 1.3. Verificar Instalación

1. Presionar `Windows + R`
2. Escribir: `cmd`
3. Presionar `Enter`
4. En la ventana de símbolo del sistema (Command Prompt), escribir:

```bash
node --version
```

**Resultado esperado:** `v20.11.0` (o similar)

```bash
npm --version
```

**Resultado esperado:** `10.2.4` (o similar)

✅ **Si ves los números de versión, Node.js está correctamente instalado.**

❌ **Si dice "no se reconoce":**
- Cerrar cmd y abrirlo de nuevo
- Si persiste, reiniciar la PC

**💡 Nota:** Usamos `cmd` (Command Prompt) en lugar de PowerShell para evitar problemas con políticas de ejecución de scripts.

---

## 📥 PASO 2: Descargar el Código del Proyecto

### Opción A: Con Git (Recomendado)

**Si tienes Git instalado:**

1. Abrir Command Prompt (presionar `Windows + R`, escribir `cmd`, Enter)
2. Navegar a donde quieres guardar el proyecto:

```bash
cd C:\Users\TuUsuario\
```

3. Clonar el repositorio:

```bash
git clone https://github.com/martin4yo/AxiomaWeb.git
```

4. Entrar a la carpeta:

```bash
cd AxiomaWeb\print-manager
```

### Opción B: Descargar ZIP (Más Simple)

**Si NO tienes Git:**

1. Ir a: **https://github.com/martin4yo/AxiomaWeb**
2. Click en botón verde **"< > Code"**
3. Click en **"Download ZIP"**
4. Descargar el archivo (aproximadamente 20 MB)
5. Click derecho en el archivo ZIP → **"Extraer todo..."**
6. Elegir ubicación (ej: `C:\AxiomaWeb`)
7. Click **"Extraer"**

### 2.1. Navegar a la Carpeta

1. Abrir Command Prompt (`Windows + R`, escribir `cmd`, Enter)
2. Navegar a la carpeta print-manager:

```bash
cd C:\AxiomaWeb\print-manager
```

**💡 Tip:** Puedes arrastrar la carpeta a la ventana de cmd para pegar la ruta automáticamente.

---

## 🖨️ PASO 3: Configurar la Impresora

### 3.1. Instalar Driver de la Impresora

1. **Conectar** la impresora al puerto USB de la PC
2. **Encender** la impresora
3. Windows detectará automáticamente la impresora
4. **Instalar driver:**
   - **Opción 1:** Dejar que Windows instale el driver automáticamente
   - **Opción 2:** Descargar driver desde el sitio del fabricante:
     - **Gprinter:** http://www.gprinter.com.cn/support/software_en
     - **Epson:** https://epson.com/Support/Printers/
     - **Star Micronics:** https://www.starmicronics.com/support/
     - **Bixolon:** https://www.bixolon.com/html/en/download/download_01.xhtml

### 3.2. Verificar Impresora Instalada

1. Presionar `Windows + I` (Configuración)
2. Ir a **"Dispositivos"** o **"Bluetooth y dispositivos"**
3. Click en **"Impresoras y escáneres"**
4. Verificar que aparezca tu impresora en la lista

**Ejemplo:**
```
✓ Gprinter GP-80250III
✓ Epson TM-T20
✓ Star TSP143
```

✅ **Si aparece listada, está lista para usar.**

---

## ⚙️ PASO 4: Instalar Print Manager (Versión Simple)

### 4.1. Preparar Archivos

En la carpeta `print-manager`, deberías tener estos archivos:

```
print-manager/
├── package-simple.json      ← Archivo de dependencias
├── server-simple.js         ← Servidor principal
├── test-simple.js           ← Script de prueba
└── INSTALACION_WINDOWS.md   ← Este documento
```

### 4.2. Renombrar Archivos

Necesitas usar los archivos simplificados:

```bash
# En PowerShell, dentro de la carpeta print-manager:

# Backup del package.json original (opcional)
copy package.json package.json.original

# Usar la versión simple
copy package-simple.json package.json
```

### 4.3. Instalar Dependencias

```bash
npm install
```

**Esto descargará:**
- `express` - Servidor web
- `printer` - Comunicación con impresoras de Windows
- `qrcode` - Generación de códigos QR
- `axios` - Cliente HTTP para pruebas

**Tiempo:** 2-5 minutos

**Progreso esperado:**
```
npm WARN deprecated ...
added 150 packages in 3m
```

✅ **Si termina sin errores "ERR!", está listo.**

❌ **Si hay errores:**

**Error común 1:** "Permission denied" o "EPERM"
**Solución:** Ejecutar PowerShell como Administrador

**Error común 2:** "ENOTFOUND" o "Network error"
**Solución:** Verificar conexión a Internet

**Error común 3:** "node-gyp error"
**Solución:** Instalar windows-build-tools:
```bash
# PowerShell como Administrador
npm install --global windows-build-tools
```

**Error común 4:** "la ejecución de scripts está deshabilitada" (PowerShell)
**Causa:** Política de ejecución de PowerShell bloqueando npm

**Soluciones:**

**Opción A - Usar Command Prompt (Recomendado):**
```bash
# Presionar Windows + R, escribir: cmd
cd C:\AxiomaWeb\print-manager
npm install
```

**Opción B - Cambiar política (Permanente):**
```powershell
# PowerShell como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Responder: S (Sí)
# Luego cerrar y abrir PowerShell normal
```

**Opción C - Bypass temporal (Solo esta sesión):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm install
```

---

## 🚀 PASO 5: Iniciar el Print Manager

### 5.1. Ejecutar

En Command Prompt (dentro de `print-manager`):

```bash
node server-simple.js
```

### 5.2. Verificar que Funciona

**Deberías ver:**

```
🖨️  Axioma Print Manager - Versión Simplificada
================================================

✅ Print Manager corriendo en http://localhost:9100
📋 Ver impresoras: http://localhost:9100/printers
💚 Health check: http://localhost:9100/health

🎯 Esperando solicitudes de impresión...
```

✅ **¡Perfecto! El Print Manager está corriendo.**

### 5.3. Verificar Impresoras Detectadas

1. Abrir navegador
2. Ir a: **http://localhost:9100/printers**

**Deberías ver algo como:**

```json
{
  "success": true,
  "printers": [
    {
      "name": "Gprinter GP-80250III",
      "isDefault": true,
      "status": "IDLE"
    }
  ],
  "default": "Gprinter GP-80250III"
}
```

✅ **Si ves tu impresora listada, todo está listo.**

---

## 🧪 PASO 6: Probar Impresión

### 6.1. Ejecutar Test Automático

**Abrir una NUEVA ventana de Command Prompt** (dejar la anterior corriendo):

```bash
cd C:\AxiomaWeb\print-manager
node test-simple.js
```

### 6.2. Resultado Esperado

**En PowerShell verás:**

```
🧪 Test de Impresión - Print Manager Simple

📤 Enviando solicitud de impresión...

✅ Respuesta del servidor:
{
  "success": true,
  "printer": "Gprinter GP-80250III",
  "template": "simple"
}

🎉 ¡Ticket enviado correctamente!
📝 Revisa tu impresora para ver el resultado.
```

**Y tu impresora debería imprimir un ticket de prueba.**

✅ **Si imprime, ¡FELICITACIONES! El sistema está funcionando.**

❌ **Si no imprime:**

**Problema 1:** Error "ECONNREFUSED"
**Solución:** El Print Manager no está corriendo. Ejecutar `node server-simple.js` primero.

**Problema 2:** Error "Impresora no encontrada"
**Solución:** Verificar nombre exacto de impresora en http://localhost:9100/printers

**Problema 3:** Imprime caracteres raros
**Solución:** Verificar que la impresora sea ESC/POS compatible

---

## 🔄 PASO 7: Configurar Backend de AxiomaWeb

### 7.1. Verificar Configuración

En el backend de AxiomaWeb, verificar que `printDecisionService.ts` apunte a:

```typescript
const PRINT_MANAGER_URL = 'http://localhost:9100'
```

✅ **Ya está configurado por defecto.**

### 7.2. Probar desde AxiomaWeb

1. Iniciar backend de AxiomaWeb:
```bash
cd C:\AxiomaWeb\backend
npm run dev
```

2. Iniciar frontend de AxiomaWeb:
```bash
cd C:\AxiomaWeb\frontend
npm start
```

3. Abrir navegador: **http://localhost:5173**

4. Crear una venta de prueba

5. Al guardar, seleccionar **"Imprimir Ticket Térmico"**

6. **¡Debería imprimir el ticket automáticamente!**

---

## 🎯 PASO 8: Configurar Inicio Automático (Opcional)

### Opción A: Script de Inicio Rápido

1. Crear archivo `iniciar-print-manager.bat` en el Escritorio:

```batch
@echo off
title Axioma Print Manager
cd /d "C:\AxiomaWeb\print-manager"
node server-simple.js
pause
```

2. **Doble clic** en el archivo para iniciar el Print Manager

### Opción B: Inicio Automático con Windows

1. Presionar `Windows + R`
2. Escribir: `shell:startup`
3. Presionar `Enter`
4. Copiar el archivo `.bat` a esa carpeta

**Ahora el Print Manager iniciará automáticamente al encender la PC.**

---

## 📊 Resumen de Comandos

### Instalación (solo primera vez):

```bash
cd C:\AxiomaWeb\print-manager
copy package-simple.json package.json
npm install
```

### Uso diario:

```bash
# Terminal 1: Iniciar Print Manager
cd C:\AxiomaWeb\print-manager
node server-simple.js

# Terminal 2: Probar impresión (opcional)
cd C:\AxiomaWeb\print-manager
node test-simple.js
```

### Ver impresoras disponibles:

Abrir navegador: **http://localhost:9100/printers**

---

## 🆘 Solución de Problemas Comunes

### ❌ "No se encuentra el archivo server-simple.js"

**Causa:** No estás en la carpeta correcta

**Solución:**
```bash
cd C:\AxiomaWeb\print-manager
dir  # Verificar que existan los archivos
```

### ❌ "'node' no se reconoce como comando"

**Causa:** Node.js no está instalado o no está en PATH

**Solución:**
1. Verificar instalación: Repetir PASO 1
2. Reiniciar Command Prompt
3. Si persiste, reiniciar PC

### ❌ "EADDRINUSE: address already in use :::9100"

**Causa:** Ya hay otra instancia del Print Manager corriendo

**Solución:**
```bash
# Opción 1: Cerrar la otra instancia (buscar ventana de cmd con node server-simple.js)

# Opción 2: Matar proceso en puerto 9100
netstat -ano | findstr :9100
taskkill /PID [numero] /F
```

### ❌ La impresora imprime pero está en blanco

**Causa:** La impresora puede estar configurada como impresora gráfica

**Solución:**
1. Verificar que sea impresora ESC/POS
2. Verificar configuración de driver
3. Probar impresión desde Windows (imprimir página de prueba)

### ❌ "Cannot find module 'printer'"

**Causa:** Las dependencias no se instalaron correctamente

**Solución:**
```bash
# Limpiar e instalar de nuevo
rmdir /s node_modules
del package-lock.json
npm install
```

---

## 📞 Soporte

### Verificar Estado del Sistema

```bash
# Ver versión de Node.js
node --version

# Ver impresoras
curl http://localhost:9100/printers

# Health check
curl http://localhost:9100/health
```

### Logs del Print Manager

Los mensajes aparecen en la terminal donde ejecutaste `node server-simple.js`

**Ejemplo:**
```
🎫 Nueva solicitud de impresión
   Template: simple
   Impresora: Por defecto
   Usando: Gprinter GP-80250III
✅ Ticket impreso correctamente (Job ID: 123)
```

---

## ✅ Checklist Final

Marca cada ítem cuando lo completes:

- [ ] Node.js instalado (`node --version` funciona)
- [ ] Código descargado en `C:\AxiomaWeb`
- [ ] Impresora conectada y aparece en Windows
- [ ] Navegado a carpeta `print-manager`
- [ ] Archivos `package-simple.json` copiados
- [ ] Ejecutado `npm install` sin errores
- [ ] Print Manager corriendo (`node server-simple.js`)
- [ ] Impresoras detectadas (http://localhost:9100/printers)
- [ ] Test de impresión exitoso (`node test-simple.js`)
- [ ] Ticket impreso correctamente
- [ ] Backend de AxiomaWeb apuntando a puerto 9100
- [ ] Prueba desde AxiomaWeb funcionando

---

## 🎉 ¡Felicitaciones!

Si llegaste hasta aquí y todos los pasos funcionaron, **tu sistema de impresión térmica está completamente operativo**.

### Próximos Pasos:

1. ✅ Usar el sistema en producción
2. ✅ Configurar inicio automático
3. ✅ Personalizar templates si es necesario
4. ✅ Agregar más impresoras si lo necesitas

---

## 📚 Referencias Adicionales

- **Node.js:** https://nodejs.org/docs/
- **npm:** https://docs.npmjs.com/
- **ESC/POS Commands:** https://reference.epson-biz.com/modules/ref_escpos/

---

**Versión del documento:** 1.0
**Fecha:** Diciembre 2024
**Autor:** AxiomaWeb Team
