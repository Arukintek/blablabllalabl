import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, pass, password } = req.body || {};
  const inputPassword = pass ?? password;

  if (!email || !inputPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Email и пароль обязательны" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        password: inputPassword,
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Неверный логин или пароль" });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Ошибка при авторизации:", error);
    return res
      .status(500)
      .json({ success: false, message: "Ошибка сервера при входе" });
  }
});

export default router;
