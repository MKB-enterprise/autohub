"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

function Tab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs transition-colors ${
          active ? 'text-white' : 'text-gray-400 hover:text-gray-200'
        }`
      }
      aria-current={active ? 'page' : undefined}
    >
      <span className={`text-xl leading-none ${active ? 'opacity-100' : 'opacity-80'}`}>{icon}</span>
      <span className="truncate max-w-[80px]">{label}</span>
    </Link>
  )
}

export default function MobileTabBar() {
  const pathname = usePathname()
  const { user } = useAuth()

  if (!user) return null

  const adminTabs = [
    { href: '/agenda', label: 'Agenda', icon: '📅' },
    { href: '/clientes', label: 'Clientes', icon: '👥' },
    { href: '/carros', label: 'Carros', icon: '🚗' },
    { href: '/servicos', label: 'Serviços', icon: '🔧' },
    { href: '/configuracoes', label: 'Config', icon: '⚙️' },
  ]

  const clientTabs = [
    { href: '/cliente', label: 'Agendamentos', icon: '📋' },
    { href: '/cliente/novo', label: 'Novo', icon: '➕' },
    { href: '/cliente/perfil', label: 'Perfil', icon: '👤' },
  ]

  const tabs = user.isAdmin ? adminTabs : clientTabs

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      <div className="pointer-events-none px-3 pb-[max(env(safe-area-inset-bottom),0px)]">
        <nav className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-stretch divide-x divide-gray-800">
            {tabs.map((t) => (
              <Tab key={t.href} href={t.href} label={t.label} icon={t.icon} active={pathname === t.href || pathname.startsWith(t.href + '/')}/>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
