const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  const bs = await prisma.business.findMany({ select: { id: true, slug: true, name: true, isActive: true } })
  console.log(bs)
  await prisma.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
