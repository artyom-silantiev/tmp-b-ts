import { PrismaClient, UserRole } from '@prisma/client';
import * as salthash from '@/lib/salthash';

export default async function (argv) {
  const prisma = new PrismaClient();

  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: salthash.generateSaltHash('password'),
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'Power',
      emailActivatedAt: new Date()
    }
  });

  prisma.$disconnect();
}