# Quick Start - Sistema de Impresión

Guía rápida para configurar e imprimir tickets/facturas en menos de 5 minutos.

## ⚡ Inicio Rápido

### Paso 1: Configurar Datos del Negocio (2 min)

1. Ir a **Configuración > Tenants**
2. Click en **Editar** tu tenant
3. Click en pestaña **"Datos del Negocio"**
4. Completar:
   - ✅ Nombre del Negocio
   - ✅ CUIT
   - ✅ Dirección
   - ✅ Teléfono
   - ⚪ Email (opcional)
5. Click **Guardar**

### Paso 2: Asignar Template (1 min)

1. Ir a **Configuración > Configuración de Comprobantes**
2. Click en **Editar** la configuración de tu comprobante (ej: Factura B)
3. En **"Formato de Impresión"** seleccionar:
   - Para Factura B → "Factura B 80mm"
   - Para Factura A → "Factura A 80mm"
   - Para ticket simple → "Ticket Venta 80mm"
4. Click **Guardar**

### Paso 3: Configurar Impresora (1 min)

**Windows:**
- Panel de Control > Impresoras
- Click derecho en tu impresora térmica
- "Establecer como predeterminada"

**Linux:**
- Configuración > Impresoras
- Seleccionar impresora
- Marcar como predeterminada

**macOS:**
- Preferencias > Impresoras
- Seleccionar impresora
- "Impresora por Omisión"

### Paso 4: ¡Crear tu Primera Venta! (30 seg)

1. Ir a **Ventas > Nueva Venta**
2. Seleccionar cliente, productos, etc.
3. Click **"Finalizar Venta"**
4. 🎉 **¡Se abrirá automáticamente el diálogo de impresión!**

## 🔄 Reimprimir

Desde el listado de ventas:
1. Buscar la venta
2. Click en botón 🖨️ (impresora)
3. Confirmar impresión

## 📋 Templates Disponibles

| Template | Cuándo Usar | Ancho |
|----------|-------------|-------|
| Ticket Venta 80mm | Ventas generales | 80mm |
| Ticket Venta 58mm | Impresoras compactas | 58mm |
| Factura A 80mm | Responsables Inscriptos | 80mm |
| Factura B 80mm | Consumidores Finales | 80mm |
| Nota de Crédito 80mm | Devoluciones | 80mm |
| Nota de Débito 80mm | Ajustes | 80mm |
| Presupuesto 80mm | Cotizaciones | 80mm |

## ❓ FAQ

### ¿Por qué no se imprime automáticamente?

**Revisar:**
1. ¿Configuraste el template en el Paso 2?
2. ¿El navegador bloqueó el popup? (Buscar 🚫 en barra de direcciones)
3. ¿Hay impresora configurada en el sistema operativo?

### ¿Cómo cambio el formato?

1. Ir a Configuración > Configuración de Comprobantes
2. Editar la configuración
3. Cambiar "Formato de Impresión"
4. Guardar

Las nuevas ventas usarán el nuevo formato. Las ventas anteriores mantienen su formato original.

### ¿Puedo tener diferentes formatos para Factura A y B?

¡Sí! Cada tipo de comprobante puede tener su propio template:
- Factura A → Template "Factura A 80mm"
- Factura B → Template "Factura B 80mm"
- Nota Crédito → Template "Nota Crédito 80mm"

### ¿Funciona con impresoras normales (no térmicas)?

Sí, funciona con cualquier impresora instalada en tu sistema. Los templates están optimizados para térmicas pero funcionan en cualquier impresora.

### ¿Puedo ver la factura antes de imprimir?

Cuando se abre el diálogo de impresión, el navegador muestra una vista previa. Ahí puedes:
- Ver cómo quedará
- Ajustar configuración
- Cancelar si algo no está bien

### ¿Se guarda la factura impresa?

La venta se guarda en la base de datos y puedes reimprimirla cuando quieras desde el listado de ventas.

### ¿Necesito estar conectado a internet?

Para crear ventas con CAE de AFIP sí necesitas internet. Pero el sistema de impresión funciona offline (si ya creaste la venta, puedes reimprimir sin conexión).

## 🚨 Troubleshooting Rápido

### Error: "No se pudo abrir ventana de impresión"

**Solución:** El navegador bloqueó el popup.
- Chrome/Edge: Click en 🚫 en barra de direcciones > "Permitir popups"
- Firefox: Click en ⚙️ > Opciones > Permitir popups para este sitio

### Error: "timeout of 10000ms exceeded"

**Solución:** Actualiza la página y vuelve a intentar. Si persiste, verifica conexión a internet (necesaria para AFIP).

### El ticket se imprime cortado

**Solución:**
- Verifica que el template coincida con el ancho de tu papel
- Si tienes papel de 58mm, usa "Ticket Venta 58mm"
- Si tienes papel de 80mm, usa templates de 80mm

### No aparece el QR en la factura

**Solución:**
- El QR solo aparece en facturas electrónicas con CAE de AFIP
- Verifica que tengas configurada la conexión AFIP
- Tickets simples (sin CAE) no tienen QR

### Los datos del negocio aparecen vacíos

**Solución:** No configuraste los datos del negocio (Paso 1). Completa los campos en:
Configuración > Tenants > Editar > Datos del Negocio

## 📚 Más Información

- **Documentación completa:** `docs/SISTEMA_IMPRESION.md`
- **Arquitectura:** `docs/DECISIONES_ARQUITECTURA.md`
- **Soporte:** https://github.com/martin4yo/AxiomaWeb/issues

## 🎯 Checklist de Primera Configuración

```
☐ Configurar datos del negocio en Tenant
☐ Asignar template a tipo de comprobante
☐ Configurar impresora predeterminada en SO
☐ Crear venta de prueba
☐ Verificar que impresión funciona
☐ Probar reimpresión desde listado
```

---

**¿Todo funcionando?** ¡Perfecto! Ya puedes empezar a emitir comprobantes.

**¿Problemas?** Revisa la documentación completa o abre un issue en GitHub.
