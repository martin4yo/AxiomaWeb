import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Tag } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useAuthStore } from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextArea } from '../../components/ui/TextArea'
import { productCategoriesApi } from '../../api/product-categories'
import { useDialog } from '../../hooks/useDialog'

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional()
})

type CategoryForm = z.infer<typeof categorySchema>

export default function ProductCategoriesPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: selectedCategory || {}
  })

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['product-categories', currentTenant?.slug, search],
    queryFn: async () => {
      return await productCategoriesApi.getAll(currentTenant!.slug, search)
    },
    enabled: !!currentTenant
  })

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (data: CategoryForm) => {
      return await productCategoriesApi.create(currentTenant!.slug, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      reset()
      setShowModal(false)
    }
  })

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async (data: CategoryForm) => {
      return await productCategoriesApi.update(currentTenant!.slug, selectedCategory.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      setShowModal(false)
      setSelectedCategory(null)
    }
  })

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      return await productCategoriesApi.delete(currentTenant!.slug, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    }
  })

  const handleCreate = () => {
    setSelectedCategory(null)
    setModalMode('create')
    reset()
    setShowModal(true)
  }

  const handleEdit = (category: any) => {
    setSelectedCategory(category)
    setModalMode('edit')
    reset(category)
    setShowModal(true)
  }

  const handleDelete = (category: any) => {
    dialog.confirm(
      `¿Estás seguro de eliminar la categoría "${category.name}"?`,
      () => deleteCategory.mutate(category.id),
      'Eliminar Categoría'
    )
  }

  const onSubmit = (data: CategoryForm) => {
    if (modalMode === 'create') {
      createCategory.mutate(data)
    } else {
      updateCategory.mutate(data)
    }
  }

  const actions = [
    {
      label: 'Nueva Categoría',
      icon: Plus,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías de Productos"
        subtitle="Gestiona las categorías para organizar tu inventario"
        actions={actions}
      />

      {/* Filtros */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar categorías..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de categorías */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Categorías ({categories?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin categorías</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron categorías que coincidan con la búsqueda.'
                  : 'Comienza creando tu primera categoría.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Categoría
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category: any) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{category.name}</h4>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                      <div className="mt-2">
                        <Badge variant={category.isActive ? 'success' : 'error'} size="sm">
                          {category.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="h-4 w-4" />
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
        title={modalMode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <Input
              label="Nombre *"
              placeholder="Nombre de la categoría"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextArea
              label="Descripción"
              rows={3}
              placeholder="Descripción opcional de la categoría"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}