# 📥 Cómo Descargar Solo el Print Manager

**No necesitas descargar todo AxiomaWeb.** Solo necesitas la carpeta `print-manager`.

---

## ✅ **Opción 1: DownGit (Recomendada - Más Fácil)**

### Pasos:

1. **Abrir navegador**

2. **Ir a:** https://minhaskamal.github.io/DownGit/#/home

3. **Pegar esta URL en el campo:**
   ```
   https://github.com/martin4yo/AxiomaWeb/tree/master/print-manager
   ```

4. **Click en "Download"**

5. **Esperar 5-10 segundos** mientras se genera el ZIP

6. **Se descargará:** `print-manager.zip` (aprox. 30 KB)

7. **Extraer el ZIP** en cualquier carpeta, por ejemplo:
   ```
   C:\print-manager\
   ```

### ¡Listo! Ya tienes solo la carpeta que necesitas.

---

## ✅ **Opción 2: GitHub Web (Manual)**

### Pasos:

1. **Ir a:** https://github.com/martin4yo/AxiomaWeb/tree/master/print-manager

2. **Click en cada archivo** que necesites:
   - ✅ `package-windows.json`
   - ✅ `server-windows.js`
   - ✅ `test-windows.js`
   - ✅ `INSTALACION_WINDOWS.md`
   - ✅ `README-STANDALONE.md` (este archivo)

3. **Para cada archivo:**
   - Click en el nombre del archivo
   - Click en el botón **"Raw"** o icono de descarga
   - Guardar como (Ctrl+S)

4. **Guardar todos en la misma carpeta:**
   ```
   C:\print-manager\
   ```

---

## ✅ **Opción 3: Git Sparse Checkout (Avanzado)**

Solo si ya tienes Git instalado y conoces comandos de Git:

```bash
# Crear carpeta
mkdir print-manager-only
cd print-manager-only

# Inicializar repo
git init
git remote add origin https://github.com/martin4yo/AxiomaWeb.git

# Configurar sparse checkout
git config core.sparseCheckout true
echo "print-manager/*" >> .git/info/sparse-checkout

# Descargar
git pull origin master
```

La carpeta quedará en: `print-manager-only/print-manager/`

---

## ✅ **Opción 4: Clonar Todo (No recomendado)**

Si descargas todo el repositorio:

```bash
git clone https://github.com/martin4yo/AxiomaWeb.git
cd AxiomaWeb/print-manager
```

**Nota:** Esto descarga ~100 MB en lugar de ~30 KB. Solo usar si vas a trabajar con todo el proyecto.

---

## 📊 Comparación de Opciones

| Opción | Facilidad | Tamaño descarga | Tiempo |
|--------|-----------|-----------------|--------|
| 1. DownGit | ⭐⭐⭐⭐⭐ | ~30 KB | 1 min |
| 2. Manual | ⭐⭐⭐⭐ | ~30 KB | 5 min |
| 3. Sparse | ⭐⭐ | ~5 MB | 3 min |
| 4. Clonar todo | ⭐⭐ | ~100 MB | 5-10 min |

---

## ✅ Verificar que Descargaste Correctamente

Después de descargar, tu carpeta `C:\print-manager\` debería tener:

```
C:\print-manager\
├── package-windows.json      ← Archivo de dependencias
├── server-windows.js          ← Servidor principal
├── test-windows.js            ← Script de prueba
├── INSTALACION_WINDOWS.md     ← Guía de instalación
└── README-STANDALONE.md       ← Información general
```

**Archivos opcionales (útiles pero no críticos):**
- `package-simple.json` - Versión alternativa
- `server-simple.js` - Versión alternativa
- `test-simple.js` - Test alternativo
- `README.md` - Documentación general
- Otros archivos de configuración

---

## 🚀 Siguiente Paso

Una vez descargado, continuar con: **INSTALACION_WINDOWS.md**

O inicio rápido:

```cmd
cd C:\print-manager
copy package-windows.json package.json
npm install
node server-windows.js
```

---

## 🆘 ¿Problemas?

- **DownGit no funciona:** Usar Opción 2 (manual)
- **No puedo descargar archivos:** Verificar conexión a Internet
- **El ZIP está corrupto:** Intentar de nuevo o usar Opción 2

---

## 📞 Soporte

- GitHub Issues: https://github.com/martin4yo/AxiomaWeb/issues
- Documentación: INSTALACION_WINDOWS.md

---

**Última actualización:** Diciembre 2024
