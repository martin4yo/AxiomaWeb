# 🔐 Configurar Certificado Override en QZ Tray

**Solución al popup "Allow/Block" persistente**

---

## 📋 Método Correcto: override.crt

QZ Tray permite confiar en un certificado personalizado usando el archivo `override.crt`. Este archivo le indica a QZ Tray que confíe en certificados firmados con tu clave privada.

---

## ✅ Solución para Windows

### Paso 1: Crear el archivo override.crt

1. **Abrir Notepad** (Bloc de notas)

2. **Copiar y pegar** el siguiente certificado:

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

3. **Guardar como:**
   - Nombre: `override.crt`
   - Tipo: **Todos los archivos (*.*)**
   - Ubicación: `C:\Program Files\QZ Tray\`

   **⚠️ IMPORTANTE:**
   - Debe guardarse como `override.crt` (NO `override.crt.txt`)
   - En "Tipo" selecciona "Todos los archivos", no "Documento de texto"

### Paso 2: Reiniciar QZ Tray

1. **Click derecho** en el ícono de QZ Tray (bandeja del sistema)
2. Click en **"Exit"**
3. **Abrir QZ Tray** de nuevo desde el menú Inicio

### Paso 3: Verificar

1. Ir a **AxiomaWeb** → **Configuración** → **General** → **Impresión Térmica**
2. Click en **"Conectar"**
3. ✅ **Debería conectar SIN mostrar el popup**

---

## ✅ Solución para Linux

### Ubicación del archivo

En Linux, QZ Tray busca el archivo en:

```bash
~/.qz/override.crt
```

### Pasos

```bash
# Crear el directorio si no existe
mkdir -p ~/.qz

# Crear el archivo override.crt
nano ~/.qz/override.crt
```

Pegar el certificado (el mismo de arriba), guardar (Ctrl+O, Enter, Ctrl+X).

Reiniciar QZ Tray:
```bash
pkill -f qz-tray
qz-tray
```

---

## ✅ Solución para macOS

### Ubicación del archivo

```bash
~/Library/Application Support/QZ Tray/override.crt
```

### Pasos

```bash
# Ir al directorio
cd ~/Library/Application\ Support/QZ\ Tray/

# Crear el archivo
nano override.crt
```

Pegar el certificado, guardar y reiniciar QZ Tray desde el dock.

---

## 🧪 Verificación

### Consola del navegador debe mostrar:

```
📦 Cargando módulo qz-tray...
✅ Módulo qz-tray cargado
🔐 Mensaje firmado correctamente con RSA-SHA256
🔌 Intentando conectar a QZ Tray...
✅ QZ Tray conectado exitosamente
```

### Sin popup:

✅ No aparece "Action Required"
✅ No aparece "Untrusted website"
✅ No aparece "Invalid Signature"

---

## 🔍 Troubleshooting

### El archivo override.crt no existe en la carpeta

**Solución:** Crearlo manualmente siguiendo los pasos de arriba.

### "Acceso denegado" al guardar en C:\Program Files\QZ Tray\

**Solución:**

1. Guardar el archivo en el Escritorio primero
2. **Click derecho** en el archivo → **Copiar**
3. Ir a `C:\Program Files\QZ Tray\`
4. **Click derecho** → **Pegar**
5. Aceptar permisos de administrador

### El popup sigue apareciendo después de crear override.crt

1. ✅ Verificar que el archivo se llama exactamente `override.crt` (no `override.crt.txt`)
2. ✅ Verificar que está en la ubicación correcta (`C:\Program Files\QZ Tray\`)
3. ✅ Verificar que el contenido tiene `-----BEGIN CERTIFICATE-----` y `-----END CERTIFICATE-----`
4. ✅ Reiniciar QZ Tray completamente (Exit y volver a abrir)
5. ✅ Limpiar caché del navegador (Ctrl+Shift+Delete)

### ¿Cómo verifico que el archivo está en la ubicación correcta?

**Windows:**
1. Abrir Explorador de archivos
2. Pegar en la barra de dirección: `C:\Program Files\QZ Tray\`
3. Deberías ver el archivo `override.crt`
4. Verificar que NO se llama `override.crt.txt` (activar "Extensiones de nombre de archivo" en Vista)

---

## 📖 Método Alternativo: qz-tray.properties

Si el método de `override.crt` no funciona, puedes usar el archivo de propiedades:

### Windows

1. Ubicar: `C:\Users\[TuUsuario]\.qz\qz-tray.properties`
2. Abrir con Notepad
3. Agregar al final:
   ```
   authcert.override=C:\\Program Files\\QZ Tray\\override.crt
   ```
4. Guardar y reiniciar QZ Tray

### Linux/macOS

1. Ubicar: `~/.qz/qz-tray.properties`
2. Agregar:
   ```
   authcert.override=~/.qz/override.crt
   ```
3. Guardar y reiniciar QZ Tray

---

## 💡 Datos Importantes

1. **El archivo override.crt debe existir antes de iniciar QZ Tray**
   - Si QZ Tray ya está corriendo cuando creas el archivo, reinícialo

2. **El certificado es válido por 365 días**
   - Fecha de expiración: 2026-12-12
   - Después de esa fecha, generar un nuevo certificado y actualizar override.crt

3. **Cada PC necesita su propio override.crt**
   - En un entorno multiusuario, cada PC debe tener el archivo
   - Puede automatizarse con un script de instalación

4. **No confundir con Site Manager**
   - Site Manager es para gestionar certificados de sitios específicos
   - override.crt es para confiar en tu propio certificado como CA

---

## 📚 Referencias

- **QZ Tray Signing Docs:** https://qz.io/docs/signing
- **QZ Tray Certificate Override:** https://qz.io/docs/provisioning
- **GitHub Wiki:** https://github.com/qzind/tray/wiki/Signing

---

**Última actualización:** 2025-12-13
