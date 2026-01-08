/**
 * Testes mínimos de hardening multi-tenant
 * Execução: BASE_URL=http://localhost:3000 FORCE_PROD_MODE=true tsx tests/tenant-hardening.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const FORCE_PROD_MODE = process.env.FORCE_PROD_MODE === 'true'

async function ensureTenants() {
  const prisma = new PrismaClient()
  const hashed = bcrypt.hashSync('default123', 10)
  const hashedOther = bcrypt.hashSync('other123', 10)
  await prisma.business.upsert({
    where: { slug: 'default' },
    update: { isActive: true },
    create: {
      name: 'Default Tenant',
      slug: 'default',
      email: 'default@example.com',
      password: hashed,
      isActive: true
    }
  })
  await prisma.business.upsert({
    where: { slug: 'other' },
    update: { isActive: true },
    create: {
      name: 'Other Tenant',
      slug: 'other',
      email: 'other@example.com',
      password: hashedOther,
      isActive: true
    }
  })
  await prisma.$disconnect()
}

async function fetchWithCookies(url: string, options: any = {}, jar: Map<string, string> = new Map()) {
  options.headers = options.headers || {}
  if (jar.size) {
    options.headers['cookie'] = Array.from(jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }
  const res = await fetch(url, options)
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const match = setCookie.match(/tenant_slug=([^;]+)/)
    if (match) {
      jar.set('tenant_slug', match[1])
    }
  }
  const json = await res.json()
  return { res, json }
}

function assert(cond: any, message: string) {
  if (!cond) throw new Error(message)
}

async function testPathResolution() {
  const jar = new Map<string, string>()
  const { json } = await fetchWithCookies(`${BASE_URL}/t/default/api/debug/tenant`, {}, jar)
  if (!json?.diagnostics?.resolution) throw new Error('path: resposta inválida ' + JSON.stringify(json))
  assert(json.diagnostics.resolution.status === 'SUCCESS', 'path: status success')
  assert(['path', 'header'].includes(json.diagnostics.resolution.source), 'path: source path/header')
  console.log('✓ resolve via path /t/default')
}

async function testCookieResolution() {
  const jar = new Map<string, string>()
  // primeiro visita com path para setar cookie
  await fetchWithCookies(`${BASE_URL}/t/default/api/debug/tenant`, {}, jar)
  const { json } = await fetchWithCookies(`${BASE_URL}/api/debug/tenant`, {}, jar)
  if (!json?.diagnostics?.resolution) throw new Error('cookie: resposta inválida ' + JSON.stringify(json))
  assert(json.diagnostics.resolution.status === 'SUCCESS', 'cookie: status success')
  assert(['cookie', 'header', 'fallback'].includes(json.diagnostics.resolution.source), 'cookie: source cookie/header/fallback')
  console.log('✓ resolve via cookie após visitar /t/default')
}

async function testApiRewrite() {
  const jar = new Map<string, string>()
  const { json } = await fetchWithCookies(`${BASE_URL}/t/default/api/debug/tenant`, {}, jar)
  if (!json?.diagnostics?.resolution) throw new Error('rewrite: resposta inválida ' + JSON.stringify(json))
  assert(json.diagnostics.resolution.status === 'SUCCESS', 'rewrite: status success')
  console.log('✓ /t/default/api/* reescreve e resolve')
}

async function testProdNoSlug() {
  if (!FORCE_PROD_MODE) {
    console.log('ℹ️  pulando teste prod (set FORCE_PROD_MODE=true para rodar)')
    return
  }
  const res = await fetch(`${BASE_URL}/api/debug/tenant`)
  assert(res.status === 404 || res.status === 400 || res.status === 403, 'prod: sem slug deve falhar')
  console.log('✓ prod simulated: sem slug retorna erro')
}

async function testCrossTenantIsolation() {
  // apenas valida que resoluções distintas funcionam
  const jarA = new Map<string, string>()
  const jarB = new Map<string, string>()
  const { json: jsonA } = await fetchWithCookies(`${BASE_URL}/t/default/api/debug/tenant`, {}, jarA)
  const { json: jsonB } = await fetchWithCookies(`${BASE_URL}/t/other/api/debug/tenant`, {}, jarB)
  assert(jsonA.diagnostics.resolution.business?.slug === 'default', 'tenant A slug ok')
  assert(jsonB.diagnostics.resolution.business?.slug === 'other', 'tenant B slug ok')
  console.log('✓ tenants distintos resolvidos (cross isolation baseline)')
}

async function main() {
  await ensureTenants()
  await testPathResolution()
  await testCookieResolution()
  await testApiRewrite()
  await testProdNoSlug()
  await testCrossTenantIsolation()
  console.log('\n✅ Todos os testes de hardening executados')
}

main().catch(err => {
  console.error('❌ Falhou:', err.message)
  process.exit(1)
})
