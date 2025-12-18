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
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-black">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Estética Automotiva"
              width={120}
              height={40}
              className="h-30 w-auto"
            />
            <p className="text-white font-semibold">Estética Automotiva</p>
          </div>
          <div>
            {user ? (
              <Button onClick={() => router.push(user.isAdmin ? '/agenda' : '/cliente')}>
                Entrar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-white mb-3">Agendamento guiado, simples e rápido</h2>
          <p className="text-lg text-gray-300">Escolha o objetivo, o serviço, o dia e a hora — sem complicação.</p>
        </div>

        <div className="max-w-6xl mx-auto">
          <GuidedBooking />
        </div>
      </main>
    </div>
  )
}
