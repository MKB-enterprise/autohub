import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import LayoutWrapper from '@/components/LayoutWrapper'
import { SWRProvider } from '@/components/providers/SWRProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AutoGarage - Sistema de Agendamento',
  description: 'Sistema de controle de agendamento para estética automotiva',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-950 text-gray-100`}>
        <SWRProvider>
          <AuthProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  )
}
