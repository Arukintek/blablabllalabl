document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("student");
  initLogout();

  const db = await FuraryDemo.loadData();
  const user = getCurrentUser() || {};
  const subjectFilter = document.getElementById("student-subject-filter");
  const tbody = document.getElementById("student-grades-tbody");
  const grades = db.grades
    .filter((grade) => String(grade.studentId) === String(user.id))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const escape = FuraryDemo.escapeHtml;
  document.getElementById("student-name-nav")?.replaceChildren(document.createTextNode(user.name || "Студент"));

  const subjects = [...new Map(grades.map((grade) => {
    const id = String(grade.subjectId);
    return [id, db.subjects.find((subject) => String(subject.id) === id) || { id, name: FuraryDemo.subjectName(db, grade) }];
  })).values()];
  subjectFilter.innerHTML += subjects.map((subject) => `<option value="${escape(subject.id)}">${escape(subject.name)}</option>`).join("");

  function render() {
    const filtered = grades.filter((grade) => subjectFilter.value === "all" || String(grade.subjectId) === subjectFilter.value);
    const scores = filtered.map(FuraryDemo.scoreOf);
    const average = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "0.0";
    const absences = filtered.filter((grade) => grade.attendance === "a").length;
    document.getElementById("student-total-grades").textContent = filtered.length;
    document.getElementById("student-avg-score").textContent = average;
    document.getElementById("student-absence-count").textContent = absences;
    document.getElementById("student-estimated-grade").innerHTML = `
      <span class="metric-chip">Предмет: <strong>${subjectFilter.value === "all" ? "Все предметы" : escape(subjects.find((subject) => String(subject.id) === subjectFilter.value)?.name || "")}</strong></span>
      <span class="metric-chip">Примерный средний балл: <strong>${average} / 100</strong></span>
      <span class="metric-chip">Пропуски: <strong>${absences}</strong></span>
      <span class="metric-chip">Период: <strong>за всё время</strong></span>`;

    tbody.innerHTML = filtered.length ? filtered.map((grade) => {
      const date = grade.date ? new Date(`${grade.date}T00:00:00`).toLocaleDateString("ru-RU") : "Дата не указана";
      const subject = FuraryDemo.subjectName(db, grade);
      const score = FuraryDemo.scoreOf(grade);
      const attendance = grade.attendance === "a" ? " · Пропуск" : "";
      const topic = grade.lesson || grade.topic || "Урок";
      return `<tr>
        <td>${escape(date)}</td>
        <td><strong>${escape(subject)}</strong><div class="muted">${escape(topic)}</div></td>
        <td style="text-align:center"><span class="grade-value">${score}</span>${attendance ? `<div class="muted">${attendance}</div>` : ""}</td>
        <td>${escape(grade.comment || "Без комментария")}</td>
      </tr>`;
    }).join("") : '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">Оценок по выбранному предмету пока нет.</td></tr>';
  }

  subjectFilter.addEventListener("change", render);
  render();
});
