import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tenantName: z.string().min(2, 'El nombre de la empresa es requerido'),
  tenantSlug: z.string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo se permiten letras minúsculas, números y guiones'),
})

type RegisterForm = z.infer<typeof registerSchema>

const RegisterPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const tenantName = watch('tenantName')

  // Auto-generate slug from tenant name
  const handleTenantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Update the slug field if it hasn't been manually modified
    if (document.querySelector('[name="tenantSlug"]') as HTMLInputElement) {
      (document.querySelector('[name="tenantSlug"]') as HTMLInputElement).value = slug
    }
  }

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      login(data.token, data.user, [data.tenant])
      navigate('/', { replace: true })
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Error al registrarse')
    },
  })

  const onSubmit = (data: RegisterForm) => {
    setError('')
    registerMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">Axioma ERP</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Registra tu empresa y comienza a usar Axioma ERP
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardBody className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  {...register('firstName')}
                  label="Nombre"
                  autoComplete="given-name"
                />
                <Input
                  {...register('lastName')}
                  label="Apellido"
                  autoComplete="family-name"
                />
              </div>

              <Input
                {...register('email')}
                type="email"
                label="Email"
                error={errors.email?.message}
                autoComplete="email"
                autoFocus
              />

              <Input
                {...register('password')}
                type="password"
                label="Contraseña"
                error={errors.password?.message}
                autoComplete="new-password"
              />

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Información de la Empresa
                </h3>

                <Input
                  {...register('tenantName', {
                    onChange: handleTenantNameChange
                  })}
                  label="Nombre de la Empresa"
                  error={errors.tenantName?.message}
                  placeholder="Mi Empresa S.A."
                />

                <Input
                  {...register('tenantSlug')}
                  label="URL de la Empresa"
                  error={errors.tenantSlug?.message}
                  placeholder="mi-empresa"
                  helperText="Esta será tu URL: mi-empresa.axioma.com"
                />
              </div>
            </CardBody>

            <CardFooter className="space-y-4">
              <Button
                type="submit"
                className="w-full"
                loading={registerMutation.isPending}
              >
                Crear Cuenta
              </Button>

              <div className="text-center">
                <span className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{' '}
                </span>
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Iniciar Sesión
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default RegisterPage