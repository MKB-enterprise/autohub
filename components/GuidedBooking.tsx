"use client"

import { useEffect, useMemo, useState } from 'react'
import { format, addDays, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LottieAnimation } from '@/components/ui/LottieAnimation'
// Quick car registration happens in the appointment page, not here
import { useAuth } from '@/lib/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import carGarageAnimation from '@/public/animations/Car Garage animation.json'
import interiorAnimation from '@/public/animations/Interior detailing.json'
import exteriorAnimation from '@/public/animations/Exterior detail.json'
import nanoAnimation from '@/public/animations/Nanotechnology.json'
import washerAnimation from '@/public/animations/Washer cleaning street.json'

// Types for services coming from API
type Service = {
  id: string
  name: string
  description?: string | null
  durationMinutes: number
  price: number
  serviceGroup?: string | null
}

type Need = 'INTERIOR' | 'EXTERIOR' | 'COMPLETE' | 'QUICK' | 'POLISH'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const groupMeta: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' | 'default' }> = {
  interior: { label: 'Interior', variant: 'info' },
  exterior: { label: 'Exterior', variant: 'success' },
  polimento: { label: 'Polimento', variant: 'warning' },
  polishing: { label: 'Polimento', variant: 'warning' }
}

type GuidedBookingProps = {
  onContinue?: (data: { services: Service[]; date: string; time: string }) => void
}

export default function GuidedBooking({ onContinue }: GuidedBookingProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Data state
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Flow state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [need, setNeed] = useState<Need | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const [stepDate, setStepDate] = useState<'TODAY' | 'TOMORROW' | 'OTHER' | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [period, setPeriod] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | null>(null)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [time, setTime] = useState<string | null>(null)
  const [loadingTimes, setLoadingTimes] = useState(false)
  const [showSelection, setShowSelection] = useState(false)
  const [lastRemoved, setLastRemoved] = useState<null | { id: string; name: string }>(null)
  const [undoTimer, setUndoTimer] = useState<number | null>(null)

  // Car registration is handled on the /agendamentos/novo page

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingServices(true)
        const res = await fetch('/api/services?activeOnly=true', { cache: 'no-store' })
        const data = await res.json()
        setServices(Array.isArray(data) ? data : [])
      } catch (e) {
        setError('Falha ao carregar serviços')
      } finally {
        setLoadingServices(false)
      }
    }
    load()
  }, [])

  // Initialize selection/date/time from URL params when services are available
  useEffect(() => {
    if (!services.length) return
    const raw = searchParams?.get('services') || ''
    if (raw) {
      const ids = raw.split(',').filter(Boolean)
      const valid = ids.filter(id => services.some(s => s.id === id))
      if (valid.length) {
        setSelectedServiceIds(valid)
      }
    }
    const dateStr = searchParams?.get('date')
    if (dateStr) {
      const parsed = new Date(`${dateStr}T00:00:00`)
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed)
        if (isToday(parsed)) setStepDate('TODAY')
        else if (isTomorrow(parsed)) setStepDate('TOMORROW')
        else setStepDate('OTHER')
      }
    }
    const t = searchParams?.get('time')
    if (t) {
      setTime(t)
      const [hStr] = t.split(':')
      const h = parseInt(hStr, 10)
      if (h >= 6 && h < 12) setPeriod('MORNING')
      else if (h >= 12 && h < 18) setPeriod('AFTERNOON')
      else if (h >= 18 && h <= 21) setPeriod('EVENING')
    }
  }, [services, searchParams])

  // Selected services and summary (defined early to avoid TDZ issues)
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

  // In embedded mode, handoff only at confirmation step
  useEffect(() => {
    if (!onContinue) return
    if (currentStep !== 3) return
    if (!selectedServices.length || !selectedDate || !time) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    onContinue({ services: selectedServices, date: dateStr, time })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  function resetScheduling() {
    setStepDate(null)
    setSelectedDate(null)
    setPeriod(null)
    setAvailableTimes([])
    setTime(null)
  }

  // Filter services by need
  const filteredServices = useMemo(() => {
    if (!need) return []

    // Map need to service groups
    const groupsByNeed: Record<Need, string[]> = {
      INTERIOR: ['interior'],
      EXTERIOR: ['exterior'],
      COMPLETE: ['interior', 'exterior'],
      QUICK: ['interior', 'exterior'],
      POLISH: ['polimento', 'polishing']
    }

    const targetGroups = groupsByNeed[need]
    
    const filtered = services.filter(s => {
      const group = (s.serviceGroup || '').toLowerCase()
      return targetGroups.includes(group)
    })

    return filtered.sort((a, b) => a.price - b.price)
  }, [need, services])

  // Availability when date+period selected
  useEffect(() => {
    const fetchTimes = async () => {
      if (!selectedServiceIds.length || !selectedDate || !period) {
        setAvailableTimes([])
        return
      }
      try {
        setLoadingTimes(true)
        const body = {
          date: format(selectedDate, 'yyyy-MM-dd'),
          serviceIds: selectedServiceIds,
          suggestAlternatives: false
        }
        const res = await fetch('/api/appointments/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        const times: string[] = (data.availableSlots || []).map((iso: string) => {
          const d = new Date(iso)
          return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
        })
        const filtered = times.filter(t => {
          const [hStr] = t.split(':')
          const h = parseInt(hStr, 10)
          if (period === 'MORNING') return h >= 6 && h < 12
          if (period === 'AFTERNOON') return h >= 12 && h < 18
          return h >= 18 && h <= 21
        })
        setAvailableTimes(filtered)
        // Preserve selected time if it remains available; otherwise clear
        if (time && !filtered.includes(time)) {
          setTime(null)
        }
      } catch (error) {
        console.error('Erro ao buscar horários:', error)
        setAvailableTimes([])
      } finally {
        setLoadingTimes(false)
      }
    }
    fetchTimes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceIds, selectedDate, period])

  // Toggle service selection; reset downstream state when the set changes
  function toggleService(serviceId: string) {
    const svc = services.find(s => s.id === serviceId)
    const targetGroup = (svc?.serviceGroup || '').toLowerCase() || null

    setSelectedServiceIds(prev => {
      const exists = prev.includes(serviceId)
      // If already selected, just remove
      if (exists) {
        resetScheduling()
        setLastRemoved({ id: serviceId, name: svc?.name || 'Serviço' })
        if (undoTimer) clearTimeout(undoTimer)
        const timer = window.setTimeout(() => setLastRemoved(null), 5000)
        setUndoTimer(timer)
        return prev.filter(id => id !== serviceId)
      }

      // Enforce one service per category/group
      const next = prev.filter(id => {
        if (!targetGroup) return true
        const s = services.find(x => x.id === id)
        const g = (s?.serviceGroup || '').toLowerCase() || null
        return g !== targetGroup
      })
      const updated = [...next, serviceId]
      // If the selection set changes, reset scheduling so availability recalculates
      resetScheduling()
      setCurrentStep(1)
      return updated
    })
  }

  function removeService(id: string) {
    const svc = services.find(s => s.id === id)
    setSelectedServiceIds(prev => prev.filter(x => x !== id))
    resetScheduling()
    setLastRemoved({ id, name: svc?.name || 'Serviço' })
    if (undoTimer) clearTimeout(undoTimer)
    const timer = window.setTimeout(() => setLastRemoved(null), 5000)
    setUndoTimer(timer)
  }

  function undoRemove() {
    if (!lastRemoved) return
    const id = lastRemoved.id
    setLastRemoved(null)
    if (undoTimer) {
      clearTimeout(undoTimer)
      setUndoTimer(null)
    }
    // Re-add using the same rules as toggle
    const svc = services.find(s => s.id === id)
    const targetGroup = (svc?.serviceGroup || '').toLowerCase() || null
    setSelectedServiceIds(prev => {
      const next = prev.filter(x => {
        if (!targetGroup) return true
        const s = services.find(xx => xx.id === x)
        return (s?.serviceGroup || '').toLowerCase() !== targetGroup
      })
      return [...next, id]
    })
    resetScheduling()
    setCurrentStep(1)
  }

  function getGroupMetaByService(service: Service) {
    const group = (service.serviceGroup || '').toLowerCase()
    return groupMeta[group] || { label: 'Outro', variant: 'default' as const }
  }

  // Helper function to describe service result for customer
  function getServiceResultDescription(service: Service): string {
    const group = (service.serviceGroup || '').toLowerCase()
    
    if (group === 'interior') return 'Ambiente interno mais limpo e profissional'
    if (group === 'exterior') return 'Aparência externa renovada e brilhante'
    if (group === 'polimento' || group === 'polishing') return 'Visual melhorado com acabamento refinado'
    
    return 'Resultado profissional e cuidadoso'
  }

  // Step controls and final continue
  function canProceed(step: 1 | 2 | 3) {
    if (step === 1) return selectedServiceIds.length > 0
    if (step === 2) return !!(selectedDate && time)
    return true
  }

  function goNext() {
    if (currentStep === 1) {
      if (canProceed(1)) setCurrentStep(2)
      return
    }
    if (currentStep === 2) {
      if (canProceed(2)) setCurrentStep(3)
      return
    }
  }

  function goBack() {
    if (currentStep === 3) { setCurrentStep(2); return }
    if (currentStep === 2) { setCurrentStep(1); return }
  }

  async function handleConfirm() {
    if (!selectedServices.length || !selectedDate || !time) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    if (onContinue) {
      onContinue({ services: selectedServices, date: dateStr, time })
      return
    }
    if (!user) {
      const qs = new URLSearchParams()
      qs.set('redirect', '/agendamentos/novo')
      qs.set('date', dateStr)
      qs.set('time', time)
      qs.set('services', selectedServiceIds.join(','))
      router.push(`/login?${qs.toString()}`)
      return
    }
    const qs = new URLSearchParams()
    qs.set('date', dateStr)
    qs.set('time', time)
    qs.set('services', selectedServiceIds.join(','))
    router.push(`/agendamentos/novo?${qs.toString()}`)
  }

  return (
    <div className="space-y-8 pb-28">
      {/* Stepper */}
      <nav className="sticky top-[60px] z-30 bg-gradient-to-r from-gray-950/70 to-gray-900/70 backdrop-blur border border-gray-800/60 rounded-2xl p-4 mb-2 shadow-lg shadow-purple-500/5">
        <ol className="grid grid-cols-3 gap-3 text-xs md:text-sm font-semibold">
          {[
            { id: 1, label: 'Serviços' },
            { id: 2, label: 'Data & Hora' },
            { id: 3, label: 'Confirmar' }
          ].map(step => (
            <li key={step.id}>
              <button
                className={cx(
                  'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200',
                  currentStep === step.id 
                    ? 'border-purple-500 bg-purple-500/15 text-white shadow-lg shadow-purple-500/20' 
                    : step.id < currentStep 
                    ? 'border-green-500/30 bg-green-500/5 text-green-400'
                    : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                )}
                onClick={() => step.id < currentStep ? setCurrentStep(step.id as 1|2|3) : undefined}
                aria-current={currentStep === step.id ? 'step' : undefined}
              >
                <span className={cx(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold transition-all',
                  currentStep === step.id && 'border-purple-400 bg-purple-500/30 text-purple-300',
                  step.id < currentStep && 'border-green-500 bg-green-500/20 text-green-400'
                )}>
                  {step.id < currentStep ? '✓' : step.id}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {/* STEP 1 - What do you want for your car? */}
      {currentStep === 1 && !need && (
        <section className="space-y-8">
          <div className="flex justify-center mb-8">
            <LottieAnimation 
              animationData={carGarageAnimation} 
              className="w-64 h-64"
              loop={true}
            />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">O que você quer para o seu carro?</h3>
            <p className="text-gray-400 text-base">Escolha uma categoria e vamos encontrar o serviço perfeito</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {([
              { key: 'COMPLETE', title: 'Cuidado completo', desc: 'Interna e externa', emoji: '🌟' },
              { key: 'INTERIOR', title: 'Interior', desc: 'Higiene e conforto', emoji: '🪑' },
              { key: 'EXTERIOR', title: 'Exterior', desc: 'Brilho e proteção', emoji: '✨' },
              { key: 'QUICK', title: 'Solução rápida', desc: 'Express', emoji: '⚡' },
              { key: 'POLISH', title: 'Polimento', desc: 'Acabamento premium', emoji: '💎' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setNeed(opt.key as Need)}
                className="group rounded-2xl text-left p-6 border transition-all duration-300 bg-gradient-to-br from-gray-800/40 to-gray-900/60 border-gray-700 hover:border-purple-500 hover:from-purple-900/20 hover:to-gray-900/40 hover:shadow-xl hover:shadow-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{opt.emoji}</div>
                <div className="text-white font-semibold text-base leading-tight">{opt.title}</div>
                <div className="text-gray-400 text-sm mt-2">{opt.desc}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 2 - Service selection */}
      {currentStep === 1 && need && (
        <section className="space-y-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="flex-shrink-0">
              <LottieAnimation 
                animationData={
                  need === 'INTERIOR' ? interiorAnimation :
                  need === 'EXTERIOR' ? exteriorAnimation :
                  need === 'POLISH' ? nanoAnimation :
                  need === 'QUICK' ? washerAnimation :
                  carGarageAnimation
                } 
                className="w-32 h-32"
                loop={true}
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Escolha o serviço</h3>
              <p className="text-gray-400 mt-1 text-sm">
                {need === 'INTERIOR' && 'Deixe o interior impecável e confortável'}
                {need === 'EXTERIOR' && 'Renove a beleza e proteção externa'}
                {need === 'POLISH' && 'Acabamento premium com polimentos especiais'}
                {need === 'QUICK' && 'Serviços rápidos e eficientes'}
                {need === 'COMPLETE' && 'Cuidado total para seu veículo'}
              </p>
            </div>
          </div>
          
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={cx(
                    'rounded-2xl p-6 border text-left transition-all duration-300 group',
                    selectedServiceIds.includes(svc.id)
                      ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20'
                      : 'border-gray-700 bg-gradient-to-br from-gray-800/40 to-gray-900/60 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-white font-bold text-lg flex-1">{svc.name}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={getGroupMetaByService(svc).variant} className="text-[11px] uppercase tracking-wide font-bold">
                      {getGroupMetaByService(svc).label}
                    </Badge>
                  </div>
                  {svc.description && (
                    <div className="text-gray-300 text-sm mb-4 line-clamp-2">{svc.description}</div>
                  )}
                  <div className="border-t border-gray-700 pt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-gray-400">
                      <span>⏱️ {svc.durationMinutes} min</span>
                    </div>
                    <div className="text-purple-400 font-bold group-hover:text-purple-300">R$ {Number(svc.price).toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Desculpe, não encontramos serviços disponíveis para essa seleção.</p>
              <Button variant="secondary" onClick={() => { setNeed(null) }} className="mt-4">Voltar</Button>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 pt-4">
            <Button variant="secondary" onClick={() => { setNeed(null) }}>Trocar categoria</Button>
            <Button onClick={goNext} disabled={!canProceed(1)}>Continuar</Button>
          </div>
        </section>
      )}

      {/* STEP 3 - Date & Time */}
      {currentStep === 2 && selectedServiceIds.length > 0 && (
        <section className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold text-white">Quando deseja agendar?</h3>
            <p className="text-gray-400 text-sm mt-1">Escolha a data e o melhor horário para você</p>
          </div>

          {/* Day selection */}
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wide mb-3 font-semibold">Data</div>
            <div className="grid grid-cols-3 gap-3">
              <button 
                className={cx('p-4 rounded-xl border font-semibold transition-all duration-300', 
                  stepDate==='TODAY' 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 text-white ring-2 ring-purple-400/50' 
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                )} 
                onClick={() => { setStepDate('TODAY'); setSelectedDate(new Date()) }}
              >
                Hoje
              </button>
              <button 
                className={cx('p-4 rounded-xl border font-semibold transition-all duration-300', 
                  stepDate==='TOMORROW' 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 text-white ring-2 ring-purple-400/50' 
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                )} 
                onClick={() => { setStepDate('TOMORROW'); setSelectedDate(addDays(new Date(),1)) }}
              >
                Amanhã
              </button>
              <button 
                className={cx('p-4 rounded-xl border font-semibold transition-all duration-300', 
                  stepDate==='OTHER' 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 text-white ring-2 ring-purple-400/50' 
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                )} 
                onClick={() => { setStepDate('OTHER'); const d = new Date(); setSelectedDate(d) }}
              >
                Outro dia
              </button>
            </div>
          </div>

          {stepDate==='OTHER' && (
            <div className="flex items-center gap-3">
              <input 
                type="date" 
                className="flex-1 bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 outline-none transition" 
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''} 
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)} 
              />
              {selectedDate && <span className="text-gray-300 text-sm whitespace-nowrap">{format(selectedDate, "dd 'de' MMM", { locale: ptBR })}</span>}
            </div>
          )}

          {/* Period */}
          {selectedDate && (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wide mb-3 font-semibold">Período</div>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    className={cx('p-4 rounded-xl border font-semibold transition-all duration-300', 
                      period==='MORNING' 
                        ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 text-white ring-2 ring-purple-400/50' 
                        : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                    )} 
                    onClick={() => setPeriod('MORNING')}
                  >
                    Manhã
                  </button>
                  <button 
                    className={cx('p-4 rounded-xl border font-semibold transition-all duration-300', 
                      period==='AFTERNOON' 
                        ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 text-white ring-2 ring-purple-400/50' 
                        : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                    )} 
                    onClick={() => setPeriod('AFTERNOON')}
                  >
                    Tarde
                  </button>
                  <button 
                    className={cx('p-4 rounded-xl border font-semibold transition-all duration-300', 
                      period==='EVENING' 
                        ? 'border-purple-500 bg-gradient-to-br from-purple-900/30 to-gray-900/30 text-white ring-2 ring-purple-400/50' 
                        : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                    )} 
                    onClick={() => setPeriod('EVENING')}
                  >
                    Noite
                  </button>
                </div>
              </div>

              {/* Times */}
              {period && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-400 uppercase tracking-wide font-semibold">Horários disponíveis</div>
                  {loadingTimes && <div className="text-gray-400 py-4 text-center">Carregando horários...</div>}
                  {!loadingTimes && (
                    <>
                      {availableTimes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const base = availableTimes.slice(0, 6)
                            const list = time && !base.includes(time) ? [time, ...base] : base
                            const unique = Array.from(new Set(list))
                            return unique
                          })().map(t => (
                            <button 
                              key={t} 
                              className={cx(
                                'px-4 py-2 rounded-lg border font-medium transition-all duration-200',
                                time===t 
                                  ? 'border-purple-500 bg-purple-500/20 text-white ring-2 ring-purple-400/50' 
                                  : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-purple-400 hover:bg-gray-800/60'
                              )} 
                              onClick={() => setTime(t)} 
                              aria-pressed={time===t}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-4 bg-gray-800/30 rounded-xl">Sem horários disponíveis neste período</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-4">
            <Button variant="secondary" onClick={goBack}>Voltar</Button>
            <Button onClick={goNext} disabled={!canProceed(2)}>Revisar Agendamento</Button>
          </div>
        </section>
      )}

      {/* STEP 4 - Confirmation */}
      {currentStep === 3 && (
        <section className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold text-white">Revise seu agendamento</h3>
            <p className="text-gray-400 text-sm mt-1">Confira todos os detalhes antes de confirmar</p>
          </div>

          <Card className="bg-gradient-to-br from-purple-900/20 to-gray-900/40 border-purple-500/30 shadow-lg shadow-purple-500/10">
            <div className="space-y-6">
              {/* Serviços */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Serviços Selecionados</div>
                <div className="space-y-2">
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/50">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant={getGroupMetaByService(s).variant} className="text-[10px] uppercase tracking-wide font-bold">{getGroupMetaByService(s).label}</Badge>
                        <span className="text-white font-medium">{s.name}</span>
                      </div>
                      <span className="text-purple-400 font-bold ml-2">R$ {Number(s.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data, Hora, Duração, Total */}
              <div className="border-t border-gray-700/50 pt-6">
                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Detalhes do Agendamento</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/50">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Data</div>
                    <div className="text-white font-bold">{selectedDate ? format(selectedDate, "dd 'de' MMM", { locale: ptBR }) : '-'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/50">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Horário</div>
                    <div className="text-blue-400 font-bold">{time}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/50">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Duração</div>
                    <div className="text-white font-bold">{Math.round((totalDuration || 0)/60*10)/10}h</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-gray-800/40 border border-purple-500/30">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total</div>
                    <div className="text-purple-300 font-bold text-lg">R$ {Number(totalPrice).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between gap-4 pt-4">
            <Button variant="secondary" onClick={goBack}>Editar</Button>
            <Button onClick={handleConfirm} className="px-8">
              ✓ Confirmar Agendamento
            </Button>
          </div>
        </section>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur px-4 py-3 z-40">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setShowSelection(v => !v)} size="sm">
              Serviços ({selectedServices.length})
            </Button>
            <div className="text-white">
            <div className="text-sm text-gray-300">Total</div>
            <div className="text-xl font-bold">R$ {Number(totalPrice).toFixed(2)}</div>
            </div>
          </div>
          <div className="text-gray-300">
            Duração estimada: {Math.round((totalDuration || 0)/60*10)/10}h
          </div>
          {currentStep < 3 ? (
            <Button
              disabled={(currentStep === 1 && !canProceed(1)) || (currentStep === 2 && !canProceed(2))}
              onClick={goNext}
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={!selectedServices.length || !selectedDate || !time}>Confirmar</Button>
          )}
        </div>
      </div>

      {/* Selection Drawer */}
      {showSelection && selectedServices.length > 0 && (
        <div className="fixed bottom-32 left-0 right-0 px-4 z-40">
          <div className="container mx-auto">
            <div className="rounded-2xl bg-gray-900/95 border border-gray-800 backdrop-blur p-4 shadow-xl shadow-black/40">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">Serviços selecionados</div>
                <Button variant="secondary" size="sm" onClick={() => setShowSelection(false)}>Fechar</Button>
              </div>
              <div className="space-y-2">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/60 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <Badge variant={getGroupMetaByService(s).variant} className="text-[10px] uppercase tracking-wide">{getGroupMetaByService(s).label}</Badge>
                      <div className="text-white">{s.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-gray-300 text-sm">R$ {Number(s.price).toFixed(2)}</div>
                      <button className="text-gray-400 hover:text-red-400 transition" onClick={() => removeService(s.id)} aria-label="Remover">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {lastRemoved && (
        <div className="fixed bottom-16 right-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/95 border border-gray-800 shadow-lg">
            <div className="text-white text-sm">Removido: {lastRemoved.name}</div>
            <Button size="sm" variant="secondary" onClick={undoRemove}>Desfazer</Button>
          </div>
        </div>
      )}

      {/* No car modal here; handled in /agendamentos/novo */
      }
    </div>
  )
}
