import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { TenantProvider } from '@/lib/TenantContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import { LoadingProvider } from '@/lib/NavigationContext'
import LayoutWrapper from '@/components/LayoutWrapper'
import { SWRProvider } from '@/components/providers/SWRProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AutoHub - Sistema de Agendamento',
  description: 'Sistema de controle de agendamento para estética automotiva',
  themeColor: '#0b1020'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
        <ThemeProvider>
          <SWRProvider>
            <LoadingProvider>
              <TenantProvider>
                <AuthProvider>
                  <LayoutWrapper>
                    {children}
                  </LayoutWrapper>
                </AuthProvider>
              </TenantProvider>
            </LoadingProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

