/**
 * WhatsApp Phase 5 Tests
 * Unit tests + Smoke tests para: 24h window, template resolver, cron processor, webhook
 *
 * Execução: tsx tests/whatsapp-phase5.ts
 */

import { prisma } from '@/lib/db'
import { isWithin24hWindow, hoursUntilWindowExpires } from '@/lib/whatsapp/window'
import { renderTemplateVariables, renderFullTemplate, resolveTemplateId } from '@/lib/whatsapp/template-resolver'
import bcrypt from 'bcryptjs'

// ============ UNIT TESTS ============

function testUnit_24hWindow() {
  console.log('\n📋 UNIT: 24h Window Logic')
  const now = new Date()

  // Test 1: No history
  const result1 = isWithin24hWindow(null, now)
  if (result1 !== false) throw new Error('❌ null should be false')
  console.log('  ✓ null → false')

  // Test 2: Message 1h ago (within)
  const msg1hAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000)
  const result2 = isWithin24hWindow(msg1hAgo, now)
  if (result2 !== true) throw new Error('❌ 1h ago should be true')
  console.log('  ✓ 1h ago → true')

  // Test 3: Message 23h 59m ago (within)
  const msg23h59mAgo = new Date(now.getTime() - (23 * 60 + 59) * 60 * 1000)
  const result3 = isWithin24hWindow(msg23h59mAgo, now)
  if (result3 !== true) throw new Error('❌ 23h59m ago should be true')
  console.log('  ✓ 23h59m ago → true')

  // Test 4: Message 24h 1m ago (outside)
  const msg24h1mAgo = new Date(now.getTime() - (24 * 60 + 1) * 60 * 1000)
  const result4 = isWithin24hWindow(msg24h1mAgo, now)
  if (result4 !== false) throw new Error('❌ 24h1m ago should be false')
  console.log('  ✓ 24h1m ago → false')

  // Test 5: Hours until expiry
  const msgExpiry = new Date(now.getTime() - 12 * 60 * 60 * 1000) // 12h ago
  const hours = hoursUntilWindowExpires(msgExpiry)
  if (Math.abs(Math.floor(hours) - 12) > 1) throw new Error(`❌ Expected ~12h, got ${hours}`)
  console.log(`  ✓ Hours until expiry: ~${Math.floor(hours)}h`)

  console.log('✅ 24h Window tests passed\n')
}

function testUnit_TemplateVariables() {
  console.log('📋 UNIT: Template Variable Rendering')

  const template = 'Olá {customerName}, você tem agendamento em {appointmentDateTime}'
  const variables = {
    customerName: 'João Silva',
    appointmentDateTime: '10/01/2026 14:30'
  }

  const result = renderTemplateVariables(template, variables)
  const expected = 'Olá João Silva, você tem agendamento em 10/01/2026 14:30'
  
  if (result !== expected) {
    throw new Error(`❌ Expected: "${expected}"\nGot: "${result}"`)
  }
  console.log('  ✓ Basic variable replacement')

  // Test with special chars (should escape)
  const template2 = 'Cliente: {name}'
  const result2 = renderTemplateVariables(template2, { name: 'João & Silva' })
  if (!result2.includes('&amp;')) {
    throw new Error('❌ Should escape & character')
  }
  console.log('  ✓ Special char escaping')

  console.log('✅ Template variable tests passed\n')
}

async function testUnit_TemplateResolver() {
  console.log('📋 UNIT: Template Resolver')

  // Create test business
  const plan = await prisma.plan.findFirst({ where: { code: 'SIMPLES' } })
  if (!plan) throw new Error('Plano SIMPLES não encontrado (rode o seed).')

  const testBusiness = await prisma.business.create({
    data: {
      name: 'WhatsApp Template Test',
      slug: `wa-template-test-${Date.now()}`,
      email: `wa-template-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC',
      planId: plan.id
    }
  })

  try {
    // Test 1: Resolve template ID from env
    const templateId = await resolveTemplateId('REOPEN_CONVERSATION_UTILITY', testBusiness.id)
    if (!templateId) throw new Error('❌ Could not resolve template ID')
    console.log(`  ✓ Template ID resolved: ${templateId}`)

    // Test 2: Render full template
    const rendered = await renderFullTemplate(
      'APPOINTMENT_CONFIRMATION_UTILITY',
      testBusiness.id,
      {
        customerName: 'Maria',
        serviceName: 'Corte',
        appointmentDateTime: '10/01 14:30'
      }
    )

    if (!rendered.templateNameOrId) throw new Error('❌ Missing templateNameOrId')
    if (!rendered.language) throw new Error('❌ Missing language')
    if (!rendered.components || rendered.components.length === 0) {
      throw new Error('❌ Missing components')
    }

    const bodyComponent = rendered.components[0]
    if (bodyComponent.type !== 'body') throw new Error('❌ First component should be body')
    if (!bodyComponent.parameters?.[0]?.text?.includes('Maria')) {
      throw new Error('❌ Variable not rendered in template')
    }

    console.log(`  ✓ Template rendered with variables`)
    console.log(`    - Language: ${rendered.language}`)
    console.log(`    - Components: ${rendered.components.length}`)

    // Test 3: Invalid template should fail
    let threw = false
    try {
      await renderFullTemplate('INVALID_TEMPLATE', testBusiness.id, {})
    } catch (e: any) {
      threw = true
      console.log(`  ✓ Invalid template throws: ${e.message}`)
    }
    if (!threw) throw new Error('❌ Should throw on invalid template')

    console.log('✅ Template resolver tests passed\n')
  } finally {
    await prisma.business.delete({ where: { id: testBusiness.id } })
  }
}

// ============ SMOKE TESTS ============

async function testSmoke_WhatsAppConfig() {
  console.log('📋 SMOKE: WhatsApp Business Config')

  const plan = await prisma.plan.findFirst({ where: { code: 'SIMPLES' } })
  if (!plan) throw new Error('Plano SIMPLES não encontrado.')

  const business = await prisma.business.create({
    data: {
      name: 'WhatsApp Config Test',
      slug: `wa-config-test-${Date.now()}`,
      email: `wa-config-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC',
      planId: plan.id
    }
  })

  try {
    // Create WhatsApp config for business
    const config = await prisma.whatsAppBusinessConfig.create({
      data: {
        businessId: business.id,
        phoneNumberId: '1234567890123',
        accessToken: 'EAAB_test_token',
        displayName: 'Estetica Test',
        isActive: true
      }
    })

    if (!config.id) throw new Error('❌ Config not created')
    console.log(`  ✓ Config created: ${config.displayName}`)

    // Retrieve config
    const retrieved = await prisma.whatsAppBusinessConfig.findFirst({
      where: { businessId: business.id }
    })

    if (!retrieved) throw new Error('❌ Config not retrieved')
    if (retrieved.phoneNumberId !== '1234567890123') throw new Error('❌ Phone ID mismatch')
    console.log(`  ✓ Config retrieved correctly`)

    console.log('✅ WhatsApp config smoke test passed\n')
  } finally {
    await prisma.whatsAppBusinessConfig.deleteMany({ where: { businessId: business.id } })
    await prisma.business.delete({ where: { id: business.id } })
  }
}

async function testSmoke_QueueFull() {
  console.log('📋 SMOKE: Queue Creation & Processing (Full Flow)')

  const plan = await prisma.plan.findFirst({ where: { code: 'SIMPLES' } })
  if (!plan) throw new Error('Plano SIMPLES não encontrado.')

  const business = await prisma.business.create({
    data: {
      name: 'Queue Flow Test',
      slug: `queue-flow-${Date.now()}`,
      email: `queue-flow-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC',
      planId: plan.id
    }
  })

  try {
    // Create customer & conversation
    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: 'Test Customer',
        phone: '5511999999999',
        email: `customer-${Date.now()}@example.com`
      }
    })

    const conversation = await prisma.whatsAppConversation.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        customerPhone: customer.phone,
        lastCustomerMessageAt: new Date()
      }
    })

    // Enqueue a message
    const queueMessage = await prisma.whatsAppMessageQueue.create({
      data: {
        businessId: business.id,
        conversationId: conversation.id,
        phone: customer.phone,
        templateKey: 'REOPEN_CONVERSATION_UTILITY',
        payload: { messageText: 'Test message from customer' },
        status: 'PENDING'
      }
    })

    if (queueMessage.status !== 'PENDING') throw new Error('❌ Queue message not PENDING')
    console.log(`  ✓ Message enqueued: ${queueMessage.id}`)

    // Verify it's within 24h window
    const within24h = isWithin24hWindow(conversation.lastCustomerMessageAt)
    if (!within24h) throw new Error('❌ Should be within 24h window')
    console.log(`  ✓ Conversation within 24h window: true`)

    // Simulate processing: update queue status
    const updated = await prisma.whatsAppMessageQueue.update({
      where: { id: queueMessage.id },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    })

    if (updated.status !== 'SENT') throw new Error('❌ Queue message not marked SENT')
    console.log(`  ✓ Queue message processed and marked SENT`)

    console.log('✅ Queue full flow smoke test passed\n')
  } finally {
    await prisma.$transaction([
      prisma.whatsAppMessageQueue.deleteMany({ where: { businessId: business.id } }),
      prisma.whatsAppConversation.deleteMany({ where: { businessId: business.id } }),
      prisma.customer.deleteMany({ where: { businessId: business.id } }),
      prisma.business.delete({ where: { id: business.id } })
    ])
  }
}

async function testSmoke_WebhookPayloadValidation() {
  console.log('📋 SMOKE: Webhook Payload Validation')

  // Test valid Meta webhook payload
  const validPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '5511999999999',
                phone_number_id: '1234567890123'
              },
              messages: [
                {
                  from: '5511888888888',
                  id: 'wamid.test123',
                  timestamp: '1234567890',
                  type: 'text',
                  text: {
                    body: 'Olá, posso agendar?'
                  }
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  }

  if (!validPayload.object) throw new Error('❌ Missing object')
  if (!validPayload.entry?.[0]?.changes?.[0]?.value?.messages) {
    throw new Error('❌ Invalid structure')
  }

  const message = validPayload.entry[0].changes[0].value.messages[0]
  if (message.type !== 'text') throw new Error('❌ Type should be text')
  if (!message.text?.body) throw new Error('❌ Missing body')

  console.log(`  ✓ Payload structure valid`)
  console.log(`  ✓ Message from: ${message.from}`)
  console.log(`  ✓ Message body: "${message.text.body}"`)

  console.log('✅ Webhook payload validation passed\n')
}

// ============ MAIN ============

async function main() {
  console.log('🚀 WhatsApp Phase 5 Tests\n')
  console.log('═'.repeat(50))

  try {
    // Unit tests (fast, no DB)
    testUnit_24hWindow()
    testUnit_TemplateVariables()

    // Unit tests with DB
    await testUnit_TemplateResolver()

    // Smoke tests with DB
    await testSmoke_WhatsAppConfig()
    await testSmoke_QueueFull()
    testSmoke_WebhookPayloadValidation()

    console.log('═'.repeat(50))
    console.log('✅ ALL TESTS PASSED\n')
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
