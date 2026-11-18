const DEFAULT_CLASSROOM = "902";

document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("student");
  initLogout();

  const db = await FuraryDemo.loadData();
  const user = getCurrentUser() || {};
  const escape = FuraryDemo.escapeHtml;
  document.getElementById("student-name-nav").textContent = user.name || "Студент";

  const myGrades = db.grades
    .filter((grade) => String(grade.studentId) === String(user.id))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  document.getElementById("my-grades-count").textContent = myGrades.length;
  document.getElementById("avg-score").textContent = myGrades.length
    ? (myGrades.reduce((sum, grade) => sum + FuraryDemo.scoreOf(grade), 0) / myGrades.length).toFixed(1)
    : "0.0";

  const studentRecord = db.users.find((student) => String(student.id) === String(user.id));
  const groupValue = user.group || studentRecord?.group;
  const groupName = typeof groupValue === "object" && groupValue ? groupValue.name : groupValue || "";
  const groupId = user.groupId || studentRecord?.groupId;
  const homeworkCount = db.homework.filter((item) => {
    if (item.groupId != null && groupId != null) {
      return Number(item.groupId) === Number(groupId);
    }
    const homeworkGroup = String(
      typeof item.group === "object" && item.group ? item.group.name || "" : item.group || "",
    ).trim();
    return !homeworkGroup || homeworkGroup.toLowerCase() === "все"
      || (groupName && homeworkGroup.toLowerCase() === String(groupName).trim().toLowerCase());
  }).length;
  document.getElementById("active-hw-count").textContent = homeworkCount;

  const subjectAverages = new Map();
  myGrades.forEach((grade) => {
    const name = FuraryDemo.subjectName(db, grade);
    if (!subjectAverages.has(name)) subjectAverages.set(name, []);
    subjectAverages.get(name).push(FuraryDemo.scoreOf(grade));
  });
  const subjectContainer = document.getElementById("student-subject-averages");
  subjectContainer.innerHTML = subjectAverages.size
    ? [...subjectAverages.entries()].map(([name, scores]) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return `<div class="subject-summary-item"><span>${escape(name)}</span><strong class="average-pill">${average.toFixed(1)} / 100</strong></div>`;
    }).join("")
    : '<p class="muted">Оценок по предметам пока нет.</p>';

  const lastGrade = myGrades.at(-1);
  if (lastGrade) {
    document.getElementById("last-score-val").textContent = `${FuraryDemo.scoreOf(lastGrade)} / 100`;
    const subject = FuraryDemo.subjectName(db, lastGrade);
    const comment = lastGrade.comment ? ` · ${lastGrade.comment}` : "";
    document.getElementById("last-score-comment").textContent = `${subject}${comment}`;
  } else {
    document.getElementById("last-score-val").textContent = "--";
    document.getElementById("last-score-comment").textContent = "Нет оценок";
  }

  const schedules = db.schedules.filter((lesson) => {
    if (user.groupId && lesson.groupId) return Number(user.groupId) === Number(lesson.groupId);
    const lessonGroup = typeof lesson.group === "object" && lesson.group ? lesson.group.name : lesson.group;
    return lessonGroup === groupName;
  });
  const scheduleContainer = document.getElementById("student-schedule-summary");
  if (!schedules.length) {
    scheduleContainer.innerHTML = '<p class="muted">Расписание для вашей группы пока не составлено.</p>';
    return;
  }

  const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
  const dayNames = ["Воскресенье", ...weekdays.slice(0, 6)];
  const today = dayNames[new Date().getDay()];
  const availableDays = [...new Set(schedules.map((lesson) => lesson.dayOfWeek || lesson.day))];
  const nextDay = availableDays.includes(today) ? today : weekdays.find((day) => availableDays.includes(day)) || availableDays[0];
  const dayLessons = schedules.filter((lesson) => (lesson.dayOfWeek || lesson.day) === nextDay);
  scheduleContainer.innerHTML = `<div class="subject-summary-list"><h4>${escape(nextDay)}</h4>${dayLessons.map((lesson) => `
    <div class="subject-summary-item">
      <div><strong>${escape(lesson.subject?.name || lesson.subject || "Предмет")}</strong><div class="muted">${escape(lesson.timeSlot || lesson.time || "Время не указано")}</div></div>
      <span class="metric-chip">Каб. ${escape(DEFAULT_CLASSROOM)}</span>
    </div>`).join("")}</div>`;
});
