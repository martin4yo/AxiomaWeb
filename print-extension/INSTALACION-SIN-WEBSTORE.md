# Instalación Sin Chrome Web Store

Guía para instalar la extensión Axioma Print Manager sin publicarla en Chrome Web Store.

---

## 🎯 Casos de Uso

Esta guía es útil si:
- ✅ Querés probar la extensión antes de publicar
- ✅ Solo necesitás la extensión internamente (empresa)
- ✅ No querés pagar los $5 de registro de Chrome Web Store
- ✅ Necesitás control total sobre las actualizaciones

---

## Opción 1: Archivo CRX (Recomendado)

**✅ Ventajas**: Fácil de distribuir, un solo archivo
**⚠️ Limitaciones**: Advertencia de "extensión no verificada", no se actualiza automáticamente

### Paso 1.1: Crear el Paquete CRX

**En la PC de desarrollo:**

```bash
cd print-extension
crear-crx.bat
```

Esto genera:
- `dist/axioma-print-manager.crx` - Extensión para distribuir
- `dist/axioma-print-manager.pem` - Clave privada (GUARDAR SEGURO)

**⚠️ IMPORTANTE**: Guarda el archivo `.pem` en un lugar seguro. Lo necesitarás para crear actualizaciones futuras.

### Paso 1.2: Distribuir el CRX

**Opción A: Descarga directa (HTTP/HTTPS)**
```bash
# Subir a tu servidor web
# Ejemplo: https://tusitio.com/downloads/axioma-print-manager.crx
```

**Opción B: Compartir archivo localmente**
```bash
# Red local, USB, email, etc.
# Simplemente copiar dist/axioma-print-manager.crx
```

**Opción C: GitHub Releases**
```bash
# Subir a GitHub Releases
# https://github.com/martin4yo/AxiomaWeb/releases/new
# Tag: extension-v1.0.0
# Adjuntar: axioma-print-manager.crx
```

### Paso 1.3: Instalación en PC del Usuario

**Método A: Arrastrar y Soltar (Más Fácil)**
```
1. Abrir Chrome
2. Ir a chrome://extensions/
3. Arrastrar el archivo .crx a la ventana
4. Click en "Agregar extensión"
```

**Método B: Desde Descarga**
```
1. Descargar el archivo .crx
2. Chrome mostrará advertencia "Puede ser peligroso"
3. Click en "Conservar"
4. Ir a chrome://extensions/
5. Arrastrar el .crx descargado
6. Click en "Agregar extensión"
```

### Paso 1.4: Advertencias Esperadas

Chrome mostrará:
```
⚠️ "Esta extensión no está en Chrome Web Store y puede haberse
   agregado sin tu conocimiento"
```

**Esto es normal** para extensiones no publicadas. Para evitarlo:
- Publicar en Chrome Web Store (Opción 3)
- O vivir con la advertencia

---

## Opción 2: Modo Desarrollador

**✅ Ventajas**: Gratis, actualizaciones en vivo editando archivos
**❌ Desventajas**: Advertencia en cada inicio de Chrome

### Paso 2.1: Preparar la Extensión

**Opción A: Clonar desde GitHub**
```bash
git clone https://github.com/martin4yo/AxiomaWeb.git
cd AxiomaWeb/print-extension
```

**Opción B: Descargar ZIP**
```
1. Ir a GitHub: https://github.com/martin4yo/AxiomaWeb
2. Code → Download ZIP
3. Descomprimir
4. Buscar carpeta print-extension/
```

### Paso 2.2: Cargar en Chrome

```
1. Abrir Chrome
2. Ir a chrome://extensions/
3. Activar "Modo de desarrollador" (switch arriba derecha)
4. Click en "Cargar extensión sin empaquetar"
5. Seleccionar carpeta print-extension/
6. La extensión quedará instalada
```

### Paso 2.3: Advertencia en Cada Inicio

Chrome mostrará al iniciar:
```
⚠️ "Desactivar extensiones en modo de desarrollador"
   [Cancelar]  [Desactivar extensiones]
```

**Solución**: Click en "Cancelar" cada vez que inicies Chrome

**⚠️ Nota**: Esta advertencia NO se puede eliminar sin publicar en Chrome Web Store

---

## Opción 3: Chrome Web Store Privado (Enterprise)

**Para empresas con Google Workspace**

Si tu empresa usa Google Workspace (antes G Suite), puedes:

1. **Crear Chrome Web Store privado**
   - Solo usuarios de tu dominio pueden ver/instalar
   - Sin revisión de Google
   - Actualizaciones automáticas
   - Sin advertencias

2. **Publicación Privada**
   ```
   1. Ir a Google Admin Console
   2. Devices → Chrome → Apps & extensions
   3. Users & browsers → Add app or extension
   4. Upload private app
   5. Seleccionar .zip de la extensión
   6. Asignar a usuarios/grupos
   ```

**💰 Costo**: Requiere Google Workspace (desde $6/usuario/mes)

---

## Opción 4: Group Policy (Dominio Windows)

**Para ambientes corporativos con Active Directory**

### Paso 4.1: Preparar Extensión

```bash
cd print-extension
crear-crx.bat
# Genera dist/axioma-print-manager.crx
```

### Paso 4.2: Hostear el CRX

Subir a servidor web accesible:
```
http://servidor-interno/extensions/axioma-print-manager.crx
```

O crear update manifest XML:
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='TU_EXTENSION_ID'>
    <updatecheck codebase='http://servidor/axioma-print-manager.crx' version='1.0.0' />
  </app>
</gupdate>
```

### Paso 4.3: Configurar GPO

**En Group Policy Management:**

```
1. Computer Configuration → Policies → Administrative Templates
2. Google → Google Chrome → Extensions
3. Configurar "Configure the list of force-installed apps and extensions"

   Valor:
   TU_EXTENSION_ID;http://servidor/axioma-print-manager.crx
```

**Obtener Extension ID:**
```
1. Instalar la extensión en modo desarrollador
2. chrome://extensions/
3. Copiar el ID (ej: abcdefghijklmnopqrstuvwxyz123456)
```

---

## Comparación de Métodos

| Método | Costo | Advertencias | Auto-Update | Dificultad |
|--------|-------|--------------|-------------|------------|
| **CRX Manual** | Gratis | ⚠️ Al instalar | ❌ No | ⭐ Fácil |
| **Modo Desarrollador** | Gratis | ⚠️ Cada inicio | ✅ Manual | ⭐ Fácil |
| **Chrome Web Store** | $5 único | ✅ Ninguna | ✅ Automático | ⭐⭐ Media |
| **Web Store Privado** | $6/usr/mes | ✅ Ninguna | ✅ Automático | ⭐⭐⭐ Difícil |
| **Group Policy** | Gratis* | ✅ Ninguna | ⚠️ Con setup | ⭐⭐⭐⭐ Muy difícil |

*Requiere infraestructura AD existente

---

## Actualizar la Extensión

### Para CRX Manual

```bash
# 1. Incrementar versión en manifest.json
"version": "1.0.1"  # Era 1.0.0

# 2. Crear nuevo CRX CON LA MISMA CLAVE
crear-crx.bat  # Usa la clave .pem guardada

# 3. Distribuir nuevo .crx
# Los usuarios deben:
#   - Desinstalar versión anterior
#   - Instalar nuevo .crx
```

### Para Modo Desarrollador

```bash
# 1. Editar archivos en la carpeta
# 2. Ir a chrome://extensions/
# 3. Click en botón "Actualizar" (icono de recarga)
```

### Para Chrome Web Store

```bash
# Ver: PUBLICAR-CHROME-WEBSTORE.md
# Las actualizaciones se distribuyen automáticamente
```

---

## Recomendación por Escenario

### 🏢 Empresa con 1-10 PCs
→ **Usar CRX Manual**
- Fácil de distribuir
- Sin costo
- Acepta la advertencia una vez

### 🏭 Empresa con 10-50 PCs
→ **Chrome Web Store Público** ($5)
- Actualización automática
- Sin advertencias
- Vale la pena el costo

### 🏛️ Empresa con 50+ PCs
→ **Chrome Web Store + Group Policy**
- Forzar instalación vía GPO
- Actualización automática
- Deploy masivo

### 🧪 Desarrollo/Testing
→ **Modo Desarrollador**
- Cambios en tiempo real
- No importa la advertencia
- Perfecto para desarrollo

---

## Problemas Comunes

### ❌ "Este tipo de archivo puede dañar tu equipo"

**Al descargar .crx**

Solución:
```
1. Click en "Conservar" o "Keep"
2. Es normal para archivos .crx no firmados
```

### ❌ "No se puede agregar desde este sitio web"

**Al arrastrar .crx**

Solución:
```
1. Descargar el .crx primero
2. Luego arrastrarlo desde la carpeta de descargas
```

### ❌ "El paquete no es válido: CRX_REQUIRED_PROOF_MISSING"

**En Chrome 75+**

Solución:
```
Usar uno de estos métodos:
1. Group Policy (forzar instalación)
2. Chrome Web Store
3. Modo desarrollador
```

### ❌ "Esta extensión puede haber sido dañada"

**Después de actualización de Chrome**

Solución:
```
1. Reinstalar la extensión
2. O publicar en Chrome Web Store
```

---

## Script de Instalación Automática

Para deployment masivo:

```batch
@echo off
REM instalar-extension.bat

echo Instalando Axioma Print Manager Extension...

REM Descargar CRX
powershell -Command "Invoke-WebRequest -Uri 'https://tusitio.com/axioma-print-manager.crx' -OutFile '%TEMP%\extension.crx'"

REM Abrir Chrome en extensiones
start chrome://extensions/

echo.
echo Arrastra el archivo a la ventana de Chrome:
echo %TEMP%\extension.crx
echo.
pause
```

---

## Conclusión

**Para mayoría de casos**: Publicar en Chrome Web Store ($5) es la mejor opción
- Sin advertencias
- Actualizaciones automáticas
- Fácil instalación
- Vale la pena

**Para testing**: Modo desarrollador

**Para casos especiales**: CRX manual o Group Policy

---

## Recursos

- Crear CRX: `crear-crx.bat`
- Publicar en Web Store: `PUBLICAR-CHROME-WEBSTORE.md`
- Instalación normal: `INSTALACION.md`
