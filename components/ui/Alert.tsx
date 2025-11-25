'use client'

import React from 'react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  type: AlertType
  message: string
  onClose?: () => void
}

export function Alert({ type, message, onClose }: AlertProps) {
  const styles = {
    success: 'bg-green-900/50 text-green-400 border-green-700',
    error: 'bg-red-900/50 text-red-400 border-red-700',
    warning: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    info: 'bg-cyan-900/50 text-cyan-400 border-cyan-700'
  }

  return (
    <div className={`p-4 border rounded-md ${styles[type]} flex items-start justify-between`}>
      <p className="text-sm">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-xl leading-none hover:opacity-70"
        >
          ×
        </button>
      )}
    </div>
  )
}
