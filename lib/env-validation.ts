/**
 * Environment validation
 * 
 * Valida variáveis de ambiente obrigatórias na startup
 * Fail fast se configuração crítica estiver faltando
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const

const RECOMMENDED_ENV_VARS = [
  'NEXT_PUBLIC_TIMEZONE',
  'PUBLIC_BASE_URL',
] as const

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Verificar variáveis obrigatórias
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }
  
  // Verificar variáveis recomendadas
  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(`Missing recommended environment variable: ${envVar}`)
    }
  }
  
  // Validações específicas
  if (process.env.JWT_SECRET === 'fallback-secret-change-this') {
    errors.push('JWT_SECRET is using insecure fallback value. Please set a strong secret.')
  }
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for better security')
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.PUBLIC_BASE_URL) {
    errors.push('PUBLIC_BASE_URL is required in production for webhooks and callbacks')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validar e logar na startup (apenas em produção ou quando forçado)
 */
export function validateAndLogEnv() {
  const result = validateEnvironment()
  
  if (result.errors.length > 0) {
    console.error('❌ Environment validation failed:')
    result.errors.forEach(error => console.error(`  - ${error}`))
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed. Cannot start application.')
    } else {
      console.warn('⚠️  Running in development with environment errors. Fix before deploying!')
    }
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed')
  }
}
