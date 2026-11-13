document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("admin");
  initLogout();

  const modal = document.getElementById("user-modal");
  const openBtn = document.getElementById("open-user-modal");
  const closeBtn = document.getElementById("close-user-modal");
  const roleSelect = document.getElementById("new-user-role");
  const groupContainer = document.getElementById("group-container");

  // Загружаем актуальную базу данных с бэкенда через fetch
  let db;
  try {
    const res = await fetch("/api/db");
    if (!res.ok) throw new Error("Ошибка загрузки данных");
    db = await res.json();
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    return;
  }

  // Рендеринг таблицы пользователей
  renderUsersTable(db);

  // Заполняем селект групп из базы данных
  const groupSelect = document.getElementById("new-user-group");
  const groupsList = db.groups || [];
  groupSelect.innerHTML = groupsList
    .map((g) => `<option value="${g}">${g}</option>`)
    .join("");

  // Скрываем/показываем поле группы в зависимости от выбранной роли
  roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "student") {
      groupContainer.style.display = "block";
    } else {
      groupContainer.style.display = "none"; // Учителям и админам группа не нужна
    }
  });

  // Управление открытием/закрытием модального окна
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      modal.style.display = "flex";
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // Обработка отправки формы регистрации пользователя
  const form = document.getElementById("new-user-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("new-user-name").value;
      const email = document.getElementById("new-user-email").value;
      const password = document.getElementById("new-user-password").value;
      const role = document.getElementById("new-user-role").value;
      const groupName = document.getElementById("new-user-group").value;

      let groupId = null;
      if (role === "student" && db.users) {
        const matchedStudent = db.users.find(
          (u) => u.group === groupName && u.groupId,
        );
        if (matchedStudent) {
          groupId = matchedStudent.groupId;
        } else {
          groupId = 1;
        }
      }

      const payload = {
        name,
        email,
        password,
        role,
        groupId: role === "student" ? Number(groupId) : null,
      };

      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Ошибка при создании пользователя");
        }

        alert("Пользователь успешно зарегистрирован!");
        modal.style.display = "none";
        form.reset();

        // Перезагружаем данные и обновляем таблицу
        const updatedRes = await fetch("/api/db");
        const updatedDb = await updatedRes.json();
        renderUsersTable(updatedDb);
      } catch (error) {
        console.error("Ошибка:", error);
        alert("Не удалось зарегистрировать пользователя: " + error.message);
      }
    });
  }
});

function renderUsersTable(db) {
  const tbody = document.querySelector("#users-table tbody");
  if (!tbody) return;

  const users = db.users || [];

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">Список пользователей пуст.</td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td class="user-name-cell">${u.name || "Без имени"}</td>
      <td class="user-email-cell">${u.email || "-"}</td>
      <td><span class="user-role-badge role-${(u.role || "student").toLowerCase()}">${u.role || "-"}</span></td>
      <td>${u.group || "-"}</td>
      <td class="user-action-cell">
        ${
          u.role !== "admin"
            ? `
          <button class="user-action-btn user-action-btn--primary" onclick="impersonate('${u.id}')">Войти как</button>
          <button class="user-action-btn user-action-btn--danger" onclick="deleteUser('${u.id}', '${u.name}')"><i class="fa-solid fa-trash"></i></button>
        `
            : '<span class="user-system-label">Системный</span>'
        }
      </td>
    </tr>
  `,
    )
    .join("");
}

async function impersonate(userId) {
  try {
    const res = await fetch("/api/db");
    const db = await res.json();
    const user = (db.users || []).find((u) => String(u.id) === String(userId));

    if (user) {
      localStorage.setItem("current_user", JSON.stringify(user));
      window.location.href = `/${user.role}/dashboard.html`;
    }
  } catch (e) {
    console.error("Ошибка при входе под пользователем:", e);
  }
}

// Функция удаления пользователя
async function deleteUser(userId, userName) {
  if (!confirm(`Вы действительно хотите удалить пользователя "${userName}"?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Не удалось удалить пользователя на сервере");
    }

    alert("Пользователь успешно удален!");

    // Перезагружаем список пользователей
    const updatedRes = await fetch("/api/db");
    const updatedDb = await updatedRes.json();
    renderUsersTable(updatedDb);
  } catch (e) {
    console.error("Ошибка при удалении:", e);
    alert("Ошибка при удалении пользователя.");
  }
}
