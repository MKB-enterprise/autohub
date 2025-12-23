'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

const adminMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/carros', label: 'Carros', icon: '🚗' },
  { href: '/servicos', label: 'Serviços', icon: '🔧' },
  { href: '/categorias', label: 'Categorias', icon: '🏷️' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

const clientMenuItems = [
  { href: '/cliente', label: 'Meus Agendamentos', icon: '📋' },
  { href: '/cliente/novo', label: 'Novo Agendamento', icon: '➕' },
  { href: '/cliente/perfil', label: 'Meu Perfil', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) return null

  const menuItems = user.isAdmin ? adminMenuItems : clientMenuItems

  return (
    <aside className="w-56 bg-gray-950 border-r border-gray-800 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link href={user.isAdmin ? '/dashboard' : '/cliente'} className="text-xl font-bold text-white">
          AutoGarage
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            // Verificação mais precisa para evitar que /cliente fique ativo em /cliente/novo
            const isActive = pathname === item.href || 
              (pathname.startsWith(item.href + '/') && item.href !== '/cliente')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.isAdmin ? 'Administrador' : 'Cliente'}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-red-400 rounded-lg transition-all text-sm"
        >
          <span>🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
