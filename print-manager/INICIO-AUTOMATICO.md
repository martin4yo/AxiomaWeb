# 🚀 Configurar Inicio Automático del Print Manager en Windows

Esta guía explica cómo hacer que el Print Manager se inicie automáticamente al arrancar Windows.

**Tienes 3 opciones:**
1. **Carpeta de inicio** (Simple, recomendado para usuarios)
2. **Inicio oculto** (Sin ventana, más limpio)
3. **Servicio de Windows** (Profesional, más robusto)

---

## 📁 Opción 1: Carpeta de Inicio (Simple)

El Print Manager se iniciará mostrando una ventana de consola.

### Paso 1: Configurar el script

1. Abre el archivo `iniciar-print-manager.bat` con el Bloc de notas
2. Modifica la línea 7 con el nombre de tu impresora:

```bat
set PRINTER_NAME=TU-IMPRESORA-AQUI
```

Ejemplo:
```bat
set PRINTER_NAME=POS-80
```

3. Guarda el archivo

### Paso 2: Agregar a inicio automático

1. Presiona `Win + R`
2. Escribe `shell:startup` y presiona **Enter**
3. Se abrirá la carpeta de inicio automático
4. **Crea un acceso directo** del archivo `iniciar-print-manager.bat`:
   - Haz clic derecho en el escritorio → **Nuevo** → **Acceso directo**
   - Busca y selecciona `iniciar-print-manager.bat`
   - Dale un nombre: "Print Manager"
   - Mueve el acceso directo a la carpeta de inicio que se abrió

### Paso 3: Probar

1. **Reinicia Windows**
2. Al iniciar sesión, se abrirá automáticamente la ventana del Print Manager
3. Verifica que diga "Servidor HTTPS corriendo en https://localhost:9100"

**Ventajas:**
- ✅ Muy simple de configurar
- ✅ Fácil de ver si está funcionando
- ✅ Fácil de cerrar (cerrar ventana)

**Desventajas:**
- ⚠️ La ventana siempre está visible
- ⚠️ Si cierras la ventana, deja de funcionar

---

## 🔇 Opción 2: Inicio Oculto (Recomendado)

El Print Manager se inicia en segundo plano sin mostrar ventana.

### Paso 1: Configurar el script

1. Abre el archivo `iniciar-print-manager.bat` con el Bloc de notas
2. Modifica la línea 7 con el nombre de tu impresora:

```bat
set PRINTER_NAME=TU-IMPRESORA-AQUI
```

3. Guarda el archivo

### Paso 2: Agregar a inicio automático

1. Presiona `Win + R`
2. Escribe `shell:startup` y presiona **Enter**
3. **Crea un acceso directo** del archivo `iniciar-oculto.vbs`:
   - Haz clic derecho en el escritorio → **Nuevo** → **Acceso directo**
   - Busca y selecciona `iniciar-oculto.vbs`
   - Dale un nombre: "Print Manager (Oculto)"
   - Mueve el acceso directo a la carpeta de inicio

### Paso 3: Probar

1. **Reinicia Windows**
2. Al iniciar sesión, NO verás ninguna ventana
3. Para verificar que funciona:
   - Abre el navegador
   - Ve a `https://localhost:9100/health`
   - Deberías ver un JSON con `"status": "ok"`

### ¿Cómo detenerlo?

Si necesitas detener el Print Manager:

**Opción A - Administrador de tareas:**
1. Presiona `Ctrl + Shift + Esc`
2. Busca el proceso **"Node.js: Server-side JavaScript"**
3. Clic derecho → **Finalizar tarea**

**Opción B - CMD:**
```cmd
taskkill /F /IM node.exe
```

**Ventajas:**
- ✅ No ocupa espacio en la pantalla
- ✅ Más profesional
- ✅ Sigue funcionando aunque cierres ventanas

**Desventajas:**
- ⚠️ No ves fácilmente si está funcionando
- ⚠️ Difícil de ver errores

---

## 🔧 Opción 3: Servicio de Windows (Profesional)

Convierte el Print Manager en un servicio de Windows que:
- Se inicia antes del login
- Se reinicia automáticamente si falla
- Aparece en la lista de servicios de Windows

### Requisitos

1. **Ejecutar como Administrador** (CMD o PowerShell)
2. Instalar dependencia adicional

### Paso 1: Instalar dependencia

Abre **CMD o PowerShell como Administrador** en la carpeta del Print Manager:

```cmd
npm install node-windows
```

### Paso 2: Configurar nombre de impresora

Abre `instalar-servicio.js` y modifica la línea 17:

```javascript
const PRINTER_NAME = process.env.PRINTER_NAME || 'TU-IMPRESORA-AQUI';
```

### Paso 3: Instalar el servicio

En la misma ventana de CMD/PowerShell como admin:

```cmd
node instalar-servicio.js
```

Verás:
```
================================================
  ✅ Servicio instalado exitosamente!
================================================

Nombre del servicio: AxiomaWebPrintManager
Impresora configurada: POS-80

El servicio se iniciará automáticamente al arrancar Windows.
```

### Paso 4: Verificar

**Opción A - Servicios de Windows:**
1. Presiona `Win + R`
2. Escribe `services.msc` y presiona Enter
3. Busca **"AxiomaWebPrintManager"**
4. Debería estar **Iniciado** y **Automático**

**Opción B - CMD:**
```cmd
sc query AxiomaWebPrintManager
```

### Comandos útiles

```cmd
# Iniciar servicio
sc start AxiomaWebPrintManager

# Detener servicio
sc stop AxiomaWebPrintManager

# Ver estado
sc query AxiomaWebPrintManager

# Desinstalar servicio
node desinstalar-servicio.js
```

### Ver logs

Los logs del servicio se guardan en el Visor de Eventos:
1. Busca "Visor de eventos" en Windows
2. Ve a **Registros de Windows** → **Aplicación**
3. Busca eventos de **"AxiomaWebPrintManager"**

**Ventajas:**
- ✅ Muy robusto y profesional
- ✅ Se reinicia automáticamente si falla
- ✅ Se inicia antes del login
- ✅ Fácil de administrar desde "Servicios"

**Desventajas:**
- ⚠️ Requiere permisos de administrador
- ⚠️ Más complejo de configurar
- ⚠️ Difícil de ver errores (requiere Visor de Eventos)

---

## 🎯 ¿Cuál opción elegir?

| Situación | Opción Recomendada |
|-----------|-------------------|
| Usuario final en negocio | **Opción 2: Inicio oculto** |
| Múltiples usuarios en la PC | **Opción 3: Servicio** |
| Testing/Desarrollo | **Opción 1: Carpeta de inicio** |
| Servidor dedicado | **Opción 3: Servicio** |

---

## ⚠️ Solución de Problemas

### No inicia automáticamente

**Verifica:**
1. Que el acceso directo esté en la carpeta correcta (`shell:startup`)
2. Que el script `iniciar-print-manager.bat` funcione al ejecutarlo manualmente
3. Que Node.js esté en el PATH del sistema

### Se cierra inmediatamente

**Posibles causas:**
1. Nombre de impresora incorrecto en `PRINTER_NAME`
2. Node.js no instalado
3. Dependencias no instaladas (`npm install`)
4. Puerto 9100 ocupado por otro programa

**Solución:**
1. Ejecuta `iniciar-print-manager.bat` manualmente
2. Lee el error en la consola
3. Presiona una tecla para cerrar y corrige el problema

### No puedo detener el servicio

```cmd
# Detener forzosamente
sc stop AxiomaWebPrintManager

# Si no funciona, desinstalar
node desinstalar-servicio.js

# O usando servicios de Windows
services.msc
```

---

## 📦 Actualizar Print Manager

Si actualizas el código del Print Manager:

**Opción 1 y 2 (Carpeta de inicio):**
- Solo reinicia Windows o ejecuta el script manualmente

**Opción 3 (Servicio):**
```cmd
# 1. Detener servicio
sc stop AxiomaWebPrintManager

# 2. Actualizar código (git pull, npm install, etc.)

# 3. Reiniciar servicio
sc start AxiomaWebPrintManager
```

O reinstalar:
```cmd
node desinstalar-servicio.js
node instalar-servicio.js
```

---

## ✅ Checklist de Configuración

- [ ] Nombre de impresora configurado en el script
- [ ] Script probado manualmente (funciona correctamente)
- [ ] Certificados HTTPS generados
- [ ] Acceso directo/servicio configurado
- [ ] PC reiniciada
- [ ] Print Manager se inicia automáticamente
- [ ] Prueba de conexión a https://localhost:9100/health exitosa
- [ ] Prueba de impresión exitosa

---

**¡Listo! El Print Manager se iniciará automáticamente cada vez que enciendas la PC! 🎉**
