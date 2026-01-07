'use client'

import { ComponentType, lazy, Suspense, LazyExoticComponent } from 'react'
import { Loading } from '@/components/ui/Loading'

/**
 * Wrapper para lazy loading de componentes com Suspense
 * Útil para modais e componentes pesados que não precisam carregar imediatamente
 */
export function lazyWithSuspense<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <Loading />
): LazyExoticComponent<T> {
  const LazyComponent = lazy(importFn)
  
  return LazyComponent as LazyExoticComponent<T>
}

/**
 * HOC para envolver componente com Suspense
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <Loading />
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}
