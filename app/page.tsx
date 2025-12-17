"use client"

import { useState, useEffect } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/lib/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import QuickCarRegistration from '@/components/QuickCarRegistration'
import { ServiceSelector } from '@/components/ServiceSelector'

export default function Home() {
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCarModal, setShowCarModal] = useState(false)
  const [hasCars, setHasCars] = useState(false)
  const [checkingCars, setCheckingCars] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [services, setServices] = useState<{ id: string; name: string; durationMinutes: number; price: number; serviceGroup?: string | null }[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [totalDuration, setTotalDuration] = useState<number>(0)
  const [totalPrice, setTotalPrice] = useState<number>(0)
  const { user } = useAuth()
  const router = useRouter()

  // Inicializa estado a partir da URL (date/time)
  useEffect(() => {
    const d = searchParams.get('date')
    const t = searchParams.get('time')
    const svcs = searchParams.get('services')
    if (d) {
      const parsed = parseISO(d)
      if (!isNaN(parsed.getTime())) setSelectedDate(parsed)
    }
    if (t) setSelectedTime(t)
    if (svcs) setSelectedServices(svcs.split(',').filter(Boolean))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carregar serviços ativos para seleção pública
  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch('/api/services?activeOnly=true', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setServices(data || [])
        }
      } catch {}
    }
    loadServices()
  }, [])

  useEffect(() => {
    if (user) {
      checkUserCars()
    }
  }, [user])

  async function checkUserCars() {
    try {
      setCheckingCars(true)
      const response = await fetch('/api/cars')
      if (response.ok) {
        const cars = await response.json()
        setHasCars(cars.length > 0)
      }
    } catch (error) {
      console.error('Erro ao verificar carros:', error)
    } finally {
      setCheckingCars(false)
    }
  }

  const handleTimeSelect = async (time: string) => {
    setSelectedTime(time)
    const qs = new URLSearchParams()
    qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
    qs.set('time', time)
    if (selectedServices.length) qs.set('services', selectedServices.join(','))
    // persiste na URL para manter após login
    window.history.replaceState(null, '', `/?${qs.toString()}`)
    
    // Se não está logado, mostrar modal de login
    if (!user) {
      setShowLoginModal(true)
      return
    }

    // Se está logado, verificar se tem carro
    if (!hasCars) {
      setShowCarModal(true)
      return
    }

    // Se tem tudo, ir para página de agendamento
    const nextQs = new URLSearchParams()
    nextQs.set('date', format(selectedDate, 'yyyy-MM-dd'))
    nextQs.set('time', time)
    if (selectedServices.length) nextQs.set('services', selectedServices.join(','))
    router.push(`/agendamentos/novo?${nextQs.toString()}`)
  }

  const handleCarRegistrationSuccess = () => {
    setShowCarModal(false)
    setHasCars(true)
    // Redirecionar para agendamento
    if (selectedTime) {
      const nextQs = new URLSearchParams()
      nextQs.set('date', format(selectedDate, 'yyyy-MM-dd'))
      nextQs.set('time', selectedTime)
      if (selectedServices.length) nextQs.set('services', selectedServices.join(','))
      router.push(`/agendamentos/novo?${nextQs.toString()}`)
    }
  }

  // Buscar horários reais por serviços selecionados (espelha fluxo logado)
  useEffect(() => {
    const load = async () => {
      setLoadingSlots(true)
      try {
        if (!selectedServices.length) {
          setAvailableTimes([])
          setTotalDuration(0)
          setTotalPrice(0)
          return
        }
        const res = await fetch('/api/appointments/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: format(selectedDate, 'yyyy-MM-dd'),
            serviceIds: selectedServices,
            suggestAlternatives: false
          })
        })
        if (!res.ok) throw new Error('Falha ao carregar disponibilidade')
        const data = await res.json()
        // API retorna availableSlots (ISO) — converter para HH:mm local
        const times: string[] = (data.availableSlots || []).map((iso: string) => {
          const d = new Date(iso)
          return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
        })
        setAvailableTimes(times)
        setTotalDuration(data.totalDuration || 0)
        setTotalPrice(data.totalPrice || 0)
      } catch (e) {
        setAvailableTimes([])
        setTotalDuration(0)
        setTotalPrice(0)
      } finally {
        setLoadingSlots(false)
      }
    }
    load()
  }, [selectedDate, selectedServices])

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-black">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-gray-800">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M19 17H5C3.89543 17 3 16.1046 3 15V9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 7L9 5H15L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Estética Automotiva</h1>
          </div>
          <div>
            {user ? (
              <Button onClick={() => router.push(user.isAdmin ? '/agenda' : '/cliente')}>
                Minha Área
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const qs = new URLSearchParams()
                    qs.set('redirect', '/agendamentos/novo')
                    qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
                    if (selectedTime) qs.set('time', selectedTime)
                    if (selectedServices.length) qs.set('services', selectedServices.join(','))
                    router.push(`/login?${qs.toString()}`)
                  }}
                >
                  Entrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4">
            Agende seu horário
          </h2>
          <p className="text-xl text-gray-300">
            Veja os horários disponíveis e faça seu agendamento de forma rápida
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            {/* Date Selector */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-4">Selecione a data</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(new Date(), i)
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 px-6 py-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-500'
                      }`}
                    >
                      <div className="text-sm font-medium">{format(date, 'EEE', { locale: ptBR })}</div>
                      <div className="text-2xl font-bold">{format(date, 'dd')}</div>
                      <div className="text-xs">{format(date, 'MMM', { locale: ptBR })}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Horários disponíveis para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              {/* Lista de serviços - compartilhada */}
              <div className="mb-6">
                <ServiceSelector
                  services={services}
                  selected={selectedServices}
                  onChange={(ids) => {
                    setSelectedTime(null)
                    setSelectedServices(ids)
                  }}
                  totalDuration={totalDuration}
                  totalPrice={totalPrice}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {loadingSlots && (
                  <div className="col-span-full text-center text-gray-400 py-6">Carregando horários...</div>
                )}
                {!loadingSlots && selectedServices.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-6">Selecione pelo menos um serviço</div>
                )}
                {!loadingSlots && selectedServices.length > 0 && availableTimes.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-6">Sem horários disponíveis</div>
                )}
                {!loadingSlots && availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`p-4 rounded-xl text-center font-semibold transition-all ${
                      selectedTime === time
                        ? 'bg-blue-600 border-2 border-blue-600 text-white'
                        : 'bg-gray-800 border-2 border-gray-700 text-white hover:border-blue-500 hover:shadow-lg'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-black/40 border border-black/50 rounded-xl">
              <p className="text-sm text-gray-300">
                ℹ️ {user 
                  ? 'Selecione um horário para continuar com seu agendamento.'
                  : 'Após selecionar um horário, você precisará fazer login para confirmar seu agendamento.'
                }
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <Modal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Login necessário"
        >
          <div className="text-center py-4">
            <p className="text-gray-300 mb-6">
              Para agendar um horário, você precisa fazer login ou criar uma conta.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => {
                  const qs = new URLSearchParams()
                  qs.set('redirect', '/agendamentos/novo')
                  qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
                  if (selectedTime) qs.set('time', selectedTime)
                  if (selectedServices.length) qs.set('services', selectedServices.join(','))
                  router.push(`/login?${qs.toString()}`)
                }}
              >
                Fazer login
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Car Registration Modal */}
      {showCarModal && user && (
        <QuickCarRegistration
          isOpen={showCarModal}
          onClose={() => setShowCarModal(false)}
          onSuccess={handleCarRegistrationSuccess}
          customerId={user.id}
        />
      )}
    </div>
  )
}
