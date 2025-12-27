'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'
import { Modal } from '@/components/ui/Modal'
import Collapsible from '@/components/ui/Collapsible'
import GuidedBooking from '@/components/GuidedBooking'
import QuickCarRegistration from '@/components/QuickCarRegistration'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate'

interface Customer {
  id: string
  name: string
  phone: string
  cars: Car[]
}

interface Car {
  id: string
  customerId: string
  plate: string
  model: string
}

interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  serviceGroup?: string | null
}

interface AppointmentFormData {
  customerId: string
  carId: string
  date: string
  time: string
  serviceIds: string[]
  notes: string
}

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AppointmentFormData>()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [totalDuration, setTotalDuration] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [showNewCarModal, setShowNewCarModal] = useState(false)

  const selectedCustomerId = watch('customerId')
  const selectedDate = watch('date')
  const selectedCarId = watch('carId')

  useEffect(() => {
    loadInitialData()
  }, [])

  // Se o user é um cliente (não-admin), prefill com seu próprio ID
  useEffect(() => {
    if (user && !user.isAdmin && customers.length > 0) {
      setValue('customerId', user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, customers])

  // Prefill date/time from query params (from public selection)
  useEffect(() => {
    const d = searchParams.get('date')
    const t = searchParams.get('time')
    if (d) setValue('date', d)
    if (t) setValue('time', t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After services load, preselect services from ?services=id1,id2
  useEffect(() => {
    const svcs = searchParams.get('services')
    if (!svcs || services.length === 0) return
    const ids = svcs.split(',').filter(Boolean)
    // Only keep valid ones
    const valid = ids.filter(id => services.some(s => s.id === id))
    if (valid.length) setSelectedServices(valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services])

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId)
      setCars(customer?.cars || [])
    } else {
      setCars([])
    }
  }, [selectedCustomerId, customers])

  // Removed auto-open behavior for car modal per request

  // Calcular duração e preço total quando serviços mudam
  useEffect(() => {
    const duration = selectedServices.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId)
      return sum + (service?.durationMinutes || 0)
    }, 0)

    const price = selectedServices.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId)
      return sum + Number(service?.price || 0)
    }, 0)

    setTotalDuration(duration)
    setTotalPrice(price)
  }, [selectedServices, services])

  // Removed: checkAvailability useEffect - GuidedBooking already handles this

  async function loadInitialData() {
    try {
      setLoading(true)
      const [customersRes, servicesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/services?activeOnly=true')
      ])

      if (!customersRes.ok || !servicesRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const customersData = await customersRes.json()
      const servicesData = await servicesRes.json()

      setCustomers(customersData)
      setServices(servicesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function checkAvailability() {
    try {
      setCheckingAvailability(true)
      
      const response = await fetch('/api/appointments/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          serviceIds: selectedServices,
          suggestAlternatives: true
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao verificar disponibilidade')
      }

      const data = await response.json()
      setAvailableSlots(data.availableSlots || [])
      setTotalDuration(data.totalDuration || 0)
      setTotalPrice(data.totalPrice || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar disponibilidade')
    } finally {
      setCheckingAvailability(false)
    }
  }

  function toggleService(serviceId: string) {
    const svc = services.find(s => s.id === serviceId)
    const group = svc?.serviceGroup || null

    setSelectedServices(prev => {
      const already = prev.includes(serviceId)
      if (already) {
        // Desmarca o serviço
        return prev.filter(id => id !== serviceId)
      }

      // Se tem grupo, remove outros do mesmo grupo
      if (group) {
        const filtered = prev.filter(id => {
          const s = services.find(x => x.id === id)
          return (s?.serviceGroup || null) !== group
        })
        return [...filtered, serviceId]
      }

      // Sem grupo: só adiciona
      return [...prev, serviceId]
    })
  }

  const { execute: onSubmit, isLoading: saving } = useOptimisticUpdate({
    onOptimistic: () => {
      // Navega LOGO para /agenda sem esperar o backend
      router.push('/agenda')
    },
    onAsync: async () => {
      const form = document.querySelector('form') as HTMLFormElement | null
      if (!form) return

      // Pega os dados do form manualmente
      const customerId = (form.elements.namedItem('customerId') as HTMLInputElement)?.value
      const carId = (form.elements.namedItem('carId') as HTMLInputElement)?.value
      const date = (form.elements.namedItem('date') as HTMLInputElement)?.value
      const time = (form.elements.namedItem('time') as HTMLInputElement)?.value
      const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value

      if (selectedServices.length === 0) {
        throw new Error('Selecione pelo menos um serviço')
      }

      if (!time) {
        throw new Error('Selecione um horário disponível')
      }

      const startDatetime = `${date}T${time}:00`
        
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          carId,
          startDatetime,
          serviceIds: selectedServices,
          notes: notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar agendamento')
      }
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  const { execute: createCustomerAction, isLoading: savingCustomer } = useOptimisticUpdate({
    onOptimistic: (newCustomer) => {
      setCustomers([...customers, newCustomer])
      setValue('customerId', newCustomer.id)
      setShowNewCustomerModal(false)
    },
    onAsync: async () => {
      const formEl = document.querySelector('form[data-form="create-customer-appointment"]') as HTMLFormElement
      if (!formEl) throw new Error('Formulário não encontrado')
      
      const formData = new FormData(formEl)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          phone: formData.get('phone'),
          notes: formData.get('notes')
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao criar cliente')
      }

      return await response.json()
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  async function handleCarRegistrationSuccess() {
    setShowNewCarModal(false)
    
    // Buscar os dados atualizados
    try {
      const customersRes = await fetch('/api/customers')
      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData)
        
        // Atualizar a lista de carros imediatamente
        const currentCustomerId = selectedCustomerId || user?.id
        if (currentCustomerId) {
          const customer = customersData.find((c: Customer) => c.id === currentCustomerId)
          if (customer) {
            setCars(customer.cars || [])
          }
        }
      }
    } catch (err) {
      console.error('Erro ao recarregar dados:', err)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Novo Agendamento</h1>
        <Button variant="secondary" onClick={() => router.push('/agenda')}>
          Cancelar
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Guided flow for logged users: objective → service → date/period/time */}
      <GuidedBooking
        onContinue={({ services: guidedServices, date, time }) => {
          const ids = guidedServices.map(s => s.id)
          setSelectedServices(ids)
          setValue('date', date)
          setValue('time', time)
          const duration = guidedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
          const price = guidedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)
          setTotalDuration(duration)
          setTotalPrice(price)
          setError(null)

          // Auto-submete quando já há cliente e veículo selecionados
          const hasCustomer = (user?.isAdmin ? !!selectedCustomerId : !!user?.id)
          const hasCar = !!selectedCarId
          if (hasCustomer && hasCar && ids.length && time) {
            // Aguarda o estado sincronizar no form e dispara criação
            setTimeout(() => {
              onSubmit()
            }, 0)
          }
        }}
      />

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit((data) => onSubmit(data))() }} className="space-y-6">
        {/* Hidden fields to keep date/time in form state */}
        <input type="hidden" {...register('date', { required: 'Data é obrigatória' })} />
        <input type="hidden" {...register('time', { required: 'Horário é obrigatório' })} />
        
        {/* Se não é admin, registrar customerId como hidden */}
        {!user?.isAdmin && user?.id && (
          <input type="hidden" {...register('customerId', { value: user.id })} />
        )}
        
        <Card title="Dados do Cliente">
          <div className="space-y-4">
            {user?.isAdmin ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    label="Cliente"
                    {...register('customerId', { required: 'Cliente é obrigatório' })}
                    options={customers.map(c => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
                    error={errors.customerId?.message}
                  />
                </div>
                <div className="pt-6">
                  <Button type="button" onClick={() => setShowNewCustomerModal(true)} size="sm">
                    + Novo Cliente
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cliente</label>
                <div className="p-3 bg-gray-800/50 border border-gray-700 rounded text-white">
                  {user?.name} ({user?.phone})
                </div>
              </div>
            )}

            {selectedCustomerId && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    label="Veículo"
                    {...register('carId', { required: 'Veículo é obrigatório' })}
                    options={cars.map(c => ({ value: c.id, label: `${c.model} - ${c.plate}` }))}
                    error={errors.carId?.message}
                  />
                </div>
                <div className="pt-6">
                  <Button type="button" onClick={() => setShowNewCarModal(true)} size="sm">
                    + Novo Veículo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Observações">
          <Textarea
            label="Observações"
            {...register('notes')}
            rows={3}
            placeholder="Observações sobre o agendamento..."
          />
        </Card>

        {/* Removido: botões do formulário para evitar duplicidade com o CTA fixo do GuidedBooking */}
      </form>

      {/* Modal Novo Cliente */}
      {user?.isAdmin && (
        <Modal
          isOpen={showNewCustomerModal}
          onClose={() => setShowNewCustomerModal(false)}
          title="Novo Cliente"
        >
          <form onSubmit={(e) => { e.preventDefault(); createCustomerAction() }} data-form="create-customer-appointment" className="space-y-4">
            <Input label="Nome" name="name" required />
            <Input label="Telefone" name="phone" type="tel" required />
            <Textarea label="Observações" name="notes" rows={3} />
            <div className="flex gap-2">
              <Button type="submit" disabled={savingCustomer}>
                {savingCustomer ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowNewCustomerModal(false)} disabled={savingCustomer}>
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Novo Carro */}
      <QuickCarRegistration
        isOpen={showNewCarModal}
        onClose={() => setShowNewCarModal(false)}
        onSuccess={handleCarRegistrationSuccess}
        customerId={selectedCustomerId || ''}
      />
    </div>
  )
}
