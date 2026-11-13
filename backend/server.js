import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "./src/prisma.js";
import authRoutes from "./src/routes/auth.js";

const app = express();
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

app.use(cors());
app.use(express.json());
app.use("/css", express.static(path.join(projectRoot, "css")));
app.use("/js", express.static(path.join(projectRoot, "js")));
app.use("/admin", express.static(path.join(projectRoot, "admin")));
app.use("/student", express.static(path.join(projectRoot, "student")));
app.use("/teacher", express.static(path.join(projectRoot, "teacher")));
app.get("/", (_req, res) => res.redirect("/login.html"));
app.get("/login.html", (_req, res) =>
  res.sendFile(path.join(projectRoot, "login.html")),
);
app.use("/api/auth", authRoutes);

// 1. Получить список всех пользователей
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        groupId: true,
        group: { select: { id: true, name: true } },
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении пользователей" });
  }
});

// 2. Создать нового пользователя (регистрация)
app.post("/api/users", async (req, res) => {
  try {
    const { email, password, name, role, groupId } = req.body;
    const newUser = await prisma.user.create({
      data: {
        email,
        password, // В реальном проекте не забывайте про хэширование (bcrypt)
        name,
        role,
        groupId: groupId ? Number(groupId) : null,
      },
      select: { id: true, email: true, name: true, role: true, groupId: true },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({
      error: "Не удалось создать пользователя (возможно, email уже занят)",
    });
  }
});

// Эндпоинт расписания для конкретной группы
app.get("/api/schedule/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const schedules = await prisma.schedule.findMany({
      where: { groupId: Number(groupId) },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении расписания" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер Kyndelik 3 запущен на порту ${PORT}`);
});

app.get("/api/db", async (req, res) => {
  try {
    const groups = await prisma.group.findMany();
    const subjects = await prisma.subject.findMany(); // <--- Добавили получение предметов
    const users = await prisma.user.findMany({
      include: { group: true },
    });
    const schedules = await prisma.schedule.findMany({
      include: { group: true, subject: true, teacher: true },
    });
    const grades = await prisma.grade.findMany();

    const homework = await prisma.homework.findMany({
      include: { group: true, subject: true },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      group: u.group ? u.group.name : "",
    }));

    const formattedSchedules = schedules.map((s) => ({
      id: s.id,
      day: s.dayOfWeek,
      time: s.timeSlot,
      group: s.group ? s.group.name : "",
      groupId: s.groupId,
      subject: s.subject ? s.subject.name : "",
      subjectId: s.subjectId,
    }));

    const formattedHomework = homework.map((hw) => ({
      id: hw.id,
      text: hw.text,
      deadline: hw.deadline,
      group: hw.group ? hw.group.name : "Все",
      subjectId: hw.subjectId, // <--- Передаем ID предмета
    }));

    res.json({
      groups: groups.map((g) => g.name),
      subjects: subjects, // <--- Передаем чистый массив subjects на фронтенд
      users: formattedUsers,
      schedules: formattedSchedules,
      grades: grades,
      homework: formattedHomework,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// 1. Получить список всех предметов
app.get("/api/subjects", async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany();
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении предметов" });
  }
});

// 2. Создать новый предмет в PostgreSQL
app.post("/api/subjects", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ error: "Название предмета обязательно" });

    const newSubject = await prisma.subject.create({
      data: { name },
    });
    res.status(201).json(newSubject);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Не удалось создать предмет" });
  }
});

// Удаление предмета и связанных с ним уроков из PostgreSQL
app.delete("/api/subjects/:id", async (req, res) => {
  try {
    const subjectId = Number(req.params.id);

    await prisma.schedule.deleteMany({
      where: { subjectId: subjectId },
    });

    await prisma.subject.delete({
      where: { id: subjectId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка при удалении предмета:", error);
    res.status(500).json({ error: error.message });
  }
});

// Эндпоинт для получения данных отчета администратора
// Эндпоинт для получения данных отчета администратора
app.get("/api/admin/report", async (req, res) => {
  try {
    const groups = await prisma.group.findMany();
    const users = await prisma.user.findMany({
      include: { group: true },
    });
    const schedules = await prisma.schedule.findMany({
      include: { subject: true, group: true, teacher: true },
    });
    const grades = await prisma.grade.findMany();

    res.json({
      groups: groups.map((g) => g.name),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role.toLowerCase(),
        group: u.group ? u.group.name : null,
        groupId: u.groupId,
      })),
      schedules: schedules.map((s) => ({
        id: s.id,
        day: s.dayOfWeek,
        time: s.timeSlot,
        subject: s.subject ? s.subject.name : "",
        subjectId: s.subjectId,
        group: s.group ? s.group.name : "",
        groupId: s.groupId,
        room: s.room,
      })),
      grades: grades.map((g) => ({
        id: g.id,
        studentId: g.studentId,
        lessonId: g.lessonId,
        score: g.value, // <--- ИСПРАВЛЕНО: было g.score (а в БД поле называется value)
        value: g.value, // Дублируем для полной надежности фронтенда
        attendance: g.attendance,
        comment: g.comment,
      })),
    });
  } catch (error) {
    console.error("Ошибка при формировании отчета:", error);
    res.status(500).json({ error: "Ошибка сервера при загрузке отчета" });
  }
});

// Получить оценки конкретного студента
app.get("/api/grades/:studentId", async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const grades = await prisma.grade.findMany({
      where: { studentId: studentId },
      include: { subject: true },
      orderBy: { date: "desc" },
    });
    res.json(grades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка сервера при получении оценок" });
  }
});

app.post("/api/teacher/grades", async (req, res) => {
  try {
    const { studentId, subjectId, date, score, comment } = req.body;

    const grade = await prisma.grade.create({
      data: {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        value:
          score !== null && score !== undefined && score !== ""
            ? Number(score)
            : 0,
        comment: comment || "",
        // поле attendance удалено, так как его нет в модели Prisma
      },
    });

    res.json({ success: true, grade });
  } catch (error) {
    console.error("Ошибка при сохранении оценки:", error);
    res
      .status(500)
      .json({ success: false, error: "Ошибка сервера при сохранении оценки" });
  }
});

// Сохранение новой темы / расписания
app.post("/api/teacher/schedule", async (req, res) => {
  try {
    const { group, subject, date, day, time } = req.body;

    // Ищем группу по имени или по ID
    let groupRecord = null;
    if (group) {
      if (!isNaN(group)) {
        groupRecord = await prisma.group.findUnique({
          where: { id: Number(group) },
        });
      } else {
        groupRecord = await prisma.group.findFirst({ where: { name: group } });
      }
    }

    // Если группа не найдена, берем первую попавшуюся из базы
    if (!groupRecord) {
      groupRecord = await prisma.group.findFirst();
      if (!groupRecord) {
        return res.status(400).json({
          success: false,
          error: "В базе данных не найдено ни одной группы!",
        });
      }
    }

    // Обработка предмета: ищем по ID или по имени (если новое — создаем)
    let subjectRecord = null;
    if (subject) {
      if (!isNaN(subject)) {
        subjectRecord = await prisma.subject.findUnique({
          where: { id: Number(subject) },
        });
      } else {
        subjectRecord = await prisma.subject.findFirst({
          where: { name: subject },
        });
        if (!subjectRecord) {
          subjectRecord = await prisma.subject.create({
            data: { name: subject },
          });
        }
      }
    }

    if (!subjectRecord) {
      return res
        .status(400)
        .json({ success: false, error: "Не указан предмет для расписания" });
    }

    // Находим преподавателя для обязательной связи (ищем с ролью teacher или берем первого пользователя)
    let teacherRecord = await prisma.user.findFirst({
      where: {
        OR: [{ role: "teacher" }, { role: "TEACHER" }, { role: "Teacher" }],
      },
    });

    if (!teacherRecord) {
      teacherRecord = await prisma.user.findFirst(); // крайний случай: берем любого пользователя
    }

    if (!teacherRecord) {
      return res.status(400).json({
        success: false,
        error:
          "В системе нет ни одного пользователя, которого можно назначить преподавателем",
      });
    }

    // Создаем расписание, обязательно включая connect для группы, предмета и учителя
    const newSchedule = await prisma.schedule.create({
      data: {
        dayOfWeek: day || "Понедельник",
        timeSlot: time || "00:00",
        group: {
          connect: { id: groupRecord.id },
        },
        subject: {
          connect: { id: subjectRecord.id },
        },
        teacher: {
          connect: { id: teacherRecord.id },
        },
      },
    });

    res.json({ success: true, schedule: newSchedule });
  } catch (error) {
    console.error("Ошибка при сохранении расписания:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Сохранение домашнего задания
app.post("/api/teacher/homework", async (req, res) => {
  try {
    const { group, subjectId, text, deadline } = req.body;

    let groupId = null;
    if (group && group !== "all" && group !== "Все") {
      const groupRecord = await prisma.group.findFirst({
        where: { name: group },
      });
      if (groupRecord) groupId = groupRecord.id;
    }

    const homework = await prisma.homework.create({
      data: {
        text,
        deadline,
        groupId: groupId, // если null, значит задание для всех групп
        subjectId: subjectId ? Number(subjectId) : null,
      },
    });

    res.json({ success: true, homework });
  } catch (error) {
    console.error("Ошибка при сохранении ДЗ:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Удаление пользователя по ID
app.delete("/api/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    // Перед удалением пользователя можно при необходимости очистить/удалить связанные оценки или зависимости,
    // либо настроить onDelete: Cascade в схеме Prisma.
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ success: true, message: "Пользователь успешно удален" });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({ error: "Не удалось удалить пользователя" });
  }
});
