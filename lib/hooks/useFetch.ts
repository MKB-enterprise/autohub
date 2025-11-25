'use client'

import useSWR, { SWRConfiguration } from 'swr'

// Fetcher padrão
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Erro ao carregar dados')
    throw error
  }
  return res.json()
}

// Configuração global do SWR
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // Não revalidar quando voltar à aba
  revalidateIfStale: true,
  dedupingInterval: 5000, // Deduplicar requests em 5s
  keepPreviousData: true, // Manter dados anteriores enquanto carrega novos
}

// Hook genérico para fetch com cache
export function useData<T>(url: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    url,
    fetcher,
    {
      ...swrConfig,
      ...options,
    }
  )

  return {
    data,
    error,
    isLoading,
    isValidating, // true quando está revalidando em background
    mutate, // função para atualizar cache manualmente
    isError: !!error,
  }
}

// Alias para compatibilidade
export const useFetch = useData

// Hook para appointments com cache por data
export function useAppointments(date: string) {
  return useData<any[]>(`/api/appointments?date=${date}`)
}

// Hook para serviços (raramente muda, cache longo)
export function useServices(activeOnly: boolean = true) {
  return useData<any[]>(
    `/api/services${activeOnly ? '?activeOnly=true' : ''}`,
    { revalidateOnMount: true, dedupingInterval: 60000 } // Cache de 1 minuto
  )
}

// Hook para clientes
export function useCustomers() {
  return useData<any[]>('/api/customers')
}

// Hook para cliente específico
export function useCustomer(id: string | null) {
  return useData<any>(id ? `/api/customers/${id}` : null)
}

// Hook para configurações (raramente muda)
export function useSettings() {
  return useData<any>('/api/settings', {
    revalidateOnMount: true,
    dedupingInterval: 300000, // Cache de 5 minutos
  })
}

// Hook para dashboard stats
export function useDashboardStats() {
  return useData<any>('/api/dashboard/stats', {
    refreshInterval: 60000, // Atualizar a cada 1 minuto
  })
}

// Hook para carros do cliente
export function useCustomerCars(customerId: string | null) {
  return useData<any[]>(customerId ? `/api/cars?customerId=${customerId}` : null)
}
