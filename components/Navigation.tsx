'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { Button } from './ui/Button'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()

  // Não mostrar nav em páginas públicas
  if (pathname === '/login' || pathname === '/register') {
    return null
  }

  if (loading) {
    return null
  }

  if (!user) {
    return (
      <nav className="bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 text-white p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 17H5C3.89543 17 3 16.1046 3 15V9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17Z" stroke="url(#gradient)" strokeWidth="2"/>
              <path d="M7 7L9 5H15L17 7" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="7" cy="12" r="1.5" fill="url(#gradient)"/>
              <circle cx="17" cy="12" r="1.5" fill="url(#gradient)"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stopColor="#06B6D4"/>
                  <stop offset="100%" stopColor="#3B82F6"/>
                </linearGradient>
              </defs>
            </svg>
            DETAILING PRO
          </Link>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
              Login
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all font-semibold">
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 text-white p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <Link href={user.isAdmin ? '/agenda' : '/cliente'} className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 17H5C3.89543 17 3 16.1046 3 15V9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17Z" stroke="url(#gradient)" strokeWidth="2"/>
              <path d="M7 7L9 5H15L17 7" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="7" cy="12" r="1.5" fill="url(#gradient)"/>
              <circle cx="17" cy="12" r="1.5" fill="url(#gradient)"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stopColor="#06B6D4"/>
                  <stop offset="100%" stopColor="#3B82F6"/>
                </linearGradient>
              </defs>
            </svg>
            DETAILING PRO
          </Link>
          
          {user.isAdmin ? (
            // Menu Admin
            <>
              <Link href="/agenda" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                📅 Agenda
              </Link>
              <Link href="/agendamentos/novo" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                ➕ Novo
              </Link>
              <Link href="/clientes" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                👥 Clientes
              </Link>
              <Link href="/servicos" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                🛠️ Serviços
              </Link>
              <Link href="/configuracoes" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                ⚙️ Config
              </Link>
            </>
          ) : (
            // Menu Cliente
            <>
              <Link href="/cliente" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                📋 Meus Agendamentos
              </Link>
              <Link href="/cliente/novo" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                ➕ Novo Agendamento
              </Link>
              <Link href="/cliente/perfil" className="px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30">
                👤 Meu Perfil
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            👋 {user.name}
          </span>
          <Button onClick={() => logout()} variant="danger" size="sm">
            🚪 Sair
          </Button>
        </div>
      </div>
    </nav>
  )
}
