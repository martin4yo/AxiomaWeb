# 🗺️ AxiomaWeb ERP - Roadmap Completo

## 📊 Estado Actual del Proyecto

**Versión:** 1.0 (Beta)
**Fecha:** Diciembre 2024
**Cobertura Funcional:** ~40% de un ERP completo
**Estado:** ✅ Producción para retail y pequeñas empresas

---

## 🎯 Módulos Implementados (11)

### ✅ 1. Gestión Multitenancy
- [x] Tenants (clientes del SaaS)
- [x] Usuarios por tenant
- [x] Roles y permisos
- [x] Configuración aislada

### ✅ 2. Maestros Básicos
- [x] Productos (SKU, precios, stock)
- [x] Categorías de productos
- [x] Marcas de productos
- [x] Entidades unificadas (clientes/proveedores/empleados)
- [x] Categorías de clientes
- [x] Direcciones de entrega
- [x] Formas de pago
- [x] Condiciones de IVA

### ✅ 3. Inventario y Stock
- [x] Almacenes/Depósitos
- [x] Stock por almacén
- [x] Movimientos (IN/OUT/TRANSFER)
- [x] Ajustes de inventario
- [x] Alertas de stock (min/max/reorder)
- [x] Control de stock negativo
- [x] Dashboard de alertas

### ✅ 4. Ventas
- [x] Punto de venta (POS)
- [x] Múltiples formas de pago
- [x] Descuentos por item y general
- [x] Cliente final o registrado
- [x] Estados de pago
- [x] Historial y consultas

### ✅ 5. Compras
- [x] Registro de compras
- [x] Items con precios
- [x] Pagos de compras
- [x] Estado de cuenta proveedores
- [x] Fechas de vencimiento

### ✅ 6. Facturación Electrónica AFIP
- [x] Conexiones AFIP (testing/production)
- [x] Certificados digitales
- [x] Puntos de venta
- [x] Tipos de comprobante (FA/FB/FC)
- [x] Solicitud CAE
- [x] Reintento CAE
- [x] QR de validación
- [x] Determinación automática

---

## 🔴 PRIORIDAD CRÍTICA - Q1 2025 (Enero-Marzo)

### 1️⃣ Cuenta Corriente de Clientes
**Duración:** 3-4 días | **Impacto:** 🔴 CRÍTICO

**Tareas:**
- [ ] Crear modelo CustomerAccount en Prisma
- [ ] Service con cálculo de saldos
- [ ] Endpoints: estado de cuenta, movimientos, pagos
- [ ] Frontend: página de cuenta corriente
- [ ] Exportación a PDF
- [ ] Testing completo

---

### 2️⃣ Notas de Crédito y Débito AFIP
**Duración:** 4-5 días | **Impacto:** 🔴 CRÍTICO (obligación legal)

**Tareas:**
- [ ] Extender modelo Sale con campos NC/ND
- [ ] Lógica de reversión de stock (NC)
- [ ] Integración AFIP para NC/ND
- [ ] Endpoints para crear NC/ND
- [ ] Frontend: modales de NC/ND
- [ ] Aplicación a cuenta corriente
- [ ] Impresión fiscal
- [ ] Testing AFIP homologación

---

### 3️⃣ Presupuestos y Cotizaciones
**Duración:** 3 días | **Impacto:** 🟡 ALTO

**Tareas:**
- [ ] Modelo Quote con items
- [ ] Service completo
- [ ] Endpoints CRUD
- [ ] Conversión automática a venta
- [ ] Frontend: gestión de presupuestos
- [ ] Impresión de presupuesto
- [ ] Notificaciones de expiración

---

## 🟡 PRIORIDAD ALTA - Q2 2025 (Abril-Junio)

### 4️⃣ Listas de Precios Múltiples
**Duración:** 4 días | **Impacto:** 🟡 ALTO

**Tareas:**
- [ ] Modelos PriceList y PriceListItem
- [ ] Asignación a categorías de clientes
- [ ] Precios escalonados (por cantidad)
- [ ] Reglas de redondeo
- [ ] Endpoints CRUD
- [ ] Frontend: gestión de listas
- [ ] Importación desde Excel
- [ ] Aplicación automática en ventas

---

### 5️⃣ Remitos y Guías de Entrega
**Duración:** 3 días | **Impacto:** 🟡 MEDIO-ALTO

**Tareas:**
- [ ] Modelo DeliveryNote
- [ ] Service completo
- [ ] Conversión remito → factura
- [ ] Frontend: gestión de remitos
- [ ] Impresión de remito
- [ ] Tracking de estado

---

### 6️⃣ Gestión de Cheques
**Duración:** 3 días | **Impacto:** 🟡 MEDIO

**Tareas:**
- [ ] Modelo Check
- [ ] Estados y transiciones
- [ ] Cartera de cheques
- [ ] Frontend: gestión
- [ ] Alertas de vencimiento

---

### 7️⃣ Lotes y Trazabilidad
**Duración:** 5 días | **Impacto:** 🟡 ALTO (vertical)

**Tareas:**
- [ ] Modelo ProductLot
- [ ] Asignación en compras
- [ ] Selección FIFO en ventas
- [ ] Frontend: gestión de lotes
- [ ] Alertas de vencimiento
- [ ] Reportes de trazabilidad

---

## 🟢 PRIORIDAD MEDIA - Q3 2025 (Julio-Septiembre)

### 8️⃣ Producción Básica (10 días)
### 9️⃣ CRM Básico (7 días)
### 🔟 Integraciones E-commerce (10 días)

---

## 🔵 PRIORIDAD BAJA - Q4 2025 (Octubre-Diciembre)

### 1️⃣1️⃣ Contabilidad (15 días)
### 1️⃣2️⃣ Reportes Avanzados (8 días)
### 1️⃣3️⃣ WhatsApp Business (5 días)
### 1️⃣4️⃣ Auditoría y Seguridad (6 días)

---

## 📅 Calendario Estimado 2025

| Mes | Módulos |
|-----|---------|
| **Enero** | Cuenta Corriente + NC/ND AFIP |
| **Febrero** | Presupuestos + Listas de Precios |
| **Marzo** | Remitos + Cheques |
| **Abril-Mayo** | Lotes y Trazabilidad |
| **Junio-Julio** | Producción Básica |
| **Agosto** | CRM Básico |
| **Septiembre** | Integraciones E-commerce |
| **Octubre-Noviembre** | Contabilidad |
| **Diciembre** | Reportes + WhatsApp + Seguridad |

---

**Última actualización:** 6 de Diciembre 2024
**Próxima revisión:** 1 de Enero 2025
