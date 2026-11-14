document.addEventListener('DOMContentLoaded', async () => {
    checkAccess('admin');
    initLogout();

    let db;
    try {
        const res = await fetch('/api/db');
        if (!res.ok) throw new Error('Ошибка загрузки данных');
        db = await res.json();
    } catch (e) {
        console.error('Ошибка связи с бэкендом:', e);
        return;
    }

    // Динамически заполняем селект групп
    const groupSelect = document.getElementById('lesson-group');
    if (groupSelect && db.groups) {
        const groups = db.groups;
        groupSelect.innerHTML = `
            ${groups.length
                ? `<option value="all">Все группы</option>${groups.map(g => `<option value="${g}">${g}</option>`).join('')}`
                : '<option value="">Нет доступных групп</option>'}
        `;
    }

    const form = document.getElementById('lesson-form');
    if (form) {
        // Добавим селект дня недели программно, если его нет в HTML
        const topicInput = document.getElementById('lesson-topic');
        if (topicInput && !document.getElementById('lesson-day-select')) {
            const dayContainer = document.createElement('div');
            dayContainer.style.marginBottom = '15px';
            dayContainer.innerHTML = `
                <label style="display: block; margin-bottom: 5px; color: #94a3b8; font-size: 0.9rem;">День недели</label>
                <select id="lesson-day-select" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px;">
                    <option value="Понедельник">Понедельник</option>
                    <option value="Вторник">Вторник</option>
                    <option value="Среда">Среда</option>
                    <option value="Четверг">Четверг</option>
                    <option value="Пятница">Пятница</option>
                </select>
            `;
            topicInput.parentNode.insertBefore(dayContainer, topicInput);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const groupChoice = document.getElementById('lesson-group').value;
            const topic = document.getElementById('lesson-topic').value.trim();
            const timeVal = document.getElementById('lesson-time').value.trim(); // Время урока (например, "9:00")
            const daySelectEl = document.getElementById('lesson-day-select');
            const dayOfWeek = daySelectEl ? daySelectEl.value : 'Понедельник';

            if (!topic || !timeVal) return;

            const groupsToProcess = groupChoice === 'all'
                ? db.groups
                : (groupChoice ? [groupChoice] : []);
            if (groupsToProcess.length === 0) {
                alert('Сначала добавьте учебную группу.');
                return;
            }

            let hasError = false;

            // Отправляем каждый урок на правильный эндпоинт бэкенда через Prisma
            for (const groupName of groupsToProcess) {
                try {
                    const saveRes = await fetch('/api/teacher/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            group: groupName,
                            subject: topic,
                            day: dayOfWeek,
                            time: timeVal
                        })
                    });
                    if (!saveRes.ok) throw new Error('Ошибка сохранения');
                } catch (err) {
                    console.error('Не удалось сохранить урок для группы ' + groupName, err);
                    hasError = true;
                }
            }

            if (!hasError) {
                if (groupChoice === 'all') {
                    alert('Уроки успешно добавлены сразу для всех групп!');
                } else {
                    alert('Урок успешно добавлен для группы ' + groupChoice + '!');
                }
                document.getElementById('lesson-topic').value = '';
                document.getElementById('lesson-time').value = '';
            } else {
                alert('Произошла ошибка при сохранении некоторых уроков.');
            }
        });
    }
});