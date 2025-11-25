import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const DocumentsPage = () => {
  // Mock data - in real app, this would come from API
  const documents = [
    {
      id: '1',
      type: 'Factura',
      number: 'FAC-00001234',
      displayNumber: 'B 0001-00001234',
      date: '2024-01-15',
      entityName: 'Cliente Example S.A.',
      totalAmount: 2450.00,
      status: 'confirmed',
      workflowStage: 'sent',
    },
    {
      id: '2',
      type: 'Presupuesto',
      number: 'PRE-00000892',
      displayNumber: 'PRE-00000892',
      date: '2024-01-14',
      entityName: 'Nuevo Cliente Ltd.',
      totalAmount: 8900.00,
      status: 'draft',
      workflowStage: 'pending_approval',
    },
    {
      id: '3',
      type: 'Remito',
      number: 'REM-00002156',
      displayNumber: 'R 0001-00002156',
      date: '2024-01-14',
      entityName: 'Distribuidora ABC',
      totalAmount: 1200.00,
      status: 'confirmed',
      workflowStage: 'delivered',
    },
    {
      id: '4',
      type: 'Orden de Compra',
      number: 'OC-00000445',
      displayNumber: 'OC-00000445',
      date: '2024-01-13',
      entityName: 'Proveedor XYZ S.R.L.',
      totalAmount: 5670.00,
      status: 'confirmed',
      workflowStage: 'partially_received',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkflowStageColor = (stage: string) => {
    switch (stage) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'partially_received': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkflowStageLabel = (stage: string) => {
    switch (stage) {
      case 'pending_approval': return 'Pendiente Aprobación'
      case 'sent': return 'Enviado'
      case 'delivered': return 'Entregado'
      case 'partially_received': return 'Parcialmente Recibido'
      default: return stage
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documentos</h1>
          <p className="text-gray-600">Gestiona todos tus documentos comerciales</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Presupuesto
          </Button>
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Factura
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                className="form-input pl-10"
              />
            </div>
            <select className="form-select">
              <option value="">Todos los tipos</option>
              <option value="Factura">Facturas</option>
              <option value="Presupuesto">Presupuestos</option>
              <option value="Remito">Remitos</option>
              <option value="Orden de Compra">Órdenes de Compra</option>
            </select>
            <select className="form-select">
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <input
              type="date"
              className="form-input"
              placeholder="Fecha desde"
            />
            <input
              type="date"
              className="form-input"
              placeholder="Fecha hasta"
            />
          </div>
        </CardBody>
      </Card>

      {/* Documents table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Documento</TableCell>
              <TableCell header>Cliente/Proveedor</TableCell>
              <TableCell header>Fecha</TableCell>
              <TableCell header>Monto</TableCell>
              <TableCell header>Estado</TableCell>
              <TableCell header>Etapa</TableCell>
              <TableCell header>Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} onClick={() => {}}>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">
                      {document.type} {document.displayNumber}
                    </div>
                    <div className="text-sm text-gray-500">#{document.number}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-900">{document.entityName}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-900">
                    {new Date(document.date).toLocaleDateString('es-AR')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    ${document.totalAmount.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    getStatusColor(document.status)
                  }`}>
                    {document.status === 'draft' ? 'Borrador' :
                     document.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    getWorkflowStageColor(document.workflowStage)
                  }`}>
                    {getWorkflowStageLabel(document.workflowStage)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm">
                      PDF
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando <span className="font-medium">1</span> a <span className="font-medium">4</span> de{' '}
          <span className="font-medium">4</span> resultados
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="secondary" size="sm" disabled>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DocumentsPage