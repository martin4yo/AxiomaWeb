# 🔧 Solución al Popup "Allow/Block" Persistente de QZ Tray

**Problema:** El popup "Action Required - localhost wants to connect to QZ Tray" aparece en cada recarga de página, incluso después de implementar firma RSA-SHA256 válida.

**Causa:** QZ Tray necesita que el sitio sea agregado manualmente a la lista de "Saved Sites" (Sitios Guardados) para recordar la aprobación.

---

## ✅ Solución: Agregar el Sitio a QZ Tray Manualmente

### Paso 1: Abrir la Interfaz de QZ Tray

1. **Hacer clic derecho** en el ícono de QZ Tray en la bandeja del sistema (system tray)
2. Seleccionar **"Advanced"** → **"Site Manager..."**

   ![QZ Tray Menu](https://qz.io/wiki/images/tray-menu.png)

### Paso 2: Agregar el Sitio a "Saved Sites"

En la ventana "Site Manager":

1. Click en el botón **"Add..."** (Agregar)

2. Completar los campos:

   **Para Desarrollo Local (localhost:8088):**
   ```
   Site Name: AxiomaWeb Local
   From Sites: http://localhost:8088
   Certificate: [Pegar el certificado completo]
   ```

   **Para Producción (axiomaweb.axiomacloud.com):**
   ```
   Site Name: AxiomaWeb Producción
   From Sites: https://axiomaweb.axiomacloud.com
   Certificate: [Pegar el certificado completo]
   ```

3. **Certificado a pegar** (el mismo que usamos en el código):

   ```
   -----BEGIN CERTIFICATE-----
   MIIDlzCCAn8CFBhtuBBgopAogeDBUpGi7KbAEFPaMA0GCSqGSIb3DQEBCwUAMIGH
   MQswCQYDVQQGEwJBUjEVMBMGA1UECAwMQnVlbm9zIEFpcmVzMRUwEwYDVQQHDAxC
   dWVub3MgQWlyZXMxEjAQBgNVBAoMCUF4aW9tYVdlYjESMBAGA1UEAwwJbG9jYWxo
   b3N0MSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3ZWIuY29tMB4XDTI1MTIx
   MjE2MDIyOVoXDTI2MTIxMjE2MDIyOVowgYcxCzAJBgNVBAYTAkFSMRUwEwYDVQQI
   DAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJ
   QXhpb21hV2ViMRIwEAYDVQQDDAlsb2NhbGhvc3QxIjAgBgkqhkiG9w0BCQEWE2Fk
   bWluQGF4aW9tYXdlYi5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
   AQDHUdSdIxld95sdpYWDk4Owl7nRnUGcGG3LYjgjz+EXcBFkMnXSBH3i1sZ+cMnO
   UTB9bHvNthtQ3I3VZglZn27VvAMvGPtOGVxW7tW2rWueWc9NQOvm3HJMW/c/6GeP
   zojWGs59vowK3/TVlcIYdk6mPhJXBOgHg234oM8rjQsgdxBg7e6PzOafBMxCV0y4
   0APPiJaE78iOIthLXcZ94ppMz2FbZkUEHQCXjzDXAYf97kf4xyvx1EFSF/9RKbE7
   CxxSSc7EfongQgN6qeLp4xjC68Jhrv/V2Sw+9uoptRRg9ubXoU33fqEHaxAhF8iw
   w1NWphf6LlXVMkVp0HUnPlVvAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABT2opbU
   AvPcSbs7MBipxwK3sh539A5yLBAmorcswLZfy9IF/7gz2YT5R1gx9laEcI1rTVey
   8yWeq/jsKQ7/vXZZDJ/kCQYE4gzmDHaJWuM7kO6N5ohOdhlFih+elZlIY3qu56Eh
   o1RN/5IspgoxXrTaCb097r6fo4Zz1cFPLDdq4mJYv/bDzSw0hwaVQhbU90hpwJad
   YNx2i3C7BqW/AttYiWjIfnuPNIgI/fxhoUOJIKVJXh31kJxLtrbaY6Wi3wbXWcqe
   EueDS2POuRVtNcBlybJeMbycFOntNNVCeypRDyBfOdQtC1J17nbzNaWiz8ju6x7c
   lyImJCbNWzCGP5c=
   -----END CERTIFICATE-----
   ```

4. Click en **"Allow"** (Permitir)

5. ✅ Click en **"Save"** (Guardar)

### Paso 3: Verificar que el Sitio Quedó Guardado

En "Site Manager", deberías ver tu sitio listado:

```
✅ AxiomaWeb Local (http://localhost:8088)
   Status: Allowed
   Certificate: Present
```

---

## 🎯 Método Alternativo: Aprobar en el Primer Popup

Si prefieres no usar Site Manager:

1. Cuando aparezca el popup "Action Required"
2. **Marcar la casilla** "Remember this decision" (si está disponible)
3. Click en **"Allow"**
4. El popup **NO debería** aparecer de nuevo

**Nota:** Algunas versiones de QZ Tray no muestran la casilla "Remember", por eso el método de Site Manager es más confiable.

---

## 🧪 Probar la Solución

1. **Cerrar** completamente el navegador (todas las pestañas)
2. **Abrir** AxiomaWeb de nuevo
3. Ir a **Configuración → General → Impresión Térmica**
4. Click en **"Conectar"**
5. ✅ **Debería conectar SIN mostrar el popup**

**Mensajes esperados en consola:**
```
📦 Cargando módulo qz-tray...
✅ Módulo qz-tray cargado
🔐 Mensaje firmado correctamente con RSA-SHA256
🔌 Intentando conectar a QZ Tray...
✅ QZ Tray conectado exitosamente
```

---

## 📋 Checklist de Verificación

- [ ] QZ Tray está ejecutándose (ícono blanco en bandeja del sistema)
- [ ] Sitio agregado a "Saved Sites" en QZ Tray
- [ ] Certificado pegado completo (incluye BEGIN/END CERTIFICATE)
- [ ] URL del sitio coincide exactamente con la que usa el navegador
- [ ] Navegador cerrado y reabierto después de configurar
- [ ] Consola muestra "🔐 Mensaje firmado correctamente"
- [ ] Popup NO aparece en recarga de página

---

## 🔍 Troubleshooting

### El popup sigue apareciendo después de agregar a "Saved Sites"

1. **Verificar la URL exacta:**
   - Desarrollo: `http://localhost:8088` (NO https, NO :8182)
   - Producción: `https://axiomaweb.axiomacloud.com`

2. **Verificar el certificado:**
   - Debe estar completo con `-----BEGIN CERTIFICATE-----` y `-----END CERTIFICATE-----`
   - Sin espacios extra al inicio o final
   - Todas las líneas incluidas

3. **Reiniciar QZ Tray:**
   - Click derecho en el ícono → **"Exit"**
   - Volver a abrir QZ Tray
   - Probar de nuevo

### "Invalid Signature" persiste

Esto ya está resuelto si la consola muestra "🔐 Mensaje firmado correctamente con RSA-SHA256".

Si el mensaje NO aparece:
1. Verificar que la última versión del frontend está deployada
2. Limpiar caché del navegador (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+Shift+R)

---

## 📖 Referencias

- **QZ Tray Site Manager:** https://qz.io/wiki/site-manager
- **QZ Tray Certificate Security:** https://qz.io/wiki/certificate-security
- **Documentación oficial:** https://qz.io/wiki/

---

## 💡 Notas Importantes

1. **Cada PC necesita configuración individual:**
   - QZ Tray se instala y configura en cada PC
   - La lista de "Saved Sites" es local (no se sincroniza)
   - Repetir estos pasos en cada puesto de trabajo

2. **El certificado es válido por 365 días:**
   - Fecha de expiración: 2026-12-12
   - Después de esa fecha, generar un nuevo certificado

3. **No es un problema de código:**
   - La firma RSA funciona correctamente ✅
   - Es solo una configuración de QZ Tray que debe hacerse una vez

---

**Última actualización:** 2025-12-13
