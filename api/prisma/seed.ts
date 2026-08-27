import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.upsert({
    where: { email: 'kaua@escola.com' },
    update: {},
    create: { name: 'Kauã Alves', email: 'kaua@escola.com', role: 'TEACHER' },
  });

  const coord = await prisma.user.upsert({
    where: { email: 'coord@escola.com' },
    update: {},
    create: { name: 'Coordenador', email: 'coord@escola.com', role: 'COORDINATOR' },
  });

  const class7A = await prisma.class.create({ data: { name: '7º A' } });
  const class7B = await prisma.class.create({ data: { name: '7º B' } });
  const subject = await prisma.subject.create({ data: { name: 'Pensamento Computacional' } });
  const period = await prisma.period.create({ data: { name: '01/09/2026 - 15/09/2026' } });

  console.log('Seed executado com sucesso!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
