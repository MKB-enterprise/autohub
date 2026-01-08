"use client"

import { useState, lazy, Suspense } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useTenant } from '@/lib/TenantContext'
import { withTenant } from '@/lib/tenant-client'

// Lazy load do componente pesado
const GuidedBooking = lazy(() => import('@/components/GuidedBooking'))

export default function TenantHomePage() {
  const [selectedDate] = useState(new Date())
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { tenant, settings } = useTenant()

  const logoUrl = settings?.branding?.logoUrl
  const displayName = settings?.branding?.displayName || tenant?.name || 'AutoHub'

  return (
     <section className="px-4 md:px-8 lg:px-12 pt-4 pb-5 md:pt-6 md:pb-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt={displayName} className="max-h-[80px] md:max-h-[120px] object-contain md:hidden mb-[14px]" />
              <img src={logoUrl} alt={displayName} className="max-h-[120px] md:max-h-[160px] object-contain hidden md:block mb-[14px]" />
            </>
          ) : (
            <>
              <h2 className="text-lg md:text-2xl font-bold text-white mb-[14px]">{displayName}</h2>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <Button size="sm" onClick={() => router.push(withTenant(user.isAdmin ? '/agenda' : '/cliente', slug))}>
              Painel
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const qs = new URLSearchParams()
                  qs.set('redirect', '/agendamentos/novo')
                  qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
                  router.push(withTenant(`/login?${qs.toString()}`, slug))
                }}
              >
                Entrar
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(withTenant('/register', slug))}
              >
                Cadastro
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="text-center space-y-2 md:space-y-3 mt-24 md:mt-32">
        <h1 className="text-[22px] md:text-4xl font-bold">Agendamento Simples</h1>
        <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto">Escolha o serviço, o dia e a hora. Pronto! ⚡</p>
      </div>

      <div className="max-w-6xl mx-auto">
        <Suspense fallback={<div className="text-center py-12 text-gray-400">Carregando...</div>}>
          <GuidedBooking />
        </Suspense>
      </div>

      {/* CTA fixo mobile (somente quando não há scroll por GuidedBooking) */}
      <div className="md:hidden hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 to-transparent">
        <Button
          className="w-full"
          onClick={() => {
            const qs = new URLSearchParams()
            qs.set('redirect', '/agendamentos/novo')
            qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
            router.push(withTenant(`/login?${qs.toString()}`, slug))
          }}
        >
          🚀 Agendar Agora
        </Button>
      </div>

    </section>
  )
}
