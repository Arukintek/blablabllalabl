async function loadSchedule() {
  try {
    // Получаем текущего пользователя из localStorage
    const currentUser = JSON.parse(localStorage.getItem("current_user")) || {};
    const groupId = currentUser.groupId || 5; // По умолчанию ID группы 5 (24ПО р 1.1)

    // Устанавливаем имя в навигацию
    const nameNav = document.getElementById("student-name-nav");
    if (nameNav && currentUser.name) {
      nameNav.textContent = currentUser.name;
    }

    // Делаем запрос на бэкенд Prisma
    const response = await fetch(`/api/schedule/${groupId}`);
    if (!response.ok) throw new Error("Ошибка загрузки расписания");

    const data = await response.json();

    // Преобразуем данные из формата Prisma
    const schedules = Array.isArray(data)
      ? data.map((item) => ({
          day: item.dayOfWeek || item.day,
          time: item.timeSlot || item.time,
          subject: item.subject ? item.subject.name : item.subject || "",
          room: item.room || "-",
          group: currentUser.group?.name || currentUser.group || "24ПО р 1.1",
        }))
      : [];

    const container = document.getElementById("schedule-cards-container");
    if (!container) return;
    container.innerHTML = "";

    if (schedules.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b;">Расписание для вашей группы пусто</p>';
      return;
    }

    const daysOrder = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
    const groupedByDay = {};
    daysOrder.forEach((day) => (groupedByDay[day] = []));

    schedules.forEach((item) => {
      const dayName = item.day || "Другое";
      if (!groupedByDay[dayName]) {
        groupedByDay[dayName] = [];
      }
      groupedByDay[dayName].push(item);
    });

    daysOrder.forEach((day) => {
      const lessons = groupedByDay[day];
      const dayCard = document.createElement("div");
      dayCard.className = "day-card";

      let lessonsHtml = "";
      if (lessons.length === 0) {
        lessonsHtml =
          '<div class="lesson-item" style="color: #64748b; font-size: 0.85rem;">Нет занятий</div>';
      } else {
        lessonsHtml = lessons
          .map(
            (l) => `
                    <div class="lesson-item">
                        <div class="lesson-time">${l.time || ""}</div>
                        <div class="lesson-subject">${l.subject || ""}</div>
                        <div class="lesson-details">
                            <span class="room-badge">Каб. ${l.room || "-"}</span>
                            <span class="group-badge">${l.group || ""}</span>
                        </div>
                    </div>
                `,
          )
          .join("");
      }

      dayCard.innerHTML = `
                <h3 class="day-title">${day}</h3>
                <div class="lessons-list">
                    ${lessonsHtml}
                </div>
            `;

      container.appendChild(dayCard);
    });
  } catch (error) {
    console.error("Ошибка загрузки расписания:", error);
    const container = document.getElementById("schedule-cards-container");
    if (container) {
      container.innerHTML =
        '<p style="color: #ef4444;">Не удалось загрузить расписание с сервера.</p>';
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof checkAccess === "function") checkAccess("student");
  if (typeof initLogout === "function") initLogout();
  loadSchedule();
});
