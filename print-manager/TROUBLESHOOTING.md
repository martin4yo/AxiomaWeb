# 🔧 Troubleshooting - Print Manager

## Problema: LIBUSB_ERROR_ACCESS al intentar imprimir

### Síntoma
```
Error in printTicket: Error: LIBUSB_ERROR_ACCESS
    at Device.open (/home/martin/Desarrollos/AxiomaWeb/print-manager/node_modules/usb/dist/usb/device.js:67:14)
```

Al ejecutar el test de impresión (`bash test-thermal-print.sh`), el sistema devuelve:
```json
{
    "success": false,
    "error": "Error al imprimir ticket",
    "details": "LIBUSB_ERROR_ACCESS"
}
```

### Causa Raíz

El error `LIBUSB_ERROR_ACCESS` ocurre cuando el proceso de Electron no tiene permisos para acceder al dispositivo USB. En Linux, hay dos causas principales:

1. **Driver del kernel `usblp` está capturando el dispositivo**
   - El driver `usblp` (Linux USB Printer) toma control exclusivo de las impresoras USB
   - Esto bloquea el acceso directo de libusb
   - Debe desvincularse (unbind) para permitir acceso directo

2. **Permisos insuficientes en `/dev/bus/usb/`**
   - El dispositivo USB tiene permisos restringidos (generalmente grupo `lp`)
   - El usuario que ejecuta Electron debe tener acceso de lectura/escritura
   - Se requiere pertenecer al grupo correcto o configurar permisos adecuados

---

## Diagnóstico Paso a Paso

### 1. Verificar que la impresora está conectada

```bash
lsusb | grep -i gprinter
```

**Salida esperada:**
```
Bus 003 Device 013: ID 8866:0100 ZHU HAI SUNCSW Receipt Printer Co.,Ltd Gprinter GP-L18080
```

### 2. Verificar si usblp está capturando el dispositivo

```bash
ls -la /sys/bus/usb/drivers/usblp/ | grep "3-"
```

**Si hay salida**, significa que usblp está vinculado al dispositivo. Ejemplo:
```
lrwxrwxrwx  1 root root    0 dic  4 14:42 3-1:1.0 -> ../../../../devices/pci0000:00/0000:00:14.0/usb3/3-1/3-1:1.0
```

**Si no hay salida**, usblp no está vinculado y puedes continuar con el paso 3.

### 3. Verificar permisos del dispositivo

```bash
# Primero, obtener el número de bus y dispositivo de lsusb
# Ejemplo: Bus 003 Device 013 -> /dev/bus/usb/003/013

ls -l /dev/bus/usb/003/013
```

**Salida típica:**
```
crw-rw-r-- 1 root lp 189, 268 dic  4 14:01 /dev/bus/usb/003/013
```

Nota:
- `root lp` = propiedad de root, grupo lp
- `crw-rw-r--` = permisos: owner(rw), group(rw), others(r)

### 4. Verificar grupos del usuario

```bash
groups $USER
```

**Salida esperada debería incluir `lp`:**
```
martin adm cdrom sudo dip lp plugdev lpadmin
```

---

## Soluciones

### Solución 1: Desvincular usblp (Temporal)

Si el driver usblp está capturando el dispositivo:

```bash
# 1. Encontrar el dispositivo vinculado
ls -la /sys/bus/usb/drivers/usblp/ | grep "3-"

# 2. Copiar el nombre (ej: 3-1:1.0) y ejecutar:
sudo bash -c "echo '3-1:1.0' > /sys/bus/usb/drivers/usblp/unbind"
```

**Nota:** Esto es temporal. Si desconectas y reconectas la impresora, usblp la capturará nuevamente.

**Posibles errores:**
- `No existe el dispositivo`: El dispositivo ya está desvinculado o el nombre es incorrecto
- Verifica nuevamente con: `ls -la /sys/bus/usb/drivers/usblp/`

### Solución 2: Dar permisos al dispositivo USB (Temporal)

Si el usuario no está en el grupo `lp` o los permisos son restrictivos:

```bash
# Reemplaza 003/013 con tu bus/device de lsusb
sudo chmod 666 /dev/bus/usb/003/013
```

**Verifica el cambio:**
```bash
ls -l /dev/bus/usb/003/013
```

Debería mostrar:
```
crw-rw-rw- 1 root lp 189, 268 dic  4 14:01 /dev/bus/usb/003/013
```

**Nota:** Esto es temporal. Los permisos se restablecen al desconectar/reconectar o reiniciar.

### Solución 3: Configuración Permanente (Recomendado)

#### Opción A: Agregar usuario al grupo lp

```bash
# Agregar usuario al grupo lp
sudo usermod -a -G lp $USER

# Verificar
groups $USER

# IMPORTANTE: Cerrar sesión y volver a iniciar para que tome efecto
# Alternativamente, ejecutar: newgrp lp
```

#### Opción B: Regla udev (Más robusto)

El archivo `99-gprinter.rules` ya está creado en el directorio print-manager.

**Instalación:**

```bash
# 1. Copiar regla udev
sudo cp print-manager/99-gprinter.rules /etc/udev/rules.d/

# 2. Recargar reglas
sudo udevadm control --reload-rules
sudo udevadm trigger

# 3. Desconectar y reconectar la impresora
# O reiniciar el sistema
```

**Contenido de 99-gprinter.rules:**
```
# Gprinter GP-L18080 - Allow direct USB access for thermal printing
# Unbind usblp driver and set permissions
SUBSYSTEM=="usb", ATTRS{idVendor}=="8866", ATTRS{idProduct}=="0100", MODE="0666", GROUP="lp", RUN+="/bin/sh -c 'echo -n $kernel > /sys/bus/usb/drivers/usblp/unbind 2>/dev/null || true'"
```

Esta regla:
- Detecta automáticamente la Gprinter (vendorId: 8866, productId: 0100)
- Establece permisos 0666 (lectura/escritura para todos)
- Asigna grupo `lp`
- Desvincula automáticamente el driver usblp

**Verificar que la regla funciona:**

```bash
# 1. Desconectar y reconectar la impresora

# 2. Verificar permisos
ls -l /dev/bus/usb/003/013  # Ajustar números según lsusb

# 3. Verificar que usblp NO está vinculado
ls -la /sys/bus/usb/drivers/usblp/ | grep "3-"
# No debería mostrar ningún dispositivo
```

---

## Testing Final

Una vez aplicada cualquiera de las soluciones:

```bash
# Test automático completo
bash test-thermal-print.sh
```

**Salida esperada exitosa:**
```
🔧 Probando sistema de impresión térmica...

1. Verificando Print Manager...
✅ Print Manager está activo

2. Verificando Backend...
✅ Backend está activo

3. Autenticando usuario...
✅ Autenticación exitosa

4. Obteniendo ventas...
✅ Venta encontrada: cmin3yxha0002ccn8z8vltpkn

5. Enviando a impresora térmica...
{
    "success": true,
    "message": "Ticket enviado a impresora térmica",
    "printManager": {
        "success": true,
        "message": "Ticket enviado a impresora"
    }
}

✅ ¡Impresión exitosa!
```

**Logs del Print Manager (esperados):**
```
Opening USB device...
Generating ticket data...
Sending to printer...
Ticket sent successfully!
```

---

## Errores Comunes

### Error: "No se encontró impresora térmica USB conectada"

**Causa:** La impresora no está conectada o tiene vendorId/productId diferente.

**Solución:**
```bash
# Verificar impresoras USB
lsusb

# Buscar impresoras con clase 7 (printer class)
for dev in /sys/bus/usb/devices/*; do
  if [ -f "$dev/idVendor" ]; then
    vendor=$(cat $dev/idVendor)
    product=$(cat $dev/idProduct)
    echo "$vendor:$product - $(ls -d $dev | xargs basename)"
  fi
done
```

Si tu impresora tiene un vendorId/productId diferente, actualiza `printer.js` línea 66:
```javascript
const device = usb.findByIds(0x8866, 0x0100) // Cambiar estos valores
```

### Error: "LIBUSB_ERROR_NOT_FOUND"

**Causa:** El dispositivo se desconectó durante la impresión.

**Solución:**
- Verificar conexión física del cable USB
- Intentar otro puerto USB
- Revisar dmesg: `dmesg | tail -20`

### Error: "LIBUSB_ERROR_BUSY"

**Causa:** Otro proceso está usando la impresora.

**Solución:**
```bash
# Ver procesos usando dispositivos USB
lsof /dev/bus/usb/003/013

# O matar procesos de Electron duplicados
pkill -9 electron
```

### Error: Print Manager no responde (ECONNREFUSED)

**Causa:** El Print Manager no está corriendo.

**Solución:**
```bash
# Verificar si está corriendo
curl http://localhost:9100/health

# Si no responde, iniciar:
cd print-manager
npm start
```

### La impresora imprime pero sale en blanco

**Causa:** Papel térmico instalado al revés o agotado.

**Solución:**
- El papel térmico tiene un lado sensible al calor (generalmente más brillante)
- Reinstalar el papel con el lado sensible hacia arriba
- Probar con papel nuevo

### Impresión cortada o caracteres extraños

**Causa:** Comandos ESC/POS incorrectos o buffer incompleto.

**Solución:**
- Verificar que todos los comandos ESC/POS están correctos en `printer.js`
- Agregar delay antes de cerrar el dispositivo (ya implementado: 100ms)
- Revisar logs del Print Manager para ver qué se envió

---

## Comandos de Debug Útiles

```bash
# Ver todos los dispositivos USB con detalles
lsusb -v | less

# Ver dispositivos USB en árbol
lsusb -t

# Monitorear eventos USB en tiempo real
# (Requiere instalación: sudo apt install usbutils)
sudo usbmon

# Ver logs del kernel sobre USB
dmesg | grep -i usb | tail -20

# Ver permisos de todos los dispositivos USB
ls -lR /dev/bus/usb/

# Ver qué módulos del kernel están cargados
lsmod | grep usb

# Información detallada de un dispositivo USB
udevadm info -a -n /dev/bus/usb/003/013

# Test manual de impresión (enviar comandos ESC/POS directamente)
echo -e "\x1B\x40Hello World\x1B\x64\x05" | sudo tee /dev/usb/lp0
# Nota: Esto solo funciona si usblp está vinculado
```

---

## Arquitectura de Acceso USB

```
┌─────────────────────────────────────────┐
│         Aplicación Electron              │
│    (Print Manager - Node.js)             │
└───────────────┬─────────────────────────┘
                │
                │ node-usb (libusb binding)
                │
┌───────────────▼─────────────────────────┐
│         libusb (userspace)               │
│   Biblioteca de acceso USB directo       │
└───────────────┬─────────────────────────┘
                │
                │ ioctl, read/write
                │
┌───────────────▼─────────────────────────┐
│      Kernel USB Stack                    │
│   (/dev/bus/usb/XXX/YYY)                 │
└───────────────┬─────────────────────────┘
                │
                │ USB Protocol
                │
┌───────────────▼─────────────────────────┐
│     Hardware USB Controller              │
│   (xHCI, EHCI, UHCI drivers)             │
└───────────────┬─────────────────────────┘
                │
                │ Physical USB
                │
┌───────────────▼─────────────────────────┐
│     Gprinter GP-L18080                   │
│   (Thermal Receipt Printer)              │
└─────────────────────────────────────────┘
```

**Conflicto con usblp:**

```
                                    ┌──────────────────┐
                                    │   Electron App   │
                                    └────────┬─────────┘
                                             │
                                             ▼ BLOQUEADO
┌──────────────────┐              ┌─────────────────────┐
│   usblp driver   │◄─────────────│   Kernel USB        │
│  (kernel space)  │  VINCULADO   │                     │
└──────────────────┘              └─────────────────────┘
                                             ▲
                                             │
                                    ┌────────┴─────────┐
                                    │   USB Hardware   │
                                    └──────────────────┘
```

**Después de unbind:**

```
┌──────────────────┐              ┌─────────────────────┐
│   Electron App   │◄─────────────│   Kernel USB        │
│   (via libusb)   │  ACCESO OK   │                     │
└──────────────────┘              └─────────────────────┘
                                             ▲
                                             │
                                    ┌────────┴─────────┐
                                    │   USB Hardware   │
                                    └──────────────────┘
```

---

## Checklist de Resolución

- [ ] Impresora está conectada y aparece en `lsusb`
- [ ] Driver usblp está desvinculado o no está capturando el dispositivo
- [ ] Usuario pertenece al grupo `lp` (para solución permanente)
- [ ] Permisos del dispositivo USB son al menos `rw-rw-r--`
- [ ] Print Manager está corriendo en puerto 9100
- [ ] Backend está corriendo y puede conectarse a Print Manager
- [ ] Test `bash test-thermal-print.sh` es exitoso
- [ ] Regla udev instalada (para solución permanente)

---

## Referencias

- [libusb Documentation](https://libusb.info/)
- [node-usb GitHub](https://github.com/node-usb/node-usb)
- [Linux USB FAQ](https://www.linux-usb.org/FAQ.html)
- [udev Rules Writing](https://wiki.debian.org/udev)
- [ESC/POS Command Reference (Epson)](https://reference.epson-biz.com/modules/ref_escpos/)
- [USB Device Permissions on Linux](https://opensource.com/article/18/11/udev-rules-raspberry-pi)
