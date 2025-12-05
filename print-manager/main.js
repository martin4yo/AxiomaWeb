const { app, BrowserWindow, Menu } = require('electron')
// const Tray = require('electron').Tray // TODO: Habilitar cuando tengamos icono
const path = require('path')
const express = require('express')
const cors = require('cors')
const { printTicket, listPrinters } = require('./printer')

let mainWindow = null
let tray = null
let server = null
const PORT = 9100

// Crear servidor Express
function createServer() {
  const expressApp = express()

  expressApp.use(cors())
  expressApp.use(express.json())

  // Health check
  expressApp.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    })
  })

  // Listar impresoras
  expressApp.get('/printers', (req, res) => {
    try {
      const printers = listPrinters()
      res.json({ printers })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Endpoint principal de impresión
  expressApp.post('/print', async (req, res) => {
    try {
      const { template, data } = req.body

      if (!data) {
        return res.status(400).json({ error: 'Missing data' })
      }

      // Imprimir ticket
      await printTicket(data)

      res.json({
        success: true,
        message: 'Ticket enviado a impresora'
      })
    } catch (error) {
      console.error('Error printing:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })

  // Iniciar servidor
  server = expressApp.listen(PORT, () => {
    console.log(`Print Manager listening on http://localhost:${PORT}`)
  })
}

// Crear ventana principal (oculta por defecto)
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
    // icon: path.join(__dirname, 'icon.png')
  })

  mainWindow.loadFile('index.html')

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// Crear system tray
function createTray() {
  // TODO: Agregar icono y habilitar tray
  // const Tray = require('electron').Tray
  // tray = new Tray(path.join(__dirname, 'icon.png'))
  // const contextMenu = Menu.buildFromTemplate([...])
  // tray.setToolTip('Axioma Print Manager')
  // tray.setContextMenu(contextMenu)
  console.log('Tray deshabilitado temporalmente - falta icono')
}

// App ready
app.whenReady().then(() => {
  createServer()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit cuando todas las ventanas están cerradas (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // No cerrar la app, solo ocultar ventana
    // La app sigue corriendo en el tray
  }
})

// Cerrar servidor al salir
app.on('before-quit', () => {
  if (server) {
    server.close()
  }
})
