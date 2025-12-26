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
     <section className="px-4 md:px-8 lg:px-12 pt-4 pb-5 md:pt-6 md:pb-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image src="/autohub-logo.png" alt="AutoGarage" width={120} height={120} className="rounded-md md:hidden mb-[14px]" />
          <Image src="/autohub-logo.png" alt="AutoGarage" width={240} height={240} className="rounded-md hidden md:block mb-[14px]" />
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

      <div className="text-center space-y-2 md:space-y-3 mt-24 md:mt-32">
        <h1 className="text-[22px] md:text-4xl font-bold">Agendamento Simples</h1>
        <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto">Escolha o serviço, o dia e a hora. Pronto! ⚡</p>
      </div>

      <div className="max-w-6xl mx-auto">
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
