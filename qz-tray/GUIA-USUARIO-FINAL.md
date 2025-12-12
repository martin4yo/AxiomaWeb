# 📝 Guía de Instalación QZ Tray - Usuario Final

Guía simple paso a paso para configurar la impresión térmica en tu puesto de trabajo.

---

## ✅ Requisitos Previos

- ✅ Computadora con Windows 10 o superior
- ✅ Impresora térmica conectada por USB (ej: POS-80, TM-T20)
- ✅ Conexión a internet (solo para instalación)
- ✅ Permisos de administrador

---

## 📥 Paso 1: Descargar QZ Tray

### 1.1 Ir al sitio oficial

Abrir navegador y entrar a:
```
https://qz.io/download/
```

### 1.2 Descargar para Windows

- Click en el botón **"Download for Windows"**
- Se descargará un archivo llamado: `qz-tray-2.2.exe` (aprox 30 MB)
- Esperar a que termine la descarga

---

## 💿 Paso 2: Instalar QZ Tray

### 2.1 Ejecutar el instalador

1. Ir a la carpeta de **Descargas**
2. Buscar el archivo `qz-tray-2.2.exe`
3. **Click derecho** → **Ejecutar como administrador**
4. Si aparece mensaje de Windows Defender:
   - Click en "Más información"
   - Click en "Ejecutar de todas formas"

### 2.2 Seguir el asistente

**Pantalla 1: Bienvenida**
- Click en **"Next"**

**Pantalla 2: Licencia**
- Marcar **"I accept the agreement"**
- Click en **"Next"**

**Pantalla 3: Ubicación**
- Dejar por defecto: `C:\Program Files\QZ Tray\`
- Click en **"Next"**

**Pantalla 4: Opciones** (IMPORTANTE)
- ✅ Marcar: **"Start QZ Tray on system startup"** ← IMPORTANTE
- ✅ Marcar: **"Create a desktop icon"**
- Click en **"Next"**

**Pantalla 5: Resumen**
- Click en **"Install"**
- Esperar a que instale (30 segundos aprox)

**Pantalla 6: Finalizar**
- ✅ Marcar: **"Launch QZ Tray"**
- Click en **"Finish"**

### 2.3 Verificar que está ejecutándose

Después de instalar, buscar en la **bandeja del sistema** (abajo a la derecha, junto al reloj):

```
🔍 Buscar un icono de DIAMANTE AZUL 💎
```

Si lo ves → ✅ **QZ Tray está ejecutándose correctamente**

Si NO lo ves:
1. Click en la **flechita hacia arriba** (^) en la bandeja
2. Buscar el diamante azul ahí
3. Hacer click derecho → **"Pin to taskbar"** (para que siempre esté visible)

---

## 🔧 Paso 3: Verificar Conexión

### 3.1 Abrir interfaz de QZ Tray

1. Abrir tu navegador (Chrome, Firefox, Edge, cualquiera)
2. En la barra de direcciones, escribir:
   ```
   https://localhost:8182/
   ```
3. Presionar **Enter**

### 3.2 Aceptar certificado (solo primera vez)

Aparecerá advertencia de seguridad:

**En Chrome/Edge:**
- Mensaje: "Su conexión no es privada"
- Click en **"Opciones avanzadas"** o **"Advanced"**
- Click en **"Continuar a localhost (sitio no seguro)"**

**En Firefox:**
- Mensaje: "Advertencia: Riesgo potencial de seguridad a continuación"
- Click en **"Avanzado"**
- Click en **"Aceptar el riesgo y continuar"**

### 3.3 Confirmar que funciona

Deberías ver una página que dice:

```
✅ QZ Tray
Version: 2.2.x
Status: Ready
```

Si ves esto → ✅ **QZ Tray está funcionando correctamente**

---

## 🖨️ Paso 4: Verificar Impresora

### 4.1 Asegurarse que la impresora está conectada

1. Conectar cable USB de la impresora a la PC
2. Encender la impresora
3. Esperar que Windows la detecte

### 4.2 Verificar en Windows

1. Abrir **Configuración de Windows** (tecla Windows + I)
2. Ir a **"Dispositivos"** → **"Impresoras y escáneres"**
3. Buscar tu impresora en la lista (ej: "POS-80", "TM-T20")
4. Si NO aparece:
   - Click en **"Agregar una impresora o escáner"**
   - Esperar a que Windows la detecte
   - Seleccionarla y click **"Agregar dispositivo"**

### 4.3 Hacer impresión de prueba (opcional)

1. En la lista de impresoras, click en tu impresora térmica
2. Click en **"Administrar"**
3. Click en **"Imprimir página de prueba"**
4. Debería salir un ticket de prueba

Si imprime → ✅ **Impresora configurada correctamente**

---

## 🌐 Paso 5: Configurar en AxiomaWeb

### 5.1 Ingresar a AxiomaWeb

1. Abrir navegador
2. Ir a: `https://axiomaweb.axiomacloud.com`
3. Iniciar sesión con tu usuario y contraseña

### 5.2 Ir a Configuración

1. En el menú lateral, buscar **"Configuración"** o **"Settings"**
2. Click en **"Configuración de Impresión"** o similar
   (La ubicación exacta puede variar según tu versión)

### 5.3 Conectar QZ Tray

Deberías ver un cuadro que dice **"QZ Tray"** con:

```
🔴 Desconectado
[Botón: Conectar]
```

1. Click en el botón **"Conectar"**
2. Esperar 2-3 segundos
3. Debería cambiar a:
   ```
   🟢 Conectado (v2.2.x)
   ```

Si dice "Desconectado":
- Verificar que QZ Tray está ejecutándose (buscar diamante azul 💎)
- Reiniciar el navegador
- Si persiste, reiniciar la PC

### 5.4 Seleccionar Impresora

Una vez conectado:

1. Aparecerá un dropdown con impresoras disponibles
2. Seleccionar tu impresora térmica (ej: "POS-80")
3. Click en **"Guardar Configuración"**
4. Debería aparecer mensaje: ✅ **"Impresora configurada correctamente"**

---

## ✅ Paso 6: Probar Impresión

### 6.1 Crear una venta de prueba

1. Ir al módulo de **Ventas** en AxiomaWeb
2. Crear una venta nueva (puede ser de $100 de prueba)
3. Agregar un producto cualquiera
4. Finalizar la venta

### 6.2 Verificar configuración de impresión

Antes de finalizar la venta, asegurarse que:

En **Configuración** → **Comprobantes**:
- ✅ **Formato de impresión**: THERMAL
- ✅ **Template**: SIMPLE (o LEGAL según prefieras)

### 6.3 Confirmar impresión

Al finalizar la venta:

**Si todo está bien:**
- 🎉 El ticket debería **imprimirse automáticamente**
- Sin cuadros de diálogo
- Sin confirmaciones
- Directo a la impresora

**Si NO imprime:**
- Ver sección de [Solución de Problemas](#-solución-de-problemas) abajo

---

## 🔄 Paso 7: Uso Diario

Una vez configurado, el uso diario es **automático**:

### ✅ Al iniciar la PC

1. Windows inicia
2. QZ Tray se ejecuta automáticamente (icono 💎)
3. AxiomaWeb se conecta automáticamente
4. Listo para imprimir

### ✅ Al hacer una venta

1. Crear venta en AxiomaWeb
2. Finalizar venta
3. **Ticket imprime automáticamente** 🎉

### ⚠️ Si algo no funciona

- Verificar que el icono 💎 está en la bandeja del sistema
- Si no está, buscar "QZ Tray" en el menú inicio y abrirlo
- Refrescar la página de AxiomaWeb (F5)

---

## 🛠️ Solución de Problemas

### ❌ Problema 1: "QZ Tray no conecta"

**Síntomas:**
- En AxiomaWeb aparece: 🔴 Desconectado
- Botón "Conectar" no funciona

**Soluciones:**

**A. Verificar que QZ Tray está ejecutándose**
1. Buscar icono 💎 en bandeja del sistema
2. Si NO está:
   - Buscar "QZ Tray" en menú inicio
   - Click en el programa para abrirlo
   - Debería aparecer el icono 💎

**B. Verificar acceso a localhost:8182**
1. Abrir navegador
2. Ir a: `https://localhost:8182/`
3. Debería ver página de QZ Tray
4. Si NO carga:
   - Cerrar QZ Tray (click derecho en 💎 → Exit)
   - Volver a abrir QZ Tray
   - Esperar 10 segundos

**C. Firewall bloqueando**
1. Abrir **Windows Defender Firewall**
2. Click en **"Permitir una aplicación"**
3. Buscar **"QZ Tray"**
4. Marcar ambas casillas: Privada ✅ Pública ✅

**D. Reiniciar navegador**
1. Cerrar TODAS las ventanas del navegador
2. Volver a abrir
3. Ingresar a AxiomaWeb
4. Intentar conectar de nuevo

### ❌ Problema 2: "No encuentra mi impresora"

**Síntomas:**
- QZ Tray conecta OK
- Pero no aparece mi impresora en la lista

**Soluciones:**

**A. Verificar impresora en Windows**
1. Configuración → Dispositivos → Impresoras
2. Confirmar que la impresora aparece
3. Si NO aparece: conectar USB y reinstalar driver

**B. Nombre de impresora**
1. Anotar el nombre EXACTO de la impresora en Windows
2. Debe coincidir con el que aparece en AxiomaWeb

**C. Refrescar lista**
1. En AxiomaWeb, click en botón "Conectar" de nuevo
2. Esperar que cargue la lista
3. Revisar todas las opciones del dropdown

### ❌ Problema 3: "Conecta pero no imprime"

**Síntomas:**
- QZ Tray: 🟢 Conectado
- Impresora seleccionada
- Pero no sale ticket al finalizar venta

**Soluciones:**

**A. Verificar configuración de comprobante**
1. Ir a Configuración → Comprobantes
2. Verificar:
   - Formato: **THERMAL** (no PDF)
   - Template: **SIMPLE** o **LEGAL**
3. Guardar cambios

**B. Verificar cola de impresión**
1. Configuración → Impresoras
2. Abrir tu impresora térmica
3. Click en **"Ver cola de impresión"**
4. Si hay documentos atascados:
   - Click derecho → **"Cancelar todos los documentos"**
   - Intentar de nuevo

**C. Imprimir página de prueba**
1. En Windows, hacer impresión de prueba
2. Si NO imprime:
   - Problema de hardware/driver
   - Verificar cable USB
   - Reinstalar driver de impresora

**D. Revisar que la impresora está encendida**
1. Verificar luz encendida
2. Verificar que tiene papel
3. Verificar que no tiene papel atascado

### ❌ Problema 4: "Imprime caracteres raros"

**Síntomas:**
- Imprime pero con símbolos extraños
- No se lee el texto

**Soluciones:**

**A. Verificar compatibilidad**
- Tu impresora debe ser compatible con **ESC/POS**
- Modelos compatibles: POS-80, TM-T20, TM-T88, etc.

**B. Actualizar driver**
1. Ir a sitio web del fabricante
2. Descargar driver más reciente
3. Reinstalar

**C. Contactar soporte**
- Enviar captura de pantalla del ticket
- Informar modelo exacto de impresora

### ❌ Problema 5: "Se reinició la PC y ya no funciona"

**Síntomas:**
- Funcionaba antes
- Después de reiniciar, no funciona

**Soluciones:**

**A. Verificar que QZ Tray inició**
1. Buscar icono 💎 en bandeja
2. Si NO está, abrir manualmente:
   - Menú inicio → Buscar "QZ Tray"
   - Click en el programa

**B. Verificar inicio automático**
1. Click derecho en icono 💎
2. Click en **"Configure"**
3. Verificar: ✅ **"Start on Login"**

**C. Refrescar AxiomaWeb**
1. Presionar **F5** para refrescar
2. Intentar conectar de nuevo

---

## 📞 Contacto de Soporte

Si después de seguir todos los pasos aún tienes problemas:

**📧 Email:** soporte@axiomaweb.com
**📱 WhatsApp:** [Número de soporte]
**🌐 Web:** https://axiomaweb.axiomacloud.com/soporte

**Información a proporcionar:**
1. ✅ Modelo de impresora
2. ✅ Versión de Windows
3. ✅ Captura de pantalla del error
4. ✅ Si QZ Tray está en bandeja del sistema (💎)

---

## 📋 Checklist Rápida

Al finalizar la instalación, verificar:

- [ ] QZ Tray instalado
- [ ] Icono 💎 visible en bandeja del sistema
- [ ] https://localhost:8182/ funciona
- [ ] Impresora aparece en Windows
- [ ] Impresión de prueba de Windows OK
- [ ] AxiomaWeb conecta a QZ Tray (🟢)
- [ ] Impresora seleccionada en AxiomaWeb
- [ ] Configuración guardada
- [ ] Venta de prueba imprime correctamente

Si todos tienen ✅ → **¡Configuración completada exitosamente!** 🎉

---

## 🎓 Consejos Adicionales

### 💡 Tip 1: Mantener QZ Tray actualizado

Cada 3-6 meses:
1. Ir a https://qz.io/download/
2. Verificar si hay nueva versión
3. Descargar e instalar si corresponde

### 💡 Tip 2: Backup de configuración

AxiomaWeb guarda automáticamente tu configuración de impresora.
Si cambias de PC:
1. Solo instalar QZ Tray
2. Ingresar a AxiomaWeb
3. La configuración se mantiene

### 💡 Tip 3: Papel térmico

- Usar papel térmico de calidad
- Ancho estándar: 80mm
- Tener rollos de repuesto
- El papel térmico se borra con calor/luz, guardar tickets importantes escaneados

### 💡 Tip 4: Múltiples impresoras

Si tienes más de una impresora térmica:
1. En AxiomaWeb puedes cambiar entre ellas
2. Ir a Configuración → Impresión
3. Seleccionar otra impresora
4. Guardar

---

**Fecha:** Enero 2025
**Versión:** 1.0
**Software:** QZ Tray 2.2.x + AxiomaWeb
