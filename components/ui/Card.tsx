import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function Card({ children, title, className = '' }: CardProps) {
  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl shadow-2xl shadow-cyan-500/5 p-6 hover:border-cyan-500/40 transition-all ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <span className="inline-block w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></span>
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
