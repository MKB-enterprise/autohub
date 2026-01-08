import { prisma } from '../lib/db'

async function resetColors() {
  try {
    console.log('🔄 Resetando cores para azul original...')

    const result = await prisma.business.updateMany({
      data: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        backgroundColor: '#F9FAFB',
        textColor: '#1F2937',
        themeMode: 'dark'
      }
    })

    console.log(`✅ ${result.count} empresas atualizadas com sucesso!`)
    console.log('Cores resetadas:')
    console.log('  - Primária: #3B82F6 (azul)')
    console.log('  - Secundária: #1E40AF (azul escuro)')
    console.log('  - Fundo: #F9FAFB')
    console.log('  - Texto: #1F2937')
    console.log('  - Tema: dark')
  } catch (error) {
    console.error('❌ Erro ao resetar cores:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetColors()
