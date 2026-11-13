document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("student");
  initLogout();

  const user = JSON.parse(localStorage.getItem("current_user")) || {};
  const container = document.getElementById("student-homework-list");
  const counterEl = document.getElementById("hw-counter");

  console.log("Текущий пользователь:", user);

  if (!container) return;

  let db;
  try {
    const res = await fetch("/api/db");
    if (!res.ok) throw new Error("Ошибка загрузки данных");
    db = await res.json();
    console.log("Загруженная БД с бэкенда:", db);
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">Не удалось загрузить данные с сервера.</div>`;
    return;
  }

  const homeworkList = db.homework || [];

  let userGroupName = "";
  if (user.group) {
    if (typeof user.group === "object" && user.group !== null) {
      userGroupName = user.group.name || String(user.group.id || "");
    } else {
      userGroupName = String(user.group);
    }
  } else if (user.groupId) {
    const databaseUser = (db.users || []).find(
      (dbUser) => Number(dbUser.id) === Number(user.id),
    );
    userGroupName = databaseUser ? databaseUser.group || "" : "";
  }

  console.log("Итоговое имя группы студента для фильтра:", userGroupName);

  // Фильтруем ДЗ
  const myHomework = homeworkList.filter((hw) => {
    if (!hw.group || hw.group === "Все") return true;

    let hwGroupName = "";
    if (typeof hw.group === "object" && hw.group !== null) {
      hwGroupName = hw.group.name || "";
    } else {
      hwGroupName = String(hw.group);
    }

    return (
      hwGroupName.trim().toLowerCase() === userGroupName.trim().toLowerCase()
    );
  });

  console.log("Отфильтрованные ДЗ для студента:", myHomework);

  if (counterEl) {
    counterEl.textContent = `${myHomework.length} заданий`;
  }

  if (myHomework.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #64748b;">
                <i class="fa-solid fa-face-smile" style="font-size: 2.5rem; margin-bottom: 10px; color: #cbd5e1;"></i>
                <p>На данный момент для вашей группы (${userGroupName || "не указана"}) нет активных домашних заданий.</p>
            </div>
        `;
    return;
  }

  // Рендеринг карточек заданий
  container.innerHTML = myHomework
    .slice()
    .reverse()
    .map((hw) => {
      const subject = (db.subjects || []).find(
        (s) => Number(s.id) === Number(hw.subjectId),
      );
      const subjectName = subject ? subject.name : "Общий предмет";

      let displayGroup = "Все";
      if (hw.group) {
        displayGroup =
          typeof hw.group === "object" && hw.group !== null
            ? hw.group.name
            : hw.group;
      }

      return `
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; transition: all 0.2s ease; margin-bottom: 15px; color: #f8fafc;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="background: #0369a1; color: #bae6fd; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">
                            <i class="fa-solid fa-book"></i> ${subjectName}
                        </span>
                        <span style="background: #334155; color: #94a3b8; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; margin-left: 8px;">
                            Группа: ${displayGroup}
                        </span>
                    </div>
                    <div style="font-size: 0.85rem; color: #f87171; font-weight: 600; background: rgba(239, 68, 68, 0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <i class="fa-regular fa-calendar-days"></i> Срок сдачи: ${hw.deadline || "Не установлен"}
                    </div>
                </div>
                <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.5; white-space: pre-wrap; margin-top: 10px;">${hw.text}</p>
            </div>
        `;
    })
    .join("");
});
