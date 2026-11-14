document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("pass").value;
  let user;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass: password }),
    });
    const data = await response.json();
    if (response.ok && data.success) user = data.user;
  } catch (error) {
    console.info("Сервер недоступен, используется локальный демо-вход.");
  }

  if (!user && password === "password123") {
    const demoRoles = {
      "admin@college.edu": { name: "Администратор", role: "admin" },
      "teacher@college.edu": { name: "Преподаватель", role: "teacher" },
      "student@college.edu": { name: "Студент", role: "student" },
    };
    const demoRole = demoRoles[email];
    if (demoRole) user = { id: 0, email, ...demoRole };
  }
  if (!user) {
    alert("Неверный логин или пароль. Для тестового входа используйте admin@college.edu, teacher@college.edu или student@college.edu; пароль: password123.");
    return;
  }

  localStorage.setItem("current_user", JSON.stringify(user));
  window.location.href = `/${String(user.role).toLowerCase()}/dashboard.html`;
});
