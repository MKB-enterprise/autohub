'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  animate?: boolean
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  animate = true
}: SkeletonProps) {
  const baseClasses = 'bg-gray-700/50'
  const animateClasses = animate ? 'animate-pulse' : ''
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  }

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  }

  return (
    <div 
      className={`${baseClasses} ${animateClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

// Skeleton para cards de agendamento
export function AppointmentSkeleton() {
  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <Skeleton width={200} height={24} />
          <Skeleton width={120} height={16} />
        </div>
        <Skeleton width={100} height={24} variant="rectangular" />
      </div>
      <div className="space-y-2">
        <Skeleton width="80%" height={16} />
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={16} />
      </div>
    </div>
  )
}

// Alias para compatibilidade
export const SkeletonCard = AppointmentSkeleton

// Skeleton para lista de serviços
export function ServiceSkeleton() {
  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" height={20} />
          <Skeleton width="80%" height={14} />
          <div className="flex gap-4 mt-2">
            <Skeleton width={80} height={14} />
            <Skeleton width={80} height={14} />
          </div>
        </div>
        <Skeleton width={80} height={32} />
      </div>
    </div>
  )
}

// Skeleton para timeline da agenda
export function AgendaSlotSkeleton() {
  return (
    <div className="flex items-center gap-6 p-4 rounded-lg border border-gray-800 bg-gray-900/30">
      <Skeleton width={64} height={24} />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" height={18} />
        <Skeleton width="60%" height={14} />
      </div>
    </div>
  )
}

// Skeleton para cards do dashboard
export function DashboardCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/30">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width={40} height={40} variant="circular" />
        <Skeleton width={100} height={16} />
      </div>
      <Skeleton width={80} height={36} className="mb-2" />
      <Skeleton width={120} height={14} />
    </div>
  )
}

// Skeleton para tabela
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-700">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={16} width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  )
}

// Skeleton para card de cliente
export function CustomerCardSkeleton() {
  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
      <div className="flex items-center gap-4">
        <Skeleton width={48} height={48} variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton width="50%" height={18} />
          <Skeleton width="30%" height={14} />
        </div>
        <Skeleton width={80} height={32} />
      </div>
    </div>
  )
}

// Wrapper para mostrar loading com fade
export function LoadingFade({ 
  isLoading, 
  children,
  skeleton
}: { 
  isLoading: boolean
  children: React.ReactNode
  skeleton?: React.ReactNode
}) {
  if (isLoading && skeleton) {
    return <>{skeleton}</>
  }

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
      {children}
    </div>
  )
}
