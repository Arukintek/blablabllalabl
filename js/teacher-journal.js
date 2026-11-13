document.addEventListener("DOMContentLoaded", async () => {
  if (typeof checkAccess === "function") checkAccess("teacher");
  if (typeof initLogout === "function") initLogout();

  // 1. Загружаем всю базу данных с бэкенда при открытии страницы
  window.currentDb = await fetchBackendData();
  if (!window.currentDb) return;

  // Устанавливаем текущую дату в формате YYYY-MM-DD для стандартного input type="date"
  const dateInput = document.getElementById("lesson-date-input");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  const groupSelect = document.getElementById("filter-group");

  // Инициализация таблицы и формы
  renderJournalMatrix();
  updateFormSelects();

  // Слушатель смены группы в фильтре
  groupSelect.addEventListener("change", () => {
    renderJournalMatrix();
    updateFormSelects();
  });

  // Обработка формы выставления оценки
  document
    .getElementById("journal-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const studentId = document.getElementById("student-select").value;
      const subjectId = document.getElementById("lesson-select").value; // ID предмета из subjects
      const lessonDate = document.getElementById("lesson-date-input").value; // Выбранная дата из календаря
      const scoreVal = document.getElementById("score-input").value;
      const attendanceVal = document.getElementById("attendance-select").value;
      const commentVal = document.getElementById("comment-input").value;

      // Формируем данные под требования бэкенда
      const gradeData = {
        studentId: Number(studentId),
        subjectId: Number(subjectId), // Передаем ID предмета
        date: lessonDate, // Передаем дату (например, 2026-11-06)
        score: scoreVal !== "" ? Number(scoreVal) : null,
        attendance: attendanceVal,
        comment: commentVal,
      };

      try {
        // Отправляем оценку на бэкенд
        const response = await fetch("/api/teacher/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gradeData),
        });

        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Ошибка сохранения");

        // Перезагружаем актуальные данные с сервера
        window.currentDb = await fetchBackendData();

        alert("Оценка успешно сохранена на сервере!");

        // Перерисовываем матрицу и очищаем поле оценки/комментария
        renderJournalMatrix();
        document.getElementById("score-input").value = "";
        document.getElementById("comment-input").value = "";
      } catch (error) {
        console.error("Ошибка при сохранении оценки:", error);
        alert("Не удалось сохранить оценку на сервере.");
      }
    });
});

// Функция запроса данных с бэкенда
async function fetchBackendData() {
  try {
    const res = await fetch("/api/db");
    if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    alert("Не удалось загрузить данные с сервера.");
    return null;
  }
}

function renderJournalMatrix() {
  const db = window.currentDb;
  if (!db) return;

  const selectedGroup = document.getElementById("filter-group").value;

  const students = (db.users || []).filter(
    (u) => u.role === "student" && u.group === selectedGroup,
  );
  // Берем строго список предметов из таблицы subjects
  const subjects = db.subjects || [];

  const theadRow = document.getElementById("journal-thead-row");
  const tbody = document.getElementById("journal-tbody");

  // Формируем заголовки столбцов на основе предметов (subjects)
  let headHtml = `<th style="min-width: 200px; padding: 12px; text-align: left;">Студент</th>`;
  subjects.forEach((subj) => {
    headHtml += `
          <th style="text-align: center; min-width: 140px; padding: 12px; color: #38bdf8;" title="${subj.name}">
            ${subj.name}
          </th>`;
  });
  headHtml += `<th style="width: 100px; text-align: center; padding: 12px; background: #0369a1; color: #fff;">Ср. балл</th>`;
  theadRow.innerHTML = headHtml;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${subjects.length + 2}" style="text-align:center; color:#64748b; padding: 20px;">В этой группе нет студентов</td></tr>`;
    return;
  }

  // Заполняем строки студентов и их оценки по предметам
  tbody.innerHTML = students
    .map((student) => {
      let studentScores = [];
      let cellsHtml = `<td style="padding: 12px; color: #f8fafc;"><b>${student.name}</b></td>`;

      subjects.forEach((subject) => {
        // Ищем оценку по студенту и subjectId
        const grade = (db.grades || []).find(
          (g) =>
            String(g.studentId) === String(student.id) &&
            String(g.subjectId) === String(subject.id),
        );

        if (grade) {
          const scoreValue =
            grade.score !== undefined ? grade.score : grade.value;

          if (grade.attendance === "a") {
            cellsHtml += `<td style="text-align: center; padding: 12px;"><span style="color: #ef4444; font-weight: bold;" title="${grade.comment || "Отсутствовал"}">Н</span></td>`;
          } else if (scoreValue !== null && scoreValue !== undefined) {
            studentScores.push(Number(scoreValue));
            cellsHtml += `<td style="text-align: center; padding: 12px;"><span style="padding: 4px 8px; font-size: 0.85rem; background: rgba(34, 197, 94, 0.2); color: #4ade80; font-weight: bold; border-radius: 4px;" title="${grade.comment || "Оценка"}">${scoreValue}</span></td>`;
          } else {
            cellsHtml += `<td style="text-align: center; padding: 12px; color: #64748b;">-</td>`;
          }
        } else {
          cellsHtml += `<td style="text-align: center; padding: 12px; color: #64748b;">-</td>`;
        }
      });

      let avg = "-";
      if (studentScores.length > 0) {
        avg = (
          studentScores.reduce((a, b) => a + b, 0) / studentScores.length
        ).toFixed(1);
      }

      cellsHtml += `<td style="text-align: center; padding: 12px; font-weight: bold; background: #1e293b; color: #38bdf8;">${avg}</td>`;

      return `<tr style="border-bottom: 1px solid #334155;">${cellsHtml}</tr>`;
    })
    .join("");
}

function updateFormSelects() {
  const db = window.currentDb;
  if (!db) return;

  const selectedGroup = document.getElementById("filter-group").value;

  const students = (db.users || []).filter(
    (u) => u.role === "student" && u.group === selectedGroup,
  );
  const subjects = db.subjects || [];

  const studentSelect = document.getElementById("student-select");
  const lessonSelect = document.getElementById("lesson-select");

  if (studentSelect) {
    studentSelect.innerHTML = students
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");
  }
  if (lessonSelect) {
    // Заполняем селект чистыми предметами из таблицы subjects
    lessonSelect.innerHTML = subjects
      .map((subj) => `<option value="${subj.id}">${subj.name}</option>`)
      .join("");
  }
}
