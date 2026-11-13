document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("admin");
  initLogout();

  // Загружаем предметы с бэкенда при открытии страницы
  let subjects = await loadSubjects();
  renderSubjects(subjects);

  // Обработка формы добавления предмета
  const form = document.getElementById("subject-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("subject-name");
      const subjectName = nameInput.value.trim();

      if (!subjectName) return;

      try {
        // Отправляем запрос на создание предмета в БД
        const response = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: subjectName }),
        });

        if (!response.ok) throw new Error("Ошибка создания предмета");

        // Очищаем инпут и перезагружаем список с сервера
        nameInput.value = "";
        subjects = await loadSubjects();
        renderSubjects(subjects);
        alert("Предмет успешно добавлен в базу данных!");
      } catch (error) {
        console.error("Ошибка:", error);
        alert("Не удалось добавить предмет на сервер.");
      }
    });
  }
});

// Функция загрузки предметов с сервера PostgreSQL
async function loadSubjects() {
  try {
    const res = await fetch("/api/subjects");
    if (!res.ok) throw new Error("Ошибка загрузки предметов");
    return await res.json();
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    return [];
  }
}

// Рендер списка предметов
function renderSubjects(subjects) {
  const list = document.getElementById("subjects-list");
  if (!list) return;

  if (!subjects || subjects.length === 0) {
    list.innerHTML =
      '<p style="color: #64748b; padding: 15px;">Список предметов пуст.</p>';
    return;
  }

  list.innerHTML = subjects
    .map(
      (s) => `
<li style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; margin-bottom: 10px;">
  <span style="font-weight: 600; color: #f8fafc; flex-grow: 1; margin-right: 15px;"><i class="fa-solid fa-book-open-reader" style="color: #0284c7; margin-right: 10px;"></i>${s.name}</span>
  <button class="btn btn-danger" style="width: 120px; flex-shrink: 0; padding: 6px 12px; font-size: 0.85rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; text-align: center;" onclick="deleteSubject('${s.id}')">
    <i class="fa-solid fa-trash"></i> Удалить
  </button>
</li>
`,
    )
    .join("");
}

// Функция удаления предмета из базы данных
async function deleteSubject(subId) {
  if (!confirm("Вы уверены, что хотите удалить этот предмет?")) return;

  try {
    const res = await fetch(`/api/subjects/${subId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Ошибка удаления");

    // Перезагружаем список
    const subjects = await loadSubjects();
    renderSubjects(subjects);
  } catch (e) {
    console.error("Не удалось удалить предмет:", e);
    alert("Ошибка при удалении с сервера.");
  }
}
