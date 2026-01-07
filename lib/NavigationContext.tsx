'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LoadingContextType {
  isNavigating: boolean
  startNavigation: () => void
  stopNavigation: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)

  const startNavigation = () => setIsNavigating(true)
  const stopNavigation = () => setIsNavigating(false)

  return (
    <LoadingContext.Provider value={{ isNavigating, startNavigation, stopNavigation }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within LoadingProvider')
  }
  return context
}
