# 🖨️ Axioma Print Manager

Sistema de impresión térmica basado en Electron para el ERP Axioma. Permite imprimir tickets de venta directamente en impresoras térmicas USB mediante comunicación directa con ESC/POS.

## 🚀 Características

- ✅ Acceso USB directo sin dependencias de CUPS
- ✅ Comandos ESC/POS nativos para control total
- ✅ Servidor HTTP integrado (puerto 9100)
- ✅ Soporte para Gprinter GP-L18080 (extensible a otras impresoras)
- ✅ Detección automática de impresoras USB
- ✅ Aplicación Electron standalone
- ✅ API REST simple para integración

## 📋 Requisitos

- Node.js 18 o superior
- npm 9 o superior
- Linux (probado en Ubuntu 22.04)
- Impresora térmica USB compatible con ESC/POS
- Permisos USB configurados (ver [SETUP.md](./SETUP.md))

## 🔧 Instalación

\`\`\`bash
cd print-manager
npm install
\`\`\`

## ▶️ Uso

### Modo Producción
\`\`\`bash
npm start
\`\`\`

### Modo Desarrollo (Simula impresión)
\`\`\`bash
npm run dev
\`\`\`

La aplicación iniciará un servidor HTTP en \`http://localhost:9100\`

## 📡 API

### GET /health
Health check del servicio

**Respuesta:**
\`\`\`json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-12-04T17:55:04.857Z"
}
\`\`\`

### GET /printers
Lista impresoras USB disponibles

**Respuesta:**
\`\`\`json
{
  "printers": [
    {
      "id": 0,
      "vendorId": 34918,
      "productId": 256,
      "name": "USB Printer 1"
    }
  ]
}
\`\`\`

### POST /print
Envía un ticket a imprimir

Ver [SETUP.md](./SETUP.md) para estructura completa del request body.

## 🧪 Testing

\`\`\`bash
# Test completo end-to-end
bash ../test-thermal-print.sh
\`\`\`

## 🛠️ Configuración

### Permisos USB

Ver [SETUP.md](./SETUP.md) para instrucciones detalladas.

**Configuración rápida:**
\`\`\`bash
# 1. Agregar usuario al grupo lp
sudo usermod -a -G lp \$USER

# 2. Instalar regla udev
sudo cp 99-gprinter.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger

# 3. Reiniciar sesión
\`\`\`

## 📁 Estructura del Proyecto

\`\`\`
print-manager/
├── main.js              # Proceso principal de Electron + servidor HTTP
├── printer.js           # Lógica de impresión USB con ESC/POS
├── index.html           # UI básica
├── package.json         # Dependencias y scripts
├── 99-gprinter.rules    # Regla udev para permisos USB
├── README.md            # Este archivo
├── SETUP.md             # Guía de configuración
└── TROUBLESHOOTING.md   # Guía de resolución de problemas
\`\`\`

## 🐛 Problemas Comunes

### Error: LIBUSB_ERROR_ACCESS

**Solución rápida:**
\`\`\`bash
sudo chmod 666 /dev/bus/usb/003/013  # Ajustar números según lsusb
\`\`\`

**Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) para solución permanente**

### Error: No se encontró impresora térmica USB

\`\`\`bash
# Ver impresoras conectadas
lsusb
\`\`\`

### Print Manager no responde

\`\`\`bash
cd print-manager
npm start
\`\`\`

## 📚 Documentación

- [SETUP.md](./SETUP.md) - Guía completa de configuración
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Resolución de problemas
- [ESC/POS Reference](https://reference.epson-biz.com/modules/ref_escpos/)

## 🖥️ Comandos ESC/POS Soportados

| Comando | Código | Descripción |
|---------|--------|-------------|
| Inicializar | \`ESC @\` | Reset de impresora |
| Alinear centro | \`ESC a 1\` | Centrar texto |
| Negrita ON | \`ESC E 1\` | Activar negrita |
| Tamaño doble | \`GS ! 17\` | Texto doble |
| Cortar papel | \`GS V 0\` | Corte parcial |

Ver código completo en \`printer.js\`

## 📄 Licencia

ISC
