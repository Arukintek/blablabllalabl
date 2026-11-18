import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "./src/prisma.js";
import authRoutes, { requireAuth } from "./src/routes/auth.js";

const app = express();
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && !configuredOrigins?.length) {
  throw new Error("CORS_ORIGIN must be configured with the production frontend origin(s).");
}

const allowedOrigins = new Set(
  (configuredOrigins?.length
    ? configuredOrigins
    : [
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
      ]
  ).map((origin) => {
    let parsedOrigin;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid origin in CORS_ORIGIN: ${origin}`);
    }

    if (
      parsedOrigin.origin !== origin ||
      parsedOrigin.username ||
      parsedOrigin.password ||
      (isProduction && parsedOrigin.protocol !== "https:")
    ) {
      throw new Error(`CORS_ORIGIN entries must be exact origins${isProduction ? " using HTTPS" : ""}.`);
    }

    return parsedOrigin.origin;
  }),
);

app.use((req, res, next) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  res.setHeader("X-Request-Id", requestId);

  if (isProduction && req.secure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }

  res.on("finish", () => {
    console.info(
      JSON.stringify({
        event: "http_request",
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });

  next();
});

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Слишком много попыток входа. Попробуйте позже." },
    skipSuccessfulRequests: false,
  }),
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.path !== "/api/auth/login") {
    const incomingOrigin = req.headers.origin || req.headers.referer;

    if (!incomingOrigin) {
      return res.status(403).json({ success: false, message: "Запрос без Origin/Referer запрещен" });
    }

    let originUrl = null;
    try {
      originUrl = new URL(incomingOrigin).origin;
    } catch {
      originUrl = incomingOrigin.replace(/\/$/, "");
    }

    if (!allowedOrigins.has(originUrl)) {
      return res.status(403).json({ success: false, message: "Недопустимый источник запроса" });
    }
  }

  return next();
});

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
app.get("/api/users", requireAuth(["admin"]), async (req, res) => {
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
app.post("/api/users", requireAuth(["admin"]), async (req, res) => {
  try {
    const { email, password, name, role, groupId } = req.body || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const safePassword = typeof password === "string" ? password : "";
    const allowedRoles = new Set(["student", "teacher", "admin"]);

    if (!normalizedEmail || !safePassword || !normalizedName) {
      return res.status(400).json({ error: "Email, имя и пароль обязательны" });
    }

    if (!allowedRoles.has(String(role || "student").toLowerCase())) {
      return res.status(400).json({ error: "Некорректная роль пользователя" });
    }

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: await bcrypt.hash(safePassword, 12),
        name: normalizedName,
        role: String(role || "student").toLowerCase(),
        groupId: groupId ? Number(groupId) : null,
      },
      select: { id: true, email: true, name: true, role: true, groupId: true },
    });
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Ошибка создания пользователя:", error);
    return res.status(400).json({
      error: "Не удалось создать пользователя (возможно, email уже занят)",
    });
  }
});

// Эндпоинт расписания для конкретной группы
app.get("/api/schedule/:groupId", requireAuth(["student", "teacher", "admin"]), async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const currentUser = req.user;

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ error: "Некорректный ID группы" });
    }

    if (currentUser.role.toLowerCase() === "student") {
      const currentUserRecord = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { groupId: true },
      });

      if (currentUserRecord?.groupId !== groupId) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: { groupId },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return res.json(schedules);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка при получении расписания" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер Kyndelik 3 запущен на порту ${PORT}`);
});

app.get("/api/db", requireAuth(["admin"]), async (req, res) => {
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
      groupId: u.groupId,
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
      groupId: hw.groupId,
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
app.get("/api/subjects", requireAuth(["admin", "teacher"]), async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany();
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении предметов" });
  }
});

// 2. Создать новый предмет в PostgreSQL
app.post("/api/subjects", requireAuth(["admin"]), async (req, res) => {
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
app.delete("/api/subjects/:id", requireAuth(["admin"]), async (req, res) => {
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
app.get("/api/admin/report", requireAuth(["admin"]), async (req, res) => {
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
app.get("/api/grades/:studentId", requireAuth(["student", "teacher", "admin"]), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const currentUser = req.user;

    if (currentUser.role.toLowerCase() === "student" && currentUser.id !== studentId) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    const grades = await prisma.grade.findMany({
      where: { studentId: studentId },
      include: { subject: true },
      orderBy: { date: "desc" },
    });
    return res.json(grades);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка сервера при получении оценок" });
  }
});

app.post("/api/teacher/grades", requireAuth(["teacher", "admin"]), async (req, res) => {
  try {
    const { studentId, subjectId, score, comment } = req.body || {};
    const parsedStudentId = Number(studentId);
    const parsedSubjectId = Number(subjectId);
    const parsedScore = score === null || score === undefined || score === "" ? 0 : Number(score);

    if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
      return res.status(400).json({ success: false, error: "Некорректный studentId" });
    }

    if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
      return res.status(400).json({ success: false, error: "Некорректный subjectId" });
    }

    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return res.status(400).json({ success: false, error: "Оценка должна быть числом от 0 до 100" });
    }

    const grade = await prisma.grade.create({
      data: {
        studentId: parsedStudentId,
        subjectId: parsedSubjectId,
        value: parsedScore,
        comment: typeof comment === "string" ? comment.slice(0, 500) : "",
      },
    });

    return res.json({ success: true, grade });
  } catch (error) {
    console.error("Ошибка при сохранении оценки:", error);
    return res
      .status(500)
      .json({ success: false, error: "Ошибка сервера при сохранении оценки" });
  }
});

// Сохранение новой темы / расписания
app.post("/api/teacher/schedule", requireAuth(["teacher", "admin"]), async (req, res) => {
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
app.post("/api/teacher/homework", requireAuth(["teacher", "admin"]), async (req, res) => {
  try {
    const { group, subjectId, text, deadline } = req.body || {};
    let groupId = null;
    const groupValue = group == null ? "" : String(group).trim();
    const isAllGroups = !groupValue || ["all", "все"].includes(groupValue.toLowerCase());
    if (!isAllGroups) {
      let groupRecord = await prisma.group.findFirst({
        where: { name: groupValue },
      });
      if (!groupRecord && /^\d+$/.test(groupValue)) {
        groupRecord = await prisma.group.findUnique({
          where: { id: Number(groupValue) },
        });
      }
      if (!groupRecord) {
        return res.status(400).json({ success: false, error: "Учебная группа не найдена" });
      }
      groupId = groupRecord.id;
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Текст домашнего задания обязателен" });
    }

    const homework = await prisma.homework.create({
      data: {
        text: text.trim().slice(0, 2000),
        deadline: typeof deadline === "string" ? deadline.slice(0, 100) : null,
        groupId: groupId,
        subjectId: subjectId ? Number(subjectId) : null,
      },
    });

    return res.json({ success: true, homework });
  } catch (error) {
    console.error("Ошибка при сохранении ДЗ:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Удаление пользователя по ID
app.delete("/api/users/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Некорректный ID пользователя" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.json({ success: true, message: "Пользователь успешно удален" });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    return res.status(500).json({ error: "Не удалось удалить пользователя" });
  }
});
