'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useNavigation } from '@/lib/NavigationContext'
import { useTenantPath } from '@/lib/tenant-path'
import Image from 'next/image'

const adminMenuItems = [
  { href: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { href: 'agenda', label: 'Agenda', icon: '📅' },
  { href: 'clientes', label: 'Clientes', icon: '👥' },
  { href: 'carros', label: 'Carros', icon: '🚗' },
  { href: 'servicos', label: 'Serviços', icon: '🔧' },
  { href: 'categorias', label: 'Categorias', icon: '🏷️' },
  { href: 'produtos', label: 'Produtos', icon: '📦' },
  { href: 'estoque/diluicao', label: 'Diluição', icon: '🧪' },
  { href: 'estoque/movimentacoes', label: 'Movimentações', icon: '📊' },
  { href: 'configuracoes', label: 'Configurações', icon: '⚙️' },
]

const clientMenuItems = [
  { href: 'cliente', label: 'Meus Agendamentos', icon: '📋' },
  { href: 'cliente/novo', label: 'Novo Agendamento', icon: '➕' },
  { href: 'cliente/perfil', label: 'Meu Perfil', icon: '👤' },
]

function Sidebar() {
  const pathname = usePathname()
  const { user, business, logout } = useAuth()
  const { startNavigation } = useNavigation()
  const getTenantPath = useTenantPath()

  // Aceita user (customer) ou business
  if (!user && !business) return null

  // Se for business, mostrar menu de admin
  const isAdmin = !!business || user?.isAdmin
  const menuItems = isAdmin ? adminMenuItems : clientMenuItems
  
  // Dados de exibição
  const displayName = business?.name || user?.name || 'Usuário'
  const displayLabel = business ? 'Negócio' : (user?.isAdmin ? 'Administrador' : 'Cliente')

  const handleNavigate = () => {
    startNavigation()
  }

  return (
    <aside className="w-56 bg-gray-950 border-r border-gray-800 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800 flex items-center justify-center">
        <Link href={getTenantPath(isAdmin ? 'dashboard' : 'cliente')} className="flex items-center justify-center">
          <Image src="/autohub-logo.png" alt="AutoHub" width={140} height={50} className="max-h-10 object-contain" />
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const fullPath = getTenantPath(item.href)
            // Verificação mais precisa para evitar que /cliente fique ativo em /cliente/novo
            const isActive = pathname === fullPath || 
              (pathname.startsWith(fullPath + '/') && !item.href.includes('cliente'))
            return (
              <li key={item.href}>
                <Link
                  href={fullPath}
                  onClick={handleNavigate}
                  prefetch={false}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap text-sm ${
                    isActive
                      ? 'bg-blue-600'
                      : 'hover:bg-gray-800'
                  }`}
                  style={{ color: 'white' }}
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
      <div className="p-4 border-t border-gray-800 mt-auto space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{displayLabel}</p>
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

export default memo(Sidebar)
