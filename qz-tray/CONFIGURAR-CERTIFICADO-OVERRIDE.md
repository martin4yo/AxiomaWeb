# 🔐 Configurar Certificado Override en QZ Tray

**Solución al popup "Allow/Block" persistente**

---

## 📋 Método Correcto: override.crt

QZ Tray permite confiar en un certificado personalizado usando el archivo `override.crt`. Este archivo le indica a QZ Tray que confíe en certificados firmados con tu clave privada.

---

## ✅ Solución para Windows

### Opción A: Script Automático (Recomendado)

1. **Click derecho** en `instalar-override-windows.bat`
2. Seleccionar **"Ejecutar como administrador"**
3. Seguir las instrucciones en pantalla
4. Reiniciar QZ Tray

### Opción B: Manual

#### Paso 1: Crear el archivo override.crt

1. **Abrir Notepad** (Bloc de notas)

2. **Copiar y pegar** el siguiente certificado:

```
-----BEGIN CERTIFICATE-----
MIIEGzCCAwOgAwIBAgIUZwr8GY39yP7jUDm2SbH0v1sUTdUwDQYJKoZIhvcNAQEL
BQAwgZcxCzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNV
BAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlh
eGlvbWF3ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBh
eGlvbWF3ZWIuY29tMB4XDTI1MTIxMzEyNTkwOFoXDTI2MTIxMzEyNTkwOFowgZcx
CzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1
ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlheGlvbWF3
ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3
ZWIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoMYYJ31BHwyp
3+djbC+1/3NkpJFurUwo8mme13vrMhbxKWmcbPcU9FPVWVMtqnJuQjie/ytri5ZV
HiV6h10kWA73EtzRUSgZSNoCUBwQlM2az+6s9/CY7ZG5LvKM+n0TkoQS6t8iiG4p
K31W2/i9NWf1McVQ9LE5ntx0WJlHA8dVRkejZaXDNcQOpb5flrW+8LN2WLQXrKev
BwX48nJaxJ8XNsymczVR5hcJ7WcNyunk3/gzOvzTEwEFGxNEmwsi6xfkmAxsTf7A
0R0OL3Pb/Rr7OoWfCwfcz1kwXCdML+M4DnU/JJaoitXbfGL0lIFjacZC+vxCAO0F
2/nFvCHKzQIDAQABo10wWzA6BgNVHREEMzAxghlheGlvbWF3ZWIuYXhpb21hY2xv
dWQuY29tgglsb2NhbGhvc3SCCTEyNy4wLjAuMTAdBgNVHQ4EFgQUPUqpS0kRV/gB
g2F9iOEDeqD+ttgwDQYJKoZIhvcNAQELBQADggEBAJ4sPwTIyNZJzgUq5zfbafca
qi95ikjGJO8W+H1D66LnAFhzBynrl+MTH9u7pBfYXzcttdfy3vYFOCu0g+PwcGFf
DV9xPE1VkSo5in5DIfu7+/OPQk9uywOKglGORNBcm3tmjLsy0IeSWd+JA3vTYQ3Y
unGisCiWLEBfrDuG+5e92vfgq96NYbSdnAScekVffwROa6Fd24V23YG2J5uNp/Rf
rIoaH/FnMlFGVveCD2gblEUfqXgl/TCxBxXHNt3biNJIiD+m9TMH0JUuR0cioLyz
880/n9i13ehxWsOcL+tR32kdGmgiQxOSgojqZAv4yk1xlK3h3W7CdkTyw6scYzI=
-----END CERTIFICATE-----
```

**Nota:** Este certificado incluye SAN (Subject Alternative Names) para múltiples dominios:
- ✓ axiomaweb.axiomacloud.com
- ✓ localhost
- ✓ 127.0.0.1

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

### Opción A: Script Automático (Recomendado)

```bash
./instalar-override-linux.sh
```

### Opción B: Manual

#### Ubicación del archivo

En Linux, QZ Tray busca el archivo en:

```bash
~/.qz/override.crt
```

#### Pasos

```bash
# Crear el directorio si no existe
mkdir -p ~/.qz

# Crear el archivo override.crt
nano ~/.qz/override.crt
```

Pegar el certificado (el mismo de arriba con SAN), guardar (Ctrl+O, Enter, Ctrl+X).

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
   - Fecha de expiración: 2026-12-13
   - Después de esa fecha, generar un nuevo certificado y actualizar override.crt

3. **Certificado con SAN (Subject Alternative Names)**
   - Funciona para múltiples dominios: axiomaweb.axiomacloud.com, localhost, 127.0.0.1
   - No necesitas certificados diferentes para desarrollo y producción
   - Un solo certificado para todos los entornos

4. **Cada PC necesita su propio override.crt**
   - En un entorno multiusuario, cada PC debe tener el archivo
   - Puede automatizarse con el script de instalación (`instalar-override-windows.bat` o `instalar-override-linux.sh`)

5. **No confundir con Site Manager**
   - Site Manager es para gestionar certificados de sitios específicos
   - override.crt es para confiar en tu propio certificado como CA

## 🔧 Regenerar Certificados (Opcional)

Si necesitas generar nuevos certificados (por ejemplo, para agregar más dominios):

**Solo en Linux/macOS** (donde está el repositorio):

```bash
cd qz-tray
./generar-certificados.sh
```

El script genera certificados con SAN para múltiples dominios. Los certificados generados se copian automáticamente al código y al script de instalación de Windows.

---

## 📚 Referencias

- **QZ Tray Signing Docs:** https://qz.io/docs/signing
- **QZ Tray Certificate Override:** https://qz.io/docs/provisioning
- **GitHub Wiki:** https://github.com/qzind/tray/wiki/Signing

---

**Última actualización:** 2025-12-13
