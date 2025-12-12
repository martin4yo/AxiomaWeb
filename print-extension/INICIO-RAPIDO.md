# 🚀 Inicio Rápido - Axioma Print Manager Extension

Guía ultra-resumida para empezar en 5 minutos.

## Paso 1: Instalar Native Host

1. Descargar: [AxiomaPrintManagerHostSetup.exe](https://github.com/martin4yo/AxiomaWeb/releases)
2. Ejecutar como administrador
3. Siguiente → Siguiente → Instalar
4. ✅ Listo

## Paso 2: Instalar Extensión

### Opción A: Chrome Web Store
1. Buscar "Axioma Print Manager" en Chrome Web Store
2. Click "Agregar a Chrome"
3. ✅ Listo

### Opción B: Modo Desarrollador
1. Descargar y descomprimir extensión
2. Chrome → `chrome://extensions/`
3. Activar "Modo de desarrollador"
4. "Cargar extensión sin empaquetar" → Seleccionar carpeta `print-extension`
5. Copiar el ID de la extensión
6. Editar: `C:\Program Files\AxiomaPrintManager\com.axiomaweb.printmanager.json`
   - Reemplazar `EXTENSION_ID_PLACEHOLDER` con tu ID
7. ✅ Listo

## Paso 3: Configurar Impresora

1. Click en icono de extensión en Chrome
2. Debe decir: ✅ "Conectado"
   - Si dice ❌ "Desconectado": reiniciar Chrome
3. Seleccionar tu impresora térmica (ej: POS-80)
4. Click "Guardar Configuración"
5. ✅ Listo

## Paso 4: Configurar AxiomaWeb

1. Ir a AxiomaWeb → Configuración → Comprobantes
2. Para el tipo de comprobante que quieras imprimir:
   - **Formato de impresión**: THERMAL
   - **Template de impresión**: SIMPLE (o LEGAL si necesitas más datos)
3. Guardar
4. ✅ Listo

## Paso 5: Probar

1. Hacer una venta de prueba
2. Debe imprimir automáticamente
3. 🎉 ¡Funciona!

## ❌ Si algo falla

### No imprime
- Verificar que la impresora está encendida
- Verificar que el nombre es correcto
- Hacer impresión de prueba desde Windows

### Extensión desconectada
- Reiniciar Chrome (cerrar TODAS las ventanas)
- Verificar instalación del Native Host
- Ver logs: `chrome://extensions/` → Service Worker

### Más ayuda
- Ver [INSTALACION.md](./INSTALACION.md)
- Ver sección Troubleshooting

## 🎯 Ventajas

- ✅ No más localhost:9100
- ✅ No más certificados SSL
- ✅ Funciona en producción (HTTPS)
- ✅ Actualizaciones automáticas
- ✅ Configuración simple

## 💡 Para 100+ instalaciones

```batch
REM Instalador silencioso
AxiomaPrintManagerHostSetup.exe /VERYSILENT

REM Pre-configurar impresora
echo {"printerName":"POS-80"} > %APPDATA%\axioma-print-manager\config.json
```

Publicar extensión en Chrome Web Store → Todos reciben actualizaciones automáticas.
