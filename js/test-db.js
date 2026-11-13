import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Пробуем получить список пользователей
    const users = await prisma.user.findMany();
    console.log('Подключение успешно! Пользователи:', users);
  } catch (error) {
    console.error('Ошибка при работе с БД:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();