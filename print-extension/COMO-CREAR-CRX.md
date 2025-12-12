# ¿Cómo Crear el Archivo CRX?

Resumen rápido de los métodos disponibles para empaquetar la extensión.

---

## ⚡ Método Rápido: Manual desde Chrome

**El más simple, sin instalar nada**

### Pasos:

1. **Abrir Chrome Extensions**
   ```
   chrome://extensions/
   ```

2. **Activar "Modo de desarrollador"** (switch arriba derecha)

3. **Click en "Empaquetar extensión"**

4. **Completar campos:**
   - Directorio: `D:\Desarrollos\React\AxiomaWeb\print-extension`
   - Clave privada: (dejar vacío la primera vez)

5. **Los archivos se crean en la carpeta padre:**
   ```
   AxiomaWeb/
   ├── print-extension.crx  ← Distribuir este
   ├── print-extension.pem  ← GUARDAR SEGURO
   └── print-extension/
   ```

6. **Opcional: Mover a dist/**
   ```powershell
   cd D:\Desarrollos\React\AxiomaWeb
   mkdir print-extension\dist -ErrorAction SilentlyContinue
   move print-extension.crx print-extension\dist\
   move print-extension.pem print-extension\dist\
   ```

✅ **Listo!** Ya tenés el .crx para distribuir

📖 **Guía detallada**: [CREAR-CRX-MANUAL.md](./CREAR-CRX-MANUAL.md)

---

## 🤖 Método Automático: PowerShell

**Requiere Node.js, pero es automático**

### Comando:

```powershell
cd print-extension
powershell -ExecutionPolicy Bypass -File crear-crx-auto.ps1
```

### Qué hace:
1. Verifica Node.js
2. Instala `crx3` (si no está)
3. Empaqueta extensión
4. Guarda en `dist/axioma-print-manager.crx`
5. Guarda clave en `dist/axioma-print-manager.pem`

✅ **Ventaja**: Todo automático, se ejecuta desde CLI

---

## 🔧 Método Viejo: crear-crx.bat

**YA NO FUNCIONA** (Chrome removió `--pack-extension`)

Si ejecutás `crear-crx.bat`, te mostrará las alternativas.

---

## ⚠️ IMPORTANTE: Guardar la Clave Privada (.pem)

El archivo `.pem` es **CRÍTICO** para actualizaciones futuras.

### Si lo pierdes:
- ❌ No podrás actualizar la extensión
- ❌ Los usuarios tendrán que desinstalar y reinstalar
- ❌ Se perderá su configuración

### Dónde guardarlo:
- ✅ Repositorio Git privado
- ✅ Google Drive / Dropbox (carpeta privada)
- ✅ Password manager (1Password, Bitwarden, etc.)
- ✅ USB / disco externo con backup

**NO** commitear el .pem al repositorio público de GitHub.

---

## 📦 Distribución del CRX

Una vez que tengas el .crx:

### Opción 1: GitHub Releases
```
1. Ir a https://github.com/martin4yo/AxiomaWeb/releases/new
2. Tag: extension-v1.0.0
3. Adjuntar print-extension.crx
4. Publish
```

### Opción 2: Servidor Web
```
Subir a: https://tusitio.com/downloads/axioma-print-manager.crx
Usuarios lo descargan y arrastran a chrome://extensions/
```

### Opción 3: Red Local
```
Copiar vía USB, email, carpeta compartida, etc.
```

---

## 🔄 Actualizar Extensión

```powershell
# 1. Incrementar versión
# Editar manifest.json:
"version": "1.0.1"  # era 1.0.0

# 2. Empaquetar CON LA MISMA CLAVE
chrome://extensions/ → Empaquetar extensión
- Directorio: print-extension/
- Clave: dist\axioma-print-manager.pem  ← USAR LA GUARDADA

# 3. Distribuir nuevo .crx
```

⚠️ **Los usuarios deben desinstalar la versión anterior e instalar la nueva**

(No hay actualización automática sin Chrome Web Store)

---

## 📚 Más Información

- **Guía manual detallada**: [CREAR-CRX-MANUAL.md](./CREAR-CRX-MANUAL.md)
- **Instalación sin Web Store**: [INSTALACION-SIN-WEBSTORE.md](./INSTALACION-SIN-WEBSTORE.md)
- **Publicar en Web Store**: [PUBLICAR-CHROME-WEBSTORE.md](./PUBLICAR-CHROME-WEBSTORE.md)
