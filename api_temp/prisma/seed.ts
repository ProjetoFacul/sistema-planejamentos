import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Exemplo de como deve estar o upsert do usuário
  const teacher = await prisma.user.upsert({
    where: { email: "kaua@escola.com" },
    update: {},
    create: {
      name: "Kauã Alves",
      email: "kaua@escola.com",
      role: "TEACHER",
      password: "123" // <-- Adicione a senha aqui
    }
  });

  // Faça o mesmo para a coordenação caso esteja no seed:
  const coord = await prisma.user.upsert({
    where: { email: "coord@colegiovalparaiso.com" },
    update: {},
    create: {
      name: "Coordenação",
      email: "coord@colegiovalparaiso.com",
      role: "COORDINATOR",
      password: "123" // <-- Adicione a senha aqui
    }
  });

  console.log({ teacher, coord });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });