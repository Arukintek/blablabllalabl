document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("pass").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass: password }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      alert(data.message || "Неверный логин или пароль.");
      return;
    }

    localStorage.setItem("current_user", JSON.stringify(data.user));
    window.location.href = `/${String(data.user.role).toLowerCase()}/dashboard.html`;
  } catch (error) {
    console.error("Ошибка соединения с сервером:", error);
    alert("Не удалось подключиться к серверу. Проверьте, что backend запущен.");
  }
});
