# Crear CRX Manualmente desde Chrome

Chrome removió el comando `--pack-extension` en versiones recientes. Hay que usar la interfaz gráfica.

## Pasos

### 1. Abrir Chrome Extensions

```
chrome://extensions/
```

### 2. Activar Modo Desarrollador

- Activar el switch "Modo de desarrollador" (arriba derecha)

### 3. Empaquetar Extensión

- Click en "Empaquetar extensión"

### 4. Seleccionar Directorio

**Primera vez (sin clave privada):**
```
Directorio raíz de la extensión: D:\Desarrollos\React\AxiomaWeb\print-extension
Archivo de clave privada: (dejar vacío)
```

Click en "Empaquetar extensión"

**Actualizaciones (con clave privada existente):**
```
Directorio raíz de la extensión: D:\Desarrollos\React\AxiomaWeb\print-extension
Archivo de clave privada: D:\ruta\a\print-extension.pem
```

### 5. Resultado

Chrome generará 2 archivos en la **carpeta padre** (AxiomaWeb/):

```
AxiomaWeb/
├── print-extension.crx  ← Extensión empaquetada
├── print-extension.pem  ← Clave privada (GUARDAR!)
└── print-extension/     ← Código fuente
```

### 6. Mover Archivos (Opcional)

Mover a la carpeta dist para organizar:

```powershell
# En PowerShell
cd D:\Desarrollos\React\AxiomaWeb
mkdir print-extension\dist -ErrorAction SilentlyContinue
move print-extension.crx print-extension\dist\
move print-extension.pem print-extension\dist\
```

## ⚠️ IMPORTANTE

**Guarda el archivo .pem en un lugar SEGURO**

Si lo pierdes:
- ❌ No podrás actualizar la extensión
- ❌ Los usuarios tendrán que desinstalar y reinstalar
- ❌ Se perderá la configuración guardada

**Recomendación**: Hacer backup del .pem en:
- Git (repositorio privado)
- Dropbox/Google Drive (carpeta privada)
- USB/disco externo
- Password manager (como archivo adjunto)

## Distribución

Una vez que tengas el .crx:

### Opción A: Descarga directa
```
1. Subir print-extension.crx a tu servidor web
2. Usuarios descargan y arrastran a chrome://extensions/
```

### Opción B: GitHub Releases
```
1. Ir a https://github.com/martin4yo/AxiomaWeb/releases/new
2. Tag: extension-v1.0.0
3. Adjuntar print-extension.crx
4. Publish release
```

### Opción C: Red local
```
Copiar el archivo .crx via:
- USB
- Red compartida
- Email
```

## Instalación del Usuario

```
1. Descargar print-extension.crx
2. Chrome mostrará advertencia "puede ser peligroso"
3. Click en "Conservar"
4. Ir a chrome://extensions/
5. Arrastrar el .crx a la ventana
6. Click en "Agregar extensión"
```

## Actualizar Extensión

```
1. Incrementar versión en manifest.json:
   "version": "1.0.1"  // era 1.0.0

2. Empaquetar de nuevo CON LA MISMA CLAVE:
   - Directorio: print-extension/
   - Clave privada: print-extension.pem (la que guardaste)

3. Distribuir nuevo .crx
```

**⚠️ Los usuarios deben:**
- Desinstalar versión anterior
- Instalar nuevo .crx

(No hay actualización automática sin Chrome Web Store)

## Alternativa: Modo Desarrollador

Si el .crx da problemas, usar modo desarrollador:

```
1. chrome://extensions/
2. Activar "Modo de desarrollador"
3. "Cargar extensión sin empaquetar"
4. Seleccionar carpeta print-extension/
```

**Desventaja**: Advertencia en cada inicio de Chrome
