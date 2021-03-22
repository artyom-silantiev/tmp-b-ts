import { PrismaClient } from '@prisma/client';

export default async function (argv) {
  const prisma = new PrismaClient();

  const countAuthorizationDeleted = await prisma.authorization.deleteMany({
    where: {
      expirationAt: {
        lte: new Date()
      }
    }
  });

  console.log(`${countAuthorizationDeleted.count} authorizations clear`);

  prisma.$disconnect();
}
