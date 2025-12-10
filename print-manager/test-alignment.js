// Script para probar alineación de columnas
function fitText(text, width, align = 'left') {
  text = text || ''
  if (text.length > width) {
    return text.substring(0, width)
  }
  if (text.length < width) {
    const padding = ' '.repeat(width - text.length)
    if (align === 'right') {
      return padding + text
    } else if (align === 'center') {
      const leftPad = Math.floor(padding.length / 2)
      const rightPad = padding.length - leftPad
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
    }
    return text + padding
  }
  return text
}

// Datos de prueba
const items = [
  { name: 'Coca Cola 1.5L', qty: 1, price: 50.00, total: 50.00 },
  { name: 'Agua Mineral 500ml', qty: 10, price: 25.50, total: 255.00 },
  { name: 'Pan Integral', qty: 2, price: 85.00, total: 170.00 },
  { name: 'Galletitas Chocolate', qty: 150, price: 1250.99, total: 187648.50 }
]

console.log('========================================')
console.log('PRUEBA DE ALINEACIÓN - 48 caracteres')
console.log('========================================')
console.log('')
console.log('PRODUCTOS')
console.log('----------------------------------------')

items.forEach(item => {
  const qtyStr = item.qty.toString()
  const priceStr = `$${item.price.toFixed(2)}`
  const totalStr = `$${item.total.toFixed(2)}`

  // Columnas con anchos fijos
  const col1 = fitText(qtyStr, 7, 'right')      // Cantidad (7 chars)
  const col2 = fitText(priceStr, 15, 'right')   // Precio (15 chars)
  const col3 = fitText(totalStr, 15, 'right')   // Total (15 chars)

  // Nombre del producto
  console.log(item.name)

  // Línea numérica
  const line = col1 + ' x ' + col2 + ' = ' + col3
  console.log(line)
  console.log('Longitud de línea:', line.length, 'caracteres')
})

console.log('----------------------------------------')
console.log('')
console.log('Leyenda:')
console.log('Col1 (Cantidad): 7 caracteres alineados a derecha')
console.log('Col2 (Precio):   15 caracteres alineados a derecha')
console.log('Col3 (Total):    15 caracteres alineados a derecha')
console.log('Total línea:     7 + 3 + 15 + 3 + 15 = 43 caracteres')
