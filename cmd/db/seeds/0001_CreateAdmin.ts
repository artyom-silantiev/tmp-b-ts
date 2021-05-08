import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from '@/lib/bcrypt';

export default async function (argv) {
  const prisma = new PrismaClient();

  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.generatePasswordHash('password'),
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'Power',
      emailActivatedAt: new Date()
    }
  });

  prisma.$disconnect();
}