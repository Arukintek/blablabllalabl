function checkAccess(requiredRole) {
    const user = JSON.parse(localStorage.getItem('current_user'));
    if (!user || user.role !== requiredRole) {
        alert('Доступ запрещен! Пожалуйста, войдите в систему.');
        window.location.href = '/login.html';
    }
}

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('current_user');
            window.location.href = '/login.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
  checkAccess('teacher');
  initLogout();

  const groupSelect = document.getElementById('hw-group');
  const modal = document.getElementById('lesson-modal');

  // 1. Загружаем базу данных с бэкенда при открытии страницы
  window.currentDb = await fetchBackendData();
  if (!window.currentDb) return;

  // Заполняем список групп и списки на странице
  renderGroupsDropdown();
  updateLessonsDropdown();
  renderHomeworkList();

  // Смена группы в выпадающем списке
  groupSelect.addEventListener('change', () => {
    updateLessonsDropdown();
  });

  // Открытие/закрытие модального окна добавления темы
  document.getElementById('open-lesson-modal').addEventListener('click', () => {
    modal.style.display = 'flex';
    if (document.getElementById('new-lesson-date')) {
      document.getElementById('new-lesson-date').value = new Date().toISOString().split('T')[0];
    }
  });

  document.getElementById('close-lesson-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Сохранение новой темы урока (расписания) на бэкенд
  document.getElementById('new-lesson-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = window.currentDb;

    let currentGroup = groupSelect.value;
    const groupsList = getUniqueGroups(db);

    if (currentGroup === 'all') {
      currentGroup = groupsList[0];
      if (!currentGroup) {
        alert('Сначала добавьте учебную группу.');
        return;
      }
    }

    const topic = document.getElementById('new-lesson-topic').value;
    const date = document.getElementById('new-lesson-date') ? document.getElementById('new-lesson-date').value : '';

    const newLesson = {
      id: 'l_' + Date.now(),
      group: currentGroup,
      subject: topic,
      date: date,
      day: 'Доп. урок',
      time: '00:00'
    };

    try {
      const response = await fetch('/api/teacher/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLesson)
      });

      // Обновляем локальную базу с сервера
      window.currentDb = await fetchBackendData();

      modal.style.display = 'none';
      document.getElementById('new-lesson-topic').value = '';

      updateLessonsDropdown();

      alert('Новая тема успешно добавлена!');
    } catch (error) {
      console.error('Ошибка сохранения урока:', error);
      alert('Не удалось сохранить тему на сервере.');
    }
  });

  // Публикация домашнего задания на бэкенд
  document.getElementById('hw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = window.currentDb;

    const selectedGroup = groupSelect.value;
    const subjectId = document.getElementById('hw-lesson').value; // ID выбранного предмета из subjects
    const text = document.getElementById('hw-text').value;
    const deadline = document.getElementById('hw-deadline').value;

    if (!subjectId && selectedGroup !== 'all') {
      alert('Пожалуйста, выберите предмет!');
      return;
    }

    const groupsList = getUniqueGroups(db);
    let homeworkPayloads = [];

    if (selectedGroup === 'all') {
      groupsList.forEach(groupName => {
        homeworkPayloads.push({
          id: 'hw_' + Date.now() + '_' + Math.random(),
          group: groupName,
          subjectId: subjectId || null,
          text: text,
          deadline: deadline
        });
      });
    } else {
      homeworkPayloads.push({
        id: 'hw_' + Date.now(),
        group: selectedGroup,
        subjectId: subjectId,
        text: text,
        deadline: deadline
      });
    }

    try {
      for (const hw of homeworkPayloads) {
        const response = await fetch('/api/teacher/homework', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hw)
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || `Ошибка HTTP ${response.status}`);
        }
      }

      const updatedDb = await fetchBackendData();
      if (!updatedDb) return;
      window.currentDb = updatedDb;

      alert('Домашнее задание успешно опубликовано!');
      document.getElementById('hw-text').value = '';
      renderHomeworkList();
    } catch (error) {
      console.error('Ошибка публикации ДЗ:', error);
      alert(error.message || 'Не удалось отправить домашнее задание на сервер.');
    }
  });
});

// Функция запроса данных с бэкенда
async function fetchBackendData() {
  try {
    const res = await fetch('/api/db');
    if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('Ошибка связи с бэкендом:', e);
    alert('Не удалось загрузить данные с сервера.');
    return null;
  }
}

// Получение уникальных групп из пользователей
function getUniqueGroups(db) {
  if (!db || !db.users) return [];
  const students = db.users.filter(u => u.role === 'student');
  return [...new Set(students.map(s => s.group).filter(Boolean))];
}

// Заполнение селекта групп
function renderGroupsDropdown() {
  const db = window.currentDb;
  const groupSelect = document.getElementById('hw-group');
  const groups = getUniqueGroups(db);
  const escape = FuraryDemo.escapeHtml;
  let html = groups.length
    ? `<option value="">Выберите группу</option><option value="all">Все группы</option>${groups.map(g => `<option value="${escape(g)}">${escape(g)}</option>`).join('')}`
    : '<option value="">Нет доступных групп</option>';
  groupSelect.innerHTML = html;
}

// Заполнение выпадающего списка ТОЛЬКО предметами из таблицы subjects
function updateLessonsDropdown() {
  const db = window.currentDb;
  const lessonSelect = document.getElementById('hw-lesson');
  const escape = FuraryDemo.escapeHtml;

  const subjectsList = db.subjects || [];

  if (subjectsList.length === 0) {
    lessonSelect.innerHTML = `<option value="">Нет доступных предметов</option>`;
  } else {
    lessonSelect.innerHTML = subjectsList.map(subj => {
      return `
        <option value="${escape(subj.id)}">${escape(subj.name)}</option>
      `;
    }).join('');
  }
}

// Рендер истории выданных заданий
// Рендер истории выданных заданий с корректным отображением предметов
function renderHomeworkList() {
  const db = window.currentDb || {};
  const container = document.getElementById('hw-list');
  const escape = FuraryDemo.escapeHtml;

  if (!db.homework || db.homework.length === 0) {
    container.innerHTML = '<p style="color: #64748b;">Пока не выдано ни одного домашнего задания.</p>';
    return;
  }

  container.innerHTML = db.homework.slice().reverse().map(hw => {
    const subject = (db.subjects || []).find(s => Number(s.id) === Number(hw.subjectId));
    const subjectName = subject ? subject.name : 'Предмет не указан';

    return `
      <div style="padding: 15px; border: 1px solid #334155; border-radius: 10px; margin-bottom: 12px; background: #0f172a; color: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="background: #0284c7; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem;">Группа: ${escape(hw.group || 'Все')}</span>
          <span style="font-size: 0.85rem; color: #f87171; font-weight: 600;"><i class="fa-regular fa-calendar"></i> Срок сдачи: ${escape(hw.deadline || 'Не указан')}</span>
        </div>
        <p style="font-weight: 600; color: #38bdf8; margin-bottom: 5px;">Предмет: ${escape(subjectName)}</p>
        <p style="color: #cbd5e1; font-size: 0.95rem; white-space: pre-wrap;">${escape(hw.text)}</p>
      </div>
    `;
  }).join('');
}