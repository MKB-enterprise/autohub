const { prisma } = require('./lib/db')
;(async () => {
  const bs = await prisma.business.findMany({
    select: { id: true, slug: true, name: true, isActive: true }
  })
  console.log(bs)
  await prisma.$disconnect()
})()
