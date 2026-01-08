const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  const rows = await prisma.business.findMany({
    select: { id: true, slug: true, name: true, isActive: true }
  })
  console.log(rows)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
