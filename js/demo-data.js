(function () {
  const storageKey = "furary-visual-data";
  const cleanupKey = "furary-visual-cleanup-v1";
  const emptyData = {
    groups: [],
    users: [],
    subjects: [],
    grades: [],
    schedules: [],
    homework: [],
  };

  if (localStorage.getItem(cleanupKey) !== "true") {
    localStorage.removeItem("furary-demo-data");
    localStorage.removeItem("furary-database-loaded");
    localStorage.removeItem("current_user");
    localStorage.setItem(cleanupKey, "true");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getData() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : clone(emptyData);
    } catch (error) {
      console.error("Не удалось прочитать сохранённые данные:", error);
      return clone(emptyData);
    }
  }

  function saveData(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  async function loadData() {
    if (localStorage.getItem("furary-database-loaded") === "true" && localStorage.getItem(storageKey)) {
      return getData();
    }

    try {
      const response = await fetch("/api/db");
      if (!response.ok) throw new Error(`Ошибка загрузки данных: HTTP ${response.status}`);
      const source = await response.json();
      if (!Array.isArray(source.users) || !Array.isArray(source.subjects) || !Array.isArray(source.groups)) {
        throw new Error("Сервер вернул неполные данные для интерфейса.");
      }

      const groups = source.groups.map((group) => typeof group === "object" ? group.name : group);
      const data = {
        groups,
        users: source.users.map((user) => {
          const group = typeof user.group === "object" && user.group ? user.group.name : (user.group || "");
          return {
            ...user,
            role: String(user.role || "").toLowerCase(),
            group,
            groupId: user.groupId || (group ? groups.indexOf(group) + 1 : null),
          };
        }),
        subjects: source.subjects,
        grades: (source.grades || []).map((grade) => {
          const date = grade.date ? new Date(grade.date) : new Date();
          return {
            ...grade,
            score: grade.score !== undefined ? grade.score : (grade.value ?? null),
            date: Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10),
            attendance: grade.attendance || "p",
          };
        }),
        schedules: (source.schedules || []).map((lesson) => ({
          ...lesson,
          dayOfWeek: lesson.dayOfWeek || lesson.day,
          timeSlot: lesson.timeSlot || lesson.time,
          group: typeof lesson.group === "object" && lesson.group ? lesson.group.name : lesson.group,
          subject: typeof lesson.subject === "object" && lesson.subject ? lesson.subject.name : lesson.subject,
        })),
        homework: source.homework || [],
      };

      saveData(data);
      localStorage.setItem("furary-database-loaded", "true");
      return data;
    } catch (error) {
      console.warn("API недоступен, используются пустые данные:", error);
      return getData();
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function scoreOf(grade) {
    const score = grade.score !== undefined ? grade.score : grade.value;
    return score === null || score === undefined || score === "" ? 0 : Number(score);
  }

  function subjectName(data, grade) {
    const subject = data.subjects.find((item) => String(item.id) === String(grade.subjectId));
    return grade.subject?.name || subject?.name || "Предмет";
  }

  function openGradeEditor({ studentName, subjectName: lessonName, date, grade, onSave }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop";
    overlay.innerHTML = `<section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="grade-editor-title">
      <div class="toolbar"><h3 id="grade-editor-title">Оценка за урок</h3><button class="icon-action" type="button" data-close aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button></div>
      <p class="muted">${escapeHtml(studentName)} · ${escapeHtml(lessonName)} · ${escapeHtml(date)}</p>
      <form class="grade-editor-form" style="margin-top:16px">
        <div class="form-group"><label for="grade-editor-score">Оценка (0–100)</label><input id="grade-editor-score" class="input-text" type="number" min="0" max="100" step="1" value="${grade && grade.score !== null && grade.score !== undefined ? escapeHtml(grade.score) : ""}" required></div>
        <div class="form-group"><label for="grade-editor-attendance">Посещаемость</label><select id="grade-editor-attendance" class="input-text"><option value="p">Присутствовал</option><option value="a">Отсутствовал</option></select></div>
        <div class="toolbar-actions" style="justify-content:flex-end"><button class="btn-outline" type="button" data-close>Отмена</button><button class="panel-action-btn" type="submit">Сохранить</button></div>
      </form>
    </section>`;
    const attendance = overlay.querySelector("#grade-editor-attendance");
    attendance.value = grade?.attendance === "a" ? "a" : "p";
    function handleEscape(event) {
      if (event.key === "Escape") close();
    }
    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", handleEscape);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-close]")) close();
    });
    overlay.querySelector(".grade-editor-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = overlay.querySelector("#grade-editor-score");
      const value = Number(input.value);
      if (input.value.trim() === "" || !Number.isFinite(value) || value < 0 || value > 100) {
        input.setCustomValidity("Введите число от 0 до 100.");
        input.reportValidity();
        return;
      }
      onSave(value, attendance.value);
      close();
    });
    const scoreInput = overlay.querySelector("#grade-editor-score");
    scoreInput.addEventListener("input", () => scoreInput.setCustomValidity(""));
    document.addEventListener("keydown", handleEscape);
    document.body.append(overlay);
    overlay.querySelector("#grade-editor-score").focus();
  }

  window.FuraryDemo = { getData, loadData, saveData, escapeHtml, scoreOf, subjectName, openGradeEditor };
})();
