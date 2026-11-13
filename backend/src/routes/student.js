const express = require('express');
const router = express.Router();
const db = require('../store');
const store = require('../store');

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    upcomingClasses: db.schedules.slice(0, 3),
    recentHomework: db.homework.slice(0, 3)
  });
});

router.get('/grades', (req, res) => {
  res.json({ success: true, grades: db.grades });
});

router.get('/homework', (req, res) => {
    const studentGroup = req.query.group || '24ПО р 1.2';
    
    // Возвращаем ДЗ для конкретной группы + общие («Все»)
    const homeworks = store.homework.filter(hw => 
        !hw.group || hw.group === 'Все' || hw.group === studentGroup
    );
    
    res.json({ success: true, homework: homeworks });
});
router.get('/schedule', (req, res) => {
    // Получаем группу студента (например, из query-параметра или сессии/токена)
    // Либо если запрос идет от конкретного студента, можно передавать group через query: /api/student/schedule?group=24ПО р 1.1
    const studentGroup = req.query.group; 

    if (studentGroup) {
        // Фильтруем расписание строго под группу студента
        const filteredSchedule = store.schedules.filter(s => s.group === studentGroup);
        return res.json(filteredSchedule);
    }

    // Если группа не передана, возвращаем общий список (или пустой)
    res.json(store.schedules);
});

router.get('/profile', (req, res) => {
  const student = db.users.find(u => u.role === 'student') || db.users[0];
  res.json({ success: true, profile: student });
});

router.get('/schedule', (req, res) => {
    // Обязательно должно быть .schedules, чтобы отдать именно массив
    res.json(store.schedules); 
});

module.exports = router;