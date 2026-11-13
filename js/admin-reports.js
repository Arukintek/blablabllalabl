document.addEventListener("DOMContentLoaded", async () => {
  if (typeof checkAccess === "function") checkAccess("admin");
  if (typeof initLogout === "function") initLogout();

  // Загружаем данные отчета с бэкенда Prisma
  let db;
  try {
    const res = await fetch("/api/admin/report");
    if (!res.ok) throw new Error("Ошибка загрузки данных отчета");
    db = await res.json();
  } catch (e) {
    console.error("Ошибка связи с бэкендом:", e);
    return;
  }

  const groupSelect = document.getElementById("report-group-select");
  if (!groupSelect) return;

  // Функция заполнения селекта групп
  function renderGroupsSelect() {
    let groups = db.groups || [];

    if (groups.length === 0 && db.users) {
      groups = [
        ...new Set(
          db.users
            .map((u) => {
              return typeof u.group === "object" && u.group !== null
                ? u.group.name
                : u.group || null;
            })
            .filter(Boolean),
        ),
      ];
    }

    if (groups.length > 0) {
      groupSelect.innerHTML = groups
        .map((g) => {
          const groupName = typeof g === "object" && g !== null ? g.name : g;
          return `<option value="${groupName}">Группа: ${groupName}</option>`;
        })
        .join("");
    } else {
      groupSelect.innerHTML = `
                <option value="24ПО-п1.1">Группа: 24ПО-п1.1</option>
                <option value="24ПО-п1.2">Группа: 24ПО-п1.2</option>
            `;
    }
  }

  // Функция отрисовки отчета
  function renderGroupReport() {
    const selectedGroup = groupSelect.value;
    const cleanSelectedGroup = String(selectedGroup)
      .replace(/[\s\-]/g, "")
      .toLowerCase();

    const titleEl = document.getElementById("report-title");
    if (titleEl) {
      titleEl.innerHTML = `<i class="fa-solid fa-users-rectangle"></i> Сводка оценок и посещаемости: ${selectedGroup}`;
    }

    const targetGroupObj = (db.groups || []).find((g) => {
      const name = typeof g === "object" && g !== null ? g.name : g;
      return (
        String(name)
          .replace(/[\s\-]/g, "")
          .toLowerCase() === cleanSelectedGroup
      );
    });

    // Студенты выбранной группы
    const students = (db.users || []).filter((u) => {
      if (String(u.role).toLowerCase() !== "student") return false;

      if (
        targetGroupObj &&
        targetGroupObj.id &&
        u.groupId &&
        Number(u.groupId) === Number(targetGroupObj.id)
      ) {
        return true;
      }

      const userGroupStr =
        typeof u.group === "object" && u.group !== null
          ? u.group.name || ""
          : u.group || "";

      const cleanUserGroup = String(userGroupStr)
        .replace(/[\s\-]/g, "")
        .toLowerCase();
      return cleanUserGroup && cleanUserGroup === cleanSelectedGroup;
    });

    // Занятия (расписание) для выбранной группы
    const lessons = (db.schedules || []).filter((l) => {
      if (
        targetGroupObj &&
        targetGroupObj.id &&
        l.groupId &&
        Number(l.groupId) === Number(targetGroupObj.id)
      ) {
        return true;
      }
      const lessonGroupStr =
        typeof l.group === "object" && l.group !== null
          ? l.group.name
          : l.group || "";
      return (
        String(lessonGroupStr)
          .replace(/[\s\-]/g, "")
          .toLowerCase() === cleanSelectedGroup
      );
    });

    const theadRow = document.getElementById("report-thead");
    const tbody = document.getElementById("report-tbody");

    if (!theadRow || !tbody) return;

    // Формируем шапку таблицы
    let headHtml = `<th style="min-width: 200px; padding: 10px;">Студент</th>`;

    if (lessons.length === 0) {
      headHtml += `<th style="padding: 10px; text-align: center; color: #94a3b8;">Нет расписания</th>`;
    } else {
      lessons.forEach((l) => {
        const subjectName =
          typeof l.subject === "object" && l.subject !== null
            ? l.subject.name
            : l.subject || "Предмет";
        const dayStr = l.dayOfWeek || l.day || "День";
        const timeStr = l.timeSlot || l.time || "";

        headHtml += `
                  <th style="text-align: center; min-width: 110px; cursor: pointer; color: #0284c7; padding: 10px;" 
                      title="Предмет: ${subjectName}" 
                      onclick="alert('📅 День: ${dayStr} (${timeStr})\\n📌 Предмет: ${subjectName.replace(/'/g, "\\'")}\\n🏫 Каб: ${l.room || "-"}')">
                    <u>${dayStr}</u> <br><span style="font-size: 0.75rem; color: #64748b;">${timeStr} (${subjectName})</span> <i class="fa-solid fa-circle-info" style="font-size:0.65rem;"></i>
                  </th>`;
      });
    }
    headHtml += `<th style="width: 100px; text-align: center; background: #e0f2fe; color: #0369a1; padding: 10px;">Ср. балл</th>`;
    theadRow.innerHTML = headHtml;

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${Math.max(lessons.length, 1) + 2}" style="text-align:center; color:#64748b; padding: 20px;">В данной группе нет зарегистрированных студентов.</td></tr>`;
      return;
    }

    // Заполняем строки по каждому студенту
    tbody.innerHTML = students
      .map((student, studentIndex) => {
        let studentScores = [];
        let cellsHtml = `<td style="padding: 10px;"><b>${student.name}</b></td>`;

        if (lessons.length === 0) {
          cellsHtml += `<td style="text-align: center; color: #cbd5e1; padding: 10px;">-</td>`;
        } else {
          lessons.forEach((lesson, lessonIdx) => {
            // Гибридный поиск оценки: по ID урока/предмета или берем оценку по порядку для студента
            const grade = (db.grades || []).find((g, gIdx) => {
              const matchStudent = String(g.studentId) === String(student.id);
              if (!matchStudent) return false;

              if (g.lessonId || g.subjectId) {
                return (
                  String(g.lessonId) === String(lesson.id) ||
                  String(g.subjectId) === String(lesson.subjectId)
                );
              }

              // Если у оценки нет привязок к уроку, сопоставляем по индексу колонки для демонстрации
              return lessonIdx === gIdx;
            });

            if (grade) {
              const scoreVal =
                grade.score !== undefined
                  ? grade.score
                  : grade.value !== undefined
                    ? grade.value
                    : null;
              const commentText = grade.comment || "Без комментария";

              if (grade.attendance === "a") {
                cellsHtml += `<td style="text-align: center; padding: 10px;"><span style="color: #ef4444; font-weight: bold;" title="${commentText}">Н</span></td>`;
              } else if (scoreVal !== null && scoreVal !== undefined) {
                studentScores.push(Number(scoreVal));
                cellsHtml += `<td style="text-align: center; padding: 10px;"><span class="btn" style="padding: 4px 8px; font-size: 0.85rem; background: #dcfce7; color: #15803d; font-weight: bold; border-radius: 4px;" title="${commentText}">${scoreVal}</span></td>`;
              } else {
                // Если числовой оценки нет, но есть комментарий (например, ваш тестовый коммент)
                cellsHtml += `<td style="text-align: center; padding: 10px;"><span class="btn" style="padding: 4px 8px; font-size: 0.75rem; background: #fef9c3; color: #854d0e; border-radius: 4px;" title="${commentText}">${commentText}</span></td>`;
              }
            } else {
              cellsHtml += `<td style="text-align: center; color: #cbd5e1; padding: 10px;">-</td>`;
            }
          });
        }

        let avg = "-";
        if (studentScores.length > 0) {
          avg = (
            studentScores.reduce((a, b) => a + b, 0) / studentScores.length
          ).toFixed(1);
        }

        cellsHtml += `<td style="text-align: center; font-weight: bold; background: #f0f9ff; color: #0284c7; padding: 10px;">${avg}</td>`;

        return `<tr style="border-bottom: 1px solid #1e293b;">${cellsHtml}</tr>`;
      })
      .join("");
  }

  renderGroupsSelect();
  renderGroupReport();

  groupSelect.addEventListener("change", () => {
    renderGroupReport();
  });
});
