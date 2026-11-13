document.addEventListener("DOMContentLoaded", async () => {
  if (typeof checkAccess === "function") checkAccess("student");
  if (typeof initLogout === "function") initLogout();

  const user =
    (typeof getCurrentUser === "function" ? getCurrentUser() : null) ||
    JSON.parse(localStorage.getItem("current_user")) ||
    {};

  // Устанавливаем имя студента в навигацию
  const nameNav = document.getElementById("student-name-nav");
  if (nameNav) nameNav.textContent = user.name || "Студент";

  let scheduleData = [];
  let myGrades = [];
  let allHomework = [];

  try {
    // 1. Загружаем общую базу данных с бэкенда
    const resDb = await fetch("/api/db");
    if (resDb.ok) {
      const db = await resDb.json();
      const allSchedules = db.schedules || [];

      // Фильтрация расписания под группу студента
      scheduleData = allSchedules.filter((l) => {
        if (
          user.groupId &&
          l.groupId &&
          Number(user.groupId) === Number(l.groupId)
        ) {
          return true;
        }

        const userGroupName =
          typeof user.group === "object" && user.group !== null
            ? user.group.name
            : user.group || "";
        const cleanUserGroup = String(userGroupName)
          .replace(/[\s\-]/g, "")
          .toLowerCase();
        const cleanLessonGroup = String(l.group || "")
          .replace(/[\s\-]/g, "")
          .toLowerCase();

        return (
          cleanUserGroup &&
          cleanLessonGroup &&
          cleanUserGroup === cleanLessonGroup
        );
      });

      allHomework = db.homework || [];
    }

    // 2. Загружаем оценки студента
    if (user.id) {
      const resGrades = await fetch(`/api/grades/${user.id}`);
      if (resGrades.ok) {
        myGrades = await resGrades.json();
      }
    }
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
  }

  // Отображение стат-карт
  const gradesCountEl = document.getElementById("my-grades-count");
  if (gradesCountEl) gradesCountEl.textContent = myGrades.length;

  const userGroupName =
    typeof user.group === "object" && user.group !== null
      ? user.group.name
      : user.group || "";
  const studentHomework = allHomework.filter(
    (hw) => !hw.group || hw.group === "Все" || hw.group === userGroupName,
  );

  const activeHwCountEl = document.getElementById("active-hw-count");
  if (activeHwCountEl) activeHwCountEl.textContent = studentHomework.length;

  if (myGrades.length > 0) {
    const validScores = myGrades.filter(
      (g) =>
        (g.score !== null && g.score !== undefined) ||
        (g.value !== null && g.value !== undefined),
    );
    if (validScores.length > 0) {
      const total = validScores.reduce(
        (sum, g) => sum + Number(g.score !== undefined ? g.score : g.value),
        0,
      );
      const avg = (total / validScores.length).toFixed(1);
      const avgEl = document.getElementById("avg-score");
      if (avgEl) avgEl.textContent = avg;
    }

    const lastGrade = myGrades[myGrades.length - 1];
    const lastValEl = document.getElementById("last-score-val");
    const lastCommentEl = document.getElementById("last-score-comment");

    const lastScore =
      lastGrade.score !== undefined ? lastGrade.score : lastGrade.value;
    if (lastValEl) lastValEl.textContent = `${lastScore} / 100`;
    if (lastCommentEl)
      lastCommentEl.textContent = lastGrade.comment || "Оценка за урок";
  } else {
    const avgEl = document.getElementById("avg-score");
    if (avgEl) avgEl.textContent = "0";
  }

  // --- ОТОБРАЖЕНИЕ ТОЛЬКО БЛИЖАЙШЕГО ДНЯ В ВИДЕ КАРТОЧКИ ---
  const scheduleContainer = document.getElementById("student-schedule-summary");
  if (scheduleContainer) {
    if (!scheduleData || scheduleData.length === 0) {
      scheduleContainer.innerHTML =
        '<p style="color:#64748b; padding: 15px;">Расписание для вашей группы пока не составлено.</p>';
    } else {
      // Дни недели по порядку
      const daysOrder = [
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
        "Воскресенье",
      ];
      const jsDaysMap = [
        "Воскресенье",
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
      ];

      // Текущий день недели
      const todayIndex = new Date().getDay();
      const todayName = jsDaysMap[todayIndex];

      // Находим ближайший день, для которого есть уроки
      let targetDay = todayName;
      const availableDays = [
        ...new Set(scheduleData.map((l) => l.dayOfWeek || l.day)),
      ];

      if (!availableDays.includes(targetDay)) {
        // Если сегодня уроков нет, берем первый доступный день по календарю
        targetDay =
          daysOrder.find((d) => availableDays.includes(d)) || availableDays[0];
      }

      // Фильтруем уроки только выбранного дня
      const dayLessons = scheduleData.filter(
        (l) => (l.dayOfWeek || l.day) === targetDay,
      );

      // Формируем карточку дня
      const cardsHtml = dayLessons
        .map((l) => {
          const subjectName =
            typeof l.subject === "object" && l.subject !== null
              ? l.subject.name
              : l.subject || "Предмет";
          const timeStr = l.timeSlot || l.time || "11.10-12.30";
          const roomStr = l.room || "-";
          const groupStr = l.group || userGroupName || "24ПО-п1.1";

          return `
                    <div style="
                        background: #0f172a; 
                        border-radius: 8px; 
                        padding: 14px; 
                        margin-bottom: 12px; 
                        border-left: 4px solid #006aff; 
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
                    ">
                        <div style="color: #006aff; font-weight: 700; font-size: 0.9rem; margin-bottom: 6px;">
                            ${timeStr}
                        </div>
                        <div style="color: #f8fafc; font-weight: 600; font-size: 0.95rem; margin-bottom: 10px; line-height: 1.3;">
                            ${subjectName}
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <span style="background: #1e293b; color: #94a3b8; padding: 3px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600;">
                                Каб. ${roomStr}
                            </span>
                            <span style="background: #0284c7; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600;">
                                ${groupStr}
                            </span>
                        </div>
                    </div>
                `;
        })
        .join("");

      scheduleContainer.innerHTML = `
                <div style="background: #0b1120; border: 1px solid #1e293b; border-radius: 12px; padding: 16px;">
                    <h4 style="color: #f8fafc; font-size: 1.1rem; margin-bottom: 14px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
                        ${targetDay}
                    </h4>
                    ${cardsHtml}
                </div>
            `;
    }
  }
});
