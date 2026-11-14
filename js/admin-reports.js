document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("admin");
  initLogout();

  const db = await FuraryDemo.loadData();
  const groupSelect = document.getElementById("report-group-select");
  const studentSelect = document.getElementById("report-student-select");
  const subjectSelect = document.getElementById("report-subject-select");
  const title = document.getElementById("report-title");
  const head = document.getElementById("report-thead");
  const body = document.getElementById("report-tbody");

  groupSelect.innerHTML = db.groups.map((group) => `<option value="${FuraryDemo.escapeHtml(group)}">${FuraryDemo.escapeHtml(group)}</option>`).join("");
  subjectSelect.innerHTML += db.subjects.map((subject) => `<option value="${FuraryDemo.escapeHtml(subject.id)}">${FuraryDemo.escapeHtml(subject.name)}</option>`).join("");

  function groupStudents() {
    return db.users.filter((user) => user.role === "student" && user.group === groupSelect.value);
  }

  function updateStudentOptions() {
    const previous = studentSelect.value;
    studentSelect.innerHTML = '<option value="all">Все ученики</option>' + groupStudents().map((student) =>
      `<option value="${FuraryDemo.escapeHtml(student.id)}">${FuraryDemo.escapeHtml(student.name)}</option>`,
    ).join("");
    if ([...studentSelect.options].some((option) => option.value === previous)) studentSelect.value = previous;
  }

  function visibleData() {
    const allStudents = groupStudents();
    const students = allStudents.filter((student) => studentSelect.value === "all" || String(student.id) === studentSelect.value);
    const subjectIds = subjectSelect.value === "all"
      ? db.subjects.map((subject) => String(subject.id))
      : [subjectSelect.value];
    const lessons = db.grades
      .filter((grade) => allStudents.some((student) => String(student.id) === String(grade.studentId)) && subjectIds.includes(String(grade.subjectId)))
      .map((grade) => ({ date: grade.date || "", subjectId: String(grade.subjectId), lesson: grade.lesson || "" }))
      .filter((lesson, index, list) => list.findIndex((other) => other.date === lesson.date && other.subjectId === lesson.subjectId) === index)
      .sort((a, b) => a.date.localeCompare(b.date) || a.subjectId.localeCompare(b.subjectId));
    return { students, lessons };
  }

  function renderReport() {
    const { students, lessons } = visibleData();
    title.textContent = `Сводка оценок и посещаемости: ${groupSelect.value}`;
    const columns = lessons.length ? lessons : [];
    head.innerHTML = `<th style="min-width:210px">Ученик</th>${columns.map((lesson) => {
      const subject = db.subjects.find((item) => String(item.id) === lesson.subjectId);
      return `<th title="${FuraryDemo.escapeHtml(lesson.lesson)}">${FuraryDemo.escapeHtml(lesson.date)}<br><small>${FuraryDemo.escapeHtml(subject?.name || "Предмет")}</small></th>`;
    }).join("")}<th>Средний балл</th>`;

    if (!students.length) {
      body.innerHTML = `<tr><td colspan="${columns.length + 2}" style="text-align:center;padding:24px;color:var(--text-muted)">В этой группе нет учеников.</td></tr>`;
      return;
    }

    body.innerHTML = students.map((student) => {
      const grades = db.grades.filter((grade) => String(grade.studentId) === String(student.id) && columns.some((lesson) => lesson.date === (grade.date || "") && lesson.subjectId === String(grade.subjectId)));
      const values = columns.map((lesson) => {
        const grade = db.grades.find((item) => String(item.studentId) === String(student.id) && (item.date || "") === lesson.date && String(item.subjectId) === lesson.subjectId);
        const score = grade ? FuraryDemo.scoreOf(grade) : null;
        const display = grade ? `<span class="grade-value">${grade.attendance === "a" ? "Н · " : ""}${score}</span>` : '<span class="grade-empty">+ Оценка</span>';
        return `<td class="grade-cell" tabindex="0" role="button" aria-label="Изменить оценку ${FuraryDemo.escapeHtml(student.name)}" data-student="${FuraryDemo.escapeHtml(student.id)}" data-subject="${FuraryDemo.escapeHtml(lesson.subjectId)}" data-date="${FuraryDemo.escapeHtml(lesson.date)}" title="Нажмите, чтобы изменить оценку">${display}</td>`;
      }).join("");
      const average = columns.length
        ? (columns.reduce((sum, lesson) => {
          const grade = db.grades.find((item) => String(item.studentId) === String(student.id) && (item.date || "") === lesson.date && String(item.subjectId) === lesson.subjectId);
          return sum + (grade ? FuraryDemo.scoreOf(grade) : 0);
        }, 0) / columns.length).toFixed(1)
        : "0.0";
      return `<tr><td><strong>${FuraryDemo.escapeHtml(student.name)}</strong></td>${values}<td><span class="average-pill">${average}</span></td></tr>`;
    }).join("");
  }

  function editGrade(cell) {
    const grade = db.grades.find((item) => String(item.studentId) === cell.dataset.student && String(item.subjectId) === cell.dataset.subject && (item.date || "") === cell.dataset.date);
    const student = db.users.find((item) => String(item.id) === cell.dataset.student);
    const subject = db.subjects.find((item) => String(item.id) === cell.dataset.subject);
    FuraryDemo.openGradeEditor({
      studentName: student?.name || "Ученик",
      subjectName: subject?.name || "Предмет",
      date: cell.dataset.date,
      grade,
      onSave(value, attendance) {
        if (grade) {
          grade.score = attendance === "a" ? 0 : value;
          grade.attendance = attendance;
        } else {
          db.grades.push({ id: Date.now(), studentId: Number(cell.dataset.student), subjectId: Number(cell.dataset.subject), date: cell.dataset.date, score: attendance === "a" ? 0 : value, attendance, comment: "", lesson: "" });
        }
        FuraryDemo.saveData(db);
        renderReport();
      },
    });
  }

  body.addEventListener("click", (event) => {
    const cell = event.target.closest(".grade-cell");
    if (cell) editGrade(cell);
  });
  body.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".grade-cell")) {
      event.preventDefault();
      editGrade(event.target);
    }
  });
  [groupSelect, studentSelect, subjectSelect].forEach((select) => select.addEventListener("change", () => {
    if (select === groupSelect) updateStudentOptions();
    renderReport();
  }));
  document.getElementById("export-report").addEventListener("click", () => {
    const { students, lessons } = visibleData();
    const rows = [
      ["Ученик", ...lessons.map((lesson) => `${lesson.date} — ${db.subjects.find((subject) => String(subject.id) === lesson.subjectId)?.name || "Предмет"}`), "Средний балл"],
      ...students.map((student) => {
        const scores = lessons.map((lesson) => {
          const grade = db.grades.find((item) => String(item.studentId) === String(student.id) && String(item.subjectId) === lesson.subjectId && (item.date || "") === lesson.date);
          return grade ? FuraryDemo.scoreOf(grade) : 0;
        });
        const average = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "0.0";
        return [student.name, ...scores, average];
      }),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((value) => {
      const safeValue = typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
      return `"${String(safeValue).replace(/"/g, '""')}"`;
    }).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `успеваемость-${groupSelect.value}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  updateStudentOptions();
  renderReport();
});
