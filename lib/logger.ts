// Conditional imports - only load in Node.js, not in Edge Runtime
let fs: any = null
let path: any = null
let LOG_FILE = ''

// Only import fs and path if we're in Node.js environment
if (typeof globalThis !== 'undefined' && process.env.NODE_ENV) {
  try {
    // Import will fail in Edge Runtime, which is fine - logging is disabled there
    fs = require('fs')
    path = require('path')
    LOG_FILE = path.join(process.cwd(), 'debug-auth.log')
  } catch (error) {
    // Edge Runtime doesn't have fs/path - just disable logging
  }
}

export function appendLog(message: string) {
  // Don't log in browser or Edge Runtime
  if (typeof window !== 'undefined' || !fs || !LOG_FILE) return
  
  try {
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] ${message}\n`
    fs.appendFileSync(LOG_FILE, line, 'utf-8')
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export function clearLog() {
  if (typeof window !== 'undefined' || !fs || !LOG_FILE) return
  try {
    fs.writeFileSync(LOG_FILE, '', 'utf-8')
  } catch (error) {
    console.error('Failed to clear log:', error)
  }
}

export function readLog(): string {
  if (typeof window !== 'undefined' || !fs || !LOG_FILE) return ''
  try {
    return fs.readFileSync(LOG_FILE, 'utf-8')
  } catch (error) {
    return ''
  }
}
