"use client"

import { useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import GuidedBooking from '@/components/GuidedBooking'
import { LottieAnimation } from '@/components/ui/LottieAnimation'
import washerAnimation from '@/public/animations/Washer cleaning street.json'

export default function Home() {
  const [selectedDate] = useState(new Date())
  const { user } = useAuth()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar - responsivo */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-estetica.png"
              alt="AutoGarage"
              width={32}
              height={32}
              className="rounded-md"
            />
            <div>
              <p className="text-sm font-bold md:text-base">AutoGarage</p>
              <p className="text-xs text-gray-500">Estética Automotiva</p>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3">
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
      </header>

      {/* Hero - compact no mobile */}
      <section className="px-4 md:px-8 py-6 md:py-12 max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <div className="flex justify-center mb-4 md:mb-6">
            <LottieAnimation 
              animationData={washerAnimation} 
              className="w-48 h-48 md:w-72 md:h-72"
              loop={true}
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3">Agendamento Simples</h1>
          <p className="text-sm md:text-lg text-gray-400">Escolha o serviço, o dia e a hora. Pronto! ⚡</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <GuidedBooking />
        </div>
      </section>

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
    </div>
  )
}
