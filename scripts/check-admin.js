const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const admins = await prisma.customer.findMany({
    where: {
      email: {
        contains: 'admin'
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      businessId: true
    }
  })

  console.log('Usuários com "admin" no email:')
  console.log(JSON.stringify(admins, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
