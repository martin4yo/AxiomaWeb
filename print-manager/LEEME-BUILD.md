# 🚀 Construir el Instalador - Guía Ultra Simple

## ⚡ Método Rápido (TODO EN 1 COMANDO)

```cmd
build-all.bat
```

**Eso es todo.** El script hace TODO automáticamente:
1. ✅ Verifica Node.js
2. ✅ Instala pkg
3. ✅ Instala dependencias
4. ✅ Descarga OpenSSL y NSSM automáticamente
5. ✅ Construye el ejecutable
6. ✅ Genera el instalador

**Tiempo:** 5-10 minutos la primera vez, 2-3 minutos las siguientes.

**Resultado:**
```
installer-output/AxiomaPrintManager-Setup-1.0.0.exe
```

---

## 📋 Requisitos Previos

Solo necesitas instalar 2 cosas **UNA VEZ**:

1. **Node.js** (https://nodejs.org/)
   - Versión 18.x o superior (LTS)

2. **Inno Setup** (https://jrsoftware.org/isdl.php)
   - Para generar el .exe del instalador
   - Sin esto, solo se genera el ejecutable (no el instalador completo)

---

## 🎯 Proceso Completo

### Primera Vez:

```cmd
REM 1. Clonar repositorio
git clone https://github.com/martin4yo/AxiomaWeb.git
cd AxiomaWeb\print-manager

REM 2. Ejecutar build completo
build-all.bat

REM Espera 5-10 minutos...

REM 3. Listo!
REM El instalador está en: installer-output\AxiomaPrintManager-Setup-1.0.0.exe
```

### Actualizaciones:

```cmd
REM 1. Actualizar código
git pull

REM 2. Reconstruir
build-all.bat

REM Ya tiene todo descargado, tarda solo 2-3 minutos
```

---

## 📂 Archivos Generados

```
print-manager/
├── tools/                      (se crea automáticamente)
│   ├── openssl/
│   │   └── openssl.exe        (descargado por script)
│   └── nssm/
│       └── nssm.exe           (descargado por script)
├── build/
│   └── AxiomaPrintManager.exe (≈40-50 MB)
└── installer-output/
    └── AxiomaPrintManager-Setup-1.0.0.exe  (≈45-55 MB)
                                            ↑ DISTRIBUIR ESTE
```

---

## 🔧 Comandos Disponibles

```cmd
# TODO en uno (recomendado)
build-all.bat

# Solo descargar herramientas
download-tools.bat

# Build manual paso a paso
npm install -g pkg
npm install
download-tools.bat
node build-installer.js
```

---

## ❓ Solución de Problemas

### Error: "Node.js no está instalado"
- Instalar desde: https://nodejs.org/
- Reiniciar CMD después de instalar

### Error: "pkg no se pudo instalar"
```cmd
npm install -g pkg --force
```

### Error: "Inno Setup no encontrado"
- El ejecutable se crea igual
- Para el instalador .exe, instalar: https://jrsoftware.org/isdl.php
- Volver a ejecutar `build-all.bat`

### Error en descarga de herramientas
```cmd
REM Descargar manualmente
download-tools.bat

REM Si falla, descarga manual:
REM OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
REM   → Copiar openssl.exe a tools\openssl\
REM NSSM: https://nssm.cc/download
REM   → Copiar win64\nssm.exe a tools\nssm\
```

### Build muy lento
- Es normal la primera vez (descarga binarios de Node.js ~100 MB)
- Las siguientes veces usa caché y es mucho más rápido

---

## ✅ Verificar que Funcionó

Después de ejecutar `build-all.bat`, deberías ver:

```
========================================
  ✅ Build Completado Exitosamente
========================================

📦 Ejecutable: build\AxiomaPrintManager.exe
   Tamaño: 45 MB

🎉 INSTALADOR LISTO: installer-output\AxiomaPrintManager-Setup-1.0.0.exe
   Tamaño: 50 MB

Este archivo es el que debes distribuir a tus clientes.
```

---

## 📤 Distribuir a Clientes

1. Sube `AxiomaPrintManager-Setup-1.0.0.exe` a:
   - Tu servidor web
   - Google Drive / Dropbox
   - Email directo

2. Cliente descarga y ejecuta

3. Cliente sigue wizard (solo ingresa nombre de impresora)

4. ✅ Listo para imprimir

---

## 🎉 Resumen

**TL;DR:**
```cmd
build-all.bat
```

Espera 5-10 minutos, distribuye el .exe generado. **Fin.**

---

¿Dudas? Ver documentación completa en `CONSTRUIR-INSTALADOR.md`
