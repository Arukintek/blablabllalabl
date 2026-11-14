document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("teacher");
  initLogout();

  const db = await FuraryDemo.loadData();
  window.currentDb = db;
  const groupSelect = document.getElementById("filter-group");
  const studentFilter = document.getElementById("journal-student-filter");
  const subjectFilter = document.getElementById("journal-subject-filter");
  const tableBody = document.getElementById("journal-tbody");

  groupSelect.innerHTML = db.groups.map((group) => `<option value="${FuraryDemo.escapeHtml(group)}">${FuraryDemo.escapeHtml(group)}</option>`).join("");
  subjectFilter.innerHTML += db.subjects.map((subject) => `<option value="${FuraryDemo.escapeHtml(subject.id)}">${FuraryDemo.escapeHtml(subject.name)}</option>`).join("");
  document.getElementById("lesson-date-input").value = new Date().toISOString().slice(0, 10);

  function groupStudents() {
    return db.users.filter((user) => user.role === "student" && user.group === groupSelect.value);
  }

  function updateFilters() {
    const selected = studentFilter.value;
    studentFilter.innerHTML = '<option value="all">Все ученики</option>' + groupStudents().map((student) =>
      `<option value="${FuraryDemo.escapeHtml(student.id)}">${FuraryDemo.escapeHtml(student.name)}</option>`,
    ).join("");
    if ([...studentFilter.options].some((option) => option.value === selected)) studentFilter.value = selected;

    const students = groupStudents();
    const selectableStudents = students.filter((student) => studentFilter.value === "all" || String(student.id) === studentFilter.value);
    document.getElementById("student-select").innerHTML = selectableStudents.map((student) =>
      `<option value="${FuraryDemo.escapeHtml(student.id)}">${FuraryDemo.escapeHtml(student.name)}</option>`,
    ).join("");
    document.getElementById("lesson-select").innerHTML = db.subjects.map((subject) =>
      `<option value="${FuraryDemo.escapeHtml(subject.id)}">${FuraryDemo.escapeHtml(subject.name)}</option>`,
    ).join("");
  }

  function getLessons() {
    const studentIds = groupStudents().map((student) => String(student.id));
    const subjectIds = subjectFilter.value === "all" ? null : [subjectFilter.value];
    return db.grades
      .filter((grade) => studentIds.includes(String(grade.studentId)) && (!subjectIds || subjectIds.includes(String(grade.subjectId))))
      .map((grade) => ({ date: grade.date || "", subjectId: String(grade.subjectId), lesson: grade.lesson || "" }))
      .filter((lesson, index, list) => list.findIndex((other) => lesson.date === other.date && lesson.subjectId === other.subjectId) === index)
      .sort((a, b) => a.date.localeCompare(b.date) || a.subjectId.localeCompare(b.subjectId));
  }

  function renderJournalMatrix() {
    const allStudents = groupStudents();
    const students = allStudents.filter((student) => studentFilter.value === "all" || String(student.id) === studentFilter.value);
    const lessons = getLessons();
    const head = document.getElementById("journal-thead-row");
    const summary = document.getElementById("journal-average-summary");
    head.innerHTML = `<th style="min-width:220px">Студент</th>${lessons.map((lesson) => {
      const subject = db.subjects.find((item) => String(item.id) === lesson.subjectId);
      return `<th title="${FuraryDemo.escapeHtml(lesson.lesson)}">${FuraryDemo.escapeHtml(lesson.date)}<br><small>${FuraryDemo.escapeHtml(subject?.name || "Предмет")}</small></th>`;
    }).join("")}<th>Средний балл</th>`;

    if (!students.length) {
      tableBody.innerHTML = `<tr><td colspan="${lessons.length + 2}" style="text-align:center;padding:24px;color:var(--text-muted)">В этой группе нет студентов.</td></tr>`;
      summary.innerHTML = "";
      return;
    }

    const averages = [];
    tableBody.innerHTML = students.map((student) => {
      const scores = lessons.map((lesson) => {
        const grade = db.grades.find((item) => String(item.studentId) === String(student.id) && String(item.subjectId) === lesson.subjectId && (item.date || "") === lesson.date);
        const score = grade ? FuraryDemo.scoreOf(grade) : 0;
        if (grade) return `<td class="grade-cell" tabindex="0" role="button" data-student="${FuraryDemo.escapeHtml(student.id)}" data-subject="${lesson.subjectId}" data-date="${FuraryDemo.escapeHtml(lesson.date)}" title="Нажмите, чтобы изменить оценку"><span class="grade-value">${grade.attendance === "a" ? "Н · " : ""}${score}</span></td>`;
        return `<td class="grade-cell" tabindex="0" role="button" data-student="${FuraryDemo.escapeHtml(student.id)}" data-subject="${lesson.subjectId}" data-date="${FuraryDemo.escapeHtml(lesson.date)}" title="Нажмите, чтобы поставить оценку"><span class="grade-empty">+ Оценка</span></td>`;
      });
      const average = lessons.length ? lessons.reduce((sum, lesson) => {
        const grade = db.grades.find((item) => String(item.studentId) === String(student.id) && String(item.subjectId) === lesson.subjectId && (item.date || "") === lesson.date);
        return sum + (grade ? FuraryDemo.scoreOf(grade) : 0);
      }, 0) / lessons.length : 0;
      averages.push(average);
      return `<tr><td><strong>${FuraryDemo.escapeHtml(student.name)}</strong></td>${scores.join("")}<td><span class="average-pill">${average.toFixed(1)}</span></td></tr>`;
    }).join("");

    const groupAverage = averages.length ? (averages.reduce((sum, average) => sum + average, 0) / averages.length).toFixed(1) : "0.0";
    summary.innerHTML = `<span class="metric-chip">Группа: <strong>${FuraryDemo.escapeHtml(groupSelect.value)}</strong></span>
      <span class="metric-chip">Учеников: <strong>${students.length}</strong></span>
      <span class="metric-chip">Уроков в журнале: <strong>${lessons.length}</strong></span>
      <span class="metric-chip">Средний балл выборки: <strong>${groupAverage}</strong></span>`;
  }

  function editGrade(cell) {
    const found = db.grades.find((grade) => String(grade.studentId) === cell.dataset.student && String(grade.subjectId) === cell.dataset.subject && (grade.date || "") === cell.dataset.date);
    const student = db.users.find((item) => String(item.id) === cell.dataset.student);
    const subject = db.subjects.find((item) => String(item.id) === cell.dataset.subject);
    FuraryDemo.openGradeEditor({
      studentName: student?.name || "Ученик",
      subjectName: subject?.name || "Предмет",
      date: cell.dataset.date,
      grade: found,
      onSave(value, attendance) {
        if (found) {
          found.score = attendance === "a" ? 0 : value;
          found.attendance = attendance;
        } else {
          db.grades.push({ id: Date.now(), studentId: Number(cell.dataset.student), subjectId: Number(cell.dataset.subject), date: cell.dataset.date, score: attendance === "a" ? 0 : value, attendance, comment: "", lesson: "" });
        }
        FuraryDemo.saveData(db);
        renderJournalMatrix();
      },
    });
  }

  tableBody.addEventListener("click", (event) => {
    const cell = event.target.closest(".grade-cell");
    if (cell) editGrade(cell);
  });
  tableBody.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".grade-cell")) {
      event.preventDefault();
      editGrade(event.target);
    }
  });

  [groupSelect, studentFilter, subjectFilter].forEach((select) => select.addEventListener("change", () => {
    updateFilters();
    renderJournalMatrix();
  }));
  document.getElementById("journal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const studentId = document.getElementById("student-select").value;
    const subjectId = document.getElementById("lesson-select").value;
    const date = document.getElementById("lesson-date-input").value;
    const rawScore = document.getElementById("score-input").value;
    const attendance = document.getElementById("attendance-select").value;
    if (!studentId || !subjectId || !date) {
      alert("Выберите ученика, предмет и дату урока.");
      return;
    }
    if (rawScore !== "" && (!Number.isFinite(Number(rawScore)) || Number(rawScore) < 0 || Number(rawScore) > 100)) {
      alert("Оценка должна быть числом от 0 до 100.");
      return;
    }
    const existing = db.grades.find((grade) => String(grade.studentId) === studentId && String(grade.subjectId) === subjectId && grade.date === date);
    const gradeData = {
      id: existing?.id || Date.now(),
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      date,
      score: attendance === "a" ? 0 : rawScore === "" ? null : Number(rawScore),
      attendance,
      comment: document.getElementById("comment-input").value.trim(),
      lesson: existing?.lesson || "",
    };
    if (existing) Object.assign(existing, gradeData);
    else db.grades.push(gradeData);
    FuraryDemo.saveData(db);
    document.getElementById("score-input").value = "";
    document.getElementById("comment-input").value = "";
    renderJournalMatrix();
  });

  updateFilters();
  renderJournalMatrix();
});
