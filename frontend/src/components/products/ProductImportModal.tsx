import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useDialog } from '../../hooks/useDialog'

interface ProductImportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ImportResult {
  totalRows: number
  imported: number
  updated: number
  skipped: number
  errors: Array<{ row: number; error: string }>
  categoriesCreated: string[]
  brandsCreated: string[]
}

export function ProductImportModal({ isOpen, onClose }: ProductImportModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post(`/${currentTenant!.slug}/products/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000 // 5 minutos para archivos grandes
      })
      return response.data
    },
    onSuccess: (data) => {
      setImportResult(data.data)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: any) => {
      console.error('Error importing products:', error)
      dialog.error(error.response?.data?.error || 'Error al importar productos')
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setImportResult(null)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        setSelectedFile(file)
        setImportResult(null)
      } else {
        dialog.warning('Solo se permiten archivos Excel (.xls, .xlsx)')
      }
    }
  }

  const handleImport = () => {
    if (!selectedFile) return
    importMutation.mutate(selectedFile)
  }

  const handleClose = () => {
    // No permitir cerrar mientras se está importando
    if (importMutation.isPending) return

    setSelectedFile(null)
    setImportResult(null)
    importMutation.reset()
    onClose()
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Productos desde Excel">
      <div className="space-y-4">
        {importMutation.isPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Procesando archivo...</p>
                <p className="text-xs text-blue-700">
                  La importación puede tardar varios minutos dependiendo del tamaño del archivo. Por favor, no cierre esta ventana.
                </p>
              </div>
            </div>
          </div>
        )}

        {!importResult && !importMutation.isPending && (
          <>
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-green-500" />
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectFile}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <button
                      type="button"
                      onClick={handleSelectFile}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Selecciona un archivo
                    </button>
                    <span className="text-gray-600"> o arrastra y suelta</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Archivos Excel (.xls, .xlsx) hasta 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Formato del archivo Excel
              </h4>
              <p className="text-xs text-blue-800 mb-2">
                El archivo debe contener las siguientes columnas:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Codigo:</strong> Código del producto (obligatorio)</li>
                <li><strong>Descripcion:</strong> Nombre del producto (obligatorio)</li>
                <li><strong>Precio Costo:</strong> Precio de costo</li>
                <li><strong>Precio Venta:</strong> Precio de venta</li>
                <li><strong>Categoria:</strong> Categoría del producto</li>
                <li><strong>Marca:</strong> Marca del producto</li>
                <li><strong>Codigo de Barras:</strong> Código de barras</li>
                <li><strong>ControlStock:</strong> 1 para controlar stock, 0 para no controlar (opcional, por defecto 0)</li>
              </ul>
              <p className="text-xs text-blue-800 mt-2">
                <strong>Nota:</strong> Si el código ya existe, se actualizará el producto. Las categorías y marcas se crearán automáticamente si no existen.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={importMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
              >
                {importMutation.isPending ? 'Importando... (esto puede tardar varios minutos)' : 'Importar'}
              </Button>
            </div>
          </>
        )}

        {importResult && (
          <>
            {/* Results */}
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      Importación completada
                    </h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>Total de filas procesadas: <strong>{importResult.totalRows}</strong></p>
                      <p>Productos nuevos: <strong>{importResult.imported}</strong></p>
                      <p>Productos actualizados: <strong>{importResult.updated}</strong></p>
                      {importResult.skipped > 0 && (
                        <p>Filas omitidas (sin código o descripción): <strong>{importResult.skipped}</strong></p>
                      )}
                      {importResult.categoriesCreated.length > 0 && (
                        <p>Categorías creadas: <strong>{importResult.categoriesCreated.length}</strong> ({importResult.categoriesCreated.join(', ')})</p>
                      )}
                      {importResult.brandsCreated.length > 0 && (
                        <p>Marcas creadas: <strong>{importResult.brandsCreated.length}</strong> ({importResult.brandsCreated.join(', ')})</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-900 mb-2">
                        Errores encontrados ({importResult.errors.length})
                      </h4>
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="text-xs text-red-800 space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>
                              Fila {error.row}: {error.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="primary"
                onClick={handleClose}
              >
                Cerrar
              </Button>
            </div>
          </>
        )}
      </div>
      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </Modal>
  )
}
