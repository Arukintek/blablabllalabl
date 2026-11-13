document.addEventListener("DOMContentLoaded", async () => {
  if (typeof checkAccess === "function") checkAccess("student");
  if (typeof initLogout === "function") initLogout();

  try {
    // Получаем текущего пользователя из localStorage
    const currentUser = JSON.parse(localStorage.getItem("current_user")) || {};
    const studentId = currentUser.id || 1; // ID студента для запроса

    // Устанавливаем имя в навигацию, если есть элемент
    const nameNav = document.getElementById("student-name-nav");
    if (nameNav && currentUser.name) {
      nameNav.textContent = currentUser.name;
    }

    // Запрос к бэкенду за оценками конкретного студента
    const response = await fetch(`/api/grades/${studentId}`);
    if (!response.ok) throw new Error("Ошибка загрузки оценок");

    const myGrades = await response.json();

    const tbody = document.getElementById("student-grades-tbody");
    if (!tbody) return;

    // Статистика: общее количество оценок
    const totalGradesEl = document.getElementById("student-total-grades");
    if (totalGradesEl) totalGradesEl.textContent = myGrades.length;

    // Статистика: средний балл
    if (myGrades.length > 0) {
      const scores = myGrades
        .filter((g) => g.value !== null && g.value !== undefined)
        .map((g) => Number(g.value));
      if (scores.length > 0) {
        const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(
          1,
        );
        const avgScoreEl = document.getElementById("student-avg-score");
        if (avgScoreEl) avgScoreEl.textContent = avg;
      }
    }

    if (myGrades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">У вас пока нет выставленных оценок.</td></tr>`;
      return;
    }

    // Заполняем таблицу данными из базы Prisma
    tbody.innerHTML = myGrades
      .map((grade) => {
        // Дата оценки или создания записи
        const dateObj = new Date(grade.date || grade.createdAt);
        const dateStr = !isNaN(dateObj)
          ? dateObj.toLocaleDateString()
          : "Дата не указана";

        // Название предмета (связь с Subject через Prisma)
        const subjectStr = grade.subject
          ? grade.subject.name
          : "Предмет не указан";

        let scoreHtml = "";
        if (grade.value !== null && grade.value !== undefined) {
          scoreHtml = `<span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 6px; font-weight: bold;">${grade.value}</span>`;
        } else {
          scoreHtml = `<span style="color: #cbd5e1;">-</span>`;
        }

        return `
                <tr>
                    <td style="font-weight: 600; color: #334155;">${dateStr}</td>
                    <td>${subjectStr}</td>
                    <td style="text-align: center;">${scoreHtml}</td>
                    <td style="color: #64748b;">${grade.comment || "Без комментария"}</td>
                </tr>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка загрузки оценок:", error);
    const tbody = document.getElementById("student-grades-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444;">Не удалось загрузить оценки с сервера.</td></tr>`;
    }
  }
});
