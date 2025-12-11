# 🖨️ Axioma Print Manager - Versión Standalone para Windows

Sistema de impresión térmica para Windows que funciona de forma **independiente** del ERP Axioma.

## 📦 ¿Qué incluye este paquete?

Este es un paquete **standalone** que contiene solo el Print Manager. No necesitas descargar todo el proyecto AxiomaWeb.

### Archivos incluidos:

- `package-windows.json` - Dependencias sin conflictos
- `server-windows.js` - Servidor de impresión
- `test-windows.js` - Script de prueba
- `INSTALACION_WINDOWS.md` - Guía completa de instalación
- `README-STANDALONE.md` - Este archivo

## 🚀 Inicio Rápido

### 1. Requisitos previos

- **Windows 10 o superior**
- **Node.js 18+** → https://nodejs.org/
- **Git** → https://git-scm.com/download/win
- **Impresora térmica** conectada por USB

### 2. Instalación (3 comandos)

```cmd
:: 1. Renombrar package
copy package-windows.json package.json

:: 2. Instalar dependencias
npm install

:: 3. Iniciar servidor
node server-windows.js
```

### 3. Probar (en otra ventana de cmd)

```cmd
node test-windows.js
```

## 📖 Documentación Completa

Ver **INSTALACION_WINDOWS.md** para instrucciones paso a paso detalladas.

## 🔗 Links Útiles

- **Repositorio completo:** https://github.com/martin4yo/AxiomaWeb
- **Descargar solo Print Manager:** https://minhaskamal.github.io/DownGit (pegar: `https://github.com/martin4yo/AxiomaWeb/tree/master/print-manager`)
- **Issues:** https://github.com/martin4yo/AxiomaWeb/issues

## 📞 Soporte

- Email: [Tu email]
- GitHub Issues: https://github.com/martin4yo/AxiomaWeb/issues

## 📄 Licencia

MIT License - AxiomaWeb Team

---

**Versión:** 2.1.0
**Última actualización:** Diciembre 2024
