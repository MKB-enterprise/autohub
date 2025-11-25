import { PrismaClient } from '@prisma/client'
import { getAvailableSlots } from '../lib/availability'

const prisma = new PrismaClient()

async function main() {
  // Listar serviços
  const services = await prisma.service.findMany()
  console.log('\n=== SERVIÇOS ===')
  services.forEach(s => console.log(`${s.id} - ${s.name} (${s.durationMinutes}min)`))
  
  // Pegar IDs de Lavagem Completa + Polimento
  const lavagem = services.find(s => s.name === 'Lavagem Completa')
  const polimento = services.find(s => s.name === 'Polimento')
  
  if (lavagem && polimento) {
    console.log('\n=== TESTANDO DISPONIBILIDADE (Lavagem Completa + Polimento = 240min) ===')
    const testDate = new Date(2025, 10, 27, 12, 0, 0)
    console.log('Data:', testDate)
    
    const slots = await getAvailableSlots(testDate, [lavagem.id, polimento.id])
    console.log('Slots disponíveis:', slots.length)
    if (slots.length > 0) {
      console.log('Primeiros slots:', slots.slice(0, 5).map(s => s.toISOString()))
    } else {
      console.log('NENHUM SLOT DISPONÍVEL!')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
