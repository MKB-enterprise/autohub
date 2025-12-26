"use client"

import { useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import GuidedBooking from '@/components/GuidedBooking'

export default function Home() {
  const [selectedDate] = useState(new Date())
  const { user } = useAuth()
  const router = useRouter()

  return (
    <section className="px-4 md:px-8 py-5 md:py-12 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-end md:justify-between gap-3">
        <div className="hidden md:flex items-center gap-2">
          <Image src="/logo-estetica.png" alt="AutoGarage" width={32} height={32} className="rounded-md" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">AutoGarage</p>
            <p className="text-[11px] text-gray-400">Estética automotiva</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <Button size="sm" onClick={() => router.push(user.isAdmin ? '/agenda' : '/cliente')}>
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
                  router.push(`/login?${qs.toString()}`)
                }}
              >
                Entrar
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/register')}
              >
                Cadastro
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="text-center space-y-2 md:space-y-3">
        <h1 className="text-[22px] md:text-4xl font-bold">Agendamento Simples</h1>
        <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto">Escolha o serviço, o dia e a hora. Pronto! ⚡</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <GuidedBooking />
      </div>

      {/* CTA fixo mobile (somente quando não há scroll por GuidedBooking) */}
      <div className="md:hidden hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 to-transparent">
        <Button
          className="w-full"
          onClick={() => {
            const qs = new URLSearchParams()
            qs.set('redirect', '/agendamentos/novo')
            qs.set('date', format(selectedDate, 'yyyy-MM-dd'))
            router.push(`/login?${qs.toString()}`)
          }}
        >
          🚀 Agendar Agora
        </Button>
      </div>

    </section>
  )
}
