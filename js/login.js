document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const pass = document.getElementById("pass").value;

  try {
    // Получаем всех пользователей с сервера
    const response = await fetch("/api/users");

    if (!response.ok) {
      throw new Error("Ошибка сервера при получении пользователей");
    }

    const users = await response.json();

    // Ищем пользователя по введенному email и паролю
    // Учитываем, что в БД поле называется password
    const foundUser = users.find(
      (u) => u.email === email && u.password === pass,
    );

    if (foundUser) {
      // Сохраняем данные авторизованного пользователя
      localStorage.setItem("current_user", JSON.stringify(foundUser));

      // Приводим роль к нижнему регистру для правильного пути (admin, teacher, student)
      const role = foundUser.role.toLowerCase();

      // Перенаправляем на соответствующий дашборд
      window.location.href = `/${role}/dashboard.html`;
    } else {
      alert("Неверный логин или пароль");
    }
  } catch (error) {
    console.error("Ошибка соединения с бэкендом:", error);
    alert("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.");
  }
});
