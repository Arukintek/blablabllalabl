import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Очистка старых данных перед заполнением
  await prisma.grade.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.group.deleteMany();

  console.log("🌱 Вычистил гoвнo");

  // 1. Создание групп
  const group1 = await prisma.group.create({
    data: { name: "24ПО-п1.1" },
  });

  const group2 = await prisma.group.create({
    data: { name: "24ПО-р1.2" },
  });

  // 2. Создание администратора и преподавателей
  const adminUser = await prisma.user.create({
    data: {
      name: "Администратор",
      email: "admin@college.edu",
      password: "password123",
      role: "admin",
    },
  });

  const teacherMerkushev = await prisma.user.create({
    data: {
      name: "Меркушев Р.В.",
      email: "merkushev.rv@college.edu",
      password: "password123",
      role: "teacher",
    },
  });

  const teacherMkrtchyan = await prisma.user.create({
    data: {
      name: "Мкртчян А.",
      email: "mkrtchyan.a@college.edu",
      password: "password123",
      role: "teacher",
    },
  });

  const teacherSemyk = await prisma.user.create({
    data: {
      name: "Сёмик К.Д.",
      email: "semyk.kd@college.edu",
      password: "password123",
      role: "teacher",
    },
  });

  // 3. Создание предметов
  const subject1 = await prisma.subject.create({
    data: { name: "Профессиональный иностранный язык" },
  });

  const subject2 = await prisma.subject.create({
    data: {
      name: "Использовать методы, приемы формализации и алгоритмизации задач программного кода программного обеспечения",
    },
  });

  const subject3 = await prisma.subject.create({
    data: {
      name: "Разрабатывать программный код программного обеспечения по готовым спецификациям требований к программному обеспечению",
    },
  });

  const subject4 = await prisma.subject.create({
    data: {
      name: "Осуществлять отладку программного кода программного обеспечения на уровне программных модулей",
    },
  });

  const subject5 = await prisma.subject.create({
    data: { name: "Читать цифровые и аналоговые схемы" },
  });

  const subject6 = await prisma.subject.create({
    data: {
      name: "Укреплять здоровье и соблюдать принципы здорового образа жизни",
    },
  });

  const subject7 = await prisma.subject.create({
    data: { name: "Писать программное обеспечение для микроконтроллеров" },
  });

  // 4. Добавление студентов группы 24ПО-п1.1 (роль: 'student')
  const studentsGroup1 = [
    "Абигали Альтаир Ринатович",
    "Аманбаев Мансур Асланович",
    "Арашина Алина Денисовна",
    "Артамонов Арсений Вадимович",
    "Баринов Никита Андреевич",
    "Богомольцев Даниил Алексеевич",
    "Вязигин Влас Александрович",
    "Ежикенева Алина Дамировна",
    "Казанская Вероника Алексеевна",
    "Каськов Богдан Андреевич",
    "Кененбай Зарина Аскергазыкызы",
    "Калибек Мади Сымбатович",
    "Лопатько Илья Олегович",
    "Мамичева Елизавета Андреевна",
    "Махнев Эрик Львович",
    "Ракишева Наргиз Жармухамедовна",
    "Сабырбаев Рамиль Русланович",
    "Садыков Тимур Ерболатович",
    "Смаилов Эльдар Эрикулы",
    "Шамов Артём Олегович",
  ];

  for (let i = 0; i < studentsGroup1.length; i++) {
    const fullName = studentsGroup1[i];
    await prisma.user.create({
      data: {
        name: fullName,
        email: `student1_${i + 1}@college.edu`,
        password: "password123",
        role: "student",
        groupId: group1.id,
      },
    });
  }

  // 5. Добавление студентов группы 24ПО-р1.2 (роль: 'student')
  const studentsGroup2 = [
    "Ануар Алимхан",
    "Барханский Константин",
    "Вяткин Никита",
    "Звонцов Данил",
    "Ивенко Ярослав",
    "Кибновский Герман",
    "Кравцова Анна",
    "Москаленко Юлия",
    "Попов Жан",
    "Стрильбицкий Илья",
    "Сыдыков Арсен",
    "Тикунов Вячеслав",
    "Тулегенова Жанель",
    "Турсунгалиев Алижан",
    "Шмакова Виктория",
    "Короткова Виктория",
  ];

  for (let i = 0; i < studentsGroup2.length; i++) {
    const fullName = studentsGroup2[i];
    await prisma.user.create({
      data: {
        name: fullName,
        email: `student2_${i + 1}@college.edu`,
        password: "password123",
        role: "student",
        groupId: group2.id,
      },
    });
  }

  // 6. Добавление расписания занятий для группы 24ПО-п1.1
  await prisma.schedule.createMany({
    data: [
      // Понедельник
      {
        dayOfWeek: "Понедельник",
        timeSlot: "11.10-12.30",
        groupId: group1.id,
        subjectId: subject1.id,
        teacherId: teacherMkrtchyan.id,
      },
      {
        dayOfWeek: "Понедельник",
        timeSlot: "12.40-14.00",
        groupId: group1.id,
        subjectId: subject2.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Понедельник",
        timeSlot: "14.10-15.30",
        groupId: group1.id,
        subjectId: subject3.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Понедельник",
        timeSlot: "15.40-17.00",
        groupId: group1.id,
        subjectId: subject4.id,
        teacherId: teacherMerkushev.id,
      },

      // Вторник
      {
        dayOfWeek: "Вторник",
        timeSlot: "12.40-14.00",
        groupId: group1.id,
        subjectId: subject2.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Вторник",
        timeSlot: "14.10-15.30",
        groupId: group1.id,
        subjectId: subject3.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Вторник",
        timeSlot: "15.40-17.00",
        groupId: group1.id,
        subjectId: subject4.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Вторник",
        timeSlot: "17.10-18.30",
        groupId: group1.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },

      // Среда
      {
        dayOfWeek: "Среда",
        timeSlot: "11.10-12.30",
        groupId: group1.id,
        subjectId: subject6.id,
        teacherId: teacherSemyk.id,
      },
      {
        dayOfWeek: "Среда",
        timeSlot: "12.40-14.010",
        groupId: group1.id,
        subjectId: subject2.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Среда",
        timeSlot: "14.10-15.30",
        groupId: group1.id,
        subjectId: subject3.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Среда",
        timeSlot: "15.40-17.00",
        groupId: group1.id,
        subjectId: subject4.id,
        teacherId: teacherMerkushev.id,
      },

      // Четверг
      {
        dayOfWeek: "Четверг",
        timeSlot: "11.10-12.30",
        groupId: group1.id,
        subjectId: subject1.id,
        teacherId: teacherMkrtchyan.id,
      },
      {
        dayOfWeek: "Четверг",
        timeSlot: "12.40-14.010",
        groupId: group1.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Четверг",
        timeSlot: "14.10-15.30",
        groupId: group1.id,
        subjectId: subject7.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Четверг",
        timeSlot: "15.40-17.00",
        groupId: group1.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },

      // Пятница
      {
        dayOfWeek: "Пятница",
        timeSlot: "11.10-12.30",
        groupId: group1.id,
        subjectId: subject6.id,
        teacherId: teacherSemyk.id,
      },
      {
        dayOfWeek: "Пятница",
        timeSlot: "12.40-14.010",
        groupId: group1.id,
        subjectId: subject7.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Пятница",
        timeSlot: "14.10-15.30",
        groupId: group1.id,
        subjectId: subject7.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Пятница",
        timeSlot: "15.40-17.00",
        groupId: group1.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },
    ],
  });

  // 7. Добавление расписания занятий для группы 24ПО-р1.2
  await prisma.schedule.createMany({
    data: [
      // Понедельник
      {
        dayOfWeek: "Понедельник",
        timeSlot: "11.10-12.30",
        groupId: group2.id,
        subjectId: subject1.id,
        teacherId: teacherMkrtchyan.id,
      },
      {
        dayOfWeek: "Понедельник",
        timeSlot: "12.40-14.00",
        groupId: group2.id,
        subjectId: subject2.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Понедельник",
        timeSlot: "14.10-15.30",
        groupId: group2.id,
        subjectId: subject3.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Понедельник",
        timeSlot: "15.40-17.00",
        groupId: group2.id,
        subjectId: subject4.id,
        teacherId: teacherMerkushev.id,
      },

      // Вторник
      {
        dayOfWeek: "Вторник",
        timeSlot: "12.40-14.00",
        groupId: group2.id,
        subjectId: subject2.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Вторник",
        timeSlot: "14.10-15.30",
        groupId: group2.id,
        subjectId: subject3.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Вторник",
        timeSlot: "15.40-17.00",
        groupId: group2.id,
        subjectId: subject4.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Вторник",
        timeSlot: "17.10-18.30",
        groupId: group2.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },

      // Среда
      {
        dayOfWeek: "Среда",
        timeSlot: "11.10-12.30",
        groupId: group2.id,
        subjectId: subject6.id,
        teacherId: teacherSemyk.id,
      },
      {
        dayOfWeek: "Среда",
        timeSlot: "12.40-14.010",
        groupId: group2.id,
        subjectId: subject2.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Среда",
        timeSlot: "14.10-15.30",
        groupId: group2.id,
        subjectId: subject3.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Среда",
        timeSlot: "15.40-17.00",
        groupId: group2.id,
        subjectId: subject4.id,
        teacherId: teacherMerkushev.id,
      },

      // Четверг
      {
        dayOfWeek: "Четверг",
        timeSlot: "11.10-12.30",
        groupId: group2.id,
        subjectId: subject1.id,
        teacherId: teacherMkrtchyan.id,
      },
      {
        dayOfWeek: "Четверг",
        timeSlot: "12.40-14.010",
        groupId: group2.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Четверг",
        timeSlot: "14.10-15.30",
        groupId: group2.id,
        subjectId: subject7.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Четверг",
        timeSlot: "15.40-17.00",
        groupId: group2.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },

      // Пятница
      {
        dayOfWeek: "Пятница",
        timeSlot: "11.10-12.30",
        groupId: group2.id,
        subjectId: subject6.id,
        teacherId: teacherSemyk.id,
      },
      {
        dayOfWeek: "Пятница",
        timeSlot: "12.40-14.010",
        groupId: group2.id,
        subjectId: subject7.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Пятница",
        timeSlot: "14.10-15.30",
        groupId: group2.id,
        subjectId: subject7.id,
        teacherId: teacherMerkushev.id,
      },
      {
        dayOfWeek: "Пятница",
        timeSlot: "15.40-17.00",
        groupId: group2.id,
        subjectId: subject5.id,
        teacherId: teacherMerkushev.id,
      },
    ],
  });

  console.log("✅ База данных успешно заполнена Хуесoс))");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
