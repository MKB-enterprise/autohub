'use client'

import {
  useState,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
  type FormEvent,
} from 'react'

interface UseAsyncActionOptions<TResult = unknown> {
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
}

type AsyncActionConfig<TArgs extends any[] = [], TResult = void> = {
  action: (...args: TArgs) => Promise<TResult>
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
}

type UseAsyncActionReturn<TArgs extends any[] = [], TResult = void> = {
  execute: (...args: TArgs) => Promise<TResult | undefined>
  isLoading: boolean
  error: Error | null
  setError: Dispatch<SetStateAction<Error | null>>
}

export function useAsyncAction<TResult = void>(
  asyncFn: () => Promise<TResult>,
  options?: UseAsyncActionOptions<TResult>
): UseAsyncActionReturn<[], TResult>

export function useAsyncAction<TArgs extends any[] = [], TResult = void>(
  config: AsyncActionConfig<TArgs, TResult>
): UseAsyncActionReturn<TArgs, TResult>

export function useAsyncAction<TArgs extends any[] = [], TResult = void>(
  asyncFnOrConfig: (() => Promise<TResult>) | AsyncActionConfig<TArgs, TResult>,
  options?: UseAsyncActionOptions<TResult>
): UseAsyncActionReturn<TArgs, TResult> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { asyncFn, callbacks } = useMemo(() => {
    if (typeof asyncFnOrConfig === 'function') {
      return { asyncFn: asyncFnOrConfig, callbacks: options }
    }

    return {
      asyncFn: asyncFnOrConfig.action,
      callbacks: {
        onSuccess: asyncFnOrConfig.onSuccess,
        onError: asyncFnOrConfig.onError,
      } as UseAsyncActionOptions<TResult>,
    }
  }, [asyncFnOrConfig, options])

  const execute = useCallback(
    async (...args: TArgs) => {
      // Já está carregando, ignora nova chamada
      if (isLoading) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFn(...args)
        callbacks?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        callbacks?.onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, asyncFn, callbacks]
  )

  return {
    execute,
    isLoading,
    error,
    setError, // Permite limpar erro manualmente
  }
}

/**
 * Versão que retorna execute como função de event handler para forms
 */
type AsyncFormConfig<TResult = void> = {
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<TResult>
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
}

type UseAsyncFormReturn<TResult = void> = {
  execute: (e: FormEvent<HTMLFormElement>) => Promise<TResult | undefined>
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<TResult | undefined>
  isSubmitting: boolean
  isLoading: boolean
  error: Error | null
  setError: Dispatch<SetStateAction<Error | null>>
}

export function useAsyncForm<TResult = void>(
  asyncFn: (formData: FormData) => Promise<TResult>,
  options?: UseAsyncActionOptions<TResult>
): UseAsyncFormReturn<TResult>

export function useAsyncForm<TResult = void>(
  config: AsyncFormConfig<TResult>
): UseAsyncFormReturn<TResult>

export function useAsyncForm<TResult = void>(
  asyncFnOrConfig: ((formData: FormData) => Promise<TResult>) | AsyncFormConfig<TResult>,
  options?: UseAsyncActionOptions<TResult>
): UseAsyncFormReturn<TResult> {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { submit, callbacks } = useMemo(() => {
    if (typeof asyncFnOrConfig === 'function') {
      return {
        submit: async (e: FormEvent<HTMLFormElement>) => {
          const formData = new FormData(e.currentTarget)
          return asyncFnOrConfig(formData)
        },
        callbacks: options,
      }
    }

    return {
      submit: asyncFnOrConfig.onSubmit,
      callbacks: {
        onSuccess: asyncFnOrConfig.onSuccess,
        onError: asyncFnOrConfig.onError,
      } as UseAsyncActionOptions<TResult>,
    }
  }, [asyncFnOrConfig, options])

  const execute = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (isSubmitting) return

      setIsSubmitting(true)
      setError(null)

      try {
        const result = await submit(e)
        callbacks?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        callbacks?.onError?.(error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, submit, callbacks]
  )

  return {
    execute,
    onSubmit: execute,
    isSubmitting,
    isLoading: isSubmitting,
    error,
    setError,
  }
}
