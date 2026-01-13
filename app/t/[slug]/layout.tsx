import { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { resolveTenantBySlug } from '@/lib/tenant-resolver'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function TenantLayout({ params, children }: { params: { slug: string }; children: ReactNode }) {
  const tenant = await resolveTenantBySlug(params.slug)

  // Se o slug não existir, retorna 404
  if (!tenant) {
    notFound()
  }

  // Validar se o token corresponde ao tenant do slug
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value

  if (token) {
    try {
      const payload = verifyToken(token)
      
      // IMPORTANTE: Clientes têm customerId, não businessId
      // Apenas bloquear se tem businessId no token E não corresponde ao tenant
      // (clientes podem acessar qualquer tenant, já que não têm businessId)
      if (payload && payload.businessId && !payload.customerId && payload.businessId !== tenant.tenantId) {
        console.warn('[TENANT_LAYOUT] Business token mismatch - redirecting to logout', {
          tokenBusinessId: payload.businessId,
          slugBusinessId: tenant.tenantId,
          slug: params.slug,
          isCustomer: !!payload.customerId
        })
        
        // Redirecionar para logout seguro com motivo
        redirect('/logout-redirect?reason=tenant_mismatch')
      }
    } catch (error) {
      // Token inválido - deixa passar, será tratado nas APIs
      console.error('[TENANT_LAYOUT] Token verification failed:', error)
    }
  }

  return <>{children}</>
}
