# Guía de Usuario: Módulo de Presupuestos

**Sistema:** AxiomaWeb ERP
**Versión:** 1.0
**Fecha:** 18 de Diciembre de 2024

---

## 🎯 ¿Qué son los Presupuestos?

Los **Presupuestos** (o Cotizaciones) son documentos comerciales que le permiten ofrecer productos/servicios a sus clientes con precios y condiciones, **antes de realizar la venta**.

**Ventajas:**
- ✅ No afecta el stock (no descuenta mercadería)
- ✅ Permite negociar precios sin comprometer inventario
- ✅ Se puede convertir fácilmente a venta cuando el cliente acepta
- ✅ Control de conversiones parciales (cliente compra solo algunos productos)
- ✅ Historial de presupuestos por cliente

---

## 📍 ¿Dónde encuentro los Presupuestos?

En el menú lateral izquierdo, busque:

```
📊 Ventas
  └─ 📄 Presupuestos
```

O acceda directamente a: `http://localhost:8088/quotes`

---

## ➕ Crear un Nuevo Presupuesto

### Paso 1: Acceder al Formulario

1. Click en **"Presupuestos"** en el menú
2. Click en el botón **"Nuevo Presupuesto"** (esquina superior derecha)

### Paso 2: Completar Datos Básicos

#### Cliente (Opcional)
- **Con cliente:** Busque y seleccione el cliente en la lista desplegable
- **Sin cliente:** Deje en blanco para "Consumidor Final"

#### Fechas
- **Fecha del Presupuesto:** Por defecto hoy (puede modificarse)
- **Válido Hasta:** Fecha de vencimiento del presupuesto (opcional)
  - Ejemplo: Si hoy es 18/12, ponga 25/12 para dar 7 días de validez

### Paso 3: Agregar Productos

#### Buscar Producto
1. Escriba nombre o SKU del producto en el buscador
2. Los productos aparecen mientras escribe
3. Click en el producto deseado

#### Ajustar Detalles del Producto
Para cada producto agregado puede modificar:

- **Cantidad:** Use +/- o escriba directamente
- **Precio Unitario:** Por defecto usa el precio de venta del producto
  - Puede cambiarlo para hacer descuentos u ofertas especiales
- **Descuento %:** Descuento específico para esta línea
- **Descripción Personalizada:** Agregue detalles adicionales si lo desea

#### Eliminar Producto
- Click en el ícono de **papelera (🗑️)** en la fila del producto

### Paso 4: Notas y Términos (Opcional)

#### Notas del Presupuesto
Información visible para el cliente en el presupuesto (cuando se implemente el PDF).

**Ejemplos:**
- "Oferta válida por 7 días"
- "Precios sujetos a disponibilidad de stock"
- "Envío incluido para CABA"

#### Términos y Condiciones
Condiciones comerciales del presupuesto.

**Ejemplos:**
- "Forma de pago: 50% adelanto, 50% contra entrega"
- "Plazo de entrega: 3 días hábiles"
- "Garantía: 12 meses"

#### Notas Internas (Solo para uso interno)
Información que NO verá el cliente. Útil para recordatorios internos.

**Ejemplos:**
- "Cliente pidió descuento especial por volumen"
- "Contactar antes de enviar"
- "Cliente habitual, prioridad alta"

### Paso 5: Guardar Presupuesto

1. Click en **"Guardar Presupuesto"**
2. El sistema valida que haya al menos 1 producto
3. Se genera un número automático: **PRE-00000001**, **PRE-00000002**, etc.
4. Redirige automáticamente a la lista de presupuestos

---

## 📋 Ver Lista de Presupuestos

### Información Mostrada

En la lista verá:

| Columna | Descripción |
|---------|-------------|
| **Número** | PRE-00000XXX (secuencial) |
| **Fecha** | Fecha de creación del presupuesto |
| **Cliente** | Nombre del cliente (o "Consumidor Final") |
| **Total** | Monto total del presupuesto |
| **Estado** | Estado actual (ver sección Estados) |
| **Acciones** | Botones Ver / Convertir / Cancelar |

### Filtros Disponibles

#### Filtro por Fecha
- **Desde:** Fecha inicial
- **Hasta:** Fecha final
- Útil para ver presupuestos de un período específico

#### Filtro por Cliente
- Seleccione un cliente específico
- Muestra solo presupuestos de ese cliente

#### Filtro por Estado
- Pendiente
- Aprobado
- Rechazado
- Vencido
- Parcialmente Convertido
- Totalmente Convertido
- Cancelado

#### Búsqueda
- Busca por número de presupuesto (ej: "PRE-000001")
- Busca por nombre de cliente (ej: "Juan Pérez")

### Paginación
- Por defecto: 50 presupuestos por página
- Use los botones **Anterior / Siguiente** para navegar

---

## 🏷️ Estados del Presupuesto

### 🔵 PENDIENTE
**Color:** Gris
**Significado:** Presupuesto creado, esperando respuesta del cliente
**Acciones disponibles:**
- ✅ Convertir a venta
- ✅ Cambiar a Aprobado/Rechazado
- ✅ Cancelar

### 🟢 APROBADO
**Color:** Verde
**Significado:** Cliente aceptó el presupuesto
**Acciones disponibles:**
- ✅ Convertir a venta
- ✅ Cambiar a otro estado
- ✅ Cancelar

### 🔴 RECHAZADO
**Color:** Rojo
**Significado:** Cliente rechazó el presupuesto
**Acciones disponibles:**
- ❌ No se puede convertir a venta
- ✅ Se puede reactivar cambiando estado

### 🟡 VENCIDO
**Color:** Amarillo
**Significado:** Pasó la fecha "Válido Hasta"
**Acciones disponibles:**
- ❌ No se puede convertir a venta
- ✅ Se puede reactivar cambiando estado
- 💡 **Nota:** La expiración no es automática, debe cambiar el estado manualmente

### 🔵 PARCIALMENTE CONVERTIDO
**Color:** Azul
**Significado:** Parte del presupuesto ya fue convertido a venta
**Ejemplo:** Presupuesto de 10 unidades, cliente compró 3
**Acciones disponibles:**
- ✅ Convertir el resto pendiente
- ❌ No se puede cancelar (ya tiene conversiones)

### 🟣 TOTALMENTE CONVERTIDO
**Color:** Púrpura
**Significado:** Todo el presupuesto fue convertido a venta(s)
**Acciones disponibles:**
- ❌ No se puede convertir más
- ❌ No se puede cancelar
- ❌ No se puede modificar estado

### ⚫ CANCELADO
**Color:** Gris oscuro
**Significado:** Presupuesto cancelado por la empresa
**Acciones disponibles:**
- ❌ No se puede convertir a venta
- ✅ Se puede reactivar cambiando estado

---

## 💡 Convertir Presupuesto a Venta

Esta es la funcionalidad principal del módulo.

### Caso 1: Conversión Total (Cliente acepta TODO)

#### Paso a Paso:

1. En la lista de presupuestos, click en **"Convertir"** en el presupuesto deseado
2. Se abre la pantalla de **Nueva Venta** con:
   - ✅ Cliente ya seleccionado
   - ✅ Productos ya agregados al carrito
   - ✅ Cantidades, precios y descuentos ya configurados
   - ✅ Notas del presupuesto cargadas

3. **Completar datos de la venta:**
   - Seleccionar almacén (de donde se descontará stock)
   - Seleccionar forma de pago
   - Ingresar monto pagado
   - (Si corresponde) Seleccionar configuración de factura

4. Click en **"Completar Venta"**

5. **El sistema automáticamente:**
   - ✅ Crea la venta
   - ✅ Descuenta el stock del almacén seleccionado
   - ✅ Genera factura con CAE (si tiene AFIP configurado)
   - ✅ Imprime el comprobante (si está configurado)
   - ✅ Marca el presupuesto como **TOTALMENTE CONVERTIDO**
   - ✅ Actualiza cantidades convertidas en el presupuesto

6. **Resultado:**
   - Presupuesto en estado: 🟣 **TOTALMENTE CONVERTIDO**
   - Venta creada exitosamente
   - Stock actualizado

---

### Caso 2: Conversión Parcial (Cliente acepta solo PARTE)

**Ejemplo:**
- Presupuesto original: 10 unidades del Producto A
- Cliente quiere comprar solo 3 unidades hoy

#### Paso a Paso:

1. Click en **"Convertir"** en el presupuesto

2. En la pantalla de venta:
   - Productos cargados con cantidades máximas
   - **Modificar cantidad del producto:**
     - Cambiar de 10 a 3 unidades
   - El sistema respeta el máximo (cantidad pendiente)

3. Completar venta normalmente

4. **El sistema automáticamente:**
   - ✅ Crea venta con 3 unidades
   - ✅ Marca en el presupuesto:
     - Cantidad convertida: 3
     - Cantidad pendiente: 7
   - ✅ Cambia estado a 🔵 **PARCIALMENTE CONVERTIDO**

5. **Próxima compra del cliente:**
   - Vuelve a hacer click en **"Convertir"**
   - El sistema carga solo las 7 unidades pendientes
   - Puede comprar todas o parte nuevamente

6. **Cuando se complete todo:**
   - Estado cambia a 🟣 **TOTALMENTE CONVERTIDO**

---

### Validaciones Importantes

❌ **No se puede convertir si:**
- Presupuesto está CANCELADO
- Presupuesto está TOTALMENTE CONVERTIDO
- Presupuesto está RECHAZADO (debe cambiar estado primero)
- Presupuesto está VENCIDO (debe cambiar estado primero)

⚠️ **Al convertir:**
- No se puede exceder la cantidad pendiente
- Si modifica el precio en la venta, no afecta el presupuesto original
- Puede agregar productos nuevos en la venta (no estaban en presupuesto)

---

## 🔧 Cambiar Estado Manualmente

### ¿Cuándo hacerlo?

- Cliente confirmó por teléfono → Cambiar a **APROBADO**
- Cliente rechazó → Cambiar a **RECHAZADO**
- Presupuesto venció → Cambiar a **VENCIDO**
- Cancelar internamente → Click en **"Cancelar"**

### Cómo hacerlo:

**Opción 1: Desde la Lista**
1. Click en **"Cancelar"** en la fila del presupuesto
2. Confirmar acción
3. Estado cambia a **CANCELADO**

**Opción 2: Desde el Detalle** (Cuando se implemente)
1. Ver detalle del presupuesto
2. Menú desplegable de estados
3. Seleccionar nuevo estado

---

## 📊 Casos de Uso Reales

### Caso 1: Negocio de Computación

**Situación:**
- Cliente pide presupuesto de 5 notebooks
- Envía presupuesto por email
- Cliente acepta

**Flujo:**
1. Crear presupuesto con 5 notebooks
2. Exportar a PDF (función futura)
3. Enviar por email
4. Cliente confirma → Cambiar estado a APROBADO
5. Click "Convertir"
6. Completar venta con factura

---

### Caso 2: Ferretería con Compra Parcial

**Situación:**
- Cliente pide presupuesto de materiales para obra
- Compra en 3 entregas diferentes

**Flujo:**
1. Crear presupuesto con todos los materiales
2. **Primera compra:** Convertir 30% de los items
3. **Segunda compra:** Convertir 40% más
4. **Tercera compra:** Convertir el restante 30%
5. Presupuesto queda TOTALMENTE CONVERTIDO

**Ventaja:** Trazabilidad completa de qué se vendió en cada etapa

---

### Caso 3: Eventos - Presupuesto Modificado

**Situación:**
- Presupuesto de catering para evento
- Cliente pide modificaciones de último momento

**Flujo Opción 1 (Manual):**
1. Convertir presupuesto original
2. En la venta, modificar cantidades/productos según cambios
3. Completar venta

**Flujo Opción 2 (Futuro - Versionado):**
1. Crear nueva versión del presupuesto
2. Cliente aprueba nueva versión
3. Convertir nueva versión

---

## ❓ Preguntas Frecuentes

### ¿El presupuesto descuenta stock?
**No.** Los presupuestos NO afectan el stock. El stock se descuenta recién cuando se convierte a venta.

### ¿Puedo modificar un presupuesto después de crearlo?
**Actualmente no.** Si necesita modificarlo, cree uno nuevo. En versiones futuras se agregará edición.

### ¿Puedo eliminar un presupuesto?
**Actualmente no.** Puede cancelarlo. La eliminación permanente se agregará en versiones futuras.

### ¿Qué pasa si el producto del presupuesto ya no existe?
El presupuesto mantiene el nombre y precio del producto aunque se elimine. Al convertir, puede elegir otro producto.

### ¿Puedo convertir un presupuesto varias veces?
**Sí.** Mientras tenga cantidades pendientes, puede seguir convirtiendo parcialmente.

### ¿Cómo sé cuántas conversiones tuvo un presupuesto?
En el estado **PARCIALMENTE CONVERTIDO** puede ver en el detalle cuántas unidades de cada producto ya fueron vendidas.

### ¿Se puede cambiar el precio al convertir?
**Sí.** Al convertir, puede modificar los precios. El presupuesto original no se altera.

### ¿Puedo agregar productos nuevos al convertir?
**Sí.** Al convertir abre el POS normal, puede agregar/quitar productos según necesite.

### ¿El número del presupuesto es único?
**Sí.** Se genera automáticamente de forma secuencial: PRE-00000001, PRE-00000002, etc.

### ¿Puedo imprimir el presupuesto?
**Próximamente.** La generación de PDF está planificada para próxima versión.

### ¿Puedo enviar el presupuesto por email?
**Próximamente.** El envío por email está planificado para próxima versión.

---

## 💡 Mejores Prácticas

### 1. Use la Fecha de Validez
Siempre ponga una fecha "Válido Hasta" realista:
- Productos con precio volátil: 3-7 días
- Productos estables: 15-30 días

### 2. Notas Claras
Sea específico en notas y términos:
- ✅ "Entrega en 5 días hábiles"
- ❌ "Entrega rápida"

### 3. Notas Internas
Use notas internas para información clave:
- Descuentos especiales aplicados
- Condiciones de pago negociadas
- Seguimiento del cliente

### 4. Cambio de Estado Oportuno
Actualice el estado del presupuesto cuando:
- Cliente confirma → **APROBADO**
- Cliente rechaza → **RECHAZADO**
- Vence sin respuesta → **VENCIDO**

### 5. Conversión Inmediata
Si el cliente acepta el presupuesto, conviértalo a venta inmediatamente para:
- Asegurar el stock
- Registrar la venta
- Generar factura

---

## 🚨 Errores Comunes y Soluciones

### Error: "No se puede convertir presupuesto cancelado"
**Causa:** Intentó convertir un presupuesto en estado CANCELADO
**Solución:** Cambie el estado a APROBADO primero

### Error: "Cantidad convertida supera la pendiente"
**Causa:** Intentó vender más unidades de las que quedan en el presupuesto
**Solución:** Verifique la cantidad pendiente y ajuste

### Error: "Debe haber al menos un item"
**Causa:** Intentó guardar presupuesto sin productos
**Solución:** Agregue al menos 1 producto al carrito

### Problema: El cliente no aparece en la lista
**Causa:** El cliente no está activo o no está marcado como cliente
**Solución:**
1. Ir a Entidades
2. Verificar que esté activo
3. Verificar que tenga marcado "Es Cliente"

---

## 📞 Soporte

Para reportar problemas o sugerencias:
- Email: soporte@axiomaweb.com (ejemplo)
- GitHub Issues: [repositorio del proyecto]
- Documentación técnica: Ver `PRESUPUESTOS_IMPLEMENTACION_COMPLETA.md`

---

**Guía actualizada:** 18 de Diciembre de 2024
**Versión del sistema:** 1.0
**Módulo:** Presupuestos ✅ Operativo
