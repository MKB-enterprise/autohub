import fs from 'fs'
import path from 'path'

const LOG_FILE = path.join(process.cwd(), 'debug-auth.log')

export function appendLog(message: string) {
  if (typeof window !== 'undefined') return // Não rodar no browser
  
  try {
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] ${message}\n`
    fs.appendFileSync(LOG_FILE, line, 'utf-8')
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export function clearLog() {
  if (typeof window !== 'undefined') return
  try {
    fs.writeFileSync(LOG_FILE, '', 'utf-8')
  } catch (error) {
    console.error('Failed to clear log:', error)
  }
}

export function readLog(): string {
  if (typeof window !== 'undefined') return ''
  try {
    return fs.readFileSync(LOG_FILE, 'utf-8')
  } catch (error) {
    return ''
  }
}
