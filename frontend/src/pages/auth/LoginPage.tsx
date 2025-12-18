import { Card, CardBody, CardFooter } from '@/components/ui/Card'
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

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      login(data.token, data.user, data.tenants)

      // Check if the first tenant needs onboarding
      const firstTenant = data.tenants[0]
      if (firstTenant && !firstTenant.wizardCompleted) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Error al iniciar sesión')
    },
  })

  const onSubmit = (data: LoginForm) => {
    setError('')
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">Axioma Mini</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Accede a tu cuenta para continuar
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
                autoComplete="current-password"
              />
            </CardBody>

            <CardFooter className="space-y-4">
              <Button
                type="submit"
                className="w-full"
                loading={loginMutation.isPending}
              >
                Iniciar Sesión
              </Button>

              <div className="text-center">
                <span className="text-sm text-gray-600">
                  ¿No tienes una cuenta?{' '}
                </span>
                <Link
                  to="/register"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Registrarse
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage