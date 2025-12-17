'use client'

import { useState, useEffect } from 'react'
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
import { ServiceSelector } from '@/components/ServiceSelector'

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [showNewCarModal, setShowNewCarModal] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [savingCar, setSavingCar] = useState(false)

  const selectedCustomerId = watch('customerId')
  const selectedDate = watch('date')

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

    console.log('Serviços selecionados:', selectedServices.length)
    console.log('Duração total:', duration, 'minutos')
    console.log('Preço total:', price)

    setTotalDuration(duration)
    setTotalPrice(price)
  }, [selectedServices, services])

  useEffect(() => {
    if (selectedDate && selectedServices.length > 0) {
      checkAvailability()
    } else {
      setAvailableSlots([])
    }
  }, [selectedDate, selectedServices])

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

  async function onSubmit(data: AppointmentFormData) {
    if (selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço')
      return
    }

    if (!data.time) {
      setError('Selecione um horário disponível')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const startDatetime = `${data.date}T${data.time}:00`
      
      console.log('Enviando agendamento:', {
        customerId: data.customerId,
        carId: data.carId,
        startDatetime,
        serviceIds: selectedServices
      })

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: data.customerId,
          carId: data.carId,
          startDatetime,
          serviceIds: selectedServices,
          notes: data.notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar agendamento')
      }

      router.push('/agenda')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar agendamento')
      console.error('Erro ao criar agendamento:', err)
    } finally {
      setSaving(false)
    }
  }

  async function createCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavingCustomer(true)
    const formData = new FormData(e.currentTarget)
    
    try {
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

      const newCustomer = await response.json()
      setCustomers([...customers, newCustomer])
      setValue('customerId', newCustomer.id)
      setShowNewCustomerModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente')
    } finally {
      setSavingCustomer(false)
    }
  }

  async function createCar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavingCar(true)
    const formData = new FormData(e.currentTarget)
    
    if (!selectedCustomerId) {
      setError('Selecione um cliente primeiro')
      setSavingCar(false)
      return
    }

    try {
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          plate: formData.get('plate'),
          model: formData.get('model'),
          color: formData.get('color'),
          notes: formData.get('notes')
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao criar carro')
      }

      const newCar = await response.json()
      
      // Atualizar lista de clientes com o novo carro
      const updatedCustomers = customers.map(c => {
        if (c.id === selectedCustomerId) {
          return { ...c, cars: [...c.cars, newCar] }
        }
        return c
      })
      
      setCustomers(updatedCustomers)
      setCars([...cars, newCar])
      setValue('carId', newCar.id)
      setShowNewCarModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar carro')
    } finally {
      setSavingCar(false)
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        <Card title="Serviços">
          <ServiceSelector
            services={services}
            selected={selectedServices}
            onChange={setSelectedServices}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            showHint={false}
          />
        </Card>

        <Card title="Data e Horário">
          <div className="space-y-4">
            <Input
              type="date"
              label="Data"
              {...register('date', { required: 'Data é obrigatória' })}
              min={format(new Date(), 'yyyy-MM-dd')}
              error={errors.date?.message}
            />

            {checkingAvailability ? (
              <Loading />
            ) : availableSlots.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Horários Disponíveis <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot: any) => {
                    // Pegar hora local do slot (que vem em UTC)
                    const slotDate = new Date(slot)
                    const slotTime = slotDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                    return (
                      <label
                        key={slot}
                        className="flex items-center justify-center p-3 border border-gray-700 rounded cursor-pointer hover:bg-gray-800/50 hover:border-cyan-500/30 transition-colors bg-gray-900/50 text-white"
                      >
                        <input
                          type="radio"
                          {...register('time', { required: 'Horário é obrigatório' })}
                          value={slotTime}
                          className="mr-2 accent-cyan-500"
                        />
                        {slotTime}
                      </label>
                    )
                  })}
                </div>
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
                )}
              </div>
            ) : selectedDate && selectedServices.length > 0 ? (
              <Alert type="warning" message="Não há horários disponíveis para esta data. Tente outra data." />
            ) : null}

            <Textarea
              label="Observações"
              {...register('notes')}
              rows={3}
              placeholder="Observações sobre o agendamento..."
            />
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving || checkingAvailability}>
            {saving ? 'Salvando...' : 'Criar Agendamento'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/agenda')}>
            Cancelar
          </Button>
        </div>
      </form>

      {/* Modal Novo Cliente */}
      {user?.isAdmin && (
        <Modal
          isOpen={showNewCustomerModal}
          onClose={() => setShowNewCustomerModal(false)}
          title="Novo Cliente"
        >
          <form onSubmit={createCustomer} className="space-y-4">
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
      <Modal
        isOpen={showNewCarModal}
        onClose={() => setShowNewCarModal(false)}
        title="Novo Veículo"
      >
        <form onSubmit={createCar} className="space-y-4">
          <Input label="Placa" name="plate" required />
          <Input label="Modelo" name="model" required />
          <Input label="Cor" name="color" />
          <Textarea label="Observações" name="notes" rows={3} />
          <div className="flex gap-2">
            <Button type="submit" disabled={savingCar}>
              {savingCar ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowNewCarModal(false)} disabled={savingCar}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
