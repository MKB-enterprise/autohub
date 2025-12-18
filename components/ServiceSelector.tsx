"use client"

import React from 'react'
import { Badge } from '@/components/ui/Badge'

export type ServiceOption = {
  id: string
  name: string
  description?: string | null
  durationMinutes: number
  price: number
  serviceGroup?: string | null
}

interface ServiceSelectorProps {
  services: ServiceOption[]
  selected: string[]
  onChange: (selectedIds: string[]) => void
  totalDuration?: number
  totalPrice?: number
  title?: string
  showHint?: boolean
}

export function ServiceSelector({
  services,
  selected,
  onChange,
  totalDuration,
  totalPrice,
  title = 'Selecione os Serviços',
  showHint = true
}: ServiceSelectorProps) {
  // Ensure selected is always an array
  const selectedArray = Array.isArray(selected) ? selected : []
  
  const serviceMap = React.useMemo(() => {
    const map = new Map<string, ServiceOption>()
    services.forEach(s => map.set(s.id, s))
    return map
  }, [services])

  const toggle = (serviceId: string) => {
    const svc = serviceMap.get(serviceId)
    const group = svc?.serviceGroup || null

    onChange(
      (() => {
        const already = selectedArray.includes(serviceId)
        if (already) {
          return selectedArray.filter(id => id !== serviceId)
        }
        if (group) {
          const filtered = selectedArray.filter(id => {
            const s = serviceMap.get(id)
            return (s?.serviceGroup || null) !== group
          })
          return [...filtered, serviceId]
        }
        return [...selectedArray, serviceId]
      })()
    )
  }

  const getConflictInfo = (service: ServiceOption): { conflictingName: string | null; isConflicted: boolean } => {
    if (!service.serviceGroup) return { conflictingName: null, isConflicted: false }
    const conflictingId = selectedArray.find(id => {
      if (id === service.id) return false
      const s = serviceMap.get(id)
      return (s?.serviceGroup || null) === service.serviceGroup
    })
    const conflictingName = conflictingId ? serviceMap.get(conflictingId)?.name || null : null
    return { conflictingName, isConflicted: Boolean(conflictingId) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {showHint && (
            <p className="text-sm text-gray-400 mt-1">Alguns serviços são mutuamente exclusivos - ao selecionar um, outros similares ficam indisponíveis.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {services.map((service) => {
          const checked = selectedArray.includes(service.id)
          const { conflictingName, isConflicted } = getConflictInfo(service)
          const disabled = isConflicted && !checked

          return (
            <div
              key={service.id}
              className={`rounded border transition ${
                checked
                  ? 'border-blue-600 bg-gray-900/60'
                  : disabled
                  ? 'border-gray-800 bg-gray-900/30 opacity-60'
                  : 'border-gray-800 bg-gray-900/40 hover:border-blue-500'
              }`}
            >
              <label className="flex items-start gap-3 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-blue-600"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(service.id)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{service.name}</p>
                    {service.serviceGroup && (
                      <Badge variant="info" className="text-xs">
                        {service.serviceGroup}
                      </Badge>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-400">{service.description}</p>
                  )}
                  <p className="text-sm text-gray-300">
                    {service.durationMinutes} min - R$ {Number(service.price).toFixed(2)}
                  </p>
                  {disabled && conflictingName && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <span>🔒</span> Indisponível - você já selecionou "{conflictingName}"
                    </p>
                  )}
                </div>
              </label>
            </div>
          )
        })}
      </div>

      {(typeof totalPrice === 'number' || typeof totalDuration === 'number') && (
        <div className="border border-blue-600 bg-gray-900/40 rounded p-4 text-white">
          {typeof totalPrice === 'number' && (
            <p className="text-lg font-semibold">Total: R$ {Number(totalPrice || 0).toFixed(2)}</p>
          )}
          {typeof totalDuration === 'number' && (
            <p className="text-sm text-gray-300 mt-1">Duração estimada: {totalDuration || 0} minutos</p>
          )}
        </div>
      )}
    </div>
  )
}
