document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("teacher");
  initLogout();

  const user = JSON.parse(localStorage.getItem("current_user")) || {};

  // Устанавливаем имя преподавателя в навигацию
  const nameNav = document.getElementById("teacher-name-nav");
  if (nameNav) nameNav.textContent = user.name || "Преподаватель";

  // Загружаем актуальную базу данных с бэкенда
  let db;
  try {
    const res = await fetch("/api/db");
    if (!res.ok) throw new Error("Ошибка загрузки данных");
    db = await res.json();
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    return;
  }

  // Отображаем предмет преподавателя
  const subjectEl = document.getElementById("my-subject");
  if (subjectEl) {
    if (db.subjects && user.subjectId) {
      const subject = db.subjects.find((s) => s.id === user.subjectId);
      subjectEl.textContent = subject ? subject.name : "Не назначен";
    } else {
      subjectEl.textContent = user.subject || "Преподаватель";
    }
  }

  // Заполняем счетчики
  const gradesCountEl = document.getElementById("grades-count");
  const hwCountEl = document.getElementById("hw-count");

  if (gradesCountEl) gradesCountEl.textContent = (db.grades || []).length;
  if (hwCountEl) hwCountEl.textContent = (db.homework || []).length;

  // Заполняем блок последних оценок
  const gradesContainer = document.getElementById("recent-grades");
  if (gradesContainer) {
    const grades = db.grades || [];
    if (grades.length === 0) {
      gradesContainer.innerHTML =
        '<p style="color:#64748b; padding: 15px;">Вы пока не выставили ни одной оценки.</p>';
    } else {
      gradesContainer.innerHTML = grades
        .slice(-5)
        .reverse()
        .map((g) => {
          const student = (db.users || []).find(
            (u) => String(u.id) === String(g.studentId),
          );

          // Безопасно получаем значение оценки независимо от названия поля в базе данных
          const scoreValue =
            g.score !== undefined && g.score !== null
              ? g.score
              : g.value !== undefined && g.value !== null
                ? g.value
                : "-";

          return `
                    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1e293b;">
                        <div>
                            <b style="color: #f8fafc;">${student ? student.name : "Студент"}</b>
                            <div style="font-size:0.85rem; color:#94a3b8;">${g.comment || "Оценка за занятие"}</div>
                        </div>
                        <span class="btn" style="background:#e0f2fe; color:#0284c7; font-weight:700; padding: 4px 10px; border-radius: 6px;">${scoreValue} баллов</span>
                    </div>
                `;
        })
        .join("");
    }
  }
});
