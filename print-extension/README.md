# Axioma Print Manager - Extensión de Navegador

Extensión para Chrome/Edge que permite imprimir automáticamente en impresoras térmicas desde AxiomaWeb, sin necesidad de servidor local.

## 🎯 Características

- ✅ **Impresión directa** - Sin cuadros de diálogo ni confirmaciones
- ✅ **Sin servidor local** - No requiere ejecutar Print Manager como servicio
- ✅ **Sin certificados SSL** - Sin problemas de Mixed Content
- ✅ **Actualizaciones automáticas** - Desde Chrome Web Store
- ✅ **Configuración simple** - Un solo click para configurar impresora
- ✅ **Multi-navegador** - Compatible con Chrome y Microsoft Edge

## 📦 Componentes

### 1. Extensión de Navegador
- **manifest.json** - Configuración de la extensión (Manifest V3)
- **scripts/background.js** - Service worker que maneja Native Messaging
- **scripts/content.js** - Script que intercepta peticiones de impresión
- **popup/** - Interfaz de configuración

### 2. Native Messaging Host
- **native-host/host.js** - Programa Node.js que se comunica con impresoras
- **native-host/thermal-templates.js** - Generadores de comandos ESC/POS
- **native-host/installer.iss** - Script de Inno Setup para el instalador

## 🚀 Instalación

Ver [INSTALACION.md](./INSTALACION.md) para instrucciones completas.

**Resumen rápido**:
1. Instalar Native Host: `AxiomaPrintManagerHostSetup.exe`
2. Instalar extensión desde Chrome Web Store
3. Configurar impresora en el popup de la extensión

## 🔧 Desarrollo

### Requisitos
- Node.js 18+
- Chrome o Edge
- Inno Setup (para compilar instalador)

### Compilar Native Host

```bash
cd native-host
npm install
npm run build
```

Esto genera `axioma-print-host.exe`

### Crear Instalador

1. Abrir `native-host/installer.iss` con Inno Setup
2. Click en "Compile"
3. Se genera `AxiomaPrintManagerHostSetup.exe`

### Cargar Extensión en Modo Desarrollador

1. Abrir `chrome://extensions/`
2. Activar "Modo de desarrollador"
3. Click en "Cargar extensión sin empaquetar"
4. Seleccionar carpeta `print-extension`

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│  AxiomaWeb (Frontend)                           │
│  https://axiomaweb.axiomacloud.com              │
└────────────────┬────────────────────────────────┘
                 │
                 │ fetch('http://localhost:9100/print')
                 │ (interceptado por content.js)
                 ▼
┌─────────────────────────────────────────────────┐
│  Chrome Extension                               │
│  ┌─────────────────────────────────────────┐   │
│  │ content.js                              │   │
│  │ - Intercepta fetch a localhost:9100     │   │
│  │ - Redirige a background.js              │   │
│  └────────────┬────────────────────────────┘   │
│               │ chrome.runtime.sendMessage      │
│               ▼                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ background.js (Service Worker)          │   │
│  │ - Maneja Native Messaging               │   │
│  │ - Envía comandos al Native Host         │   │
│  └────────────┬────────────────────────────┘   │
└───────────────┼─────────────────────────────────┘
                │ Chrome Native Messaging
                │ (stdin/stdout)
                ▼
┌─────────────────────────────────────────────────┐
│  Native Host (axioma-print-host.exe)            │
│  ┌─────────────────────────────────────────┐   │
│  │ host.js                                 │   │
│  │ - Lee comandos por stdin                │   │
│  │ - Genera ESC/POS con thermal-templates  │   │
│  │ - Envía a impresora con "copy /B"       │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │
                 │ copy /B temp.txt \\.\POS-80
                 ▼
         ┌───────────────────┐
         │ Impresora Térmica │
         │ (POS-80, TM-T20)  │
         └───────────────────┘
```

## 📋 Protocolo de Comunicación

La extensión y el Native Host se comunican vía Native Messaging (JSON sobre stdin/stdout):

### Comandos

#### 1. Status
```json
{
  "requestId": 1,
  "command": "status",
  "data": {}
}
```

#### 2. List Printers
```json
{
  "requestId": 2,
  "command": "listPrinters",
  "data": {}
}
```

#### 3. Configure
```json
{
  "requestId": 3,
  "command": "configure",
  "data": {
    "printerName": "POS-80"
  }
}
```

#### 4. Print
```json
{
  "requestId": 4,
  "command": "print",
  "data": {
    "business": { ... },
    "sale": { ... },
    "template": "simple"
  }
}
```

## 🧪 Testing

### Probar la extensión

1. Cargar extensión en modo desarrollador
2. Ir a `chrome://extensions/`
3. Click en "Inspeccionar vistas: service worker"
4. En la consola, probar:
```javascript
chrome.runtime.sendMessage({ action: 'getStatus' }, console.log)
```

### Probar el Native Host manualmente

```bash
# Windows
echo {"requestId":1,"command":"status","data":{}} | C:\Program Files\AxiomaPrintManager\axioma-print-host.exe
```

## 📝 Configuración

### Extensión
- **ID**: Se genera automáticamente al instalar
- **Permisos**: nativeMessaging, storage
- **Host permissions**: axiomaweb.axiomacloud.com, localhost:9100

### Native Host
- **Nombre**: com.axiomaweb.printmanager
- **Ubicación**: C:\Program Files\AxiomaPrintManager\
- **Config**: %APPDATA%\axioma-print-manager\config.json

## 🔍 Troubleshooting

Ver [INSTALACION.md](./INSTALACION.md#troubleshooting) para soluciones detalladas.

## 📦 Implementación Masiva

Para implementar en 100+ PCs:

1. **Instalador silencioso**:
   ```batch
   AxiomaPrintManagerHostSetup.exe /VERYSILENT
   ```

2. **Publicar extensión**:
   - Chrome Web Store (público)
   - O Chrome Web Store privado (Google Workspace)
   - O forzar por Group Policy

3. **Pre-configurar**:
   ```batch
   echo {"printerName":"POS-80"} > %APPDATA%\axioma-print-manager\config.json
   ```

## 📄 Licencia

MIT License - Ver [LICENSE](../LICENSE)

## 🤝 Contribuir

1. Fork el repositorio
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

- **Issues**: https://github.com/martin4yo/AxiomaWeb/issues
- **Documentación**: https://github.com/martin4yo/AxiomaWeb/wiki
