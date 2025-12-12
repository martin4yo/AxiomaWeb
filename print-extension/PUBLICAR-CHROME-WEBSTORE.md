# 📦 Guía Completa: Publicar Extensión en Chrome Web Store

Guía paso a paso para publicar la extensión Axioma Print Manager en Chrome Web Store.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Preparar la Extensión](#preparar-la-extensión)
3. [Crear Iconos Profesionales](#crear-iconos-profesionales)
4. [Empaquetar la Extensión](#empaquetar-la-extensión)
5. [Crear Cuenta de Desarrollador](#crear-cuenta-de-desarrollador)
6. [Publicar en Chrome Web Store](#publicar-en-chrome-web-store)
7. [Post-Publicación](#post-publicación)
8. [Actualizar la Extensión](#actualizar-la-extensión)

---

## 1. Prerrequisitos

### ✅ Requisitos

- [ ] Cuenta de Google (Gmail)
- [ ] Tarjeta de crédito/débito (para pago único de $5 USD)
- [ ] Extensión funcionando en modo desarrollador
- [ ] Capturas de pantalla de la extensión
- [ ] Logo/icono de la aplicación
- [ ] Descripción y textos preparados

### 💰 Costos

- **Registro de desarrollador**: $5 USD (pago único, válido de por vida)
- **Publicación de extensiones**: GRATIS
- **Actualizaciones**: GRATIS

---

## 2. Preparar la Extensión

### Paso 2.1: Verificar manifest.json

Asegurarse que todos los campos estén correctos:

```bash
cd /home/martin/Desarrollos/AxiomaWeb/print-extension
```

Verificar `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Axioma Print Manager",
  "version": "1.0.0",
  "description": "Impresión térmica automática para Axioma Web",
  "permissions": [
    "nativeMessaging",
    "storage"
  ],
  "host_permissions": [
    "https://axiomaweb.axiomacloud.com/*",
    "https://localhost:9100/*"
  ],
  "background": {
    "service_worker": "scripts/background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://axiomaweb.axiomacloud.com/*"
      ],
      "js": ["scripts/content.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Campos importantes:**

- ✅ **name**: Nombre público de la extensión (máx 45 caracteres)
- ✅ **version**: Versión semántica (ej: 1.0.0, 1.0.1, 1.1.0)
- ✅ **description**: Descripción corta (máx 132 caracteres)
- ✅ **permissions**: Solo los necesarios (evitar solicitar permisos innecesarios)
- ✅ **icons**: Rutas correctas a los iconos

### Paso 2.2: Probar la Extensión

Antes de publicar, probar exhaustivamente:

1. **Cargar en modo desarrollador**
   ```
   Chrome → chrome://extensions/
   → Modo de desarrollador ON
   → Cargar extensión sin empaquetar
   → Seleccionar carpeta print-extension
   ```

2. **Probar todas las funcionalidades**
   - [ ] Conexión con Native Host
   - [ ] Listado de impresoras
   - [ ] Guardar configuración
   - [ ] Intercepción de fetch
   - [ ] Impresión real
   - [ ] Notificaciones

3. **Revisar errores en consola**
   ```
   chrome://extensions/ → Detalles → Inspeccionar vistas: service worker
   ```

4. **Verificar que no hay warnings**
   - Revisar console.log innecesarios
   - Verificar que no hay recursos sin usar
   - Verificar permisos justificados

---

## 3. Crear Iconos Profesionales

Chrome Web Store requiere iconos de alta calidad.

### 📐 Tamaños Requeridos

| Tamaño | Uso | Archivo |
|--------|-----|---------|
| 16x16 | Favicon, barra de herramientas | `icons/icon16.png` |
| 48x48 | Página de extensiones | `icons/icon48.png` |
| 128x128 | Chrome Web Store, instalación | `icons/icon128.png` |

### 🎨 Especificaciones

- **Formato**: PNG con transparencia
- **Fondo**: Transparente o color sólido
- **Diseño**: Simple, reconocible, profesional
- **Colores**: Coherentes con la marca

### 🛠️ Herramientas para Crear Iconos

#### Opción A: Online (Más Fácil)

1. **Canva** (https://www.canva.com)
   - Crear diseño → Personalizar tamaño → 128x128px
   - Usar plantillas de iconos de app
   - Descargar como PNG con fondo transparente
   - Redimensionar para otros tamaños

2. **Figma** (https://www.figma.com)
   - Gratis para uso personal
   - Herramientas profesionales
   - Exportar múltiples tamaños simultáneamente

3. **Favicon.io** (https://favicon.io/)
   - Generador de iconos desde texto
   - Exporta múltiples tamaños

#### Opción B: Software de Escritorio

1. **GIMP** (Gratis)
   ```bash
   # Linux
   sudo apt install gimp
   ```
   - Crear imagen 128x128
   - Capa con transparencia
   - Diseñar icono
   - Exportar como PNG
   - Escalar a 48x48 y 16x16

2. **Inkscape** (Gratis, vectorial)
   - Diseñar en SVG (vectorial, escalable)
   - Exportar PNG en diferentes tamaños
   - Ideal para logos simples

#### Opción C: Ejemplo Rápido con Código

Si querés un icono placeholder rápido para empezar:

```python
# Python con PIL (Pillow)
from PIL import Image, ImageDraw, ImageFont

# Crear imagen 128x128
sizes = [128, 48, 16]

for size in sizes:
    img = Image.new('RGBA', (size, size), (34, 139, 230, 255))  # Azul
    draw = ImageDraw.Draw(img)

    # Dibujar rectángulo blanco (simula ticket)
    margin = size // 6
    draw.rectangle(
        [margin, margin, size - margin, size - margin * 2],
        fill='white',
        outline='white'
    )

    # Guardar
    img.save(f'icons/icon{size}.png')

print("Iconos creados en icons/")
```

### 💡 Consejos de Diseño

1. **Simple y claro**: Debe verse bien incluso a 16x16px
2. **Sin texto**: El icono pequeño no se leerá
3. **Contraste**: Debe verse bien en fondos claros y oscuros
4. **Coherencia**: Mantener el mismo diseño en todos los tamaños
5. **Tema**: Impresora, ticket, o ambos

**Ejemplo conceptual para Axioma Print Manager:**
```
┌─────────────┐
│   [🖨️]      │  ← Icono de impresora
│   [▬▬▬]     │  ← Ticket saliendo
└─────────────┘
```

---

## 4. Empaquetar la Extensión

### Opción A: ZIP Manual (Recomendado)

1. **Verificar estructura de archivos**
   ```
   print-extension/
   ├── manifest.json
   ├── scripts/
   │   ├── background.js
   │   └── content.js
   ├── popup/
   │   ├── popup.html
   │   └── popup.js
   └── icons/
       ├── icon16.png
       ├── icon48.png
       └── icon128.png
   ```

2. **Excluir archivos innecesarios**

   NO incluir:
   - ❌ `native-host/` (se distribuye separado)
   - ❌ `.git/`
   - ❌ `node_modules/`
   - ❌ `.gitignore`
   - ❌ `*.md` (documentación)
   - ❌ `.vscode/`
   - ❌ Archivos de desarrollo

3. **Crear ZIP en Windows**
   ```bash
   # Opción 1: Usando el script batch
   cd print-extension
   package-extension.bat
   ```

   ```bash
   # Opción 2: Manual con 7-Zip
   # Seleccionar carpetas: manifest.json, scripts/, popup/, icons/
   # Click derecho → 7-Zip → Add to archive
   # Nombre: axioma-print-extension.zip
   ```

4. **Crear ZIP en Linux**
   ```bash
   cd /home/martin/Desarrollos/AxiomaWeb/print-extension
   zip -r axioma-print-extension.zip \
     manifest.json \
     scripts/ \
     popup/ \
     icons/ \
     -x "*.md" -x ".git/*" -x "native-host/*"
   ```

5. **Verificar el ZIP**
   ```bash
   # Ver contenido
   unzip -l axioma-print-extension.zip

   # Debe mostrar:
   # manifest.json
   # scripts/background.js
   # scripts/content.js
   # popup/popup.html
   # popup/popup.js
   # icons/icon16.png
   # icons/icon48.png
   # icons/icon128.png
   ```

### Opción B: Usar Chrome para Empaquetar

1. Ir a `chrome://extensions/`
2. Activar "Modo de desarrollador"
3. Click en "Empaquetar extensión"
4. Seleccionar directorio raíz de la extensión
5. Click "Empaquetar extensión"
6. Se generan 2 archivos:
   - `.crx` (extensión empaquetada) - NO USAR para Web Store
   - `.pem` (clave privada) - GUARDAR SEGURO

**⚠️ Importante**: Para Chrome Web Store usa el **.zip**, no el .crx

---

## 5. Crear Cuenta de Desarrollador

### Paso 5.1: Registrarse como Desarrollador

1. **Ir a Chrome Web Store Developer Dashboard**
   - URL: https://chrome.google.com/webstore/devconsole
   - Iniciar sesión con tu cuenta de Google

2. **Aceptar Términos de Servicio**
   - Leer y aceptar los términos
   - Aceptar políticas de desarrollador

3. **Pagar la Tarifa de Registro**
   - Costo: $5 USD (pago único)
   - Click en "Pay this fee now"
   - Ingresar datos de tarjeta de crédito/débito
   - Completar pago

   **💡 Nota**: Este es un pago único que te permite publicar extensiones ilimitadas de por vida.

4. **Configurar Perfil de Desarrollador**
   - Nombre del desarrollador: "AxiomaWeb" o tu nombre
   - Email de contacto verificado
   - Sitio web (opcional): https://github.com/martin4yo/AxiomaWeb

---

## 6. Publicar en Chrome Web Store

### Paso 6.1: Subir la Extensión

1. **Ir al Dashboard**
   - URL: https://chrome.google.com/webstore/devconsole

2. **Crear Nuevo Elemento**
   - Click en "New Item"
   - Seleccionar el archivo ZIP: `axioma-print-extension.zip`
   - Click "Upload"

3. **Esperar Validación Automática**
   - Chrome validará el manifest.json
   - Verificará que no haya errores
   - Si hay errores, los mostrará → corregir y volver a subir

### Paso 6.2: Completar Información del Store

#### 📝 Descripción del Producto

**Nombre del Producto** (máx 75 caracteres)
```
Axioma Print Manager
```

**Descripción Resumida** (máx 132 caracteres)
```
Impresión térmica automática para AxiomaWeb. Conecta tu impresora POS directamente desde el navegador.
```

**Descripción Detallada** (máx 16000 caracteres)
```
Axioma Print Manager es una extensión para Chrome/Edge que permite imprimir automáticamente tickets térmicos desde AxiomaWeb sin necesidad de confirmaciones manuales.

🎯 CARACTERÍSTICAS PRINCIPALES

✅ Impresión Automática - Los tickets se imprimen directamente sin cuadros de diálogo
✅ Sin Configuración Complicada - Instalación en 2 pasos
✅ Compatible con Impresoras Térmicas - POS-80, TM-T20, y otros modelos ESC/POS
✅ Seguro y Confiable - Usa Chrome Native Messaging (sin servidores externos)
✅ Actualizaciones Automáticas - Siempre tendrás la última versión

📦 REQUISITOS

Para usar esta extensión necesitas:
1. Windows 10 o superior
2. Una impresora térmica instalada (POS-80, TM-T20, etc.)
3. El Native Host instalado (descarga desde nuestro GitHub)
4. Acceso a AxiomaWeb (https://axiomaweb.axiomacloud.com)

🚀 INSTALACIÓN

1. Instalar esta extensión desde Chrome Web Store
2. Descargar e instalar el Native Host desde: https://github.com/martin4yo/AxiomaWeb/releases
3. Configurar tu impresora en el popup de la extensión
4. ¡Listo! Los tickets se imprimirán automáticamente

📖 DOCUMENTACIÓN

- Guía de instalación completa: https://github.com/martin4yo/AxiomaWeb/tree/master/print-extension
- Troubleshooting: Ver documentación en GitHub
- Soporte: https://github.com/martin4yo/AxiomaWeb/issues

🔒 PRIVACIDAD Y SEGURIDAD

Esta extensión:
- No recopila datos personales
- No se conecta a servidores externos
- Solo funciona en axiomaweb.axiomacloud.com
- Usa Chrome Native Messaging para comunicarse con impresoras

💼 CASOS DE USO

Ideal para:
- Puntos de venta (POS)
- Restaurantes y bares
- Tiendas minoristas
- Cualquier negocio que necesite imprimir tickets térmicos automáticamente

⚙️ PERMISOS REQUERIDOS

- "nativeMessaging": Para comunicarse con el Native Host que maneja la impresora
- "storage": Para guardar la configuración de la impresora seleccionada
- "host_permissions": Para interceptar peticiones de impresión en axiomaweb.axiomacloud.com

📞 SOPORTE

¿Problemas? ¿Preguntas?
- GitHub Issues: https://github.com/martin4yo/AxiomaWeb/issues
- Documentación: https://github.com/martin4yo/AxiomaWeb/wiki
```

#### 🖼️ Recursos Gráficos

**1. Icono de la Tienda** (128x128)
- Subir `icons/icon128.png`
- Debe ser el mismo que en la extensión
- PNG con fondo transparente o sólido

**2. Tile de Promoción Pequeño** (440x280) - REQUERIDO
- Crear imagen promocional
- Mostrar logo + texto "Axioma Print Manager"
- Ejemplo en Canva: Buscar "Chrome Extension Promo"
- Guardar como `promo-440x280.png`

**3. Capturas de Pantalla** (1280x800 o 640x400) - REQUERIDO
- Mínimo 1, máximo 5
- Mostrar la extensión en acción

Capturas sugeridas:
1. Popup de configuración mostrando lista de impresoras
2. Indicador de conexión en axiomaweb.axiomacloud.com
3. Ventana de Chrome Extensions mostrando la extensión instalada

Cómo capturar:
```bash
# En Chrome
1. Abrir la extensión
2. Presionar F12 → Settings → Capture screenshot
3. O usar herramienta de recorte de Windows
4. Redimensionar a 1280x800 o 640x400
```

**4. Tile de Promoción Grande** (920x680) - Opcional
- Versión más grande del promotional tile
- Para destacar en búsquedas

**5. Tile de Promoción Marquesina** (1400x560) - Opcional
- Banner horizontal
- Solo si quieres destacar la extensión

#### 🌐 Sitios Web

**Sitio web oficial** (opcional)
```
https://github.com/martin4yo/AxiomaWeb
```

**URL de soporte** (opcional)
```
https://github.com/martin4yo/AxiomaWeb/issues
```

#### 📋 Categoría

Seleccionar categoría:
- **Productividad** ✅ (Recomendado)

#### 🌍 Idioma

- Idioma principal: **Español**
- Puedes agregar más idiomas después

### Paso 6.3: Información de Privacidad

**¿Tu extensión usa permisos que requieren justificación?**
- Sí

**Justificación de Permisos**:

Para `nativeMessaging`:
```
Este permiso es necesario para comunicarse con el Native Messaging Host instalado en la computadora del usuario, que se encarga de enviar comandos a la impresora térmica. Sin este permiso, la extensión no puede funcionar.
```

Para `storage`:
```
Este permiso se usa únicamente para guardar localmente la configuración de la impresora seleccionada por el usuario (nombre de la impresora). No se almacena ningún dato sensible ni se envía a servidores externos.
```

Para `host_permissions` (axiomaweb.axiomacloud.com):
```
Este permiso permite interceptar las peticiones de impresión que el sitio web hace a localhost:9100, redirigiendo estas peticiones al Native Messaging Host. Solo funciona en el dominio específico de AxiomaWeb y no afecta ningún otro sitio.
```

**¿Recopilas datos de usuario?**
- No ✅

**Declaración de Privacidad** (si recopilas datos, necesitas URL de privacy policy)
```
Esta extensión no recopila, almacena ni transmite ningún dato personal del usuario.
```

### Paso 6.4: Distribución

**Visibilidad**:
- ✅ **Público** (Cualquiera puede buscar e instalar)
- ⬜ No listado (Solo quienes tengan el link)
- ⬜ Privado (Solo para usuarios de tu dominio Google Workspace)

**Regiones**:
- ✅ Todas las regiones
- O seleccionar regiones específicas (ej: solo Argentina)

**Precio**:
- ✅ Gratis

### Paso 6.5: Revisión Final

**Antes de enviar, verificar:**
- [ ] Descripción completa y clara
- [ ] Al menos 1 captura de pantalla
- [ ] Promotional tile 440x280
- [ ] Justificación de permisos
- [ ] Declaración de privacidad
- [ ] Información de contacto
- [ ] Categoría correcta

### Paso 6.6: Enviar a Revisión

1. **Guardar Borrador**
   - Click en "Save Draft" para guardar progreso

2. **Vista Previa**
   - Click en "Preview" para ver cómo se verá en la tienda

3. **Enviar a Revisión**
   - Click en "Submit for Review"
   - Confirmar envío

4. **Esperar Aprobación**
   - Tiempo estimado: 1-3 días hábiles (puede ser más rápido)
   - Recibirás email cuando esté revisada
   - Estados posibles:
     - ✅ **Aprobada** → Publicada automáticamente
     - ⚠️ **Requiere cambios** → Corregir y reenviar
     - ❌ **Rechazada** → Ver razones y apelar o corregir

---

## 7. Post-Publicación

### Paso 7.1: Obtener el ID de la Extensión

Una vez publicada:

1. **Ir a Chrome Web Store**
   - Buscar "Axioma Print Manager"
   - O ir al link directo que te envía Google

2. **Copiar ID de la URL**
   ```
   https://chrome.google.com/webstore/detail/axioma-print-manager/ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
                                                          └─────────── Este es el ID ──────────┘
   ```

3. **El ID tiene 32 caracteres**, ejemplo:
   ```
   abcdefghijklmnopqrstuvwxyz123456
   ```

### Paso 7.2: Actualizar el Native Host

Ahora hay que configurar el Native Host para que acepte la extensión publicada:

1. **Actualizar `com.axiomaweb.printmanager.json`**

   En el instalador (installer.iss), actualizar la línea:
   ```pascal
   ManifestLines.Add('    "chrome-extension://EXTENSION_ID_PLACEHOLDER/"');
   ```

   Por:
   ```pascal
   ManifestLines.Add('    "chrome-extension://TU_ID_REAL_AQUI/"');
   ```

2. **Recompilar el instalador**
   ```bash
   # En Inno Setup
   # Compile → installer.iss
   # Se genera nuevo AxiomaPrintManagerHostSetup.exe
   ```

3. **Subir a GitHub Releases**
   ```bash
   # Crear release en GitHub con el instalador actualizado
   # https://github.com/martin4yo/AxiomaWeb/releases/new

   Tag: v1.0.0
   Release title: Axioma Print Manager Native Host v1.0.0
   Description: Native Messaging Host para la extensión de Chrome

   Adjuntar: AxiomaPrintManagerHostSetup.exe
   ```

### Paso 7.3: Actualizar Documentación

Actualizar todos los documentos con el ID y link reales:

**1. INSTALACION.md**
```markdown
#### Opción A: Desde Chrome Web Store (Recomendado)

1. Ir a [Axioma Print Manager en Chrome Web Store](https://chrome.google.com/webstore/detail/TU_ID_AQUI)
2. Click en "Agregar a Chrome"
3. Confirmar permisos
```

**2. README.md**
```markdown
## Instalación

1. Instalar extensión: [Chrome Web Store](https://chrome.google.com/webstore/detail/TU_ID_AQUI)
2. Descargar instalador: [GitHub Releases](https://github.com/martin4yo/AxiomaWeb/releases)
```

**3. Commit y push**
```bash
git add .
git commit -m "docs: Actualizar links con extensión publicada"
git push origin master
```

### Paso 7.4: Monitorear Instalaciones

En el Developer Dashboard puedes ver:
- Número de instalaciones
- Instalaciones activas
- Reviews y ratings
- Estadísticas de uso

---

## 8. Actualizar la Extensión

Cuando necesites publicar una actualización:

### Paso 8.1: Incrementar Versión

En `manifest.json`:
```json
{
  "version": "1.0.1"  // Era 1.0.0
}
```

**Versionado Semántico**:
- `1.0.0` → `1.0.1`: Bug fixes
- `1.0.0` → `1.1.0`: Nuevas características (compatible)
- `1.0.0` → `2.0.0`: Cambios incompatibles

### Paso 8.2: Hacer Cambios

Editar archivos necesarios, probar en modo desarrollador.

### Paso 8.3: Empaquetar Nueva Versión

```bash
cd print-extension
package-extension.bat  # Crea nuevo ZIP
```

### Paso 8.4: Subir al Dashboard

1. Ir a Developer Dashboard
2. Click en "Axioma Print Manager"
3. Click en "Package" (pestaña)
4. Click en "Upload new package"
5. Seleccionar el nuevo ZIP
6. Click "Submit for Review"

### Paso 8.5: Esperar Aprobación

- Las actualizaciones suelen aprobarse más rápido (< 24 horas)
- Una vez aprobada, los usuarios reciben la actualización automáticamente
- Puede tardar hasta 24 horas en propagarse a todos los usuarios

### Paso 8.6: Notas de la Versión (Opcional)

En el Developer Dashboard, en la sección "Recent Changes":
```
Versión 1.0.1 - 2024-01-15
- Corregido error al listar impresoras en Windows 11
- Mejorada la detección de conexión con el Native Host
- Optimización de rendimiento
```

---

## 📝 Checklist Final Pre-Publicación

Antes de hacer "Submit for Review", verificar:

### Extensión
- [ ] `manifest.json` sin errores
- [ ] Todos los archivos necesarios incluidos
- [ ] Iconos en los 3 tamaños (16, 48, 128)
- [ ] Probada exhaustivamente en modo desarrollador
- [ ] Sin console.logs de debug
- [ ] Permisos justificados

### Chrome Web Store
- [ ] Descripción completa y profesional
- [ ] Al menos 1 captura de pantalla de calidad
- [ ] Promotional tile 440x280 creado
- [ ] Categoría seleccionada
- [ ] Justificación de permisos clara
- [ ] Links de soporte/sitio web correctos
- [ ] Política de privacidad declarada

### Complementario
- [ ] Native Host compilado y testeado
- [ ] Instalador creado con Inno Setup
- [ ] Documentación actualizada
- [ ] README.md completo en GitHub

---

## 🆘 Problemas Comunes

### ❌ "Extension failed to upload"

**Causa**: ZIP mal formado o archivos prohibidos

**Solución**:
- Verificar que el ZIP no tenga carpetas anidadas innecesarias
- Remover archivos .git, node_modules, .DS_Store
- Verificar que manifest.json está en la raíz del ZIP

### ❌ "Manifest version not supported"

**Causa**: Manifest V2 en lugar de V3

**Solución**:
- Verificar que `"manifest_version": 3`
- Chrome Web Store solo acepta Manifest V3 desde 2024

### ❌ "Permission not allowed"

**Causa**: Permiso prohibido o sin justificación

**Solución**:
- Solo usar permisos necesarios
- Proporcionar justificación detallada
- Evitar permisos como "tabs", "webRequest" si no son esenciales

### ❌ "Requires privacy policy"

**Causa**: Extensión solicita permisos sensibles

**Solución**:
- Crear página con política de privacidad
- Hostear en GitHub Pages o tu sitio
- Agregar URL en el dashboard

### ❌ Rechazada por "Single Purpose"

**Causa**: La extensión hace demasiadas cosas no relacionadas

**Solución**:
- Enfocarse en un propósito: impresión térmica
- Remover funcionalidades no relacionadas
- Describir claramente el propósito único

---

## 🎉 ¡Publicación Exitosa!

Una vez aprobada:

1. ✅ La extensión estará disponible públicamente
2. ✅ Usuarios podrán instalarla con 1 click
3. ✅ Actualizaciones automáticas para todos
4. ✅ Estadísticas en el Developer Dashboard

**Link de ejemplo**:
```
https://chrome.google.com/webstore/detail/axioma-print-manager/TU_ID_AQUI
```

**Badge para README.md**:
```markdown
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/TU_ID_AQUI.svg)](https://chrome.google.com/webstore/detail/TU_ID_AQUI)
[![Users](https://img.shields.io/chrome-web-store/users/TU_ID_AQUI.svg)](https://chrome.google.com/webstore/detail/TU_ID_AQUI)
```

---

## 📚 Referencias

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Documentación de Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Políticas del Developer Program](https://developer.chrome.com/docs/webstore/program-policies/)
- [Mejores Prácticas](https://developer.chrome.com/docs/webstore/best_practices/)
- [Guía de Publicación Oficial](https://developer.chrome.com/docs/webstore/publish/)

---

**¿Necesitas ayuda?**
- Issues de GitHub: https://github.com/martin4yo/AxiomaWeb/issues
