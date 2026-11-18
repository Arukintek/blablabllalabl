const loginForm = document.getElementById("login-form");
const visualCleanupKey = "furary-visual-cleanup-v1";

if (localStorage.getItem(visualCleanupKey) !== "true") {
  localStorage.removeItem("furary-demo-data");
  localStorage.removeItem("furary-database-loaded");
  localStorage.removeItem("current_user");
  localStorage.setItem(visualCleanupKey, "true");
}

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ email, pass }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("current_user", JSON.stringify(data.user));
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

async function getCurrentUserFromServer() {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    return null;
  }
}

function initImpersonationControl(user) {
  const navUser = document.querySelector(".nav-user");
  if (!navUser || !user?.impersonatorId || document.getElementById("stop-impersonation-btn")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "stop-impersonation-btn";
  button.type = "button";
  button.className = "btn-outline";
  button.textContent = "Вернуться к администратору";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/impersonation/stop", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || "Не удалось вернуться к администратору.");
      }

      localStorage.setItem("current_user", JSON.stringify(data.user));
      window.location.href = "/admin/users.html";
    } catch (error) {
      console.error("Не удалось завершить режим входа от имени пользователя:", error);
      alert(error.message || "Не удалось вернуться к администратору.");
      button.disabled = false;
    }
  });

  const userName = navUser.querySelector(".user-name");
  if (userName) {
    navUser.insertBefore(button, userName);
  } else {
    navUser.append(button);
  }
}

initThemeToggle();

// Проверка роли пользователя
async function checkAccess(requiredRole) {
  const user = await getCurrentUserFromServer();
  const normalizedRequiredRole = String(requiredRole || "").toLowerCase();

  if (!user || String(user.role || "").toLowerCase() !== normalizedRequiredRole) {
    alert("Доступ запрещен! Пожалуйста, войдите в систему.");
    localStorage.removeItem("current_user");
    window.location.href = "/login.html";
    return false;
  }

  localStorage.setItem("current_user", JSON.stringify(user));
  initImpersonationControl(user);
  return true;
}

// Выход из системы
function initLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch (error) {
        console.error("Ошибка при выходе:", error);
      }

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
