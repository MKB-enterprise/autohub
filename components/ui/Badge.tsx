import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-700/50 text-gray-300 border border-gray-600/50',
    success: 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-lg shadow-green-500/10',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-lg shadow-yellow-500/10',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/10',
  }

  const infoStyle = variant === 'info' ? {
      backgroundColor: 'hsla(0, 0%, 0%, 0)',
      borderColor: 'var(--color-primary)',
      color: 'var(--color-primary)',
  } : {}

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variant !== 'info' ? variants[variant] : 'border'} ${className}`} style={infoStyle}>
      {children}
    </span>
  )
}
