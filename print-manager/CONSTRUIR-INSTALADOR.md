# 🏗️ Cómo Construir el Instalador de Axioma Print Manager

Esta guía explica cómo generar el instalador `.exe` del Print Manager desde cero.

---

## 📋 Requisitos Previos

### 1. Software Necesario

#### Node.js
- Descargar: https://nodejs.org/
- Versión recomendada: LTS (18.x o superior)

#### pkg (para empaquetar Node.js)
```cmd
npm install -g pkg
```

#### Inno Setup (para crear el instalador)
- Descargar: https://jrsoftware.org/isdl.php
- Versión recomendada: 6.x
- Instalar con opciones por defecto

### 2. Herramientas Portables

Estas herramientas se incluirán en el instalador:

#### OpenSSL Portable
1. Descargar: https://slproweb.com/products/Win32OpenSSL.html
2. Elegir: **Win64 OpenSSL Light**
3. Instalar temporalmente
4. Copiar `openssl.exe` a `print-manager/tools/openssl/`

Ubicación típica después de instalar:
```
C:\Program Files\OpenSSL-Win64\bin\openssl.exe
```

#### NSSM (Non-Sucking Service Manager)
1. Descargar: https://nssm.cc/download
2. Extraer el archivo ZIP
3. Copiar `nssm.exe` (carpeta win64) a `print-manager/tools/nssm/`

---

## 🚀 Proceso de Construcción

### Paso 1: Preparar el Proyecto

```cmd
cd print-manager

REM Instalar dependencias
npm install

REM Crear estructura de directorios
mkdir tools\openssl
mkdir tools\nssm
mkdir build
```

### Paso 2: Copiar Herramientas

```cmd
REM Copiar OpenSSL
copy "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" tools\openssl\

REM Copiar NSSM (ajusta la ruta según donde lo descargaste)
copy "C:\Downloads\nssm-2.24\win64\nssm.exe" tools\nssm\
```

### Paso 3: Construir el Ejecutable

```cmd
REM Opción A: Usando el script automatizado
node build-installer.js

REM Opción B: Manualmente con pkg
pkg . --targets node18-win-x64 --output build/AxiomaPrintManager.exe
```

El proceso toma varios minutos. Verás:
```
> pkg@5.8.1
> Fetching base Node.js binaries...
> Compiling...
```

Al finalizar, tendrás:
```
build/AxiomaPrintManager.exe (≈40-50 MB)
```

### Paso 4: Verificar el Ejecutable

```cmd
cd build
AxiomaPrintManager.exe
```

Deberías ver:
```
🖨️  Print Manager Server - Versión Windows Térmica
==================================================
⚠️  Certificados SSL no encontrados.
   Los certificados deberían estar en: C:\...\build\certs
...
```

Esto es normal - los certificados se generan durante la instalación.

### Paso 5: Compilar el Instalador

```cmd
REM Desde la carpeta print-manager
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

O usar el script:
```cmd
node build-installer.js
```

El instalador se creará en:
```
print-manager/installer-output/AxiomaPrintManager-Setup-1.0.0.exe
```

---

## 📦 Estructura del Proyecto para Build

```
print-manager/
├── build/                          # Ejecutables generados
│   └── AxiomaPrintManager.exe
├── tools/                          # Herramientas portables
│   ├── openssl/
│   │   └── openssl.exe
│   └── nssm/
│       └── nssm.exe
├── installer-output/               # Instalador final
│   └── AxiomaPrintManager-Setup-1.0.0.exe
├── server-thermal-windows.js       # Código fuente principal
├── thermal-templates.js            # Templates de tickets
├── package-installer.json          # Config de pkg
├── installer.iss                   # Script de Inno Setup
├── build-installer.js              # Script de automatización
└── setup-certificates.bat          # Scripts para instalación
    configure-printer.bat
    install-service.bat
    ...
```

---

## 🔧 Solución de Problemas

### Error: "pkg: command not found"

```cmd
npm install -g pkg
```

### Error: "Cannot find module"

```cmd
REM Reinstalar dependencias
npm install
```

### Error de pkg: "Failed to fetch base binaries"

- Verifica tu conexión a internet
- Intenta de nuevo - a veces falla por timeout
- O descarga manualmente desde: https://github.com/vercel/pkg-fetch/releases

### Inno Setup no compila

Verifica la ruta en `build-installer.js`:
```javascript
const innoSetupPath = 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe';
```

Si instalaste en otra ubicación, actualiza la ruta.

### El ejecutable no inicia

- Verifica que `thermal-templates.js` exista
- Verifica que las dependencias en `package-installer.json` estén correctas
- Prueba ejecutar sin empaquetar: `node server-thermal-windows.js`

---

## 🎯 Checklist de Build

- [ ] Node.js instalado
- [ ] pkg instalado globalmente
- [ ] Inno Setup instalado
- [ ] OpenSSL portable copiado a tools/openssl/
- [ ] NSSM copiado a tools/nssm/
- [ ] Dependencias instaladas (npm install)
- [ ] Ejecutable compilado (build/AxiomaPrintManager.exe)
- [ ] Ejecutable probado manualmente
- [ ] Instalador compilado (installer-output/*.exe)
- [ ] Instalador probado en máquina limpia

---

## 🔄 Actualizar Versión

Para crear una nueva versión:

1. Actualizar versión en `package-installer.json`:
```json
{
  "version": "1.1.0"
}
```

2. Actualizar versión en `installer.iss`:
```iss
#define MyAppVersion "1.1.0"
```

3. Recompilar:
```cmd
node build-installer.js
```

---

## 📤 Distribución

El instalador final estará en:
```
installer-output/AxiomaPrintManager-Setup-1.0.0.exe
```

Tamaño aproximado: **45-55 MB**

Este archivo único contiene:
- ✅ Ejecutable del Print Manager (con Node.js empaquetado)
- ✅ OpenSSL portable
- ✅ NSSM para servicio de Windows
- ✅ Scripts de configuración
- ✅ Documentación

El usuario **solo descarga y ejecuta este .exe**. Nada más.

---

## 🎉 Resultado Final

**Para el usuario:**
1. Descargar: `AxiomaPrintManager-Setup-1.0.0.exe`
2. Ejecutar (como administrador recomendado)
3. Seguir wizard:
   - Aceptar licencia
   - Elegir carpeta de instalación
   - Ingresar nombre de impresora
   - Marcar "Instalar como servicio"
4. ✅ Listo - Print Manager funcionando automáticamente

**Vs. instalación manual actual:**
- ❌ Instalar Node.js
- ❌ Instalar Git for Windows
- ❌ Configurar PATH
- ❌ npm install
- ❌ Generar certificados
- ❌ Configurar servicio
- ❌ Inicio automático

**TODO EN 1 CLICK** 🎉
