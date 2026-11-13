import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (await prisma.user.count()) {
    console.log(
      "Демо-данные уже есть; существующая база оставлена без изменений.",
    );
    return;
  }

  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Укажите DEMO_PASSWORD длиной не менее 12 символов.");
  }

  const group = await prisma.group.create({
    data: { name: "Демо-группа" },
  });
  const subject = await prisma.subject.create({
    data: { name: "Основы программирования" },
  });
  const admin = await prisma.user.create({
    data: {
      name: "Демо-администратор",
      email: "admin@demo.kyndelik.test",
      password,
      role: "admin",
    },
  });
  const teacher = await prisma.user.create({
    data: {
      name: "Демо-преподаватель",
      email: "teacher@demo.kyndelik.test",
      password,
      role: "teacher",
    },
  });
  const student = await prisma.user.create({
    data: {
      name: "Демо-студент",
      email: "student@demo.kyndelik.test",
      password,
      role: "student",
      groupId: group.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: "Понедельник",
      timeSlot: "09:00-10:30",
      groupId: group.id,
      subjectId: subject.id,
      teacherId: teacher.id,
    },
  });
  await prisma.grade.create({
    data: {
      value: 5,
      comment: "Демо-оценка",
      studentId: student.id,
      subjectId: subject.id,
    },
  });
  await prisma.homework.create({
    data: {
      text: "Создайте небольшую программу для демонстрации интерфейса.",
      deadline: "2099-12-31",
      groupId: group.id,
      subjectId: subject.id,
    },
  });

  console.log(
    "Демо-база создана. Пароль аккаунтов задаётся через DEMO_PASSWORD.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
