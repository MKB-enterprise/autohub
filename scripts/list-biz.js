const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;
(async ()=>{
  const rows = await p.business.findMany({select:{id:true,slug:true,name:true,isActive:true}})
  console.log(rows)
  await p.$disconnect()
})();
