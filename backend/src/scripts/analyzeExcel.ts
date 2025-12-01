import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../../..', 'Precios.xls');

try {
  const workbook = XLSX.readFile(filePath);

  console.log('Hojas disponibles:', workbook.SheetNames);

  // Leer la primera hoja
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convertir a JSON para ver la estructura
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('\n=== Primeras 10 filas ===');
  data.slice(0, 10).forEach((row: any, index: number) => {
    console.log(`Fila ${index}:`, row);
  });

  console.log('\n=== Total de filas:', data.length, '===');

} catch (error) {
  console.error('Error al leer el archivo:', error);
}
