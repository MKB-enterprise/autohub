import { NextResponse } from 'next/server'
import { readLog, clearLog } from '@/lib/logger'

export async function GET() {
  try {
    const logs = readLog()
    return NextResponse.json({ logs }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    clearLog()
    return NextResponse.json({ message: 'Logs cleared' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 })
  }
}
