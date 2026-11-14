document.addEventListener("DOMContentLoaded", async () => {
  checkAccess("admin");
  initLogout();

  const db = await FuraryDemo.loadData();
  const modal = document.getElementById("user-modal");
  const roleSelect = document.getElementById("new-user-role");
  const groupContainer = document.getElementById("group-container");
  const groupInput = document.getElementById("new-user-group");
  const groupFilter = document.getElementById("user-group-filter");
  const table = document.getElementById("users-table");
  const search = document.getElementById("user-search");
  const roleFilter = document.getElementById("user-role-filter");
  const masterChecks = [
    document.getElementById("select-all-users"),
    document.getElementById("select-all-users-head"),
  ];

  groupInput.innerHTML = db.groups.map((group) =>
    `<option value="${FuraryDemo.escapeHtml(group)}">${FuraryDemo.escapeHtml(group)}</option>`,
  ).join("");
  groupFilter.innerHTML += db.groups.map((group) =>
    `<option value="${FuraryDemo.escapeHtml(group)}">${FuraryDemo.escapeHtml(group)}</option>`,
  ).join("");

  function filteredUsers() {
    const term = search.value.trim().toLocaleLowerCase("ru");
    return db.users.filter((user) => {
      const matchesTerm = !term || `${user.name} ${user.email}`.toLocaleLowerCase("ru").includes(term);
      const matchesRole = roleFilter.value === "all" || user.role === roleFilter.value;
      const matchesGroup = groupFilter.value === "all" || user.group === groupFilter.value;
      return matchesTerm && matchesRole && matchesGroup;
    });
  }

  function renderUsersTable() {
    const users = filteredUsers();
    document.getElementById("users-result-count").textContent = `Показано ${users.length} из ${db.users.length}`;
    table.querySelector("tbody").innerHTML = users.length
      ? users.map((user) => `
        <tr>
          <td><input class="user-row-check" type="checkbox" value="${FuraryDemo.escapeHtml(user.id)}" aria-label="Выбрать ${FuraryDemo.escapeHtml(user.name)}"></td>
          <td class="user-name-cell">${FuraryDemo.escapeHtml(user.name || "Без имени")}</td>
          <td class="user-email-cell">${FuraryDemo.escapeHtml(user.email || "-")}</td>
          <td><span class="user-role-badge role-${FuraryDemo.escapeHtml(user.role)}">${({ student: "Студент", teacher: "Преподаватель", admin: "Администратор" })[user.role] || user.role}</span></td>
          <td>${FuraryDemo.escapeHtml(user.group || user.subject || "-")}</td>
          <td class="user-action-cell">
            ${user.role !== "admin" ? `
              <button class="user-action-btn user-action-btn--primary" data-action="login-as" data-id="${FuraryDemo.escapeHtml(user.id)}">Войти как</button>
              <button class="user-action-btn user-action-btn--danger" data-action="delete" data-id="${FuraryDemo.escapeHtml(user.id)}" aria-label="Удалить пользователя"><i class="fa-solid fa-trash"></i></button>
            ` : '<span class="user-system-label">Системный</span>'}
          </td>
        </tr>`).join("")
      : '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Совпадений не найдено.</td></tr>';
    masterChecks.forEach((check) => {
      check.checked = users.length > 0 && users.every((user) =>
        table.querySelector(`.user-row-check[value="${CSS.escape(String(user.id))}"]`)?.checked,
      );
      check.indeterminate = false;
    });
  }

  function toggleGroupField() {
    groupContainer.hidden = roleSelect.value !== "student";
  }

  search.addEventListener("input", renderUsersTable);
  roleFilter.addEventListener("change", renderUsersTable);
  groupFilter.addEventListener("change", renderUsersTable);
  roleSelect.addEventListener("change", toggleGroupField);
  toggleGroupField();

  masterChecks.forEach((check) => check.addEventListener("change", () => {
    table.querySelectorAll(".user-row-check").forEach((rowCheck) => { rowCheck.checked = check.checked; });
    masterChecks.forEach((other) => { other.checked = check.checked; });
  }));
  table.addEventListener("change", (event) => {
    if (!event.target.matches(".user-row-check")) return;
    const rows = [...table.querySelectorAll(".user-row-check")];
    masterChecks.forEach((check) => {
      check.checked = rows.length > 0 && rows.every((row) => row.checked);
      check.indeterminate = rows.some((row) => row.checked) && !check.checked;
    });
  });

  table.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const user = db.users.find((item) => String(item.id) === button.dataset.id);
    if (!user) return;
    if (button.dataset.action === "login-as") {
      localStorage.setItem("current_user", JSON.stringify(user));
      window.location.href = `/${user.role}/dashboard.html`;
    }
    if (button.dataset.action === "delete" && confirm(`Удалить пользователя «${user.name}»?`)) {
      db.users = db.users.filter((item) => String(item.id) !== String(user.id));
      FuraryDemo.saveData(db);
      renderUsersTable();
    }
  });

  document.getElementById("open-user-modal").addEventListener("click", () => { modal.style.display = "flex"; });
  document.getElementById("close-user-modal").addEventListener("click", () => { modal.style.display = "none"; });
  document.getElementById("new-user-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const role = roleSelect.value;
    const group = role === "student" ? groupInput.value : "";
    db.users.push({
      id: Date.now(),
      name: document.getElementById("new-user-name").value.trim(),
      email: document.getElementById("new-user-email").value.trim(),
      password: document.getElementById("new-user-password").value,
      role,
      ...(group ? { group, groupId: db.groups.indexOf(group) + 1 } : {}),
    });
    FuraryDemo.saveData(db);
    event.target.reset();
    toggleGroupField();
    modal.style.display = "none";
    renderUsersTable();
  });

  renderUsersTable();
});
