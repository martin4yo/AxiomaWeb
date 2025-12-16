# Plan: Wizard de Configuración de Tenant

## 📊 Objetivo
Crear un wizard paso a paso que guíe a los nuevos usuarios a configurar completamente su tenant, desde datos básicos hasta la configuración de impresión y facturación electrónica.

## 🎯 Alcance

### Funcionalidades
1. **Wizard de 11 pasos** con navegación fluida
2. **Validación en cada paso** antes de avanzar
3. **Guardar progreso** automáticamente
4. **Omitir pasos opcionales**
5. **Vista previa** de configuración antes de finalizar
6. **Onboarding interactivo** con tips y ejemplos
7. **Integración con configuración existente**

## 📝 Los 11 Pasos del Wizard

### Paso 1: Bienvenida
**Objetivo:** Dar la bienvenida y explicar el proceso

**Contenido:**
- Mensaje de bienvenida
- Explicación de qué se va a configurar (5-10 minutos)
- Beneficios de completar el wizard
- Botón "Comenzar"

**Campos:** Ninguno
**Validación:** Ninguna
**Opcional:** No

---

### Paso 2: Datos del Negocio
**Objetivo:** Configurar información básica de la empresa

**Campos:**
- ✅ Nombre comercial (businessName)
- ✅ CUIT
- ✅ Dirección
- ✅ Teléfono
- ✅ Email
- 🆕 Logo (URL) - opcional
- ✅ Condición de IVA (selector)
- ✅ Ingresos Brutos - opcional
- ✅ Fecha de inicio de actividades

**Validación:**
- CUIT debe tener formato válido (XX-XXXXXXXX-X)
- Email debe ser válido
- Condición de IVA es requerida

**Opcional:** No (pero algunos campos dentro del paso sí)

---

### Paso 3: Configuración Fiscal AFIP
**Objetivo:** Configurar certificados y conexión con AFIP

**Campos:**
- Ambiente (Testing / Producción)
- Certificado (.crt) - upload
- Clave privada (.key) - upload
- Punto de venta (número)
- Verificar conexión (botón test)

**Validación:**
- Certificado y clave son requeridos
- Punto de venta debe ser numérico (1-9999)
- Test de conexión debe ser exitoso para continuar

**Opcional:** Sí (puede configurarse después)

---

### Paso 4: Tipos de Comprobantes
**Objetivo:** Configurar qué tipos de comprobantes va a emitir

**Campos:**
- ☑ Factura A
- ☑ Factura B
- ☑ Factura C
- ☑ Nota de Crédito A
- ☑ Nota de Crédito B
- ☑ Nota de Crédito C
- ☑ Nota de Débito A
- ☑ Nota de Débito B
- ☑ Presupuestos

**Validación:**
- Al menos 1 tipo de factura debe estar seleccionado

**Opcional:** No

---

### Paso 5: Configuración de Impresión
**Objetivo:** Configurar templates de impresión por tipo de comprobante

**Para cada tipo seleccionado en paso 4:**
- Template a usar (dropdown: térmico 58mm, 80mm, A4 legal, A4 presupuesto)
- Imprimir automáticamente (checkbox)

**Validación:**
- Cada tipo de comprobante debe tener un template asignado

**Opcional:** Parcial (puede usar defaults)

---

### Paso 6: Formas de Pago
**Objetivo:** Configurar métodos de pago disponibles

**Campos:**
- Lista de formas de pago predefinidas con checkboxes (activadas por defecto):
  - ☑ Efectivo
  - ☑ Tarjeta de Débito
  - ☑ Tarjeta de Crédito
  - ☑ Transferencia
  - ☑ Cheque
  - ☑ Mercado Pago
  - ☑ Cuenta Corriente
- Botón "Agregar forma de pago personalizada"

**Datos del Seed:**
```typescript
// Estos métodos de pago se crearán automáticamente si no existen
const defaultPaymentMethods = [
  { code: 'CASH', name: 'Efectivo', icon: 'cash' },
  { code: 'DEBIT', name: 'Tarjeta de Débito', icon: 'credit-card' },
  { code: 'CREDIT', name: 'Tarjeta de Crédito', icon: 'credit-card' },
  { code: 'TRANSFER', name: 'Transferencia', icon: 'arrow-right-left' },
  { code: 'CHECK', name: 'Cheque', icon: 'file-text' },
  { code: 'MP', name: 'Mercado Pago', icon: 'smartphone' },
  { code: 'CC', name: 'Cuenta Corriente', icon: 'file-invoice' }
]
```

**Validación:**
- Al menos 1 forma de pago debe estar habilitada

**Opcional:** No

---

### Paso 7: Categorías de Productos
**Objetivo:** Crear categorías iniciales para organizar productos

**Campos:**
- Input para agregar categorías (una por una)
- Lista de categorías predefinidas sugeridas (activadas por defecto):
  - ☑ Productos
  - ☑ Servicios
  - ☑ Insumos
  - ☑ Repuestos
  - ☑ Otros
- Opción de importar desde Excel/CSV

**Datos del Seed:**
```typescript
// Categorías sugeridas que se crearán si se activan
const defaultCategories = [
  { code: 'PROD', name: 'Productos', description: 'Productos físicos para la venta' },
  { code: 'SERV', name: 'Servicios', description: 'Servicios que ofrece la empresa' },
  { code: 'INSU', name: 'Insumos', description: 'Insumos y materias primas' },
  { code: 'REPR', name: 'Repuestos', description: 'Repuestos y accesorios' },
  { code: 'OTRO', name: 'Otros', description: 'Otros productos sin categoría específica' }
]
```

**Validación:**
- Al menos 1 categoría debe existir

**Opcional:** Parcial (puede usar "Sin Categoría")

---

### Paso 8: Almacenes
**Objetivo:** Configurar almacenes/depósitos para control de stock

**Campos:**
- Nombre del almacén principal (default: "Almacén Principal")
- Código (default: "MAIN")
- Dirección (opcional)
- ☑ Permitir stock negativo
- ☑ Es almacén por defecto
- Botón "Agregar almacén adicional"

**Datos del Seed:**
```typescript
// Almacén que se crea por defecto
const defaultWarehouse = {
  code: 'MAIN',
  name: 'Almacén Principal',
  description: 'Almacén principal de la empresa',
  address: '', // Se puede completar
  isActive: true,
  isDefault: true,
  allowNegativeStock: false  // Se puede configurar
}
```

**Validación:**
- Al menos 1 almacén debe existir
- Nombre y código no pueden estar vacíos
- Solo puede haber 1 almacén por defecto

**Opcional:** No (pero se crea uno por default)

---

### Paso 9: Impresora Térmica (QZ Tray)
**Objetivo:** Configurar impresora térmica para tickets

**Contenido:**
- Explicación de QZ Tray
- Link de descarga
- Estado de conexión
- Selector de impresora
- Botón "Probar impresión"

**Validación:**
- Ninguna (completamente opcional)

**Opcional:** Sí

---

### Paso 10: Usuarios y Permisos
**Objetivo:** Invitar usuarios adicionales al sistema

**Campos:**
- Email del usuario a invitar
- Rol (Admin / Usuario)
- Lista de usuarios invitados
- Botón "Agregar usuario"

**Validación:**
- Email debe ser válido
- No puede invitar el mismo email dos veces

**Opcional:** Sí

---

### Paso 11: Resumen y Finalización
**Objetivo:** Mostrar resumen de configuración y finalizar

**Contenido:**
- Vista previa de toda la configuración:
  - ✓ Datos del negocio
  - ✓ Configuración AFIP
  - ✓ X comprobantes configurados
  - ✓ X formas de pago
  - ✓ X categorías
  - ✓ X almacenes
  - ✓ Impresora: [Configurada / No configurada]
  - ✓ X usuarios invitados
- Mensaje de éxito
- Botón "Ir al Dashboard"
- Checkbox "No volver a mostrar este wizard"

**Validación:** Ninguna
**Opcional:** No

---

## 🔄 Integración con Datos del Seed

El wizard debe crear automáticamente los mismos datos que el seed (`src/seed.ts`), pero permitiendo al usuario personalizarlos:

### Datos que se crean automáticamente:

1. **VoucherTypes** (Ya existen globalmente)
   - Factura A, B, C (código AFIP 1, 6, 11)
   - Nota de Crédito A, B, C (código AFIP 3, 8, 13)
   - Nota de Débito A, B, C (código AFIP 2, 7, 12)
   - Presupuesto (sin código AFIP)

2. **VatConditions** (Ya existen en el tenant)
   - RI: Responsable Inscripto (AFIP código 1)
   - MT: Monotributo (AFIP código 6)
   - CF: Consumidor Final (AFIP código 5)
   - EX: Exento (AFIP código 4)
   - NR: No Responsable (AFIP código 7)

3. **Branch** (Sucursal por defecto)
   ```typescript
   {
     code: 'CENTRAL',
     name: 'Casa Central',
     addressLine1: '', // Se completa con dirección del negocio
     isDefault: true
   }
   ```

4. **AfipConnection** (Configuración AFIP)
   ```typescript
   {
     name: 'Testing AFIP' // o 'Producción AFIP' según paso 3
     cuit: '', // Del paso 2
     environment: 'testing' o 'production',
     isActive: true
   }
   ```

5. **SalesPoint** (Punto de venta)
   ```typescript
   {
     number: 1,
     name: 'Punto de Venta 1',
     isActive: true
   }
   ```

6. **VoucherConfiguration** (Por cada tipo activado en paso 4)
   ```typescript
   {
     voucherTypeId: '', // FA, FB, FC, etc.
     branchId: '', // CENTRAL
     afipConnectionId: '',
     salesPointId: '',
     nextVoucherNumber: 1,
     printTemplate: '', // Del paso 5
     isActive: true
   }
   ```

7. **PaymentMethods** (Seleccionados en paso 6)
8. **ProductCategories** (Seleccionadas en paso 7)
9. **Warehouses** (Configurado en paso 8)

### Diferencias con el Seed Manual:

| Característica | Seed Manual | Wizard |
|----------------|-------------|---------|
| Tenant | Crea "demo" | Usa el tenant actual |
| Usuario | Crea demo@axioma.com | Usa el usuario logueado |
| Productos | Crea 4 productos demo | No crea productos |
| Clientes | Crea 3 entidades demo | No crea clientes |
| Stock inicial | Crea movimientos | No crea stock |
| Usuarios adicionales | No invita | Permite invitar (paso 10) |

**El wizard NO debe crear:**
- Productos de demostración
- Clientes o proveedores de ejemplo
- Movimientos de stock iniciales
- Ventas de prueba

Estos datos los crea el usuario después del wizard, usando el sistema normalmente.

---

## 🗄️ Schema de Base de Datos

### Agregar campo a Tenant
```prisma
model Tenant {
  // ... campos existentes

  // Wizard
  wizardCompleted  Boolean  @default(false) @map("wizard_completed")
  wizardStep       Int      @default(0) @map("wizard_step") // Último paso completado

  @@map("tenants")
}
```

---

## 🎨 Componentes Frontend

### Estructura de archivos
```
frontend/src/
├── pages/
│   └── onboarding/
│       ├── OnboardingWizardPage.tsx          # Página principal
│       └── steps/
│           ├── Step1Welcome.tsx
│           ├── Step2BusinessInfo.tsx
│           ├── Step3AfipConfig.tsx
│           ├── Step4VoucherTypes.tsx
│           ├── Step5PrintConfig.tsx
│           ├── Step6PaymentMethods.tsx
│           ├── Step7ProductCategories.tsx
│           ├── Step8Warehouses.tsx
│           ├── Step9ThermalPrinter.tsx
│           ├── Step10Users.tsx
│           └── Step11Summary.tsx
├── components/
│   └── wizard/
│       ├── WizardContainer.tsx              # Contenedor con navegación
│       ├── WizardProgress.tsx               # Barra de progreso
│       ├── WizardNavigation.tsx             # Botones Anterior/Siguiente
│       └── WizardStep.tsx                   # Wrapper para cada paso
└── hooks/
    └── useWizard.ts                         # Hook para manejar estado del wizard
```

---

## 🔄 Flujo de Datos

### 1. Inicio del Wizard
```typescript
// Al hacer login, verificar si el wizard fue completado
if (!currentTenant.wizardCompleted) {
  // Redirigir a /onboarding
  navigate('/onboarding');
}
```

### 2. Navegación entre pasos
```typescript
// useWizard.ts
const useWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({});

  const nextStep = async () => {
    // Validar paso actual
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    // Guardar datos del paso
    await saveStepData(currentStep, wizardData);

    // Avanzar
    setCurrentStep(currentStep + 1);
  };

  const previousStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const skipStep = () => {
    setCurrentStep(currentStep + 1);
  };

  return { currentStep, nextStep, previousStep, skipStep, wizardData, setWizardData };
};
```

### 3. Guardar progreso
```typescript
// Cada vez que se completa un paso, guardar en backend
const saveStepData = async (step: number, data: any) => {
  await api.put(`/${tenantSlug}/onboarding/step/${step}`, {
    wizardStep: step,
    ...data
  });
};
```

### 4. Finalizar wizard
```typescript
const completeWizard = async () => {
  await api.put(`/${tenantSlug}/onboarding/complete`, {
    wizardCompleted: true,
    wizardStep: 11
  });

  // Redirigir al dashboard
  navigate('/dashboard');
};
```

---

## 🎨 Diseño UI

### Barra de progreso
```
[1●]──[2●]──[3○]──[4○]──[5○]──[6○]──[7○]──[8○]──[9○]──[10○]──[11○]
 Bienvenida  Datos    AFIP   Tipos   Impres  Pagos   Categ   Almac   QZTray  Users  Resumen
```

### Layout de cada paso
```
┌─────────────────────────────────────────────────────────┐
│ [Barra de Progreso]                            Paso X/11│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📋 Título del Paso                                      │
│  Descripción breve de qué se configura en este paso     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │  [Formulario / Contenido del paso]               │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  💡 Tip: Consejo útil sobre esta configuración          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Omitir]            [← Anterior]  [Siguiente →]        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Backend Routes

```typescript
// backend/src/routes/onboarding.ts

router.get('/:tenantSlug/onboarding/status', getOnboardingStatus);
// Retorna: { wizardCompleted, wizardStep, data }

router.put('/:tenantSlug/onboarding/step/:step', saveStepData);
// Guarda datos parciales del wizard

router.put('/:tenantSlug/onboarding/complete', completeWizard);
// Marca el wizard como completado

router.post('/:tenantSlug/onboarding/skip', skipWizard);
// Permite omitir el wizard completamente (solo admin)
```

---

## 📅 Estimación de Tiempo

| Tarea | Duración | Estado |
|-------|----------|--------|
| 1. Schema Prisma + Migración | 30 min | ⏳ |
| 2. Componentes base (Container, Progress, Navigation) | 2-3 horas | ⏳ |
| 3. Paso 1: Bienvenida | 1 hora | ⏳ |
| 4. Paso 2: Datos del Negocio | 2 horas | ⏳ |
| 5. Paso 3: Config AFIP | 3 horas | ⏳ |
| 6. Paso 4: Tipos de Comprobantes | 2 horas | ⏳ |
| 7. Paso 5: Config Impresión | 2-3 horas | ⏳ |
| 8. Paso 6: Formas de Pago | 2 horas | ⏳ |
| 9. Paso 7: Categorías | 2 horas | ⏳ |
| 10. Paso 8: Almacenes | 2 horas | ⏳ |
| 11. Paso 9: QZ Tray | 2 horas | ⏳ |
| 12. Paso 10: Usuarios | 2 horas | ⏳ |
| 13. Paso 11: Resumen | 2 horas | ⏳ |
| 14. Backend endpoints | 2-3 horas | ⏳ |
| 15. Integración y testing | 3-4 horas | ⏳ |
| **TOTAL** | **27-35 horas (~4-5 días)** | |

---

## ✅ Criterios de Aceptación

1. ✅ El wizard se muestra automáticamente a usuarios nuevos
2. ✅ Todos los 11 pasos son navegables
3. ✅ La validación impide avanzar si faltan datos requeridos
4. ✅ El progreso se guarda automáticamente
5. ✅ Se puede volver a pasos anteriores
6. ✅ Los pasos opcionales se pueden omitir
7. ✅ El resumen muestra toda la configuración realizada
8. ✅ Al finalizar, el wizard no vuelve a mostrarse
9. ✅ El diseño es responsive y amigable
10. ✅ Hay tooltips y ayuda contextual en cada paso

---

## 🚀 Mejoras Futuras (Post-MVP)

1. **Importación masiva** en pasos de categorías/productos
2. **Video tutorials** integrados en cada paso
3. **Plantillas predefinidas** según tipo de negocio (retail, servicios, etc.)
4. **Modo guiado vs experto** (wizard completo o configuración rápida)
5. **Poder reabrir el wizard** desde configuración para reconfigurar
6. **Analytics** de qué pasos tardan más o tienen más abandono

---

**Fecha de creación:** 15/12/2025
**Autor:** Claude Code
**Versión:** 1.0
