import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const MAX_SIZE = 1_000_000 // 1MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

function getExtension(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/svg+xml') return 'svg'
  return 'bin'
}

export async function POST(req: NextRequest) {
  const slug = req.headers.get('x-tenant-slug') || 'default'

  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG ou SVG.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Tamanho máximo de 1MB excedido.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const ext = getExtension(file.type)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tenants', slug)
  await fs.mkdir(uploadsDir, { recursive: true })

  const filename = `logo-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
  const filePath = path.join(uploadsDir, filename)
  await fs.writeFile(filePath, buffer)

  const publicUrl = `/uploads/tenants/${slug}/${filename}`

  return NextResponse.json({ url: publicUrl })
}
