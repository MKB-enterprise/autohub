import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

// POST /api/auth/business/register - Registrar nova estética
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password } = body

    console.log('Registrando nova estética:', { name, email })

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se já existe
    const existingBusiness = await prisma.business.findUnique({
      where: { email }
    })

    if (existingBusiness) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar business
    const business = await prisma.business.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        subscriptionPlan: 'BASIC',
        subscriptionStatus: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionPlan: true
      }
    })

    // Criar settings padrão
    await prisma.businessSettings.create({
      data: {
        businessId: business.id,
        openingTimeWeekday: '08:00',
        closingTimeWeekday: '18:00',
        slotIntervalMinutes: 30,
        maxCarsPerSlot: 5
      }
    })

    // Criar templates de notificação padrão
    const defaultTemplates = [
      {
        type: 'APPOINTMENT_CREATED',
        title: 'Agendamento Criado',
        body: 'Seu agendamento foi criado com sucesso em {appointmentDate} às {appointmentTime}'
      },
      {
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Agendamento Confirmado',
        body: 'Seu agendamento de {servicesList} foi confirmado'
      },
      {
        type: 'APPOINTMENT_CANCELED',
        title: 'Agendamento Cancelado',
        body: 'Seu agendamento foi cancelado'
      },
      {
        type: 'APPOINTMENT_24H_REMINDER',
        title: 'Lembrete: Seu agendamento é amanhã',
        body: 'Você tem um agendamento amanhã às {appointmentTime}'
      },
      {
        type: 'APPOINTMENT_1H_REMINDER',
        title: 'Lembrete: Seu agendamento em 1 hora',
        body: 'Você tem um agendamento em 1 hora'
      },
      {
        type: 'APPOINTMENT_COMPLETED',
        title: 'Obrigado pela visita!',
        body: 'Avalie sua experiência em nosso serviço'
      }
    ]

    for (const template of defaultTemplates) {
      await prisma.notificationTemplate.create({
        data: {
          businessId: business.id,
          type: template.type as any,
          title: template.title,
          body: template.body,
          isActive: true
        }
      })
    }

    // Gerar token
    const token = generateToken({
      businessId: business.id,
      email: business.email,
      isAdmin: true
    })

    const response = NextResponse.json({
      business,
      token
    }, { status: 201 })

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    console.log('Estética registrada com sucesso:', business.id)
    return response
  } catch (error) {
    console.error('Erro ao registrar estética:', error)
    return NextResponse.json({ error: 'Erro ao registrar' }, { status: 500 })
  }
}
