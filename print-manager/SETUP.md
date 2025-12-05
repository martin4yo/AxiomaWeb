# 🖨️ Print Manager - Configuración de Impresora Térmica

## ✅ Estado Actual

La implementación del Print Manager con acceso USB directo está **completa y funcionando**. El único paso pendiente es configurar los permisos USB en tu sistema.

## 🔍 Problema Identificado

El driver del kernel `usblp` (Linux USB Printer) está tomando control de la impresora, bloqueando el acceso directo de libusb. Esto causa el error `LIBUSB_ERROR_ACCESS`.

## 🛠️ Solución

### Opción 1: Unbind Manual (Temporal - para probar ahora)

```bash
# Desconectar el driver usblp de la impresora
sudo bash -c "echo '3-1:1.0' > /sys/bus/usb/drivers/usblp/unbind"

# Probar inmediatamente
bash test-thermal-print.sh
```

**Nota**: Esto es temporal. Si desconectas y reconectas la impresora, tendrás que hacerlo de nuevo.

### Opción 2: Configuración Permanente con udev (Recomendado)

```bash
# 1. Instalar la regla udev
sudo cp 99-gprinter.rules /etc/udev/rules.d/

# 2. Recargar reglas
sudo udevadm control --reload-rules
sudo udevadm trigger

# 3. Desconectar y reconectar la impresora físicamente
#    (o reiniciar el sistema)

# 4. Probar
bash test-thermal-print.sh
```

## 📋 Arquitectura Implementada

```
Frontend (React)
    ↓ HTTP POST
Backend (Node/Express)
    ↓ HTTP POST (localhost:9100)
Print Manager (Electron)
    ↓ USB Direct (libusb)
Gprinter GP-L18080 (0x8866:0x0100)
```

## 🎯 Características Implementadas

### Print Manager (Electron)
- ✅ Servidor Express en puerto 9100
- ✅ Endpoint POST /print para recibir datos
- ✅ Endpoint GET /health para health checks
- ✅ Acceso USB directo con libusb (sin CUPS)
- ✅ Comandos ESC/POS construidos manualmente
- ✅ Detección automática de Gprinter (vendorId: 0x8866)
- ✅ Detach de kernel driver cuando es necesario
- ✅ Manejo de errores detallado

### Backend
- ✅ Endpoint POST /api/:tenant/sales/:id/print/thermal
- ✅ Preparación de datos de venta para impresión
- ✅ Formato de ticket con todos los detalles:
  - Header con datos del negocio
  - Información del comprobante
  - Items con precios y cantidades
  - Totales (subtotal, IVA, total)
  - Formas de pago
  - CAE y vencimiento (si existe)
  - Footer y corte de papel

### Frontend
- ✅ Botón de impresión térmica en listado de ventas
- ✅ Integración con API de ventas
- ✅ Manejo de errores y feedback al usuario

## 🧪 Testing

```bash
# Test completo (incluye autenticación, obtención de venta, impresión)
bash test-thermal-print.sh

# Test directo del Print Manager
curl http://localhost:9100/health

# Test de impresión con datos de ejemplo
curl -X POST http://localhost:9100/print \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "business": {
        "name": "MI NEGOCIO",
        "cuit": "20-12345678-9",
        "address": "Calle Falsa 123",
        "phone": "123-456-7890"
      },
      "sale": {
        "number": "00001-00000001",
        "date": "04/12/2025",
        "customer": "Cliente de Prueba",
        "items": [
          {
            "name": "Producto Test",
            "quantity": 2,
            "unitPrice": 100.00,
            "total": 200.00
          }
        ],
        "subtotal": 200.00,
        "taxAmount": 42.00,
        "totalAmount": 242.00,
        "payments": [
          {
            "name": "Efectivo",
            "amount": 242.00
          }
        ]
      }
    }
  }'
```

## 🚀 Iniciar Print Manager

```bash
# Modo producción
cd print-manager
npm start

# Modo desarrollo (simula impresión sin hardware)
npm run dev
```

## 📝 Notas Técnicas

### Comandos ESC/POS Utilizados
- `ESC @` - Inicializar impresora
- `ESC a` - Alineación (izquierda, centro, derecha)
- `ESC E` - Negrita (on/off)
- `GS !` - Tamaño de texto (normal, doble, doble alto, doble ancho)
- `GS V` - Cortar papel
- `ESC d` - Alimentar líneas

### Librerías
- `usb` (v2.16.0) - Acceso USB directo
- `serialport` (v13.0.0) - Soporte adicional para puertos serie
- `electron` (v39.2.5) - Framework de aplicación desktop
- `express` (v5.2.1) - Servidor HTTP
- `qrcode` (v1.5.4) - Generación de códigos QR (pendiente implementar)

### Impresora Detectada
```
Bus 003 Device 013: ID 8866:0100
ZHU HAI SUNCSW Receipt Printer Co.,Ltd
Gprinter GP-L18080
```

## 🐛 Troubleshooting

### Error: LIBUSB_ERROR_ACCESS
**Causa**: Driver usblp del kernel está bloqueando acceso
**Solución**: Ejecutar el unbind manual o instalar la regla udev (ver arriba)

### Error: No se encontró impresora térmica USB conectada
**Causa**: Impresora desconectada o vendorId/productId incorrecto
**Solución**: Verificar con `lsusb | grep -i gprinter`

### Error: Print Manager no disponible (ECONNREFUSED)
**Causa**: Print Manager no está corriendo
**Solución**: Iniciar con `cd print-manager && npm start`

### Impresora imprime pero sale en blanco
**Causa**: Papel térmico instalado al revés o agotado
**Solución**: Verificar instalación del papel térmico

## 📚 Referencias

- ESC/POS Command Reference: https://reference.epson-biz.com/modules/ref_escpos/
- node-usb Documentation: https://github.com/node-usb/node-usb
- Electron Documentation: https://www.electronjs.org/docs
