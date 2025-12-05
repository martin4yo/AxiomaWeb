const usb = require('usb')
const { renderLegalThermalTicket, renderSimpleThermalTicket } = require('./thermal-templates')

/**
 * Lista todas las impresoras USB disponibles
 */
function listPrinters() {
  try {
    const devices = usb.getDeviceList()
    const printers = devices.filter(device => {
      // Buscar dispositivos que parezcan impresoras (clase 7)
      try {
        if (!device.deviceDescriptor) return false
        const desc = device.deviceDescriptor
        return desc.idVendor === 0x8866 // Gprinter específicamente
      } catch (e) {
        return false
      }
    })

    return printers.map((device, index) => ({
      id: index,
      vendorId: device.deviceDescriptor.idVendor,
      productId: device.deviceDescriptor.idProduct,
      name: `USB Printer ${index + 1}`
    }))
  } catch (error) {
    console.error('Error listing printers:', error)
    return []
  }
}

/**
 * Imprime un ticket en la impresora térmica USB
 * @param data Datos del ticket { business, sale, template }
 * @param data.template Tipo de plantilla: 'legal' (con CAE y QR) o 'simple' (sin datos fiscales)
 */
async function printTicket(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const { business, sale, template = 'legal' } = data

      // Buscar impresora Gprinter
      const device = usb.findByIds(0x8866, 0x0100)

      if (!device) {
        throw new Error('No se encontró impresora térmica USB conectada')
      }

      console.log('Opening USB device...')
      device.open()

      // Obtener el endpoint de salida
      const iface = device.interface(0)

      // Detach kernel driver if attached (Linux)
      if (iface.isKernelDriverActive()) {
        try {
          iface.detachKernelDriver()
        } catch (e) {
          console.log('Could not detach kernel driver:', e.message)
        }
      }

      iface.claim()

      const endpoint = iface.endpoints.find(ep => ep.direction === 'out')
      if (!endpoint) {
        throw new Error('No se encontró endpoint de salida')
      }

      console.log(`Generating ticket data using template: ${template}...`)

      // Generar ticket según plantilla
      let ticket = ''
      if (template === 'legal') {
        ticket = await renderLegalThermalTicket(sale, business)
      } else if (template === 'simple') {
        ticket = await renderSimpleThermalTicket(sale, business)
      } else {
        throw new Error(`Plantilla desconocida: ${template}`)
      }

      console.log('Sending to printer...')

      // Enviar a la impresora
      const buffer = Buffer.from(ticket, 'binary')

      endpoint.transfer(buffer, (error) => {
        if (error) {
          console.error('Error transferring data:', error)
          try {
            iface.release()
            device.close()
          } catch (e) {}
          reject(new Error(`Error al imprimir: ${error.message}`))
        } else {
          console.log('Ticket sent successfully!')

          // Dar tiempo para que la impresora procese
          setTimeout(() => {
            try {
              iface.release()
              device.close()
            } catch (e) {}
            resolve()
          }, 100)
        }
      })

    } catch (error) {
      console.error('Error in printTicket:', error)
      reject(error)
    }
  })
}

module.exports = {
  listPrinters,
  printTicket
}
