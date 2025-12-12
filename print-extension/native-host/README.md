# Axioma Print Manager - Native Messaging Host

Este es el Native Messaging Host que permite a la extensión de navegador comunicarse con impresoras térmicas directamente.

## Construcción

### Requisitos

- Node.js 18 o superior
- npm
- Inno Setup (para crear el instalador)

### Pasos

1. **Compilar el ejecutable:**
   ```bash
   build.bat
   ```

   Esto creará `axioma-print-host.exe`

2. **Crear el instalador:**
   - Abrir `installer.iss` con Inno Setup
   - Click en "Compile"
   - Esto generará `AxiomaPrintManagerHostSetup.exe`

## Instalación

### Para usuarios finales

1. Ejecutar `AxiomaPrintManagerHostSetup.exe`
2. Seguir el asistente de instalación
3. El instalador:
   - Copiará el host nativo a `C:\Program Files\AxiomaPrintManager\`
   - Registrará el host con Chrome y Edge
   - Configurará los permisos necesarios

### Instalación manual (para desarrollo)

1. Copiar `axioma-print-host.exe` y `thermal-templates.js` a una carpeta
2. Crear/actualizar el registro de Chrome:
   ```
   HKLM\Software\Google\Chrome\NativeMessagingHosts\com.axiomaweb.printmanager
   Valor por defecto: ruta completa a com.axiomaweb.printmanager.json
   ```

3. Actualizar `com.axiomaweb.printmanager.json` con la ruta completa al `.exe`:
   ```json
   {
     "name": "com.axiomaweb.printmanager",
     "description": "Axioma Print Manager Native Host",
     "path": "C:\\ruta\\completa\\axioma-print-host.exe",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://ID_DE_TU_EXTENSION/"
     ]
   }
   ```

## Configuración

La configuración se guarda en:
```
%APPDATA%\axioma-print-manager\config.json
```

Contiene:
```json
{
  "printerName": "POS-80"
}
```

## Comandos soportados

El Native Host acepta los siguientes comandos vía Native Messaging:

### `status`
Verificar estado de conexión
```json
{
  "requestId": 1,
  "command": "status",
  "data": {}
}
```

Respuesta:
```json
{
  "requestId": 1,
  "success": true,
  "connected": true,
  "printerName": "POS-80",
  "version": "1.0.0"
}
```

### `listPrinters`
Obtener lista de impresoras instaladas
```json
{
  "requestId": 2,
  "command": "listPrinters",
  "data": {}
}
```

Respuesta:
```json
{
  "requestId": 2,
  "success": true,
  "printers": [
    {
      "name": "POS-80",
      "driverName": "Generic / Text Only",
      "portName": "USB001"
    }
  ]
}
```

### `configure`
Guardar configuración de impresora
```json
{
  "requestId": 3,
  "command": "configure",
  "data": {
    "printerName": "POS-80"
  }
}
```

### `print`
Imprimir ticket térmico
```json
{
  "requestId": 4,
  "command": "print",
  "data": {
    "business": {
      "name": "Mi Negocio",
      "cuit": "20-12345678-9",
      "address": "Av. Principal 123",
      "phone": "123-4567",
      "email": "info@negocio.com"
    },
    "sale": {
      "number": "00001-00000123",
      "date": "2024-01-15",
      "items": [...],
      "total": 1500.00,
      "payments": [...]
    },
    "template": "simple"
  }
}
```

## Logs

Los logs se escriben a `stderr` y pueden verse con:
- Process Monitor
- DebugView
- O redirigir stderr a un archivo durante el desarrollo

## Troubleshooting

### La extensión no se conecta

1. Verificar que el instalador se ejecutó correctamente
2. Verificar las claves de registro:
   ```
   HKLM\Software\Google\Chrome\NativeMessagingHosts\com.axiomaweb.printmanager
   ```
3. Verificar que el archivo JSON de manifiesto existe y tiene la ruta correcta
4. Verificar que el ejecutable existe en la ruta especificada

### Error de impresión

1. Verificar que la impresora está instalada y en línea
2. Verificar el nombre de la impresora en la configuración
3. Revisar los logs en el Visor de Eventos de Windows

### Permisos

El host nativo requiere permisos para:
- Escribir en `%APPDATA%\axioma-print-manager\`
- Ejecutar comandos de PowerShell (para listar impresoras)
- Escribir archivos temporales en `%TEMP%`
- Acceso a impresoras vía `copy /B` al puerto de impresora
