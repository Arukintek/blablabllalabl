document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("admin");
  initLogout();

  const db = await FuraryDemo.loadData();
  const list = document.getElementById("subjects-list");
  const form = document.getElementById("subject-form");

  function renderSubjects() {
    list.innerHTML = db.subjects.length
      ? db.subjects.map((subject) => `
        <li class="subject-summary-item">
          <span style="font-weight:700"><i class="fa-solid fa-book-open-reader" style="color:var(--accent);margin-right:10px"></i>${FuraryDemo.escapeHtml(subject.name)}</span>
          <span class="toolbar-actions">
            <button type="button" class="btn-outline" data-action="details" data-id="${FuraryDemo.escapeHtml(subject.id)}"><i class="fa-solid fa-chart-column"></i> Сводка оценок</button>
            <button type="button" class="user-action-btn user-action-btn--danger" data-action="delete" data-id="${FuraryDemo.escapeHtml(subject.id)}"><i class="fa-solid fa-trash"></i> Удалить</button>
          </span>
        </li>`).join("")
      : '<li class="muted">Список предметов пуст.</li>';
  }

  function showSubjectDetails(subject) {
    const grades = db.grades.filter((grade) => String(grade.subjectId) === String(subject.id));
    const students = db.users.filter((user) => user.role === "student");
    const byGroup = db.groups.map((group) => {
      const groupStudents = students.filter((student) => student.group === group);
      const rows = groupStudents.map((student) => {
        const studentGrades = grades.filter((grade) => String(grade.studentId) === String(student.id));
        const average = studentGrades.length
          ? (studentGrades.reduce((sum, grade) => sum + FuraryDemo.scoreOf(grade), 0) / studentGrades.length).toFixed(1)
          : "0.0";
        const scoreList = studentGrades.length
          ? studentGrades.map((grade) => `${FuraryDemo.escapeHtml(grade.date)}: ${FuraryDemo.scoreOf(grade)}${grade.attendance === "a" ? " (Н)" : ""}`).join(" · ")
          : "Оценок пока нет";
        return `<tr><td>${FuraryDemo.escapeHtml(student.name)}</td><td>${scoreList}</td><td><span class="average-pill">${average}</span></td></tr>`;
      }).join("");
      return groupStudents.length
        ? `<h4 style="margin:18px 0 8px">${FuraryDemo.escapeHtml(group)}</h4><div class="table-scroll"><table><thead><tr><th>Ученик</th><th>Оценки по урокам</th><th>Средний балл</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : "";
    }).join("");
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop";
    overlay.innerHTML = `<section class="modal-panel" role="dialog" aria-modal="true" aria-label="Сводка оценок">
      <div class="toolbar"><h3>Сводка по предмету: ${FuraryDemo.escapeHtml(subject.name)}</h3><button class="icon-action" type="button" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button></div>
      <p class="muted">Всего оценок: ${grades.length}. Средний балл считается по всем записям, включая нулевые.</p>
      ${byGroup || '<p class="muted">В группах пока нет учеников.</p>'}
    </section>`;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("button")) overlay.remove();
    });
    document.body.append(overlay);
  }

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const subject = db.subjects.find((item) => String(item.id) === button.dataset.id);
    if (!subject) return;
    if (button.dataset.action === "details") showSubjectDetails(subject);
    if (button.dataset.action === "delete" && confirm(`Удалить предмет «${subject.name}»?`)) {
      db.subjects = db.subjects.filter((item) => String(item.id) !== String(subject.id));
      FuraryDemo.saveData(db);
      renderSubjects();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("subject-name");
    const name = input.value.trim();
    if (!name) return;
    db.subjects.push({ id: Date.now(), name });
    FuraryDemo.saveData(db);
    input.value = "";
    renderSubjects();
  });

  renderSubjects();
});
