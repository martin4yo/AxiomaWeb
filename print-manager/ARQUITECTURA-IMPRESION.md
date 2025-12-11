# Arquitectura de Impresión Térmica

## Problema Resuelto

### El Problema Original

Cuando el sistema ERP está en producción (servidor remoto) y se intenta imprimir un ticket fiscal desde una PC con Windows donde corre el Print Manager:

- ❌ **Backend intenta conectarse a `localhost:9100`**: El backend está en el servidor remoto (ej: 66.97.45.210), por lo que `localhost:9100` es el localhost DEL SERVIDOR, no de la PC del cliente
- ❌ **Print Manager no es accesible**: El Print Manager corre en la PC del cliente (Windows) en `localhost:9100`, pero el backend no puede alcanzarlo
- ❌ **Error "Print Manager no disponible"**: El backend falla al intentar conectarse porque están en redes diferentes

### La Solución Implementada

**Frontend llama directamente al Print Manager local:**

```
┌─────────────────┐
│  Navegador Web  │ ← Usuario en PC con Windows
│  (Frontend)     │
└────────┬────────┘
         │
         │ 1. Usuario hace venta
         │ 2. Aparece modal con botón "IMPRIMIR TICKET"
         │
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────┐                       ┌─────────────────┐
│  Backend API    │                       │  Print Manager  │
│ (Servidor       │                       │  localhost:9100 │
│  Producción)    │                       │  (Windows)      │
└─────────────────┘                       └─────────────────┘

✓ Frontend → Print Manager (localhost:9100) ✓ Misma PC, conecta OK
✓ Frontend → Backend (HTTPS) ✓ Internet, conecta OK
✗ Backend → Print Manager ✗ NO PUEDE conectar (diferentes máquinas)
```

## Cómo Funciona

### 1. Usuario hace una venta

1. Usuario completa la venta en la interfaz
2. Frontend envía datos al backend
3. Backend crea la venta en la base de datos
4. Backend retorna los datos de la venta

### 2. Modal de resultado muestra botón de impresión

Después de crear la venta, aparece el modal `AFIPProgressModal` con:

- ✓ Datos de la venta (número, total, cliente, etc.)
- ✓ Información de CAE (si es factura electrónica)
- ✓ **Botón "IMPRIMIR TICKET"** (nuevo)
- ✓ Botón "ACEPTAR"

### 3. Usuario presiona "IMPRIMIR TICKET"

El frontend:

1. **Verifica disponibilidad**: `GET http://localhost:9100/health`
   - Si responde OK → Print Manager está corriendo
   - Si falla → Muestra error "Print Manager no disponible"

2. **Envía datos a imprimir**: `POST http://localhost:9100/print`
   ```json
   {
     "data": {
       "business": { "name": "...", "cuit": "...", ... },
       "sale": { "number": "...", "items": [...], "total": ..., ... }
     },
     "template": "simple"
   }
   ```

3. **Print Manager procesa**:
   - En **Windows**: Genera archivo HTML y lo abre con `start`
   - En **Linux**: Genera ESC/POS y envía directo a impresora USB

4. **Muestra resultado**:
   - ✓ Success: "Ticket enviado a impresora"
   - ✗ Error: "Print Manager no disponible. Asegúrate de que esté corriendo en esta PC."

## Archivos Modificados

### Frontend

1. **`frontend/src/services/printService.ts`**
   - Agregado método `printToThermalPrinter(data, template)`
   - Verifica disponibilidad del Print Manager local
   - Envía datos de impresión vía fetch a localhost:9100

2. **`frontend/src/components/sales/AFIPProgressModal.tsx`**
   - Agregado botón "IMPRIMIR TICKET" (morado con ícono de impresora)
   - Función `handlePrintThermal()` que prepara datos y llama a printService
   - Muestra mensajes de éxito/error de impresión
   - Estados: `isPrinting` (loading), `printMessage` (resultado)

### Backend

**NO modificado** - El endpoint `POST /api/:tenantSlug/sales/:id/print/thermal` sigue existiendo pero ya no es usado desde el frontend. Puede usarse para imprimir desde scripts o servicios backend si fuera necesario.

## Instrucciones de Uso

### En la PC del Cliente (Windows)

1. **Instalar Print Manager**:
   ```cmd
   cd print-manager
   npm install
   ```

2. **Iniciar Print Manager**:
   ```cmd
   node server-windows.js
   ```

   Debe mostrar:
   ```
   🖨️  Print Manager Server - Versión Windows
   ✅ Servidor corriendo en http://localhost:9100
   ```

3. **Abrir la aplicación web** en el navegador de la misma PC

4. **Hacer una venta**

5. **Presionar "IMPRIMIR TICKET"** en el modal de resultado

6. **Se abre automáticamente** el ticket en el navegador predeterminado

7. **Presionar Ctrl+P** para imprimir en la impresora térmica configurada

### Verificar Conexión

Abrir en el navegador de la PC con Windows:
```
http://localhost:9100/health
```

Debe responder:
```json
{
  "status": "ok",
  "message": "Print Manager running on Windows"
}
```

## Ventajas de esta Arquitectura

✅ **Funciona en producción**: Frontend siempre puede alcanzar localhost:9100 de su propia PC

✅ **No requiere configuración de red**: No hay que abrir puertos, configurar firewall, ni VPN

✅ **Seguro**: Print Manager solo escucha en localhost (no expuesto a internet)

✅ **Simple**: Usuario solo necesita iniciar `node server-windows.js`

✅ **Compatible con CORS**: localhost:9100 acepta requests desde cualquier origen

## Alternativas (No implementadas)

### Opción 1: Print Manager en VPN/Red Local
- Requiere configuración de red compleja
- Print Manager en IP fija (ej: 192.168.1.100:9100)
- Backend puede conectarse, pero configuración difícil

### Opción 2: WebSockets/SSE desde Backend
- Backend envía comando "imprimir" vía WebSocket
- Frontend recibe y llama a Print Manager local
- Más complejo, requiere mantener conexiones persistentes

### Opción 3: Electron con IPC
- Aplicación Electron en lugar de navegador web
- IPC directo con servicio de impresión
- Requiere instalar aplicación nativa

## Troubleshooting

### "Print Manager no disponible"

1. Verificar que Print Manager esté corriendo:
   ```cmd
   node server-windows.js
   ```

2. Verificar que esté en puerto 9100:
   ```cmd
   netstat -an | findstr :9100
   ```

3. Abrir en navegador: `http://localhost:9100/health`

### "Error de CORS"

- Print Manager ya tiene CORS habilitado para `*`
- Verificar que no haya proxy/firewall bloqueando

### "No imprime, solo abre HTML"

- Esto es normal en Windows
- Presionar Ctrl+P en la ventana que se abre
- Seleccionar impresora térmica
- Ajustar márgenes a 0 en configuración de impresión

## Próximos Pasos

1. ✅ Implementar botón de impresión en modal (COMPLETADO)
2. ⏳ Probar en producción con usuario real
3. 📋 Agregar configuración de URL del Print Manager en settings (permitir cambiar puerto)
4. 📋 Agregar botón de impresión en listado de ventas (reimprimir)
5. 📋 Soporte para múltiples templates (legal/simple)
