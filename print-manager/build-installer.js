/**
 * Script para construir el instalador de Axioma Print Manager
 *
 * Este script automatiza el proceso de:
 * 1. Empaquetar la aplicación con pkg
 * 2. Descargar herramientas necesarias (OpenSSL, NSSM)
 * 3. Preparar archivos para Inno Setup
 *
 * Requisitos:
 * - Node.js instalado
 * - pkg instalado globalmente: npm install -g pkg
 * - Inno Setup instalado: https://jrsoftware.org/isdl.php
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const BUILD_DIR = path.join(__dirname, 'build');
const TOOLS_DIR = path.join(__dirname, 'tools');

console.log('');
console.log('========================================');
console.log('  Axioma Print Manager - Build Script');
console.log('========================================');
console.log('');

// Crear directorios
function createDirs() {
  console.log('📁 Creando directorios...');
  [BUILD_DIR, TOOLS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Crear subdirectorios para herramientas
  ['openssl', 'nssm'].forEach(tool => {
    const toolDir = path.join(TOOLS_DIR, tool);
    if (!fs.existsSync(toolDir)) {
      fs.mkdirSync(toolDir, { recursive: true });
    }
  });
}

// Empaquetar con pkg
function buildExecutable() {
  console.log('');
  console.log('📦 Empaquetando aplicación con pkg...');
  console.log('   Esto puede tomar varios minutos...');

  try {
    execSync('pkg . --targets node18-win-x64 --output build/AxiomaPrintManager.exe', {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('✅ Ejecutable creado: build/AxiomaPrintManager.exe');
  } catch (error) {
    console.error('❌ Error empaquetando:', error.message);
    console.error('');
    console.error('Asegúrate de tener pkg instalado:');
    console.error('  npm install -g pkg');
    process.exit(1);
  }
}

// Descargar archivo
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Manejar redirecciones
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// Preparar herramientas
async function prepareTools() {
  console.log('');
  console.log('🔧 Preparando herramientas...');

  // Instrucciones para descargar herramientas manualmente
  console.log('');
  console.log('⚠️  IMPORTANTE: Descarga manualmente las siguientes herramientas:');
  console.log('');
  console.log('1. OpenSSL para Windows:');
  console.log('   URL: https://slproweb.com/products/Win32OpenSSL.html');
  console.log('   Descarga: Win64 OpenSSL Light');
  console.log('   Extrae openssl.exe a: tools/openssl/openssl.exe');
  console.log('');
  console.log('2. NSSM (Non-Sucking Service Manager):');
  console.log('   URL: https://nssm.cc/download');
  console.log('   Descarga: Latest release');
  console.log('   Extrae nssm.exe (64-bit) a: tools/nssm/nssm.exe');
  console.log('');

  // Verificar si ya existen
  const opensslPath = path.join(TOOLS_DIR, 'openssl', 'openssl.exe');
  const nssmPath = path.join(TOOLS_DIR, 'nssm', 'nssm.exe');

  if (fs.existsSync(opensslPath) && fs.existsSync(nssmPath)) {
    console.log('✅ Herramientas encontradas');
  } else {
    console.log('⚠️  Herramientas no encontradas. Por favor descárgalas manualmente.');
    console.log('');
    console.log('Presiona Enter cuando hayas copiado las herramientas...');

    // En entorno no interactivo, solo advertir
    if (process.stdin.isTTY) {
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    }
  }
}

// Generar README para el instalador
function generateReadme() {
  console.log('');
  console.log('📝 Generando README...');

  const readme = `# Axioma Print Manager - Instalador

## ¿Qué es esto?

Este instalador configura automáticamente el Print Manager para impresión térmica.

## Lo que hace el instalador:

1. ✅ Instala el Print Manager en C:\\Program Files\\AxiomaPrintManager
2. ✅ Genera certificados SSL automáticamente
3. ✅ Te permite configurar el nombre de tu impresora
4. ✅ Opcionalmente lo instala como servicio de Windows
5. ✅ Configura inicio automático

## Instalación:

1. Ejecuta AxiomaPrintManager-Setup-1.0.0.exe
2. Sigue el asistente de instalación
3. Cuando te pida el nombre de la impresora, ingresa el nombre exacto
   (puedes verlo en Panel de Control → Dispositivos e impresoras)
4. Marca "Instalar como servicio de Windows" (recomendado)
5. Finaliza la instalación

## Primera vez:

1. El instalador abrirá tu navegador en https://localhost:9100/health
2. Acepta el certificado de seguridad (es normal para certificados autofirmados)
3. ¡Listo! Ya puedes imprimir desde Axioma Web

## Configuración posterior:

- **Cambiar impresora:** Ejecuta "Configurar Impresora" desde el menú de inicio
- **Ver logs:** C:\\Program Files\\AxiomaPrintManager\\logs
- **Reiniciar servicio:** services.msc → AxiomaWebPrintManager → Reiniciar

## Desinstalación:

Panel de Control → Programas → Desinstalar Axioma Print Manager

---

Soporte: https://axiomaweb.axiomacloud.com
`;

  fs.writeFileSync(path.join(__dirname, 'README-INSTALADOR.md'), readme);
  console.log('✅ README-INSTALADOR.md creado');
}

// Compilar con Inno Setup
function compileInstaller() {
  console.log('');
  console.log('🏗️  Compilando instalador con Inno Setup...');

  const innoSetupPath = 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe';
  const issFile = path.join(__dirname, 'installer.iss');

  if (!fs.existsSync(innoSetupPath)) {
    console.log('⚠️  Inno Setup no encontrado en:', innoSetupPath);
    console.log('');
    console.log('Descarga e instala Inno Setup desde:');
    console.log('https://jrsoftware.org/isdl.php');
    console.log('');
    console.log('Luego ejecuta manualmente:');
    console.log(`"${innoSetupPath}" "${issFile}"`);
    return;
  }

  try {
    execSync(`"${innoSetupPath}" "${issFile}"`, {
      stdio: 'inherit'
    });
    console.log('');
    console.log('✅ Instalador creado en: installer-output/');
  } catch (error) {
    console.error('❌ Error compilando instalador:', error.message);
  }
}

// Proceso principal
async function main() {
  try {
    createDirs();
    buildExecutable();
    await prepareTools();
    generateReadme();

    console.log('');
    console.log('========================================');
    console.log('  Build completado');
    console.log('========================================');
    console.log('');
    console.log('Siguiente paso:');
    console.log('1. Verifica que tools/openssl/openssl.exe existe');
    console.log('2. Verifica que tools/nssm/nssm.exe existe');
    console.log('3. Ejecuta Inno Setup manualmente o instálalo para compilar automáticamente');
    console.log('');

    // Intentar compilar instalador si Inno Setup está disponible
    compileInstaller();

  } catch (error) {
    console.error('');
    console.error('❌ Error durante el build:', error.message);
    process.exit(1);
  }
}

main();
