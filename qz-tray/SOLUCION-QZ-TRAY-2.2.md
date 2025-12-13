# 🔧 Solución para QZ Tray 2.2.5 - Popup Persistente

## 📋 Problema

En QZ Tray 2.2.5, el popup de "Allow/Block" aparece **cada vez** que intentas conectar, incluso después de autorizar el sitio.

## ✅ Causa Root

El problema es que el hash del certificado en `allowed.dat` coincide, pero **QZ Tray 2.2+ requiere que CADA mensaje esté firmado correctamente** con la clave privada.

Si la firma falla o el formato no es correcto, QZ Tray pide autorización nuevamente.

## 🔍 Tu Situación Actual

Según tu archivo `allowed.dat`:
```
fab88e538fad0da351a6d3019af3b78e86ed200a    axiomaweb.axiomacloud.com
```

✅ El certificado está autorizado
❌ Pero la firma de mensajes está fallando

## 🛠️ Soluciones

### Solución 1: Limpiar y Re-autorizar (Recomendado)

1. **Limpiar autorizaciones antiguas:**
   ```
   limpiar-autorizaciones-windows.bat
   ```

2. **Abrir QZ Tray** (debe iniciar limpio)

3. **Abrir la página de test:**
   ```
   qz-tray\verificar-certificado.html
   ```

4. **Click en "Test Conexión"**

5. **Cuando aparezca el popup:**
   - ✅ Verificar que muestre:
     - **Common Name**: `axiomaweb.axiomacloud.com`
     - **SAN**: `localhost, 127.0.0.1`
     - **Valid Until**: `2026-12-13`

   - ✅ **Marcar "Remember this decision"**
   - ✅ Click en **"Allow"**

6. **Refrescar y probar nuevamente** - El popup NO debe aparecer

### Solución 2: Verificar Logs de QZ Tray

Si la Solución 1 no funciona, ver logs:

1. **Cerrar QZ Tray** completamente (Exit)

2. **Abrir CMD como Administrador**

3. **Ejecutar:**
   ```cmd
   cd "C:\Program Files\QZ Tray"
   java -jar qz-tray.jar
   ```

4. **Ver salida en consola** cuando intentas conectar

5. **Buscar:**
   - `Signature verification failed` → Problema con la firma
   - `Certificate not trusted` → Problema con autorización
   - `Invalid message` → Problema con formato de mensaje

### Solución 3: Usar Trusted Origins (QZ Tray 2.2+) ⭐ RECOMENDADO

QZ Tray 2.2+ introdujo un nuevo método más simple:

1. **Cerrar QZ Tray**

2. **Ir a la carpeta de configuración de QZ Tray:**
   - **Opción A:** `C:\Users\[TuUsuario]\AppData\Roaming\qz\`
   - **Opción B:** `C:\Users\[TuUsuario]\.qz\`

   ⚠️ La ubicación varía según la versión de QZ Tray. Busca donde está `allowed.dat`

3. **Crear archivo:** `qz-tray.properties`

4. **Agregar:**
   ```properties
   trusted.origins=https://axiomaweb.axiomacloud.com,http://localhost:5173
   ```

5. **Guardar y reiniciar QZ Tray**

6. **Probar** - Debe funcionar sin popup

### Solución 4: Deshabilitar Firma (Solo para Desarrollo)

⚠️ **SOLO PARA DESARROLLO LOCAL**

1. **Ir a la carpeta de configuración:**
   - `C:\Users\[TuUsuario]\AppData\Roaming\qz\qz-tray.properties`
   - o `C:\Users\[TuUsuario]\.qz\qz-tray.properties`

2. **Agregar:**
   ```properties
   security.signatures.disable=true
   ```

3. **Reiniciar QZ Tray**

**IMPORTANTE:** Esto deshabilita la seguridad. NO usar en producción.

## 🧪 Test de Diagnóstico

Abre la consola del navegador cuando ejecutes `verificar-certificado.html` y busca:

✅ **Si ves:**
```
📜 QZ Tray solicitó el certificado
✍️ QZ Tray solicitó firma para el mensaje
🔑 Iniciando firma del mensaje...
✅ Firma generada
✅ Mensaje firmado correctamente
✅ ¡CONECTADO EXITOSAMENTE!
```
→ La firma funciona, el problema es la autorización

❌ **Si ves:**
```
❌ Error firmando: ...
```
→ Problema con la librería de firma (jsrsasign)

## 🔑 Verificar Firma Manualmente

Puedes verificar que la firma esté funcionando:

1. Abrir `verificar-certificado.html`
2. Click en **"✍️ Test Firma"**
3. Debe mostrar: `✅ Firma generada: ...`

Si falla aquí, el problema es con jsrsasign o la clave privada.

## 📝 Notas Importantes

### QZ Tray 2.2+ Cambios:

1. **Ya no usa** `override.crt` de la misma forma
2. **Requiere firma** en cada mensaje (no solo en conexión)
3. **Usa** `allowed.dat` para guardar certificados autorizados
4. **Soporta** `trusted.origins` para bypass de seguridad

### Debugging:

- Los logs de QZ Tray son la mejor fuente de información
- Si la firma funciona en el test HTML pero no en tu app, el problema es la implementación en el frontend
- Si ni siquiera funciona en el test HTML, el problema es el certificado o la clave privada

## 📂 Ubicación de Archivos de QZ Tray

QZ Tray guarda sus configuraciones en una de estas ubicaciones:

- **Windows (común):** `C:\Users\[TuUsuario]\AppData\Roaming\qz\`
- **Windows (alternativa):** `C:\Users\[TuUsuario]\.qz\`

Busca donde existe el archivo `allowed.dat` para saber cuál es la correcta en tu sistema.

## 🆘 Si Nada Funciona

1. **Desinstalar QZ Tray** completamente
2. **Eliminar carpeta:** `C:\Users\[TuUsuario]\AppData\Roaming\qz\` o `C:\Users\[TuUsuario]\.qz\`
3. **Reinstalar QZ Tray**
4. **Usar Solución 3** (trusted.origins)
5. **Probar**

---

**Última actualización:** 2025-12-13
**Versión QZ Tray probada:** 2.2.5
