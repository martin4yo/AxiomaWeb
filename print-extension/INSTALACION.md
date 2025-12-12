# Guía de Instalación - Axioma Print Manager Extension

Esta guía te ayudará a instalar la extensión de navegador para imprimir automáticamente en impresoras térmicas desde AxiomaWeb.

## Ventajas de la Extensión

✅ **Sin servidor local** - No necesitas ejecutar Print Manager como servicio
✅ **Sin certificados SSL** - No hay problemas de seguridad HTTPS
✅ **Actualizaciones automáticas** - La extensión se actualiza desde Chrome Web Store
✅ **Configuración centralizada** - Un solo lugar para configurar la impresora
✅ **Funciona en producción** - Compatible con https://axiomaweb.axiomacloud.com

## Requisitos

- Windows 10 o superior
- Chrome o Microsoft Edge
- Impresora térmica instalada (ej: POS-80, TM-T20, etc.)
- Permisos de administrador para la instalación

## Proceso de Instalación

### Parte 1: Instalar el Native Host

El Native Host es un pequeño programa que permite a la extensión comunicarse con la impresora.

1. **Descargar el instalador**
   - Ir a [Releases en GitHub](https://github.com/martin4yo/AxiomaWeb/releases)
   - Descargar `AxiomaPrintManagerHostSetup.exe`

2. **Ejecutar el instalador**
   - Click derecho → "Ejecutar como administrador"
   - Seguir el asistente de instalación
   - Hacer click en "Instalar"

3. **Verificar la instalación**
   - El instalador creará: `C:\Program Files\AxiomaPrintManager\`
   - Y registrará el host con Chrome/Edge automáticamente

### Parte 2: Instalar la Extensión

#### Opción A: Desde Chrome Web Store (Recomendado)

1. Ir a Chrome Web Store
2. Buscar "Axioma Print Manager"
3. Click en "Agregar a Chrome"
4. Confirmar permisos

#### Opción B: Instalación Manual (Modo Desarrollador)

Si la extensión aún no está en la Chrome Web Store:

1. **Descargar la extensión**
   - Descargar el archivo `axioma-print-extension.zip` desde GitHub
   - Descomprimir en una carpeta

2. **Cargar en Chrome**
   - Abrir Chrome y ir a `chrome://extensions/`
   - Activar "Modo de desarrollador" (switch arriba a la derecha)
   - Click en "Cargar extensión sin empaquetar"
   - Seleccionar la carpeta descomprimida `print-extension`

3. **Obtener el ID de la extensión**
   - En `chrome://extensions/`, copiar el ID (ej: `abcdefghijklmnopqrstuvwxyz123456`)

4. **Actualizar el manifiesto del Native Host**
   - Abrir: `C:\Program Files\AxiomaPrintManager\com.axiomaweb.printmanager.json`
   - Reemplazar `EXTENSION_ID_PLACEHOLDER` con el ID real:
   ```json
   {
     "allowed_origins": [
       "chrome-extension://abcdefghijklmnopqrstuvwxyz123456/"
     ]
   }
   ```
   - Guardar el archivo

### Parte 3: Configurar la Impresora

1. **Abrir el popup de la extensión**
   - Click en el icono de la extensión en la barra de herramientas
   - O ir a extensiones y hacer click en "Detalles" → "Opciones"

2. **Verificar conexión**
   - Debe aparecer: ✅ "Conectado - Print Manager funcionando"
   - Si aparece desconectado:
     - Verificar que el Native Host está instalado
     - Reiniciar Chrome
     - Ver sección de Troubleshooting

3. **Seleccionar impresora**
   - En el dropdown "Impresora térmica" seleccionar tu impresora (ej: POS-80)
   - Click en "Guardar Configuración"
   - Debe aparecer: ✅ "Configuración guardada"

## Verificar que Funciona

1. **Ir a AxiomaWeb**
   - Abrir https://axiomaweb.axiomacloud.com
   - Iniciar sesión

2. **Ver indicador de conexión**
   - Al cargar la página, debe aparecer brevemente un mensaje:
     "🖨️ Print Manager Activo"
   - Esto confirma que la extensión está interceptando las peticiones

3. **Hacer una venta de prueba**
   - Crear una venta
   - En la configuración de comprobantes, seleccionar:
     - **Formato de impresión**: THERMAL
     - **Template**: SIMPLE o LEGAL
   - Finalizar la venta
   - El ticket debe imprimirse automáticamente

## Troubleshooting

### ❌ La extensión muestra "Desconectado"

**Causa**: El Native Host no está instalado o no está registrado correctamente.

**Solución**:
1. Verificar que el instalador se ejecutó completamente
2. Verificar que existe: `C:\Program Files\AxiomaPrintManager\axioma-print-host.exe`
3. Abrir el Editor del Registro (regedit) y verificar:
   ```
   HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.axiomaweb.printmanager
   ```
   Debe contener la ruta al archivo JSON del manifiesto
4. Reiniciar Chrome completamente (cerrar todas las ventanas)

### ❌ No imprime o muestra error

**Causa**: La impresora no está configurada correctamente.

**Solución**:
1. Verificar que la impresora está encendida y conectada
2. Verificar que aparece en "Dispositivos e impresoras" de Windows
3. Hacer una impresión de prueba desde Windows
4. En la extensión, verificar que el nombre de la impresora es exactamente igual
5. Probar con otra impresora del dropdown

### ❌ Imprime pero abre cuadro de diálogo

**Causa**: El modo de impresión directa falló, está usando HTML fallback.

**Solución**:
1. Verificar que la impresora soporta comandos ESC/POS
2. Verificar que el puerto es correcto (USB, COM, LPT)
3. Probar instalar el driver genérico "Generic / Text Only"

### ❌ Error "Extension context invalidated"

**Causa**: Chrome recargó la extensión.

**Solución**:
1. Recargar la página web (F5)
2. Si persiste, desactivar y reactivar la extensión

### 🔧 Ver logs de depuración

Para ver qué está pasando:

1. **Logs de la extensión**:
   - Ir a `chrome://extensions/`
   - Click en "Detalles" de la extensión
   - Click en "Inspeccionar vistas: service worker"
   - Ver la consola

2. **Logs del Native Host**:
   - Los logs se escriben a stderr
   - Para capturarlos, ejecutar manualmente:
   ```
   C:\Program Files\AxiomaPrintManager\axioma-print-host.exe 2> C:\logs.txt
   ```
   - O usar [DebugView](https://docs.microsoft.com/en-us/sysinternals/downloads/debugview)

## Desinstalación

### Desinstalar el Native Host

1. Ir a "Configuración" → "Aplicaciones"
2. Buscar "Axioma Print Manager Native Host"
3. Click en "Desinstalar"

Esto eliminará:
- Los archivos en `C:\Program Files\AxiomaPrintManager\`
- Las claves de registro
- La configuración en `%APPDATA%\axioma-print-manager\`

### Desinstalar la Extensión

1. Ir a `chrome://extensions/`
2. Click en "Quitar" en la extensión Axioma Print Manager

## Actualización

### Actualizar el Native Host

1. Descargar la nueva versión del instalador
2. Ejecutar el nuevo instalador (sobrescribirá la versión anterior)
3. No es necesario reconfigurar

### Actualizar la Extensión

- **Desde Chrome Web Store**: Se actualiza automáticamente
- **Modo desarrollador**: Descargar nueva versión y reemplazar archivos

## Implementación Masiva

Para instalar en múltiples PCs:

### Opción 1: Instalador Silencioso

```batch
AxiomaPrintManagerHostSetup.exe /VERYSILENT /SUPPRESSMSGBOXES
```

### Opción 2: Group Policy (Dominio Windows)

1. **Publicar la extensión internamente**:
   - Crear un Chrome Web Store privado (Google Workspace)
   - O forzar instalación por políticas

2. **Distribuir el Native Host**:
   - Usar GPO para ejecutar el instalador
   - O crear un paquete MSI

3. **Configuración centralizada**:
   - Pre-configurar `com.axiomaweb.printmanager.json` con el ID de extensión
   - Distribuir `config.json` con el nombre de impresora estándar

### Script de Ejemplo

```batch
@echo off
REM Instalar Native Host silenciosamente
\\servidor\compartido\AxiomaPrintManagerHostSetup.exe /VERYSILENT

REM Pre-configurar impresora
echo {"printerName":"POS-80"} > "%APPDATA%\axioma-print-manager\config.json"

echo Instalación completada
```

## Soporte

Para problemas o dudas:
- GitHub Issues: https://github.com/martin4yo/AxiomaWeb/issues
- Documentación: https://github.com/martin4yo/AxiomaWeb/wiki
