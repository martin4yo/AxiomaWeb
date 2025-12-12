# Instalación y Configuración de QZ Tray

Guía completa para implementar impresión térmica con QZ Tray en AxiomaWeb.

---

## 🎯 ¿Qué es QZ Tray?

QZ Tray es una aplicación de código abierto que permite imprimir directamente desde el navegador web a impresoras locales, incluyendo:

- ✅ **Impresoras térmicas** (POS-80, TM-T20, ESC/POS)
- ✅ **Puerto USB directo** (sin drivers)
- ✅ **Todos los navegadores** (Chrome, Firefox, Safari, Edge)
- ✅ **Multiplataforma** (Windows, Linux, macOS)

---

## 📦 Instalación

### Paso 1: Descargar QZ Tray

**Sitio oficial**: https://qz.io/download/

**Versiones disponibles**:
- Windows: `qz-tray-2.2.exe` (~30 MB)
- Linux: `qz-tray_2.2_amd64.deb` o `.rpm`
- macOS: `qz-tray-2.2.pkg`

**Descarga directa**: https://github.com/qzind/tray/releases

### Paso 2: Instalar QZ Tray

**Windows:**
```bash
# Ejecutar el instalador descargado
qz-tray-2.2.exe

# Opciones:
- Install for all users (recomendado)
- Create desktop shortcut
- Start QZ Tray on startup ✅ (IMPORTANTE)
```

**Linux:**
```bash
# Debian/Ubuntu
sudo dpkg -i qz-tray_2.2_amd64.deb

# RedHat/CentOS
sudo rpm -i qz-tray-2.2.x86_64.rpm

# Iniciar al boot
sudo systemctl enable qz-tray
sudo systemctl start qz-tray
```

**macOS:**
```bash
# Abrir el .pkg descargado
# Seguir asistente de instalación
# Permitir en Preferencias del Sistema → Seguridad
```

### Paso 3: Verificar Instalación

**Verificar que QZ Tray está ejecutándose:**

1. **En Windows**:
   - Buscar icono QZ en la bandeja del sistema (tray)
   - Debería aparecer un diamante azul 💎

2. **Abrir interfaz web**:
   - Ir a: http://localhost:8182/
   - Debería mostrar "QZ Tray v2.2.x"

3. **Probar conexión**:
   ```javascript
   // En consola del navegador
   qz.websockets.connect()
     .then(() => console.log('✅ QZ Tray conectado'))
     .catch(err => console.error('❌ Error:', err))
   ```

---

## 🔐 Certificados Digitales

QZ Tray requiere certificados para firmar las peticiones de impresión.

### Opción 1: Certificado Self-Signed (Desarrollo/Interno)

**Ventajas**: Gratis, rápido
**Desventajas**: Hay que aprobar manualmente en cada PC

#### Generar Certificado

**Usando OpenSSL (Windows/Linux/Mac):**

```bash
# 1. Generar clave privada
openssl genrsa -out private-key.pem 2048

# 2. Generar solicitud de certificado (CSR)
openssl req -new -key private-key.pem -out certificate.csr

# Completar:
# Country Name: AR
# State: Buenos Aires
# Locality: Buenos Aires
# Organization: AxiomaWeb
# Common Name: localhost
# Email: admin@axiomaweb.com

# 3. Generar certificado auto-firmado (válido 1 año)
openssl x509 -req -days 365 -in certificate.csr -signkey private-key.pem -out digital-certificate.pem

# 4. (Opcional) Verificar certificado
openssl x509 -in digital-certificate.pem -text -noout
```

**Archivos generados:**
- `private-key.pem` → Clave privada (GUARDAR SEGURO)
- `digital-certificate.pem` → Certificado público

#### Guardar Certificados en el Proyecto

```bash
# Copiar a frontend
cd /home/martin/Desarrollos/AxiomaWeb/qz-tray

# Guardar certificados
mkdir -p certs
mv digital-certificate.pem certs/
mv private-key.pem certs/

# IMPORTANTE: Agregar a .gitignore
echo "qz-tray/certs/*.pem" >> .gitignore
```

#### Actualizar Código Frontend

Editar `frontend/src/services/qz-tray.ts`:

```typescript
// Leer contenido de los archivos generados
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
[COPIAR CONTENIDO DE digital-certificate.pem AQUÍ]
-----END CERTIFICATE-----`;

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
[COPIAR CONTENIDO DE private-key.pem AQUÍ]
-----END PRIVATE KEY-----`;
```

### Opción 2: Certificado Oficial (Producción)

**Ventajas**: Sin aprobaciones manuales, más profesional
**Desventajas**: Costo anual ($50-200)

**Proveedores recomendados:**
- DigiCert Code Signing (~$200/año)
- Sectigo Code Signing (~$150/año)
- GlobalSign Code Signing (~$100/año)

**Proceso**:
1. Comprar certificado de Code Signing
2. Descargar certificado y clave privada
3. Actualizar `qz-tray.ts` con certificado oficial

---

## ⚙️ Configuración en AxiomaWeb

### Paso 1: Integrar en Frontend

El código ya está listo en:
- `frontend/src/services/qz-tray.ts` - Servicio QZ Tray
- `frontend/src/api/sales.ts` - Integración con ventas
- `frontend/src/components/QZTrayStatus.tsx` - UI de configuración

### Paso 2: Agregar Componente de Estado

En tu página de configuración o dashboard, agregar:

```tsx
import { QZTrayStatus } from '../components/QZTrayStatus';

function SettingsPage() {
  return (
    <div>
      <h1>Configuración</h1>

      {/* Estado de QZ Tray */}
      <QZTrayStatus />

      {/* Resto de configuración */}
    </div>
  );
}
```

### Paso 3: Configurar Impresora

1. Usuario abre la página con `<QZTrayStatus />`
2. Click en "Conectar"
3. Si QZ Tray está instalado, se conecta automáticamente
4. Seleccionar impresora térmica del dropdown
5. Click en "Guardar"

---

## 🖨️ Probar Impresión

### Prueba Manual

```javascript
// En consola del navegador
import { qzTrayService } from './services/qz-tray';

// Conectar
await qzTrayService.initialize();

// Ver impresoras
const printers = await qzTrayService.listPrinters();
console.log('Impresoras:', printers);

// Configurar impresora
await qzTrayService.configure('POS-80', 'simple');

// Imprimir ticket de prueba
await qzTrayService.printThermal(
  {
    name: 'Mi Negocio',
    cuit: '20-12345678-9',
    address: 'Av. Principal 123'
  },
  {
    number: '00001-00000001',
    date: '2024-01-15',
    items: [
      {
        description: 'Producto Test',
        quantity: 1,
        price: 100,
        total: 100
      }
    ],
    total: 100
  },
  'simple'
);
```

### Prueba desde AxiomaWeb

1. Crear una venta de prueba
2. En la configuración de comprobantes:
   - Formato: THERMAL
   - Template: SIMPLE
3. Finalizar venta
4. Debería imprimir automáticamente

---

## 🔧 Troubleshooting

### ❌ "No se pudo conectar con QZ Tray"

**Causas**:
- QZ Tray no está instalado
- QZ Tray no está ejecutándose
- Puerto bloqueado por firewall

**Soluciones**:
```bash
# 1. Verificar que QZ Tray está ejecutándose
# Windows: Buscar icono en bandeja del sistema
# Linux: ps aux | grep qz-tray

# 2. Verificar puerto 8182
# Ir a http://localhost:8182/
# Debería mostrar interfaz de QZ Tray

# 3. Reiniciar QZ Tray
# Windows: Click derecho en icono → Exit → Abrir de nuevo
# Linux: sudo systemctl restart qz-tray
```

### ❌ "Certificate error" o "Signature invalid"

**Causa**: Certificado digital incorrecto o no configurado

**Soluciones**:
```bash
# 1. Verificar que los certificados están en qz-tray.ts
# Revisar que CERTIFICATE y PRIVATE_KEY tienen contenido

# 2. Regenerar certificados
# Usar el comando OpenSSL de arriba

# 3. Para desarrollo, permitir certificados inseguros
# En QZ Tray → Configuración → Allow unsigned
```

### ❌ "Printer not found"

**Causa**: Nombre de impresora incorrecto

**Soluciones**:
```javascript
// Listar impresoras disponibles
const printers = await qzTrayService.listPrinters();
console.log('Impresoras disponibles:', printers);

// Usar nombre exacto
await qzTrayService.configure('POS-80', 'simple');
```

### ❌ Imprime pero con caracteres raros

**Causa**: Encoding incorrecto o comandos ESC/POS incorrectos

**Soluciones**:
- Verificar que la impresora soporta ESC/POS
- Revisar los comandos en `generateESCPOS()` en `qz-tray.ts`
- Probar con impresora diferente

### ❌ No imprime nada

**Causas**:
- Impresora apagada
- Cable desconectado
- Sin papel
- Cola de impresión bloqueada

**Soluciones**:
```bash
# 1. Verificar impresora
# Imprimir prueba desde Windows
# Devices → Printers → Click derecho → Print test page

# 2. Limpiar cola de impresión
# Windows: Control Panel → Devices → Printers → Open queue → Cancel all

# 3. Revisar logs de QZ Tray
# Windows: C:\Users\[user]\.qz\qz-tray.log
# Linux: ~/.qz/qz-tray.log
```

---

## 📊 Comparación: QZ Tray vs Alternativas

| Característica | QZ Tray | Extensión Chrome | Print Manager |
|----------------|---------|------------------|---------------|
| **USB Directo** | ✅ Excelente | ⚠️ Limitado | ⚠️ Limitado |
| **Navegadores** | ✅ Todos | ❌ Solo Chrome/Edge | ✅ Todos |
| **Instalación** | Fácil (1 exe) | Media (2 pasos) | Media (instalador) |
| **Certificados** | Necesita | No | No |
| **Auto-Update** | ✅ Sí | ✅ Sí (Web Store) | ❌ Manual |
| **Configuración** | Media | Simple | Simple |
| **Costo** | Gratis | Gratis | Gratis |
| **Madurez** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 🚀 Deployment en Producción

### Para 100+ PCs

**1. Instalador Silencioso**
```powershell
# Descargar instalador
Invoke-WebRequest -Uri "https://github.com/qzind/tray/releases/download/v2.2.0/qz-tray-2.2.exe" -OutFile "qz-tray-installer.exe"

# Instalar silenciosamente
.\qz-tray-installer.exe /S /AllUsers /StartOnBoot

# Verificar instalación
if (Test-Path "C:\Program Files\QZ Tray\qz-tray.exe") {
    Write-Host "✅ QZ Tray instalado correctamente"
} else {
    Write-Host "❌ Error en instalación"
}
```

**2. Distribuir via Group Policy**
```
1. Copiar instalador a: \\servidor\software\qz-tray-2.2.exe
2. GPO → Computer Configuration → Software Installation
3. Agregar qz-tray-2.2.exe
4. Asignar a OUs relevantes
```

**3. Pre-configurar Certificados**

Empaquetar certificados en el build de frontend:
```bash
# build-production.sh
cp qz-tray/certs/digital-certificate.pem frontend/public/
# Actualizar código para leerlo desde /digital-certificate.pem
```

**4. Configuración Centralizada**

Guardar configuración de impresora en backend por tenant:
```typescript
// Guardar en BD qué impresora usa cada sucursal
// Cargar automáticamente al abrir AxiomaWeb
```

---

## 📚 Recursos

- **Sitio oficial**: https://qz.io/
- **Documentación**: https://qz.io/wiki/
- **API Reference**: https://qz.io/wiki/api/
- **GitHub**: https://github.com/qzind/tray
- **Soporte**: https://github.com/qzind/tray/issues

---

## 🎉 Conclusión

QZ Tray es la mejor solución para impresión térmica en AxiomaWeb porque:

1. ✅ **USB Directo**: Funciona perfectamente con impresoras USB
2. ✅ **Multi-navegador**: Chrome, Firefox, Safari, Edge
3. ✅ **Maduro**: 10+ años de desarrollo, muy estable
4. ✅ **Open Source**: Código abierto, gratis
5. ✅ **Multiplataforma**: Windows, Linux, Mac

**Recomendación**: Usar QZ Tray para producción, dejar Print Manager/Extensión como fallback.
