const express = require('express');
const router = express.Router();
const db = require('../store');

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalUsers: db.users.length,
      totalSubjects: db.subjects.length,
      totalClasses: 12,
      activeSessions: 45
    }
  });
});

router.get('/users', (req, res) => {
  res.json({ success: true, users: db.users });
});

router.post('/users', (req, res) => {
  const newUser = { id: db.users.length + 1, ...req.body };
  db.users.push(newUser);
  res.status(201).json({ success: true, user: newUser });
});

router.delete('/users/:id', (req, res) => {
  const index = db.users.findIndex(u => u.id == req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
  const deleted = db.users.splice(index, 1);
  res.json({ success: true, deleted });
});

router.get('/subjects', (req, res) => {
  res.json({ success: true, subjects: db.subjects });
});

router.post('/subjects', (req, res) => {
  const newSubject = { id: db.subjects.length + 1, ...req.body };
  db.subjects.push(newSubject);
  res.status(201).json({ success: true, subject: newSubject });
});

router.get('/schedule', (req, res) => {
  res.json({ success: true, schedules: db.schedules });
});

router.post('/schedule', (req, res) => {
  const newSchedule = { id: db.schedules.length + 1, ...req.body };
  db.schedules.push(newSchedule);
  res.status(201).json({ success: true, schedule: newSchedule });
});

router.get('/reports', (req, res) => {
  res.json({ success: true, reports: db.reports });
});

router.post('/db', (req, res) => {
    try {
        const newData = req.body;
        if (newData) {
            // Обновляем данные в объекте
            Object.assign(db, newData);
            res.json({ success: true, message: 'Данные успешно обновлены' });
        } else {
            res.status(400).json({ error: 'Нет данных для сохранения' });
        }
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
