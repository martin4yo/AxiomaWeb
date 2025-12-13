# 🔍 Diagnóstico: Override.crt no funciona

## Problema
El popup de QZ Tray sigue apareciendo a pesar de tener override.crt instalado.

## Checklist de Verificación

### 1. Verificar que el archivo existe
```cmd
dir "C:\Program Files\QZ Tray\override.crt"
```

**Debe mostrar:**
- Tamaño: ~1,300 bytes (aprox)
- Nombre exacto: `override.crt` (NO `override.crt.txt`)

### 2. Verificar contenido del archivo

Abrir con Notepad++ o un editor que muestre caracteres ocultos:

```
C:\Program Files\QZ Tray\override.crt
```

**Debe:**
- Empezar con `-----BEGIN CERTIFICATE-----`
- Terminar con `-----END CERTIFICATE-----`
- NO tener espacios al inicio de las líneas
- NO tener líneas vacías extra

### 3. Verificar que QZ Tray lo está leyendo

**Ver logs de QZ Tray:**

1. Cerrar QZ Tray completamente (Exit)
2. Abrir CMD como Administrador
3. Ejecutar:
   ```cmd
   cd "C:\Program Files\QZ Tray"
   java -jar qz-tray.jar --honorautostart
   ```

**Buscar en la salida:**
- `Found override` o `Loading override` → ✅ Bueno
- `override.crt not found` → ❌ No lo está leyendo

### 4. Problema Común: Formato de Líneas

Windows usa CRLF (`\r\n`) y QZ Tray puede esperar LF (`\n`).

**Solución:** Recrear el archivo con formato correcto.

## Soluciones Alternativas

### Opción A: Usar Digital-Certificate.txt

Algunos usuarios reportan que QZ Tray busca `digital-certificate.txt` en lugar de `override.crt`.

1. Copiar `override.crt` como `digital-certificate.txt`
2. Reiniciar QZ Tray

### Opción B: Usar authcert.override en Properties

1. Ir a: `C:\Users\[TuUsuario]\.qz\`
2. Crear/editar `qz-tray.properties`
3. Agregar:
   ```
   authcert.override=C:\\Program Files\\QZ Tray\\override.crt
   ```
4. Reiniciar QZ Tray

### Opción C: Whitelist del Sitio

Si override.crt no funciona, podemos usar el método de whitelist:

1. Abrir QZ Tray → Advanced → Site Manager
2. Click en "Add"
3. Agregar:
   - From origin: `https://axiomaweb.axiomacloud.com`
   - Certificate fingerprint: `(dejar en blanco para confiar en cualquiera)`
   - Allow: ✓

## Verificar Versión de QZ Tray

Algunas versiones antiguas no soportan override.crt.

**Verificar versión:**
1. Click en ícono de QZ Tray
2. Debe ser >= 2.1.0

**Actualizar si es necesario:**
https://qz.io/download/

## Debug: Certificado Inválido

Si QZ Tray dice "Invalid certificate" es porque:

1. **La firma no coincide:** El certificado en override.crt NO es el mismo que usa el código
2. **Certificado expirado:** Verificar fecha (debe ser válido hasta 2026-12-13)
3. **Algoritmo incorrecto:** Debe ser RSA-SHA256

## Última Opción: Reinstalar QZ Tray

Si nada funciona:

1. Desinstalar QZ Tray completamente
2. Eliminar carpeta `C:\Users\[TuUsuario]\.qz\`
3. Reinstalar QZ Tray
4. Ejecutar `instalar-override-windows.bat` ANTES de abrir QZ Tray por primera vez
5. Abrir QZ Tray

---

**Después de cada cambio, SIEMPRE:**
1. Cerrar QZ Tray (Exit)
2. Volver a abrir QZ Tray
3. Probar la conexión
