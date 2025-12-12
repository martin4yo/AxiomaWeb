# Axioma Print Manager - Instalador

## ¿Qué es esto?

Este instalador configura automáticamente el Print Manager para impresión térmica directa desde Axioma Web.

---

## 🚀 Instalación (Usuario Final)

### Paso 1: Descargar

Descarga el instalador:
```
AxiomaPrintManager-Setup-1.0.0.exe
```

### Paso 2: Ejecutar

1. **Doble clic** en el instalador
2. Si Windows SmartScreen pregunta, clic en **"Más información"** → **"Ejecutar de todas formas"**
   (Es normal para aplicaciones nuevas)

### Paso 3: Seguir el Asistente

1. **Bienvenida** → Siguiente
2. **Licencia** → Aceptar
3. **Carpeta de instalación** → Dejar por defecto (C:\Program Files\AxiomaPrintManager)
4. **Nombre de impresora:**
   - Ingresa el nombre **exacto** de tu impresora térmica
   - Para verlo: Panel de Control → Dispositivos e impresoras
   - Ejemplos: `POS-80`, `TM-T20`, `EPSON TM-T20II`
5. **Opciones:**
   - ✅ Marcar: **"Iniciar automáticamente con Windows"**
   - ✅ Marcar: **"Instalar como servicio de Windows"** (recomendado)
6. **Instalar** → Esperar (tarda 1-2 minutos)

### Paso 4: Primera Configuración

Al finalizar la instalación:

1. Se abrirá tu navegador en `https://localhost:9100/health`
2. Verás una **advertencia de seguridad** - Es NORMAL
3. Clic en **"Avanzado"** → **"Ir a localhost (sitio no seguro)"**
4. Verás un JSON: `{"status": "ok", ...}`
5. ✅ **¡Listo!** Ya puedes cerrar esa pestaña

---

## 🖨️ Uso

### Desde Axioma Web

1. Ingresa a https://axiomaweb.axiomacloud.com
2. Realiza una venta
3. Clic en **"IMPRIMIR TICKET"** 🎫
4. El ticket se imprime **automáticamente** en tu impresora térmica

**No necesitas presionar Ctrl+P**

### Para imprimir factura en impresora común

1. Clic en **"PDF"** 📄
2. Se abre el PDF
3. Ctrl+P para imprimir
4. Selecciona tu impresora común

---

## ⚙️ Configuración

### Cambiar nombre de impresora

**Opción 1 - Menú Inicio:**
1. Busca "Axioma Print Manager"
2. Clic en **"Configurar Impresora"**
3. Ingresa el nuevo nombre
4. Reinicia el servicio

**Opción 2 - Servicios de Windows:**
1. Win + R → `services.msc`
2. Busca **"AxiomaWebPrintManager"**
3. Clic derecho → **Detener**
4. Edita: `C:\Program Files\AxiomaPrintManager\config.txt`
5. Cambia `PRINTER_NAME=...`
6. Vuelve a Iniciar el servicio

### Ver si está funcionando

Abre en el navegador:
```
https://localhost:9100/health
```

Deberías ver:
```json
{
  "status": "ok",
  "message": "Print Manager running on Windows",
  "printerName": "TU-IMPRESORA"
}
```

---

## 🔧 Administración

### Ver estado del servicio

```cmd
Win + R → services.msc
Buscar: AxiomaWebPrintManager
```

### Reiniciar servicio

**Opción A - Servicios:**
1. `services.msc`
2. **AxiomaWebPrintManager** → Clic derecho → Reiniciar

**Opción B - CMD como admin:**
```cmd
sc stop AxiomaWebPrintManager
sc start AxiomaWebPrintManager
```

### Ver logs

```
C:\Program Files\AxiomaPrintManager\logs\
```

Archivos:
- `service-output.log` - Salida normal
- `service-error.log` - Errores

---

## 🚨 Solución de Problemas

### No imprime

**1. Verificar que el servicio esté corriendo:**
```cmd
sc query AxiomaWebPrintManager
```

Debería decir: `STATE: RUNNING`

**2. Verificar conexión:**
- Abre: https://localhost:9100/health
- Si no carga, el servicio está detenido

**3. Verificar nombre de impresora:**
- `C:\Program Files\AxiomaPrintManager\config.txt`
- Verifica que `PRINTER_NAME` sea exacto

**4. Verificar que la impresora funcione:**
- Panel de Control → Dispositivos e impresoras
- Clic derecho en tu impresora → Imprimir página de prueba

### Error de certificado en el navegador

Es normal la primera vez. Solo debes aceptarlo **una vez**:
1. Clic en "Avanzado"
2. Clic en "Ir a localhost"
3. No volverá a aparecer

### El servicio no inicia

**Ver el error:**
```cmd
C:\Program Files\AxiomaPrintManager\logs\service-error.log
```

**Causas comunes:**
- Puerto 9100 ocupado por otro programa
- Certificados faltantes (ejecuta setup-certificates.bat)
- Permisos insuficientes

---

## 🗑️ Desinstalar

**Opción 1 - Panel de Control:**
1. Panel de Control → Programas y características
2. Busca "Axioma Print Manager"
3. Desinstalar

**Opción 2 - Configuración:**
1. Win + I → Aplicaciones
2. Busca "Axioma Print Manager"
3. Desinstalar

El desinstalador:
- Detiene el servicio
- Elimina archivos
- Limpia el registro

---

## 📞 Soporte

- **Web:** https://axiomaweb.axiomacloud.com
- **Documentación completa:** Ver carpeta de instalación

---

## ✅ Checklist Post-Instalación

- [ ] Instalador ejecutado exitosamente
- [ ] Certificado aceptado en navegador
- [ ] https://localhost:9100/health funciona
- [ ] Servicio aparece en services.msc
- [ ] Nombre de impresora configurado correctamente
- [ ] Prueba de impresión desde Axioma Web exitosa

**¡Listo para imprimir! 🎉**
