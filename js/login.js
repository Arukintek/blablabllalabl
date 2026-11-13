document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const pass = document.getElementById("pass").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass }),
    });
    const result = await response.json();

    if (!response.ok || !result.success || !result.user) {
      alert(result.message || "Неверный логин или пароль");
      return;
    }

    localStorage.setItem("current_user", JSON.stringify(result.user));
    const role = result.user.role.toLowerCase();
    window.location.href = `/${role}/dashboard.html`;
  } catch (error) {
    console.error("Ошибка соединения с бэкендом:", error);
    alert("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.");
  }
});
