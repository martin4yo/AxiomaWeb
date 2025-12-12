# QZ Tray - Impresión Térmica para AxiomaWeb

Integración con QZ Tray para impresión térmica directa desde el navegador.

## 🚀 Inicio Rápido

### 1. Instalar QZ Tray

**Descargar**: https://qz.io/download/

**Instalar** en cada PC que necesite imprimir:
- Windows: `qz-tray-2.2.exe`
- Linux: `qz-tray_2.2_amd64.deb`
- Mac: `qz-tray-2.2.pkg`

✅ **Importante**: Marcar "Start on startup"

### 2. Generar Certificados

**Windows:**
```bash
cd qz-tray
generar-certificados.bat
```

**Linux/Mac:**
```bash
cd qz-tray
chmod +x generar-certificados.sh
./generar-certificados.sh
```

Esto crea:
- `certs/digital-certificate.pem` - Certificado público
- `certs/private-key.pem` - Clave privada (GUARDAR SEGURO)

### 3. Configurar Frontend

Copiar contenido de los certificados a `frontend/src/services/qz-tray.ts`:

```typescript
const CERTIFICATE = `
[contenido de digital-certificate.pem]
`;

const PRIVATE_KEY = `
[contenido de private-key.pem]
`;
```

### 4. Usar en AxiomaWeb

```typescript
import { qzTrayService } from './services/qz-tray';

// Conectar
await qzTrayService.initialize();

// Listar impresoras
const printers = await qzTrayService.listPrinters();

// Configurar impresora
await qzTrayService.configure('POS-80', 'simple');

// Imprimir
await qzTrayService.printThermal(business, sale, 'simple');
```

## 📚 Documentación

- **Instalación completa**: [INSTALACION-QZ-TRAY.md](./INSTALACION-QZ-TRAY.md)
- **Sitio oficial**: https://qz.io/
- **API Docs**: https://qz.io/wiki/api/

## ✅ Ventajas

- ✅ Funciona con **todos los navegadores**
- ✅ Impresión **USB directa** sin drivers
- ✅ **Multiplataforma** (Windows/Linux/Mac)
- ✅ **Muy estable** (10+ años de desarrollo)
- ✅ **Open source** y gratis

## 🆚 vs Otras Soluciones

| Característica | QZ Tray | Extensión Chrome | Print Manager |
|----------------|---------|------------------|---------------|
| USB Directo | ✅ Excelente | ⚠️ Limitado | ⚠️ Limitado |
| Navegadores | ✅ Todos | ❌ Solo Chrome | ✅ Todos |
| Madurez | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

## 🔧 Troubleshooting

**❌ "No se pudo conectar"**
```bash
# Verificar que QZ Tray está ejecutándose
# Windows: Buscar icono en bandeja del sistema
# Abrir: https://localhost:8182/
```

**❌ "Certificate error"**
```bash
# Regenerar certificados
cd qz-tray
generar-certificados.bat  # Windows
./generar-certificados.sh  # Linux/Mac

# Actualizar qz-tray.ts con nuevo contenido
```

**❌ "Printer not found"**
```javascript
// Listar impresoras disponibles
const printers = await qzTrayService.listPrinters();
console.log(printers);

// Usar nombre exacto
await qzTrayService.configure('NOMBRE_EXACTO', 'simple');
```

## 📝 Notas de Seguridad

**⚠️ IMPORTANTE**:
- NO commitear `certs/*.pem` a Git
- Guardar `private-key.pem` en lugar seguro
- Hacer backup del certificado

Los certificados están en `.gitignore` automáticamente.

## 🚀 Producción (100+ PCs)

**Instalación silenciosa:**
```powershell
.\qz-tray-2.2.exe /S /AllUsers /StartOnBoot
```

**Distribuir via GPO:**
Ver [INSTALACION-QZ-TRAY.md](./INSTALACION-QZ-TRAY.md#deployment-en-producción)
