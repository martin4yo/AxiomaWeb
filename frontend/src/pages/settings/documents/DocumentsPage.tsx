import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { useAuthStore } from '../../../stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextArea } from '../../../components/ui/TextArea'

const documentTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().optional(),
  documentType: z.enum(['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'RECEIPT', 'ORDER', 'QUOTE', 'OTHER'], {
    errorMap: () => ({ message: 'Selecciona un tipo de documento válido' })
  }),
  prefix: z.string().optional(),
  requiresAuthorization: z.boolean().optional(),
  hasElectronicBilling: z.boolean().optional()
})

type DocumentTypeForm = z.infer<typeof documentTypeSchema>

export default function DocumentsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<DocumentTypeForm>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: selectedDocumentType || {}
  })

  // Fetch document types
  const { data: documentTypes, isLoading } = useQuery({
    queryKey: ['document-types', currentTenant?.slug, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/${currentTenant!.slug}/document-types?${params}`)
      if (!response.ok) throw new Error('Error fetching document types')
      const data = await response.json()
      return data.documentTypes || []
    },
    enabled: !!currentTenant
  })

  // Create document type mutation
  const createDocumentType = useMutation({
    mutationFn: async (data: DocumentTypeForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/document-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al crear tipo de comprobante')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] })
      reset()
      setShowModal(false)
    }
  })

  // Update document type mutation
  const updateDocumentType = useMutation({
    mutationFn: async (data: DocumentTypeForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/document-types/${selectedDocumentType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al actualizar tipo de comprobante')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] })
      setShowModal(false)
      setSelectedDocumentType(null)
    }
  })

  // Delete document type mutation
  const deleteDocumentType = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/${currentTenant!.slug}/document-types/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar tipo de comprobante')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] })
    }
  })

  const handleCreate = () => {
    setSelectedDocumentType(null)
    setModalMode('create')
    reset()
    setShowModal(true)
  }

  const handleEdit = (documentType: any) => {
    setSelectedDocumentType(documentType)
    setModalMode('edit')
    reset(documentType)
    setShowModal(true)
  }

  const handleDelete = (documentType: any) => {
    if (confirm(`¿Estás seguro de eliminar el tipo de comprobante "${documentType.name}"?`)) {
      deleteDocumentType.mutate(documentType.id)
    }
  }

  const onSubmit = (data: DocumentTypeForm) => {
    if (modalMode === 'create') {
      createDocumentType.mutate(data)
    } else {
      updateDocumentType.mutate(data)
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      INVOICE: 'Factura',
      CREDIT_NOTE: 'Nota de Crédito',
      DEBIT_NOTE: 'Nota de Débito',
      RECEIPT: 'Recibo',
      ORDER: 'Orden',
      QUOTE: 'Presupuesto',
      OTHER: 'Otro'
    }
    return labels[type as keyof typeof labels] || type
  }

  const actions = [
    {
      label: 'Nuevo Comprobante',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Comprobantes"
        subtitle="Gestiona los tipos de documentos fiscales"
        actions={actions}
      />

      {/* Filtros */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar tipos de comprobantes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de tipos de comprobantes */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tipos de Comprobantes ({documentTypes?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !documentTypes || documentTypes.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                📄
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin tipos de comprobantes</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron tipos de comprobantes que coincidan con la búsqueda.'
                  : 'Comienza creando tu primer tipo de comprobante.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nuevo Comprobante
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comprobante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Características
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentTypes.map((documentType: any) => (
                    <tr key={documentType.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {documentType.name}
                          </div>
                          {documentType.description && (
                            <div className="text-sm text-gray-500">
                              {documentType.description}
                            </div>
                          )}
                          {documentType.prefix && (
                            <div className="text-xs text-gray-400">
                              Prefijo: {documentType.prefix}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">
                          {documentType.code}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">
                          {getDocumentTypeLabel(documentType.documentType)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {documentType.requiresAuthorization && (
                            <Badge variant="warning" size="sm">
                              Requiere autorización
                            </Badge>
                          )}
                          {documentType.hasElectronicBilling && (
                            <Badge variant="success" size="sm">
                              Facturación electrónica
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={documentType.isActive ? 'success' : 'error'}>
                          {documentType.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(documentType)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(documentType)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nuevo Tipo de Comprobante' : 'Editar Tipo de Comprobante'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre *"
                placeholder="Ej: Factura A"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Código *"
                placeholder="Ej: FA"
                error={errors.code?.message}
                {...register('code')}
              />
            </div>
            <TextArea
              label="Descripción"
              rows={3}
              placeholder="Descripción opcional del tipo de comprobante"
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  {...register('documentType')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="INVOICE">Factura</option>
                  <option value="CREDIT_NOTE">Nota de Crédito</option>
                  <option value="DEBIT_NOTE">Nota de Débito</option>
                  <option value="RECEIPT">Recibo</option>
                  <option value="ORDER">Orden</option>
                  <option value="QUOTE">Presupuesto</option>
                  <option value="OTHER">Otro</option>
                </select>
                {errors.documentType && (
                  <p className="mt-1 text-sm text-red-600">{errors.documentType.message}</p>
                )}
              </div>
              <Input
                label="Prefijo"
                placeholder="Ej: 0001"
                error={errors.prefix?.message}
                {...register('prefix')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  id="requiresAuthorization"
                  type="checkbox"
                  {...register('requiresAuthorization')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="requiresAuthorization" className="ml-2 block text-sm text-gray-900">
                  Requiere autorización AFIP
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="hasElectronicBilling"
                  type="checkbox"
                  {...register('hasElectronicBilling')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="hasElectronicBilling" className="ml-2 block text-sm text-gray-900">
                  Facturación electrónica
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === 'create' ? 'Crear Comprobante' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}