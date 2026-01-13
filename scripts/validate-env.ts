#!/usr/bin/env tsx
/**
 * Validate Environment Variables
 * 
 * Usage:
 *   npm run validate:env
 *   tsx scripts/validate-env.ts
 */

import { validateAndLogEnv } from '../lib/env-validation'

try {
  validateAndLogEnv()
  console.log('\n✅ Environment validation complete\n')
  process.exit(0)
} catch (error) {
  console.error('\n❌ Environment validation failed\n')
  console.error(error)
  process.exit(1)
}
