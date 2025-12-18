"use client"

import { useEffect, useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import QuickCarRegistration from '@/components/QuickCarRegistration'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'

// Types for services coming from API
type Service = {
  id: string
  name: string
  description?: string | null
  durationMinutes: number
  price: number
  serviceGroup?: string | null
}

type Objective = 'CLEAN' | 'RENEW' | 'PROTECT' | 'QUICK'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function GuidedBooking() {
  const router = useRouter()
  const { user } = useAuth()

  // Data state
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Flow state
  const [objective, setObjective] = useState<Objective | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)

  const [stepDate, setStepDate] = useState<'TODAY' | 'TOMORROW' | 'OTHER' | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [period, setPeriod] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | null>(null)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [time, setTime] = useState<string | null>(null)
  const [loadingTimes, setLoadingTimes] = useState(false)

  // Helper modal
  const [showHelper, setShowHelper] = useState(false)
  const [helperStep, setHelperStep] = useState(1)
  const [helperAnswers, setHelperAnswers] = useState<{clean: string | null; goal: string | null; use: string | null}>({ clean: null, goal: null, use: null })

  // Car modal for logged-in users without car (best-effort)
  const [showCarModal, setShowCarModal] = useState(false)
  const [hasCars, setHasCars] = useState<boolean | null>(null)

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

  // Filter services by objective
  const filteredServices = useMemo(() => {
    if (!objective) return []

    const keywordsByObjective: Record<Objective, string[]> = {
      CLEAN: ['limpeza', 'lavagem', 'higienização', 'interior', 'externo', 'completa', 'express'],
      RENEW: ['polimento', 'brilho', 'riscos', 'cristalização', 'revitalização', 'vitrificação'],
      PROTECT: ['cerâmica', 'ceramica', 'protetor', 'proteção', 'selante', 'nanotec'],
      QUICK: ['rápida', 'express', 'básica', 'basica']
    }

    const kws = keywordsByObjective[objective]

    const scored = services.map(s => {
      const lowerName = (s.name || '').toLowerCase()
      const lowerDesc = (s.description || '').toLowerCase()
      const score = kws.reduce((acc, kw) => acc + (lowerName.includes(kw) ? 2 : 0) + (lowerDesc.includes(kw) ? 1 : 0), 0)
      return { s, score }
    })
    .filter(x => x.score > 0 || objective === 'CLEAN' || objective === 'QUICK')

    if (scored.length === 0) return services // fallback: show all

    return scored.sort((a,b) => b.score - a.score).map(x => x.s)
  }, [objective, services])

  // Recommended service heuristic
  const recommendedServiceId = useMemo(() => {
    if (!objective || filteredServices.length === 0) return null
    // Choose best score = already sorted; if not, pick mid-price service
    const list = filteredServices
    const mid = Math.floor(list.length/2)
    return list[mid]?.id || list[0]?.id || null
  }, [objective, filteredServices])

  // Availability when date+period selected
  useEffect(() => {
    const fetchTimes = async () => {
      if (!selectedServiceId || !selectedDate || !period) return
      try {
        setLoadingTimes(true)
        const body = {
          date: format(selectedDate, 'yyyy-MM-dd'),
          serviceIds: [selectedServiceId],
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
        setAvailableTimes(filtered.slice(0,3))
        setTime(null)
      } finally {
        setLoadingTimes(false)
      }
    }
    fetchTimes()
  }, [selectedServiceId, selectedDate, period])

  // Helper flow choose recommended
  function finishHelper() {
    // Simple rule-based mapping
    const { clean, goal } = helperAnswers
    let target: Objective = 'CLEAN'
    if (goal === 'Proteção') target = 'PROTECT'
    else if (goal === 'Capricho') target = 'RENEW'
    else if (goal === 'Rapidez') target = 'QUICK'
    else if (clean === 'Muito sujo') target = 'CLEAN'
    setObjective(target)
    setShowHelper(false)
  }

  // Footer summary
  const selectedService = services.find(s => s.id === selectedServiceId) || null
  const totalPrice = selectedService?.price || 0
  const totalDuration = selectedService?.durationMinutes || 0

  // Continue action
  async function handleContinue() {
    if (!selectedService || !selectedDate || !time) return

    // If not logged in, send to login with redirect
    if (!user) {
      const qs = new URLSearchParams()
      qs.set('redirect', '/agendamentos/novo')
      qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
      qs.set('time', time)
      qs.set('services', selectedService.id)
      router.push(`/login?${qs.toString()}`)
      return
    }

    // Check cars to decide if needs registration modal
    if (hasCars === null) {
      try {
        const res = await fetch('/api/cars')
        if (res.ok) {
          const arr = await res.json()
          if (!Array.isArray(arr) || arr.length === 0) {
            setShowCarModal(true)
            return
          }
        }
      } catch {}
    }

    const qs = new URLSearchParams()
    qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
    qs.set('time', time)
    qs.set('services', selectedService.id)
    router.push(`/agendamentos/novo?${qs.toString()}`)
  }

  return (
    <div className="space-y-10">
      {/* STEP 1 - Objective */}
      <section>
        <h3 className="text-2xl font-bold text-white mb-4">O que você quer fazer no seu carro?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { key: 'CLEAN', title: 'Limpeza', desc: 'Seu carro limpo por dentro e por fora', emoji: '🧼' },
            { key: 'RENEW', title: 'Deixar como novo', desc: 'Brilho, remoção de riscos leves e aparência renovada', emoji: '✨' },
            { key: 'PROTECT', title: 'Proteger a pintura', desc: 'Proteção contra sol, chuva e sujeira por mais tempo', emoji: '🛡️' },
            { key: 'QUICK', title: 'Algo rápido', desc: 'Uma lavagem rápida para o dia a dia', emoji: '🚗' },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => { setObjective(opt.key as Objective); setSelectedServiceId(null) }}
              className={cx(
                'rounded-2xl text-left p-5 border transition focus:outline-none focus:ring-2 focus:ring-blue-500',
                'bg-gray-800/60 border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10',
                objective === (opt.key as any) && 'border-blue-600 bg-blue-600/10'
              )}
            >
              <div className="text-3xl mb-2">{opt.emoji}</div>
              <div className="text-white font-semibold text-lg">{opt.title}</div>
              <div className="text-gray-300 text-sm mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => { setShowHelper(true); setHelperStep(1); setHelperAnswers({ clean: null, goal: null, use: null }) }}>Me ajude a escolher</Button>
        </div>
      </section>

      {/* STEP 2 - Services filtered */}
      {objective && (
        <section>
          <h3 className="text-2xl font-bold text-white mb-4">Serviços para seu objetivo</h3>
          {loadingServices && <div className="text-gray-300">Carregando serviços...</div>}
          {!loadingServices && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={cx(
                    'rounded-2xl p-5 border text-left transition bg-gray-800/60 border-gray-700 hover:border-blue-500',
                    selectedServiceId === svc.id && 'border-blue-600 bg-blue-600/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold text-lg">{svc.name}</div>
                    {recommendedServiceId === svc.id && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Mais escolhido para esse objetivo</span>
                    )}
                  </div>
                  {svc.description && (
                    <div className="text-gray-300 text-sm mt-1">{svc.description}</div>
                  )}
                  <div className="text-sm text-gray-400 mt-3 flex gap-4">
                    <span>⏱ {Math.round((svc.durationMinutes || 0) / 60 * 10) / 10}h</span>
                    <span>💰 R$ {Number(svc.price || 0).toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STEP 3 - Date & Time */}
      {selectedServiceId && (
        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-white">Quando?</h3>

          {/* Day selection */}
          <div className="grid grid-cols-3 gap-3">
            <button className={cx('p-4 rounded-xl border bg-gray-800/60 border-gray-700 hover:border-blue-500', stepDate==='TODAY' && 'border-blue-600 bg-blue-600/10')} onClick={() => { setStepDate('TODAY'); setSelectedDate(new Date()) }}>Hoje</button>
            <button className={cx('p-4 rounded-xl border bg-gray-800/60 border-gray-700 hover:border-blue-500', stepDate==='TOMORROW' && 'border-blue-600 bg-blue-600/10')} onClick={() => { setStepDate('TOMORROW'); setSelectedDate(addDays(new Date(),1)) }}>Amanhã</button>
            <button className={cx('p-4 rounded-xl border bg-gray-800/60 border-gray-700 hover:border-blue-500', stepDate==='OTHER' && 'border-blue-600 bg-blue-600/10')} onClick={() => { setStepDate('OTHER'); const d = new Date(); setSelectedDate(d) }}>Outro dia</button>
          </div>
          {stepDate==='OTHER' && (
            <div className="flex items-center gap-3 text-white">
              <input type="date" className="bg-gray-800/60 border border-gray-700 rounded-lg p-2 text-white" value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''} onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)} />
              {selectedDate && <span className="text-gray-300">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>}
            </div>
          )}

          {/* Period */}
          {selectedDate && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <button className={cx('p-4 rounded-xl border bg-gray-800/60 border-gray-700 hover:border-blue-500', period==='MORNING' && 'border-blue-600 bg-blue-600/10')} onClick={() => setPeriod('MORNING')}>Manhã</button>
                <button className={cx('p-4 rounded-xl border bg-gray-800/60 border-gray-700 hover:border-blue-500', period==='AFTERNOON' && 'border-blue-600 bg-blue-600/10')} onClick={() => setPeriod('AFTERNOON')}>Tarde</button>
                <button className={cx('p-4 rounded-xl border bg-gray-800/60 border-gray-700 hover:border-blue-500', period==='EVENING' && 'border-blue-600 bg-blue-600/10')} onClick={() => setPeriod('EVENING')}>Noite</button>
              </div>

              {/* Times */}
              {period && (
                <div className="space-y-2">
                  {loadingTimes && <div className="text-gray-300">Carregando horários...</div>}
                  {!loadingTimes && (
                    <div className="flex flex-wrap gap-2">
                      {availableTimes.slice(0,3).map(t => (
                        <button key={t} className={cx('px-4 py-2 rounded-lg border bg-gray-800/60 border-gray-700 hover:border-blue-500', time===t && 'border-blue-600 bg-blue-600/10')} onClick={() => setTime(t)}>{t}</button>
                      ))}
                      {availableTimes.length === 0 && (
                        <div className="text-gray-400">Sem horários nesse período. Tente outro.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur px-4 py-3">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="text-white">
            <div className="text-sm text-gray-300">Total</div>
            <div className="text-xl font-bold">R$ {Number(totalPrice).toFixed(2)}</div>
          </div>
          <div className="text-gray-300">
            Duração estimada: {Math.round((totalDuration || 0)/60*10)/10}h
          </div>
          <Button
            disabled={!selectedService || !selectedDate || !time}
            onClick={handleContinue}
          >
            Continuar
          </Button>
        </div>
      </div>

      {/* Helper modal */}
      <Modal isOpen={showHelper} onClose={() => setShowHelper(false)} title="Me ajude a escolher">
        {helperStep === 1 && (
          <div className="space-y-3">
            <div className="text-white font-medium">Como está o carro?</div>
            <div className="grid grid-cols-3 gap-2">
              {['Limpo','Sujo','Muito sujo'].map(opt => (
                <button key={opt} className={cx('p-3 rounded-lg border bg-gray-800/60 border-gray-700 hover:border-blue-500', helperAnswers.clean===opt && 'border-blue-600 bg-blue-600/10')} onClick={() => setHelperAnswers(prev => ({...prev, clean: opt}))}>{opt}</button>
              ))}
            </div>
            <div className="flex justify-end"><Button onClick={() => setHelperStep(2)} disabled={!helperAnswers.clean}>Avançar</Button></div>
          </div>
        )}
        {helperStep === 2 && (
          <div className="space-y-3">
            <div className="text-white font-medium">O que você procura?</div>
            <div className="grid grid-cols-3 gap-2">
              {['Rapidez','Capricho','Proteção'].map(opt => (
                <button key={opt} className={cx('p-3 rounded-lg border bg-gray-800/60 border-gray-700 hover:border-blue-500', helperAnswers.goal===opt && 'border-blue-600 bg-blue-600/10')} onClick={() => setHelperAnswers(prev => ({...prev, goal: opt}))}>{opt}</button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setHelperStep(1)}>Voltar</Button>
              <Button onClick={() => setHelperStep(3)} disabled={!helperAnswers.goal}>Avançar</Button>
            </div>
          </div>
        )}
        {helperStep === 3 && (
          <div className="space-y-3">
            <div className="text-white font-medium">Como você usa o carro?</div>
            <div className="grid grid-cols-3 gap-2">
              {['Dia a dia','Fim de semana','Trabalho'].map(opt => (
                <button key={opt} className={cx('p-3 rounded-lg border bg-gray-800/60 border-gray-700 hover:border-blue-500', helperAnswers.use===opt && 'border-blue-600 bg-blue-600/10')} onClick={() => setHelperAnswers(prev => ({...prev, use: opt}))}>{opt}</button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setHelperStep(2)}>Voltar</Button>
              <Button onClick={finishHelper} disabled={!helperAnswers.use}>Ver recomendação</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Car Registration */}
      {showCarModal && user && (
        <QuickCarRegistration
          isOpen={showCarModal}
          onClose={() => setShowCarModal(false)}
          onSuccess={() => setShowCarModal(false)}
          customerId={user.id}
        />
      )}
    </div>
  )
}
