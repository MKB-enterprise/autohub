'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { CarCard, VehicleType } from '@/components/ui/CarCard'
import QuickCarRegistration from '@/components/QuickCarRegistration'

interface ProfileFormData {
  name: string
  phone: string
  email: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface Car {
  id: string
  model: string
  plate: string
  year: number | null
  color: string | null
  vehicleType: VehicleType
}

export default function PerfilPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showNewCarModal, setShowNewCarModal] = useState(false)
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)

  const profileForm = useForm<ProfileFormData>()
  const passwordForm = useForm<PasswordFormData>()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.isAdmin) {
      router.push('/agenda')
    } else if (user) {
      loadProfile()
    }
  }, [user, authLoading, router])

  function formatPhone(input: string) {
    const digits = input.replace(/\D/g, '').slice(0, 11)

    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  async function loadProfile() {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${user?.id}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar perfil')
      }

      const data = await response.json()
      profileForm.reset({
        name: data.name,
        phone: formatPhone(data.phone || ''),
        email: data.email || ''
      })
      setCars(data.cars || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function onProfileSubmit(data: ProfileFormData) {
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const normalizedPhone = data.phone.replace(/\D/g, '')
      if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
        throw new Error('Telefone inválido')
      }

      const response = await fetch(`/api/customers/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          phone: normalizedPhone
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar perfil')
      }

      setSuccess('Perfil atualizado com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setSubmitting(false)
    }
  }

  async function onPasswordSubmit(data: PasswordFormData) {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError('confirmPassword', {
        type: 'manual',
        message: 'As senhas nao coincidem'
      })
      return
    }

    if (data.newPassword.length < 6) {
      passwordForm.setError('newPassword', {
        type: 'manual',
        message: 'A senha deve ter no minimo 6 caracteres'
      })
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao alterar senha')
      }

      setSuccess('Senha alterada com sucesso!')
      setShowPasswordModal(false)
      passwordForm.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteCar(carId: string) {
    if (!confirm('Tem certeza que deseja excluir este veiculo?')) {
      return
    }
    setDeletingCarId(carId)

    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir veiculo')
      }

      setSuccess('Veiculo excluido com sucesso!')
      loadProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeletingCarId(null)
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!user || user.isAdmin) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <Card>
        <h2 className="text-xl font-semibold mb-4">Dados Pessoais</h2>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          <Input
            label="Nome Completo"
            {...profileForm.register('name', { required: 'Nome e obrigatorio' })}
            error={profileForm.formState.errors.name?.message}
            required
          />
          
          <Input
            label="Email"
            type="email"
            {...profileForm.register('email', { required: 'Email e obrigatorio' })}
            error={profileForm.formState.errors.email?.message}
            required
          />
          
          <Input
            label="Telefone"
            {...profileForm.register('phone', {
              required: 'Telefone e obrigatorio',
              onChange: (e) => profileForm.setValue('phone', formatPhone(e.target.value))
            })}
            error={profileForm.formState.errors.phone?.message}
            placeholder="(00) 00000-0000"
            maxLength={16}
            required
          />

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(true)}>
              Alterar Senha
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Meus Veiculos</h2>
          <Button size="sm" onClick={() => setShowNewCarModal(true)}>+ Adicionar Veiculo</Button>
        </div>

        {cars.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4"></div>
            <p className="text-gray-400">Nenhum veiculo cadastrado</p>
            <p className="text-sm text-gray-500 mt-2">Adicione seu primeiro veiculo para comecar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cars.map((car) => (
              <div key={car.id} className="relative group">
                <CarCard
                  id={car.id}
                  model={car.model}
                  plate={car.plate}
                  color={car.color}
                  vehicleType={car.vehicleType || 'HATCH'}
                  isSelected={selectedCarId === car.id}
                  onClick={() => setSelectedCarId(selectedCarId === car.id ? null : car.id)}
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCar(car.id); }}
                    className="p-2 bg-gray-800/90 rounded-lg text-red-400 hover:bg-gray-700 transition"
                    disabled={deletingCarId === car.id}
                    title="Excluir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          passwordForm.reset()
        }}
        title="Alterar Senha"
      >
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <Input
            label="Senha Atual"
            type="password"
            {...passwordForm.register('currentPassword', { required: 'Senha atual e obrigatoria' })}
            error={passwordForm.formState.errors.currentPassword?.message}
            required
          />
          
          <Input
            label="Nova Senha"
            type="password"
            {...passwordForm.register('newPassword', { required: 'Nova senha e obrigatoria' })}
            error={passwordForm.formState.errors.newPassword?.message}
            required
          />
          
          <Input
            label="Confirmar Nova Senha"
            type="password"
            {...passwordForm.register('confirmPassword', { required: 'Confirmacao e obrigatoria' })}
            error={passwordForm.formState.errors.confirmPassword?.message}
            required
          />

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Alterando...' : 'Alterar Senha'}
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setShowPasswordModal(false)
                passwordForm.reset()
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <QuickCarRegistration
        isOpen={showNewCarModal}
        onClose={() => setShowNewCarModal(false)}
        onSuccess={() => {
          setSuccess('Veículo cadastrado com sucesso!')
          setShowNewCarModal(false)
          loadProfile()
        }}
        customerId={user?.id || ''}
      />
    </div>
  )
}
