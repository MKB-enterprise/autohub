'use client'

import { useState, useCallback } from 'react'

interface UseOptimisticUpdateOptions<T = void> {
  // Função que executa imediatamente (otimistic update)
  onOptimistic: (arg?: any) => T | Promise<T>
  // Função que é executada em background
  onAsync: (arg?: any) => Promise<void>
  // Callback se tudo correr bem
  onSuccess?: (result: T) => void
  // Callback se falhar (já fez rollback)
  onError?: (error: Error) => void
}

export function useOptimisticUpdate<T = void>({
  onOptimistic,
  onAsync,
  onSuccess,
  onError,
}: UseOptimisticUpdateOptions<T>) {
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(async (arg?: any) => {
    setIsLoading(true)

    try {
      // Executa o otimistic update imediatamente
      const result = await Promise.resolve(onOptimistic(arg))

      // Executa a ação em background SEM BLOQUEAR
      onAsync(arg).catch((err) => {
        // Se falhar, chama o erro
        const error = err instanceof Error ? err : new Error(String(err))
        onError?.(error)
      })

      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [onOptimistic, onAsync, onSuccess, onError])

  return { execute, isLoading }
}
