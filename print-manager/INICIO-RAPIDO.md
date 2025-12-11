# 🚀 Inicio Rápido - Print Manager

## ❌ Error: "Print Manager no disponible"

Este error aparece cuando el navegador no puede conectarse a `http://localhost:9100`.

**Causa:** El Print Manager no está corriendo en tu PC.

---

## ✅ Solución Rápida

### **En la PC donde quieres imprimir** (Windows):

#### **Paso 1: Ir a la carpeta print-manager**

```cmd
cd C:\ruta\a\AxiomaWeb\print-manager
```

Ejemplo:
```cmd
cd C:\Users\TuUsuario\Desktop\AxiomaWeb\print-manager
```

#### **Paso 2: Elegir qué versión usar**

Tienes 3 opciones:

---

### **OPCIÓN 1: Impresión Directa (Recomendada) 🖨️**

**Imprime automáticamente** en impresora térmica sin Ctrl+P.

```cmd
# 1. Instalar dependencias (solo la primera vez)
copy package-thermal-windows.json package.json
npm install

# 2. Configurar nombre de tu impresora
set PRINTER_NAME=POS-80

# 3. Iniciar servidor
node server-thermal-windows.js
```

**¿Cómo saber el nombre de mi impresora?**
1. Panel de Control → Dispositivos e impresoras
2. Buscar tu impresora térmica
3. Copiar el nombre exacto (ej: `POS-80`, `TM-T20`, `Gprinter`)

**Deberías ver:**
```
🖨️  Print Manager Server - Versión Windows Térmica
==================================================
✅ Servidor corriendo en http://localhost:9100
🖨️  Impresora configurada: "POS-80"
```

---

### **OPCIÓN 2: HTML Simple (Más compatible) 📄**

**Abre HTML** y presionas Ctrl+P para imprimir.

```cmd
# 1. Instalar dependencias (solo la primera vez)
copy package-windows.json package.json
npm install

# 2. Iniciar servidor
node server-windows.js
```

**Deberías ver:**
```
🖨️  Print Manager Server - Versión Windows
==================================================
✅ Servidor corriendo en http://localhost:9100
```

---

### **OPCIÓN 3: Electron con USB Directo (Linux/Avanzado) ⚡**

Solo si las anteriores no funcionan:

```cmd
npm install
npm start
```

---

## ✅ Verificar que Funciona

### **1. Abrir en el navegador:**

```
http://localhost:9100/health
```

**Debe responder:**
```json
{
  "status": "ok",
  "message": "Print Manager running on Windows",
  ...
}
```

### **2. Desde la aplicación web:**

1. Abre la aplicación en el **mismo navegador** donde verificaste el health
2. Haz una venta
3. Presiona el botón morado **"IMPRIMIR TICKET"**

---

## ❌ Problemas Comunes

### **"No se reconoce node como comando"**

**Solución:** Instala Node.js desde https://nodejs.org

### **"Cannot find module 'express'"**

**Solución:** Instala dependencias primero:

```cmd
# Para Opción 1 y 2:
npm install express cors axios qrcode pdfkit

# Para Opción 3 (Electron):
npm install
```

### **"EADDRINUSE: puerto 9100 ya está en uso"**

**Solución:** Ya hay un Print Manager corriendo. Busca la ventana de cmd y úsala.

Si no la encuentras:
```cmd
# Matar proceso en puerto 9100
npx kill-port 9100

# Volver a iniciar
node server-thermal-windows.js
```

### **"Error escribiendo a impresora" (Opción 1)**

**Solución:** Ejecuta cmd como **Administrador**:
1. Busca "cmd" en Windows
2. Clic derecho → "Ejecutar como administrador"
3. Volver a ejecutar los comandos

---

## 📝 Recomendación

**Para producción:** Usa Opción 1 (`server-thermal-windows.js`)
- Prueba primero con tu impresora
- Si no funciona directa, usa Opción 2 (HTML)

**Para desarrollo:** Usa Opción 2 (`server-windows.js`)
- Más simple
- No necesita configurar impresora

---

## 🆘 Si Nada Funciona

Verifica:

1. ✅ Node.js instalado: `node --version`
2. ✅ Estás en la carpeta correcta: `dir` (debe mostrar server-windows.js)
3. ✅ Puerto 9100 disponible: `netstat -an | findstr :9100`
4. ✅ Navegador en la misma PC donde corre el servidor

---

## 📞 Resumen

```cmd
# PASO 1: Abrir terminal en print-manager
cd C:\ruta\a\AxiomaWeb\print-manager

# PASO 2: Elegir versión
node server-thermal-windows.js    # Impresión directa
# o
node server-windows.js             # HTML + Ctrl+P

# PASO 3: Verificar
# Abrir en navegador: http://localhost:9100/health

# PASO 4: Usar desde la app web
# Presionar "IMPRIMIR TICKET" después de una venta
```

---

## 🎯 Siguiente Paso

Una vez que veas el mensaje "✅ Servidor corriendo en http://localhost:9100",
**deja esa ventana abierta** y ve a tu aplicación web para hacer una venta.
