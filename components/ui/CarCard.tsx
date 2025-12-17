'use client'

import { useState } from 'react'
import { IoCarSportSharp, IoCarSharp } from 'react-icons/io5'
import { FaTruckPickup, FaMotorcycle, FaShuttleVan } from 'react-icons/fa'
import { BsTruckFront } from 'react-icons/bs'

export type VehicleType = 'HATCH' | 'SEDAN' | 'SUV' | 'PICKUP' | 'MOTO' | 'VAN'

interface CarCardProps {
  id: string
  model: string
  plate: string
  color?: string | null
  vehicleType: VehicleType
  isSelected?: boolean
  onClick?: () => void
}

const colorMap: Record<string, string> = {
  'preto': '#1a1a1a',
  'branco': '#f5f5f5',
  'prata': '#a8a8a8',
  'cinza': '#6b7280',
  'vermelho': '#dc2626',
  'azul': '#2563eb',
  'verde': '#16a34a',
  'amarelo': '#eab308',
  'laranja': '#ea580c',
  'marrom': '#78350f',
  'bege': '#d4b896',
  'vinho': '#7f1d1d',
  'dourado': '#b8860b',
  'rosa': '#ec4899',
  'roxo': '#7c3aed',
}

function getCarColor(color?: string | null): string {
  if (!color) return '#2563eb'
  const normalizedColor = color.toLowerCase().trim()
  return colorMap[normalizedColor] || '#2563eb'
}

const VehicleIcons: Record<VehicleType, React.ElementType> = {
  HATCH: IoCarSharp,
  SEDAN: IoCarSportSharp,
  SUV: BsTruckFront,
  PICKUP: FaTruckPickup,
  MOTO: FaMotorcycle,
  VAN: FaShuttleVan,
}

function MercosulPlate({ plate }: { plate: string }) {
  const formattedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const letters = formattedPlate.slice(0, 3)
  const numbers = formattedPlate.slice(3)
  
  return (
    <div className="inline-flex flex-col items-center">
      <div className="bg-white rounded px-3 py-1 border-[3px] border-[#003399] shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-3 bg-[#003399] flex items-center justify-center">
          <span className="text-[6px] text-white font-bold tracking-widest">BRASIL</span>
        </div>
        <div className="text-xl font-bold text-[#1a1a1a] tracking-wider font-mono mt-2">
          {letters}<span className="text-[#003399]">•</span>{numbers}
        </div>
      </div>
    </div>
  )
}

const vehicleTypeLabels: Record<VehicleType, string> = {
  HATCH: 'Hatch',
  SEDAN: 'Sedan',
  SUV: 'SUV',
  PICKUP: 'Pickup',
  MOTO: 'Moto',
  VAN: 'Van',
}

export function CarCard({ id, model, plate, color, vehicleType, isSelected = false, onClick }: CarCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const carColor = getCarColor(color)
  const VehicleIcon = VehicleIcons[vehicleType] || VehicleIcons.HATCH

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-5 rounded-2xl cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'bg-gray-800 border-2 border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'bg-gray-800/60 border border-gray-700/50 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10'}
      `}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      
      <div className={`flex justify-center mb-4 transition-all duration-300 ${isHovered || isSelected ? 'scale-110' : ''}`}>
        <VehicleIcon size={64} color={carColor} />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="font-bold text-white text-base truncate">{model}</h3>
        <span className="inline-block px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400">
          {vehicleTypeLabels[vehicleType]}
        </span>
        <div className="pt-2">
          <MercosulPlate plate={plate} />
        </div>
        {color && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <div 
              className="w-3 h-3 rounded-full border border-white/20 shadow-inner" 
              style={{ backgroundColor: carColor }}
            />
            <span className="text-xs text-gray-400 capitalize">{color}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function VehicleTypeSelector({ value, onChange }: { value: VehicleType; onChange: (type: VehicleType) => void }) {
  const types: VehicleType[] = ['HATCH', 'SEDAN', 'SUV', 'PICKUP', 'MOTO', 'VAN']
  
  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map((type) => {
        const VehicleIcon = VehicleIcons[type]
        const isSelected = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`
              p-3 rounded-xl border-2 transition-all duration-200
              ${isSelected 
                ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}
            `}
          >
            <div className="flex justify-center">
              <VehicleIcon size={36} color={isSelected ? '#2563eb' : '#6b7280'} />
            </div>
            <p className={`text-xs mt-2 font-medium ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
              {vehicleTypeLabels[type]}
            </p>
          </button>
        )
      })}
    </div>
  )
}
