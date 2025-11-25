import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar usuário com senha
    const customer = await prisma.customer.findUnique({
      where: { id: user.customerId }
    })

    if (!customer || !customer.password) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou sem senha cadastrada' },
        { status: 404 }
      )
    }

    // Verificar senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, customer.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Atualizar senha
    await prisma.customer.update({
      where: { id: user.customerId },
      data: { password: hashedPassword }
    })

    return NextResponse.json({ message: 'Senha alterada com sucesso' })
  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    return NextResponse.json(
      { error: 'Erro ao alterar senha' },
      { status: 500 }
    )
  }
}
