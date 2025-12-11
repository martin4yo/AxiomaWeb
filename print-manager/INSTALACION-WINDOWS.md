# 🖨️ Guía de Instalación Print Manager en Windows

Esta guía cubre la instalación completa del Print Manager en Windows para imprimir:
- ✅ **Tickets en impresora térmica** (automático, sin Ctrl+P)
- ✅ **Facturas/Presupuestos en impresora común** (PDF normal)

---

## 📋 Requisitos Previos

### 1. Node.js
Descarga e instala Node.js desde: https://nodejs.org/

**Recomendado:** Versión LTS (Long Term Support)

Para verificar la instalación:
```cmd
node --version
npm --version
```

### 2. Git for Windows (necesario para OpenSSL)
Descarga e instala desde: https://git-scm.com/download/win

Durante la instalación, asegúrate de seleccionar:
- ✅ "Use Git from the Windows Command Prompt"
- ✅ "Use bundled OpenSSL library"

---

## 🚀 Instalación Paso a Paso

### Paso 1: Descargar el Print Manager

Opción A - Clonar repositorio:
```cmd
cd C:\
git clone https://github.com/martin4yo/AxiomaWeb.git
cd AxiomaWeb\print-manager
```

Opción B - Descargar ZIP:
1. Descarga el proyecto desde GitHub
2. Extrae la carpeta `print-manager` en `C:\print-manager`

### Paso 2: Instalar Dependencias

Abre **CMD** o **PowerShell** en la carpeta del Print Manager:

```cmd
cd C:\AxiomaWeb\print-manager

REM Copiar el package.json correcto
copy package-thermal-windows.json package.json

REM Instalar dependencias
npm install
```

Esto instalará: express, cors, qrcode, pngjs, axios

### Paso 3: Generar Certificados HTTPS

**IMPORTANTE:** Esto es necesario para que el navegador permita la comunicación desde la web (HTTPS) al Print Manager local.

```cmd
REM Ejecutar script de generación de certificados
generate-cert.bat
```

Si todo sale bien, verás:
```
================================================
  Certificado generado exitosamente!
================================================

Archivos creados:
  - localhost-cert.pem (certificado público)
  - localhost-key.pem  (clave privada)
```

**Solución de problemas:**
- Si dice "OpenSSL no está instalado", instala Git for Windows
- Si Git está instalado pero no funciona, agrega al PATH: `C:\Program Files\Git\usr\bin`

### Paso 4: Configurar Nombre de Impresora Térmica

#### 4.1 Obtener nombre exacto de tu impresora

**Opción A - Panel de Control:**
1. Abre **Panel de Control**
2. Ve a **Dispositivos e impresoras**
3. Anota el **nombre exacto** de tu impresora térmica (sensible a mayúsculas)

Ejemplos:
- `POS-80`
- `TM-T20`
- `EPSON TM-T20II`
- `Gprinter`

**Opción B - PowerShell:**
```powershell
Get-Printer | Select-Object Name, DriverName, PortName
```

#### 4.2 Configurar en el Print Manager

**Método 1: Variable de entorno (Recomendado)**

Crea un archivo `iniciar.bat` en la carpeta del Print Manager:

```bat
@echo off
set PRINTER_NAME=POS-80
node server-thermal-windows.js
pause
```

Reemplaza `POS-80` con el nombre de tu impresora.

**Método 2: Editar código**

Abre `server-thermal-windows.js` y modifica la línea 30:

```javascript
const PRINTER_NAME = process.env.PRINTER_NAME || 'TU-IMPRESORA-AQUI'
```

---

## ▶️ Iniciar el Print Manager

### Primera vez: Aceptar Certificado HTTPS

1. Inicia el servidor:
```cmd
node server-thermal-windows.js
```

2. Verás en consola:
```
🖨️  Print Manager Server - Versión Windows Térmica
==================================================
✅ Servidor HTTPS corriendo en https://localhost:9100
🔒 Certificado SSL: ACTIVO
🖨️  Impresora configurada: "POS-80"

⚠️  IMPORTANTE: Primera vez
   El navegador mostrará advertencia de seguridad.
   Debes aceptar el certificado autofirmado para continuar.
==================================================
```

3. **Abre el navegador** y ve a: `https://localhost:9100/health`

4. Verás una **advertencia de seguridad**. Esto es NORMAL para certificados autofirmados.

#### En Chrome/Edge:
- Haz clic en **"Avanzado"**
- Luego en **"Ir a localhost (sitio no seguro)"**

#### En Firefox:
- Haz clic en **"Avanzado"**
- Luego en **"Aceptar el riesgo y continuar"**

5. Deberías ver un JSON:
```json
{
  "status": "ok",
  "message": "Print Manager running on Windows",
  "version": "2.0-thermal",
  "printerName": "POS-80"
}
```

**¡Listo!** El certificado está aceptado. Cierra la pestaña y vuelve al sistema.

### Inicio normal (después de aceptar certificado)

Simplemente ejecuta:
```cmd
node server-thermal-windows.js
```

O usa tu archivo `iniciar.bat` si lo creaste.

**Para que se ejecute automáticamente al iniciar Windows:**

Ver la guía completa: **[INICIO-AUTOMATICO.md](INICIO-AUTOMATICO.md)**

Resumen rápido:
1. Presiona `Win + R`
2. Escribe `shell:startup` y presiona Enter
3. Crea un acceso directo a `iniciar-oculto.vbs` (sin ventana) o `iniciar-print-manager.bat` (con ventana)

---

## 🖨️ Usar el Sistema de Impresión

### Imprimir Ticket en Impresora Térmica

Desde el sistema web (axiomaweb.axiomacloud.com):

1. Realiza una venta
2. En la lista de ventas, haz clic en el botón **"IMPRIMIR TICKET"** 🎫
3. El ticket se imprimirá **automáticamente** en la impresora térmica

**No necesitas presionar Ctrl+P**

### Imprimir Factura/Presupuesto en Impresora Común

Para documentos formales con más detalle:

1. En la lista de ventas, haz clic en el botón **"PDF"** 📄
2. Se abrirá el PDF en una nueva pestaña
3. Presiona **Ctrl+P** para imprimir
4. Selecciona tu **impresora común** (láser, inyección, etc.)
5. Imprime

---

## 🔧 Solución de Problemas

### El navegador no se conecta al Print Manager

**Error:** `Failed to fetch` o `ERR_CONNECTION_REFUSED`

✅ **Solución:**
1. Verifica que el Print Manager esté corriendo
2. Verifica que muestre "HTTPS corriendo en https://localhost:9100"
3. Acepta el certificado en el navegador (paso anterior)

### Error: "Print Manager no disponible"

✅ **Solución:**
1. Abre una pestaña nueva
2. Ve a `https://localhost:9100/health`
3. Si funciona, vuelve al sistema e intenta imprimir de nuevo

### No imprime en la impresora térmica

**Error:** `Error escribiendo a impresora`

✅ **Solución:**
1. Verifica que la impresora esté **encendida** y **conectada**
2. Verifica que Windows la reconozca en "Dispositivos e impresoras"
3. Verifica que el nombre en `PRINTER_NAME` coincida **exactamente**
4. Intenta imprimir una página de prueba desde Windows primero

### El certificado sigue dando error

✅ **Solución:**
1. Cierra TODAS las pestañas del navegador
2. Vuelve a abrir y ve a `https://localhost:9100/health`
3. Acepta el certificado de nuevo

---

## 📦 Actualizar el Print Manager

Cuando haya una nueva versión:

```cmd
cd C:\AxiomaWeb\print-manager

REM Actualizar código
git pull

REM Reinstalar dependencias (solo si package.json cambió)
npm install
```

Reinicia el servidor.

---

## 🔐 Seguridad

### ¿Es seguro aceptar el certificado autofirmado?

**SÍ**, porque:
- El certificado es para `localhost` (tu propia computadora)
- No hay tráfico por internet
- Solo tu navegador se comunica con tu Print Manager local
- Los datos nunca salen de tu PC

### ¿Necesito abrir puertos en el firewall?

**NO**, porque:
- El Print Manager escucha en `localhost` (127.0.0.1)
- Solo acepta conexiones desde la misma computadora
- No es accesible desde internet ni red local

---

## 📞 Soporte

Si tienes problemas:

1. **Verifica los logs** del Print Manager en la consola
2. **Prueba el endpoint** `/health`: https://localhost:9100/health
3. **Contacta a soporte** con capturas de:
   - Consola del Print Manager
   - Error en el navegador (consola de desarrollador F12)

---

## 🎯 Checklist de Instalación

- [ ] Node.js instalado (`node --version` funciona)
- [ ] Git for Windows instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Certificados generados (`generate-cert.bat` ejecutado)
- [ ] Nombre de impresora configurado
- [ ] Servidor iniciado (`node server-thermal-windows.js`)
- [ ] Certificado aceptado en navegador (`https://localhost:9100/health` funciona)
- [ ] Prueba de impresión exitosa
- [ ] Inicio automático configurado (opcional pero recomendado)

---

## 📚 Documentación Adicional

- **[INICIO-AUTOMATICO.md](INICIO-AUTOMATICO.md)** - Configurar inicio automático con Windows
- **[INICIO-RAPIDO.md](INICIO-RAPIDO.md)** - Guía rápida de comandos
- **[USAR-IMPRESION-DIRECTA-WINDOWS.md](USAR-IMPRESION-DIRECTA-WINDOWS.md)** - Guía detallada de impresión directa

---

**¡Listo para imprimir! 🎉**
