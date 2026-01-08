type MaybeSlug = string | null | undefined

function isDevTenantRouting(hostname?: string) {
  if (typeof window !== 'undefined') {
    const host = hostname || window.location.hostname
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  }
  return process.env.NODE_ENV !== 'production'
}

function ensureLeadingSlash(path: string) {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function extractSubdomainSlug(hostname: string): string | null {
  const parts = hostname.split('.')
  if (parts.length >= 3) return parts[0]
  return null
}

function extractPathSlug(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([a-z0-9-]+)/)
  return match ? match[1] : null
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))
  return value ? decodeURIComponent(value.split('=')[1]) : null
}

export function getTenantSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const slugFromSubdomain = extractSubdomainSlug(window.location.hostname)
  if (slugFromSubdomain && slugFromSubdomain !== 'www') return slugFromSubdomain
  const slugFromPath = extractPathSlug(window.location.pathname)
  if (slugFromPath) return slugFromPath

  // Fallback: cookie set during login/verify
  const cookieSlug = getCookie('tenant_slug')
  if (cookieSlug) return cookieSlug

  // Dev fallback: sempre usar 'default' em dev quando nenhum slug é encontrado
  if (isDevTenantRouting()) {
    return 'default'
  }

  return null
}

export function withTenant(path: string, tenantSlug?: MaybeSlug): string {
  const slug = tenantSlug?.trim()
  const isAbsolute = /^https?:\/\//i.test(path)

  if (isAbsolute) return path
  if (!slug) return ensureLeadingSlash(path)

  const [basePath, query = ''] = ensureLeadingSlash(path).split('?')
  const alreadyPrefixed = basePath.startsWith('/t/')

  if (!isDevTenantRouting()) {
    return query ? `${basePath}?${query}` : basePath
  }

  if (alreadyPrefixed) {
    return query ? `${basePath}?${query}` : basePath
  }

  const prefixedPath = basePath === '/' ? `/t/${slug}` : `/t/${slug}${basePath}`
  return query ? `${prefixedPath}?${query}` : prefixedPath
}

export function withTenantHeaders(init: RequestInit = {}, tenantSlug?: MaybeSlug): RequestInit {
  let slug = tenantSlug?.trim()

  // Fallback: derive slug from URL when not provided (useful before TenantContext loads)
  if (!slug && typeof window !== 'undefined') {
    slug = getTenantSlugFromUrl() || undefined
  }

  // Sempre adiciona header se tiver slug, mesmo que seja 'default'
  const headers = new Headers(init.headers || {})
  if (slug && !headers.has('X-Tenant-Slug')) {
    headers.set('X-Tenant-Slug', slug)
  }

  return {
    ...init,
    headers: headers as any
  }
}
