'use client'

import { useState } from 'react'

interface CollapsibleProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  icon?: string
}

export default function Collapsible({
  title,
  subtitle,
  badge,
  children,
  defaultOpen = false,
  icon = '▼'
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-800/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 md:px-4 py-3 md:py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg md:text-xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm md:text-base text-white truncate">{title}</p>
              {subtitle && <p className="text-xs md:text-sm text-gray-400 truncate">{subtitle}</p>}
            </div>
          </div>
        </div>
        {badge && <div className="ml-2 flex-shrink-0">{badge}</div>}
        <div className={`ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <span className="text-gray-400">▼</span>
        </div>
      </button>

      {open && (
        <div className="px-3 md:px-4 py-3 md:py-4 border-t border-gray-700 bg-gray-800/20">
          {children}
        </div>
      )}
    </div>
  )
}
