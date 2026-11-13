const loginForm = document.getElementById("login-form");

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  document.body.classList.toggle("light-theme", !isDark);

  const toggleButton = document.getElementById("theme-toggle-btn");
  if (toggleButton) {
    toggleButton.innerHTML = isDark
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    toggleButton.title = isDark
      ? "Включить светлую тему"
      : "Включить тёмную тему";
  }

  localStorage.setItem("furary-theme", theme);
}

function initThemeToggle() {
  const navUser = document.querySelector(".nav-user");
  if (!navUser) return;

  let toggleButton = document.getElementById("theme-toggle-btn");
  if (!toggleButton) {
    toggleButton = document.createElement("button");
    toggleButton.id = "theme-toggle-btn";
    toggleButton.type = "button";
    toggleButton.className = "theme-toggle-btn";
    toggleButton.setAttribute("aria-label", "Переключить тему");
    navUser.insertBefore(toggleButton, navUser.firstChild);
  }

  const savedTheme = localStorage.getItem("furary-theme") || "light";
  applyTheme(savedTheme);

  toggleButton.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme")
      ? "light"
      : "dark";
    applyTheme(nextTheme);
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const pass = document.getElementById("pass").value;

    try {
      // Отправляем запрос на бэкенд
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, pass }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Сохраняем объект пользователя, полученный с сервера
        localStorage.setItem("current_user", JSON.stringify(data.user));

        // Перенаправляем на соответствующий дашборд в зависимости от роли
        window.location.href = `/${data.user.role}/dashboard.html`;
      } else {
        alert(data.message || "Неверный логин или пароль");
      }
    } catch (error) {
      console.error("Ошибка соединения с сервером:", error);
      alert(
        "Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.",
      );
    }
  });
}

initThemeToggle();

// Проверка роли пользователя
function checkAccess(requiredRole) {
  const user = JSON.parse(localStorage.getItem("current_user"));
  if (!user || user.role !== requiredRole) {
    alert("Доступ запрещен! Пожалуйста, войдите в систему.");
    window.location.href = "/login.html";
  }
}

// Выход из системы
function initLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("current_user");
      window.location.href = "/login.html";
    });
  }
}

// Получение текущего пользователя из localStorage
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("current_user"));
  } catch (e) {
    return null;
  }
}
