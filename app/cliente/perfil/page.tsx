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

interface CarFormData {
  model: string
  plate: string
  year: string
  color: string
}

interface Car {
  id: string
  model: string
  plate: string
  year: number | null
  color: string | null
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
  const [showCarModal, setShowCarModal] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null)

  const profileForm = useForm<ProfileFormData>()
  const passwordForm = useForm<PasswordFormData>()
  const carForm = useForm<CarFormData>()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.isAdmin) {
      router.push('/agenda')
    } else if (user) {
      loadProfile()
    }
  }, [user, authLoading, router])

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
        phone: data.phone,
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

      const response = await fetch(`/api/customers/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
        message: 'As senhas não coincidem'
      })
      return
    }

    if (data.newPassword.length < 6) {
      passwordForm.setError('newPassword', {
        type: 'manual',
        message: 'A senha deve ter no mínimo 6 caracteres'
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

  async function onCarSubmit(data: CarFormData) {
    try {
      setSubmitting(true)
      setError(null)

      const url = editingCar 
        ? `/api/cars/${editingCar.id}`
        : '/api/cars'
      
      const method = editingCar ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          customerId: user?.id,
          year: data.year ? parseInt(data.year) : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar veículo')
      }

      setSuccess(editingCar ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!')
      setShowCarModal(false)
      setEditingCar(null)
      carForm.reset()
      loadProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar veículo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteCar(carId: string) {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) {
      return
    }
    setDeletingCarId(carId)

    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir veículo')
      }

      setSuccess('Veículo excluído com sucesso!')
      loadProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeletingCarId(null)
    }
  }

  function openEditCar(car: Car) {
    setEditingCar(car)
    carForm.reset({
      model: car.model,
      plate: car.plate,
      year: car.year?.toString() || '',
      color: car.color || ''
    })
    setShowCarModal(true)
  }

  function openNewCar() {
    setEditingCar(null)
    carForm.reset({
      model: '',
      plate: '',
      year: '',
      color: ''
    })
    setShowCarModal(true)
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
            {...profileForm.register('name', { required: 'Nome é obrigatório' })}
            error={profileForm.formState.errors.name?.message}
            required
          />
          
          <Input
            label="Email"
            type="email"
            {...profileForm.register('email', { required: 'Email é obrigatório' })}
            error={profileForm.formState.errors.email?.message}
            required
          />
          
          <Input
            label="Telefone"
            {...profileForm.register('phone', { required: 'Telefone é obrigatório' })}
            error={profileForm.formState.errors.phone?.message}
            placeholder="(00) 00000-0000"
            required
          />

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(true)}>
              Alterar Senha
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Meus Veículos</h2>
          <Button size="sm" onClick={openNewCar}>+ Adicionar Veículo</Button>
        </div>

        {cars.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum veículo cadastrado</p>
        ) : (
          <div className="space-y-3">
            {cars.map((car) => (
              <div key={car.id} className="flex items-center justify-between p-4 border border-gray-700 rounded bg-gray-800/50">
                <div>
                  <p className="font-medium text-white">{car.model}</p>
                  <p className="text-sm text-gray-400">
                    {car.plate}
                    {car.year && ` • ${car.year}`}
                    {car.color && ` • ${car.color}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEditCar(car)} disabled={deletingCarId === car.id}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteCar(car.id)} disabled={deletingCarId === car.id}>
                    {deletingCarId === car.id ? 'Excluindo...' : 'Excluir'}
                  </Button>
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
            {...passwordForm.register('currentPassword', { required: 'Senha atual é obrigatória' })}
            error={passwordForm.formState.errors.currentPassword?.message}
            required
          />
          
          <Input
            label="Nova Senha"
            type="password"
            {...passwordForm.register('newPassword', { required: 'Nova senha é obrigatória' })}
            error={passwordForm.formState.errors.newPassword?.message}
            required
          />
          
          <Input
            label="Confirmar Nova Senha"
            type="password"
            {...passwordForm.register('confirmPassword', { required: 'Confirmação é obrigatória' })}
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

      <Modal
        isOpen={showCarModal}
        onClose={() => {
          setShowCarModal(false)
          setEditingCar(null)
          carForm.reset()
        }}
        title={editingCar ? 'Editar Veículo' : 'Novo Veículo'}
      >
        <form onSubmit={carForm.handleSubmit(onCarSubmit)} className="space-y-4">
          <Input
            label="Modelo"
            {...carForm.register('model', { required: 'Modelo é obrigatório' })}
            error={carForm.formState.errors.model?.message}
            placeholder="Ex: Honda Civic"
            required
          />
          
          <Input
            label="Placa"
            {...carForm.register('plate', { required: 'Placa é obrigatória' })}
            error={carForm.formState.errors.plate?.message}
            placeholder="ABC-1234"
            required
          />
          
          <Input
            label="Ano"
            type="number"
            {...carForm.register('year')}
            placeholder="2020"
          />
          
          <Input
            label="Cor"
            {...carForm.register('color')}
            placeholder="Preto"
          />

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setShowCarModal(false)
                setEditingCar(null)
                carForm.reset()
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
