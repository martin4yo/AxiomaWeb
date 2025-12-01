import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Building2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextArea } from '../../components/ui/TextArea'

const brandSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional()
})

type BrandForm = z.infer<typeof brandSchema>

export default function ProductBrandsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: selectedBrand || {}
  })

  // Fetch brands
  const { data: brands, isLoading } = useQuery({
    queryKey: ['product-brands', currentTenant?.slug, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await api.get(`/${currentTenant!.slug}/product-brands?${params}`)
      return response.data.brands || []
    },
    enabled: !!currentTenant
  })

  // Create brand mutation
  const createBrand = useMutation({
    mutationFn: async (data: BrandForm) => {
      const response = await api.post(`/${currentTenant!.slug}/product-brands`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] })
      reset()
      setShowModal(false)
    }
  })

  // Update brand mutation
  const updateBrand = useMutation({
    mutationFn: async (data: BrandForm) => {
      const response = await api.put(`/${currentTenant!.slug}/product-brands/${selectedBrand.id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] })
      setShowModal(false)
      setSelectedBrand(null)
    }
  })

  // Delete brand mutation
  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/${currentTenant!.slug}/product-brands/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] })
    }
  })

  const handleCreate = () => {
    setSelectedBrand(null)
    setModalMode('create')
    reset()
    setShowModal(true)
  }

  const handleEdit = (brand: any) => {
    setSelectedBrand(brand)
    setModalMode('edit')
    reset(brand)
    setShowModal(true)
  }

  const handleDelete = (brand: any) => {
    if (confirm(`¿Estás seguro de eliminar la marca "${brand.name}"?`)) {
      deleteBrand.mutate(brand.id)
    }
  }

  const onSubmit = (data: BrandForm) => {
    if (modalMode === 'create') {
      createBrand.mutate(data)
    } else {
      updateBrand.mutate(data)
    }
  }

  const actions = [
    {
      label: 'Nueva Marca',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marcas de Productos"
        subtitle="Gestiona las marcas para organizar tu inventario"
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
                  placeholder="Buscar marcas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de marcas */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Marcas ({brands?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !brands || brands.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin marcas</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron marcas que coincidan con la búsqueda.'
                  : 'Comienza creando tu primera marca.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nueva Marca
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand: any) => (
                <div key={brand.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{brand.name}</h4>
                      {brand.description && (
                        <p className="text-sm text-gray-500 mt-1">{brand.description}</p>
                      )}
                      <div className="mt-2">
                        <Badge variant={brand.isActive ? 'success' : 'error'} size="sm">
                          {brand.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(brand)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(brand)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nueva Marca' : 'Editar Marca'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <Input
              label="Nombre *"
              placeholder="Nombre de la marca"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextArea
              label="Descripción"
              rows={3}
              placeholder="Descripción opcional de la marca"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === 'create' ? 'Crear Marca' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}