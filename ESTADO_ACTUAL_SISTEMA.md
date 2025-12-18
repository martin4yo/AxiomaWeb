# Estado Actual del Sistema - AxiomaWeb ERP
**Última actualización**: 18 de Diciembre 2024

## 🎯 Resumen de la Sesión

### Funcionalidades Implementadas

#### 1. Wizard de Onboarding - Mejoras Críticas
✅ **Problema resuelto**: Página en blanco al iniciar onboarding
- LoginPage y RegisterPage ahora redirigen directamente a `/onboarding` cuando `wizardCompleted = false`
- Eliminado race condition entre actualización del store y renderizado de App.tsx
- Archivos modificados:
  - `frontend/src/pages/auth/LoginPage.tsx` (líneas 38-44)
  - `frontend/src/pages/auth/RegisterPage.tsx` (líneas 62-66)

✅ **Nombre del tenant visible en wizard**
- Header del wizard muestra "Configuración inicial • [Nombre Tenant]"
- Archivo: `frontend/src/components/wizard/WizardContainer.tsx` (líneas 30-35)

✅ **Fix validaciones de selecciones por defecto**
- Step 4 (Tipos de Comprobantes): useEffect inicializa selecciones
- Step 6 (Formas de Pago): useEffect inicializa selecciones
- Step 7 (Categorías de Productos): useEffect inicializa selecciones
- Archivos:
  - `frontend/src/pages/onboarding/steps/Step4VoucherTypes.tsx` (líneas 25-30)
  - `frontend/src/pages/onboarding/steps/Step6PaymentMethods.tsx` (líneas 25-30)
  - `frontend/src/pages/onboarding/steps/Step7ProductCategories.tsx` (líneas 24-29)

✅ **Fix validación de slug en registro**
- Cambiado de manipulación DOM a `setValue()` de react-hook-form
- Archivo: `frontend/src/pages/auth/RegisterPage.tsx` (línea 52)

#### 2. Sistema de Comprobantes - Lógica por Condición IVA

✅ **Nueva arquitectura de configuración de comprobantes**
- Agregado campo `vatConditionId` a `VoucherConfiguration`
- Migración: `20251218113614_add_vat_condition_to_voucher_config`
- Constraint único: `[tenantId, voucherTypeId, branchId, vatConditionId]`
- Schema: `backend/prisma/schema.prisma` (línea 987, 1004, 1007)

✅ **Lógica implementada en onboarding**
- **Monotributista (MT)**:
  - Crea FC, PRE, NCC, NDC con `vatConditionId = null` (aplica para todas)
- **Responsable Inscripto (RI)**:
  - Para clientes RI: Crea FA, PRE, NCA, NDA vinculadas a condición "RI"
  - Para clientes CF/MT/EX: Crea FB, PRE, NCB, NDB vinculadas a cada condición
- Archivo: `backend/src/routes/onboarding.ts` (líneas 277-342)

#### 3. Tipos de Cuenta - Estandarización

✅ **Migración de valores de accountType**
- **Antes**: `cash`, `bank`, `mercadopago`, `other`
- **Ahora**: `CASH`, `CARD`, `TRANSFER`, `CHECK`, `OTHER`
- Sincronizado con `paymentType` de PaymentMethod
- Archivos actualizados:
  - `backend/src/routes/onboarding.ts` (línea 142-143)
  - `frontend/src/pages/cash/CashAccountsPage.tsx` (líneas 47, 111, 158-165, 416-420, 529-533)

✅ **Creación automática de cuentas de fondos**
- El onboarding crea una cuenta de fondos por cada forma de pago
- Excepción: No crea cuenta para "Cuenta Corriente" (CC)
- Mapeo correcto de `paymentType` a `accountType`
- Archivo: `backend/src/routes/onboarding.ts` (líneas 128-151)

#### 4. Limpieza de Base de Datos

✅ **Eliminación de tenants de prueba**
- Eliminado tenant "KeySoft" y usuario huérfano (martin4yo@gmail.com)
- Query de limpieza de usuarios huérfanos implementada

---

## 📊 Arquitectura de Comprobantes

### Flujo de Datos
```
VoucherType (catálogo global)
    ↓
VoucherConfiguration (configuración por tenant + condición IVA)
    ↓
Sale (comprobante emitido - ES el voucher)
```

### Relaciones Clave
- **VoucherType**: Define QUÉ tipos existen (FA, FB, FC, etc.)
- **VoucherConfiguration**: Define CÓMO cada tenant usa cada tipo
- **Sale**: ES el comprobante emitido con CAE, número, etc.
- **NO existe tabla Voucher separada** - las ventas SON los comprobantes

---

## 🔧 Cambios Técnicos Importantes

### Base de Datos
1. Nueva columna: `voucher_configurations.vat_condition_id`
2. Nuevo constraint único en VoucherConfiguration
3. Nueva relación: VatCondition ↔ VoucherConfiguration

### Frontend
1. Redirección directa al onboarding desde login/register
2. Inicialización de formularios con useEffect
3. Valores estandarizados para accountType

### Backend
1. Lógica de creación de configuraciones por condición IVA
2. Auto-creación de cuentas de fondos
3. Mapeo correcto de tipos de pago a tipos de cuenta

---

## 📝 Próximos Pasos Sugeridos

### Prioritarios
1. **Probar el onboarding completo** con un tenant nuevo:
   - Registrar empresa
   - Completar wizard paso a paso
   - Verificar creación de:
     - Formas de pago
     - Cuentas de fondos
     - Configuraciones de comprobantes por condición IVA
     - Categorías de productos
     - Almacenes

2. **Validar lógica de comprobantes**:
   - Crear venta para cliente RI (debe generar FA)
   - Crear venta para cliente CF (debe generar FB o FC según tenant)

### Mejoras Futuras
1. Módulo de Presupuestos (backend ya implementado)
2. Sistema de Contabilidad (planificado)
3. Listas de Precios (planificado)

---

## 🗂️ Archivos Clave Modificados

### Backend
- `backend/prisma/schema.prisma` - Campo vatConditionId
- `backend/src/routes/onboarding.ts` - Lógica de configuración
- `backend/src/routes/quotes.ts` - Rutas de presupuestos (nuevo)
- `backend/src/services/quoteService.ts` - Servicio de presupuestos (nuevo)

### Frontend
- `frontend/src/pages/auth/LoginPage.tsx` - Redirección onboarding
- `frontend/src/pages/auth/RegisterPage.tsx` - Redirección onboarding
- `frontend/src/components/wizard/WizardContainer.tsx` - Mostrar tenant
- `frontend/src/pages/onboarding/steps/Step*.tsx` - Fix validaciones
- `frontend/src/pages/cash/CashAccountsPage.tsx` - Tipos estandarizados

### Documentación Nueva
- `PLAN_CONTABILIDAD.md`
- `PLAN_CONTABILIDAD_CASOS_USO.md`
- `PLAN_CONTABILIDAD_REPORTES.md`
- `PLAN_CONTABILIDAD_ROADMAP.md`
- `PLAN_LISTAS_PRECIOS.md`
- `PRESUPUESTOS_IMPLEMENTACION_COMPLETA.md`
- `docs/PRESUPUESTOS_GUIA_USUARIO.md`

---

## 💾 Estado de la Base de Datos

**Servidor**: 149.50.148.198:5432
**Base de Datos**: axiomaweb_db
**Migración actual**: 20251218113614_add_vat_condition_to_voucher_config

### Tablas Principales Afectadas
- `voucher_configurations` - Nueva columna vat_condition_id
- `cash_accounts` - Estandarización de account_type
- `tenants` - Limpieza completada
- `users` - Usuarios huérfanos eliminados

---

## ✅ Checklist de Testing

- [ ] Registrar nuevo tenant
- [ ] Completar wizard onboarding
- [ ] Verificar creación de formas de pago (7 items)
- [ ] Verificar creación de cuentas de fondos (6 items, sin CC)
- [ ] Verificar configuraciones de comprobantes por condición IVA
- [ ] Crear venta a cliente RI
- [ ] Crear venta a cliente CF
- [ ] Validar tipos de comprobantes según lógica de negocio

---

**Commit**: 2f81b66
**Branch**: master
**Pushed to**: GitHub ✓
