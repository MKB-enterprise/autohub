import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function Card({ children, title, className = '' }: CardProps) {
  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-black rounded-xl shadow-xl shadow-black/10 p-6 hover:border-black transition-all ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <span className="inline-block w-1 h-6 bg-black rounded-full"></span>
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
