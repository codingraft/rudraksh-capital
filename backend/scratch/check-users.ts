import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      username: true,
      role: true,
      name: true
    }
  });
  console.log('Current Users in Database:');
  console.table(users);
  await prisma.$disconnect();
}

checkUsers().catch(console.error);
