import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface ExcelProduct {
  Nro?: number;
  Codigo?: string;
  Descripcion?: string;
  'Precio Costo'?: number;
  Margen?: number;
  'Precio Venta'?: number;
  Rubro?: string;
  Marca?: string;
  Categoria?: string;
  'Unidades por Bulto'?: number;
  'Codigo de Barras'?: string;
  'Iva (Ver Ref.)'?: string;
  'Unidad de Compra'?: string;
  'Factor de Conversion'?: number;
  ControlStock?: number;
}

interface ImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  categoriesCreated: string[];
  brandsCreated: string[];
}

export class ProductImportService {

  constructor(private prisma: PrismaClient, private tenantId: string) {}

  /**
   * Importa productos desde un archivo Excel
   */
  async importFromExcel(
    filePath: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      totalRows: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      categoriesCreated: [],
      brandsCreated: []
    };

    try {
      // Leer archivo Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convertir a JSON
      const data = XLSX.utils.sheet_to_json<ExcelProduct>(worksheet);
      result.totalRows = data.length;

      // Caché para categorías y marcas
      const categoryCache = new Map<string, string>();
      const brandCache = new Map<string, string>();

      // Pre-cargar categorías y marcas existentes
      const existingCategories = await this.prisma.productCategory.findMany({
        where: { tenantId: this.tenantId },
        select: { id: true, name: true }
      });
      existingCategories.forEach(cat => categoryCache.set(cat.name, cat.id));

      const existingBrands = await this.prisma.productBrand.findMany({
        where: { tenantId: this.tenantId },
        select: { id: true, name: true }
      });
      existingBrands.forEach(brand => brandCache.set(brand.name, brand.id));

      // Pre-cargar productos existentes
      const existingProducts = await this.prisma.product.findMany({
        where: { tenantId: this.tenantId },
        select: { id: true, sku: true }
      });
      const productCache = new Map<string, string>();
      existingProducts.forEach(prod => productCache.set(prod.sku, prod.id));

      // Procesar cada fila
      console.log(`Iniciando importación de ${data.length} productos...`);
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque la primera fila es header y Excel empieza en 1

        // Log progreso cada 100 productos
        if (i > 0 && i % 100 === 0) {
          console.log(`Procesados ${i}/${data.length} productos...`);
        }

        try {
          // Ignorar filas sin descripción o código
          if (!row.Codigo || !row.Descripcion) {
            // Simplemente saltar esta fila sin registrar error
            result.skipped++;
            continue;
          }

          // Limpiar código (remover espacios)
          const sku = String(row.Codigo).trim().padStart(5, '0');
          const name = String(row.Descripcion).trim();
          const costPrice = row['Precio Costo'] || 0;
          const salePrice = row['Precio Venta'] || 0;
          const barcode = row['Codigo de Barras'] ? String(row['Codigo de Barras']).trim() : null;

          // Control de stock: usar columna ControlStock si existe (1 = true, 0 = false), sino false por defecto
          const trackStock = row.ControlStock !== undefined ? row.ControlStock === 1 : false;

          // Preparar metadata
          const metadata: any = {};
          if (row.Margen) metadata.margen = row.Margen;
          if (row['Unidades por Bulto']) metadata.unidadesPorBulto = row['Unidades por Bulto'];
          if (row['Iva (Ver Ref.)']) metadata.iva = row['Iva (Ver Ref.)'];
          if (row['Unidad de Compra']) metadata.unidadCompra = row['Unidad de Compra'];
          if (row['Factor de Conversion']) metadata.factorConversion = row['Factor de Conversion'];

          // Verificar si el producto ya existe usando cache
          const existingProductId = productCache.get(sku);
          let productId: string;

          if (existingProductId) {
            // Actualizar producto existente
            const updated = await this.prisma.product.update({
              where: { id: existingProductId },
              data: {
                name,
                barcode,
                costPrice: new Decimal(costPrice),
                salePrice: new Decimal(salePrice),
                trackStock,
                metadata
              }
            });
            productId = updated.id;
            result.updated++;
          } else {
            // Crear nuevo producto
            const created = await this.prisma.product.create({
              data: {
                tenantId: this.tenantId,
                sku,
                name,
                barcode,
                costPrice: new Decimal(costPrice),
                salePrice: new Decimal(salePrice),
                trackStock,
                metadata
              }
            });
            productId = created.id;
            productCache.set(sku, productId); // Actualizar cache
            result.imported++;
          }

          // Manejar categoría
          if (row.Categoria) {
            const categoryName = String(row.Categoria).trim();
            let categoryId = categoryCache.get(categoryName);

            if (!categoryId) {
              // Crear categoría (solo si no existe en cache)
              const category = await this.prisma.productCategory.create({
                data: {
                  tenantId: this.tenantId,
                  name: categoryName
                }
              });
              result.categoriesCreated.push(categoryName);
              categoryId = category.id;
              categoryCache.set(categoryName, categoryId);
            }

            // Asociar producto con categoría (categoryId is guaranteed to be defined here)
            try {
              await this.prisma.productCategoryProduct.upsert({
                where: {
                  productId_categoryId: {
                    productId,
                    categoryId
                  }
                },
                create: {
                  productId,
                  categoryId
                },
                update: {}
              });
            } catch (catError: any) {
              console.error(`Error asociando categoría en fila ${rowNumber}:`, catError.message);
              throw catError; // Re-throw para que se capture en el catch principal
            }
          }

          // Manejar marca
          if (row.Marca) {
            const brandName = String(row.Marca).trim();
            let brandId = brandCache.get(brandName);

            if (!brandId) {
              // Crear marca (solo si no existe en cache)
              const brand = await this.prisma.productBrand.create({
                data: {
                  tenantId: this.tenantId,
                  name: brandName
                }
              });
              result.brandsCreated.push(brandName);
              brandId = brand.id;
              brandCache.set(brandName, brandId);
            }

            // Asociar producto con marca (brandId is guaranteed to be defined here)
            try {
              await this.prisma.productBrandProduct.upsert({
                where: {
                  productId_brandId: {
                    productId,
                    brandId
                  }
                },
                create: {
                  productId,
                  brandId
                },
                update: {}
              });
            } catch (brandError: any) {
              console.error(`Error asociando marca en fila ${rowNumber}:`, brandError.message);
              throw brandError; // Re-throw para que se capture en el catch principal
            }
          }

        } catch (error: any) {
          console.error(`Error en fila ${rowNumber}:`, error.message);
          result.errors.push({
            row: rowNumber,
            error: error.message || 'Error desconocido'
          });
        }
      }

      console.log(`Importación completada: ${result.imported} nuevos, ${result.updated} actualizados, ${result.skipped} omitidos, ${result.errors.length} errores`);
      return result;

    } catch (error: any) {
      throw new Error(`Error al importar productos: ${error.message}`);
    }
  }
}
