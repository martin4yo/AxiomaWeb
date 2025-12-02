# Documentación AxiomaWeb ERP

Índice completo de la documentación del sistema.

## 📚 Guías por Tema

### 🖨️ Sistema de Impresión
Sistema completo de impresión de tickets y facturas para impresoras térmicas.

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[Quick Start Impresión](QUICK_START_IMPRESION.md)** | Configuración en 5 minutos | Usuarios finales |
| **[Sistema de Impresión](SISTEMA_IMPRESION.md)** | Guía completa con todos los detalles | Usuarios y Admins |
| **[Decisiones de Arquitectura](DECISIONES_ARQUITECTURA.md)** | Por qué y cómo se tomaron decisiones técnicas | Desarrolladores |
| **[Ejemplos de Código](EJEMPLOS_CODIGO.md)** | Snippets y ejemplos para extender | Desarrolladores |

**¿Qué leer según tu necesidad?**
- 🟢 **Solo quiero imprimir:** Lee [Quick Start](QUICK_START_IMPRESION.md)
- 🟡 **Necesito personalizar templates:** Lee [Sistema de Impresión](SISTEMA_IMPRESION.md) + [Ejemplos](EJEMPLOS_CODIGO.md)
- 🔴 **Voy a modificar el sistema:** Lee [Decisiones de Arquitectura](DECISIONES_ARQUITECTURA.md)

### 🇦🇷 Integración AFIP
Facturación electrónica con integración completa a AFIP.

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[Integración AFIP](AFIP_INTEGRACION.md)** | Configuración completa de facturación electrónica | Admins y Contadores |

**Contenido:**
- Obtención de certificados digitales
- Configuración de conexiones AFIP
- Puntos de venta y comprobantes
- Solicitud de CAE
- Troubleshooting de errores comunes

### 🚀 Deployment
Guías para poner el sistema en producción.

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[Deployment](DEPLOYMENT.md)** | Guía completa de deploy en producción | DevOps y Admins |

**Contenido:**
- Configuración de servidor
- Base de datos y migraciones
- Variables de entorno
- Nginx y SSL
- Backups y monitoreo

## 🎯 Guías Rápidas

### Por Rol

#### 👤 Usuario Final
1. [Quick Start Impresión](QUICK_START_IMPRESION.md) - Configurar impresora en 5 min
2. [FAQ Sistema de Impresión](SISTEMA_IMPRESION.md#troubleshooting) - Resolver problemas comunes

#### 👨‍💼 Administrador
1. [Integración AFIP](AFIP_INTEGRACION.md) - Configurar facturación electrónica
2. [Sistema de Impresión](SISTEMA_IMPRESION.md) - Configuración avanzada de templates
3. [Deployment](DEPLOYMENT.md) - Poner en producción

#### 👨‍💻 Desarrollador
1. [Decisiones de Arquitectura](DECISIONES_ARQUITECTURA.md) - Entender el diseño
2. [Ejemplos de Código](EJEMPLOS_CODIGO.md) - Extender funcionalidades
3. [Sistema de Impresión](SISTEMA_IMPRESION.md) - Referencia técnica completa

### Por Tarea

#### Configurar Sistema Nuevo
1. Leer [README principal](../README.md)
2. Seguir [Deployment](DEPLOYMENT.md)
3. Configurar [AFIP](AFIP_INTEGRACION.md)
4. Configurar [Impresión](QUICK_START_IMPRESION.md)

#### Resolver Problema de Impresión
1. Ver [Troubleshooting](SISTEMA_IMPRESION.md#troubleshooting)
2. Revisar [FAQ Quick Start](QUICK_START_IMPRESION.md#faq)
3. Si persiste, ver [Ejemplos de Debugging](EJEMPLOS_CODIGO.md#debugging)

#### Agregar Template Personalizado
1. Leer [Personalización de Templates](SISTEMA_IMPRESION.md#personalización-de-templates)
2. Ver [Ejemplo: Crear Template](EJEMPLOS_CODIGO.md#crear-un-template-personalizado)
3. Entender [Decisiones sobre Templates](DECISIONES_ARQUITECTURA.md#1-templates-en-json-vs-html-estático)

#### Integrar AFIP por Primera Vez
1. Seguir [Guía AFIP paso a paso](AFIP_INTEGRACION.md)
2. Obtener certificados en homologación
3. Probar integración
4. Configurar templates con CAE: [Sistema de Impresión](SISTEMA_IMPRESION.md#códigos-qr)

## 📖 Glosario

**Términos importantes:**

- **Template:** Formato de impresión definido en JSON
- **Tenant:** Cliente del sistema multi-tenant
- **CAE:** Código de Autorización Electrónica de AFIP
- **WSAA:** Web Service de Autenticación y Autorización
- **WSFE:** Web Service de Facturación Electrónica
- **Voucher Configuration:** Configuración de comprobante (factura, NC, etc.)
- **QR Code:** Código QR para validación en AFIP
- **Thermal Printer:** Impresora térmica (de tickets)

## 🔗 Enlaces Externos

### Recursos Oficiales
- [AFIP - Factura Electrónica](https://www.afip.gob.ar/)
- [MDN - CSS Printing](https://developer.mozilla.org/en-US/docs/Web/Guide/Printing)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Query](https://tanstack.com/query)

### Herramientas
- [qrcode npm](https://www.npmjs.com/package/qrcode)
- [Zod Validation](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📝 Contribuir a la Documentación

Si encuentras algo que falta o está desactualizado:

1. **Issues:** Abre un issue describiendo qué falta
2. **Pull Request:** Envía cambios directamente
3. **Formato:** Usa Markdown con formato consistente
4. **Ejemplos:** Incluye ejemplos de código cuando sea relevante

### Estructura de Documentos

```markdown
# Título del Documento

Descripción breve (1-2 líneas)

## Sección 1

Contenido...

### Subsección 1.1

Contenido con ejemplos...

## Referencias

- Enlaces relevantes
```

## 🆘 Soporte

**¿No encuentras lo que buscas?**

1. Busca en esta documentación con Ctrl+F
2. Revisa el [README principal](../README.md)
3. Busca en [Issues de GitHub](https://github.com/martin4yo/AxiomaWeb/issues)
4. Crea un nuevo issue con tu pregunta

---

**Última actualización:** 2025-01-02
**Versión del sistema:** 1.0.0
