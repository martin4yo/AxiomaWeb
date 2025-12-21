# Roadmap - AxiomaWeb ERP

Funcionalidades pendientes y mejoras planificadas para el sistema.

## Estado Actual del Sistema

### ✅ Implementado y Funcional

#### Core
- [x] Sistema multi-tenant con aislamiento de datos
- [x] Autenticación JWT con roles por tenant
- [x] UI responsive con Tailwind CSS
- [x] API RESTful con TypeScript
- [x] Base de datos PostgreSQL con Prisma

#### Modulos de Negocio
- [x] **Productos**: Gestion completa con SKU, stock, categorias, marcas
- [x] **Clientes**: Entidades con condiciones fiscales
- [x] **Proveedores**: Gestion de proveedores
- [x] **Ventas**: Punto de venta con acceso rapido
- [x] **Compras**: Gestion de compras y cuenta corriente de proveedores
- [x] **Inventario**: Control de stock por almacen con movimientos
- [x] **Sucursales**: Multi-sucursal
- [x] **Almacenes**: Multiples almacenes por tenant
- [x] **Caja**: Cuentas de caja y movimientos
- [x] **Presupuestos**: Cotizaciones con conversion a pedido/venta, envio por email, PDF
- [x] **Pedidos**: Notas de venta con reserva de stock, estados operativos, facturacion parcial

#### Facturación AFIP
- [x] Autenticación WSAA con certificados
- [x] Emisión de facturas A, B, C (WSFE)
- [x] Notas de crédito y débito
- [x] Solicitud y validación de CAE
- [x] Puntos de venta
- [x] Sincronización automática de numeración
- [x] Multi-ambiente (Testing y Producción)

#### Impresión
- [x] Sistema de templates JSON flexibles
- [x] Impresión automática al crear venta
- [x] Soporte para impresoras térmicas (58mm, 80mm)
- [x] Códigos QR para facturas electrónicas
- [x] 8 templates predefinidos
- [x] Reimpresión desde listado

#### Reportes Básicos
- [x] Dashboard con métricas del mes
- [x] Ventas del mes vs mes anterior
- [x] Productos con stock bajo
- [x] Ventas recientes
- [x] Ventas por producto (con filtro de fechas)
- [x] Cobranzas por método de pago
- [x] Resumen de ventas con filtros
- [x] Evolución de ventas por día

---

## 🚀 Prioridad Alta (Corto Plazo)

### 1. Cuenta Corriente de Clientes
**Estado:** ❌ No implementado (solo hay de proveedores)

**Funcionalidades:**
- Ver estado de cuenta por cliente
- Saldo deudor/acreedor
- Histórico de movimientos
- Aplicación de pagos a facturas
- Recordatorios de vencimiento
- Reporte de antiguedad de saldos

**Archivos a crear:**
- `backend/src/routes/customer-accounts.ts`
- `frontend/src/pages/customers/CustomerAccountsPage.tsx`
- `frontend/src/pages/customers/CustomerAccountDetailPage.tsx`

**Estimación:** 3-5 días

---

### 2. Presupuestos/Cotizaciones Formales
**Estado:** ✅ Implementado (Diciembre 2025)

**Funcionalidades implementadas:**
- [x] Crear presupuesto sin afectar stock
- [x] Convertir presupuesto a venta (directo o via pedido)
- [x] Vencimiento de presupuestos
- [x] Estados: PENDING, SENT, PARTIALLY_CONVERTED, FULLY_CONVERTED, CANCELLED
- [x] Envío por email con PDF adjunto
- [x] Seguimiento de presupuestos con conversión parcial
- [x] Conversión a Pedido con reserva de stock

**Archivos creados:**
- `backend/src/routes/quotes.ts`
- `backend/src/services/quoteService.ts`
- `frontend/src/pages/quotes/QuotesPage.tsx`
- `frontend/src/pages/quotes/NewQuotePage.tsx`
- `frontend/src/pages/quotes/QuoteDetailPage.tsx`
- Modelo en Prisma: `Quote`, `QuoteItem`

### 2.1 Pedidos (CustomerOrders)
**Estado:** ✅ Implementado (Diciembre 2025)

**Funcionalidades implementadas:**
- [x] Crear pedido (directo o desde presupuesto)
- [x] Comportamiento de stock: NONE, RESERVE, DEDUCT
- [x] Estados: DRAFT, CONFIRMED, PROCESSING, READY, PARTIALLY_INVOICED, COMPLETED, CANCELLED
- [x] Facturación parcial de pedidos
- [x] Reserva y liberación de stock
- [x] Conversión a venta con actualización automática de estado

**Archivos creados:**
- `backend/src/routes/orders.ts`
- `backend/src/services/orderService.ts`
- `frontend/src/api/orders.ts`
- `frontend/src/pages/orders/OrdersPage.tsx`
- `frontend/src/pages/orders/NewOrderPage.tsx`
- `frontend/src/pages/orders/OrderDetailPage.tsx`
- Modelo en Prisma: `CustomerOrder`, `CustomerOrderItem`, `StockReservation`

### 2.2 Trazabilidad de Documentos
**Estado:** ✅ Implementado (Diciembre 2025)

**Funcionalidades implementadas:**
- [x] Ver cadena de documentos relacionados (Quote → Order → Sale → Payments → NC/ND)
- [x] Visualización gráfica en árbol jerárquico
- [x] Modal integrado en páginas de detalle (no navega a otra página)
- [x] Sección "Origen" muestra documentos anteriores
- [x] Sección "Derivados" muestra documentos generados
- [x] Iconos y colores por tipo de documento
- [x] Metadata visible (CAE, método de pago, comportamiento de stock)

**Archivos creados:**
- `backend/src/routes/traceability.ts`
- `frontend/src/api/traceability.ts`
- `frontend/src/components/traceability/TraceabilityModal.tsx`

**Archivos modificados:**
- `frontend/src/pages/sales/SalesPage.tsx` - Botón trazabilidad
- `frontend/src/pages/quotes/QuoteDetailPage.tsx` - Botón trazabilidad
- `frontend/src/pages/orders/OrderDetailPage.tsx` - Botón trazabilidad
- `backend/src/routes/sales.ts` - Guardar orderId/quoteId
- `backend/src/services/salesService.ts` - Guardar orderId/quoteId
- `frontend/src/pages/sales/NewSalePage.tsx` - Enviar orderId/quoteId

---

### 3. Alertas de Stock
**Estado:** ⚠️ Parcial (se calcula en dashboard pero no hay alertas)

**Funcionalidades:**
- Notificación cuando stock < stock mínimo
- Email/notificación automática
- Panel de alertas en dashboard
- Sugerencia de compra automática
- Historial de alertas

**Archivos a modificar/crear:**
- `backend/src/services/stockAlertService.ts`
- `frontend/src/components/alerts/StockAlertPanel.tsx`
- Agregar campo `lastAlertDate` a Product

**Estimación:** 2-3 días

---

### 4. Exportación de Reportes
**Estado:** ❌ No implementado

**Funcionalidades:**
- Exportar a Excel (XLSX)
- Exportar a PDF
- Botón "Exportar" en todos los reportes
- Formato profesional con logo
- Exportar listados (ventas, compras, productos)

**Librerías:**
- `exceljs` para Excel
- `pdfkit` o `puppeteer` para PDF

**Archivos a crear:**
- `backend/src/utils/exportService.ts`
- `backend/src/routes/exports.ts`

**Estimación:** 3-4 días

---

### 5. Envío de Comprobantes por Email
**Estado:** ❌ No implementado

**Funcionalidades:**
- Enviar factura por email al cliente
- Template HTML profesional
- Adjuntar PDF
- Cola de envíos
- Log de emails enviados
- Reenvío manual

**Librerías:**
- `nodemailer` para SMTP
- `mjml` para templates responsive

**Archivos a crear:**
- `backend/src/services/emailService.ts`
- `backend/src/templates/email-invoice.mjml`
- Agregar botón en `SalesPage.tsx`

**Estimación:** 4-5 días

---

## 📊 Prioridad Media (Mediano Plazo)

### 6. Reportes Avanzados
**Estado:** ⚠️ Básicos implementados, faltan avanzados

**Reportes a agregar:**
- Libro IVA (ventas y compras)
- Rentabilidad por producto
- Punto de equilibrio
- Margen de ganancia por categoría
- Rotación de inventario
- Análisis ABC de productos
- Comparativo multi-período
- Gráficos interactivos (Chart.js)

**Estimación:** 7-10 días

---

### 7. Lotes y Vencimientos
**Estado:** ❌ No implementado

**Funcionalidades:**
- Gestión de productos por lote
- Fecha de vencimiento por lote
- FIFO/LIFO
- Alertas de productos próximos a vencer
- Trazabilidad completa
- Reporte de vencimientos

**Impacto:** Cambios significativos en modelo de datos

**Estimación:** 10-15 días

---

### 8. Sistema de Permisos Granular
**Estado:** ⚠️ Básico (solo roles: admin/user)

**Funcionalidades:**
- Permisos por módulo (ventas, compras, reportes)
- Permisos por acción (crear, leer, editar, eliminar)
- Grupos de permisos
- UI para gestión de permisos
- Herencia de permisos

**Archivos a modificar:**
- `backend/src/middleware/permissionMiddleware.ts`
- Agregar tabla `Permission` en Prisma
- UI en `frontend/src/pages/users/PermissionsPage.tsx`

**Estimación:** 5-7 días

---

### 9. Editor Visual de Templates de Impresión
**Estado:** ❌ No implementado (templates en JSON manual)

**Funcionalidades:**
- Interfaz drag & drop
- Preview en tiempo real
- Guardar templates en base de datos
- Versiones de templates
- Galería de templates predefinidos

**Librería sugerida:** `grapesjs` o custom con React DnD

**Estimación:** 15-20 días (feature grande)

---

### 10. Backup Automático
**Estado:** ❌ No implementado

**Funcionalidades:**
- Backup diario automático de base de datos
- Almacenamiento en S3/Cloud Storage
- Rotación de backups (mantener últimos 30 días)
- Restore desde panel de admin
- Notificación si falla backup

**Script a crear:**
- `backend/scripts/backup-db.sh`
- Cron job o scheduler

**Estimación:** 2-3 días

---

## 🎯 Prioridad Baja (Largo Plazo)

### 11. Multi-moneda
**Estado:** ❌ No implementado (solo pesos argentinos)

**Funcionalidades:**
- Configurar monedas por tenant
- Cotizaciones automáticas (API)
- Conversión automática en reportes
- Precios en múltiples monedas

**Estimación:** 7-10 días

---

### 12. Integración con Mercado Pago
**Estado:** ❌ No implementado

**Funcionalidades:**
- Cobro con QR de Mercado Pago
- Link de pago
- Webhook para confirmación
- Conciliación automática

**Estimación:** 5-7 días

---

### 13. Integración con Mercado Libre
**Estado:** ❌ No implementado

**Funcionalidades:**
- Sincronización de stock
- Publicar productos
- Importar ventas de ML
- Actualización automática de precios

**Estimación:** 10-15 días

---

### 14. App Móvil
**Estado:** ❌ No implementado

**Tecnología:** React Native o PWA

**Funcionalidades:**
- Punto de venta móvil
- Consulta de stock
- Ver clientes y productos
- Dashboard mobile

**Estimación:** 30-45 días (proyecto grande)

---

### 15. Facturación Recurrente
**Estado:** ❌ No implementado

**Funcionalidades:**
- Suscripciones mensuales/anuales
- Generación automática de facturas
- Notificación previa al cobro
- Gestión de renovaciones

**Estimación:** 7-10 días

---

### 16. Órdenes de Trabajo / Servicio Técnico
**Estado:** ❌ No implementado

**Funcionalidades:**
- Crear orden de trabajo
- Asignar técnico
- Estados: pendiente, en curso, completado
- Tiempo de trabajo
- Repuestos usados
- Garantías

**Estimación:** 15-20 días

---

### 17. API Pública y Webhooks
**Estado:** ❌ No implementado

**Funcionalidades:**
- API REST documentada (OpenAPI/Swagger)
- API Keys por tenant
- Rate limiting
- Webhooks configurables
- Ejemplos de integración

**Estimación:** 10-15 días

---

### 18. Sistema de Auditoría Completo
**Estado:** ⚠️ Parcial (hay timestamps pero no log de cambios)

**Funcionalidades:**
- Log de todos los cambios (quién, qué, cuándo)
- Ver historial de cambios de cualquier registro
- Rollback de cambios (opcional)
- Reporte de auditoría

**Tabla nueva:** `AuditLog`

**Estimación:** 5-7 días

---

### 19. Notificaciones en Tiempo Real
**Estado:** ❌ No implementado

**Tecnología:** WebSockets (Socket.io)

**Funcionalidades:**
- Notificación de nueva venta
- Alerta de stock bajo
- Vencimientos próximos
- Mensajes del sistema

**Estimación:** 5-7 días

---

### 20. Modo Offline (PWA)
**Estado:** ❌ No implementado

**Funcionalidades:**
- Funcionar sin conexión
- Sincronización al reconectar
- Service Worker
- Cache de datos críticos

**Estimación:** 10-15 días

---

## 🔧 Mejoras Técnicas

### 21. Testing
**Estado:** ❌ No implementado

**A implementar:**
- Unit tests (Backend: Jest, Frontend: Vitest)
- Integration tests
- E2E tests (Playwright)
- Coverage > 70%

**Estimación:** 15-20 días inicial, luego continuo

---

### 22. CI/CD Pipeline
**Estado:** ❌ No implementado

**Funcionalidades:**
- GitHub Actions
- Tests automáticos en PR
- Deploy automático a staging
- Deploy manual a producción

**Estimación:** 3-5 días

---

### 23. Monitoreo y Logs
**Estado:** ⚠️ Básico (console.log)

**Mejorar con:**
- Winston/Pino para logs estructurados
- Sentry para error tracking
- Grafana/Prometheus para métricas
- Health checks

**Estimación:** 3-5 días

---

### 24. Performance
**Estado:** ⚠️ Sin optimizar

**Optimizaciones:**
- Paginación en todos los listados
- Índices de base de datos optimizados
- Query optimization
- Caching con Redis
- CDN para assets
- Code splitting en frontend

**Estimación:** 5-10 días

---

### 25. Documentación API
**Estado:** ❌ No implementado

**A implementar:**
- Swagger/OpenAPI
- Ejemplos de requests
- Postman collection
- Guía de integración

**Estimación:** 3-5 días

---

## 📝 Resumen por Prioridad

### 🔴 Crítico (1-2 meses)
1. Cuenta corriente de clientes
2. Presupuestos/Cotizaciones
3. Alertas de stock
4. Exportación de reportes
5. Envío de comprobantes por email

**Total estimado:** 17-24 días

---

### 🟡 Importante (3-6 meses)
6. Reportes avanzados
7. Lotes y vencimientos
8. Permisos granulares
9. Editor visual de templates
10. Backup automático

**Total estimado:** 39-54 días

---

### 🟢 Futuro (6+ meses)
11-25. Resto de funcionalidades

**Total estimado:** 180-280 días

---

## 🎯 Recomendación de Orden de Desarrollo

Basado en impacto vs esfuerzo:

1. ~~**Semana 1-2:** Presupuestos/Cotizaciones~~ ✅ COMPLETADO
2. ~~**Semana 3-4:** Pedidos con reserva de stock~~ ✅ COMPLETADO
3. **Siguiente:** Cuenta corriente clientes
4. **Después:** Alertas de stock + Exportación de reportes
5. **Luego:** Reportes avanzados (Libro IVA, Rentabilidad)
6. **Futuro:** Backup automático + Testing básico
7. **Largo plazo:** Lotes y vencimientos, Permisos granulares

---

## 💡 Notas

- Las estimaciones son para un desarrollador full-time
- Pueden variar según complejidad y cambios en requerimientos
- Prioridades pueden cambiar según necesidades del negocio
- Testing debería ser continuo, no solo al final

---

**Última actualización:** 2025-12-21
**Próxima revisión:** Mensual
