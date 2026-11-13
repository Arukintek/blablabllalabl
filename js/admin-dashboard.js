document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("admin");
  initLogout();

  let db = { users: [], groups: [] };

  try {
    // 1. Загружаем пользователей с бэкенда Prisma
    const resUsers = await fetch("/api/users");
    if (!resUsers.ok) throw new Error("Ошибка загрузки пользователей");
    db.users = await resUsers.json();

    // 2. Пытаемся подгрузить полную базу с бэкенда
    const resDb = await fetch("/api/db");
    if (resDb.ok) {
      const fullDb = await resDb.json();
      // Поддерживаем разные варианты ключей ответа бэкенда (groups или db.groups)
      if (fullDb.groups && fullDb.groups.length > 0) {
        db.groups = fullDb.groups;
      } else if (fullDb.db && fullDb.db.groups && fullDb.db.groups.length > 0) {
        db.groups = fullDb.db.groups;
      }
    }

    // 3. СТРАХОВКА: Если группы с бэкенда всё еще пусты, собираем их уникальные имена из списка студентов
    if (!db.groups || db.groups.length === 0) {
      const uniqueGroupNames = [
        ...new Set(
          db.users
            .filter((u) => String(u.role).toLowerCase() === "student")
            .map((u) => {
              return typeof u.group === "object" && u.group !== null
                ? u.group.name
                : u.group || null;
            })
            .filter(Boolean),
        ),
      ];

      db.groups = uniqueGroupNames.map((name, index) => ({
        id: index + 1,
        name: name,
      }));
    }
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    return;
  }

  // Заполняем общие счетчики
  const totalUsersEl = document.getElementById("total-users");
  const totalStudentsEl = document.getElementById("total-students");
  const totalTeachersEl = document.getElementById("total-teachers");
  const totalGroupsEl = document.getElementById("total-groups");

  if (totalUsersEl) totalUsersEl.textContent = db.users.length;
  if (totalStudentsEl)
    totalStudentsEl.textContent = db.users.filter(
      (u) => String(u.role).toLowerCase() === "student",
    ).length;
  if (totalTeachersEl)
    totalTeachersEl.textContent = db.users.filter(
      (u) => String(u.role).toLowerCase() === "teacher",
    ).length;
  if (totalGroupsEl) totalGroupsEl.textContent = db.groups.length;

  // Рендерим обзор групп
  const groupsContainer = document.getElementById("groups-summary");
  if (groupsContainer) {
    const groups = db.groups;

    if (groups.length === 0) {
      groupsContainer.innerHTML =
        '<p style="color:#64748b; padding: 15px;">Список групп пуст.</p>';
    } else {
      groupsContainer.innerHTML = groups
        .map((groupItem) => {
          const groupId =
            typeof groupItem === "object" && groupItem !== null
              ? groupItem.id
              : null;
          const groupName =
            typeof groupItem === "object" && groupItem !== null
              ? groupItem.name
              : groupItem;

          const cleanTargetGroup = String(groupName)
            .replace(/[\s\-]/g, "")
            .toLowerCase();

          const students = db.users.filter((u) => {
            if (String(u.role).toLowerCase() !== "student") return false;

            if (groupId && u.groupId && Number(u.groupId) === Number(groupId)) {
              return true;
            }

            const userGroupStr =
              typeof u.group === "object" && u.group !== null
                ? u.group.name || ""
                : u.group || "";

            const cleanUserGroup = String(userGroupStr)
              .replace(/[\s\-]/g, "")
              .toLowerCase();

            return cleanUserGroup && cleanUserGroup === cleanTargetGroup;
          });

          return `
                  <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1e293b;">
                    <div>
                      <b style="color: #0080ff; font-size: 0.95rem;">${groupName}</b>
                      <div style="font-size:0.85rem; color:#94a3b8; margin-top: 4px;">Состав: ${students.length} студентов</div>
                    </div>
                    <a href="/admin/reports.html" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem; background: #0284c7; color: white; border-radius: 6px; text-decoration: none;">Отчет</a>
                  </div>
                `;
        })
        .join("");
    }
  }
});
