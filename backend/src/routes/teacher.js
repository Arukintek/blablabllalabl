const express = require('express');
const router = express.Router();
const store = require('../store');
const db = store; // синоним для удобства

// Дашборд преподавателя
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    classesToday: db.schedules,
    pendingHomeworkReviews: db.homework.length
  });
});

// Получить данные журнала
router.get('/journal', (req, res) => {
    res.json({ grades: db.grades, students: db.users.filter(u => u.role === 'student') });
});

// Получить список уроков (расписание)
router.get('/lessons', (req, res) => {
    res.json(store.schedules || []);
});

// Профиль преподавателя
router.get('/profile', (req, res) => {
  const teacher = db.users.find(u => u.role === 'teacher') || db.users[1];
  res.json({ success: true, profile: teacher });
});

// Получить список домашний заданий
router.get('/homework', (req, res) => {
  res.json({ success: true, homework: db.homework });
});

// --- ЕДИНЫЙ ПРАВИЛЬНЫЙ ОБРАБОТЧИК СОХРАНЕНИЯ ОЦЕНКИ ---
router.post('/grades', (req, res) => {
    const { studentId, lessonId, score, attendance, comment } = req.body;

    if (!studentId || !lessonId) {
        return res.status(400).json({ success: false, message: 'Не указан студент или урок' });
    }

    // Проверяем, есть ли уже оценка для этого студента по этому уроку, чтобы обновлять, а не плодить дубли
    const existingIndex = db.grades.findIndex(g => g.studentId === studentId && g.lessonId === lessonId);

    const gradeData = {
        id: existingIndex !== -1 ? db.grades[existingIndex].id : 'g_' + Date.now(),
        studentId,
        lessonId,
        score: score !== '' && score !== null ? Number(score) : null,
        attendance: attendance || 'p',
        comment: comment || ''
    };

    if (existingIndex !== -1) {
        db.grades[existingIndex] = gradeData;
    } else {
        db.grades.push(gradeData);
    }

    res.json({ success: true, grade: gradeData });
});

// --- ЕДИНЫЙ ПРАВИЛЬНЫЙ ОБРАБОТЧИК ДОБАВЛЕНИЯ ДЗ ---
router.post('/homework', (req, res) => {
    const { id, group, lessonId, text, deadline } = req.body;

    const newHomework = {
        id: id || 'hw_' + Date.now(),
        group,
        lessonId: lessonId || null,
        text,
        deadline
    };

    db.homework.push(newHomework);
    res.status(201).json({ success: true, homework: newHomework });
});

module.exports = router;