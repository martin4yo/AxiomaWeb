# Imprimir Directamente en Impresora Térmica (Windows)

Esta guía explica cómo configurar el Print Manager para que imprima **automáticamente** en la impresora térmica sin tener que presionar Ctrl+P.

## 🎯 Objetivo

Que al presionar el botón "IMPRIMIR TICKET" en la aplicación web, el ticket salga **directamente** de la impresora térmica, como en Linux.

## 📋 Requisitos Previos

1. **Impresora térmica instalada en Windows**
   - Panel de Control > Dispositivos e impresoras
   - Debe aparecer la impresora (ejemplo: "POS-80", "TM-T20", "Gprinter")
   - Debe estar "Lista" (luz verde)

2. **Driver de la impresora instalado**
   - Generalmente viene en CD o se descarga del sitio del fabricante
   - Para Gprinter: buscar "Gprinter driver Windows"
   - Para EPSON TM-T20: buscar "EPSON Advanced Printer Driver"

3. **Puerto USB o red configurado**
   - La impresora debe estar conectada por USB o red
   - Debe estar encendida

## 🚀 Paso 1: Identificar el Nombre de tu Impresora

1. Abre **Panel de Control** > **Dispositivos e impresoras**

2. Busca tu impresora térmica (ejemplos):
   - `POS-80`
   - `TM-T20`
   - `Gprinter`
   - `EPSON TM-T20II`
   - `GP-80250II`

3. **Anota el nombre exacto** (sensible a mayúsculas)

## 🔧 Paso 2: Instalar Dependencias

**Solo la primera vez**, instala las dependencias necesarias:

```cmd
cd print-manager
copy package-thermal-windows.json package.json
npm install
```

Esto instalará: express, cors, qrcode, pngjs, axios

## 🔧 Paso 3: Configurar el Print Manager

### Opción A: Variable de entorno (recomendado)

Antes de iniciar el servidor, configura la variable:

```cmd
set PRINTER_NAME=POS-80
node server-thermal-windows.js
```

Reemplaza `POS-80` con el nombre de **tu** impresora.

### Opción B: Editar el código

Abre `server-thermal-windows.js` y cambia la línea 25:

```javascript
const PRINTER_NAME = process.env.PRINTER_NAME || 'POS-80'
```

Cambia `'POS-80'` por el nombre de tu impresora:

```javascript
const PRINTER_NAME = process.env.PRINTER_NAME || 'TM-T20'
```

Guarda el archivo.

## ▶️ Paso 4: Iniciar el Print Manager

```cmd
cd print-manager
node server-thermal-windows.js
```

Deberías ver:

```
🖨️  Print Manager Server - Versión Windows Térmica
==================================================
✅ Servidor corriendo en http://localhost:9100
🖨️  Impresora configurada: "POS-80"

📝 Para cambiar la impresora, modifica PRINTER_NAME en el código
   o usa: set PRINTER_NAME=NombreDeTuImpresora

💡 Métodos de impresión (en orden de intento):
   1. Escritura directa (ESC/POS a impresora)
   2. Comando copy (Windows)
   3. HTML fallback (Ctrl+P manual)
==================================================
```

## 🧪 Paso 5: Probar desde el navegador

### Método 1: Endpoint de test

Abre en tu navegador:

```
http://localhost:9100/health
```

Debe responder con información del servidor.

### Método 2: Desde la aplicación

1. Abre la aplicación web
2. Haz una venta
3. Cuando aparezca el modal de resultado, presiona **"IMPRIMIR TICKET"**

El servidor intentará 3 métodos en orden:

1. **Escritura directa**: Envía comandos ESC/POS directo a `\\.\NombreImpresora`
2. **Comando copy**: Usa `copy /B archivo \\.\NombreImpresora`
3. **HTML fallback**: Abre HTML y requiere Ctrl+P manual

## ✅ Verificar que Funciona

Cuando presiones "IMPRIMIR TICKET", en la consola del servidor debes ver:

```
📄 Solicitud de impresión recibida (template: simple)
🖨️  Intentando imprimir directamente en "POS-80"...
✅ Impreso directamente en impresora
```

Y el ticket debe **salir automáticamente** de la impresora.

## ❌ Solución de Problemas

### Error: "Error escribiendo a impresora: ENOENT"

**Problema**: El nombre de la impresora es incorrecto.

**Solución**:
1. Verifica el nombre exacto en "Dispositivos e impresoras"
2. Asegúrate de que está escrito exactamente igual (mayúsculas/minúsculas)
3. Revisa que no tenga espacios extras

### Error: "Error escribiendo a impresora: Access denied"

**Problema**: Windows requiere permisos de administrador.

**Solución**:
1. Cierra la ventana de cmd
2. Abre cmd como **Administrador** (clic derecho > Ejecutar como administrador)
3. Vuelve a ejecutar:
   ```cmd
   cd C:\ruta\a\print-manager
   node server-thermal-windows.js
   ```

### Error: "Error usando comando copy"

**Problema**: La impresora no es compartida o no permite escritura directa.

**Solución**:
1. Abre "Dispositivos e impresoras"
2. Clic derecho en tu impresora > "Propiedades de impresora"
3. Pestaña "Compartir" > Marcar "Compartir esta impresora"
4. Anota el nombre compartido
5. Usa ese nombre en PRINTER_NAME

### Se abre HTML pero quiero impresión directa

**Problema**: Los métodos 1 y 2 fallaron, se usó el fallback HTML.

**Causas posibles**:
- Impresora no soporta comandos ESC/POS
- Driver no permite escritura directa
- Permisos insuficientes

**Solución**:
1. Verifica que la impresora es térmica ESC/POS (no una impresora láser/inyección)
2. Instala el driver correcto (debe ser driver para impresora térmica POS)
3. Ejecuta cmd como Administrador
4. Si persiste, usa el método Electron (siguiente sección)

## 🔄 Alternativa: Usar Electron

Si los métodos anteriores no funcionan, usa la versión Electron que tiene mejor soporte USB:

```cmd
cd print-manager
npm install
npm start
```

La versión Electron usa acceso directo USB y funciona mejor en Windows para impresoras térmicas.

## 📊 Comparación de Versiones

| Versión | Impresión | Ventaja | Desventaja |
|---------|-----------|---------|------------|
| `server-windows.js` | HTML + Ctrl+P | Simple, sin dependencias | Requiere acción manual |
| `server-thermal-windows.js` | Directa ESC/POS | Automática si funciona | Puede requerir permisos admin |
| Electron (`npm start`) | Directa USB | Mejor compatibilidad | Requiere instalación Electron |

## 🎯 Recomendación

1. **Probar primero**: `server-thermal-windows.js` (esta guía)
2. **Si no funciona**: Usar Electron (`npm start`)
3. **Como último recurso**: Usar `server-windows.js` con Ctrl+P manual

## 📝 Notas Importantes

- **Node.js debe ejecutarse como Administrador** para acceso directo a impresora
- Solo funciona con **impresoras térmicas ESC/POS** (no impresoras normales)
- El nombre de la impresora es **sensible a mayúsculas/minúsculas**
- La impresora debe estar **encendida y lista** antes de iniciar el servidor

## 🆘 ¿Necesitas Ayuda?

Si ningún método funciona:

1. Verifica que la impresora imprime desde otras aplicaciones (Bloc de notas)
2. Anota el modelo exacto de tu impresora
3. Busca si hay driver ESC/POS específico para tu modelo
4. Considera usar la versión Linux en una Raspberry Pi conectada a la impresora
